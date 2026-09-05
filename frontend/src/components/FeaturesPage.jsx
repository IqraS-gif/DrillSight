import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import '../features.css';

export default function FeaturesPage({
  onNavigateToLanding,
  onNavigateToDashboard,
  onNavigateToSpatial,
  onNavigateToKnowledge,
  onNavigateToDigitize
}) {
  const [isAtBottom, setIsAtBottom] = useState(false);
  const digitizeCardRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight;
      if (totalHeight - scrollPos < 260) {
        setIsAtBottom(true);
      } else {
        setIsAtBottom(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToggle = () => {
    if (isAtBottom) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (digitizeCardRef.current) {
        digitizeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollBy({ top: 600, behavior: 'smooth' });
      }
    }
  };
  return (
    <div className="features-page-container">
      {/* ── Top Navigation Bar ── */}
      <nav className="features-nav">
        <div className="features-brand" onClick={onNavigateToLanding}>
          <div className="brand-logo-mark">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
              <polygon points="18,3 31,23 18,16" fill="#fbbf24" />
              <polygon points="18,3 18,16 5,23" fill="#f59e0b" />
              <polygon points="18,16 31,23 23,33 18,27" fill="#0284c7" />
              <polygon points="18,16 18,27 13,33 5,23" fill="#38bdf8" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">DrillSight</span>
            <span className="brand-tagline">Core Capabilities</span>
          </div>
        </div>

        <div className="features-nav-actions">
          <button
            type="button"
            className="nav-btn nav-btn--ghost"
            onClick={onNavigateToLanding}
          >
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </button>
          {onNavigateToKnowledge && (
            <button
              type="button"
              className="nav-btn nav-btn--ghost"
              onClick={onNavigateToKnowledge}
              title="Open Searchable Knowledge Repository"
            >
              <span>Knowledge Base</span>
            </button>
          )}
          {onNavigateToDigitize && (
            <button
              type="button"
              className="nav-btn nav-btn--ghost"
              onClick={onNavigateToDigitize}
              title="Digitize & Ingest Well Reports via Groq AI"
              style={{ color: '#7c3aed', borderColor: 'rgba(124, 58, 237, 0.3)' }}
            >
              <Sparkles size={14} />
              <span>AI Digitize</span>
            </button>
          )}
          <button
            type="button"
            className="nav-btn nav-btn--primary"
            onClick={() => onNavigateToDashboard()}
          >
            <span>Live Dashboard</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="features-hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>DRILLSIGHT PLATFORM CAPABILITIES</span>
        </div>

        <h1 className="hero-headline">
          Intelligent Pillars for <span className="headline-highlight">Zero-NPT</span> Drilling
        </h1>
        <p className="hero-subline">
          Explore the core capabilities powering real-time drilling safety and well control.
        </p>

        {/* ── Cards Grid (Pumpjack Illustrated Frame Cards) ── */}
        <div className="cards-grid">
          <div className="cards-row-primary">
            {/* CARD 1: AI Risk Detection & Mitigation */}
            <div className="rig-card-wrapper">
            <div className="rig-feature-card">
              <div className="rig-card-content">
                <div className="rig-card-badge-row">
                  <span className="rig-badge rig-badge--orange">AI &amp; Physics ML</span>
                </div>
                
                <h3 className="rig-card-title">AI Risk Detection &amp; Mitigation</h3>
                
                <div className="rig-price-row">
                  <span className="rig-price-val">Real-Time</span>
                  <span className="rig-price-sub">/Telemetry</span>
                </div>
                
                <div className="rig-card-note">Physics ML &amp; Actionable Playbooks</div>
                
                <ul className="rig-check-list" role="list">
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Real-time kick &amp; gas influx detection</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Stuck pipe &amp; pack-off overpull alerts</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Immediate 3-phase emergency mitigation</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>MongoDB &amp; SPE literature backed evidence</span>
                  </li>
                </ul>

                <button
                  type="button"
                  className="rig-try-btn"
                  onClick={() => onNavigateToDashboard()}
                >
                  <span>Launch Live Detection</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: 3D Spatial Intelligence & Well Map */}
          <div className="rig-card-wrapper">
            <div className="rig-feature-card">
              <div className="rig-card-content">
                <div className="rig-card-badge-row">
                  <span className="rig-badge rig-badge--blue">3D Spatial Map</span>
                </div>
                
                <h3 className="rig-card-title">3D Spatial Intelligence Map</h3>
                
                <div className="rig-price-row">
                  <span className="rig-price-val">3D Subsurface</span>
                  <span className="rig-price-sub">/Map</span>
                </div>
                
                <div className="rig-card-note">Offset Well Trajectories &amp; Horizons</div>
                
                <ul className="rig-check-list" role="list">
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Interactive 3D directional trajectory viewer</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Proximity tracking across offset wells</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Stratigraphic formation horizon lithology</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Geospatial drill hazard risk zones</span>
                  </li>
                </ul>

                <button
                  type="button"
                  className="rig-try-btn"
                  onClick={() => onNavigateToSpatial()}
                >
                  <span>Explore 3D Trajectories</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: Searchable Knowledge Repository */}
          <div className="rig-card-wrapper">
            <div className="rig-feature-card">
              <div className="rig-card-content">
                <div className="rig-card-badge-row">
                  <span className="rig-badge rig-badge--amber">Knowledge Corpus</span>
                </div>
                
                <h3 className="rig-card-title">Searchable Knowledge Repository</h3>
                
                <div className="rig-price-row">
                  <span className="rig-price-val">Mitigation</span>
                  <span className="rig-price-sub">/Repository</span>
                </div>
                
                <div className="rig-card-note">SPE Papers, Well Reports &amp; Playbooks</div>
                
                <ul className="rig-check-list" role="list">
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Search by Risk, Formation &amp; Well</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Split-screen PDF viewer &amp; AI synthesis</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Extracted 4-phase mitigation playbooks</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Live rig telemetry 96% relevance matching</span>
                  </li>
                </ul>

                <button
                  type="button"
                  className="rig-try-btn"
                  onClick={() => onNavigateToKnowledge && onNavigateToKnowledge()}
                >
                  <span>Search Knowledge Base</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECOND ROW: Card 4 (Centered) */}
        <div className="cards-row-secondary">
          {/* CARD 4: AI Document Digitization & Ingestion */}
          <div className="rig-card-wrapper" ref={digitizeCardRef}>
            <div className="rig-feature-card">
              <div className="rig-card-content">
                <div className="rig-card-badge-row">
                  <span className="rig-badge" style={{ background: '#f3e8ff', color: '#7c3aed' }}>Groq LLaMA 3.3 AI</span>
                </div>
                
                <h3 className="rig-card-title">AI Document Digitization</h3>
                
                <div className="rig-price-row">
                  <span className="rig-price-val">Automated</span>
                  <span className="rig-price-sub">/Ingestion</span>
                </div>
                
                <div className="rig-card-note">Turn Raw PDFs &amp; Logs into KB Records</div>
                
                <ul className="rig-check-list" role="list">
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Upload well logs, daily reports &amp; SPE PDFs</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Groq LLaMA 3.3 70B structured extraction</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Domain relevance filter &amp; duplicate check</span>
                  </li>
                  <li className="rig-check-item">
                    <CheckmarkIcon />
                    <span>Direct MongoDB &amp; KB persistence</span>
                  </li>
                </ul>

                <button
                  type="button"
                  className="rig-try-btn"
                  onClick={() => onNavigateToDigitize && onNavigateToDigitize()}
                >
                  <span>Digitize Documents</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>

      {/* ── Fixed Animated Scroll Down Indicator (Pinned to Bottom-Left, Always Visible) ── */}
      <div
        className="fixed-scroll-indicator"
        onClick={handleScrollToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleScrollToggle(); }}
        title={isAtBottom ? "Scroll back to top" : "Scroll down to more features"}
      >
        <div className="fixed-scroll-btn">
          <ChevronDown 
            size={24} 
            strokeWidth={3} 
            className={`fixed-scroll-icon ${isAtBottom ? 'fixed-scroll-icon--up' : 'fixed-scroll-icon--bounce'}`} 
          />
        </div>
        <div className="fixed-scroll-pill">
          <Sparkles size={13} color="#ea580c" />
          <span>{isAtBottom ? 'Back to Top ↑' : 'More Features ↓'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Checkmark SVG from User Snippet ──
function CheckmarkIcon() {
  return (
    <svg 
      version={1.0} 
      preserveAspectRatio="xMidYMid meet" 
      height={16} 
      viewBox="0 0 30 30.000001" 
      width={16} 
      style={{ color: '#05060f', minWidth: 16 }}
    >
      <defs>
        <clipPath id="checkClip">
          <path fill="#05060f" clipRule="nonzero" d="M 2.328125 4.222656 L 27.734375 4.222656 L 27.734375 24.542969 L 2.328125 24.542969 Z M 2.328125 4.222656" />
        </clipPath>
      </defs>
      <g clipPath="url(#checkClip)">
        <path 
          fillRule="nonzero" 
          fillOpacity={1} 
          d="M 27.5 7.53125 L 24.464844 4.542969 C 24.15625 4.238281 23.65625 4.238281 23.347656 4.542969 L 11.035156 16.667969 L 6.824219 12.523438 C 6.527344 12.230469 6 12.230469 5.703125 12.523438 L 2.640625 15.539062 C 2.332031 15.84375 2.332031 16.335938 2.640625 16.640625 L 10.445312 24.324219 C 10.59375 24.472656 10.796875 24.554688 11.007812 24.554688 C 11.214844 24.554688 11.417969 24.472656 11.566406 24.324219 L 27.5 8.632812 C 27.648438 8.488281 27.734375 8.289062 27.734375 8.082031 C 27.734375 7.875 27.648438 7.679688 27.5 7.53125 Z M 27.5 7.53125" 
          fill="#05060f" 
        />
      </g>
    </svg>
  );
}
