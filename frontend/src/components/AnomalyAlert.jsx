import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const RISK_LABELS = {
  stuck_pipe:          'Stuck Pipe',
  kick_influx:         'Kick / Influx',
  lost_circulation:    'Lost Circulation',
  excessive_vibration: 'Excessive Vibration',
  kick:                'Kick / Influx',
  lost_circ:           'Lost Circulation',
  vibration:           'Excessive Vibration',
  normal:              'Operational Drift',
};

// ─── Audio ────────────────────────────────────────────────────────────────────
let sharedAudioCtx = null;

function getAudioContext() {
  try {
    const Cls = window.AudioContext || window.webkitAudioContext;
    if (!Cls) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') sharedAudioCtx = new Cls();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
    return sharedAudioCtx;
  } catch { return null; }
}

if (typeof window !== 'undefined') {
  const unlock = () => { const c = getAudioContext(); if (c?.state === 'suspended') c.resume().catch(() => {}); };
  window.addEventListener('click',   unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

function playIndustrialAlarm() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    [
      { freq: 880, start: 0.00, dur: 0.15, type: 'sawtooth', vol: 0.24 },
      { freq: 659, start: 0.16, dur: 0.20, type: 'sine',     vol: 0.30 },
      { freq: 880, start: 0.42, dur: 0.15, type: 'sawtooth', vol: 0.24 },
      { freq: 659, start: 0.58, dur: 0.20, type: 'sine',     vol: 0.30 },
      { freq: 987, start: 0.84, dur: 0.28, type: 'triangle', vol: 0.26 },
    ].forEach(({ freq, start, dur, type, vol }) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + start); osc.stop(now + start + dur);
    });
  } catch (err) { console.warn('Alert audio:', err); }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

/**
 * Red emergency stop button with black/yellow hazard stripes.
 * Shown when risk >= 50%.
 */
function EmergencyButtonIcon() {
  return (
    <svg viewBox="0 0 44 44" width="28" height="28" aria-hidden="true">
      <defs>
        <pattern id="hz" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="4" height="8" fill="#f59e0b" />
          <rect x="4" width="4" height="8" fill="#111" />
        </pattern>
        <radialGradient id="dg" cx="38%" cy="28%" r="65%">
          <stop offset="0%"   stopColor="#ff5252" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
        <radialGradient id="sg" cx="35%" cy="25%" r="48%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.50)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {/* Hazard stripe border */}
      <rect x="0" y="0" width="44" height="44" rx="7" fill="url(#hz)" />
      {/* Button mount ring */}
      <circle cx="22" cy="22" r="17" fill="#7f1d1d" />
      {/* Red dome */}
      <circle cx="22" cy="22" r="13.5" fill="url(#dg)" />
      {/* Shine */}
      <circle cx="22" cy="22" r="13.5" fill="url(#sg)" />
      {/* Label */}
      <text x="22" y="20.5" textAnchor="middle" fill="white"
        fontSize="4.2" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="0.15">
        EMER-
      </text>
      <text x="22" y="25.5" textAnchor="middle" fill="white"
        fontSize="4.2" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="0.15">
        GENCY
      </text>
    </svg>
  );
}

/**
 * Amber warning beacon for medium-risk (28–49%) alerts.
 */
function WarningBeaconIcon() {
  return (
    <svg viewBox="0 0 44 44" width="26" height="26" aria-hidden="true">
      <defs>
        <radialGradient id="og" cx="38%" cy="28%" r="65%">
          <stop offset="0%"   stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill="url(#og)" />
      {/* Exclamation stem */}
      <rect x="19.5" y="10" width="5" height="16" rx="2.5" fill="white" />
      {/* Exclamation dot */}
      <circle cx="22" cy="32" r="3" fill="white" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnomalyAlert({
  isAnomaly  = false,
  riskLevel  = 'high',
  riskType   = 'normal',
  riskPercent = 0,
  hours      = null,
}) {
  const alertKey = `${riskLevel}-${riskType}-${isAnomaly}`;
  const [acknowledgedKey, setAcknowledgedKey] = useState(null);
  const acknowledged = acknowledgedKey === alertKey;

  // Immediate alarm + 10-second repeat until acknowledged
  useEffect(() => {
    if (acknowledged) return;
    playIndustrialAlarm();
    const timer = setInterval(() => { playIndustrialAlarm(); }, 10000);
    return () => clearInterval(timer);
  }, [alertKey, acknowledged]);

  const handleAcknowledge = () => setAcknowledgedKey(alertKey);

  const hazardName = RISK_LABELS[riskType] || 'Downhole Instability';

  // Threshold: >=50% → RED critical; <50% → ORANGE warning
  const isCritical = riskPercent >= 50;

  const alertBodyMessage =
    hazardName && hazardName !== 'Operational Drift' && riskType !== 'kick_influx' && riskType !== 'kick'
      ? `Current drilling data looks abnormal and matches patterns seen before ${hazardName.toLowerCase()} events.`
      : 'Current drilling data looks abnormal and matches patterns seen before kick/influx events.';

  return (
    <div className={[
      'anomaly-alert',
      isCritical ? 'anomaly-alert--critical' : 'anomaly-alert--warning',
      acknowledged ? 'anomaly-alert--ack' : '',
    ].join(' ')}>

      <div className="anomaly-alert__icon-wrap">
        {isCritical ? <EmergencyButtonIcon /> : <WarningBeaconIcon />}
      </div>

      <div className="anomaly-alert__content">
        <div className="anomaly-alert__header-row">
          <span className="anomaly-alert__title">
            {isCritical ? 'CRITICAL OPERATIONAL RISK ALERT' : 'ELEVATED DRILLING RISK DETECTED'}
          </span>

          <span className={`anomaly-alert__badge ${isCritical ? 'anomaly-alert__badge--sev-high' : 'anomaly-alert__badge--sev-med'}`}>
            <AlertTriangle size={11} /> {isCritical ? 'SEVERITY: HIGH' : 'SEVERITY: ELEVATED'}
          </span>

          {hazardName && hazardName !== 'Operational Drift' && (
            <span className="anomaly-alert__badge anomaly-alert__badge--hazard">
              HAZARD: {hazardName.toUpperCase()}
            </span>
          )}

          {riskPercent > 0 && (
            <span className="anomaly-alert__badge anomaly-alert__badge--time">
              RISK: {riskPercent}%
            </span>
          )}

          {hours != null && hours < 999 && (
            <span className="anomaly-alert__badge anomaly-alert__badge--time">
              WINDOW: {hours}H
            </span>
          )}

          {isAnomaly && (
            <span className="anomaly-alert__badge anomaly-alert__badge--novel">
              TELEMETRY ANOMALY
            </span>
          )}
        </div>

        <p className="anomaly-alert__body">
          {alertBodyMessage}
        </p>
      </div>

      <div className="anomaly-alert__actions">
        {!acknowledged ? (
          <button
            type="button"
            className="anomaly-alert__btn anomaly-alert__btn--ack"
            onClick={handleAcknowledge}
            title="Acknowledge alert and silence alarm"
          >
            <span>Acknowledge</span>
          </button>
        ) : (
          <span className="anomaly-alert__ack-badge">
            <CheckCircle2 size={13} /> Acknowledged
          </span>
        )}
      </div>
    </div>
  );
}
