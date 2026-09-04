/**
 * physicsRisk.js  —  Pure physics-based drilling risk engine for DrillInsight
 *
 * All risk values (0–1) are derived 100% from drilling parameter physics.
 * No ML model influence. Deterministic and immediately reactive to slider changes.
 *
 * Physics references:
 *  - API RP 53 (well control)
 *  - SPE 56387 (stuck pipe indicators)
 *  - API RP 13D (mud weight / ECD)
 *  - OTC 23958 (lost circulation signatures)
 *  - SPE 151321 (downhole vibration thresholds)
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lerp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

function clamp(x, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Generic parameter stress (0=safe, 1=max danger) for "high-is-bad" params.
 */
function stress(val, safe_hi, warn_hi, danger_hi) {
  if (val <= safe_hi) return 0;
  if (val <= warn_hi) return clamp(lerp(val, safe_hi, warn_hi, 0, 0.50));
  return clamp(lerp(val, warn_hi, danger_hi, 0.50, 1.0));
}

// ─── Individual hazard scorers (each returns 0..1) ───────────────────────────

/**
 * STUCK PIPE
 * Key drivers: high surface torque (key seating / pack-off), elevated hookload
 * (overpull), high WOB with near-zero ROP (differential sticking), depth factor.
 */
function scoreStuckPipe(p) {
  const torqueSt  = stress(p.torque,   12, 28, 40);
  const hookSt    = stress(p.hookload, 150, 240, 300);
  const wobFrac   = clamp(p.wob / 120);
  const ropFrac   = clamp(1 - p.rop / 30);
  const diffStick = clamp(wobFrac * ropFrac * 0.85);
  const depthFac  = clamp(lerp(p.depth, 1000, 5500, 0, 0.35));

  const activity  = clamp((p.wob + p.torque + p.rop) / (120 + 40 + 100));
  if (activity < 0.02) return 0;

  return clamp(torqueSt * 0.38 + hookSt * 0.22 + diffStick * 0.32 + depthFac * 0.08);
}

/**
 * KICK / INFLUX
 * Key drivers: gas reading spike, underbalanced mud weight, ROP surge into
 * high-perm zone. API RP 53: gas >2% + mud below required = kick warning.
 */
function scoreKickInflux(p) {
  const gasScore = p.gas <= 0.5
    ? 0
    : p.gas <= 5
      ? clamp(lerp(p.gas, 0.5, 5, 0, 0.45))
      : clamp(lerp(p.gas, 5, 30, 0.45, 1.0));

  const mudUnder = p.mud_in >= 1.05
    ? 0
    : clamp(lerp(p.mud_in, 1.05, 0.88, 0, 0.85));

  const ropSurge = p.rop > 45
    ? clamp(lerp(p.rop, 45, 100, 0, 0.45))
    : 0;

  const synergy = (gasScore > 0.25 && mudUnder > 0.20)
    ? gasScore * mudUnder * 0.50
    : 0;

  return clamp(gasScore * 0.52 + mudUnder * 0.32 + ropSurge * 0.10 + synergy * 0.06);
}

/**
 * LOST CIRCULATION
 * Key drivers: standpipe pressure drop below active-drilling baseline,
 * overbalanced mud (ECD fractures formation), fast drilling into fractured zones.
 *
 * Active drilling SPP reference: 5,000–18,000 kPa.
 * SPP < 6,000 = early concern; < 2,000 = serious partial loss; < 600 = severe.
 */
function scoreLostCirculation(p) {
  let sppDrop = 0;
  if (p.spp > 0) {
    if      (p.spp >= 6000)  sppDrop = 0;
    else if (p.spp >= 4000)  sppDrop = clamp(lerp(p.spp, 6000, 4000, 0.00, 0.28));
    else if (p.spp >= 2000)  sppDrop = clamp(lerp(p.spp, 4000, 2000, 0.28, 0.62));
    else if (p.spp >= 600)   sppDrop = clamp(lerp(p.spp, 2000,  600, 0.62, 0.86));
    else                     sppDrop = clamp(lerp(p.spp,  600,    0, 0.86, 0.97));
  }

  const mudOver = p.mud_in > 1.55
    ? clamp(lerp(p.mud_in, 1.55, 2.50, 0, 0.72))
    : 0;

  const ropSt   = stress(p.rop, 40, 70, 100) * 0.22;

  const synergy = (sppDrop > 0.40 && mudOver > 0.20)
    ? clamp(sppDrop * mudOver * 0.45)
    : 0;

  return clamp(sppDrop * 0.62 + mudOver * 0.24 + ropSt * 0.06 + synergy * 0.08);
}

/**
 * EXCESSIVE VIBRATION
 * Key drivers: MWD shock peak, high RPM (lateral resonance), bit bounce.
 * SPE 151321: shock > 100 g sustained = BHA fatigue damage imminent.
 */
