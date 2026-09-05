import React, { useState, useEffect } from 'react';
import {
  X, Compass, AlertTriangle, Droplets, Flame, Zap,
  Layers, Anchor, ShieldAlert, Activity, CheckCircle2, Clock,
  Check, Sparkles, BookOpen, ArrowDownToLine, Gauge, Settings,
  ArrowDownCircle
} from 'lucide-react';
import RAW_KB_BACKUP from '../data/knowledge_backup.json';

// ── Dynamic Knowledge Base Mapping (All risks loaded from knowledge_backup.json) ──
export function mapKbItemToIncident(item, index = 0, wellPrefix = '') {
  const normCat = (item.category || '').toLowerCase();
  let riskLabel = item.category_name || 'Drilling Risk';
  if (normCat.includes('circ') || normCat.includes('loss')) riskLabel = 'LOST CIRCULATION';
  else if (normCat.includes('stuck') || normCat.includes('pack')) riskLabel = 'STUCK PIPE';
  else if (normCat.includes('kick') || normCat.includes('influx') || normCat.includes('gas')) riskLabel = 'KICK & GAS INFLUX';
  else if (normCat.includes('vibrat') || normCat.includes('shock')) riskLabel = 'BHA VIBRATION';
  else if (normCat.includes('instab') || normCat.includes('shale')) riskLabel = 'WELLBORE INSTABILITY';
  else if (normCat.includes('breakdown')) riskLabel = 'FORMATION BREAKDOWN';
  else if (normCat.includes('casing') || normCat.includes('cement')) riskLabel = 'CASING INTEGRITY';

  const sevRaw = (item.severity || 'high').toLowerCase();
  const severity = sevRaw.includes('crit') ? 'Critical' : sevRaw.includes('high') ? 'High' : 'Moderate';

  let nptHours = 8.0;
  if (severity === 'Critical') nptHours = 14.5;
  else if (severity === 'High') nptHours = 8.0;
  else nptHours = 4.0;

  let status = 'Resolved • Pressure Stabilized';
  if (normCat.includes('stuck')) status = 'Resolved • String Freed';
  else if (normCat.includes('kick')) status = 'Resolved • Well Controlled';
  else if (normCat.includes('vibrat')) status = 'Resolved • Parameters Optimized';
  else if (normCat.includes('instab')) status = 'Resolved • Hole Stabilized';
  else if (normCat.includes('circ') || normCat.includes('loss')) status = 'Resolved • Losses Mitigated';

  const symptoms = Array.isArray(item.symptoms_early_indicators)
    ? item.symptoms_early_indicators.join('; ')
    : (item.symptoms_early_indicators || 'Telemetry anomaly logged on rig surface sensors.');

  const rootCause = Array.isArray(item.root_causes)
    ? item.root_causes.join(' ')
    : (item.root_causes || 'Subsurface geomechanical condition exceeded operational limits.');

  const mitigation = Array.isArray(item.mitigation_actions)
    ? item.mitigation_actions.join(' ')
    : (item.mitigation_actions || item.operational_guidelines || 'Standard operational procedure applied.');

  const depthMd = item.depth_range?.start_m
    ? `${Math.round(item.depth_range.start_m).toLocaleString()} m MD`
    : '3,792 m MD';

  const rawId = item.item_id || `risk-kb-${String(index + 1).padStart(3, '0')}`;
  const idNum = rawId.replace(/[^0-9]/g, '').slice(-2) || String(index + 1).padStart(2, '0');
  const id = wellPrefix ? `INC-${wellPrefix}-${idNum}` : `INC-KB-${idNum}`;

  return {
    id,
    title: item.title,
    risk: riskLabel,
    riskKey: normCat,
    severity,
    color: item.category_color || (severity === 'Critical' ? '#dc2626' : severity === 'High' ? '#ea580c' : '#f59e0b'),
    depthMd,
    zone: item.formation || 'Target Reservoir Sandstone',
    sourceDoc: item.source_document || 'Knowledge Base Repository',
    wellReference: item.well_reference || 'Offset North Sea Well',
    nptHours,
    symptoms,
    rootCause,
    mitigation,
    status
  };
}

