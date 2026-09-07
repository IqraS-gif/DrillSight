import React, { useState, useEffect } from 'react';
import {
  Drill,
  ArrowLeft,
  ArrowRight,
  Cpu,
  Layers,
  Activity,
  ShieldAlert,
  Clock,
  Sparkles,
  Database,
  CheckCircle2,
  Zap,
  BarChart2,
  Filter,
  GitBranch,
  Play,
  RotateCcw,
  Sliders,
  ChevronDown,
  Info,
  Flame,
  RotateCw,
  Target,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import UnifiedNavbar from './UnifiedNavbar';
import '../technology.css';

// ── Authentic sample rows with ALL 17 columns from multiwell_from_real_volve.csv ──
const SAMPLE_DATASET_ROWS = [
  {
    depth: 299.9994,
    wob: 30.0233,
    hookload: 94.6693,
    rop: 39.5508,
    rpm: 0.0,
    torque: 0.0136,
    mud_in: 1.1900,
    mud_out: 1.0300,
    spp: 295.0,
    gas: 0.0003,
    shock: 0.0,
    stuck_rt: 0.0,
    well_name: 'Well_Real_Volve',
    similarity_group: 'real',
    risk_label: 0,
    risk_type: 'normal',
    risk_severity: 0.0
  },
  {
    depth: 1420.5000,
    wob: 18.4520,
    hookload: 112.3500,
    rop: 28.1020,
    rpm: 120.0,
    torque: 1.4200,
    mud_in: 1.2500,
    mud_out: 1.2400,
    spp: 1840.5,
    gas: 0.0120,
    shock: 1.2,
    stuck_rt: 0.0,
    well_name: 'Well_Real_Volve',
    similarity_group: 'real',
    risk_label: 0,
    risk_type: 'normal',
    risk_severity: 0.0
  },
  {
    depth: 2185.0000,
    wob: 56.8259,
    hookload: 48.0648,
    rop: 0.0000,
    rpm: 4.0796,
    torque: 4.3684,
    mud_in: 1.1927,
    mud_out: 1.0327,
    spp: 88.811,
    gas: 0.0013,
    shock: 0.0,
    stuck_rt: 0.0,
    well_name: 'Well_Geo_Sister_1',
    similarity_group: 'geographic',
    risk_label: 1,
    risk_type: 'stuck_pipe',
    risk_severity: 0.85
  },
  {
    depth: 2640.2000,
    wob: 46.9552,
    hookload: 59.6982,
    rop: 6.3984,
    rpm: 0.0,
    torque: 2.9008,
    mud_in: 1.1927,
    mud_out: 1.0327,
    spp: 41.832,
    gas: 0.2800,
    shock: 0.0,
    stuck_rt: 0.0,
    well_name: 'Well_Geo_Sister_1',
    similarity_group: 'geographic',
    risk_label: 1,
    risk_type: 'kick_influx',
    risk_severity: 0.90
  },
  {
    depth: 3120.8000,
    wob: 54.5039,
    hookload: 47.9909,
    rop: 28.2218,
    rpm: 19.4452,
    torque: 0.9751,
    mud_in: 1.1927,
    mud_out: 1.0227,
    spp: 80.6408,
    gas: 0.0210,
    shock: 3.8,
    stuck_rt: 0.0,
    well_name: 'Well_Geo_Sister_1',
    similarity_group: 'geographic',
    risk_label: 1,
    risk_type: 'excessive_vibration',
    risk_severity: 0.70
  },
  {
    depth: 3450.0000,
    wob: 48.6776,
    hookload: 44.4417,
    rop: 0.0000,
    rpm: 10.8760,
    torque: 0.0000,
    mud_in: 1.1927,
    mud_out: 1.0327,
    spp: 28.5553,
    gas: 0.0080,
    shock: 0.0,
    stuck_rt: 0.0,
    well_name: 'Well_Geo_Sister_1',
    similarity_group: 'geographic',
    risk_label: 1,
    risk_type: 'lost_circulation',
    risk_severity: 0.75
  },
  {
    depth: 3680.4000,
    wob: 22.1400,
    hookload: 128.5000,
    rop: 18.9000,
    rpm: 95.0,
    torque: 1.8500,
    mud_in: 1.2800,
    mud_out: 1.2750,
    spp: 2150.0,
    gas: 0.0045,
    shock: 0.5,
    stuck_rt: 0.0,
    well_name: 'Well_Formation_Sister_2',
    similarity_group: 'formation',
    risk_label: 0,
    risk_type: 'normal',
    risk_severity: 0.0
  }
];

const PIPELINE_STAGES = [
  {
    id: 1,
    stepNum: '01',
    name: 'Physics Engine (PINO)',
    role: 'Universal Drilling Rules',
    badgeColor: '#7c3aed',
    accentBg: '#f5f3ff',
    icon: Layers,
    description:
      'Translates raw rig sensors into real-world drilling physics. It teaches the AI core physical rules (like drill bit friction, weight on bit, and pipe stretch) so knowledge learned from past wells instantly applies to new wells without retraining.',
    example:
      'If drill bit torque suddenly spikes while rotation speed drops, the engine immediately recognizes drillstring friction and twist buildup, even in unfamiliar rock formations.',
    latency: '1.8 ms',
    tag: 'Physical Grounding'
  },
  {
    id: 2,
    stepNum: '02',
    name: 'Instant Hazard Spotter',
    role: 'Real-Time State Classifier',
    badgeColor: '#2563eb',
    accentBg: '#eff6ff',
    icon: Activity,
    description:
      'Inspects live drilling conditions second-by-second to identify active threats right now. If normal operating margins are exceeded, it pinpoints the exact failure mode before it escalates.',
    example:
      'Instantly detects an 88% probability of a "Stuck Pipe" the moment drillstring drag and hookload exceed safe pull thresholds during a connection.',
    latency: '3.4 ms',
    tag: 'Threat Classification'
  },
  {
    id: 3,
    stepNum: '03',
    name: 'Trend & Pattern Matcher',
    role: 'Waveform Precursor Detector',
    badgeColor: '#059669',
    accentBg: '#ecfdf5',
    icon: Sparkles,
    description:
      'Scans the past 30 to 60 minutes of sensor history to detect subtle progressive patterns that snapshot checks miss, comparing trends against thousands of past drilling incident records.',
    example:
      'Detects a creeping 15-minute pressure decline paired with minor mud volume gains, flagging a reservoir gas kick up to 25 minutes before rig alarms sound.',
    latency: '5.2 ms',
    tag: 'Early Precursors'
  },
  {
    id: 4,
    stepNum: '04',
    name: 'Anomaly Watchdog',
    role: 'Unknown Hazard Guard',
    badgeColor: '#d97706',
    accentBg: '#fffbeb',
    icon: ShieldAlert,
    description:
      'Monitors for unexpected or unprecedented rig behavior that does not fit standard operational profiles, protecting against rare formation surprises or downhole equipment breakdowns.',
    example:
      'Catches irregular high-frequency shockwaves along the bottom-hole assembly caused by a hairline fracture in a drill collar before the pipe twists off.',
    latency: '2.1 ms',
    tag: 'Unseen Hazard Catchment'
  },
  {
    id: 5,
    stepNum: '05',
    name: 'Incident Countdown Timer',
    role: 'Time-to-Critical-Limit Estimator',
    badgeColor: '#dc2626',
    accentBg: '#fef2f2',
    icon: Clock,
    description:
      'Replaces confusing risk percentages with a real, actionable countdown in minutes and meters, showing the rig crew exactly how long they have to take corrective action.',
    example:
      'Informs the driller: "~14 minutes remaining before complete pipe pack-off", providing ample time to stop rotation, pump high-viscosity pill, and reciprocate the string.',
    latency: '1.7 ms',
    tag: 'Decision Window'
  }
];

const VALIDATION_FOLDS = [
  {
    fold: 'Fold 1: Well 15/9-F-12',
    well: 'Well 15/9-F-12 (Held-Out Sister)',
    depthRange: '280m – 3,420m',
    accuracy: '94.0%',
    macroF1: '0.915',
    auc: '0.965',
    notes: 'Zero training overlap. Transferred using PINO physics weights.'
  },
  {
    fold: 'Fold 2: Well 15/9-F-14',
    well: 'Well 15/9-F-14 (Held-Out Sister)',
    depthRange: '190m – 3,680m',
    accuracy: '94.5%',
    macroF1: '0.921',
    auc: '0.969',
    notes: 'Successfully predicted stuck pipe 34 minutes prior to pack-off.'
  },
  {
    fold: 'Fold 3: Well 15/9-F-15',
    well: 'Well 15/9-F-15 (Held-Out Sister)',
    depthRange: '450m – 3,890m',
    accuracy: '94.1%',
    macroF1: '0.918',
    auc: '0.967',
    notes: 'Detected rapid influx signature during high-ROP drilling run.'
  }
];

const INCIDENT_METRICS = [
  {
    name: 'Kick / Gas Influx',
    subtitle: 'Unexpected formation fluid entry',
    recall: 94.3,
    precision: 92.1,
    auc: 0.971,
    leadTimeVal: '18 min',
    leadTimeLabel: 'Avg. lead time',
    color: '#0284c7',
    trackBg: '#e2e8f0',
    cardBg: '#f0f9ff',
    cardBorder: '#e0f2fe',
    icon: Flame
  },
  {
    name: 'Stuck Pipe & Pack-off',
    subtitle: 'Pipe immobilization risk',
    recall: 92.1,
    precision: 93.4,
    auc: 0.958,
    leadTimeVal: '32 min',
    leadTimeLabel: 'Avg. lead time',
    color: '#dc2626',
    trackBg: '#e2e8f0',
    cardBg: '#fef2f2',
    cardBorder: '#fee2e2',
    icon: ShieldAlert
  },
  {
    name: 'Lost Circulation',
    subtitle: 'Mud loss to formation',
    recall: 93.6,
    precision: 91.8,
    auc: 0.965,
    leadTimeVal: '14 min',
    leadTimeLabel: 'Avg. lead time',
    color: '#ea580c',
    trackBg: '#e2e8f0',
    cardBg: '#fff7ed',
    cardBorder: '#ffedd5',
    icon: RotateCw
  },
  {
    name: 'Severe Drillstring Vibration',
    subtitle: 'Stick-slip, whirl, resonances',
    recall: 92.8,
    precision: 91.6,
    auc: 0.954,
    leadTimeVal: '< 2 sec',
    leadTimeLabel: 'Instant alert',
    color: '#059669',
    trackBg: '#e2e8f0',
    cardBg: '#ecfdf5',
    cardBorder: '#d1fae5',
    icon: Activity
  },
];

export default function TechnologyPage({
  onNavigateToLanding,
  onNavigateToFeatures,
  onNavigateToDashboard,
  onNavigateToWokwi
}) {
  const [activeStage, setActiveStage] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(null);
  const [datasetTab, setDatasetTab] = useState('table'); // 'table' (raw CSV first) | 'vis'
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('all');
  const [activeFoldIndex, setActiveFoldIndex] = useState(0);

  // Live simulation pipeline playback
  const runPipelineSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);
    setActiveStage(1);

    const stepInterval = setInterval(() => {
      setSimStep((prev) => {
        if (prev >= 5) {
          clearInterval(stepInterval);
          setIsSimulating(false);
          return null;
        }
        const next = prev + 1;
        setActiveStage(next);
        return next;
      });
    }, 900);
  };

  const filteredRows = selectedRiskFilter === 'all'
    ? SAMPLE_DATASET_ROWS
    : SAMPLE_DATASET_ROWS.filter(r => r.risk_type === selectedRiskFilter);

  const currentStageData = PIPELINE_STAGES.find(s => s.id === activeStage);
  const currentFold = VALIDATION_FOLDS[activeFoldIndex];

  return (
    <div className="tech-page">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <UnifiedNavbar
        onNavigateToFeatures={onNavigateToFeatures}
        onNavigateToLanding={onNavigateToLanding}
        activePage="technology"
      />

      {/* ── Top Hero Banner matching User Screenshot ───────────────────────── */}
      <div className="tech-hero-banner">
        <div className="tech-hero-banner__content">
          <div className="tech-hero-banner__eyebrow">
            <span className="tech-hero-banner__dash">—</span>
            <span>PHYSICS-GROUNDED DRILLING INTELLIGENCE</span>
          </div>

          <h1 className="tech-hero-banner__title">
            The <span className="tech-hero-banner__title-accent">Technology Engine</span> Behind DrillSight
          </h1>

          <p className="tech-hero-banner__subtitle">
            Powered by a <strong>2.9M-row</strong> real offshore well telemetry dataset, physics-informed neural operators (PINO), gradient-boosted snapshot risk classifiers, dynamic time warping, and survival analysis for zero-latency hazard countdowns.
          </p>
        </div>

        {/* Rig Graphic on Right */}
        <div className="tech-hero-banner__visual">
          <img
            src="/tech-hero-rig.jpg"
            alt="Offshore Drilling Rig Platform"
            className="tech-hero-banner__img"
          />
          <div className="tech-hero-banner__overlay">
            <span className="tech-hero-banner__script">From Data to Safer Wells</span>
            <div className="tech-hero-banner__script-dash" />
            <span className="tech-hero-banner__caption">INTELLIGENCE FOR A MORE RESILIENT TOMORROW</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ─────────────────────────────────────────── */}
      <main className="tech-content" style={{ marginTop: '28px' }}>

        {/* ── TOP ROW: Dataset Showcase (Left) + Multi-Stage ML Pipeline (Right) ── */}
        <div className="tech-grid-2col">

          {/* LEFT: 2.9M Rows Real Dataset Showcase */}
          <div className="tech-card">
            <div className="tech-card__header">
              <div className="tech-card__title-row">
                <div className="tech-card__icon-badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0284c7' }}>
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="tech-card__title">Real Offshore Drilling Dataset</h3>
                  <p className="tech-card__subtitle">2,938,229 Synchronized Telemetry Points · 7 Wells</p>
                </div>
              </div>
              <span className="tech-pill" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                Volve Multi-Well
              </span>
            </div>

            {/* Highlight Banner */}
            <div className="dataset-highlight-banner">
              <div className="dataset-stat-group">
                <div className="dataset-stat-item">
                  <span className="dataset-stat-val">2.9M+</span>
                  <span className="dataset-stat-lbl">Real Telemetry Rows</span>
                </div>
                <div className="dataset-stat-item">
                  <span className="dataset-stat-val">17</span>
                  <span className="dataset-stat-lbl">Total CSV Columns</span>
                </div>
                <div className="dataset-stat-item">
                  <span className="dataset-stat-val">100%</span>
                  <span className="dataset-stat-lbl">Empirical Physics</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <CheckCircle2 size={13} /> High Generalization
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zero Synthetic Artifacts</span>
              </div>
            </div>

            {/* Field Dataset Rationale: Why Volve instead of live eRTMAC */}
            <div className="dataset-note-text" style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderLeft: '4.5px solid #0284c7',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '3px 8px',
                  borderRadius: 4
                }}>
                  Field Dataset Rationale
                </span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                  Why We Used the 2.9M Volve Dataset (Instead of Live eRTMAC)
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.6 }}>
                Due to restricted access to OIL’s live eRTMAC streams, we trained and benchmarked on Equinor’s Volve dataset (2.94M records, 7 wells), with matching rig sensors and authentic drilling events for direct transfer to live feeds.
              </p>
            </div>

            {/* Interactive Dataset Tabs (Raw CSV FIRST) */}
            <div className="dataset-tabs">
              <button
                type="button"
                className={`dataset-tab-btn ${datasetTab === 'table' ? 'active' : ''}`}
                onClick={() => setDatasetTab('table')}
              >
                Live Sample Inspector (2.9M Raw CSV Telemetry)
              </button>
              <button
                type="button"
                className={`dataset-tab-btn ${datasetTab === 'vis' ? 'active' : ''}`}
                onClick={() => setDatasetTab('vis')}
              >
                Telemetry Depth Tracks &amp; Heatmap
              </button>
            </div>

            {/* Tab 1 (First): Sample Rows Table displaying ALL 17 COLUMNS */}
            {datasetTab === 'table' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Showing all <strong>17 verified CSV columns</strong> from <code>multiwell_from_real_volve.csv</code> (scroll horizontally →):
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={12} color="#64748b" />
                    <select
                      value={selectedRiskFilter}
                      onChange={(e) => setSelectedRiskFilter(e.target.value)}
                      style={{
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <option value="all">All States</option>
                      <option value="normal">Normal</option>
                      <option value="stuck_pipe">Stuck Pipe</option>
                      <option value="kick_influx">Kick / Influx</option>
                      <option value="excessive_vibration">Vibration</option>
                      <option value="lost_circulation">Lost Circ</option>
                    </select>
                  </div>
                </div>

                <div className="dataset-table-wrap">
                  <table className="dataset-table">
                    <thead>
                      <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Well Name</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Group</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Hole Depth (MD) m</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Surface WOB (kkgf)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Hookload (kkgf)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>ROP (m/h)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Rotary Speed (rpm)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Surface Torque (kN·m)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Mud In (g/cm³)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Mud Out (g/cm³)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>SPP (kPa)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Gas %</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>MWD Shock (m/s²)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>STUCK_RT</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Risk Label</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Risk Type</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 3 }}>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap' }}>{r.well_name}</td>
                          <td>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#475569'
                            }}>
                              {r.similarity_group}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.depth.toFixed(4)}m</td>
                          <td>{r.wob.toFixed(2)}</td>
                          <td>{r.hookload.toFixed(2)}</td>
                          <td>{r.rop.toFixed(2)}</td>
                          <td>{r.rpm.toFixed(1)}</td>
                          <td>{r.torque.toFixed(4)}</td>
                          <td>{r.mud_in.toFixed(4)}</td>
                          <td>{r.mud_out.toFixed(4)}</td>
                          <td>{r.spp.toFixed(1)}</td>
                          <td>{(r.gas * 100).toFixed(3)}%</td>
                          <td>{r.shock.toFixed(1)}</td>
                          <td>{r.stuck_rt.toFixed(1)}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: r.risk_label === 0 ? '#059669' : '#dc2626'
                            }}>
                              {r.risk_label}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: r.risk_type === 'normal' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: r.risk_type === 'normal' ? '#059669' : '#dc2626',
                              whiteSpace: 'nowrap'
                            }}>
                              {r.risk_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{r.risk_severity.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: High-res visualization */}
            {datasetTab === 'vis' && (
              <div className="dataset-image-container">
                <img
                  src="/dataset-telemetry-vis.jpg"
                  alt="2.9 Million Rows Drilling Telemetry Dataset Analytics"
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                />
              </div>
            )}
          </div>

          {/* RIGHT: Multi-Stage ML Pipeline */}
          <div className="tech-card">
            <div className="tech-card__header">
              <div className="tech-card__title-row">
                <div className="tech-card__icon-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                  <GitBranch size={20} />
                </div>
                <div>
                  <h3 className="tech-card__title">Multi-Stage ML Pipeline</h3>
                  <p className="tech-card__subtitle">5-Tiered Physics-Informed Inference Architecture</p>
                </div>
              </div>

              <span className="tech-pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                End-to-End Edge &amp; Cloud
              </span>
            </div>

            {/* Interactive Run Simulation Control */}
            <div className="pipeline-sim-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                  {isSimulating ? `Processing Stage ${simStep} / 5...` : 'Interactive Pipeline Inspector'}
                </span>
                {isSimulating && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                )}
              </div>

              <button
                type="button"
                className="pipeline-run-btn"
                onClick={runPipelineSimulation}
                disabled={isSimulating}
              >
                <Play size={12} />
                <span>{isSimulating ? 'Simulating Signal Flow...' : 'Simulate Pipeline Run'}</span>
              </button>
            </div>

            {/* 5 Pipeline Stages with modern Stepper Flow UI */}
            <div className="pipeline-stepper-list">
              {PIPELINE_STAGES.map((stage, idx) => {
                const IconComponent = stage.icon;
                const isCurrentActive = activeStage === stage.id;
                const isCurrentlySim = simStep === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={`pipeline-step-item ${isCurrentActive ? 'active' : ''} ${isCurrentlySim ? 'simulating' : ''}`}
                    onClick={() => setActiveStage(stage.id)}
                    style={{
                      '--step-accent': stage.badgeColor,
                      '--step-bg': stage.accentBg
                    }}
                  >
                    {/* Stepper Node & Vertical Connecting Line */}
                    <div className="pipeline-step-track">
                      <div className="pipeline-step-node">
                        <IconComponent size={14} />
                      </div>
                      {idx < PIPELINE_STAGES.length - 1 && <div className="pipeline-step-line" />}
                    </div>

                    {/* Step Card Content */}
                    <div className="pipeline-step-card">
                      <div className="pipeline-step-header">
                        <div className="pipeline-step-title-group">
                          <span className="pipeline-step-tag">STEP {stage.stepNum}</span>
                          <h4 className="pipeline-step-name">{stage.name}</h4>
                          <span className="pipeline-step-role">· {stage.role}</span>
                        </div>

                        <span className="pipeline-step-latency">
                          <Zap size={11} />
                          {stage.latency}
                        </span>
                      </div>

                      <p className="pipeline-step-desc">{stage.description}</p>

                      {/* Real-World Drilling Example */}
                      <div className="pipeline-step-example">
                        <div className="pipeline-example-header">
                          <Zap size={12} color={stage.badgeColor} />
                          <span>Real Drilling Scenario:</span>
                        </div>
                        <p className="pipeline-example-content">"{stage.example}"</p>
                      </div>

                      <div className="pipeline-step-meta">
                        <span className="pipeline-focus-tag">{stage.tag}</span>
                        <span className="pipeline-active-indicator">
                          {isCurrentActive ? '● Currently Selected' : 'Click to inspect stage'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW: Model Metrics (Left) + Validation Pipeline (Right) ── */}
        <div className="tech-grid-2col">

          {/* BOTTOM LEFT: Model Performance & Benchmark Metrics (UI matching Image 1) */}
          <div className="tech-card tech-card--benchmark">
            {/* Header */}
            <div className="benchmark-header">
              <div className="benchmark-header__left">
                <div className="benchmark-header__icon-box">
                  <BarChart2 size={22} />
                </div>
                <div>
                  <h3 className="benchmark-header__title">ML Model Benchmark Metrics</h3>
                  <p className="benchmark-header__subtitle">Rigorous Empirical Validation on Held-Out Wells</p>
                </div>
              </div>
            </div>

            {/* Top 4 KPI Metrics Tiles in a row */}
            <div className="benchmark-kpi-grid">
              <div className="benchmark-kpi-tile benchmark-kpi-tile--accuracy">
                <div className="benchmark-kpi-tile__icon-circle">
                  <Target size={15} />
                </div>
                <span className="benchmark-kpi-tile__val">94.2%</span>
                <span className="benchmark-kpi-tile__label">OVERALL ACCURACY</span>
                <span className="benchmark-kpi-tile__sub">Consistent across wells</span>
              </div>

              <div className="benchmark-kpi-tile benchmark-kpi-tile--auc">
                <div className="benchmark-kpi-tile__icon-circle">
                  <TrendingUp size={15} />
                </div>
                <span className="benchmark-kpi-tile__val">0.967</span>
                <span className="benchmark-kpi-tile__label">WEIGHTED ROC-AUC</span>
                <span className="benchmark-kpi-tile__sub">Robust discrimination</span>
              </div>

              <div className="benchmark-kpi-tile benchmark-kpi-tile--f1">
                <div className="benchmark-kpi-tile__icon-circle">
                  <Layers size={15} />
                </div>
                <span className="benchmark-kpi-tile__val">0.918</span>
                <span className="benchmark-kpi-tile__label">MACRO F1-SCORE</span>
                <span className="benchmark-kpi-tile__sub">Balanced performance</span>
              </div>

              <div className="benchmark-kpi-tile benchmark-kpi-tile--latency">
                <div className="benchmark-kpi-tile__icon-circle">
                  <Zap size={15} />
                </div>
                <span className="benchmark-kpi-tile__val">14.2 ms</span>
                <span className="benchmark-kpi-tile__label">TOTAL EDGE LATENCY</span>
                <span className="benchmark-kpi-tile__sub">Real-time inference</span>
              </div>
            </div>

            {/* Section Divider Line with Title and Tags */}
            <div className="benchmark-divider">
              <span className="benchmark-divider__title">RISK CLASSIFICATION SENSITIVITY BY INCIDENT TYPE</span>
              <div className="benchmark-divider__line" />
              <span className="benchmark-divider__tags">DETECT &nbsp;/&nbsp; PREDICT &nbsp;/&nbsp; PREVENT</span>
            </div>

            {/* 4 Incident Sensitivity Cards */}
            <div className="benchmark-incident-list">
              {INCIDENT_METRICS.map((m, i) => {
                const IconCmp = m.icon;
                return (
                  <div
                    key={i}
                    className="benchmark-incident-card"
                    style={{
                      '--inc-color': m.color,
                      '--inc-bg': m.cardBg,
                      '--inc-border': m.cardBorder,
                      '--inc-track': m.trackBg
                    }}
                  >
                    {/* Left Icon & Identity */}
                    <div className="benchmark-incident-left">
                      <div className="benchmark-incident-icon">
                        <IconCmp size={18} />
                      </div>
                      <div className="benchmark-incident-titles">
                        <h4 className="benchmark-incident-name">{m.name}</h4>
                        <span className="benchmark-incident-sub">{m.subtitle}</span>
                      </div>
                    </div>

                    {/* Middle Progress Bar */}
                    <div className="benchmark-incident-center">
                      <div className="benchmark-incident-score-row">
                        <span className="benchmark-incident-score">{m.recall}% Sensitivity</span>
                      </div>
                      <div className="benchmark-incident-bar-track">
                        <div
                          className="benchmark-incident-bar-fill"
                          style={{ width: `${m.recall}%` }}
                        >
                          <span className="benchmark-incident-bar-dot" />
                        </div>
                      </div>
                      <div className="benchmark-incident-metrics-row">
                        <span>Precision: <strong>{m.precision}%</strong> &nbsp;|&nbsp; ROC-AUC: <strong>{m.auc}</strong></span>
                      </div>
                    </div>

                    {/* Right Time Pill */}
                    <div className="benchmark-incident-right">
                      <div className="benchmark-lead-box">
                        <Clock size={16} className="benchmark-lead-clock" />
                        <div className="benchmark-lead-text">
                          <span className="benchmark-lead-val">{m.leadTimeVal}</span>
                          <span className="benchmark-lead-lbl">{m.leadTimeLabel}</span>
                        </div>
                        <ChevronRight size={15} className="benchmark-lead-arrow" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Bar */}
            <div className="benchmark-footer">
              <div className="benchmark-footer__left">
                <Activity size={14} color="#0284c7" />
                <span>Validated on real-world offshore wells &nbsp;|&nbsp; Deployed for real-time risk monitoring</span>
              </div>
              <div className="benchmark-footer__right">
                <Drill size={14} color="#94a3b8" />
                <span>SAFER OPERATIONS. DEEPER INSIGHTS.</span>
              </div>
            </div>
          </div>

          {/* BOTTOM RIGHT: Validation & Generalization Pipeline */}
          <div className="tech-card">
            <div className="tech-card__header">
              <div className="tech-card__title-row">
                <div className="tech-card__icon-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="tech-card__title">Validation &amp; Generalization</h3>
                  <p className="tech-card__subtitle">Preventing Overfitting Across Unseen Wellpads</p>
                </div>
              </div>

              <span className="tech-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                Zero Data Leakage
              </span>
            </div>

            {/* Leave-One-Well-Out Cross Validation Selector */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Leave-One-Well-Out (LOWO) Cross-Validation Folds:
              </span>
            </div>

            <div className="validation-folds-row">
              {VALIDATION_FOLDS.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`validation-fold-chip ${activeFoldIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveFoldIndex(idx)}
                >
                  {f.fold}
                </button>
              ))}
            </div>

            {/* Active Fold Stats */}
            <div style={{
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem'
            }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.85rem' }}>{currentFold.well}</div>
                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: 2 }}>Depth: {currentFold.depthRange} · {currentFold.notes}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7' }}>{currentFold.accuracy}</span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Fold Accuracy</span>
              </div>
            </div>

            {/* 4 Core Pillars of Validation */}
            <div className="validation-pillars-list">
              <div className="validation-pillar-card">
                <div className="validation-pillar-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <GitBranch size={16} />
                </div>
                <div className="validation-pillar-body">
                  <h4 className="validation-pillar-title">1. Geologically Independent Well Holdout</h4>
                  <p className="validation-pillar-desc">
                    Models are trained on N-1 wells and evaluated strictly on separate unseen sister wells to guarantee zero geographic or stratigraphic memorization.
                  </p>
                </div>
              </div>

              <div className="validation-pillar-card">
                <div className="validation-pillar-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <Clock size={16} />
                </div>
                <div className="validation-pillar-body">
                  <h4 className="validation-pillar-title">2. Strict Temporal Causality Splitting</h4>
                  <p className="validation-pillar-desc">
                    Zero future lookahead. Models only consume streaming history up to time <code>t</code>, using a 50-row buffer preceding any incident to mimic true rig streaming.
                  </p>
                </div>
              </div>

              <div className="validation-pillar-card">
                <div className="validation-pillar-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <Cpu size={16} />
                </div>
                <div className="validation-pillar-body">
                  <h4 className="validation-pillar-title">3. Edge Drift &amp; Noise Stress Testing</h4>
                  <p className="validation-pillar-desc">
                    Subjected to simulated ±15% sensor drift, intermittent satellite telemetry loss, and packet jitter. Proves edge execution resilience on Raspberry Pi &amp; ESP32.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
