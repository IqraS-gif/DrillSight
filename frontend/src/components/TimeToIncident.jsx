import { Timer, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = (d) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function formatHours(h) {
  if (h >= 999) return { value: '∞', unit: '', sub: 'Parameters within safe range', isImminent: false };
  if (h < 1)   return { value: `${Math.round(h * 60)}`, unit: 'minutes', sub: 'Incident may be imminent', isImminent: true };
  if (h < 24)  return { value: h.toFixed(1), unit: 'hours', sub: 'Estimated time to incident', isImminent: h <= 6 };
  const days = (h / 24).toFixed(1);
  return { value: days, unit: 'days', sub: 'Estimated time to incident', isImminent: false };
}

export default function TimeToIncident({ hours = 999, riskLevel = 'normal' }) {
  const { value, unit, sub, isImminent } = formatHours(hours);

  const isHigh = riskLevel === 'high' || (hours < 24 && hours > 0);
  const isMed  = riskLevel === 'medium';

  return (
    <div className="tti-card-inner">
      {/* ── Top Header Row ── */}
      <div className="tti-top-row">
        <div className="tti-header-left">
          <div className="tti-header-icon">
            <Timer size={17} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="tti-title">Time to Incident</h2>
          </div>
        </div>

        <div className="tti-header-right">
          {isHigh ? (
            <span className="tti-badge tti-badge--high">
              <AlertTriangle size={11} strokeWidth={2.5} />
              <span>High Risk</span>
            </span>
          ) : isMed ? (
            <span className="tti-badge tti-badge--medium">
              <AlertTriangle size={11} strokeWidth={2.5} />
              <span>Elevated</span>
            </span>
          ) : (
            <span className="tti-badge tti-badge--safe">
              <CheckCircle2 size={11} strokeWidth={2.5} />
              <span>Safe</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Main Body Row ── */}
      <div className="tti-body-row">
        {/* Left: Metric value + subtext */}
        <div className="tti-metric-col">
          <div className="tti-val-group">
            <span className="tti-val-number">{value}</span>
            {unit && <span className="tti-val-unit">{unit}</span>}
          </div>
          <p className={`tti-imminent-sub${isImminent ? ' active' : ''}`}>{sub}</p>
        </div>

        {/* Right: Circular Countdown Gauge Graphic (Centered) */}
        <div className="tti-graphic-col">
          <svg viewBox="0 0 100 100" width="86" height="86" className="tti-ring-svg">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#ff7828" />
                <stop offset="100%" stopColor="#ff5500" />
              </linearGradient>
              <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Faint Outer Track */}
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="#fff7ed"
              strokeWidth="8.5"
            />
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="#fde68a"
              strokeWidth="8.5"
              strokeOpacity="0.3"
            />

            {/* Active Vibrant Orange/Amber Arc */}
            <path
              d={describeArc(50, 50, 36, -30, 155)}
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              filter="url(#ringGlow)"
            />

            {/* Center Disc with Soft Shadow */}
            <circle
              cx="50"
              cy="50"
              r="20"
              fill="#ffffff"
              stroke="#fef3c7"
              strokeWidth="1.2"
            />
            <circle
              cx="50"
              cy="50"
              r="17"
              fill="#fffbf5"
            />

            {/* Centered Clock Icon */}
            <g transform="translate(41, 41)">
              <Clock size={18} color="#f59e0b" strokeWidth={2.4} />
            </g>
          </svg>
        </div>
      </div>

      {/* ── Bottom Fluid Waves ── */}
      <div className="tti-wave-wrap">
        <svg viewBox="0 0 320 50" preserveAspectRatio="none" className="tti-wave-svg">
          <path
            d="M 0 25 C 50 14, 110 10, 170 19 C 230 28, 270 36, 320 22 L 320 50 L 0 50 Z"
            fill="#eaf3fe"
            fillOpacity="0.65"
          />
          <path
            d="M 0 34 C 65 24, 130 18, 195 27 C 255 35, 290 38, 320 30 L 320 50 L 0 50 Z"
            fill="#dbeafe"
            fillOpacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}