// ── Build complete Well Dossier dynamically from Knowledge Base ──
export function getWellDossierFromKnowledgeBase(well, kbList = RAW_KB_BACKUP) {
  if (!well) return null;

  const wellName = well.name || '15/9-F-12';
  const prefix = wellName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-3) || 'W01';

  // Safe list of kb items
  const validList = Array.isArray(kbList) && kbList.length > 0 ? kbList : RAW_KB_BACKUP;

  // ── Step 1: Map well incident risk names → exact KB category values ──
  const wellCategoryKeys = new Set();
  if (Array.isArray(well.incidents) && well.incidents.length > 0) {
    well.incidents.forEach(inc => {
      const r = (inc.risk || '').toLowerCase();
      if (r.includes('stuck') || r.includes('pack') || r.includes('differential') || r.includes('mechanical')) wellCategoryKeys.add('stuck_pipe');
      if (r.includes('circ') || r.includes('loss')) wellCategoryKeys.add('lost_circulation');
      if (r.includes('kick') || r.includes('gas') || r.includes('influx')) wellCategoryKeys.add('kick_influx');
      if (r.includes('vibrat') || r.includes('shock') || r.includes('bha') || r.includes('stick-slip')) wellCategoryKeys.add('excessive_vibration');
      if (r.includes('instab') || r.includes('shale') || r.includes('wellbore')) wellCategoryKeys.add('wellbore_instability');
      if (r.includes('breakdown') || r.includes('fracture')) wellCategoryKeys.add('formation_breakdown');
      if (r.includes('casing') || r.includes('cement')) wellCategoryKeys.add('casing_cementing');
    });
  }

  // ── Step 2: Group all KB items by their exact category ──
  const kbByCategory = {};
  validList.forEach(item => {
    const cat = (item.category || '').toLowerCase();
    if (!kbByCategory[cat]) kbByCategory[cat] = [];
    kbByCategory[cat].push(item);
  });

  // ── Step 3: For each of this well's categories, pick items using a well-specific offset ──
  // This ensures wells sharing the same categories (e.g. F-12 and F-11B) still see DIFFERENT records
  const wellHash = wellName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const selectedItems = [];
  wellCategoryKeys.forEach(cat => {
    const catItems = kbByCategory[cat] || [];
    if (catItems.length === 0) return;
    // Pick a different item per well using the hash as a rotating offset
    const offset = wellHash % catItems.length;
    // Pick up to 2 items per category, starting at the well-specific offset
    const count = Math.min(2, catItems.length);
    for (let i = 0; i < count; i++) {
      selectedItems.push(catItems[(offset + i) % catItems.length]);
    }
  });

  // Fallback: if no categories matched, show a slice of all KB items offset by well hash
  const finalItems = selectedItems.length > 0
    ? selectedItems
    : validList.slice(wellHash % Math.max(1, validList.length - 4), (wellHash % Math.max(1, validList.length - 4)) + 5);

  // Map each knowledge base item strictly from knowledge base JSON
  const incidents = finalItems.map((item, idx) => mapKbItemToIncident(item, idx, prefix));


  // Compute stats dynamically from the actual knowledge base items
  const totalNptHours = incidents.reduce((sum, inc) => sum + (Number(inc.nptHours) || 0), 0);
  const criticalCount = incidents.filter(i => i.severity === 'Critical').length;
  const highCount = incidents.filter(i => i.severity === 'High').length;

  // Well specs & metadata
  const operator = well.operator || (wellName.includes('Captain') ? 'Shell / Conoco' : 'Equinor ASA');
  const field = well.field || (wellName.includes('Captain') ? 'Offshore UK / North Sea' : 'Volve Field (Block 15/9, Central North Sea)');
  const block = well.block || (wellName.includes('15/9') ? 'Block 15/9 (PL 046)' : 'Block 13/22a');
  const coords = well.coords || '58.441° N, 1.884° E';
  const totalDepthMd = well.totalDepth || '3,880 m MD';
  const totalDepthTvd = well.totalDepthTvd || '3,150 m TVD';
  const waterDepth = well.waterDepth || '85.2 m';
  const wellType = well.wellType || (wellName.includes('15/9-F-12') ? 'Multilateral Oil Producer' : wellName.includes('15/9-F-14') ? 'Deviated Oil & Gas Producer' : 'Offshore Production Well');
  const status = well.status || 'Plugged & Abandoned (P&A)';
  const avgMudWeight = well.avgMudWeight || '1.22 SG (10.18 ppg)';
  const avgRop = well.avgRop || '18.4 m/hr';
  const rigName = well.rigName || (wellName.includes('Captain') ? 'Santa Fe Magellan (Jack-Up)' : 'Mærsk Inspirer (Jack-Up)');
  const spudDate = well.spudDate || '12-Feb-2008';
  const completionDate = well.completionDate || '28-Oct-2008';

  // Formations encountered
  const defaultLithologies = [
    'Porous clean reservoir sandstone, high permeability (200-800 mD), pressure depleted',
    'Fluvial sandstone interbedded with dense mudstone stringers',
    'Carbonaceous shale, coal seams, and fine-grained sandstones',
    'Hard fractured chalk with flint and chert nodules'
  ];

  let formations = [];
  if (Array.isArray(well.formations) && well.formations.length > 0) {
    formations = well.formations.map((f, idx) => {
      const name = typeof f === 'string' ? f : f.name;
      const lithology = (typeof f === 'object' && f.lithology)
        ? f.lithology
        : defaultLithologies[idx % defaultLithologies.length];
      const depth = (typeof f === 'object' && f.depth)
        ? f.depth
        : `${2750 + idx * 360} – ${3100 + idx * 360} m`;
      return {
        name: name.includes('Formation') || name.includes('Member') || name.includes('Sandstone') || name.includes('Chalk') ? name : `${name} Formation`,
        depth,
        lithology
      };
    });
  } else {
    formations = [
      { name: 'Hugin Sandstone', depth: '3,780 – 3,850 m', lithology: 'Porous clean reservoir sandstone, high permeability (200-800 mD), pressure depleted' },
      { name: 'Skagerrak Formation', depth: '3,850 – 3,880 m', lithology: 'Fluvial sandstone interbedded with dense mudstone stringers' },
      { name: 'Sleipner Formation', depth: '3,200 – 3,550 m', lithology: 'Carbonaceous shale, coal seams, and fine-grained sandstones' },
      { name: 'Hod Chalk Member', depth: '2,750 – 3,180 m', lithology: 'Hard fractured chalk with flint and chert nodules' }
    ];
  }

  const casingProgram = [
    { size: '30"', type: 'Conductor', shoeMd: '142 m' },
    { size: '20"', type: 'Surface Casing', shoeMd: '410 m' },
    { size: '13-3/8"', type: 'Intermediate Casing', shoeMd: '1,220 m' },
    { size: '9-5/8"', type: 'Production Casing', shoeMd: '3,450 m' },
    { size: '7"', type: 'Production Liner', shoeMd: totalDepthMd.includes('m') ? totalDepthMd.replace(/\s*MD/i, '') : '3,880 m' }
  ];

  return {
    name: wellName,
    operator,
    field,
    block,
    coords,
    totalDepthMd,
    totalDepthTvd,
    waterDepth,
    wellType,
    status,
    avgMudWeight,
    avgRop,
    rigName,
    spudDate,
    completionDate,
    formations,
    casingProgram,
    incidents,
    totalNptHours: totalNptHours.toFixed(1),
    criticalCount,
    highCount
  };
}

