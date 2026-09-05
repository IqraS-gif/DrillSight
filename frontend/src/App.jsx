import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Drill, SlidersHorizontal, BarChart3,
  MapPin, AlertTriangle, RefreshCw, ChevronRight, ChevronDown, Map, ArrowLeft, ShieldAlert, BookOpen, Sparkles
} from 'lucide-react';

import RiskGauge       from './components/RiskGauge';
import RiskBreakdown   from './components/RiskBreakdown';
import DrillingKnobs   from './components/DrillingKnobs';
import TimeToIncident  from './components/TimeToIncident';
import AnomalyAlert    from './components/AnomalyAlert';
import ZoneEvidence    from './components/ZoneEvidence';
import WellMapModal    from './components/WellMapModal';
import MitigationModal from './components/MitigationModal';
import LandingPage    from './components/LandingPage';
import FeaturesPage   from './components/FeaturesPage';
import SpatialIntelligence from './components/SpatialIntelligence';
import KnowledgeRepository from './components/KnowledgeRepository';
import DocumentDigitization from './components/DocumentDigitization';
import { computePhysicsRisk } from './utils/physicsRisk';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_PARAMS = {
  depth: 2000, wob: 30, rop: 25, torque: 8,
  hookload: 100, mud_in: 1.2, spp: 8000, shock: 2, gas: 0.05, rpm: 80,
};

// ── Scenario definitions ──────────────────────────────────────────────────────
// Params are tuned so the physics engine gives HIGH risk (65–85%) on load.
// Pure physics is the ONLY source of truth — no pinned probabilities.
const SCENARIOS = [
  {
    id: 'normal',
    label: 'Normal Drilling',
    color: '#0066ee',
    params: { depth: 2000, wob: 30, rop: 25, torque: 8, hookload: 100, mud_in: 1.2, spp: 8000, shock: 2, gas: 0.05, rpm: 80 },
  },
  {
    id: 'stuck_pipe',
    label: 'Stuck Pipe — High Risk',
    color: '#ff6b00',
    params: { depth: 4500, wob: 95, rop: 1, torque: 34, hookload: 270, mud_in: 1.15, spp: 9500, shock: 8, gas: 0.1, rpm: 55 },
  },
  {
    id: 'kick',
    label: 'Kick / Influx',
    color: '#ff6b00',
    params: { depth: 4200, wob: 45, rop: 88, torque: 12, hookload: 92, mud_in: 0.93, spp: 5800, shock: 3, gas: 28, rpm: 120 },
  },
  {
    id: 'lost_circ',
    label: 'Lost Circulation',
    color: '#f59e0b',
    params: { depth: 3200, wob: 25, rop: 65, torque: 5, hookload: 60, mud_in: 2.05, spp: 400, shock: 3, gas: 0.1, rpm: 85 },
  },
  {
    id: 'vibration',
    label: 'Excessive Vibration',
    color: '#f59e0b',
    params: { depth: 2700, wob: 75, rop: 8, torque: 24, hookload: 118, mud_in: 1.25, spp: 9500, shock: 158, gas: 0.08, rpm: 188 },
  },
];

/**
 * Build a complete prediction object from pure physics.
 * Keeps ML-derived fields (similar_wells, time_to_incident_hours) from an
 * existing result so those cards still update — but ALL risk numbers come
 * 100% from the physics engine.
 */
function applyPurePhysics(params, mlResult) {
  const physics = computePhysicsRisk(params);
  return {
    // Keep ML-sourced auxiliary data if available
    similar_wells:          mlResult?.similar_wells          ?? [],
    time_to_incident_hours: mlResult?.time_to_incident_hours ?? 999,
    anomaly_score:          mlResult?.anomaly_score          ?? 0,
    is_anomaly:             mlResult?.is_anomaly             ?? false,
    pipeline_ready:         mlResult?.pipeline_ready         ?? false,
    // Pure physics risk
    ...physics,
  };
}

