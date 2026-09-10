import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  ChevronDown,
  Mic,
  Cpu,
  Compass
} from 'lucide-react';
import UnifiedNavbar from './UnifiedNavbar';
import '../features.css';

export default function FeaturesPage({
  onNavigateToLanding,
  onNavigateToDashboard,
  onNavigateToSpatial,
  onNavigateToKnowledge,
  onNavigateToDigitize,
  onNavigateToInstinct,
  onNavigateToWokwi,
  onNavigateToTechnology,
  onNavigateToTrajectory
}) {
  const [isAtBottom, setIsAtBottom] = useState(false);
  const digitizeCardRef = useRef(null);

  useEffect(() => {
    // Explicitly unlock body and html scrolling
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight;
      if (totalHeight - scrollPos < 60) {
        setIsAtBottom(true);
      } else {
        setIsAtBottom(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollToggle = () => {
    const scrollPos = window.scrollY + window.innerHeight;
    const totalHeight = document.documentElement.scrollHeight;

    if (isAtBottom || totalHeight - scrollPos < 70) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Smoothly scroll down by viewport segment
      window.scrollBy({ top: 580, behavior: 'smooth' });
    }
  };
  const features = [
    {
      id: 'ai-risk',
      badge: 'AI & Physics ML',
      badgeClass: 'rig-badge--orange',
      title: 'AI Risk Detection & Mitigation',
      items: [
        'Real-time kick & gas influx detection',
        'Stuck pipe & pack-off overpull alerts',
        'Immediate 3-phase emergency mitigation',
        'SPE literature backed evidence',
      ],
      btnText: 'Launch Live Detection',
      onClick: () => onNavigateToDashboard(),
    },
    {
      id: 'trajectory',
      badge: 'Interactive WebGL 3D',
      badgeStyle: { background: '#e0f2fe', color: '#0066ee' },
      title: '3D Well Trajectory & Anti-Collision',
      items: [
        'Real-time directional wellbore & planned corridor',
        'Offset well proximity & anti-collision safety factor',
        'Subsurface geological horizons & target penetration',
        'Interactive depth timeline with historical risk intervals',
      ],
      btnText: 'Launch 3D Trajectory',
      btnStyle: { background: '#0066ee' },
      onClick: () => onNavigateToTrajectory && onNavigateToTrajectory(),
    },
    {
      id: 'knowledge',
      badge: 'Knowledge Corpus',
      badgeClass: 'rig-badge--amber',
      title: 'Searchable Knowledge Repository',
      items: [
        'Search by Risk, Formation & Well',
        'Split-screen PDF viewer & AI synthesis',
        'Extracted 4-phase mitigation playbooks',
        'Live rig telemetry 96% relevance matching',
      ],
      btnText: 'Search Knowledge Base',
      onClick: () => onNavigateToKnowledge && onNavigateToKnowledge(),
    },
    {
      id: 'wokwi',
      badge: 'Edge AI & Hardware',
      badgeStyle: { background: '#e0f7fa', color: '#0e7490' },
      title: 'Rig Simulation Lab',
      items: [
        'Full Wokwi embedded simulation in-app',
        'ESP32 / Arduino virtual component I/O',
        'Fullscreen mode & live reload controls',
        'Open full editor directly in Wokwi',
      ],
      btnText: 'Launch Simulation',
      btnStyle: { background: '#0e7490' },
      onClick: () => onNavigateToWokwi && onNavigateToWokwi(),
    },
    {
      id: 'spatial',
      badge: 'Proactive Spatial Map',
      badgeClass: 'rig-badge--blue',
      title: 'Proactive Visualization Maps',
      items: [
        'Geospatial drill hazard & proactive risk zone mapping',
        'Offset well proximity tracking & similarity analysis',
        'Stratigraphic formation horizons & lithology overlay',
        'Historical incident buffers & interactive spatial layers',
      ],
      btnText: 'Explore Proactive Maps',
      onClick: () => onNavigateToSpatial(),
    },
    {
      id: 'digitize',
      ref: digitizeCardRef,
      badge: 'Groq LLaMA 3.3 AI',
      badgeStyle: { background: '#f3e8ff', color: '#7c3aed' },
      title: 'AI Document Digitization',
      items: [
        'Upload well logs, daily reports & SPE PDFs',
        'Groq LLaMA 3.3 70B structured extraction',
        'Domain relevance filter & duplicate check',
        'Direct KB persistence',
      ],
      btnText: 'Digitize Documents',
      onClick: () => onNavigateToDigitize && onNavigateToDigitize(),
    },
    {
      id: 'instinct',
      badge: "Driller's Instinct AI",
      badgeStyle: { background: '#ffe4e6', color: '#f43f5e' },
      title: 'Tacit Knowledge Capture',
      items: [
        'Capture tacit knowledge at field with GPS tag',
        'Glowing audio orb for live voice recording',
        'Mobile camera photo & video evidence capture',
        'Fast grouped storage for instant KB retrieval',
      ],
      btnText: 'Capture Field Instinct',
      btnStyle: { background: '#f43f5e' },
      onClick: () => onNavigateToInstinct && onNavigateToInstinct(),
    },
  ];

  return (
    <div className="features-page-container">
      {/* ── Top Navigation Bar ── */}
      <UnifiedNavbar
        onNavigateToFeatures={() => {}}
        onNavigateToLanding={onNavigateToLanding}
        activePage="features"
      />

      {/* ── Main Content ── */}
      <main className="features-hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>DRILLSIGHT PLATFORM ({features.length} CAPABILITIES)</span>
        </div>

        <h1 className="hero-headline">
          <span className="headline-highlight">{features.length}</span> Intelligent Pillars for <span className="headline-highlight">Zero-NPT</span> Drilling
        </h1>
        <p className="hero-subline">
          Explore the {features.length} core capabilities powering real-time drilling safety and well control.
        </p>

        {/* ── Cards Grid (Pumpjack Illustrated Frame Cards) ── */}
        <div className="cards-grid">
          <div className="cards-row-primary">
            {features.slice(0, 3).map((card) => (
              <div key={card.id} className="rig-card-wrapper" ref={card.ref}>
                <div className="rig-feature-card">
                  <div className="rig-card-content">
                    <div className="rig-card-badge-row">
                      <span className={`rig-badge ${card.badgeClass || ''}`} style={card.badgeStyle}>
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="rig-card-title">{card.title}</h3>

                    <ul className="rig-check-list" role="list">
                      {card.items.map((item, idx) => (
                        <li key={idx} className="rig-check-item">
                          <CheckmarkIcon />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="rig-try-btn"
                      onClick={card.onClick}
                      style={card.btnStyle}
                    >
                      <span>{card.btnText}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SECOND ROW: Specialized Rig & Subsurface Capabilities */}
          <div className="cards-row-secondary">
            {features.slice(3).map((card) => (
              <div key={card.id} className="rig-card-wrapper" ref={card.ref}>
                <div className="rig-feature-card">
                  <div className="rig-card-content">
                    <div className="rig-card-badge-row">
                      <span className={`rig-badge ${card.badgeClass || ''}`} style={card.badgeStyle}>
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="rig-card-title">{card.title}</h3>

                    <ul className="rig-check-list" role="list">
                      {card.items.map((item, idx) => (
                        <li key={idx} className="rig-check-item">
                          <CheckmarkIcon />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="rig-try-btn"
                      onClick={card.onClick}
                      style={card.btnStyle}
                    >
                      <span>{card.btnText}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