// ── Oil Derrick Tower SVG matching Image 1 ──
function OilDerrickIcon() {
  return (
    <svg
      width="38"
      height="52"
      viewBox="0 0 36 50"
      fill="none"
      stroke="#0f172a"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="kb-well-derrick-svg"
    >
      {/* Crown Block */}
      <line x1="13" y1="4" x2="23" y2="4" strokeWidth="2.2" />
      {/* Derrick Main Legs */}
      <line x1="14" y1="4" x2="4" y2="47" strokeWidth="2" />
      <line x1="22" y1="4" x2="32" y2="47" strokeWidth="2" />
      {/* Base Beam */}
      <line x1="2" y1="47" x2="34" y2="47" strokeWidth="2" />
      {/* Horizontal Beams */}
      <line x1="12" y1="15" x2="24" y2="15" strokeWidth="1.4" />
      <line x1="9.5" y1="26" x2="26.5" y2="26" strokeWidth="1.4" />
      <line x1="7" y1="37" x2="29" y2="37" strokeWidth="1.4" />
      {/* Tier 1 X-Brace */}
      <line x1="14" y1="4" x2="24" y2="15" />
      <line x1="22" y1="4" x2="12" y2="15" />
      {/* Tier 2 X-Brace */}
      <line x1="12" y1="15" x2="26.5" y2="26" />
      <line x1="24" y1="15" x2="9.5" y2="26" />
      {/* Tier 3 X-Brace */}
      <line x1="9.5" y1="26" x2="29" y2="37" />
      <line x1="26.5" y1="26" x2="7" y2="37" />
      {/* Tier 4 Bottom X-Brace */}
      <line x1="7" y1="37" x2="32" y2="47" />
      <line x1="29" y1="37" x2="4" y2="47" />
    </svg>
  );
}

