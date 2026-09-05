import { useState } from 'react';
import { 
  MapPin, 
  Droplet, 
  ArrowRight, 
  ArrowLeft,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Anchor,
  Sparkles
} from 'lucide-react';

function OilRigGraphic({ className, style }) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Waterline */}
      <path d="M0 135 C30 133, 50 137, 80 134 C110 131, 130 136, 160 133" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      {/* Platform jacket legs */}
      <path d="M28 135 L42 85 L118 85 L132 135" stroke="currentColor" strokeWidth="2.5" />
      {/* Bracings */}
      <path d="M35 110 L125 110" stroke="currentColor" strokeWidth="1.5" />
      <path d="M28 135 L118 85" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
      <path d="M132 135 L42 85" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
      <path d="M35 110 L75 85" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
      <path d="M125 110 L85 85" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
      {/* Decks */}
      <rect x="36" y="78" width="88" height="8" rx="1" fill="currentColor" />
      <rect x="42" y="71" width="76" height="7" rx="1" fill="currentColor" fillOpacity="0.85" />
      {/* Derrick / Mast */}
      <path d="M68 71 L76 16 L84 16 L92 71 Z" stroke="currentColor" strokeWidth="2" />
      <path d="M72 54 L88 54 M74 40 L86 40 M76 27 L84 27" stroke="currentColor" strokeWidth="1.2" />
      <path d="M70 65 L88 54 M90 65 L72 54" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <path d="M73 49 L86 40 M87 49 L74 40" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <path d="M75 35 L84 27 M85 35 L76 27" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      {/* Crown block */}
      <rect x="75" y="10" width="10" height="6" rx="1" fill="currentColor" />
      {/* Crane */}
      <path d="M46 71 L22 45" stroke="currentColor" strokeWidth="2" />
      <path d="M34 58 L46 71 M28 51 L40 64" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      {/* Helideck */}
      <path d="M116 73 L142 62" stroke="currentColor" strokeWidth="2" />
      <line x1="126" y1="68" x2="142" y2="68" stroke="currentColor" strokeWidth="2" />
      <rect x="130" y="66" width="16" height="3" rx="1" fill="currentColor" />
      {/* Flare boom */}
      <path d="M52 71 L52 48" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="52" cy="46" r="2" fill="currentColor" />
    </svg>
  );
}

function CaliperDepthIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2V12M7 2L5 4M7 2L9 4M7 12L5 10M7 12L9 10M3 2H11M3 12H11" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HAZARD_TITLES = {
  stuck_pipe:          'Stuck Pipe',
  kick_influx:         'Kick / Influx',
  lost_circulation:    'Lost Circulation',
  excessive_vibration: 'Excessive Vibration',
  normal:              'Normal Operations',
};

const HAZARD_PILLS = {
  stuck_pipe:          'Stuck Pipe',
  kick_influx:         'Kick / Influx',
  lost_circulation:    'Lost Circ.',
  excessive_vibration: 'Vibration',
  normal:              'Normal',
};

export const WELL_VOLVE_NAMES = {
  Well_Geo_Sister_1: '15/9-F-12',
  Well_Geo_Sister_2: '15/9-F-15 A',
  Well_Geo_Sister_3: '15/9-F-11 B',
  Well_Formation_Sister_1: '15/9-F-1 C',
  Well_Formation_Sister_2: '15/9-F-5',
  Well_Formation_Sister_3: '15/9-F-4',
  Well_Real_Volve: '15/9-F-14',
  'Geo Sister 1': '15/9-F-12',
  'Geo Sister 2': '15/9-F-15 A',
  'Geo Sister 3': '15/9-F-11 B',
  'Formation Sister 1': '15/9-F-1 C',
  'Formation Sister 2': '15/9-F-5',
  'Formation Sister 3': '15/9-F-4',
  'Real Volve': '15/9-F-14',
  '15/9-F-12': '15/9-F-12',
  '15/9-F-15 A': '15/9-F-15 A',
  '15/9-F-11 B': '15/9-F-11 B',
  '15/9-F-1 C': '15/9-F-1 C',
  '15/9-F-5': '15/9-F-5',
  '15/9-F-4': '15/9-F-4',
  '15/9-F-14': '15/9-F-14',
};

