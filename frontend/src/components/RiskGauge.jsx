import { useRef } from 'react';

const TRACK_COLOR = '#eef3f8';

function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = (d) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function RiskGauge({ percent = 0, riskLevel = 'normal' }) {
  const arcRef = useRef(null);

  const cx = 100, cy = 94, r = 68;
  const startAngle = 135;
  const totalSweep = 270;
  const endAngle = startAngle + totalSweep;
  const fillAngle = startAngle + (Math.min(Math.max(percent, 0.5), 100) / 100) * totalSweep;

  // Radial tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = ((startAngle + (i / 10) * totalSweep) * Math.PI) / 180;
    const outer = r + 8;
    const inner = r + (i % 5 === 0 ? 3 : 1);
    ticks.push({
      x1: cx + inner * Math.cos(a),
      y1: cy + inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy + outer * Math.sin(a),
      major: i % 5 === 0,
    });
  }

  const needleColor = riskLevel === 'high' ? '#ff6b00' : riskLevel === 'medium' ? '#f59e0b' : '#0066ee';

  return (
    <div className="gauge-wrapper">
      <svg viewBox="0 0 200 170" width="220" height="172" className="gauge-svg">
        <defs>
          {/* High risk gradient matching reference image */}
          <linearGradient id="gaugeGradientHigh" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff9a3c" />
            <stop offset="50%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#fa5252" />
          </linearGradient>
          {/* Medium risk gradient */}
          <linearGradient id="gaugeGradientMedium" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          {/* Normal risk gradient */}
          <linearGradient id="gaugeGradientNormal" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0066ee" />
          </linearGradient>
        </defs>

        {/* Background Track */}
        <path
          d={describeArc(cx, cy, r, startAngle, endAngle)}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth="13"
          strokeLinecap="round"
        />

        {/* Active Fill with Gradient */}
        <path
          ref={arcRef}
          d={describeArc(cx, cy, r, startAngle, fillAngle)}
          fill="none"
          stroke={
            riskLevel === 'high'
              ? 'url(#gaugeGradientHigh)'
              : riskLevel === 'medium'
              ? 'url(#gaugeGradientMedium)'
              : 'url(#gaugeGradientNormal)'
          }
          strokeWidth="13"
          strokeLinecap="round"
          style={{ transition: 'stroke .5s ease, stroke-dashoffset .5s ease' }}
        />

        {/* Radial Tick Marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.major ? '#94a3b8' : '#cbd5e1'}
            strokeWidth={t.major ? 1.5 : 1}
          />
        ))}

        {/* Numerical Labels: 0, 25, 50, 75, 100 */}
        {[0, 25, 50, 75, 100].map((v) => {
          const a = ((startAngle + (v / 100) * totalSweep) * Math.PI) / 180;
          const labelR = r + 18;
          return (
            <text
              key={v}
              x={cx + labelR * Math.cos(a)}
              y={cy + labelR * Math.sin(a) + 3.5}
              textAnchor="middle"
              fontSize="8.5"
              fill="#94a3b8"
              fontFamily="Inter, sans-serif"
              fontWeight="600"
            >
              {v}
            </text>
          );
        })}

        {/* Center Percentage Value */}
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          className="gauge-value"
          fontSize="33"
          fontFamily="Inter, sans-serif"
          fontWeight="900"
          fill="#0b1e36"
        >
          {Math.round(percent)}%
        </text>

        {/* Center Subtitle Label */}
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          className="gauge-label"
          fontSize="9.5"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          letterSpacing="0.08em"
          fill="#8fa3bf"
        >
          OVERALL RISK
        </text>

        {/* Dynamic Needle Pointer */}
        {(() => {
          const nAngle = ((startAngle + (Math.min(Math.max(percent, 0), 100) / 100) * totalSweep) * Math.PI) / 180;
          const nx = cx + (r - 16) * Math.cos(nAngle);
          const ny = cy + (r - 16) * Math.sin(nAngle);
          return (
            <>
              <line
                x1={cx} y1={cy}
                x2={nx} y2={ny}
                stroke={needleColor}
                strokeWidth="2.8"
                strokeLinecap="round"
                style={{ transition: 'all .5s ease' }}
              />
              <circle cx={cx} cy={cy} r="5.5" fill={needleColor} />
              <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
            </>
          );
        })()}
      </svg>

      <div className={`risk-badge ${riskLevel}`}>
        {riskLevel === 'normal' ? 'NORMAL' : riskLevel === 'medium' ? 'MEDIUM RISK' : 'HIGH RISK'}
      </div>
    </div>
  );
}