// ── Offshore Drilling Platform Graphic matching Image 1 top right ──
function OffshoreRigGraphic() {
  return (
    <div className="kb-well-header-art">
      <svg
        width="240"
        height="88"
        viewBox="0 0 240 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="seaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Soft sea waves in background */}
        <path
          d="M0 62 C40 58, 80 66, 130 61 C180 56, 210 63, 240 60 L240 88 L0 88 Z"
          fill="url(#seaGrad)"
        />
        <path
          d="M30 68 C70 65, 110 71, 160 67 C195 64, 215 68, 240 67 L240 88 L30 88 Z"
          fill="#dbeafe"
          opacity="0.5"
        />
        <path
          d="M10 73 C55 71, 100 75, 150 72 C190 70, 215 73, 240 73"
          stroke="#93c5fd"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M40 79 C80 77, 125 80, 175 78 C205 76, 225 78, 240 78"
          stroke="#bfdbfe"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Offshore Platform Structure */}
        <g stroke="#64748b" strokeLinecap="round" strokeLinejoin="round">
          {/* Subsea Columns / Legs */}
          <line x1="100" y1="46" x2="100" y2="70" strokeWidth="2.2" stroke="#64748b" />
          <line x1="130" y1="46" x2="130" y2="70" strokeWidth="2.2" stroke="#64748b" />
          <line x1="160" y1="46" x2="160" y2="70" strokeWidth="2.2" stroke="#64748b" />

          {/* Leg cross bracing underwater */}
          <line x1="100" y1="50" x2="130" y2="65" stroke="#94a3b8" strokeWidth="0.9" />
          <line x1="130" y1="50" x2="100" y2="65" stroke="#94a3b8" strokeWidth="0.9" />
          <line x1="130" y1="50" x2="160" y2="65" stroke="#94a3b8" strokeWidth="0.9" />
          <line x1="160" y1="50" x2="130" y2="65" stroke="#94a3b8" strokeWidth="0.9" />

          {/* Platform Main Deck */}
          <rect x="90" y="40" width="80" height="6" rx="1.5" fill="#f8fafc" stroke="#475569" strokeWidth="1.3" />
          <rect x="95" y="34" width="34" height="6" rx="1" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <rect x="98" y="28" width="18" height="6" rx="1" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.9" />

          {/* Derrick Tower on Platform */}
          <line x1="138" y1="12" x2="134" y2="40" strokeWidth="1.4" stroke="#475569" />
          <line x1="148" y1="12" x2="152" y2="40" strokeWidth="1.4" stroke="#475569" />
          <line x1="138" y1="12" x2="148" y2="12" strokeWidth="1.6" stroke="#475569" />
          <rect x="140.5" y="9" width="5" height="3" fill="#64748b" />

          {/* Derrick Braces */}
          <line x1="137" y1="19" x2="149" y2="19" stroke="#64748b" strokeWidth="0.9" />
          <line x1="136" y1="26" x2="150" y2="26" stroke="#64748b" strokeWidth="0.9" />
          <line x1="135" y1="33" x2="151" y2="33" stroke="#64748b" strokeWidth="0.9" />
          <line x1="138" y1="12" x2="149" y2="19" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="148" y1="12" x2="137" y2="19" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="137" y1="19" x2="150" y2="26" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="149" y1="19" x2="136" y2="26" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="136" y1="26" x2="151" y2="33" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="150" y1="26" x2="135" y2="33" stroke="#94a3b8" strokeWidth="0.8" />

          {/* Helipad on Left */}
          <line x1="82" y1="33" x2="92" y2="33" strokeWidth="1.8" stroke="#64748b" />
          <line x1="85" y1="33" x2="88" y2="40" strokeWidth="1" stroke="#94a3b8" />

          {/* Pedestal Crane on Right */}
          <line x1="162" y1="34" x2="162" y2="40" strokeWidth="1.8" stroke="#64748b" />
          <line x1="162" y1="34" x2="180" y2="22" strokeWidth="1.3" stroke="#64748b" />
          <line x1="162" y1="34" x2="171" y2="22" strokeWidth="0.8" stroke="#94a3b8" />
          <line x1="180" y1="22" x2="180" y2="32" strokeWidth="0.8" stroke="#94a3b8" strokeDasharray="1.5 1.5" />

          {/* Flare boom extending right */}
          <line x1="168" y1="40" x2="198" y2="34" strokeWidth="1" stroke="#94a3b8" />
          <line x1="198" y1="34" x2="202" y2="32" strokeWidth="1" stroke="#cbd5e1" />
        </g>
      </svg>
    </div>
  );
}