function scoreExcessiveVibration(p) {
  const shockSt = stress(p.shock, 40, 100, 200);
  const rpmSt   = stress(p.rpm, 120, 165, 200);
  const wFrac   = clamp(p.wob / 120);
  const rFrac   = clamp(1 - p.rop / 30);
  const bounce  = clamp(wFrac * rFrac * 0.75);

  return clamp(shockSt * 0.55 + rpmSt * 0.22 + bounce * 0.23);
}

// ─── Overall risk aggregation ─────────────────────────────────────────────────

/**
 * computePhysicsRisk(params)
 *
 * Returns a prediction-shaped object:
 *   {
 *     risk_probabilities: { stuck_pipe, kick_influx, lost_circulation, excessive_vibration, normal },
 *     risk_type: string,
 *     overall_risk_percent: number (0–100),
 *     risk_level: 'normal' | 'medium' | 'high',
 *   }
 *
 * Overall risk formula:
 *   dominant hazard drives 92% of the score; remaining hazards add a small secondary.
 *   This mirrors real drilling: one dangerous condition IS the emergency.
 *   All params at safe values → all scores → 0 → 0% risk.
 */
export function computePhysicsRisk(params) {
  const p = {
    depth:    params.depth    ?? 2000,
    wob:      params.wob      ?? 0,
    rop:      params.rop      ?? 0,
    torque:   params.torque   ?? 0,
    hookload: params.hookload ?? 0,
    mud_in:   params.mud_in   ?? 1.2,
    spp:      params.spp      ?? 0,
    shock:    params.shock    ?? 0,
    gas:      params.gas      ?? 0,
    rpm:      params.rpm      ?? 0,
  };

  const raw = {
    stuck_pipe:          scoreStuckPipe(p),
    kick_influx:         scoreKickInflux(p),
    lost_circulation:    scoreLostCirculation(p),
    excessive_vibration: scoreExcessiveVibration(p),
  };

  const KEYS = ['stuck_pipe', 'kick_influx', 'lost_circulation', 'excessive_vibration'];
  const sorted = KEYS.slice().sort((a, b) => raw[b] - raw[a]);
  const dominantKey = sorted[0];
  const dominantRaw = raw[dominantKey];

  // Secondary hazards contribute at 20% of their raw score
  const secondarySum = sorted.slice(1).reduce((s, k) => s + raw[k] * 0.20, 0);

  // Overall: dominant drives 92%, secondaries fill the rest
  const overallRaw = clamp(dominantRaw * 0.92 + secondarySum);
  const overallPct = +(overallRaw * 100).toFixed(1);

  const riskLevel =
    overallPct >= 58 ? 'high' :
    overallPct >= 28 ? 'medium' : 'normal';

  // Build per-hazard probabilities for RiskBreakdown display
  const totalRaw = KEYS.reduce((s, k) => s + raw[k], 0);
  const probs = {};
  if (totalRaw < 0.001) {
    KEYS.forEach(k => { probs[k] = 0; });
  } else {
    const scale = Math.min(1, overallRaw / totalRaw);
    KEYS.forEach(k => { probs[k] = +(raw[k] * scale).toFixed(4); });
  }
  probs.normal = +Math.max(0, 1 - KEYS.reduce((s, k) => s + probs[k], 0)).toFixed(4);

  return {
    risk_probabilities:   probs,
    risk_type:            overallPct < 5 ? 'normal' : dominantKey,
    overall_risk_percent: overallPct,
    risk_level:           riskLevel,
  };
}

/**
 * blendWithPhysics — kept for potential future use.
 */
export function blendWithPhysics(mlResult, params, blendWeight = 0.55) {
  if (!mlResult) return mlResult;
  const physics = computePhysicsRisk(params);
  const mlProbs  = mlResult.risk_probabilities ?? {};
  const phyProbs = physics.risk_probabilities;
  const HAZARDS  = ['stuck_pipe', 'kick_influx', 'lost_circulation', 'excessive_vibration'];
  const blended  = {};
  HAZARDS.forEach(k => {
    blended[k] = +((mlProbs[k] ?? 0) * (1 - blendWeight) + (phyProbs[k] ?? 0) * blendWeight).toFixed(4);
  });
  const totalBlended = HAZARDS.reduce((s, k) => s + blended[k], 0);
  blended.normal     = +Math.max(0, 1 - totalBlended).toFixed(4);
  const overallPct   = +(totalBlended * 100).toFixed(1);
  const dominant     = HAZARDS.slice().sort((a, b) => blended[b] - blended[a])[0];
  return {
    ...mlResult,
    risk_probabilities:   blended,
    risk_type:            totalBlended < 0.05 ? 'normal' : dominant,
    overall_risk_percent: overallPct,
    risk_level:           overallPct >= 58 ? 'high' : overallPct >= 28 ? 'medium' : 'normal',
  };
}
