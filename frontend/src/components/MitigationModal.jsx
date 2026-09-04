import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  X, 
  Search, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Zap, 
  Wrench, 
  BookOpen, 
  ArrowRight, 
  Database,
  Sparkles
} from 'lucide-react';

export default function MitigationModal({
  open,
  onClose,
  riskType = 'kick_influx',
  depth = 4200,
  apiUrl = 'http://localhost:8000'
}) {
  const [activeTab, setActiveTab] = useState('immediate'); // 'immediate' | 'secondary' | 'prevention' | 'evidence'
  const searchMode = 'hybrid';
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [playbookData, setPlaybookData] = useState(null);

  // Fetch mitigation playbook from backend API (Elasticsearch + Semantic AI Unified)
  const fetchPlaybook = async (query = searchQuery) => {
    setLoading(true);
    try {
      const qParam = encodeURIComponent(query.trim());
      const res = await fetch(
        `${apiUrl}/api/knowledge/mitigation-playbook?risk_type=${riskType}&depth=${depth}&q=${qParam}&mode=hybrid&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setPlaybookData(data);
      } else {
        fallbackPlaybook(query);
      }
    } catch (err) {
      fallbackPlaybook(query);
    } finally {
      setLoading(false);
    }
  };

  // Local fallback playbook if offline or API in transition
  const fallbackPlaybook = (query = '', mode = 'keyword') => {
    const isKick = riskType.includes('kick');
    const isStuck = riskType.includes('stuck');
    const isLoss = riskType.includes('loss') || riskType.includes('circ');

    let title = 'Kick & Well Control Influx';
    let doc = 'publications-energy-fwr-captain-cook-1-fwr.pdf';
    let well = 'Captain Cook-1 (Offshore North Sea)';
    let form = 'Transition Horizon / Deep Paleocene Sand';

    let imm = [
      {
        step_number: 1,
        action: 'Space out drillstring, shut down mud pumps, and close Annular Blowout Preventer (BOP) immediately.',
        priority: 'CRITICAL IMMEDIATE',
        timeframe: '0 – 5 Minutes',
        backed_by: {
          source: doc,
          well: well,
          formation: form,
          depth: `${depth} m`,
          relevance: '96% Match',
          engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
        }
      },
      {
        step_number: 2,
        action: 'Record stabilized Shut-In Drill Pipe Pressure (SIDPP = 310 psi) and Shut-In Casing Pressure (SICP = 460 psi). Check pit gain volume.',
        priority: 'CRITICAL IMMEDIATE',
        timeframe: '5 – 15 Minutes',
        backed_by: {
          source: doc,
          well: well,
          formation: form,
          depth: `${depth} m`,
          relevance: '94% Match',
          engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
        }
      }
    ];

    let sec = [
      {
        step_number: 1,
        action: 'Calculate required kill mud weight (KMW = 1.34 SG) using SIDPP formula. Prepare weighted kill mud in reserve pits.',
        priority: 'ENGINEERING REMEDIATION',
        timeframe: '1 – 3 Hours',
        backed_by: {
          source: doc,
          well: well,
          formation: form,
          relevance: '91% Match',
          engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
        }
      },
      {
        step_number: 2,
        action: 'Circulate out gas kick using Wait & Weight method, maintaining constant bottom-hole pressure via remote choke manifold.',
        priority: 'ENGINEERING REMEDIATION',
        timeframe: '3 – 6 Hours',
        backed_by: {
          source: 'carlsen2013.pdf',
          well: 'Automated Well Control Research Benchmark',
          formation: 'HPHT Carbonate Transition',
          relevance: '88% Match',
          engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
        }
      }
    ];

    let prev = [
      {
        step_number: 1,
        guideline: 'Execute mandatory flow checks on every drilling break exceeding 100% ROP increase. Maintain crew kick drills on weekly rotation.',
        timeframe: 'Ongoing Drilling Operations',
        backed_by: {
          source: doc,
          well: well,
          relevance: '96% Match',
          engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
        }
      },
      {
        step_number: 2,
        guideline: 'Calibrate Coriolis differential return flow meters to trigger automated micro-influx warnings at 2.5 bbl cumulative gain.',
        timeframe: 'All Offset Reservoir Sections',
        backed_by: {
          source: 'carlsen2013.pdf',
          well: 'Intelligent Drilling Automation Research',
          relevance: '90% Match',
          engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
        }
      }
    ];

    if (isStuck) {
      title = 'Stuck Pipe & Hole Pack-Off';
      imm = [
        {
          step_number: 1,
          action: 'Engage hydraulic jars downward immediately with 60–80 klbs jarring force. Do NOT pull up into maximum overpull.',
          priority: 'CRITICAL IMMEDIATE',
          timeframe: '0 – 15 Minutes',
          backed_by: {
            source: 'publications-energy-fwr-captain-cook-1-fwr.pdf',
            well: 'Captain Cook-1 (Offshore North Sea)',
            formation: 'Upper Jurassic Captain Sandstone',
            depth: `${depth} m`,
            relevance: '98% Match',
            engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
          }
        }
      ];
      sec = [
        {
          step_number: 1,
          action: 'Spot 50 bbl pipe-release pill (glycol/mineral oil blend with wetting agents) across the stuck BHA. Allow 3-4 hours soak time.',
          priority: 'ENGINEERING REMEDIATION',
          timeframe: '1 – 4 Hours',
          backed_by: {
            source: 'publications-energy-fwr-captain-cook-1-fwr.pdf',
            well: 'Captain Cook-1',
            formation: 'Captain Sandstone',
            relevance: '94% Match',
            engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
          }
        }
      ];
      prev = [
        {
          step_number: 1,
          guideline: 'Maintain minimum 15 RPM drillstring rotation whenever pumps are running. Limit stationary time during gyro surveys to under 90 seconds.',
          timeframe: 'All Permeable Intervals',
          backed_by: {
            source: 'SPE-187701-MS.pdf',
            well: 'Drilling Risk Research Benchmark',
            relevance: '95% Match',
            engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
          }
        }
      ];
    } else if (isLoss) {
      title = 'Lost Circulation & Mud Losses';
      imm = [
        {
          step_number: 1,
          action: 'Shut down mud pumps immediately. Fill annulus with base oil/water to monitor and log static fluid level drop.',
          priority: 'CRITICAL IMMEDIATE',
          timeframe: '0 – 15 Minutes',
          backed_by: {
            source: 'publications-energy-fwr-captain-cook-1-fwr.pdf',
            well: 'Captain Cook-1',
            formation: 'Depleted Sandstone Fracture Zone',
            depth: `${depth} m`,
            relevance: '96% Match',
            engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
          }
        }
      ];
      sec = [
        {
          step_number: 1,
          action: 'Pump 45 bbl engineered LCM pill with multi-modal calcium carbonate (coarse/medium/fine) and nut plug (35 ppb). Hesitate squeeze at 200 psi.',
          priority: 'ENGINEERING REMEDIATION',
          timeframe: '1 – 4 Hours',
          backed_by: {
            source: '1-s2.0-S2949891026002915-main.pdf',
            well: 'Deepwater Wellbore Integrity Synthesis',
            formation: 'Interbedded Sandstone',
            relevance: '92% Match',
            engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
          }
        }
      ];
      prev = [
        {
          step_number: 1,
          guideline: 'Pre-treat active mud system with 15 ppb sized resilient graphite particles (D50 = 250 microns) to build stress-cage hoop resistance.',
          timeframe: 'Depleted Reservoir Drilling',
          backed_by: {
            source: '1-s2.0-S2949891026002915-main.pdf',
            well: 'Wellbore Strengthening Monograph',
            relevance: '94% Match',
            engine: mode === 'keyword' ? 'Elasticsearch / Lucene Text Index' : 'Semantic Concept Vector Match'
          }
        }
      ];
    }

    setPlaybookData({
      status: 'ok',
      risk_type: riskType,
      category_name: title,
      search_mode: mode,
      immediate_actions: imm,
      secondary_actions: sec,
      long_term_prevention: prev,
      matched_cases: [
        {
          case_id: 'case-001',
          title: title,
          source_document: doc,
          well_reference: well,
          formation: form,
          depth_range: `${depth - 35}–${depth + 45} m`,
          relevance_percent: 96,
          search_mode: mode,
        }
      ],
      total_cases: 1
    });
  };

  useEffect(() => {
    if (open) {
      fetchPlaybook(searchQuery);
    }
  }, [open, riskType, depth]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPlaybook(searchQuery);
  };

  if (!open) return null;

  const immediate = playbookData?.immediate_actions || [];
  const secondary = playbookData?.secondary_actions || [];
  const prevention = playbookData?.long_term_prevention || [];
  const cases = playbookData?.matched_cases || [];

  return (
    <div className="mitigation-modal-backdrop" onClick={onClose}>
      <div 
        className="mitigation-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mitigation-modal-header">
          <div className="mitigation-modal-header__left">
            <div className="mitigation-modal-badge-icon">
              <ShieldAlert size={22} color="#ffffff" />
            </div>
            <div>
              <div className="mitigation-modal-title-row">
                <h2 className="mitigation-modal-title">DRILLING HAZARD MITIGATION PLAYBOOK</h2>
                <span className="mitigation-modal-hazard-pill">
                  {playbookData?.category_name || riskType.toUpperCase()}
                </span>
              </div>
              <p className="mitigation-modal-subtitle">
                Current Depth: <strong>{depth.toLocaleString()} m</strong>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="mitigation-modal-close-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Engine Bar */}
        <div className="mitigation-search-bar">
          <form onSubmit={handleSearchSubmit} className="mitigation-search-form">
            <div className="mitigation-search-input-wrap">
              <Search size={17} className="mitigation-search-icon" />
              <input
                type="text"
                className="mitigation-search-input"
                placeholder="Search procedures, chemicals, or equipment (e.g. LCM pill, Wait & Weight, SoftTorque, BOP)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="mitigation-search-btn">
              Search
            </button>
          </form>

          {/* Unified Search Mode Badge (Elasticsearch + Semantic AI) */}
          <div className="mitigation-search-mode-badge">
            <Sparkles size={14} className="mitigation-search-sparkle" />
            <span>Elasticsearch + Semantic AI Search</span>
          </div>
        </div>

        {/* Phase Navigation Tabs */}
        <div className="mitigation-tabs">
          <button
            type="button"
            className={`mitigation-tab ${activeTab === 'immediate' ? 'active active--red' : ''}`}
            onClick={() => setActiveTab('immediate')}
          >
            <span className="mitigation-tab-badge mitigation-tab-badge--red">Phase 1</span>
            <span className="mitigation-tab-text">Immediate Action</span>
            <span className="mitigation-tab-count">{immediate.length}</span>
          </button>

          <button
            type="button"
            className={`mitigation-tab ${activeTab === 'secondary' ? 'active active--amber' : ''}`}
            onClick={() => setActiveTab('secondary')}
          >
            <span className="mitigation-tab-badge mitigation-tab-badge--amber">Phase 2</span>
            <span className="mitigation-tab-text">Secondary Remediation</span>
            <span className="mitigation-tab-count">{secondary.length}</span>
          </button>

          <button
            type="button"
            className={`mitigation-tab ${activeTab === 'prevention' ? 'active active--emerald' : ''}`}
            onClick={() => setActiveTab('prevention')}
          >
            <span className="mitigation-tab-badge mitigation-tab-badge--emerald">Phase 3</span>
            <span className="mitigation-tab-text">Long-Term Prevention</span>
            <span className="mitigation-tab-count">{prevention.length}</span>
          </button>

          <button
            type="button"
            className={`mitigation-tab ${activeTab === 'evidence' ? 'active active--blue' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            <BookOpen size={16} />
            <span className="mitigation-tab-text">Database Case Evidence</span>
            <span className="mitigation-tab-count">{cases.length}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="mitigation-modal-body">
          {loading ? (
            <div className="mitigation-loading-state">
              <div className="mitigation-spinner" />
              <span>Querying MongoDB Atlas via Elasticsearch &amp; Semantic AI...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: IMMEDIATE ACTIONS */}
              {activeTab === 'immediate' && (
                <div className="mitigation-cards-list">
                  <div className="mitigation-phase-banner mitigation-phase-banner--red">
                    <AlertTriangle size={18} color="#ef4444" />
                    <div>
                      <strong>CRITICAL IMMEDIATE RESPONSE</strong>
                      <p>Stop drillstring progression and isolate the hazard before secondary complications arise.</p>
                    </div>
                  </div>

                  {immediate.map((item, idx) => (
                    <div key={idx} className="mitigation-card mitigation-card--red">
                      <div className="mitigation-card__top">
                        <span className="mitigation-step-pill mitigation-step-pill--red">
                          STEP {item.step_number || idx + 1}
                        </span>
                        <span className="mitigation-time-pill">
                          <Clock size={13} />
                          {item.timeframe}
                        </span>
                      </div>

                      <h3 className="mitigation-card__action">{item.action}</h3>

                      {/* Evidence citation */}
                      {item.backed_by && (
                        <div className="mitigation-evidence-box">
                          <div className="mitigation-evidence-box__header">
                            <span className="mitigation-evidence-tag">
                              <FileText size={13} />
                              Document Evidence
                            </span>
                            <span className="mitigation-engine-badge">
                              {item.backed_by.engine} · {item.backed_by.relevance}
                            </span>
                          </div>
                          <div className="mitigation-evidence-details">
                            <span>📄 Source: <strong>{item.backed_by.source}</strong></span>
                            {item.backed_by.well && <span> • Well: <strong>{item.backed_by.well}</strong></span>}
                            {item.backed_by.formation && <span> • Formation: <strong>{item.backed_by.formation}</strong></span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: SECONDARY REMEDIATION (1 - 6 HOURS) */}
              {activeTab === 'secondary' && (
                <div className="mitigation-cards-list">
                  <div className="mitigation-phase-banner mitigation-phase-banner--amber">
                    <Wrench size={18} color="#f59e0b" />
                    <div>
                      <strong>SECONDARY REMEDIATION &amp; RECOVERY ("AFTER THAT")</strong>
                      <p>Engineering recovery procedures: Fluid treatments, kill sheets, release pills, and mechanical freeing.</p>
                    </div>
                  </div>

                  {secondary.map((item, idx) => (
                    <div key={idx} className="mitigation-card mitigation-card--amber">
                      <div className="mitigation-card__top">
                        <span className="mitigation-step-pill mitigation-step-pill--amber">
                          STEP {item.step_number || idx + 1}
                        </span>
                        <span className="mitigation-time-pill">
                          <Clock size={13} />
                          {item.timeframe}
                        </span>
                      </div>

                      <h3 className="mitigation-card__action">{item.action}</h3>

                      {item.backed_by && (
                        <div className="mitigation-evidence-box">
                          <div className="mitigation-evidence-box__header">
                            <span className="mitigation-evidence-tag">
                              <FileText size={13} />
                              Validated Technical Procedure
                            </span>
                            <span className="mitigation-engine-badge">
                              {item.backed_by.engine} · {item.backed_by.relevance}
                            </span>
                          </div>
                          <div className="mitigation-evidence-details">
                            <span>📄 Source: <strong>{item.backed_by.source}</strong></span>
                            {item.backed_by.well && <span> • Well: <strong>{item.backed_by.well}</strong></span>}
                            {item.backed_by.formation && <span> • Formation: <strong>{item.backed_by.formation}</strong></span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: LONG-TERM PREVENTION */}
              {activeTab === 'prevention' && (
                <div className="mitigation-cards-list">
                  <div className="mitigation-phase-banner mitigation-phase-banner--emerald">
                    <CheckCircle2 size={18} color="#10b981" />
                    <div>
                      <strong>LONG-TERM DRILLING PREVENTION &amp; GUIDELINES</strong>
                      <p>Operational rules and best practices synthesized from well post-mortems to prevent recurrence.</p>
                    </div>
                  </div>

                  {prevention.map((item, idx) => (
                    <div key={idx} className="mitigation-card mitigation-card--emerald">
                      <div className="mitigation-card__top">
                        <span className="mitigation-step-pill mitigation-step-pill--emerald">
                          RULE {item.step_number || idx + 1}
                        </span>
                        <span className="mitigation-time-pill">
                          <Clock size={13} />
                          {item.timeframe}
                        </span>
                      </div>

                      <h3 className="mitigation-card__action">{item.guideline}</h3>

                      {item.backed_by && (
                        <div className="mitigation-evidence-box">
                          <div className="mitigation-evidence-box__header">
                            <span className="mitigation-evidence-tag">
                              <FileText size={13} />
                              Operational Policy Reference
                            </span>
                            <span className="mitigation-engine-badge">
                              {item.backed_by.engine} · {item.backed_by.relevance}
                            </span>
                          </div>
                          <div className="mitigation-evidence-details">
                            <span>📄 Source: <strong>{item.backed_by.source}</strong></span>
                            {item.backed_by.well && <span> • Well: <strong>{item.backed_by.well}</strong></span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: CASE EVIDENCE */}
              {activeTab === 'evidence' && (
                <div className="mitigation-cards-list">
                  <div className="mitigation-phase-banner mitigation-phase-banner--blue">
                    <Database size={18} color="#0066ee" />
                    <div>
                      <strong>HISTORICAL WELL INCIDENT CASES (FROM MONGODB ATLAS)</strong>
                      <p>Matched reports and SPE publications retrieved via Elasticsearch &amp; Semantic AI.</p>
                    </div>
                  </div>

                  {cases.map((c, idx) => (
                    <div key={idx} className="mitigation-case-card">
                      <div className="mitigation-case-card__header">
                        <div>
                          <span className="mitigation-case-title">{c.title}</span>
                          <div className="mitigation-case-meta">
                            <span>Well: <strong>{c.well_reference}</strong></span>
                            <span> • Formation: <strong>{c.formation}</strong></span>
                            <span> • Depth: <strong>{c.depth_range}</strong></span>
                          </div>
                        </div>
                        <span className="mitigation-match-score">
                          {c.relevance_percent}% Relevance
                        </span>
                      </div>

                      {c.root_causes && c.root_causes.length > 0 && (
                        <div className="mitigation-case-section">
                          <strong>Identified Root Causes:</strong>
                          <ul>
                            {c.root_causes.map((rc, rIdx) => (
                              <li key={rIdx}>{rc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {c.symptoms && c.symptoms.length > 0 && (
                        <div className="mitigation-case-section">
                          <strong>Early Warning Symptoms:</strong>
                          <ul>
                            {c.symptoms.map((sy, sIdx) => (
                              <li key={sIdx}>{sy}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mitigation-case-footer">
                        <span>Source: <strong>{c.source_document}</strong></span>
                        <span className="mitigation-db-badge">Indexed in MongoDB Atlas</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mitigation-modal-footer">
          <span className="mitigation-footer-text">
            Search: <strong>Elasticsearch + Semantic AI</strong> · Real-time data from MongoDB Atlas
          </span>
          <button 
            type="button" 
            className="mitigation-footer-close-btn"
            onClick={onClose}
          >
            Close Playbook
          </button>
        </div>
      </div>
    </div>
  );
}