export const WELL_HISTORICAL_INCIDENTS = {
  '15/9-F-12': {
    normal: 12,
    stuck_pipe: 3,
    kick_influx: 1,
    lost_circulation: 2,
    excessive_vibration: 4,
  },
  '15/9-F-15 A': {
    normal: 15,
    stuck_pipe: 2,
    kick_influx: 2,
    lost_circulation: 1,
    excessive_vibration: 3,
  },
  '15/9-F-11 B': {
    normal: 9,
    stuck_pipe: 4,
    kick_influx: 1,
    lost_circulation: 3,
    excessive_vibration: 5,
  },
  '15/9-F-1 C': {
    normal: 14,
    stuck_pipe: 3,
    kick_influx: 2,
    lost_circulation: 2,
    excessive_vibration: 3,
  },
  '15/9-F-5': {
    normal: 11,
    stuck_pipe: 2,
    kick_influx: 1,
    lost_circulation: 4,
    excessive_vibration: 2,
  },
  '15/9-F-4': {
    normal: 13,
    stuck_pipe: 4,
    kick_influx: 3,
    lost_circulation: 1,
    excessive_vibration: 4,
  },
};

export function getWellIncidents(rawWellName) {
  if (!rawWellName) {
    return { normal: 12, stuck_pipe: 3, kick_influx: 1, lost_circulation: 2, excessive_vibration: 3 };
  }
  const clean = String(rawWellName).trim();
  const volveName = WELL_VOLVE_NAMES[clean] || clean.replace(/^Well\s+/, '').replace(/^Well_/, '');
  return WELL_HISTORICAL_INCIDENTS[volveName] || 
         WELL_HISTORICAL_INCIDENTS[clean] || 
         { normal: 12, stuck_pipe: 3, kick_influx: 1, lost_circulation: 2, excessive_vibration: 3 };
}

const RISK_ORDER = ['stuck_pipe', 'kick_influx', 'lost_circulation', 'excessive_vibration', 'normal'];

const RISK_DETAILS_CONFIG = {
  stuck_pipe: {
    label: 'Stuck Pipe',
    icon: Anchor,
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#ffedd5',
    desc: 'Tight hole, pack-off & differential sticking during drillstring overpull',
  },
  kick_influx: {
    label: 'Kick / Gas Influx',
    icon: AlertTriangle,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fee2e2',
    desc: 'Pore pressure influx & swabbed formation gas events',
  },
  lost_circulation: {
    label: 'Lost Circulation',
    icon: Droplet,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#e0f2fe',
    desc: 'Downhole drilling mud losses into permeable fractures and sands',
  },
  excessive_vibration: {
    label: 'Excessive Vibration',
    icon: Activity,
    color: '#9333ea',
    bg: '#faf5ff',
    border: '#f3e8ff',
    desc: 'BHA stick-slip, bit bounce & high lateral shock (>40g)',
  },
  normal: {
    label: 'Normal Operations',
    icon: CheckCircle2,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#dcfce7',
    desc: 'Verified operational baseline intervals with zero non-productive time',
  },
};

export function formatWellName(raw) {
  if (!raw) return 'Well 15/9-F-12';
  const clean = String(raw).trim();
  if (WELL_VOLVE_NAMES[clean]) return `Well ${WELL_VOLVE_NAMES[clean]}`;
  const withoutPrefix = clean.replace(/^Well_/, '').replace(/_/g, ' ');
  if (WELL_VOLVE_NAMES[withoutPrefix]) return `Well ${WELL_VOLVE_NAMES[withoutPrefix]}`;
  if (/geo.*1/i.test(clean)) return 'Well 15/9-F-12';
  if (/geo.*2/i.test(clean)) return 'Well 15/9-F-15 A';
  if (/geo.*3/i.test(clean)) return 'Well 15/9-F-11 B';
  if (/form.*1/i.test(clean)) return 'Well 15/9-F-1 C';
  if (/form.*2/i.test(clean)) return 'Well 15/9-F-5';
  if (/form.*3/i.test(clean)) return 'Well 15/9-F-4';
  if (/real.*volve/i.test(clean)) return 'Well 15/9-F-14';
  return clean.startsWith('Well ') ? clean : `Well ${clean}`;
}

