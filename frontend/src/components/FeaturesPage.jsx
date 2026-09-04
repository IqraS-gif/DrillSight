import React from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';
import '../features.css';

export default function FeaturesPage({
  onNavigateToLanding,
  onNavigateToDashboard,
  onNavigateToSpatial
}) {
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

        {/* ── Cards Grid (Neo-Brutalism Cards) ── */}
        <div className="cards-grid">
          {/* CARD 1: AI Risk Detection & Mitigation */}
          <div className="neo-wrapper">
            <div className="neo-card neo-card--green">
              <div className="pricing-block-content">
                <p className="pricing-plan">AI Risk Detection &amp; Mitigation</p>
                <div className="price-value">
                  <p className="price-number">Real-Time</p>
                  <div id="priceDiscountCent">/Telemetry</div>
                </div>
                <div className="pricing-note">Physics ML &amp; Actionable Playbooks</div>
                
                <ul className="check-list" role="list">
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Real-time kick &amp; gas influx detection</span>
                  </li>
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Stuck pipe &amp; pack-off overpull alerts</span>
                  </li>
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Immediate 3-phase emergency mitigation</span>
                  </li>
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>MongoDB &amp; SPE literature backed evidence</span>
                  </li>
                </ul>

                <button
                  type="button"
                  className="neo-try-btn"
                  onClick={() => onNavigateToDashboard()}
                >
                  <span>Try Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: 3D Spatial Intelligence & Well Map (Purple) */}
          <div className="neo-wrapper">
            <div className="neo-card neo-card--purple">
              <div className="pricing-block-content">
                <p className="pricing-plan">3D Spatial Intelligence Map</p>
                <div className="price-value">
                  <p className="price-number">3D Subsurface</p>
                  <div id="priceDiscountCent">/Map</div>
                </div>
                <div className="pricing-note">Offset Well Trajectories &amp; Horizons</div>
                
                <ul className="check-list" role="list">
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Interactive 3D directional trajectory viewer</span>
                  </li>
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Proximity tracking across offset wells</span>
                  </li>
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Stratigraphic formation horizon lithology</span>
                  </li>
                  <li className="check-list-item">
                    <CheckmarkIcon />
                    <span>Geospatial drill hazard risk zones</span>
                  </li>
                </ul>

                <button
                  type="button"
                  className="neo-try-btn"
                  onClick={() => onNavigateToSpatial()}
                >
                  <span>Try Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
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