export default function App() {
  const [params, setParams]                 = useState(DEFAULT_PARAMS);
  const [prediction, setPrediction]         = useState(null);
  const [pipelineReady, setPipelineReady]   = useState(false);
  const [loading, setLoading]               = useState(false);
  const [activeScenario, setActiveScenario] = useState('normal');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isMitigationModalOpen, setIsMitigationModalOpen] = useState(false);
  const debounceRef = useRef(null);

  // ── Route / View state (Landing vs Features vs Live Dashboard) ─────────────
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#dashboard' || window.location.hash.startsWith('#dashboard')) return 'dashboard';
      if (window.location.hash === '#features' || window.location.hash.startsWith('#features')) return 'features';
      if (window.location.hash === '#spatial' || window.location.hash.startsWith('#spatial')) return 'spatial';
      if (window.location.hash === '#knowledge' || window.location.hash.startsWith('#knowledge')) return 'knowledge';
    }
    return 'landing';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#dashboard' || hash.startsWith('#dashboard')) {
        setCurrentView('dashboard');
      } else if (hash === '#features' || hash.startsWith('#features')) {
        setCurrentView('features');
      } else if (hash === '#spatial' || hash.startsWith('#spatial')) {
        setCurrentView('spatial');
      } else if (hash === '#knowledge' || hash.startsWith('#knowledge')) {
        setCurrentView('knowledge');
      } else if (hash === '#digitize' || hash.startsWith('#digitize')) {
        setCurrentView('digitize');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToDashboard = (options = {}) => {
    window.location.hash = '#dashboard';
    setCurrentView('dashboard');
    if (options?.openMitigation) {
      setIsMitigationModalOpen(true);
    }
  };

  const navigateToFeatures = () => {
    window.location.hash = '#features';
    setCurrentView('features');
  };

  const [knowledgeNavOptions, setKnowledgeNavOptions] = useState(null);

  const navigateToSpatial = () => {
    window.location.hash = '#spatial';
    setCurrentView('spatial');
  };

  const navigateToKnowledge = (options = null) => {
    setKnowledgeNavOptions(options);
    window.location.hash = '#knowledge';
    setCurrentView('knowledge');
  };

  const navigateToDigitize = () => {
    window.location.hash = '#digitize';
    setCurrentView('digitize');
  };

  const navigateToLanding = () => {
    window.location.hash = '#';
    setCurrentView('landing');
  };

  // ── Pipeline readiness poll ───────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API}/api/health`);
        const d = await r.json();
        if (d.pipeline_ready) { setPipelineReady(true); return true; }
      } catch {}
      return false;
    };
    const poll = setInterval(async () => { if (await check()) clearInterval(poll); }, 3000);
    check();
    return () => clearInterval(poll);
  }, []);

  // ── Debounced API call (used for free slider movement only) ───────────────
  const callPredict = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (data.pipeline_ready) setPipelineReady(true);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedPredict = useCallback((p, scenarioId = null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const physics = computePhysicsRisk(p);
      const data = await callPredict({
        ...p,
        risk_type: physics.risk_type,
        scenario_id: scenarioId,
      });
      // ML response: only take similar_wells + time_to_incident, keep physics risk
      if (data) setPrediction(prev => applyPurePhysics(p, { ...prev, ...data }));
    }, 350);
  }, [callPredict]);

  // ── On mount: immediate physics, then ML fills auxiliary cards ───────────
  useEffect(() => {
    setPrediction(applyPurePhysics(DEFAULT_PARAMS, null));
    debouncedPredict(DEFAULT_PARAMS, null);
  }, []);  // eslint-disable-line

  // ── Slider changed: INSTANT pure physics, ML refreshes aux cards in background ─
  const handleParamChange = (key, val) => {
    const next = { ...params, [key]: val };
    setParams(next);
    setActiveScenario(null);
    setPrediction(prev => applyPurePhysics(next, prev));
    debouncedPredict(next, null);
  };

  // ── Scenario chip clicked: set extreme params, instant physics risk ─────────
  const handleScenario = async (sc) => {
    setActiveScenario(sc.id);
    setParams(sc.params);
    // Instantly apply physics for the scenario's extreme params
    setPrediction(prev => applyPurePhysics(sc.params, prev ?? {}));
    // ML call gets similar_wells + time_to_incident for these params
    const physics = computePhysicsRisk(sc.params);
    const data = await callPredict({
      ...sc.params,
      risk_type: physics.risk_type,
      scenario_id: sc.id,
    });
    if (data) setPrediction(prev => applyPurePhysics(sc.params, { ...prev, ...data }));
  };

  const risk       = prediction?.risk_level ?? 'normal';
  const riskPercent = prediction?.overall_risk_percent ?? 0;

  if (currentView === 'landing') {
    return (
      <LandingPage 
        onLaunch={navigateToFeatures} 
        onNavigateToFeatures={navigateToFeatures}
        onNavigateToSpatial={navigateToSpatial} 
        onNavigateToKnowledge={navigateToKnowledge}
        onNavigateToDigitize={navigateToDigitize}
      />
    );
  }

  if (currentView === 'features') {
    return (
      <FeaturesPage
        onNavigateToLanding={navigateToLanding}
        onNavigateToDashboard={navigateToDashboard}
        onNavigateToSpatial={navigateToSpatial}
        onNavigateToKnowledge={navigateToKnowledge}
        onNavigateToDigitize={navigateToDigitize}
      />
    );
  }

  if (currentView === 'spatial') {
    return (
      <SpatialIntelligence
        onNavigateToDashboard={navigateToDashboard}
        onNavigateToLanding={navigateToLanding}
      />
    );
  }

  if (currentView === 'knowledge') {
    return (
      <KnowledgeRepository
        onNavigateToDashboard={navigateToDashboard}
        onNavigateToFeatures={navigateToFeatures}
        onNavigateToSpatial={navigateToSpatial}
        onNavigateToLanding={navigateToLanding}
        onNavigateToDigitize={navigateToDigitize}
        activeParams={params}
        activeRiskType={prediction?.risk_type ?? 'lost_circulation'}
        navOptions={knowledgeNavOptions}
        onClearNavOptions={() => setKnowledgeNavOptions(null)}
      />
    );
  }

  if (currentView === 'digitize') {
    return (
      <DocumentDigitization
        onNavigateToLanding={navigateToLanding}
        onNavigateToKnowledge={navigateToKnowledge}
        onNavigateToDashboard={navigateToDashboard}
        onNavigateToFeatures={navigateToFeatures}
      />
    );
  }

  return (
    <div className="app">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__brand-icon">
            <Drill size={18} />
          </div>
          <div>
            <div className="topbar__brand-title">DrillSight</div>
            <div className="topbar__brand-sub">Oil Well Risk Intelligence</div>
          </div>
          <button
            type="button"
            className="topbar-back-btn"
            onClick={navigateToLanding}
            title="Return to Landing Page"
          >
            <ArrowLeft size={14} />
            <span>Landing</span>
          </button>
          <button
            type="button"
            className="topbar-back-btn"
            onClick={navigateToFeatures}
            title="Platform Features"
            style={{ marginLeft: 6 }}
          >
            <span>Features</span>
          </button>
          <button
            type="button"
            className="topbar-spatial-btn"
            onClick={navigateToSpatial}
            title="Open Spatial Intelligence Experience"
          >
            <Map size={14} />
            <span>Spatial Intelligence</span>
          </button>
          <button
            type="button"
            className="topbar-spatial-btn"
            onClick={navigateToKnowledge}
            title="Open Searchable Mitigation Knowledge Repository"
            style={{
              marginLeft: 6,
              background: 'rgba(2, 132, 199, 0.08)',
              color: '#0284c7',
              borderColor: 'rgba(2, 132, 199, 0.35)',
            }}
          >
            <BookOpen size={14} />
            <span>Knowledge Base</span>
          </button>
          <button
            type="button"
            className="topbar-spatial-btn"
            onClick={navigateToDigitize}
            title="AI Document Digitization & Knowledge Ingestion"
            style={{
              marginLeft: 6,
              background: 'rgba(124, 58, 237, 0.08)',
              color: '#7c3aed',
              borderColor: 'rgba(124, 58, 237, 0.35)',
            }}
          >
            <Sparkles size={14} />
            <span>AI Digitize</span>
          </button>
        </div>
        <div className="topbar__right">
          <div className="topbar__status">
            <span className={`status-dot ${pipelineReady ? 'ready' : 'loading'}`} />
            {pipelineReady ? 'Pipeline Ready' : 'Training ML Pipeline…'}
            {loading && (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite', marginLeft: 4 }} />
            )}
          </div>
          <div className="topbar__user">
            <div className="topbar__avatar">I</div>
            <span className="topbar__username">Iqra S.</span>
            <ChevronDown size={14} className="topbar__chevron" />
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="main-layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div>
            <p className="section-label">Risk Scenarios</p>
            <div className="scenario-list">
              {SCENARIOS.map(sc => (
                <button
                  key={sc.id}
                  className={`scenario-chip${activeScenario === sc.id ? ' active' : ''}`}
                  onClick={() => handleScenario(sc)}
                >
                  <span className="scenario-chip__dot" style={{ background: sc.color }} />
                  <span>
                    <span className="scenario-chip__label">{sc.label}</span>
                  </span>
                  <ChevronRight size={13} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div>
            <p className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={12} /> Drilling Parameters
            </p>
            <DrillingKnobs params={params} onChange={handleParamChange} />
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="content">

          {/* Anomaly / Hazard Alert Banner */}
          {(prediction?.is_anomaly || risk !== 'normal' || riskPercent >= 25) && (
            <AnomalyAlert
              isAnomaly={Boolean(prediction?.is_anomaly)}
              riskLevel={risk}
              riskType={prediction?.risk_type ?? 'normal'}
              riskPercent={Math.round(riskPercent)}
              hours={prediction?.time_to_incident_hours < 999 ? Number(prediction.time_to_incident_hours.toFixed(1)) : null}
            />
          )}

          {/* Top row */}
          <div className="top-panels">
            {/* Gauge */}
            <div className="card card--elevated">
              <div className="card__header">
                <BarChart3 size={16} className="card__icon" />
                <span className="card__title">Risk Gauge</span>
              </div>
              <RiskGauge percent={riskPercent} riskLevel={risk} />
            </div>

            {/* Risk breakdown */}
            <div className="card card--elevated">
              <div className="card__header">
                <AlertTriangle size={15} className="card__icon" />
                <span className="card__title">Risk Breakdown by Type</span>
              </div>
              <RiskBreakdown
                riskProbabilities={prediction?.risk_probabilities ?? {}}
                dominantRisk={prediction?.risk_type ?? 'normal'}
              />
            </div>

            {/* Time to incident */}
            <div className="card card--elevated card--tti">
              <TimeToIncident
                hours={prediction?.time_to_incident_hours ?? 999}
                riskLevel={risk}
              />
            </div>
          </div>

          {/* Zone evidence */}
          <div className="card card--zone-evidence">
            <div className="card__header card__header--zone-evidence">
              <div className="card__header-left">
                <img
                  src="/evidence-icon.png"
                  alt="Evidence Icon"
                  className="card__header-icon-img"
                />
                <span className="card__title">Expected Hazard Zone &amp; Evidence</span>
              </div>
              <div className="card__header-actions">
                <button
                  type="button"
                  className="mitigation-playbook-btn"
                  onClick={() => setIsMitigationModalOpen(true)}
                  title="View phased mitigation steps and database evidence"
                >
                  <ShieldAlert className="mitigation-playbook-btn__icon" />
                  <span>MITIGATION STEPS</span>
                </button>

                <button
                  type="button"
                  className="view-map-btn"
                  onClick={() => setIsMapModalOpen(true)}
                >
                  <Map className="view-map-btn__icon" />
                  <span>VIEW ON MAP</span>
                </button>
              </div>
            </div>
            <ZoneEvidence
              wells={prediction?.similar_wells ?? []}
              params={params}
              riskType={prediction?.risk_type ?? 'normal'}
            />
          </div>

          {/* Interactive Offshore Well Map Modal */}
          <WellMapModal
            open={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            wells={prediction?.similar_wells ?? []}
            params={params}
            riskType={prediction?.risk_type ?? 'normal'}
          />

          {/* Drilling Risk Mitigation Playbook Modal */}
          <MitigationModal
            open={isMitigationModalOpen}
            onClose={() => setIsMitigationModalOpen(false)}
            riskType={prediction?.risk_type ?? 'kick_influx'}
            depth={params?.depth ?? 4200}
            apiUrl={API}
          />
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
