/**
 * VoiceOrb.jsx — DrillSight Voice Knowledge Assistant
 *
 * Floating animated orb that lets the user speak or type a query.
 * Answers are grounded in the live Knowledge Repository via /api/voice-query.
 * Falls back to /api/knowledge/search if the AI endpoint isn't available.
 */

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { Mic, Send, Sparkles, Maximize2, Minimize2, X } from 'lucide-react';
import '../voiceorb.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Drilling keyword highlight map ────────────────────────────────────────────
// Each entry: [regex, css-class]   (case-insensitive, word-boundary aware)
const KEYWORD_RULES = [
  // ── Hazard / risk terms (red)
  [/\b(stuck pipe|differential sticking|pack.?off|jarring|overpull|key seat(ing)?)\b/gi, 'vorb-kw-risk'],
  [/\b(kick|influx|blowout|gas influx|annular BOP|BOP|SIDPP|SICP|pit gain|well control)\b/gi, 'vorb-kw-risk'],
  [/\b(lost circulation|mud loss(es)?|LCM pill|total loss|seepage|thief zone|fracture gradient)\b/gi, 'vorb-kw-risk'],
  [/\b(vibration|stick.?slip|whirl|bit bounce|washout|resonance)\b/gi, 'vorb-kw-risk'],
  [/\b(overpressure|pore pressure|ECD|EMW|kick margin)\b/gi, 'vorb-kw-risk'],

  // ── Technical actions & drilling fluids (blue)
  [/\b(shut.?in|circulate|squeeze|back.?ream|bullhead|reciprocate|flow check|stop drilling|weight up|weight down)\b/gi, 'vorb-kw-action'],
  [/\b(pipe.?release pill|heavy pill|glycol|SOBM|spacer|cement slurry|drilling fluid|drillstring)\b/gi, 'vorb-kw-action'],

  // ── Specific measurements with numeric values & drilling telemetry (amber)
  [/\b(\d+(\.\d+)?[\s\-]*(bbl(\/min)?|ppb|gpm|psi|SG|klb|RPM|ppg|cP|°C|°F))\b/gi, 'vorb-kw-measure'],
  [/\b(\d+[\s\-]*(min|mins|hr|hrs))\b/gi, 'vorb-kw-measure'],
  [/\b(WOB|ROP|SPP|hookload|torque|mud weight|flow rate|standpipe pressure)\b/gi, 'vorb-kw-measure'],

  // ── Formations & lithology (purple)
  [/\b(Hugin|Heimdal|Balder|Draupne|Statfjord|Sleipner|Brent|Chalk|sandstone|reactive shale|limestone|dolomite|anhydrite|halite)\b/gi, 'vorb-kw-geo'],
];

/**
 * Tokenise a plain text string into React spans with keyword highlights.
 * Returns an array of strings / <mark> elements.
 */