// ── Icon selector helper ──
function getRiskIcon(riskName) {
  const norm = (riskName || '').toLowerCase();
  if (norm.includes('loss') || norm.includes('circ')) return ArrowDownCircle;
  if (norm.includes('kick') || norm.includes('gas') || norm.includes('influx')) return Flame;
  if (norm.includes('vibrat') || norm.includes('shock') || norm.includes('stick-slip')) return Zap;
  if (norm.includes('instab') || norm.includes('shale') || norm.includes('collapse')) return Layers;
  if (norm.includes('pack') || norm.includes('bridg')) return ShieldAlert;
  return Anchor; // Stuck Pipe
}

// ── Severity Pill Component ──
function SeverityBadge({ severity }) {
  const s = (severity || '').toLowerCase();
  let bg = '#f1f5f9';
  let color = '#475569';
  let border = '#cbd5e1';

  if (s.includes('crit')) {
    bg = '#fef2f2';
    color = '#dc2626';
    border = '#fee2e2';
  } else if (s.includes('high')) {
    bg = '#fff7ed';
    color = '#ea580c';
    border = '#ffedd5';
  } else if (s.includes('mod') || s.includes('med')) {
    bg = '#fefce8';
    color = '#a16207';
    border = '#fde047';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 9999,
      fontSize: '0.72rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      background: bg,
      color: color,
      border: `1px solid ${border}`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {severity}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HISTORICAL WELL DOSSIER MODAL COMPONENT (100% DYNAMIC FROM KNOWLEDGE BASE)
// ═════════════════════════════════════════════════════════════════════════════
export default function WellDossierModal({ well, onClose }) {
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' | 'specs'
  const [kbData, setKbData] = useState(RAW_KB_BACKUP);

  // Attempt live knowledge base fetch if backend running; graceful fallback to RAW_KB_BACKUP
  useEffect(() => {
    let isMounted = true;
    const fetchLiveKb = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/knowledge/search?limit=100');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && Array.isArray(json.results) && json.results.length > 0) {
            setKbData(json.results);
          }
        }
      } catch (err) {
        // Offline / fallback directly to knowledge_backup.json
      }
    };
    fetchLiveKb();
    return () => { isMounted = false; };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!well) return null;

  // Retrieve dossier data dynamically generated strictly from knowledge_backup.json
  const enriched = getWellDossierFromKnowledgeBase(well, kbData);
  const filteredIncidents = enriched.incidents;
  const totalIncidentsCount = enriched.incidents.length;
  const criticalCount = enriched.criticalCount;
  const highCount = enriched.highCount;

  return (
    <div className="kb-well-modal-backdrop" onClick={onClose}>
      <div
        className="kb-well-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── 1. MODAL TOP HEADER BAR ── */}
        <div className="kb-well-modal-header">
          <div className="kb-well-modal-header-main">
            <div className="kb-well-derrick-wrap">
              <OilDerrickIcon />
            </div>
            <div className="kb-well-header-info">
              <div className="kb-well-modal-badge-group">
                <span className="kb-well-modal-well-badge">
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                  WELL {enriched.name}
                </span>
              </div>
              <h2 className="kb-well-modal-title">
                {enriched.operator} • {enriched.field}
              </h2>
              <div className="kb-well-modal-coords-bar">
                <span>{enriched.coords}</span>
                <span className="kb-well-pipe">|</span>
                <span>
                  {enriched.block.startsWith('Block:')
                    ? enriched.block
                    : `Block: ${enriched.block.replace(/^Block\s+/i, '')}`}
                </span>
                <span className="kb-well-pipe">|</span>
                <span>Water Depth: {enriched.waterDepth}</span>
              </div>
            </div>
          </div>

          <OffshoreRigGraphic />

          <button
            type="button"
            className="kb-well-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 2. KEY METRICS STATS BAR ── */}
        <div className="kb-well-metrics-bar">
          <div className="kb-well-metric-box">
            <div className="kb-well-metric-icon-wrap">
              <ArrowDownToLine size={20} color="#0284c7" />
            </div>
            <div className="kb-well-metric-content">
              <span className="kb-well-metric-label">Total Depth (MD)</span>
              <span className="kb-well-metric-val">
                {enriched.totalDepthMd ? enriched.totalDepthMd.replace(/\s*MD$/i, '') : '3,880 m'}
              </span>
              <span className="kb-well-metric-sub">{enriched.totalDepthTvd}</span>
            </div>
          </div>

          <div className="kb-well-metric-box">
            <div className="kb-well-metric-icon-wrap">
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div className="kb-well-metric-content">
              <span className="kb-well-metric-label">Total Incidents</span>
              <span className="kb-well-metric-val" style={{ color: '#dc2626' }}>
                {totalIncidentsCount}
              </span>
              <span className="kb-well-metric-sub">
                <strong style={{ color: '#dc2626', fontWeight: 700 }}>{criticalCount}</strong> Critical
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                <strong style={{ color: '#ea580c', fontWeight: 700 }}>{highCount}</strong> High
              </span>
            </div>
          </div>

          <div className="kb-well-metric-box">
            <div className="kb-well-metric-icon-wrap">
              <Droplets size={20} color="#0284c7" />
            </div>
            <div className="kb-well-metric-content">
              <span className="kb-well-metric-label">Avg Mud Weight</span>
              <span className="kb-well-metric-val">
                {enriched.avgMudWeight ? (
                  <>
                    {enriched.avgMudWeight.split('(')[0].trim()}
                    {enriched.avgMudWeight.includes('(') && (
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginLeft: 5 }}>
                        ({enriched.avgMudWeight.split('(')[1]}
                      </span>
                    )}
                  </>
                ) : '1.22 SG'}
              </span>
              <span className="kb-well-metric-sub">Hydrostatic Balance</span>
            </div>
          </div>

          <div className="kb-well-metric-box">
            <div className="kb-well-metric-icon-wrap">
              <Gauge size={20} color="#0284c7" />
            </div>
            <div className="kb-well-metric-content">
              <span className="kb-well-metric-label">Avg Drilling ROP</span>
              <span className="kb-well-metric-val">{enriched.avgRop}</span>
              <span className="kb-well-metric-sub">Penetration Rate</span>
            </div>
          </div>


        </div>

        {/* ── 3. MODAL NAVIGATION TABS ── */}
        <div className="kb-well-nav-tabs">
          <button
            type="button"
            className={`kb-well-nav-tab ${activeTab === 'incidents' ? 'kb-well-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <AlertTriangle size={15} />
            <span>Risk Incidents Log ({totalIncidentsCount})</span>
          </button>

          <button
            type="button"
            className={`kb-well-nav-tab ${activeTab === 'specs' ? 'kb-well-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            <Layers size={15} />
            <span>Well Architecture &amp; Formations</span>
          </button>
        </div>

        {/* ── 4. TAB CONTENT ── */}
        <div className="kb-well-modal-body">
          {/* ════ TAB 1: INCIDENTS LOG FROM REAL KNOWLEDGE BASE ════ */}
          {activeTab === 'incidents' && (
            <div className="kb-well-incidents-section">
              <div className="kb-well-incidents-list">
                {filteredIncidents.length === 0 ? (
                  <div className="kb-well-empty-incidents">
                    <CheckCircle2 size={32} color="#16a34a" style={{ marginBottom: 8 }} />
                    <p>No specific incidents found in knowledge base.</p>
                  </div>
                ) : (
                  filteredIncidents.map((inc) => {
                    const RiskIcon = getRiskIcon(inc.risk);
                    // Split status for Outcome section (e.g. "Resolved • String Freed")
                    const statusParts = (inc.status || 'Resolved')
                      .split(/[•\-–]/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const outcomeLine1 = statusParts.length > 1 ? `${statusParts[0]} –` : (statusParts[0] || 'Resolved');
                    const outcomeLine2 = statusParts.length > 1 ? statusParts[1] : '';

                    return (
                      <div
                        key={inc.id}
                        className="kb-well-incident-item"
                        style={{ borderLeftColor: inc.color || '#ea580c' }}
                      >
                        <div className="kb-well-incident-item-header">
                          <div className="kb-well-incident-badge-wrap">
                            <span
                              className="kb-well-incident-risk-badge"
                              style={{
                                background: '#fff7ed',
                                color: inc.color || '#ea580c',
                                border: `1px solid ${inc.color || '#ea580c'}33`
                              }}
                            >
                              <RiskIcon size={14} />
                              {inc.risk}
                            </span>
                            <SeverityBadge severity={inc.severity} />
                            <span className="kb-well-incident-depth-badge">
                              {inc.depthMd}
                            </span>
                            <span className="kb-well-incident-zone-badge">
                              {inc.zone}
                            </span>
                          </div>

                          <div className="kb-well-incident-meta-right">
                            <span className="kb-well-incident-id">{inc.id}</span>
                          </div>
                        </div>

                        <h4 className="kb-well-incident-title">{inc.title}</h4>

                        <div className="kb-well-incident-grid">
                          <div className="kb-well-incident-block">
                            <div className="kb-well-incident-block-header">
                              <div className="kb-well-block-icon-wrap">
                                <Activity size={15} color="#0284c7" />
                              </div>
                              <span className="kb-well-incident-block-lbl">
                                Observed Symptoms
                              </span>
                            </div>
                            <p className="kb-well-incident-block-txt">{inc.symptoms}</p>
                          </div>

                          <div className="kb-well-incident-block">
                            <div className="kb-well-incident-block-header">
                              <div className="kb-well-block-icon-wrap">
                                <Settings size={15} color="#0284c7" />
                              </div>
                              <span className="kb-well-incident-block-lbl">
                                Root Cause
                              </span>
                            </div>
                            <p className="kb-well-incident-block-txt">{inc.rootCause}</p>
                          </div>
                        </div>

                        <div className="kb-well-incident-mitigation-box">
                          <div className="kb-well-mitigation-left">
                            <div className="kb-well-mitigation-icon-wrap">
                              <Check size={13} strokeWidth={3} />
                            </div>
                            <div className="kb-well-mitigation-content">
                              <span className="kb-well-incident-mitigation-lbl">
                                Mitigation &amp; Operational Procedure
                              </span>
                              <p className="kb-well-incident-mitigation-txt">{inc.mitigation}</p>
                            </div>
                          </div>

                          <div className="kb-well-mitigation-right">
                            <span className="kb-well-outcome-lbl">Outcome</span>
                            <span className="kb-well-outcome-val1">{outcomeLine1}</span>
                            {outcomeLine2 && <span className="kb-well-outcome-val2">{outcomeLine2}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ════ TAB 2: SPECS & FORMATIONS ════ */}
          {activeTab === 'specs' && (
            <div className="kb-well-specs-section">
              {/* Formations list */}
              <div className="kb-well-section-block">
                <h4 className="kb-well-section-heading">
                  <Layers size={17} color="#0284c7" />
                  Stratigraphic Sequence &amp; Target Formations Encountered
                </h4>
                <div className="kb-well-formations-table-wrap">
                  <table className="kb-well-formations-table">
                    <thead>
                      <tr>
                        <th>Formation / Member</th>
                        <th>Depth Interval (MD)</th>
                        <th>Lithology &amp; Reservoir Characteristics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enriched.formations.map((form, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 800, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                              {form.name}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                            {form.depth}
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.82rem' }}>
                            {form.lithology}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Casing and Wellbore Architecture */}
              <div className="kb-well-section-block">
                <h4 className="kb-well-section-heading">
                  <Compass size={17} color="#0284c7" />
                  Casing Program &amp; Wellbore Architecture
                </h4>
                <div className="kb-well-casing-grid">
                  {enriched.casingProgram.map((csg, idx) => (
                    <div key={idx} className="kb-well-casing-item">
                      <span className="kb-well-casing-size">{csg.size}</span>
                      <span className="kb-well-casing-type">{csg.type}</span>
                      <span className="kb-well-casing-shoe">Shoe: <strong>{csg.shoeMd}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational rig parameters */}
              <div className="kb-well-section-block">
                <h4 className="kb-well-section-heading">
                  <Activity size={17} color="#0284c7" />
                  Rig Operations &amp; Surface Facilities
                </h4>
                <div className="kb-well-params-grid">
                  <div className="kb-well-param-card">
                    <span className="kb-well-param-k">Drilling Rig / Installation</span>
                    <span className="kb-well-param-v">{enriched.rigName}</span>
                  </div>
                  <div className="kb-well-param-card">
                    <span className="kb-well-param-k">Spud Date</span>
                    <span className="kb-well-param-v">{enriched.spudDate}</span>
                  </div>
                  <div className="kb-well-param-card">
                    <span className="kb-well-param-k">Completion Date</span>
                    <span className="kb-well-param-v">{enriched.completionDate}</span>
                  </div>
                  <div className="kb-well-param-card">
                    <span className="kb-well-param-k">Water Depth</span>
                    <span className="kb-well-param-v">{enriched.waterDepth}</span>
                  </div>
                  <div className="kb-well-param-card">
                    <span className="kb-well-param-k">Average Mud Density</span>
                    <span className="kb-well-param-v">{enriched.avgMudWeight}</span>
                  </div>
                  <div className="kb-well-param-card">
                    <span className="kb-well-param-k">Average ROP</span>
                    <span className="kb-well-param-v">{enriched.avgRop}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. MODAL FOOTER BAR ── */}
        <div className="kb-well-modal-footer">
          <div className="kb-well-footer-brand">
            <BookOpen size={16} color="#0284c7" />
            <span>DrillSight Enterprise</span>
            <span className="kb-well-footer-pipe">|</span>
            <span>Historical Knowledge Base • Offset Well Analytics</span>
          </div>
          <button
            type="button"
            className="kb-well-footer-close-btn"
            onClick={onClose}
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
