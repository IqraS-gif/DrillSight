import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, X, Filter, ArrowLeft, ArrowRight, BookOpen,
  FileText, ShieldAlert, AlertTriangle, Droplets, Flame,
  Zap, Layers, Compass, CheckCircle2, ChevronRight, ChevronDown,
  Printer, Download, ExternalLink, SlidersHorizontal,
  Sparkles, RefreshCw, Eye, MapPin, Activity, HelpCircle,
  BarChart3, Check, Crosshair, Cog
} from 'lucide-react';
import RAW_KB_BACKUP from '../data/knowledge_backup.json';
import WellDossierModal from './WellDossierModal';
import '../knowledge.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PDF_BASE = import.meta.env.VITE_PDF_BASE_URL || '/pdfs';

// ── Search matching helper with intelligent tokenization ──
function checkQueryMatch(query, searchSources) {
  if (!query || !query.trim()) return true;
  
  const raw = query.toLowerCase().trim();
  const text = searchSources.filter(Boolean).join(' ').toLowerCase();
  
  // 1. Literal full phrase match
  if (text.includes(raw)) return true;
  
  // 2. Token match: break into words (ignoring short stopwords)
  const stopWords = new Set(['for', 'the', 'and', 'with', 'in', 'of', 'to', 'a', 'an', 'at', 'by', 'on', 'is']);
  const tokens = raw.replace(/[^a-z0-9\s\/\-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !stopWords.has(t));
    
  if (tokens.length === 0) return true;
  
  // Return true if at least ONE meaningful token matches
  return tokens.some(tok => text.includes(tok));
}

// ── Category Metadata & Card Banner Helper (Image 1 Aesthetics) ──
function getCardCategoryMeta(category, categoryName) {
  const norm = (category || '').toLowerCase().replace(/[-\s]/g, '_');
  if (norm.includes('kick') || norm.includes('gas')) {
    return {
      bannerImg: '/card-banners/kick_influx.jpg',
      color: '#ea580c',
      textColor: '#ffffff',
      label: 'KICK & GAS INFLUX',
      Icon: Flame
    };
  }
  if (norm.includes('stuck') || norm.includes('pack') || norm.includes('pipe') || norm.includes('jam')) {
    return {
      bannerImg: '/card-banners/stuck_pipe.jpg',
      color: '#0284c7',
      textColor: '#ffffff',
      label: 'STUCK PIPE & HOLE PACK-OFF',
      Icon: Cog
    };
  }
  if (norm.includes('loss') || norm.includes('circ') || norm.includes('mud')) {
    return {
      bannerImg: '/card-banners/lost_circulation.jpg',
      color: '#eab308',
      textColor: '#0f172a',
      label: 'LOST CIRCULATION & MUD LOSSES',
      Icon: Droplets
    };
  }
  if (norm.includes('vibrat')) {
    return {
      bannerImg: '/card-banners/excessive_vibration.jpg',
      color: '#d97706',
      textColor: '#ffffff',
      label: 'EXCESSIVE BHA VIBRATION',
      Icon: Zap
    };
  }
  if (norm.includes('instab') || norm.includes('collapse') || norm.includes('breakout')) {
    return {
      bannerImg: '/card-banners/excessive_vibration.jpg',
      color: '#7c3aed',
      textColor: '#ffffff',
      label: 'WELLBORE INSTABILITY',
      Icon: ShieldAlert
    };
  }
  if (norm.includes('casing') || norm.includes('cement')) {
    return {
      bannerImg: '/card-banners/stuck_pipe.jpg',
      color: '#0d9488',
      textColor: '#ffffff',
      label: 'CASING & CEMENTING',
      Icon: Layers
    };
  }
  return {
    bannerImg: '/card-banners/default.jpg',
    color: '#0284c7',
    textColor: '#ffffff',
    label: (categoryName || category || 'TECHNICAL PROCEDURE').toUpperCase(),
    Icon: FileText
  };
}

// ── Transform actual backend MongoDB/backup KB item into rich Document structure ──
function transformBackendItemToDoc(item) {
  const steps = (item.mitigation_actions || []).map((action, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const words = action.split(' ');
    const shortTitle = words.slice(0, Math.min(4, words.length)).join(' ');
    const cleanTitle = shortTitle.charAt(0).toUpperCase() + shortTitle.slice(1);
    const detailText = item.operational_guidelines || item.root_causes?.[idx] || 'Refer to operational SOP for safety parameters and verification checklist.';
    return {
      num,
      title: cleanTitle,
      action: action,
      detail: detailText,
      sectionAnchor: `sec-action-${num}`
    };
  });

  const pdfSections = [
    {
      id: 'sec-overview',
      title: `1. Case Summary & Well Reference (${item.source_document || 'Research Literature'})`,
      text: `Operational field documentation from ${item.source_document || 'Technical Archive'}. Well Target: ${item.well_reference || 'Offset Well'}. Interval: ${item.depth_range?.start_m || 0}m - ${item.depth_range?.end_m || 0}m MD across ${item.formation || 'Target Zone'}. Incident Classification: ${item.title}.`
    },
    {
      id: 'sec-action-01',
      title: '2. Physical Symptoms & Early Rig Indicators (Step 01 Context)',
      text: (item.symptoms_early_indicators || []).map((s, i) => `• Physical Signature ${i + 1}: ${s}`).join('\n')
    },
    {
      id: 'sec-action-02',
      title: '3. Root Cause Analysis & Downhole Geomechanics (Step 02 Context)',
      text: (item.root_causes || []).map((c, i) => `• Root Mechanism ${i + 1}: ${c}`).join('\n')
    },
    {
      id: 'sec-action-03',
      title: '4. Applied Mitigation Protocol & Chemical Execution (Step 03 Context)',
      text: (item.mitigation_actions || []).map((m, i) => `• Action 0${i + 1}: ${m}`).join('\n')
    },
    {
      id: 'sec-action-04',
      title: '5. Mandatory Operational Guidelines & Prevention (Step 04 Context)',
      text: item.operational_guidelines || 'Maintain active telemetry monitoring and observe pressure thresholds prior to tripping or drilling resumption.'
    }
  ];

  const docCode = item.source_document
    ? item.source_document.replace(/\.pdf$/i, '').toUpperCase()
    : (item.item_id ? item.item_id.toUpperCase() : 'KB-DOC');

  let docType = 'Technical Procedure';
  if (item.source_document?.toLowerCase().includes('spe')) {
    docType = 'SPE Technical Paper';
  } else if (item.source_document?.toLowerCase().includes('fwr')) {
    docType = 'Final Well Report';
  }

  return {
    id: item.item_id || `kb-${item.category}-${Math.random().toString(36).substring(2, 7)}`,
    category: item.category,
    categoryName: item.category_name || item.category?.replace(/_/g, ' ')?.toUpperCase(),
    title: item.title,
    subtitle: `Literature from ${item.source_document || 'Field Database'} • ${item.well_reference}`,
    docType: docType,
    updatedYear: '2025',
    author: item.source_document?.toLowerCase().includes('captain')
      ? 'North Sea Operator Drilling Team'
      : (item.source_document?.toLowerCase().includes('spe') ? 'Society of Petroleum Engineers (SPE)' : 'Well Operations Advisory Group'),
    docCode: docCode,
    usedFor: (item.root_causes?.[0] ? `${item.root_causes[0]}. ` : '') + (item.mitigation_actions?.[0] || ''),
    severity: item.severity || 'high',
    formation: item.formation || 'Subsurface Sandstone',
    operation: 'Drilling Ahead',
    wellReference: item.well_reference || 'Field Incident',
    depthRange: item.depth_range || { start_m: 2000, end_m: 3500 },
    relevanceScore: item.severity === 'critical' ? 96 : (item.severity === 'high' ? 91 : 86),
    keywords: [
      ...(item.keywords || []),
      item.title,
      item.source_document || '',
      item.well_reference || '',
      item.formation || '',
      item.category_name || ''
    ],
    aiSummary: {
      executive: item.operational_guidelines || (item.root_causes || []).join('. '),
      keyActions: item.mitigation_actions || []
    },
    extractedSteps: steps,
    pdfSections: pdfSections,
    comparisonParams: [
      { param: 'Formation', docVal: item.formation || 'Target Interval', rigVal: 'Hugin Sandstone', status: item.formation?.toLowerCase().includes('sand') ? 'exact' : 'near' },
      { param: 'Depth (m)', docVal: `${item.depth_range?.start_m || 0} - ${item.depth_range?.end_m || 0} m`, rigVal: '4,200 m', status: 'near' },
      { param: 'Active Hazard', docVal: item.category_name || item.category, rigVal: 'Active Well Hazard', status: 'exact' },
      { param: 'Source Doc', docVal: item.source_document || 'Field Database', rigVal: 'Live Sensor Stream', status: 'exact' }
    ],
    sourceDocument: item.source_document || null,
    realPdfUrl: item.source_document ? `${PDF_BASE}/${encodeURIComponent(item.source_document)}` : null,
    hasSchematic: false,
    isFromBackendKB: true
  };
}

// ── Static Multi-Disciplinary Knowledge Corpus ────────────────────────────────
const CORPUS_DOCUMENTS = [
  {
    id: 'doc-lc-01',
    category: 'lost_circulation',
    categoryName: 'Lost Circulation',
    title: 'LCM Treatment Guidelines for Severe Circulation Loss',
    subtitle: 'Technical Procedure & Fracture Sealing Protocol in Depleted Reservoirs',
    docType: 'Technical Procedure',
    updatedYear: '2025',
    author: 'Equinor & Shell Well Integrity Advisory Board',
    docCode: 'SOP-LC-2025-04',
    usedFor: 'Severe circulation loss, total dynamic losses > 50 bbl/hr into depleted sands',
    severity: 'critical',
    formation: 'Hugin Sandstone',
    operation: 'Drilling Ahead',
    wellReference: '15/9-F-12 (Volve Area)',
    depthRange: { start_m: 3780, end_m: 3825 },
    relevanceScore: 94,
    hasSchematic: false,
    isFromBackendKB: false,
    sourceDocument: 'Oil & Gas Field Operations SOPs Guide _ WorkProcedures.pdf',
    realPdfUrl: `${PDF_BASE}/Oil%20%26%20Gas%20Field%20Operations%20SOPs%20Guide%20_%20WorkProcedures.pdf`,
    keywords: [
      'lost circulation', 'lcm', 'lcm treatment', 'circulation loss', 'dynamic losses',
      'mud loss', 'pill', 'calcium carbonate', 'depleted', 'hugin sandstone', 'severe circulation loss',
      'fracture sealing', 'stress cage', 'hesitation squeeze'
    ],
    aiSummary: {
      executive: 'Standardized operational procedure for dynamic mud loss arrest during reservoir boundary entry. Outlines instant pump throttling to minimize annular ECD, followed by multimodal sized CaCO3 pill placement with staged hesitation squeezing.',
      keyActions: [
        'Reduce pump rate immediately from 650 gpm to 420 gpm to lower ECD',
        'Select sized LCM blend (coarse/medium/fine CaCO3 + resilient flakes)',
        'Spot 45 bbl high-viscosity LCM pill across thief interval',
        'Hesitation squeeze at 150-200 psi surface pressure for 45 minutes',
        'Conduct 20-minute static flow check before staged flow resumption'
      ]
    },
    extractedSteps: [
      {
        num: '01',
        title: 'Reduce pump rate',
        action: 'Throttle mud pumps from 650 gpm to 420-450 gpm immediately upon detecting pit drop.',
        detail: 'Reduces dynamic annular friction and lowers Equivalent Circulating Density (ECD) by ~0.06 SG, preventing further hydraulic fracture propagation.',
        sectionAnchor: 'sec-rate'
      },
      {
        num: '02',
        title: 'Prepare LCM treatment',
        action: 'Mix 45 bbl engineered pill in slug pit with graded calcium carbonate particulates.',
        detail: 'Blend 25 ppb coarse CaCO3 (300-600 µm), 15 ppb medium (75-150 µm), and 5 ppb fine flakes. Viscosify with biopolymer to funnel viscosity > 85 sec/qt.',
        sectionAnchor: 'sec-prep'
      },
      {
        num: '03',
        title: 'Spot LCM pill across zone',
        action: 'Pump pill to bit nozzle at 250 gpm and position 35 bbl across loss zone.',
        detail: 'Leave 10 bbl inside drillpipe to balance U-tubing effect. Pull bit 15m off bottom to avoid embedding nozzles in particulate filter cake.',
        sectionAnchor: 'sec-spot'
      },
      {
        num: '04',
        title: 'Monitor returns',
        action: 'Close annular preventer and conduct 150-200 psi hesitation squeeze.',
        detail: 'Apply 150 psi surface pressure in 10-minute hold intervals. Monitor trip tank return volume. Once leak-off rate is < 2 bbl/hr, treat zone as cured.',
        sectionAnchor: 'sec-returns'
      }
    ],
    pdfSections: [
      {
        id: 'sec-overview',
        title: '1. Incident Classification & Lithological Context',
        text: 'During 12-1/4" drilling through the Upper Jurassic Hugin Formation (3,780m - 3,825m MD), catastrophic active mud losses of 85 bbl/hr were initiated upon crossing a sub-seismic fault boundary. The Hugin interval consists of medium-to-coarse grained permeable sandstone with localized pore pressure depletion (down to 1.14 SG EMW) against a hydrostatic mud column of 1.25 SG.'
      },
      {
        id: 'sec-rate',
        title: '2. Hydraulic Rate Throttling & ECD Management (Step 01)',
        text: 'Immediately upon audible pit loss alarm, throttle mud pump strokes from 110 SPM (650 gpm) down to 70 SPM (420 gpm). Standpipe pressure will drop by ~180-220 psi. Annular friction pressure declines proportionally, lowering effective downhole pressure below the depleted tensile fracture breakdown limit. Rotate drillstring at 20-30 RPM to avoid differential sticking during flow reduction.'
      },
      {
        id: 'sec-prep',
        title: '3. Particulate Size Distribution (PSD) Formulation (Step 02)',
        text: 'Mix 45 bbl LCM pill in slug pit with the following formulation: 25 ppb Coarse CaCO3 (D50=400µm), 15 ppb Medium CaCO3 (D50=120µm), 8 ppb Fine CaCO3 (<44µm), and 4 ppb resilient synthetic fiber flakes. Base fluid: Synthetic Oil Based Mud (SOBM) treated with wetting agents. Target plastic viscosity: 32 cP, yield point: 26 lb/100ft². Particle size distribution verified against Ideal Packing Theory (D50^0.5).'
      },
      {
        id: 'sec-spot',
        title: '4. Pill Displacement & Placement Across Loss Zone (Step 03)',
        text: 'Displace pill at controlled rate (250 gpm) through bit nozzles (minimum 14/32" nozzles required). Place 35 bbl pill volume across open-hole permeable sandstone, retaining 10 bbl in drillstring/annulus to counteract U-tube differential. Pull bit off bottom by 15 meters to prevent bit nozzle plugging during particulate settling.'
      },
      {
        id: 'sec-returns',
        title: '5. Hesitation Squeeze & Return Verification (Step 04)',
        text: 'Close annular blowout preventer (BOP) with low closing pressure. Connect rig pumps through kill line and apply 150 psi surface pressure. Hesitate for 10 minutes. Observe pressure bleed-off rate. If pressure drops below 50 psi, pump additional 2 bbl pill volume and repressurize to 200 psi. Repeat for 3 cycles until pressure stabilizes. Bleed off pressure, open annular BOP, and conduct 20-minute static flow check on trip tank. If loss rate is under 2 bbl/hr, proceed with staged circulation resumption.'
      }
    ],
    comparisonParams: [
      { param: 'Formation', docVal: 'Hugin Sandstone', rigVal: 'Hugin Sandstone', status: 'exact' },
      { param: 'Depth (m)', docVal: '3,780 - 3,825 m', rigVal: '4,200 m', status: 'near' },
      { param: 'Active Risk', docVal: 'Lost Circulation', rigVal: 'Lost Circulation', status: 'exact' },
      { param: 'Mud Weight (SG)', docVal: '1.20 - 1.25 SG', rigVal: '1.20 SG', status: 'exact' },
      { param: 'Pump Rate (gpm)', docVal: '420 gpm (Target)', rigVal: '650 gpm (Excess)', status: 'divergent' },
      { param: 'SPP (psi)', docVal: '400 - 650 psi', rigVal: '400 psi (Loss drop)', status: 'exact' }
    ]
  },
  {
    id: 'doc-sp-01',
    category: 'stuck_pipe',
    categoryName: 'Stuck Pipe',
    title: 'Differential Sticking Remediation & Pipe-Release Pill SOP',
    subtitle: 'Offshore Rig Standard for Overpull Thresholds & Downward Jarring',
    docType: 'Technical Procedure',
    updatedYear: '2025',
    author: 'North Sea Drilling Operations Advisory Group',
    docCode: 'SOP-SP-2025-02',
    usedFor: 'Differential pressure sticking in depleted sandstone during static survey',
    severity: 'high',
    formation: 'Captain Sandstone',
    operation: 'Surveying',
    wellReference: 'Captain Cook-1 (North Sea)',
    depthRange: { start_m: 3740, end_m: 3810 },
    relevanceScore: 89,
    keywords: [
      'stuck pipe', 'differential sticking', 'captain sand', 'captain sandstone',
      'pipe release pill', 'jarring', 'overbalance', 'filter cake', 'overpull', 'soak'
    ],
    aiSummary: {
      executive: 'Action plan for pipe release when drillstring becomes stationary in depleted high-perm sand. Mandates rapid downward jarring within 15 minutes, application of torque, and placement of glycol/surfactant soaking pills.',
      keyActions: [
        'Do NOT pull to maximum rig tensile limit — locks pipe deeper into filter cake',
        'Jar downwards immediately with 60-80 klbs force',
        'Spot 50 bbl pipe release surfactant pill across stuck BHA',
        'Soak for 3-4 hours with intermittent torque work'
      ]
    },
    extractedSteps: [
      {
        num: '01',
        title: 'Halt upward pulling & lock torque',
        action: 'Slacken drillstring to neutral weight point and hold left-hand or right-hand torque.',
        detail: 'Excessive overpull (>80 klbs) wedges the drillstring tighter into the filter cake.',
        sectionAnchor: 'sec-sp-pull'
      },
      {
        num: '02',
        title: 'Activate hydraulic jars downward',
        action: 'Trip hydraulic jars downward with 60-80 klbs impact force.',
        detail: 'Downward impact utilizes drill collar gravitational momentum to break mechanical wall friction.',
        sectionAnchor: 'sec-sp-jar'
      },
      {
        num: '03',
        title: 'Spot pipe-release pill',
        action: 'Spot 50 bbl surfactant/glycol pipe-release pill across stuck interval.',
        detail: 'Displace pill around BHA. Wetting agents shrink filter cake thickness by 60% within 90 minutes.',
        sectionAnchor: 'sec-sp-pill'
      },
      {
        num: '04',
        title: 'Soak & resume rotation',
        action: 'Allow 3 hours soak time with intermittent jarring every 20 minutes.',
        detail: 'Once pipe frees, circulate hole clean at maximum allowable rate before picking off bottom.',
        sectionAnchor: 'sec-sp-soak'
      }
    ],
    pdfSections: [
      {
        id: 'sec-sp-pull',
        title: '1. Differential Pressure Mechanism & Initial Response',
        text: 'Differential sticking occurs when hydrostatic pressure significantly exceeds formation pressure across permeable rock. When stationary during gyro survey recording, filter cake dehydration creates a seal. Do not exceed 80% of string tensile yield.'
      },
      {
        id: 'sec-sp-jar',
        title: '2. Jarring Assembly Activation (Step 01-02)',
        text: 'Downward jarring is 4x more effective than upward jarring for differential sticking. Slack off string weight until jars fire downward with 70 klbs impulse. Repeat 10-15 cycles while maintaining circulation.'
      },
      {
        id: 'sec-sp-pill',
        title: '3. Pipe-Release Chemical Pill Placement (Step 03)',
        text: 'Mix 50 bbl of low-toxicity oil/ester soaking fluid containing 12% non-ionic surfactants. Pump through bit at 150 gpm and spot across collar section. Allow hydrostatic reduction of 0.04 SG across the stuck interval.'
      },
      {
        id: 'sec-sp-soak',
        title: '4. Freeing Verification & Backreaming Protocol (Step 04)',
        text: 'Work string with alternating torque (12-16 kft-lbs). Once axial movement is detected, pick up slowly and circulate 2 bottoms-up cycles to eliminate pill residue from active mud system.'
      }
    ],
    comparisonParams: [
      { param: 'Formation', docVal: 'Captain Sandstone', rigVal: 'Hugin Sandstone', status: 'near' },
      { param: 'Depth (m)', docVal: '3,740 - 3,810 m', rigVal: '4,200 m', status: 'near' },
      { param: 'Active Risk', docVal: 'Stuck Pipe', rigVal: 'Stuck Pipe', status: 'exact' },
      { param: 'Hookload', docVal: '280 klbs (Overpull)', rigVal: '270 klbs', status: 'exact' },
      { param: 'Mud Weight', docVal: '1.28 SG (Overbalance)', rigVal: '1.15 SG', status: 'near' }
    ]
  },
  {
    id: 'doc-kick-01',
    category: 'kick_influx',
    categoryName: 'Kick & Gas Influx',
    title: 'Drillers & Wait-and-Weight Well Control Playbook',
    subtitle: 'High Pressure Gas Influx Response & Kill Sheet Procedures',
    docType: 'Emergency Action Plan',
    updatedYear: '2024',
    author: 'IADC Well Control Technical Committee',
    docCode: 'EAP-WC-2024-01',
    usedFor: 'Abnormal formation pressure kick, pit gain > 10 bbl, gas influx',
    severity: 'critical',
    formation: 'Sleipner Formation',
    operation: 'Drilling Ahead',
    wellReference: '15/9-F-14 (Volve Area)',
    depthRange: { start_m: 4100, end_m: 4250 },
    relevanceScore: 96,
    keywords: [
      'kick', 'gas influx', 'kill sheet', 'well control', 'shut in', 'drillers method',
      'wait and weight', 'sidpp', 'sicp', 'kmw', 'gas reading', 'sleipner', 'influx'
    ],
    aiSummary: {
      executive: 'Emergency well shut-in protocol and two-circulation kill procedures for influx containment. Highlights immediate soft shut-in via annular BOP, stabilization of SIDPP/SICP, and calculation of Kill Mud Weight (KMW).',
      keyActions: [
        'Space out drillstring, shut down mud pumps, and perform soft shut-in',
        'Record stabilized SIDPP and SICP after 10-15 minutes',
        'Calculate Kill Mud Weight (KMW = OMW + SIDPP / (0.052 * TVD))',
        'Circulate influx out using choke manifold maintaining constant bottomhole pressure'
      ]
    },
    extractedSteps: [
      {
        num: '01',
        title: 'Hard / Soft Shut-In execution',
        action: 'Space out tool joints, stop pumps, open choke line, and close annular preventer.',
        detail: 'Stops further gas influx into the wellbore and isolates wellhead pressure.',
        sectionAnchor: 'sec-wc-shut'
      },
      {
        num: '02',
        title: 'Record stabilized pressures',
        action: 'Monitor and log SIDPP, SICP, and pit gain every minute until pressures plateau.',
        detail: 'SIDPP indicates underbalance margin; SICP indicates influx height and type (gas vs water).',
        sectionAnchor: 'sec-wc-press'
      },
      {
        num: '03',
        title: 'Calculate Kill Mud Weight (KMW)',
        action: 'Compute KMW = Current MW + (SIDPP / (0.00981 * TVD_m)).',
        detail: 'Mix weighted brine/barite in mud pits to reach exact hydrostatic balance margin.',
        sectionAnchor: 'sec-wc-kmw'
      },
      {
        num: '04',
        title: 'Circulate influx out via choke',
        action: 'Bring pump to kill rate (30-40 SPM) while holding drillpipe pressure constant.',
        detail: 'Displace gas bubble safely past BOP and mud gas separator without exceeding shoe casing burst rating.',
        sectionAnchor: 'sec-wc-circ'
      }
    ],
    pdfSections: [
      {
        id: 'sec-wc-shut',
        title: '1. Immediate Shut-In Procedure (Step 01)',
        text: 'Upon detection of positive flow check or pit gain > 5 bbl: 1. Stop rotary and pick up off bottom until tool joint is clear of BOP. 2. Stop mud pumps. 3. Open HCR choke valve. 4. Close annular BOP. 5. Close hydraulic choke. 6. Notify toolpusher and drilling superintendent.'
      },
      {
        id: 'sec-wc-press',
        title: '2. Pressure Stabilization & Gas Migration Tracking (Step 02)',
        text: 'Wait 10-15 minutes for pressure stabilization. If SIDPP and SICP rise continuously at identical rate, gas migration is occurring. Bleed small volume via choke to maintain constant drillpipe pressure.'
      },
      {
        id: 'sec-wc-kmw',
        title: '3. Kill Sheet Formulation & Weight-Up (Step 03)',
        text: 'Formula: KMW (SG) = OMW + (SIDPP [bar] / (0.0981 * TVD [m])). Add 0.02 SG trip margin. Mix barite continuously into active pits with jet hopper.'
      },
      {
        id: 'sec-wc-circ',
        title: '4. First Circulation (Drillers Method) Execution (Step 04)',
        text: 'Maintain constant pump strokes (35 SPM). Regulate choke to hold initial circulating pressure (ICP = SIDPP + SCRP). Vent separated gas through derrick flare line and monitor gas chromatograph.'
      }
    ],
    comparisonParams: [
      { param: 'Formation', docVal: 'Sleipner Formation', rigVal: 'Sleipner Formation', status: 'exact' },
      { param: 'Depth (m)', docVal: '4,100 - 4,250 m', rigVal: '4,200 m', status: 'exact' },
      { param: 'Active Risk', docVal: 'Kick / Gas Influx', rigVal: 'Kick / Gas Influx', status: 'exact' },
      { param: 'Gas Reading (%)', docVal: '18 - 25% High Gas', rigVal: '18.5%', status: 'exact' },
      { param: 'Mud Weight', docVal: '0.98 SG (Underbalanced)', rigVal: '0.98 SG', status: 'exact' }
    ]
  },
  {
    id: 'doc-vib-01',
    category: 'excessive_vibration',
    categoryName: 'BHA Vibration',
    title: 'BHA Stick-Slip & Resonance Vibration Mitigation Protocol',
    subtitle: 'Dynamic Parameter Tuning & MWD Shock Management',
    docType: 'SPE Technical Paper',
    updatedYear: '2024',
    author: 'SPE Drilling & Completion Journal (SPE-184920-MS)',
    docCode: 'SPE-184920-MS',
    usedFor: 'Torsional stick-slip oscillation, lateral bit whirl, MWD axial shock > 50g',
    severity: 'medium',
    formation: 'Hod Chalk Member',
    operation: 'Drilling Ahead',
    wellReference: '15/9-F-11 B (Volve Area)',
    depthRange: { start_m: 2600, end_m: 2850 },
    relevanceScore: 82,
    keywords: [
      'bha vibration', 'stick slip', 'stick-slip', 'resonance', 'mwd shock', 'bit whirl',
      'soft torque', 'rpm', 'wob', 'hod chalk', 'vibration', 'torsional'
    ],
    aiSummary: {
      executive: 'Comprehensive empirical analysis on mitigating high-frequency torsional stick-slip and bit whirl in hard interbedded formations. Recommends increasing RPM out of harmonic resonance, tuning WOB down, and using automated soft torque rotary systems.',
      keyActions: [
        'Increase surface RPM from 80 to 120-140 RPM to escape stick-slip resonance',
        'Back off Weight on Bit (WOB) by 25-30% to reduce bit tooth depth of cut',
        'Activate Soft Torque Rotary System (STRS) damping algorithm on top drive',
        'Inspect MWD telemetry shock sensors every stand to prevent tool fatigue failure'
      ]
    },
    extractedSteps: [
      {
        num: '01',
        title: 'Detect harmonic stick-slip signature',
        action: 'Monitor surface torque variance (>30% swing) and downhole MWD shock spikes.',
        detail: 'Torque cycling between zero and 28 kft-lbs indicates bit stalling followed by explosive spring unwinding.',
        sectionAnchor: 'sec-vib-detect'
      },
      {
        num: '02',
        title: 'Elevate rotary speed (RPM)',
        action: 'Increase top drive RPM from 80 to 125-140 RPM.',
        detail: 'Higher rotational speed increases string kinetic momentum, overcoming static rock-cutter friction.',
        sectionAnchor: 'sec-vib-rpm'
      },
      {
        num: '03',
        title: 'Reduce Weight on Bit (WOB)',
        action: 'Back off WOB from 60 klbs to 35-40 klbs.',
        detail: 'Reduces cutter aggressiveness in dense limestone, smoothing depth-of-cut variations.',
        sectionAnchor: 'sec-vib-wob'
      },
      {
        num: '04',
        title: 'Engage Soft Torque damping',
        action: 'Engage electronic drive feedback damping to neutralize torsional reflection waves.',
        detail: 'Maintains steady bit rotation and protects downhole steering electronics.',
        sectionAnchor: 'sec-vib-soft'
      }
    ],
    pdfSections: [
      {
        id: 'sec-vib-detect',
        title: '1. Harmonic Resonance & Telemetry Signatures',
        text: 'Stick-slip is a self-excited torsional vibration where bit RPM drops to 0 while top drive rotates continuously. When torque builds to shear rock, bit accelerates up to 3x surface RPM, generating destructive high-g impact waves.'
      },
      {
        id: 'sec-vib-rpm',
        title: '2. Rotational Speed Tuning Map (Step 02)',
        text: 'Avoid the 65-85 RPM resonant corridor. Operating at 120-140 RPM shifts fundamental torsional mode above the natural harmonic frequency of 4,000m 5-inch drillpipe.'
      },
      {
        id: 'sec-vib-wob',
        title: '3. Weight-on-Bit Optimization (Step 03)',
        text: 'Depth of cut (DOC) is proportional to WOB / RPM. Decreasing WOB diminishes cutter indentation force, preventing cutter hang-up on chert nodules.'
      },
      {
        id: 'sec-vib-soft',
        title: '4. Surface Drive Damping & Tool Protection (Step 04)',
        text: 'Modern VFD top drives equipped with Soft Torque modulate motor speed in anti-phase with torque feedback, absorbing up to 85% of torsional bounce energy.'
      }
    ],
    comparisonParams: [
      { param: 'Formation', docVal: 'Hod Chalk Member', rigVal: 'Hod Chalk Member', status: 'exact' },
      { param: 'Depth (m)', docVal: '2,600 - 2,850 m', rigVal: '2,700 m', status: 'exact' },
      { param: 'Active Risk', docVal: 'Excessive Vibration', rigVal: 'Excessive Vibration', status: 'exact' },
      { param: 'Shock (g)', docVal: '> 100g Peak Shock', rigVal: '120g Peak', status: 'exact' },
      { param: 'RPM', docVal: '120 - 140 RPM (Target)', rigVal: '80 RPM (Vibrating)', status: 'divergent' }
    ]
  },
  {
    id: 'doc-wi-01',
    category: 'wellbore_instability',
    categoryName: 'Wellbore Instability',
    title: 'Reactive Shale Sloughing & Inhibitive Polyamine Treatment',
    subtitle: 'Chemical Stabilization & Tight Hole Remediation in Draupne Shales',
    docType: 'Technical Procedure',
    updatedYear: '2024',
    author: 'Equinor Geomechanics Center of Excellence',
    docCode: 'SOP-WI-2024-07',
    usedFor: 'Tight hole, splintery cavings at shale shakers, pack-off risk',
    severity: 'high',
    formation: 'Draupne Shale',
    operation: 'Drilling Ahead',
    wellReference: '15/9-F-1 C (Volve Area)',
    depthRange: { start_m: 3200, end_m: 3550 },
    relevanceScore: 78,
    keywords: [
      'wellbore instability', 'reactive shale', 'sloughing', 'draupne shale',
      'tight hole', 'cavings', 'polyamine', 'kcl', 'clay swelling', 'shale shakers'
    ],
    aiSummary: {
      executive: 'Guidelines for managing reactive smectite-illite shale hydration in deep North Sea formations. Focuses on potassium ion concentration management, polyamine clay inhibitors, and mud weight window adjustments.',
      keyActions: [
        'Collect and inspect shale cavings at shakers (splintery vs tabular shapes)',
        'Maintain minimum 35 ppb KCl concentration in active water-based mud',
        'Add 2.5% volume polyamine clay swelling inhibitor',
        'Increase mud density by 0.04 SG to provide mechanical hoop stress support'
      ]
    },
    extractedSteps: [
      {
        num: '01',
        title: 'Cavings shape analysis',
        action: 'Analyze shaker cavings: angular splintery cavings indicate geomechanical stress failure.',
        detail: 'Helps distinguish between chemical swelling and underbalanced mechanical collapse.',
        sectionAnchor: 'sec-wi-cavings'
      },
      {
        num: '02',
        title: 'Treat mud with KCl & polyamines',
        action: 'Dose active mud system with KCl (35 ppb) and 2.5% liquid polyamine.',
        detail: 'Potassium ions exchange into clay interlayers, preventing osmotic water uptake and swelling.',
        sectionAnchor: 'sec-wi-chem'
      },
      {
        num: '03',
        title: 'Optimize mud weight',
        action: 'Raise mud weight by 0.04 SG to strengthen wellbore borehole hoop stress.',
        detail: 'Mechanical hydrostatic support counteracts tectonic horizontal shear stresses.',
        sectionAnchor: 'sec-wi-mw'
      },
      {
        num: '04',
        title: 'Wiper trip & reaming speed',
        action: 'Conduct controlled backreaming at < 15 m/hr with maximum flow rate.',
        detail: 'Removes dislodged cavings beds without causing hydraulic swab/surge pressure surges.',
        sectionAnchor: 'sec-wi-ream'
      }
    ],
    pdfSections: [
      {
        id: 'sec-wi-cavings',
        title: '1. Shale Cavings Morphology & Geomechanical Diagnostics',
        text: 'The Draupne formation contains up to 45% reactive mixed-layer clays. Overpressure and low tensile strength make it susceptible to mechanical breakdown when mud density is insufficient to support radial stress.'
      },
      {
        id: 'sec-wi-chem',
        title: '2. Chemical Clay Inhibition Protocol (Step 02)',
        text: 'Maintain active K+ ion concentration > 25,000 ppm. Polyamines form a resilient protective coating on the wellbore wall, preventing water invasion into micro-fractures.'
      },
      {
        id: 'sec-wi-mw',
        title: '3. Mud Weight Window Calculation (Step 03)',
        text: 'Raise mud weight from 1.22 to 1.26 SG. Ensure Equivalent Circulating Density does not exceed formation fracture gradient (1.36 SG).'
      },
      {
        id: 'sec-wi-ream',
        title: '4. Tripping & Backreaming Limits (Step 04)',
        text: 'Limit tripping speed to 1 stand per 2 minutes to minimize surge and swab pressures. Maintain continuous circulation when backreaming through tight spots.'
      }
    ],
    comparisonParams: [
      { param: 'Formation', docVal: 'Draupne Shale', rigVal: 'Draupne Shale', status: 'exact' },
      { param: 'Depth (m)', docVal: '3,200 - 3,550 m', rigVal: '3,300 m', status: 'near' },
      { param: 'Active Risk', docVal: 'Wellbore Instability', rigVal: 'Wellbore Instability', status: 'exact' },
      { param: 'Mud Weight', docVal: '1.26 SG (Target)', rigVal: '1.21 SG', status: 'divergent' }
    ]
  },
  {
    id: 'doc-fwr-12',
    category: 'lost_circulation',
    categoryName: 'Well Reports',
    title: 'Volve Well 15/9-F-12 Final Well Report (FWR) — Drilling Hazards',
    subtitle: 'Official Equinor North Sea Operator Incident Record & Offset Telemetry',
    docType: 'Final Well Report',
    updatedYear: '2024',
    author: 'Statoil / Equinor ASA Volve Development Team',
    docCode: 'FWR-VOLVE-15-9-F12',
    usedFor: 'Historical well review, high mud loss mitigation in Hugin sandstone',
    severity: 'high',
    formation: 'Hugin Sandstone',
    operation: 'Drilling Ahead',
    wellReference: '15/9-F-12 (Volve Field)',
    depthRange: { start_m: 3750, end_m: 3880 },
    relevanceScore: 92,
    keywords: [
      'volve', 'well 15/9-f-12', '15/9-f-12', 'final well report', 'fwr', 'lost circulation',
      'lcm', 'lcm treatment', 'hugin sandstone', 'drilling hazards', 'mud loss'
    ],
    aiSummary: {
      executive: 'Comprehensive operational review of Well 15/9-F-12 drilled in the Norwegian North Sea. Documents multiple loss zones encountered in the Hugin formation, rapid LCM pill deployment, and post-incident drilling parameter optimization.',
      keyActions: [
        'Pre-treat active system with 12 ppb CaCO3 prior to Hugin formation top',
        'Keep 150 bbl heavy LCM pill pre-mixed on rig during reservoir penetration',
        'Use PWD (Pressure While Drilling) tools to continuously monitor real-time downhole ECD',
        'Cap pump rates at 500 gpm in depleted zones to maintain ECD margin'
      ]
    },
    extractedSteps: [
      {
        num: '01',
        title: 'Pre-treat active fluid system',
        action: 'Add 12 ppb sized bridging particulates prior to reaching sandstone reservoir.',
        detail: 'Builds continuous low-permeability cake on rock face before micro-fractures propagate.',
        sectionAnchor: 'sec-fwr-pretreat'
      },
      {
        num: '02',
        title: 'Real-time ECD surveillance',
        action: 'Monitor downhole PWD sensor to prevent ECD exceeding 1.25 SG.',
        detail: 'Real-time telemetry provides immediate warning if cuttings build-up increases annular pressure.',
        sectionAnchor: 'sec-fwr-ecd'
      },
      {
        num: '03',
        title: 'Rapid LCM pill spot',
        action: 'Deploy pre-mixed 40 bbl pill immediately upon 20 bbl pit loss.',
        detail: 'Contained losses in 3.5 hours compared to 24 hours on earlier sister wells.',
        sectionAnchor: 'sec-fwr-pill'
      },
      {
        num: '04',
        title: 'Post-job flow test',
        action: 'Conduct 30-minute staged flow test at 300, 400, and 500 gpm.',
        detail: 'Confirms fracture seal durability under varying dynamic pressure conditions.',
        sectionAnchor: 'sec-fwr-test'
      }
    ],
    pdfSections: [
      {
        id: 'sec-fwr-pretreat',
        title: '1. Executive Summary & Well Trajectory',
        text: 'Well 15/9-F-12 was drilled as a multilateral production well targeting the Hugin and Skagerrak formations. At 3,792 m MD, mud losses occurred due to localized depletion from producer well F-14.'
      },
      {
        id: 'sec-fwr-ecd',
        title: '2. Loss Zone Occurrence & Real-Time Telemetry',
        text: 'Pit volume sensors detected 65 bbl total loss over 45 minutes. Standpipe pressure decreased by 160 psi while pump strokes were steady at 105 SPM.'
      },
      {
        id: 'sec-fwr-pill',
        title: '3. Mitigation Deployment & Chemical Recipe',
        text: 'A 45 bbl LCM pill containing coarse nut plug and graded calcium carbonate was spotted across 3,770 - 3,810 m. Hesitation squeeze resulted in 100% loss arrest.'
      },
      {
        id: 'sec-fwr-test',
        title: '4. Lessons Learned for Offset Wells',
        text: 'Maintain pre-treated drilling fluid in all subsequent wells in Section 15/9. Restrict ROP to < 20 m/hr when entering depleted fault blocks to prevent surge pressure.'
      }
    ],
    comparisonParams: [
      { param: 'Formation', docVal: 'Hugin Sandstone', rigVal: 'Hugin Sandstone', status: 'exact' },
      { param: 'Depth (m)', docVal: '3,750 - 3,880 m', rigVal: '4,200 m', status: 'near' },
      { param: 'Active Risk', docVal: 'Lost Circulation', rigVal: 'Lost Circulation', status: 'exact' },
      { param: 'Field / Area', docVal: 'Volve, North Sea', rigVal: 'Volve, North Sea', status: 'exact' }
    ]
  }
];

// ── Historical Wells Corpus (For Wells Tab) ───────────────────────────────────
const CORPUS_WELLS = [
  {
    id: 'well-f12',
    name: '15/9-F-12',
    operator: 'Equinor ASA',
    field: 'Volve Field (Block 15/9, North Sea)',
    coords: '58.441° N, 1.884° E',
    totalDepth: '3,880 m MD',
    formations: ['Hugin', 'Skagerrak', 'Sleipner', 'Hod'],
    incidents: [
      { risk: 'Lost Circulation', count: 3, color: '#ea580c' },
      { risk: 'Stuck Pipe', count: 2, color: '#ef4444' },
      { risk: 'BHA Vibration', count: 4, color: '#f59e0b' }
    ],
    totalIncidents: 9,
    avgMudWeight: '1.22 SG',
    avgRop: '18.4 m/hr',
    relatedDocs: ['doc-lc-01', 'doc-fwr-12']
  },
  {
    id: 'well-f14',
    name: '15/9-F-14',
    operator: 'Equinor ASA',
    field: 'Volve Field (Block 15/9, North Sea)',
    coords: '58.448° N, 1.892° E',
    totalDepth: '4,250 m MD',
    formations: ['Sleipner', 'Hugin', 'Draupne', 'Heather'],
    incidents: [
      { risk: 'Kick & Gas Influx', count: 4, color: '#dc2626' },
      { risk: 'Stuck Pipe', count: 3, color: '#ef4444' },
      { risk: 'Lost Circulation', count: 2, color: '#ea580c' }
    ],
    totalIncidents: 9,
    avgMudWeight: '1.18 SG',
    avgRop: '22.1 m/hr',
    relatedDocs: ['doc-kick-01', 'doc-sp-01']
  },
  {
    id: 'well-f15a',
    name: '15/9-F-15 A',
    operator: 'Equinor ASA',
    field: 'Volve Field (Block 15/9, North Sea)',
    coords: '58.435° N, 1.876° E',
    totalDepth: '3,950 m MD',
    formations: ['Hugin', 'Skagerrak', 'Draupne'],
    incidents: [
      { risk: 'Lost Circulation', count: 4, color: '#ea580c' },
      { risk: 'Wellbore Instability', count: 3, color: '#8b5cf6' },
      { risk: 'BHA Vibration', count: 2, color: '#f59e0b' }
    ],
    totalIncidents: 9,
    avgMudWeight: '1.24 SG',
    avgRop: '16.8 m/hr',
    relatedDocs: ['doc-lc-01', 'doc-wi-01']
  },
  {
    id: 'well-f11b',
    name: '15/9-F-11 B',
    operator: 'Equinor ASA',
    field: 'Volve Field (Block 15/9, North Sea)',
    coords: '58.452° N, 1.905° E',
    totalDepth: '3,420 m MD',
    formations: ['Hod Chalk', 'Sleipner', 'Hugin'],
    incidents: [
      { risk: 'BHA Vibration', count: 5, color: '#f59e0b' },
      { risk: 'Stuck Pipe', count: 2, color: '#ef4444' },
      { risk: 'Lost Circulation', count: 1, color: '#ea580c' }
    ],
    totalIncidents: 8,
    avgMudWeight: '1.20 SG',
    avgRop: '24.5 m/hr',
    relatedDocs: ['doc-vib-01']
  },
  {
    id: 'well-capt',
    name: 'Captain Cook-1',
    operator: 'Shell / Conoco',
    field: 'Offshore UK / North Sea',
    coords: '58.210° N, 1.450° E',
    totalDepth: '4,100 m MD',
    formations: ['Captain Sandstone', 'Chalk Member', 'Jurassic Shale'],
    incidents: [
      { risk: 'Stuck Pipe (Differential)', count: 4, color: '#ef4444' },
      { risk: 'Lost Circulation', count: 3, color: '#ea580c' },
      { risk: 'Mechanical Pack-off', count: 3, color: '#ef4444' }
    ],
    totalIncidents: 10,
    avgMudWeight: '1.26 SG',
    avgRop: '19.2 m/hr',
    relatedDocs: ['doc-sp-01', 'doc-lc-01']
  }
];

// ── Risks Corpus (For Risks Tab) ──────────────────────────────────────────────
const CORPUS_RISKS = [
  {
    id: 'risk-lc',
    categoryKey: 'lost_circulation',
    name: 'Lost Circulation & Dynamic Mud Losses',
    icon: Droplets,
    color: '#ea580c',
    severity: 'Critical / High',
    description: 'Loss of drilling fluid into natural fractures, depleted sands, or induced fractures, reducing hydrostatic head and risking kicks.',
    symptoms: ['Active pit level drop', 'SPP decline', 'Return flow paddle reduction < 100%'],
    rootCauses: ['Pore pressure depletion in offset blocks', 'ECD exceeding formation tensile strength', 'Open fault micro-fractures'],
    guidelines: 'Pre-treat with 12 ppb sized CaCO3; keep 150 bbl pre-mixed LCM pill in slug pit.',
    docCount: 3
  },
  {
    id: 'risk-sp',
    categoryKey: 'stuck_pipe',
    name: 'Stuck Pipe & Differential Sticking',
    icon: AlertTriangle,
    color: '#ef4444',
    severity: 'High / Critical',
    description: 'Drillstring immobility caused by differential pressure against permeable sand, cuttings bed pack-off, or key-seating.',
    symptoms: ['Overpull > 80 klbs', 'Torque spikes', 'Loss of string axial motion while circulating'],
    rootCauses: ['High overbalance pressure', 'Thick polymer filter cake', 'Stationary string during surveys > 90 sec'],
    guidelines: 'Limit stationary time to 90s; activate hydraulic jars downward immediately.',
    docCount: 2
  },
  {
    id: 'risk-kick',
    categoryKey: 'kick_influx',
    name: 'Well Control, Kicks & Gas Influx',
    icon: Flame,
    color: '#dc2626',
    severity: 'Critical',
    description: 'Influx of formation gas, oil, or water into the wellbore when borehole hydrostatic pressure falls below pore pressure.',
    symptoms: ['Pit gain > 5 bbl', 'Flow with pumps off', 'Sudden ROP drilling break', 'Elevated gas readings'],
    rootCauses: ['Underbalanced mud weight', 'Swab pressure during tripping', 'Abnormally pressured gas sand'],
    guidelines: 'Perform immediate soft shut-in via annular BOP; calculate KMW using stabilized SIDPP.',
    docCount: 2
  },
  {
    id: 'risk-vib',
    categoryKey: 'excessive_vibration',
    name: 'BHA Stick-Slip, Whirl & Telemetry Shock',
    icon: Zap,
    color: '#f59e0b',
    severity: 'Medium / High',
    description: 'Torsional oscillation and harmonic resonance causing MWD component destruction, bit tooth chipping, and tool joint failure.',
    symptoms: ['Torque swings > 30%', 'MWD shock sensor alarms > 50g', 'Low erratic ROP'],
    rootCauses: ['Bit cutter hang-up in hard chalk', 'Harmonic resonance corridor (60-80 RPM)', 'Excessive WOB'],
    guidelines: 'Elevate RPM to 125-140; reduce WOB by 25%; activate electronic Soft Torque top drive damping.',
    docCount: 2
  },
  {
    id: 'risk-wi',
    categoryKey: 'wellbore_instability',
    name: 'Wellbore Instability & Tight Hole',
    icon: Layers,
    color: '#8b5cf6',
    severity: 'High',
    description: 'Borehole enlargement, reactive shale swelling, hole collapse, and bridge formation during tripping and reaming.',
    symptoms: ['Splintery cavings on shale shakers', 'Tight hole drag on connections', 'Annular pack-off'],
    rootCauses: ['Clay hydration from water-based mud', 'Inadequate mud weight hoop stress', 'Tectonic shear stress'],
    guidelines: 'Maintain 35 ppb KCl + 2.5% polyamine; optimize mud weight to support borehole stress cage.',
    docCount: 1
  }
];

// ── Icon matching Image 2 (Document with folded corner and magnifying glass) ──
function MitigationKnowledgeIcon({ size = 38, color = '#1d4ed8' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M8 8C8 5.79086 9.79086 4 12 4H26L34 12V18"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 4V12H34"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 16V36C8 38.2091 9.79086 40 12 40H22"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="14" y1="13" x2="21" y2="13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="20" x2="26" y2="20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="27" x2="20" y2="27" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30" cy="30" r="6" stroke={color} strokeWidth="2.5" fill="#f0f7ff" />
      <line x1="34.5" y1="34.5" x2="40" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function KnowledgeRepository({
  onNavigateToDashboard,
  onNavigateToFeatures,
  onNavigateToSpatial,
  onNavigateToLanding,
  onNavigateToDigitize,
  activeParams = { depth: 4200, rop: 65, spp: 400, mud_in: 1.2, wob: 30 },
  activeRiskType = 'lost_circulation',
  navOptions = null,
  onClearNavOptions = null
}) {
  // ── States ──
  const [searchQuery, setSearchQuery] = useState(navOptions?.searchQuery || '');
  const [activeTab, setActiveTab] = useState(navOptions ? 'reports' : 'all'); // 'all' | 'reports' | 'wells' | 'risks'
  
  // Multi-attribute filters (matching Image 2)
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterFormation, setFilterFormation] = useState('all');
  const [filterOperation, setFilterOperation] = useState('all');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterWell, setFilterWell] = useState('all');
  const [filterSource, setFilterSource] = useState('all'); // 'all' | 'real' | 'generated'

  // Modal State for Selected Document (Step C in Diagram)
  const [selectedDoc, setSelectedDoc] = useState(null);
  // Modal State for Selected Well Dossier & Incidents
  const [selectedWell, setSelectedWell] = useState(null);
  const [docViewMode, setDocViewMode] = useState('real'); // 'real' (original PDF) | 'structured' (AI synthesis view)
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [activeSourceSection, setActiveSourceSection] = useState(null);
  const [pdfIframeUrl, setPdfIframeUrl] = useState('');
  const [pdfIframeKey, setPdfIframeKey] = useState(0);
  const [showWellComparison, setShowWellComparison] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const pdfViewportRef = useRef(null);
  const hasNavHandledRef = useRef(false);

  // Sync initial PDF url & reset citations when selectedDoc changes
  useEffect(() => {
    if (selectedDoc?.realPdfUrl) {
      setPdfIframeUrl(`${selectedDoc.realPdfUrl}#toolbar=1&navpanes=0`);
    } else {
      setPdfIframeUrl('');
    }
    setActiveSourceSection(null);
    setHighlightedSection(null);
  }, [selectedDoc]);

  // Quick Suggestion Chips (Diagram Step A)
  const quickChips = [
    'Lost circulation LCM treatment',
    'Differential sticking captain sand',
    'Kick gas influx kill sheet',
    'BHA stick-slip resonance',
    'Volve Well 15/9-F-12',
    'Reactive shale sloughing'
  ];

  // Auto-scroll to top on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  // ── Live Backend KB items state ──
  const [backendKbItems, setBackendKbItems] = useState([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [totalKbCount, setTotalKbCount] = useState(RAW_KB_BACKUP.length);

  // Fetch from backend API /api/knowledge/search on mount, or fallback to RAW_KB_BACKUP
  useEffect(() => {
    let isMounted = true;
    async function loadBackendKnowledge() {
      try {
        const res = await fetch(`${API}/api/knowledge/search?q=&limit=100`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.results && Array.isArray(data.results) && data.results.length > 0) {
            setBackendKbItems(data.results.map(transformBackendItemToDoc));
            setTotalKbCount(data.results.length);
            setIsLiveConnected(true);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend /api/knowledge/search unreachable, using bundled knowledge cache:", err);
      }
      
      // Fallback to bundled actual data if fetch fails
      if (isMounted) {
        setBackendKbItems(RAW_KB_BACKUP.map(transformBackendItemToDoc));
      }
    }
    loadBackendKnowledge();
    return () => { isMounted = false; };
  }, []);

  // Combined corpus of documents (Actual KB research items from database + Operational SOPs)
  const allDocuments = useMemo(() => {
    const rawItems = backendKbItems.length > 0 ? backendKbItems : RAW_KB_BACKUP.map(transformBackendItemToDoc);
    const seenTitles = new Set();
    const merged = [];

    // Add SOPs
    for (const doc of CORPUS_DOCUMENTS) {
      seenTitles.add(doc.title.toLowerCase().trim());
      merged.push(doc);
    }

    // Add actual KB items
    for (const doc of rawItems) {
      const key = doc.title.toLowerCase().trim();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        merged.push(doc);
      }
    }

    return merged;
  }, [backendKbItems]);

  // ── Auto-Open Extracted Document when navigating from Digitization ──
  useEffect(() => {
    if (!navOptions) return;

    if (navOptions.searchQuery) {
      setSearchQuery(navOptions.searchQuery);
    }
    setActiveTab('reports');

    if (!hasNavHandledRef.current && allDocuments.length > 0) {
      const targetId = (navOptions.targetItemId || '').toLowerCase().trim();
      const queryLower = (navOptions.searchQuery || '').toLowerCase().trim();

      const matched = allDocuments.find(d => {
        if (targetId && (d.id?.toLowerCase() === targetId || d.docCode?.toLowerCase() === targetId)) {
          return true;
        }
        if (queryLower && (d.title.toLowerCase().includes(queryLower) || queryLower.includes(d.title.toLowerCase()))) {
          return true;
        }
        return false;
      });

      if (matched) {
        hasNavHandledRef.current = true;
        if (navOptions.autoOpenDoc) {
          setSelectedDoc(matched);
          setDocViewMode(matched.realPdfUrl ? 'real' : 'structured');
          setShowWellComparison(false);
          setHighlightedSection(null);
        }
      }
    }
  }, [navOptions, allDocuments]);

  // ── Filtered Documents Calculation ──
  const filteredDocuments = useMemo(() => {
    const rawTokens = searchQuery.trim().toLowerCase()
      .replace(/[^a-z0-9\s\/\-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2);

    return allDocuments.filter((doc) => {
      const textSources = [
        doc.title,
        doc.subtitle,
        doc.usedFor,
        doc.categoryName,
        doc.category,
        doc.formation,
        doc.wellReference,
        doc.docType,
        doc.author,
        doc.docCode,
        ...(doc.keywords || []),
        ...(doc.extractedSteps ? doc.extractedSteps.map(s => `${s.title} ${s.action} ${s.detail}`) : []),
        doc.aiSummary?.executive,
        ...(doc.aiSummary?.keyActions || [])
      ];

      if (!checkQueryMatch(searchQuery, textSources)) return false;

      // Dropdown filters
      if (filterRisk !== 'all' && doc.category !== filterRisk) return false;
      if (filterFormation !== 'all' && !doc.formation.toLowerCase().includes(filterFormation.toLowerCase())) return false;
      if (filterOperation !== 'all' && doc.operation !== filterOperation) return false;
      if (filterDocType !== 'all' && doc.docType !== filterDocType) return false;
      if (filterSeverity !== 'all' && doc.severity !== filterSeverity) return false;
      if (filterYear !== 'all' && doc.updatedYear !== filterYear) return false;
      if (filterWell !== 'all' && !doc.wellReference.includes(filterWell)) return false;
      if (filterSource === 'real' && !doc.isFromBackendKB) return false;
      if (filterSource === 'generated' && doc.isFromBackendKB) return false;

      return true;
    }).sort((a, b) => {
      // Sort by relevance score, plus bonus for matching query tokens
      if (rawTokens.length > 0) {
        const textA = `${a.title} ${a.usedFor} ${a.categoryName} ${(a.keywords || []).join(' ')}`.toLowerCase();
        const textB = `${b.title} ${b.usedFor} ${b.categoryName} ${(b.keywords || []).join(' ')}`.toLowerCase();
        const scoreA = rawTokens.reduce((acc, t) => acc + (textA.includes(t) ? 1 : 0), 0);
        const scoreB = rawTokens.reduce((acc, t) => acc + (textB.includes(t) ? 1 : 0), 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
  }, [allDocuments, searchQuery, filterRisk, filterFormation, filterOperation, filterDocType, filterSeverity, filterYear, filterWell, filterSource]);

  // ── Filtered Wells ──
  const filteredWells = useMemo(() => {
    return CORPUS_WELLS.filter((w) => {
      const textSources = [
        w.name,
        w.operator,
        w.field,
        w.coords,
        ...(w.formations || []),
        ...(w.incidents ? w.incidents.map(i => `${i.risk} ${i.count}x`) : []),
        ...(w.relatedDocs || [])
      ];

      if (!checkQueryMatch(searchQuery, textSources)) return false;

      if (filterWell !== 'all' && !w.name.includes(filterWell)) return false;
      if (filterFormation !== 'all' && !w.formations.some(f => f.toLowerCase().includes(filterFormation.toLowerCase()))) return false;
      if (filterRisk !== 'all') {
        const hasRisk = w.incidents && w.incidents.some(i => {
          const riskKey = i.risk.toLowerCase().replace(/[^a-z]/g, '_');
          return riskKey.includes(filterRisk) || filterRisk.includes(riskKey);
        });
        if (!hasRisk) return false;
      }

      return true;
    });
  }, [searchQuery, filterWell, filterFormation, filterRisk]);

  // ── Filtered Risks ──
  const filteredRisks = useMemo(() => {
    return CORPUS_RISKS.filter((r) => {
      const textSources = [
        r.name,
        r.categoryKey,
        r.description,
        r.severity,
        r.guidelines,
        ...(r.symptoms || []),
        ...(r.rootCauses || [])
      ];

      if (!checkQueryMatch(searchQuery, textSources)) return false;

      if (filterRisk !== 'all' && r.categoryKey !== filterRisk) return false;
      return true;
    });
  }, [searchQuery, filterRisk]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterRisk('all');
    setFilterFormation('all');
    setFilterOperation('all');
    setFilterDocType('all');
    setFilterSeverity('all');
    setFilterYear('all');
    setFilterWell('all');
    setFilterSource('all');
  };

  // Scroll & link to source section in PDF Viewer (both Real PDF and Structured)
  const handleViewSourceSection = (stepOrAnchor) => {
    let sectionId = '';
    let stepObj = null;

    if (typeof stepOrAnchor === 'string') {
      sectionId = stepOrAnchor;
      stepObj = selectedDoc?.extractedSteps?.find(s => s.sectionAnchor === sectionId);
    } else if (stepOrAnchor && typeof stepOrAnchor === 'object') {
      sectionId = stepOrAnchor.sectionAnchor;
      stepObj = stepOrAnchor;
    }

    const matchingSec = selectedDoc?.pdfSections?.find(s => s.id === sectionId);

    setHighlightedSection(sectionId);
    setActiveSourceSection({
      id: sectionId,
      title: matchingSec?.title || stepObj?.title || 'Operational Mitigation Procedure',
      text: matchingSec?.text || stepObj?.action || stepObj?.detail || 'Refer to verified operational guidelines in the literature.'
    });

    // If Real PDF is available, navigate the iframe to the relevant page & search keyword
    if (selectedDoc?.realPdfUrl) {
      const stepIdx = selectedDoc.extractedSteps?.findIndex(s => s.sectionAnchor === sectionId);
      const pageNum = stepIdx !== -1 && stepIdx !== undefined ? Math.min(stepIdx + 2, 6) : 2;
      const rawWords = (stepObj?.action || stepObj?.title || matchingSec?.title || '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4);
      const searchWord = rawWords[0] || 'drill';
      setPdfIframeUrl(`${selectedDoc.realPdfUrl}#page=${pageNum}&search=${encodeURIComponent(searchWord)}`);
      setPdfIframeKey(prev => prev + 1);
    }

    // If in structured view, scroll smoothly to the section anchor
    if (docViewMode === 'structured' && pdfViewportRef.current) {
      const el = pdfViewportRef.current.querySelector(`#${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="kb-container">
      {/* ── Top Navigation Bar (Consistent with all platform pages) ── */}
      <nav className="kb-navbar">
        <div className="kb-brand" onClick={onNavigateToLanding}>
          <div className="brand-logo-mark">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
              <polygon points="18,3 31,23 18,16" fill="#fbbf24" />
              <polygon points="18,3 18,16 5,23" fill="#f59e0b" />
              <polygon points="18,16 31,23 23,33 18,27" fill="#0284c7" />
              <polygon points="18,16 18,27 13,33 5,23" fill="#38bdf8" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">DrillSight</span>
            <span className="brand-tagline">Knowledge Base</span>
          </div>
        </div>

        <div className="kb-nav-actions">
          <button
            type="button"
            className="kb-nav-btn kb-nav-btn--ghost"
            onClick={onNavigateToFeatures}
          >
            <ArrowLeft size={14} />
            <span>All Features</span>
          </button>
          
          <button
            type="button"
            className="kb-nav-btn kb-nav-btn--ghost"
            onClick={onNavigateToSpatial}
          >
            <Compass size={14} />
            <span>3D Spatial Map</span>
          </button>

          {onNavigateToDigitize && (
            <button
              type="button"
              className="kb-nav-btn kb-nav-btn--ghost"
              onClick={onNavigateToDigitize}
              title="Upload and digitize drilling reports via Groq AI"
              style={{ color: '#7c3aed', borderColor: 'rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.06)' }}
            >
              <Sparkles size={14} />
              <span>Digitize Reports</span>
            </button>
          )}

          <button
            type="button"
            className="kb-nav-btn kb-nav-btn--primary"
            onClick={onNavigateToDashboard}
          >
            <span>Live Rig Telemetry</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero Banner Section (Faithful to Image 2) ── */}
      <header className="kb-hero">
        <div className="kb-banner-card">
          {/* Top Row: Icon + Titles (Left) & Offshore Rig with "REAL WELLS. REAL SOLUTIONS." (Right) */}
          <div className="kb-banner-top">
            <div className="kb-banner-brand-col">
              <div className="kb-banner-icon-title-row">
                <div className="kb-banner-icon-box">
                  <MitigationKnowledgeIcon size={38} color="#1d4ed8" />
                </div>
                <div>
                  <h1 className="kb-banner-title">Mitigation Knowledge</h1>
                  <p className="kb-banner-subtitle">
                    Search SOPs, reports, technical guides and lessons learned to find the right mitigation for your well.
                  </p>
                  <div className="kb-sync-badge">
                    <span className={`kb-sync-dot ${isLiveConnected ? 'kb-sync-dot--active' : ''}`}></span>
                    <span>
                      {isLiveConnected
                        ? `Live Backend & Database Connected (${allDocuments.length} Documents & Research Papers)`
                        : `Knowledge Database Loaded (${allDocuments.length} Documents & Research Papers)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="kb-banner-rig-hero">
              <div className="kb-banner-rig-overlay">
                <div className="kb-banner-tagline">
                  <span>REAL WELLS.</span>
                  <span>REAL SOLUTIONS.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar Row (Step A) */}
          <div className="kb-banner-search-row">
            <div className="kb-banner-search-box">
              <Search size={20} className="kb-banner-search-lens" />
              <input
                type="text"
                className="kb-banner-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search SOPs, reports, technical guides and lessons learned (e.g. "Lost circulation LCM treatment")...'
              />
              {searchQuery && (
                <button
                  type="button"
                  className="kb-banner-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                className="kb-banner-submit-btn"
                title="Search Knowledge Base"
              >
                <Search size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Queries Chips */}
        <div className="kb-quick-tags">
          <span className="kb-quick-tags-label">Suggested Queries:</span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className={`kb-chip-btn ${searchQuery === chip ? 'kb-chip-btn--active' : ''}`}
              onClick={() => setSearchQuery(chip)}
            >
              🔍 "{chip}"
            </button>
          ))}
        </div>

        {/* Knowledge Entity Navigation Bar */}
        <div className="kb-filter-tabs-row" style={{ marginTop: 14 }}>
          <div className="kb-entity-tabs">
            <button
              type="button"
              className={`kb-entity-tab ${activeTab === 'all' ? 'kb-entity-tab--active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Layers size={14} />
              <span>All Knowledge</span>
              <span className="kb-entity-tab-count">
                {filteredDocuments.length + filteredWells.length + filteredRisks.length}
              </span>
            </button>

            <button
              type="button"
              className={`kb-entity-tab ${activeTab === 'reports' ? 'kb-entity-tab--active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={14} />
              <span>Reports &amp; Procedures</span>
              <span className="kb-entity-tab-count">{filteredDocuments.length}</span>
            </button>

            <button
              type="button"
              className={`kb-entity-tab ${activeTab === 'wells' ? 'kb-entity-tab--active' : ''}`}
              onClick={() => setActiveTab('wells')}
            >
              <MapPin size={14} />
              <span>Historical Wells</span>
              <span className="kb-entity-tab-count">{filteredWells.length}</span>
            </button>

            <button
              type="button"
              className={`kb-entity-tab ${activeTab === 'risks' ? 'kb-entity-tab--active' : ''}`}
              onClick={() => setActiveTab('risks')}
            >
              <ShieldAlert size={14} />
              <span>Hazards &amp; Risks</span>
              <span className="kb-entity-tab-count">{filteredRisks.length}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Results Section ── */}
      <main className="kb-body">
        {/* Active AI Digitization Navigation Notice */}
        {navOptions && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.09), rgba(59, 130, 246, 0.09))',
            border: '1.5px solid rgba(124, 58, 237, 0.35)', borderRadius: 10,
            padding: '12px 18px', marginBottom: 20, flexWrap: 'wrap', gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={18} color="#7c3aed" />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#4c1d95', display: 'block' }}>
                  Digitized Document Active: {navOptions.searchQuery || navOptions.targetItemId}
                </span>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  The Knowledge Base is focused on your extracted record. Click any card to inspect its full operational playbook.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onClearNavOptions) onClearNavOptions();
                setSearchQuery('');
                setActiveTab('all');
              }}
              style={{
                background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 7,
                padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#334155',
                cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              Show Full Knowledge Base
            </button>
          </div>
        )}

        {/* TAB 1: ALL OR REPORTS & DOCUMENTS (Diagram Step B) */}
        {(activeTab === 'all' || activeTab === 'reports') && filteredDocuments.length > 0 && (
          <div style={{ marginBottom: activeTab === 'all' ? 36 : 0 }}>
            {activeTab === 'all' && (
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Technical Procedures &amp; Operational Reports ({filteredDocuments.length})
                </h3>
              </div>
            )}
            <div className="kb-docs-grid">
              {filteredDocuments.map((doc) => {
                const catMeta = getCardCategoryMeta(doc.category, doc.categoryName);
                const isTargetMatch = Boolean(
                  navOptions && (
                    (navOptions.targetItemId && (doc.id?.toLowerCase() === navOptions.targetItemId.toLowerCase() || doc.docCode?.toLowerCase() === navOptions.targetItemId.toLowerCase())) ||
                    (navOptions.highlightItemIds && navOptions.highlightItemIds.map(h => h?.toLowerCase()).includes(doc.id?.toLowerCase())) ||
                    (navOptions.searchQuery && (doc.title.toLowerCase().includes(navOptions.searchQuery.toLowerCase().trim()) || navOptions.searchQuery.toLowerCase().trim().includes(doc.title.toLowerCase())))
                  )
                );
                return (
                  <div
                    key={doc.id}
                    className={`kb-doc-card ${isTargetMatch ? 'kb-doc-card--target-highlight' : ''}`}
                    style={isTargetMatch ? {
                      border: '2px solid #7c3aed',
                      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.2), 0 12px 24px -4px rgba(124, 58, 237, 0.25)'
                    } : {}}
                  >
                    {/* Top Hero Photographic Banner */}
                    <div
                      className="kb-card-banner"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.15) 0%, rgba(15, 23, 42, 0.65) 100%), url(${catMeta.bannerImg})`
                      }}
                    >
                      <span
                        className="kb-card-hazard-pill"
                        style={{ background: catMeta.color, color: catMeta.textColor }}
                      >
                        <catMeta.Icon size={12} />
                        <span>{catMeta.label}</span>
                      </span>

                      {isTargetMatch ? (
                        <span className="kb-card-relevance-chip" style={{ background: '#7c3aed', color: '#ffffff', fontWeight: 800 }}>
                          <Sparkles size={12} />
                          <span>✦ Extracted Entry</span>
                        </span>
                      ) : (
                        <span className="kb-card-relevance-chip">
                          <Crosshair size={12} />
                          <span>{doc.relevanceScore}% Relevant</span>
                        </span>
                      )}
                    </div>

                    {/* Card Content Area */}
                    <div className="kb-card-content">
                      {/* Title & Chevron */}
                      <div
                        className="kb-card-title-row"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setDocViewMode(doc.realPdfUrl ? 'real' : 'structured');
                          setHighlightedSection(null);
                          setShowWellComparison(false);
                        }}
                      >
                        <h3 className="kb-card-title">{doc.title}</h3>
                        <ChevronRight size={19} className="kb-card-chevron" />
                      </div>

                      {/* Type & Year */}
                      <div className="kb-card-submeta">
                        <FileText size={13} color="#64748b" />
                        <span>{doc.docType}</span>
                        <span>•</span>
                        <span>Updated: {doc.updatedYear}</span>
                      </div>

                      {/* Used for Callout Box */}
                      <div
                        className="kb-card-usedfor"
                        style={{ borderLeftColor: catMeta.color }}
                      >
                        <strong>Used for:</strong> {doc.usedFor}
                      </div>

                      {/* Metadata Pills */}
                      <div className="kb-card-pills-list">
                        <div className="kb-card-pills-row">
                          <span className="kb-card-pill" title={`Formation: ${doc.formation}`}>
                            <Layers size={11} color="#64748b" />
                            <span>{doc.formation}</span>
                          </span>
                          <span className="kb-card-pill" title={`Well Reference: ${doc.wellReference}`}>
                            <MapPin size={11} color="#64748b" />
                            <span>{doc.wellReference}</span>
                          </span>
                        </div>
                        <div className="kb-card-pills-row">
                          <span className="kb-card-pill" title={`Depth Range: ${doc.depthRange.start_m}m - ${doc.depthRange.end_m}m`}>
                            <Activity size={11} color="#64748b" />
                            <span>{doc.depthRange.start_m}m – {doc.depthRange.end_m}m</span>
                          </span>
                        </div>
                      </div>

                      {/* Bottom Action Button */}
                      <button
                        type="button"
                        className="kb-card-action-btn"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setDocViewMode(doc.realPdfUrl ? 'real' : 'structured');
                          setHighlightedSection(null);
                          setShowWellComparison(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={14} />
                          <span>{doc.isFromBackendKB ? 'Open Real PDF & Synthesis' : 'View Generated SOP Standard'}</span>
                        </div>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: HISTORICAL WELLS */}
        {(activeTab === 'wells' || (activeTab === 'all' && filteredWells.length > 0)) && (
          <div style={{ marginTop: activeTab === 'all' ? 36 : 0, marginBottom: activeTab === 'all' ? 36 : 0 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>
              Historical Well Dossiers &amp; Incident Telemetry ({filteredWells.length})
            </h3>
            <div className="kb-wells-grid">
              {filteredWells.map((well) => (
                <div
                  key={well.id}
                  className="kb-well-card"
                  onClick={() => setSelectedWell(well)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="kb-well-card-header">
                    <div>
                      <h4 className="kb-well-name">{well.name}</h4>
                      <span className="kb-well-operator">{well.operator} • {well.field}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                      TD: {well.totalDepth}
                    </span>
                  </div>

                  <div className="kb-well-stats-row">
                    <div className="kb-well-stat-item">
                      <span className="kb-well-stat-lbl">Coordinates</span>
                      <span className="kb-well-stat-val">{well.coords}</span>
                    </div>
                    <div className="kb-well-stat-item">
                      <span className="kb-well-stat-lbl">Formations</span>
                      <span className="kb-well-stat-val" style={{ fontSize: '0.76rem' }}>
                        {well.formations.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="kb-well-incidents-block">
                    <div className="kb-well-incidents-title">
                      <span>Similar Risk Occurrences in Well</span>
                      <span style={{ color: '#0284c7' }}>{well.totalIncidents} total</span>
                    </div>
                    <div className="kb-well-incident-chips">
                      {well.incidents.map((inc, i) => (
                        <span
                          key={i}
                          className="kb-incident-chip"
                          style={{
                            background: `${inc.color}15`,
                            color: inc.color,
                            border: `1px solid ${inc.color}35`
                          }}
                        >
                          <strong>{inc.risk}:</strong> {inc.count}x
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="kb-card-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWell(well);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} />
                      <span>View Well Reports &amp; Incidents</span>
                    </div>
                    <ArrowRight size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HAZARDS & RISKS */}
        {(activeTab === 'risks' || (activeTab === 'all' && filteredRisks.length > 0)) && (
          <div style={{ marginTop: activeTab === 'all' ? 36 : 0 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>
              Drilling Hazards &amp; Root Causes ({filteredRisks.length})
            </h3>
            <div className="kb-risks-grid">
              {filteredRisks.map((risk) => {
                const IconComp = risk.icon;
                return (
                  <div key={risk.id} className="kb-risk-card">
                    <div className="kb-risk-card-head">
                      <div className="kb-risk-icon-wrap" style={{ background: risk.color }}>
                        <IconComp size={22} />
                      </div>
                      <div>
                        <h4 className="kb-risk-card-title">{risk.name}</h4>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: risk.color }}>
                          Severity: {risk.severity}
                        </span>
                      </div>
                    </div>

                    <p className="kb-risk-card-desc">{risk.description}</p>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Early Physical Indicators
                      </span>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: '#334155' }}>
                        {risk.symptoms.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className="kb-card-action-btn"
                      onClick={() => {
                        setFilterRisk(risk.categoryKey);
                        setActiveTab('reports');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={14} />
                        <span>Browse {risk.docCount} Procedures for this Hazard</span>
                      </div>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ZERO RESULTS EMPTY STATE */}
        {((activeTab === 'all' && filteredDocuments.length === 0 && filteredWells.length === 0 && filteredRisks.length === 0) ||
          (activeTab === 'reports' && filteredDocuments.length === 0) ||
          (activeTab === 'wells' && filteredWells.length === 0) ||
          (activeTab === 'risks' && filteredRisks.length === 0)) && (
          <div className="kb-empty-state">
            <div className="kb-empty-icon">
              <Search size={30} />
            </div>
            <h3 className="kb-empty-title">No Matching Knowledge Items Found</h3>
            <p className="kb-empty-desc">
              {searchQuery.trim()
                ? `No technical documents, offset wells, or risk playbooks matched "${searchQuery}".`
                : 'No items match the currently applied dropdown filters.'}
            </p>
            <button
              type="button"
              className="kb-empty-reset-btn"
              onClick={handleResetFilters}
            >
              <RefreshCw size={14} />
              <span>Clear Search &amp; Reset Filters</span>
            </button>
          </div>
        )}
      </main>

      {/* ── MODAL: DOCUMENT VIEWER & AI SUMMARY SPLIT-SCREEN (Diagram Steps C, D, E) ── */}
      {selectedDoc && (
        <div className="kb-modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="kb-modal-window" onClick={(e) => e.stopPropagation()}>
            {/* Modal Top Bar */}
            <div className="kb-modal-topbar">
              <div className="kb-modal-doc-meta">
                <FileText size={18} color="#38bdf8" />
                <span className="kb-modal-doc-title">{selectedDoc.title}</span>
                <span className="kb-modal-doc-code">{selectedDoc.docCode}</span>
                {selectedDoc.isFromBackendKB ? (
                  <span className="kb-doc-source-tag kb-doc-source-tag--real" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                    <FileText size={11} /> Real Published Literature
                  </span>
                ) : (
                  <span className="kb-doc-source-tag kb-doc-source-tag--gen" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                    <Sparkles size={11} /> Generated SOP Playbook
                  </span>
                )}
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>• {selectedDoc.docType}</span>
              </div>

              <div className="kb-modal-topbar-actions">
                {selectedDoc.realPdfUrl && (
                  <a
                    href={selectedDoc.realPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kb-modal-close-btn"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Open authentic PDF in new browser tab"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  type="button"
                  className="kb-modal-close-btn"
                  onClick={() => window.print()}
                  title="Print / Save PDF"
                >
                  <Printer size={15} />
                </button>
                <button
                  type="button"
                  className="kb-modal-close-btn"
                  onClick={() => setSelectedDoc(null)}
                  title="Close Document"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="kb-modal-split-body">
              {/* ── LEFT PANEL: REAL PDF VIEWER OR GENERATED DOCUMENT ── */}
              <div className="kb-doc-viewer-panel">
                <div className="kb-doc-viewer-controls">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedDoc.realPdfUrl && (
                      <div className="kb-doc-mode-toggle">
                        <button
                          type="button"
                          className={`kb-doc-mode-btn ${docViewMode === 'real' ? 'kb-doc-mode-btn--active' : ''}`}
                          onClick={() => setDocViewMode('real')}
                          title="View original authentic published PDF file"
                        >
                          <FileText size={13} />
                          <span>Real PDF Document</span>
                        </button>
                        <button
                          type="button"
                          className={`kb-doc-mode-btn ${docViewMode === 'structured' ? 'kb-doc-mode-btn--active' : ''}`}
                          onClick={() => setDocViewMode('structured')}
                          title="View AI structured procedural breakdown"
                        >
                          <Sparkles size={13} />
                          <span>Generated Summary View</span>
                        </button>
                      </div>
                    )}
                    {!selectedDoc.realPdfUrl && (
                      <div className="kb-doc-pages">
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>Generated Technical SOP</span>
                        <span>•</span>
                        <span>Standard A4 Sheet</span>
                      </div>
                    )}
                  </div>

                  {docViewMode === 'structured' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setZoomLevel(prev => Math.max(75, prev - 10))}
                        title="Zoom Out"
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{zoomLevel}%</span>
                      <button
                        type="button"
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
                        title="Zoom In"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {selectedDoc.realPdfUrl && docViewMode === 'real' ? (
                  <div className="kb-real-pdf-container">
                    <div className="kb-real-pdf-banner">
                      <div className="kb-real-pdf-source-info">
                        <span className="kb-real-pdf-source-badge">
                          <FileText size={12} /> Authentic Literature Source
                        </span>
                        <span className="kb-real-pdf-filename">{selectedDoc.sourceDocument}</span>
                      </div>
                    </div>

                    {/* Active Source Citation Callout in Original Document */}
                    {activeSourceSection && (
                      <div className="kb-real-pdf-citation-card">
                        <div className="kb-citation-card-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span className="kb-citation-badge">
                              <Crosshair size={12} />
                              <span>SOURCE IN ORIGINAL DOCUMENT</span>
                            </span>
                            <span className="kb-citation-sec-name">
                              {activeSourceSection.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="kb-citation-dismiss-btn"
                            onClick={() => {
                              setActiveSourceSection(null);
                              setHighlightedSection(null);
                            }}
                            title="Dismiss citation highlight"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="kb-citation-quote-box">
                          <p className="kb-citation-quote-text">
                            "{activeSourceSection.text}"
                          </p>
                        </div>

                        <div className="kb-citation-card-footer">
                          <span>
                            📄 Original Document: <strong>{selectedDoc.sourceDocument}</strong>
                          </span>
                          <button
                            type="button"
                            className="kb-citation-jump-btn"
                            onClick={() => {
                              setDocViewMode('structured');
                              setTimeout(() => {
                                if (pdfViewportRef.current) {
                                  const el = pdfViewportRef.current.querySelector(`#${activeSourceSection.id}`);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 80);
                            }}
                          >
                            <span>Open in Structured Sheet View ➔</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <iframe
                      key={pdfIframeKey}
                      src={pdfIframeUrl || `${selectedDoc.realPdfUrl}#toolbar=1&navpanes=0`}
                      title={selectedDoc.title}
                      className="kb-real-pdf-frame"
                    />
                  </div>
                ) : (
                  <div className="kb-doc-scroll-viewport" ref={pdfViewportRef}>
                    <div
                      className="kb-simulated-pdf-sheet"
                      style={zoomLevel !== 100 ? { transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' } : undefined}
                    >
                      {/* Sheet Header Stamp */}
                      <div className="kb-pdf-header-stamp">
                        <div>
                          <div className="kb-pdf-stamp-text">
                            {selectedDoc.isFromBackendKB
                              ? 'TECHNICAL RESEARCH ARCHIVE • NORTH SEA BENCHMARK'
                              : 'DRILLING ENGINEERING OPERATING STANDARD • OPERATIONAL PLAYBOOK'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700, marginTop: 2 }}>
                            {selectedDoc.author}
                          </div>
                        </div>
                        <div
                          className="kb-pdf-stamp-badge"
                          style={{
                            borderColor: selectedDoc.isFromBackendKB ? '#0284c7' : '#059669',
                            color: selectedDoc.isFromBackendKB ? '#0284c7' : '#059669'
                          }}
                        >
                          {selectedDoc.isFromBackendKB ? 'INDEXED ARCHIVE' : 'APPROVED STANDARD'}
                        </div>
                      </div>

                      <h2 className="kb-pdf-title">{selectedDoc.title}</h2>
                      <div style={{ fontSize: '0.84rem', color: '#475569', marginBottom: 12 }}>
                        {selectedDoc.subtitle}
                      </div>

                      {/* Meta Table */}
                      <table className="kb-pdf-meta-table">
                        <tbody>
                          <tr>
                            <td className="kb-pdf-meta-label">Document ID</td>
                            <td className="kb-pdf-meta-value">{selectedDoc.docCode}</td>
                            <td className="kb-pdf-meta-label">Revision Year</td>
                            <td className="kb-pdf-meta-value">{selectedDoc.updatedYear} (Active)</td>
                          </tr>
                          <tr>
                            <td className="kb-pdf-meta-label">Applicable Well / Field</td>
                            <td className="kb-pdf-meta-value">{selectedDoc.wellReference}</td>
                            <td className="kb-pdf-meta-label">Target Depth Range</td>
                            <td className="kb-pdf-meta-value">{selectedDoc.depthRange.start_m}m - {selectedDoc.depthRange.end_m}m MD</td>
                          </tr>
                          <tr>
                            <td className="kb-pdf-meta-label">Formation Lithology</td>
                            <td className="kb-pdf-meta-value">{selectedDoc.formation}</td>
                            <td className="kb-pdf-meta-label">Hazard Category</td>
                            <td className="kb-pdf-meta-value" style={{ textTransform: 'capitalize' }}>
                              {selectedDoc.categoryName} ({selectedDoc.severity})
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* PDF Procedural Sections (Clean - No False Schematics) */}

                      {/* PDF Sections */}
                      {selectedDoc.pdfSections.map((sec) => (
                        <div
                          key={sec.id}
                          id={sec.id}
                          className={`kb-pdf-section ${highlightedSection === sec.id ? 'kb-pdf-section--highlighted' : ''}`}
                        >
                          <h4 className="kb-pdf-sec-title">
                            <CheckCircle2 size={15} color={highlightedSection === sec.id ? '#ea580c' : '#0284c7'} />
                            <span>{sec.title}</span>
                          </h4>
                          <p className="kb-pdf-sec-content" style={{ whiteSpace: 'pre-line' }}>{sec.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT PANEL: AI SUMMARY & MITIGATION ACTIONS ── */}
              <div className="kb-intelligence-panel">
                {/* 1. AI Summary Card (Diagram Step C) */}
                <div className="kb-ai-summary-card">
                  <div className="kb-ai-header">
                    <span className="kb-ai-badge">
                      <Sparkles size={12} />
                      <span>AI SYNTHESIS</span>
                    </span>
                    <h4 className="kb-ai-title">Key Actions &amp; Summary</h4>
                  </div>

                  <p className="kb-ai-executive">
                    {selectedDoc.aiSummary.executive}
                  </p>

                  <div className="kb-ai-key-actions-title">Key Actions:</div>
                  <ul className="kb-ai-key-actions-list">
                    {selectedDoc.aiSummary.keyActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>

                {/* 2. Extracted Mitigation Steps (Diagram Step D) */}
                <div className="kb-mitigation-steps-box">
                  <div className="kb-steps-header">
                    <h4 className="kb-steps-title">
                      <ShieldAlert size={16} color="#0284c7" />
                      <span>Extracted Mitigation Steps</span>
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                      4 Phased Actions
                    </span>
                  </div>

                  <div className="kb-steps-list">
                    {selectedDoc.extractedSteps.map((step) => (
                      <div key={step.num} className="kb-step-item">
                        <div className="kb-step-top">
                          <div className="kb-step-num-title">
                            <span className="kb-step-number">{step.num}</span>
                            <span className="kb-step-title">{step.title}</span>
                          </div>
                        </div>

                        <div className="kb-step-detail">
                          {step.detail}
                        </div>

                        {/* View Source Section Button */}
                        <button
                          type="button"
                          className={`kb-step-view-source-btn ${highlightedSection === step.sectionAnchor ? 'kb-step-view-source-btn--active' : ''}`}
                          onClick={() => handleViewSourceSection(step)}
                          title="View verified source section in original document"
                        >
                          <Crosshair size={12} />
                          <span>[View source section]</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Apply to Current Well (Diagram Step E) */}
                <div className="kb-apply-well-card">
                  <div className="kb-apply-head">
                    <h4 className="kb-apply-title">How relevant is this to your well?</h4>
                    <span className="kb-apply-relevance-pill">
                      Relevance: {selectedDoc.relevanceScore}%
                    </span>
                  </div>

                  <div className="kb-relevance-checklist">
                    <div className="kb-relevance-check-row">
                      <span className="kb-check-label">Formation</span>
                      <span className="kb-check-value">
                        <Check size={14} /> Similar ({selectedDoc.formation})
                      </span>
                    </div>

                    <div className="kb-relevance-check-row">
                      <span className="kb-check-label">Depth</span>
                      <span className="kb-check-value">
                        <Check size={14} /> Similar ({activeParams?.depth ?? 4200}m vs {selectedDoc.depthRange.start_m}m)
                      </span>
                    </div>

                    <div className="kb-relevance-check-row">
                      <span className="kb-check-label">Risk</span>
                      <span className="kb-check-value">
                        <Check size={14} /> {selectedDoc.categoryName} (Match)
                      </span>
                    </div>
                  </div>


                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Well Dossier & Incidents Popup Modal */}
      {selectedWell && (
        <WellDossierModal
          well={selectedWell}
          onClose={() => setSelectedWell(null)}
        />
      )}
    </div>
  );
}
