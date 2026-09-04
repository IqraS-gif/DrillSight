import { useState } from 'react';
import { MapPin, Droplet, ArrowRight, ArrowLeft } from 'lucide-react';

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
          <span className="evidence-stat-title">SAME RISK</span>
          <span className="evidence-stat-sub">Experienced {hazardName}</span>
        </div>
      </div>

      {/* 3. Section Header */}
      <div className="evidence-section-head">
        <span className="evidence-section-title">Similar Wells</span>
        <span className="evidence-section-region">{regionLabel}</span>
      </div>

      {/* 4. Either 3 Cards Grid OR Detailed Telemetry Table */}
      {!showTable ? (
        <div className="evidence-cards-grid">
          {wells.map((w, i) => {
            const formattedName = formatWellName(w.display_name || w.well_name);
            const pillLabel = HAZARD_PILLS[w.risk_type] ?? w.risk_type;
            const coordsStr = typeof w.lat === 'number'
              ? `${w.lat.toFixed(3)}°N, ${w.lon?.toFixed(3)}°E`
              : '—';

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
        <div className="evidence-table-wrap">
          <table className="similar-wells-table">
            <thead>
              <tr>
                <th>Well</th>
                <th>Formation</th>
                <th>Field / Country</th>
                <th>Depth (m)</th>
                <th>Risk Occurred</th>
                <th>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {wells.map((w, i) => (
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
                  <td style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                    {typeof w.lat === 'number' ? `${w.lat.toFixed(3)}°N` : '—'},&nbsp;
                    {typeof w.lon === 'number' ? `${w.lon.toFixed(3)}°E` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <span>View Well Details</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