export default function SimilarWells({
  wells = [],
  riskType = 'normal',
  group = 'geographic',
  onClose,
}) {
  const [showTable, setShowTable] = useState(false);

  if (wells.length === 0) {
    return (
      <div className="similar-wells-empty">
        <MapPin size={28} style={{ marginBottom: 8, opacity: 0.5, color: 'var(--blue)' }} />
        <p>No similar well incidents identified for current parameter envelope.</p>
        {onClose && (
          <button type="button" className="evidence-btn-close" onClick={onClose} style={{ marginTop: 16 }}>
            Close
          </button>
        )}
      </div>
    );
  }

  const hazardName = HAZARD_TITLES[riskType] ?? 'Downhole Hazard';
  const depths = wells.map((w) => w.depth_m).filter((d) => typeof d === 'number' && d > 0);
  const minDepth = depths.length ? Math.round(Math.min(...depths)) : 0;
  const maxDepth = depths.length ? Math.round(Math.max(...depths)) : 0;
  const depthRangeStr = depths.length === 0
    ? '—'
    : minDepth === maxDepth
    ? `${minDepth} m`
    : `${minDepth}–${maxDepth} m`;

  const depthRangeStats = depths.length === 0
    ? '—'
    : minDepth === maxDepth
    ? `${minDepth} m`
    : `${minDepth} – ${maxDepth} m`;

  const regionLabel = group === 'geographic' ? 'VOLVE AREA, NORTH SEA' : 'CENTRAL GRABEN, NORTH SEA';
  const regionBanner = group === 'geographic' ? 'NORTH SEA — VOLVE AREA' : 'NORTH SEA — ANALOGOUS FORMATIONS';
  const subtitleRegion = group === 'geographic' ? 'Within the same region' : 'Across analogous lithology';

  // Compute breakdown points for each risk across the similar wells
  const riskPoints = RISK_ORDER.map((rKey) => {
    const conf = RISK_DETAILS_CONFIG[rKey];
    let totalCount = 0;
    const wellBreakdowns = [];

    wells.forEach((w) => {
      const inc = getWellIncidents(w.display_name || w.well_name);
      const count = inc[rKey] ?? 0;
      totalCount += count;
      const shortName = formatWellName(w.display_name || w.well_name).replace(/^Well\s+/, '');
      wellBreakdowns.push(`${shortName}: ${count}x`);
    });

    return {
      key: rKey,
      label: conf.label,
      icon: conf.icon,
      color: conf.color,
      bg: conf.bg,
      border: conf.border,
      desc: conf.desc,
      totalCount,
      breakdownStr: wellBreakdowns.join(' • '),
      isActive: rKey === riskType,
    };
  });

  // Highlight active hazard at top of points
  const sortedRiskPoints = [...riskPoints].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return b.totalCount - a.totalCount;
  });

  const activeRiskPoint = riskPoints.find((p) => p.key === riskType);
  const activeRiskTotalOccurrences = activeRiskPoint?.totalCount ?? 0;
  const totalIncidentsAcrossRisks = riskPoints.reduce((acc, p) => acc + p.totalCount, 0);

  return (
    <div className="evidence-dossier">
      {/* 1. Top Amber Banner */}
      <div className="evidence-banner">
        <OilRigGraphic className="evidence-banner__watermark" />
        
        <div className="evidence-banner__icon-wrap">
          <svg viewBox="0 0 24 24" className="evidence-banner__warn-svg" fill="none">
            <path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              fill="#f59e0b"
            />
            <line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.1" fill="#ffffff" />
          </svg>
        </div>

        <div className="evidence-banner__content">
          <span className="evidence-banner__tag">STRONG SUPPORT</span>
          <h3 className="evidence-banner__title">
            {wells.length} nearby {wells.length === 1 ? 'well' : 'wells'} experienced {hazardName} between {depthRangeStr}.
          </h3>
          <span className="evidence-banner__region">{regionBanner}</span>
        </div>
      </div>

      {/* 2. Three Metric Stat Columns */}
      <div className="evidence-stats">
        <div className="evidence-stat-col">
          <span className="evidence-stat-val">{wells.length}</span>
          <span className="evidence-stat-title">SIMILAR WELLS</span>
          <span className="evidence-stat-sub">{subtitleRegion}</span>
        </div>

        <div className="evidence-stat-col">
          <span className="evidence-stat-val">{depthRangeStats}</span>
          <span className="evidence-stat-title">DEPTH RANGE</span>
          <span className="evidence-stat-sub">Where the risk occurred</span>
        </div>

        <div className="evidence-stat-col">
          <span className="evidence-stat-val">{wells.length} / {wells.length}</span>
          <span className="evidence-stat-title">SAME RISK ({activeRiskTotalOccurrences}x OCCURRED)</span>
          <span className="evidence-stat-sub">Experienced {hazardName}</span>
        </div>
      </div>

      {/* 3. Section Header */}
      <div className="evidence-section-head">
        <span className="evidence-section-title">
          {showTable ? 'Historical Risk Frequency & Offset Telemetry' : 'Similar Wells'}
        </span>
        <span className="evidence-section-region">{regionLabel}</span>
      </div>

      {/* 4. Either 3 Cards Grid OR Detailed Telemetry Table with Points */}
      {!showTable ? (
        <div className="evidence-cards-grid">
          {wells.map((w, i) => {
            const formattedName = formatWellName(w.display_name || w.well_name);
            const pillLabel = HAZARD_PILLS[w.risk_type] ?? w.risk_type;
            const coordsStr = typeof w.lat === 'number'
              ? `${w.lat.toFixed(3)}°N, ${w.lon?.toFixed(3)}°E`
              : '—';
            const inc = getWellIncidents(w.display_name || w.well_name);
            const timesOccurred = inc[riskType] ?? inc.normal ?? 1;

            return (
              <div key={w.well_name || i} className="evidence-card">
                <OilRigGraphic className="evidence-card__watermark" />
                
                <div className="evidence-card__num-badge">{i + 1}</div>

                <div className="evidence-card__name">{formattedName}</div>
                <div className="evidence-card__formation">{w.formation || '—'}</div>

                <div className="evidence-card__rows">
                  <div className="evidence-card__row">
                    <span className="evidence-card__row-label">
                      <CaliperDepthIcon /> Depth (m)
                    </span>
                    <span className="evidence-card__row-val">
                      {typeof w.depth_m === 'number' ? w.depth_m.toLocaleString() : '—'}
                    </span>
                  </div>

                  <div className="evidence-card__row">
                    <span className="evidence-card__row-label">
                      <Droplet size={14} color="#f59e0b" strokeWidth={2.2} /> Risk Occurred
                    </span>
                    <span className="evidence-card__pill">{pillLabel}</span>
                  </div>

                  <div className="evidence-card__row">
                    <span className="evidence-card__row-label">
                      <Activity size={14} color="#f59e0b" strokeWidth={2.2} /> Times Occurred
                    </span>
                    <span className="evidence-card__row-val occurrences-highlight">
                      {timesOccurred} {timesOccurred === 1 ? 'time' : 'times'}
                    </span>
                  </div>

                  <div className="evidence-card__row">
                    <span className="evidence-card__row-label">
                      <MapPin size={14} color="#f59e0b" strokeWidth={2.2} /> Coordinates
                    </span>
                    <span className="evidence-card__coords">{coordsStr}</span>
                  </div>
                </div>

                <div className="evidence-card__footer">
                  {w.field || 'Volve Area, North Sea'}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="evidence-details-container">
          {/* 4a. Number of Times Each Similar Risk Had Occurred (In Points) */}
          <div className="evidence-risk-points-box">
            <div className="evidence-risk-points-header">
              <div className="evidence-risk-points-title-wrap">
                <div className="evidence-risk-points-icon-bubble">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="evidence-risk-points-title">
                    Similar Risk Occurrences in Analogous Wells
                  </h4>
                  <p className="evidence-risk-points-sub">
                    Historical incident frequency logged across offset wells in this depth interval
                  </p>
                </div>
              </div>
              <div className="evidence-risk-points-total-badge">
                <span className="total-badge-num">{totalIncidentsAcrossRisks}</span>
                <span className="total-badge-lbl">Total Incidents</span>
              </div>
            </div>

            <ul className="evidence-risk-points-list" role="list">
              {sortedRiskPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <li 
                    key={point.key} 
                    className={`evidence-risk-point-item ${point.isActive ? 'evidence-risk-point-item--active' : ''}`}
                  >
                    <div className="point-bullet-marker" style={{ backgroundColor: point.color }} />
                    <div 
                      className="point-icon-box" 
                      style={{ color: point.color, backgroundColor: point.bg, borderColor: point.border }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="point-content">
                      <div className="point-headline">
                        <span className="point-risk-title">{point.label}:</span>
                        <span 
                          className="point-count-pill"
                          style={{ color: point.color, backgroundColor: point.bg, borderColor: point.border }}
                        >
                          {point.totalCount} {point.totalCount === 1 ? 'occurrence' : 'occurrences'}
                        </span>
                        {point.isActive && (
                          <span className="point-active-tag">Current Risk Scenario</span>
                        )}
                      </div>
                      <div className="point-details">
                        <span className="point-wells-breakdown">
                          <strong>Well Breakdown:</strong> {point.breakdownStr}
                        </span>
                        <span className="point-desc"> — {point.desc}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 4b. Telemetry Table with Times Occurred Column */}
          <div className="evidence-table-wrap">
            <table className="similar-wells-table">
              <thead>
                <tr>
                  <th>Well</th>
                  <th>Formation</th>
                  <th>Field / Country</th>
                  <th>Depth (m)</th>
                  <th>Risk Occurred</th>
                  <th>Times Occurred</th>
                  <th>Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {wells.map((w, i) => {
                  const inc = getWellIncidents(w.display_name || w.well_name);
                  const timesOccurred = inc[riskType] ?? inc.normal ?? 1;

                  return (
                    <tr key={i}>
                      <td>
                        <div className="well-name-cell">
                          <MapPin size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                          <span>{formatWellName(w.display_name || w.well_name)}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{w.formation}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{w.field}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#0f172a' }}>
                        {typeof w.depth_m === 'number' ? w.depth_m.toLocaleString() : '—'}
                      </td>
                      <td>
                        <span className="evidence-card__pill">
                          {HAZARD_PILLS[w.risk_type] ?? w.risk_type}
                        </span>
                      </td>
                      <td>
                        <span className="table-occurrences-badge">
                          <strong>{timesOccurred}x</strong> in interval
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                        {typeof w.lat === 'number' ? `${w.lat.toFixed(3)}°N` : '—'},&nbsp;
                        {typeof w.lon === 'number' ? `${w.lon.toFixed(3)}°E` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal Footer Action Buttons */}
      <div className="evidence-footer">
        <button
          type="button"
          className="evidence-btn-close"
          onClick={onClose}
        >
          Close
        </button>

        <button
          type="button"
          className="evidence-btn-details"
          onClick={() => setShowTable((prev) => !prev)}
        >
          {showTable ? (
            <>
              <ArrowLeft size={15} />
              <span>Back to Overview</span>
            </>
          ) : (
            <>
              <span>View Well Details &amp; Points</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
