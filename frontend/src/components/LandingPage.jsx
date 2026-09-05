import { useState, useEffect } from 'react';
import {
  ArrowRight, Play, Activity, Gauge, Compass, Droplets, X
} from 'lucide-react';
import '../landing.css';

export default function LandingPage({
  onLaunch,
  onNavigateToSpatial,
  onNavigateToFeatures,
  onNavigateToKnowledge
}) {
  const [activeNav, setActiveNav] = useState('Home');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Subtle real-time live telemetry fluctuations
  const [telemetry, setTelemetry] = useState({
    hookLoad: 245.3,
    pumpPressure: 3120,
    rotarySpeed: 120,
    mudFlow: 540,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        hookLoad: +(245 + (Math.random() * 0.6 - 0.3)).toFixed(1),
        pumpPressure: Math.round(3118 + Math.random() * 8),
        rotarySpeed: Math.round(119 + Math.random() * 2),
        mudFlow: Math.round(539 + Math.random() * 3),
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      {/* ── Top Navigation Bar ── */}
      <nav className="landing-nav">
        <div className="landing-brand" onClick={() => setActiveNav('Home')}>
          <div className="landing-logo-mark">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <polygon points="18,3 31,23 18,16" fill="#fbbf24" />
              <polygon points="18,3 18,16 5,23" fill="#f59e0b" />
              <polygon points="18,16 31,23 23,33 18,27" fill="#0284c7" />
              <polygon points="18,16 18,27 13,33 5,23" fill="#38bdf8" />
            </svg>
          </div>
          <div className="landing-brand-text">
            <span className="landing-brand-title">DrillSight</span>
            <span className="landing-brand-tagline">Safer Wells. Smarter Decisions.</span>
          </div>
        </div>

        <ul className="landing-nav-links">
          {['Home', 'Features', 'Technology', 'Impact', 'About'].map((item) => (
            <li key={item}>
              <button
                type="button"
                className={`landing-nav-link ${activeNav === item ? 'active' : ''}`}
                onClick={() => {
                  if (item === 'Features' && onNavigateToFeatures) {
                    onNavigateToFeatures();
                  } else {
                    setActiveNav(item);
                  }
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onNavigateToSpatial && (
            <button
              type="button"
              className="landing-nav-link"
              style={{
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(56, 189, 248, 0.08)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={onNavigateToSpatial}
              title="Launch Spatial Intelligence Map"
            >
              Spatial Intelligence
            </button>
          )}
          {onNavigateToKnowledge && (
            <button
              type="button"
              className="landing-nav-link"
              style={{
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'rgba(245, 158, 11, 0.08)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={onNavigateToKnowledge}
              title="Open Searchable Mitigation Knowledge Repository"
            >
              Knowledge Base
            </button>
          )}
          <button
            type="button"
            className="landing-cta-btn"
            onClick={onLaunch}
          >
            <span>Get Started</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-hero-body">
          {/* Left Column: Headlines & Actions */}
          <div className="hero-left-content">
            <div className="hero-eyebrow">
              AI · IOT · FOR A SAFER TOMORROW
            </div>

            <h1 className="hero-title">
              Smarter <span className="hero-title-accent">Drilling.</span><br />
              Brighter Futures.
            </h1>

            <p className="hero-subtitle">
              Real-time insights, risk prediction and intelligent decision support for oil well drilling powered by AI and edge IoT.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="explore-cta-btn"
                onClick={onLaunch}
              >
                <span className="cta-span">EXPLORE THE PLATFORM</span>
                <span className="second">
                  <svg width="46px" height="18px" viewBox="0 0 66 43" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <g id="arrow" stroke="none" strokeWidth={1} fill="none" fillRule="evenodd">
                      <path className="one" d="M40.1543933,3.89485454 L43.9763149,0.139296592 C44.1708311,-0.0518420739 44.4826329,-0.0518571125 44.6771675,0.139262789 L65.6916134,20.7848311 C66.0855801,21.1718824 66.0911863,21.8050225 65.704135,22.1989893 C65.7000188,22.2031791 65.6958657,22.2073326 65.6916762,22.2114492 L44.677098,42.8607841 C44.4825957,43.0519059 44.1708242,43.0519358 43.9762853,42.8608513 L40.1545186,39.1069479 C39.9575152,38.9134427 39.9546793,38.5968729 40.1481845,38.3998695 C40.1502893,38.3977268 40.1524132,38.395603 40.1545562,38.3934985 L56.9937789,21.8567812 C57.1908028,21.6632968 57.193672,21.3467273 57.0001876,21.1497035 C56.9980647,21.1475418 56.9959223,21.1453995 56.9937605,21.1432767 L40.1545208,4.60825197 C39.9574869,4.41477773 39.9546013,4.09820839 40.1480756,3.90117456 C40.1501626,3.89904911 40.1522686,3.89694235 40.1543933,3.89485454 Z" fill="#FFFFFF" />
                      <path className="two" d="M20.1543933,3.89485454 L23.9763149,0.139296592 C24.1708311,-0.0518420739 24.4826329,-0.0518571125 24.6771675,0.139262789 L45.6916134,20.7848311 C46.0855801,21.1718824 46.0911863,21.8050225 45.704135,22.1989893 C45.7000188,22.2031791 45.6958657,22.2073326 45.6916762,22.2114492 L24.677098,42.8607841 C24.4825957,43.0519059 24.1708242,43.0519358 23.9762853,42.8608513 L20.1545186,39.1069479 C19.9575152,38.9134427 19.9546793,38.5968729 20.1481845,38.3998695 C20.1502893,38.3977268 20.1524132,38.395603 20.1545562,38.3934985 L36.9937789,21.8567812 C37.1908028,21.6632968 37.193672,21.3467273 37.0001876,21.1497035 C36.9980647,21.1475418 36.9959223,21.1453995 36.9937605,21.1432767 L20.1545208,4.60825197 C19.9574869,4.41477773 19.9546013,4.09820839 20.1480756,3.90117456 C20.1501626,3.89904911 20.1522686,3.89694235 20.1543933,3.89485454 Z" fill="#FFFFFF" />
                      <path className="three" d="M0.154393339,3.89485454 L3.97631488,0.139296592 C4.17083111,-0.0518420739 4.48263286,-0.0518571125 4.67716753,0.139262789 L25.6916134,20.7848311 C26.0855801,21.1718824 26.0911863,21.8050225 25.704135,22.1989893 C25.7000188,22.2031791 25.6958657,22.2073326 25.6916762,22.2114492 L4.67709797,42.8607841 C4.48259567,43.0519059 4.17082418,43.0519358 3.97628526,42.8608513 L0.154518591,39.1069479 C-0.0424848215,38.9134427 -0.0453206733,38.5968729 0.148184538,38.3998695 C0.150289256,38.3977268 0.152413239,38.395603 0.154556228,38.3934985 L16.9937789,21.8567812 C17.1908028,21.6632968 17.193672,21.3467273 17.0001876,21.1497035 C16.9980647,21.1475418 16.9959223,21.1453995 16.9937605,21.1432767 L0.15452076,4.60825197 C-0.0425130651,4.41477773 -0.0453986756,4.09820839 0.148075568,3.90117456 C0.150162624,3.89904911 0.152268631,3.89694235 0.154393339,3.89485454 Z" fill="#FFFFFF" />
                    </g>
                  </svg>
                </span>
              </button>

              <button
                type="button"
                className="hero-btn-secondary"
                onClick={() => setIsVideoModalOpen(true)}
              >
                <Play size={14} fill="currentColor" />
                <span>Watch Video</span>
              </button>
            </div>

            {/* ── 3D Rotating Cards Widget ── */}
            <div className="rotating-card-wrapper">
              <div className="wrap_card">
                <div className="card">
                  <div className="content">
                    <div className="card-icon-bubble">
                      <svg fill="#000000" viewBox="0 0 24 24" height={30} width={30} xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.3999 17.4999C11.8999 17.2999 11.2999 17.3999 11.0999 17.8999L9.29989 21.4999C8.99989 21.9999 9.19989 22.5999 9.69989 22.8999C9.79989 22.9999 9.99989 22.9999 10.1999 22.9999C10.5999 22.9999 10.8999 22.7999 11.0999 22.4999L12.8999 18.8999C13.0999 18.2999 12.8999 17.6999 12.3999 17.4999Z" />
                        <path d="M17 17.4999C16.5 17.2999 15.9 17.3999 15.7 17.8999L13.9 21.4999C13.7 21.9999 13.8 22.5999 14.3 22.7999C14.4 22.8999 14.6 22.8999 14.8 22.8999C15.2 22.8999 15.5 22.6999 15.7 22.3999L17.5 18.7999C17.7 18.2999 17.5 17.6999 17 17.4999Z" />
                        <path d="M7.89994 17.4999C7.39994 17.2999 6.79994 17.3999 6.59994 17.8999L4.79994 21.4999C4.59994 21.9999 4.69994 22.5999 5.19994 22.7999C5.29994 22.9999 5.49994 22.9999 5.59994 22.9999C5.99994 22.9999 6.29994 22.7999 6.49994 22.4999L8.29994 18.8999C8.59994 18.2999 8.39994 17.6999 7.89994 17.4999Z" />
                        <path d="M15.2 1C12.4 1 9.9 2.5 8.5 4.8C8 4.7 7.5 4.6 7 4.6C3.7 4.6 1 7.3 1 10.6C1 13.9 3.7 16.6 7 16.6H15.2C19.5 16.6 23 13.1 23 8.8C23 4.5 19.5 1 15.2 1Z" />
                      </svg>
                    </div>
                    <div className="card-center-title">
                      Real-Time<br />Telemetry
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="content">
                    <div className="card-icon-bubble">
                      <svg fill="#000000" viewBox="0 0 24 24" height={30} width={30} xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.2999 22.0001C9.59992 22.0001 6.99992 21.0001 4.99992 19.0001C0.999923 15.0001 0.999923 8.70009 4.89992 4.80009C6.29992 3.30009 8.19992 2.30009 10.2999 2.00009C10.6999 1.90009 11.0999 2.10009 11.2999 2.50009C11.4999 2.90009 11.4999 3.30009 11.1999 3.60009C8.99992 6.10009 9.19992 10.0001 11.5999 12.4001C13.9999 14.8001 17.7999 15.0001 20.2999 12.8001C20.5999 12.5001 21.0999 12.5001 21.3999 12.7001C21.7999 12.9001 21.9999 13.3001 21.8999 13.7001C21.5999 15.8001 20.5999 17.6001 19.1999 19.1001C17.2999 21.0001 14.7999 22.0001 12.2999 22.0001Z" />
                      </svg>
                    </div>
                    <div className="card-center-title">
                      Predictive<br />Drilling
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="content">
                    <div className="card-icon-bubble">
                      <svg fill="#000000" viewBox="0 0 24 24" height={30} width={30} xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.49995 22.9999C8.19995 22.9999 7.89995 22.8999 7.59995 22.7999C6.79995 22.3999 6.39995 21.5999 6.59995 20.7999L7.79995 14.9999H5.99995C5.19995 14.9999 4.49995 14.4999 4.19995 13.7999C3.89995 13.0999 3.99995 12.2999 4.59995 11.7999L14.0999 1.6999C14.6999 1.0999 15.6999 0.899901 16.3999 1.2999C17.1999 1.6999 17.5999 2.4999 17.3999 3.2999L16.1999 9.0999H17.9999C18.7999 9.0999 19.4999 9.5999 19.7999 10.2999C20.0999 10.9999 19.9999 11.7999 19.3999 12.2999L9.89995 22.3999C9.49995 22.7999 8.99995 22.9999 8.49995 22.9999Z" />
                      </svg>
                    </div>
                    <div className="card-center-title">
                      Early Risk<br />Alerts
                    </div>
                  </div>
                </div>
                <div 
                  className="card"
                  onClick={onNavigateToKnowledge}
                  style={{ cursor: 'pointer' }}
                  title="Open Searchable Mitigation Knowledge Repository"
                >
                  <div className="content">
                    <div className="card-icon-bubble">
                      <svg fill="#000000" viewBox="0 0 24 24" height={28} width={28} xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 2H5C3.9 2 3 2.9 3 4v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1s.45-1 1-1h12c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H6c-.55 0-1-.45-1-1s.45-1 1-1h12c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H6c-.55 0-1-.45-1-1s.45-1 1-1h12c.55 0 1 .45 1 1s-.45 1-1 1z" />
                      </svg>
                    </div>
                    <div className="card-center-title">
                      Mitigation<br />Knowledge
                    </div>
                  </div>
                </div>
                <svg style={{ visibility: 'hidden', width: 0, height: 0, position: 'absolute' }}>
                  <defs>
                    <linearGradient id="gradient-full" x1="0%" y1="0%" x2="120%" y2="120%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#ffffff00" />
                    </linearGradient>
                    <linearGradient id="gradient-half" x1="-50%" y1="-50%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#ffffff00" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="lines">
                  <div className="line" />
                  <div className="line" />
                </div>
              </div>
            </div>
          </div>

          {/* Center Floating Card: Live Well Data */}
          <div className="center-telemetry-widget">
            <div className="live-card-header">
              <span className="live-card-title">Live Well Data</span>
              <span className="live-card-status">
                <span className="status-pulse-dot" />
                Online
              </span>
            </div>

            <div className="live-card-metrics">
              <div className="metric-row">
                <div className="metric-left">
                  <Activity className="metric-icon" />
                  <span>Hook Load</span>
                </div>
                <div className="metric-right">
                  <span className="metric-value">{telemetry.hookLoad}</span>
                  <span className="metric-unit">klb</span>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-left">
                  <Gauge className="metric-icon" />
                  <span>Pump Pressure</span>
                </div>
                <div className="metric-right">
                  <span className="metric-value">{telemetry.pumpPressure.toLocaleString()}</span>
                  <span className="metric-unit">psi</span>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-left">
                  <Compass className="metric-icon" />
                  <span>Rotary Speed</span>
                </div>
                <div className="metric-right">
                  <span className="metric-value">{telemetry.rotarySpeed}</span>
                  <span className="metric-unit">rpm</span>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-left">
                  <Droplets className="metric-icon" />
                  <span>Mud Flow Rate</span>
                </div>
                <div className="metric-right">
                  <span className="metric-value">{telemetry.mudFlow}</span>
                  <span className="metric-unit">gpm</span>
                </div>
              </div>
            </div>

            {/* Fine Jagged Telemetry Waveform Line */}
            <div className="live-card-sparkline">
              <svg viewBox="0 0 240 32" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <path
                  d="M0,20 L25,20 L35,12 L43,26 L50,16 L58,20 L85,20 L94,8 L102,28 L111,4 L120,24 L129,20 L155,20 L164,12 L172,25 L180,20 L240,20"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="live-card-footer">
              All systems nominal
            </div>
          </div>

          {/* Right Column: Tagline & Risk Prediction Card */}
          <div className="hero-right-column">
            <div className="hero-tagline-block">
              <div className="hero-tagline-text">DEEPER INSIGHTS</div>
              <div className="hero-tagline-text">SAFER OPERATIONS</div>
              <div className="hero-tagline-text">A CLEANER TOMORROW</div>
              <div className="hero-tagline-dash" />
            </div>

            <div className="risk-prediction-card">
              <div className="risk-card-header-title">Risk Prediction</div>

              <div className="risk-radial-wrap">
                <svg viewBox="0 0 100 100" width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="50" cy="50" r="38"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="6"
                  />
                  <defs>
                    <linearGradient id="riskGradArc" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50" cy="50" r="38"
                    fill="none"
                    stroke="url(#riskGradArc)"
                    strokeWidth="6"
                    strokeDasharray="238.7"
                    strokeDashoffset={238.7 * (1 - 0.12)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="risk-radial-number">
                  <span>12%</span>
                </div>
              </div>

              <div className="risk-card-label">Low Risk</div>
              <div className="risk-card-sub">Stable drilling conditions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Demo Preview Modal ── */}
      {isVideoModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsVideoModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 94vw)',
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 30px rgba(245, 158, 11, 0.2)',
              position: 'relative',
              color: '#ffffff',
            }}
          >
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase' }}>
                Platform Demo &amp; System Overview
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
              Autonomous Rig Risk Prediction in Action
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Experience how DrillSight synchronizes surface telemetry (WOB, ROP, Torque, SPP) with physics-informed AI to detect stuck pipe, influxes, and lost circulation before they escalate.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  borderRadius: 999,
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsVideoModalOpen(false);
                  onLaunch();
                }}
                className="hero-btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.94rem' }}
              >
                <span>Launch Live Platform</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