function highlightKeywords(text) {
  if (!text) return [text];

  // Build one combined replacer: find all matches across all rules,
  // sort by position, then interleave spans with plain text.
  const matches = [];
  KEYWORD_RULES.forEach(([re, cls]) => {
    let m;
    const pattern = new RegExp(re.source, re.flags);
    while ((m = pattern.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], cls });
    }
  });

  // Sort by start position; remove overlaps (first match wins)
  matches.sort((a, b) => a.start - b.start);
  const filtered = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start >= cursor) { filtered.push(m); cursor = m.end; }
  }

  // Build output
  const parts = [];
  let pos = 0;
  filtered.forEach((m, i) => {
    if (m.start > pos) parts.push(text.slice(pos, m.start));
    parts.push(<mark key={i} className={`vorb-kw ${m.cls}`}>{m.text}</mark>);
    pos = m.end;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return parts;
}

// ── Mic icon SVG (inline so no extra deps) ────────────────────────────────────
function MicSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24">
      <g className="vorb-icon-close">
        <path fill="currentColor"
          d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59L7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12L5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4"/>
      </g>
      <g fill="none" className="vorb-icon-mic">
        <rect width={8} height={13} x={8} y={2} fill="currentColor" rx={4}/>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 11a7 7 0 1 0 14 0m-7 10v-2"/>
      </g>
    </svg>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="vorb-bubble vorb-bubble--thinking">
      <div className="vorb-dots">
        <span/><span/><span/>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VoiceOrb() {
  const checkId = useId().replace(/:/g, '');
  const uid = `vorb-${checkId}`;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const chatRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // ── Query the backend — grounded in KB ──────────────────────────────────
  const askKB = useCallback(async (query) => {
    if (!query.trim()) return;

    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setThinking(true);

    try {
      // Try the dedicated voice-query endpoint first (Groq-grounded)
      let answer = null;
      let sources = [];

      try {
        const res = await fetch(`${API}/api/voice-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.answer && data.answer.trim().length > 0) {
            answer = data.answer.trim();
            sources = data.sources || [];
          }
        }
      } catch (_) {
        // Fallback: search KB and build a simple answer
      }

      // Fallback: search KB directly and synthesize a bullet-pointed answer from top results
      if (!answer) {
        sources = [];
        const searchRes = await fetch(
          `${API}/api/knowledge/search?q=${encodeURIComponent(query)}&limit=4`
        );
        if (searchRes.ok) {
          const data = await searchRes.json();
          const results = data.results || [];
          if (results.length > 0) {
            const top = results[0];
            const actions = (top.mitigation_actions || []).slice(0, 4);
            const symptoms = (top.symptoms_early_indicators || []).slice(0, 2);
            const category = top.category_name || top.category || 'drilling risk';
            
            const bullets = [`**Record:** ${top.title || 'Knowledge Record'} (${category})`];
            if (symptoms.length > 0) {
              bullets.push(`**Early Signs:** ${symptoms.join(', ')}`);
            }
            actions.forEach(a => bullets.push(a));
            answer = bullets.map(b => `• ${b}`).join('\n');
            sources = results.map(r => r.title || r.source_document).filter(Boolean).slice(0, 3);
          } else {
            answer = "• I couldn't find a specific match in the Knowledge Repository for that query.\n• Try asking with drilling terms like 'stuck pipe', 'mud loss', 'kick influx', or a formation name.";
            sources = [];
          }
        } else {
          answer = "The Knowledge Repository is unavailable right now. Make sure the backend is running.";
          sources = [];
        }
      }

      setMessages(prev => [...prev, { role: 'ai', text: answer, sources }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "Connection error — make sure the DrillSight backend is running.",
        sources: []
      }]);
    } finally {
      setThinking(false);
    }
  }, []);

  // ── Web Speech API voice input ────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "Voice input isn't supported in this browser. Try Chrome or Edge. You can also type your question below.",
        sources: []
      }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        askKB(transcript);
      }
      setListening(false);
    };

    recognition.start();
  }, [askKB]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const handleMic = () => {
    if (listening) stopListening();
    else startListening();
  };

  const handleSend = () => {
    if (inputText.trim() && !thinking) {
      askKB(inputText.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="vorb-fab">
      <div className="vorb-container">
        {/* Hidden checkbox toggle */}
        <input
          type="checkbox"
          className="vorb-input"
          id={uid}
          name={uid}
          checked={isOpen}
          onChange={e => setIsOpen(e.target.checked)}
        />

        {/* Chat panel — expands when checked */}
        <div className={`vorb-panel${expanded ? ' vorb-panel--expanded' : ''}`}>
          {/* Header */}
          <div className="vorb-panel-header">
            <svg className="vorb-header-icon" xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M3 14V10" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
              <path d="M21 14V10" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
              <path d="M16.5 18V8" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
              <path d="M12 22V2" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
              <path d="M7.5 18V6" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
            </svg>
            <span className="vorb-panel-title">KB Assistant</span>
            <span className="vorb-panel-source-badge">Grounded · KB</span>
            <div className="vorb-header-actions">
              <button
                type="button"
                className="vorb-header-btn vorb-expand-btn"
                onClick={() => setExpanded(prev => !prev)}
                title={expanded ? "Collapse to compact view" : "Expand to wide view"}
                aria-label={expanded ? "Collapse to compact view" : "Expand to wide view"}
              >
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                type="button"
                className="vorb-header-btn vorb-close-btn"
                onClick={() => setIsOpen(false)}
                title="Close KB Assistant"
                aria-label="Close KB Assistant"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="vorb-chat-area" ref={chatRef}>
            {messages.length === 0 && !thinking && (
              <div className="vorb-empty">
                <div className="vorb-empty-wave">🎙️</div>
                <p>Ask me anything about drilling risks, stuck pipe, mud losses, kicks, or formations.</p>
                <p style={{ color: '#cbd5e1', fontSize: 11 }}>Answers grounded in KB</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`vorb-msg vorb-msg--${msg.role}`}>
                <div className={`vorb-bubble vorb-bubble--${msg.role === 'user' ? 'user' : 'ai'}`}>
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    /* AI: render line-by-line, bullet lines get styled row */
                    <ul className="vorb-bullet-list">
                      {(msg.text || '').split('\n').filter(l => l.trim()).map((line, li) => {
                        const trimmed = line.trim();
                        const isBullet = /^[•\-\*]\s+|^\d+\.\s+/.test(trimmed);
                        const content = isBullet ? trimmed.replace(/^[•\-\*]\s+|^\d+\.\s+/, '') : trimmed;
                        // First split on **bold**, then highlight keywords in plain segments
                        const rendered = content.split(/(\*\*[^*]+\*\*)/).flatMap((part, pi) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return [<strong key={`b${pi}`}>{part.slice(2, -2)}</strong>];
                          }
                          return highlightKeywords(part).map((chunk, ci) =>
                            typeof chunk === 'string'
                              ? chunk
                              : React.cloneElement(chunk, { key: `kw${pi}-${ci}` })
                          );
                        });
                        return (
                          <li key={li} className={isBullet ? 'vorb-bullet-item' : 'vorb-plain-line'}>
                            <span className="vorb-bullet-text">{rendered}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <span className="vorb-source-chip">
                    📄 {msg.sources[0]}{msg.sources.length > 1 ? ` +${msg.sources.length - 1}` : ''}
                  </span>
                )}
              </div>
            ))}
            {thinking && (
              <div className="vorb-msg vorb-msg--ai">
                <ThinkingDots/>
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="vorb-input-row">
            <button
              type="button"
              className={`vorb-mic-btn${listening ? ' vorb-mic-btn--active' : ''}`}
              onClick={handleMic}
              title={listening ? 'Stop listening' : 'Speak your question'}
            >
              <Mic size={14}/>
            </button>
            <input
              ref={inputRef}
              type="text"
              className="vorb-text-input"
              placeholder={listening ? 'Listening...' : 'Ask the KB...'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={thinking || listening}
            />
            <button
              type="button"
              className="vorb-send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || thinking}
              title="Send"
            >
              <Send size={13}/>
            </button>
          </div>
        </div>

        {/* The Orb */}
        <label htmlFor={uid} className="vorb-orb" title="DrillSight KB Assistant">
          <div className="vorb-icons">
            <MicSVG/>
          </div>
          <div className="vorb-ball">
            <div className="vorb-lines"/>
            <div className="vorb-rings"/>
          </div>
        </label>

        {/* SVG filter for the gooey effect */}
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
          <filter id="vorb-gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation={6}/>
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"/>
          </filter>
        </svg>
      </div>
    </div>
  );
}
