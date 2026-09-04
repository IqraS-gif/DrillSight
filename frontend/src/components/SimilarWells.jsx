import { MapPin } from 'lucide-react';

function SimilarityBadge({ group }) {
  const normalized = (group ?? 'real').toLowerCase();
  return <span className={`similarity-badge ${normalized}`}>{normalized}</span>;
}

function RiskTypePill({ riskType }) {
  const labels = {
    stuck_pipe:           'Stuck Pipe',
    kick_influx:          'Kick / Influx',
    lost_circulation:     'Lost Circ.',
    excessive_vibration:  'Vibration',
    normal:               'Normal',
  };
  return (
    <span className={`risk-type-pill ${riskType}`}>
      {labels[riskType] ?? riskType}
    </span>
  );
}

export default function SimilarWells({ wells = [] }) {
  if (wells.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)' }}>
        <MapPin size={24} style={{ marginBottom: 8, opacity: 0.5, color: 'var(--blue)' }} />
        <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>No similar well incidents identified for current parameter envelope.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', padding: '0 4px 6px 4px' }}>
      <table className="similar-wells-table">
        <thead>
          <tr>
            <th>Well</th>
            <th>Similarity Type</th>
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
                  <span>{w.well_name?.replace('Well_', '').replace(/_/g, ' ')}</span>
                </div>
              </td>
              <td><SimilarityBadge group={w.similarity_group ?? 'real'} /></td>
              <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{w.formation}</td>
              <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{w.field}</td>
              <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-navy)' }}>
                {typeof w.depth_m === 'number' ? w.depth_m.toLocaleString() : '—'}
              </td>
              <td><RiskTypePill riskType={w.risk_type} /></td>
              <td style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                {typeof w.lat === 'number' ? `${w.lat.toFixed(3)}°N` : '—'},&nbsp;
                {typeof w.lon === 'number' ? `${w.lon.toFixed(3)}°E` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
