import { Anchor, AlertTriangle, Droplets, Activity } from 'lucide-react';

const ICONS = {
  anchor:           Anchor,
  'alert-triangle': AlertTriangle,
  droplets:         Droplets,
  activity:         Activity,
};

const RISK_TYPE_META = {
  excessive_vibration:  { label: 'Excessive Vibration', icon: 'activity',         description: 'High BHA/drillstring vibration causing fatigue, bit damage, or MWD failure.' },
  stuck_pipe:           { label: 'Stuck Pipe',          icon: 'anchor',           description: 'Drill string becomes immovable due to differential sticking, key seating, or pack-off.' },
  lost_circulation:     { label: 'Lost Circulation',    icon: 'droplets',         description: 'Drilling fluid escapes into formation fractures, causing mud loss.' },
  kick_influx:          { label: 'Kick / Influx',       icon: 'alert-triangle',   description: 'Unexpected formation fluid enters wellbore, potentially leading to a blowout.' },
};

export default function RiskBreakdown({ riskProbabilities = {}, dominantRisk = 'normal' }) {
  const entries = Object.entries(RISK_TYPE_META)
    .map(([key, meta]) => ({
      key,
      ...meta,
      prob: (riskProbabilities[key] ?? 0) * 100,
    }))
    // Dominant risk always appears first, remaining sorted by probability descending
    .sort((a, b) => {
      const aIsDom = a.key === dominantRisk && dominantRisk !== 'normal';
      const bIsDom = b.key === dominantRisk && dominantRisk !== 'normal';
      if (aIsDom && !bIsDom) return -1;
      if (!aIsDom && bIsDom) return 1;
      return b.prob - a.prob;
    })
    .slice(0, 3); // Display top 3 cards in row matching reference UI

  if (entries.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)' }}>
        <p style={{ fontSize: '.82rem', fontWeight: 500 }}>All risk probabilities are negligible.</p>
        <p style={{ fontSize: '.75rem', marginTop: 4 }}>Parameters are within normal operating range.</p>
      </div>
    );
  }

  return (
    <div className="risk-cards-grid">
      {entries.map(({ key, label, icon, description, prob }) => {
        const Icon = ICONS[icon] ?? Activity;
        const isDominant = key === dominantRisk && dominantRisk !== 'normal';

        // Color based on risk level and dominant status
        let barColor = 'var(--blue)';
        if (isDominant || prob >= 50) {
          barColor = 'var(--orange)';
        } else if (prob >= 20) {
          barColor = 'var(--yellow)';
        }

        return (
          <div key={key} className={`risk-card${isDominant ? ' dominant' : ''}`}>
            <div className="risk-card__top">
              <div className="risk-card__header">
                <div className="risk-card__icon-wrap">
                  <Icon size={16} strokeWidth={2.2} />
                </div>
                <span className="risk-card__name">{label}</span>
                {isDominant && <span className="risk-card__dominant-badge">DOMINANT</span>}
              </div>
              <div className="risk-card__prob">{prob.toFixed(1)}%</div>
              <div className="risk-card__bar-track">
                <div
                  className="risk-card__bar-fill"
                  style={{
                    width: `${Math.min(Math.max(prob, 1.5), 100)}%`,
                    background: barColor,
                  }}
                />
              </div>
            </div>
            <p className="risk-card__desc">{description}</p>
          </div>
        );
      })}
    </div>
  );
}
