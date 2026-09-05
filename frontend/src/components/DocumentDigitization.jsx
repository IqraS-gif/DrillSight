import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ShieldAlert, Layers, Droplets, Flame, Zap, Anchor,
  BookOpen, FileText, Database, Sparkles, ChevronRight, Activity
} from 'lucide-react';
import '../digitize.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Category icon helper ───────────────────────────────────────────────────────
function getCatIcon(cat) {
  if (cat?.includes('stuck'))   return <Anchor    size={18} color="#ef4444" />;
  if (cat?.includes('circ'))    return <Droplets  size={18} color="#ea580c" />;
  if (cat?.includes('kick'))    return <Flame     size={18} color="#dc2626" />;
  if (cat?.includes('vibrat'))  return <Zap       size={18} color="#f59e0b" />;
  if (cat?.includes('instab'))  return <Layers    size={18} color="#8b5cf6" />;
  if (cat?.includes('break'))   return <Activity  size={18} color="#0284c7" />;
  return <ShieldAlert size={18} color="#16a34a" />;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DocumentDigitization({
  onNavigateToLanding,
  onNavigateToKnowledge,
  onNavigateToDashboard,
  onNavigateToFeatures
}) {
  const [file,        setFile]       = useState(null);
  const [processing,  setProcessing] = useState(false);
  const [result,      setResult]     = useState(null);
  const [error,       setError]      = useState(null);
  const resultsRef = useRef(null);

  // Auto scroll down to extracted results once extraction finishes
  useEffect(() => {
    if ((result || error) && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [result, error]);

  const onFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setResult(null);
    setError(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API}/api/digitize`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Server error');
      }

      setResult(data);

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message || 'Network error — please check that the backend is running.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const isDone      = Boolean(result && !error);
  const isFailed    = Boolean(error);
  const savedCount  = result?.items_saved?.length   ?? 0;
  const extractedCount = result?.items_extracted?.length ?? 0;

  return (
    <div className="digi-page" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {/* ── Topbar ── */}
      <header className="digi-topbar">
        <button type="button" className="digi-back-btn" onClick={onNavigateToLanding}>
          <ArrowLeft size={14} />
          <span>Home</span>
        </button>

        {onNavigateToFeatures && (
          <button type="button" className="digi-back-btn" onClick={onNavigateToFeatures}>
            <span>Features</span>
          </button>
        )}

        {onNavigateToDashboard && (
          <button type="button" className="digi-back-btn" onClick={onNavigateToDashboard}>
            <span>Live Telemetry</span>
          </button>
        )}

        <div className="digi-title">
          <Sparkles size={18} color="#7c3aed" />
          <h1>AI Document Digitization</h1>
        </div>

        <button
          type="button"
          className="digi-back-btn"
          onClick={onNavigateToKnowledge}
          style={{ marginLeft: 'auto', color: '#0284c7', borderColor: '#bae6fd' }}
        >
          <BookOpen size={14} />
          <span>Knowledge Base</span>
        </button>
      </header>

      {/* ── Main Content Container ── */}
      <main className="digi-content">
        {/* Hero Section */}
        <section className="digi-hero">
          <h2>Turn Drilling Documents<br />Into Searchable Knowledge</h2>
          <p>
            Upload a well report, SPE paper, or daily drilling incident PDF.
          </p>
        </section>

        {/* Center Upload Box */}
        <div className="digi-center-box">
          {/* SVG Filter for Doodle Jitter */}
          <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            <defs>
              <filter id="doodle-jitter" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>

          {/* Doodle Upload Component */}
          <label className="doodle-upload-container" tabIndex={0}>
            <input
              className="hidden-file-input"
              type="file"
              accept=".pdf,.txt,.md,.csv"
              onChange={onFileChange}
            />
            <div className="doodle-folder">
              <div className="folder-back">
                <div className="folder-tab" />
              </div>
              <div className="doodle-papers">
                <div className="paper file-1">
                  <div className="scribble-line" />
                  <div className="scribble-line short" />
                  <div className="scribble-line" />
                </div>
                <div className="paper file-2">
                  <svg viewBox="0 0 24 24" className="doodle-image-icon">
                    <rect x={3} y={3} width={18} height={18} rx={2} fill="none" stroke="currentColor" strokeWidth={2} />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="folder-front">
                <svg className="folder-smile" viewBox="0 0 24 24">
                  <path d="M 7 14 Q 12 19 17 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="doodle-btn">
              <span className="btn-text">
                {file ? 'Change file' : 'Choose a file'}
              </span>
            </div>

            <svg className="doodle-decor sparkle-1" viewBox="0 0 24 24">
              <path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z" fill="var(--btn-hover)" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <svg className="doodle-decor star-1" viewBox="0 0 24 24">
              <path d="M12 2L15 9L22 10L17 15L18.5 22L12 18.5L5.5 22L7 15L2 10L9 9L12 2Z" fill="var(--accent-blue)" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <svg className="doodle-paperclip" viewBox="0 0 24 24">
              <path d="M 12 4 L 12 18 C 12 20 9 20 9 18 L 9 6 C 9 3 15 3 15 6 L 15 16 C 15 18 13 18 13 16 L 13 8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </label>

          {/* File Info */}
          {file && (
            <div className="digi-file-badge">
              <FileText size={18} color="#0284c7" />
              <div style={{ overflow: 'hidden' }}>
                <div className="digi-file-name">{file.name}</div>
                <div className="digi-file-size">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            type="button"
            className="digi-upload-btn"
            onClick={isDone ? reset : handleUpload}
            disabled={!file || processing}
          >
            {processing ? (
              <>
                <Loader2 size={16} style={{ animation: 'digiSpin 1s linear infinite' }} />
                <span>Extracting & Ingesting…</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>{isDone ? 'Upload Another Document' : 'Extract & Ingest to Knowledge Base'}</span>
              </>
            )}
          </button>

          {isDone && (
            <button
              type="button"
              onClick={reset}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear & start over
            </button>
          )}
        </div>

        {/* ── Results Section ── */}
        {(isDone || isFailed || error) && (
          <div className="digi-results" ref={resultsRef}>
            {/* Error Banner */}
            {error && (
              <div className="digi-error-banner">
                <XCircle size={28} color="#dc2626" />
                <div>
                  <h3>Extraction Failed</h3>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Success Banner (New items saved) */}
            {isDone && !error && savedCount > 0 && (
              <div className="digi-saved-banner">
                <CheckCircle2 size={28} color="#16a34a" />
                <div>
                  <h3>✓ {savedCount} Knowledge Base {savedCount === 1 ? 'Entry' : 'Entries'} Saved Successfully</h3>
                  <p>New drilling risk records are now indexed and searchable in your Knowledge Base.</p>
                  {result?.note && (
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4, fontStyle: 'italic' }}>
                      {result.note}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = result?.items_saved?.[0] || result?.items_extracted?.[0];
                    if (onNavigateToKnowledge) {
                      onNavigateToKnowledge({
                        targetItemId: target?.item_id,
                        searchQuery: target?.title || '',
                        highlightItemIds: (result?.items_saved || []).map(s => s.item_id).filter(Boolean),
                        autoOpenDoc: true
                      });
                    }
                  }}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    background: '#16a34a', color: 'white', border: 'none',
                    borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <span>View in KB</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* Duplicate Check Banner (All items were already in KB) */}
            {isDone && !error && savedCount === 0 && (result?.duplicate_of > 0 || result?.duplicates_skipped?.length > 0) && (
              <div className="digi-saved-banner" style={{ background: '#fefce8', borderColor: '#fef08a' }}>
                <CheckCircle2 size={28} color="#ca8a04" />
                <div>
                  <h3 style={{ color: '#854d0e' }}>🛡️ Duplicate Check Active: {result.duplicate_of} Existing {result.duplicate_of === 1 ? 'Record' : 'Records'} Identified</h3>
                  <p style={{ color: '#a16207' }}>These drilling hazards were already cataloged in your Knowledge Base. Duplicate checking kept your database clean.</p>
                  {result?.note && (
                    <div style={{ fontSize: '0.75rem', color: '#713f12', marginTop: 4, fontStyle: 'italic' }}>
                      {result.note}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstDup = result.duplicates_skipped?.[0] || result.items_extracted?.[0];
                    if (onNavigateToKnowledge) {
                      onNavigateToKnowledge({
                        targetItemId: firstDup?.existing_id || firstDup?.item_id,
                        searchQuery: firstDup?.title || '',
                        autoOpenDoc: true
                      });
                    }
                  }}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    background: '#ca8a04', color: 'white', border: 'none',
                    borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(202, 138, 4, 0.25)'
                  }}
                >
                  <span>View in KB</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* Extracted Items List */}
            {result?.items_extracted?.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="#7c3aed" />
                    Extracted Knowledge Entries ({extractedCount})
                  </h3>
                  {result.engine_used && (
                    <span style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                      Engine: {result.engine_used}
                    </span>
                  )}
                </div>

                {result.items_extracted.map((item, idx) => (
                  <div
                    key={item.item_id || idx}
                    className="digi-result-card"
                    style={{
                      borderColor: item.category_color || '#0284c7',
                      borderLeftColor: item.category_color || '#0284c7'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span
                        className="digi-cat-badge"
                        style={{
                          background: `${item.category_color}18`,
                          color: item.category_color,
                          borderColor: `${item.category_color}44`
                        }}
                      >
                        {getCatIcon(item.category)}
                        {item.category_name || item.category}
                      </span>
                      <span className={`digi-sev-badge digi-sev-badge--${item.severity || 'high'}`}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {item.severity}
                      </span>
                      {item.is_duplicate ? (
                        <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                          🛡️ Duplicate (Already in KB)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                          ✓ Indexed to DB
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto' }}>{item.existing_id || item.item_id}</span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
                      {item.title}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      {item.symptoms_early_indicators?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284c7', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Symptoms
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.symptoms_early_indicators.slice(0, 3).map((s, i) => (
                              <li key={i} className="digi-list-item">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.root_causes?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Root Causes
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.root_causes.slice(0, 3).map((r, i) => (
                              <li key={i} className="digi-list-item">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.mitigation_actions?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Mitigation Actions
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {item.mitigation_actions.slice(0, 3).map((m, i) => (
                              <li key={i} className="digi-list-item">{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Card-level Direct Open in KB Button */}
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToKnowledge) {
                            onNavigateToKnowledge({
                              targetItemId: item.existing_id || item.item_id,
                              searchQuery: item.title,
                              highlightItemIds: [item.item_id, item.existing_id].filter(Boolean),
                              autoOpenDoc: true
                            });
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f8fafc', color: '#0284c7', border: '1px solid #bae6fd',
                          borderRadius: 7, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e0f2fe'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <BookOpen size={14} />
                        <span>Open Playbook in KB Modal</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
