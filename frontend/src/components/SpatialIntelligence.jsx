import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Drill,
  Search,
  ZoomIn,
  ZoomOut,
  Crosshair,
  RotateCcw,
  Layers,
  AlertTriangle,
  FileText,
  Activity,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Info,
  ArrowLeft,
  X,
  Compass,
  Lightbulb,
  Droplets,
  MapPin,
} from 'lucide-react';
import '../spatial.css';

// ── Donut Progress Ring for Match Percentage ──
function DonutRing({ percentage = 88, size = 46, strokeWidth = 5.5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#0066ee"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        fill="transparent"
      />
    </svg>
  );
}

// ── Leaflet Dynamic Loader ──────────────────────────────────────────────────
function ensureLeaflet() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.L) {
      return resolve(window.L);
    }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(window.L);
      document.head.appendChild(script);
    } else {
      const timer = setInterval(() => {
        if (window.L) {
          clearInterval(timer);
          resolve(window.L);
        }
      }, 100);
    }
  });
}

// ── Wells Dataset ────────────────────────────────────────────────────────────
// Realistic spatial positioning around Central North Sea / Coastal Basin
const CURRENT_WELL = {
  id: 'W-204',
  name: 'W-204',
  displayName: 'W-204 (Current Well)',
  category: 'current',
  status: 'LIVE',
  lat: 58.435,
  lon: 1.902,
  depth_m: 3842,
  formation: 'Sandstone B',
  field: 'Central Basin, Block 15/9',
  country: 'North Sea Operations',
  spudDate: '2026-07-14',
  rig: 'DeepOcean Explorer IV',
  waterDepth: '112 m',
  riskZone: {
    level: 'HIGH RISK',
    depthRange: '3,780–3,920 m',
    confidence: '78%',
    hazard: 'Lost Circulation',
    reasons: [
      '3 geographically similar wells experienced lost circulation',
      '2 geological matches reported mud loss',
      'Similar formation characteristics in Sandstone B',
      'Consistent historical fracture gradient breakdown pattern',
    ],
  },
};

const NEARBY_WELLS = [
  // 🔵 Geographically Similar Wells
  {
    id: 'W-187',
    name: 'W-187',
    category: 'geographic',
    categoryLabel: 'Geographically Similar',
    lat: 58.418,
    lon: 1.868,
    distKm: 3.1,
    similarity: 94,
    formation: 'Sandstone B / Upper Shale',
    depth_m: 3795,
    incident: {
      type: 'Lost Circulation',
      depth: '3,795 m',
      severity: 'High',
      lossRate: '95 bbl/hr',
      description: 'Severe lost returns upon entering upper Sandstone B porous interval. Required two LCM pills to regain hydrostatic balance.',
    },
    frequentRisks: [
      {
        hazard: 'Lost Circulation',
        count: 2,
        severityClass: 'si-count-badge--red',
        itemClass: '',
        depths: '3,780 m · 3,795 m',
        metric: 'Loss rate up to 95 bbl/hr',
        details: 'Sudden total returns drop upon breaching upper permeable Sandstone B. Annular fluid column fell 140 m before LCM pill stabilized wellbore.',
      },
      {
        hazard: 'Differential Sticking',
        count: 1,
        severityClass: 'si-count-badge--orange',
        itemClass: 'warning',
        depths: '3,820 m',
        metric: 'Overpull > 85 klb (4 hrs stuck)',
        details: 'Drill collars stuck against permeable filter cake during stationary directional MWD survey under 240 psi overbalance.',
      },
      {
        hazard: 'Gas Influx / Pressure Kick',
        count: 1,
        severityClass: 'si-count-badge--amber',
        itemClass: 'moderate',
        depths: '3,865 m',
        metric: '18 bbl pit gain / 0.35 SG kick',
        details: 'Pore pressure surge encountered after drilling break; shut in on annular blowout preventer (BOP).',
      },
    ],
    impactOnCurrentWell: {
      alertLevel: 'Immediate Proximity Hazard (3.1 km Offset)',
      mechanism: 'As the closest active offset well (3.1 km), W-187’s recurring lost circulation directly establishes the upper boundary of W-204’s current HIGH RISK zone (3,780–3,920 m). The permeable thief sand corridor discovered in W-187 dips directly through W-204.',
      directThreats: [
        'Sudden total returns loss at W-204 (current depth: 3,842 m) if mud hydrostatic pressure exceeds 1.28 SG EMW.',
        'Loss of annular fluid height can rapidly induce differential sticking or trigger an underbalanced secondary kick.',
        'Hole pack-off from destabilized shales if fluid column drops below casing shoe.',
      ],
      advisories: [
        'Never permit drillstring to remain stationary for > 90 seconds while surveying in the 3,820–3,865 m interval.',
        'Stage 40 bbl heavy coarse LCM pill in active reserve pit ready for instantaneous bullhead pumping.',
        'Maintain continuous slow-rate circulation during connections to preserve dynamic pressure barrier.',
      ],
    },
  },
  {
    id: 'W-201',
    name: 'W-201',
    category: 'geographic',
    categoryLabel: 'Geographically Similar',
    lat: 58.452,
    lon: 1.954,
    distKm: 4.2,
    similarity: 92,
    formation: 'Sandstone B (Reservoir Analog)',
    depth_m: 3810,
    incident: {
      type: 'Lost Circulation',
      depth: '3,810 m',
      severity: 'Critical',
      lossRate: '140 bbl/hr',
      description: 'Sudden total mud returns loss in subsea fracture corridor. Mud volume dropped 180 bbl in 45 minutes.',
    },
    frequentRisks: [
      {
        hazard: 'Lost Circulation',
        count: 3,
        severityClass: 'si-count-badge--red',
        itemClass: '',
        depths: '3,790 m · 3,810 m · 3,835 m',
        metric: 'Peak loss rate 140 bbl/hr',
        details: 'Three sequential fractures opened under equivalent circulating density (ECD). Lost 180 bbl in 45 minutes, requiring high-filtration squeeze cement.',
      },
      {
        hazard: 'Mud Seepage & Losses',
        count: 2,
        severityClass: 'si-count-badge--orange',
        itemClass: 'warning',
        depths: '3,750 m · 3,860 m',
        metric: 'Continuous 65 bbl/hr seepage',
        details: 'Micro-fracture dilation causing steady active pit level decline throughout Sandstone B drilling.',
      },
      {
        hazard: 'Pack-off & Tight Hole',
        count: 1,
        severityClass: 'si-count-badge--amber',
        itemClass: 'moderate',
        depths: '3,880 m',
        metric: '75 klb overpull on trips',
        details: 'Annular cuttings accumulation due to reduced fluid velocity after lowering pump rates to combat losses.',
      },
    ],
    impactOnCurrentWell: {
      alertLevel: 'Critical Hydraulic Breakdown Alert',
      mechanism: 'W-201 is located 4.2 km ENE along the primary fault-strike orientation. The subsea fracture corridor that caused 3 massive lost circulation events in W-201 intersects W-204’s current depth profile (3,842 m). Fracture breakdown threshold is only 1.28 SG EMW.',
      directThreats: [
        'W-204 is currently circulating at 1.295 SG ECD, which directly exceeds W-201’s confirmed fracture breakdown point.',
        'Imminent risk of total mud loss within the next 15–20 meters of penetration.',
        'Secondary pressure surge if annulus drains below the reservoir gas cap.',
      ],
      advisories: [
        'Immediately trim circulating flow rate from 620 gpm to 540 gpm to bring ECD below 1.27 SG.',
        'Arm real-time acoustic pit volume alarm with a strict 3-bbl loss trip threshold.',
        'Pre-mix 50 bbl of 40-mesh medium/coarse walnut shell & mica LCM pill ready on standby.',
      ],
    },
  },
  {
    id: 'W-198',
    name: 'W-198',
    category: 'geographic',
    categoryLabel: 'Geographically Similar',
    lat: 58.396,
    lon: 1.942,
    distKm: 6.5,
    similarity: 88,
    formation: 'Sandstone B Transition',
    depth_m: 3815,
    incident: {
      type: 'Mud Loss',
      depth: '3,815 m',
      severity: 'Moderate',
      lossRate: '60 bbl/hr',
      description: 'Partial seepage and micro-fracture mud loss requiring density reduction from 1.32 SG to 1.26 SG.',
    },
    frequentRisks: [
      {
        hazard: 'Mud Loss & Seepage',
        count: 3,
        severityClass: 'si-count-badge--orange',
        itemClass: 'warning',
        depths: '3,790 m · 3,815 m · 3,845 m',
        metric: 'Average 60 bbl/hr losses',
        details: 'Recurrent seepage into micro-fractured Sandstone B transition beds requiring density cut from 1.32 to 1.26 SG.',
      },
      {
        hazard: 'Borehole Ballooning',
        count: 2,
        severityClass: 'si-count-badge--amber',
        itemClass: 'moderate',
        depths: '3,825 m · 3,850 m',
        metric: '25 bbl breathing bleed-back',
        details: 'Formation fractures dilated under pump pressure and bled fluid back during connections, mimicking gas kicks.',
      },
    ],
    impactOnCurrentWell: {
      alertLevel: 'Wellbore Breathing & False Kick Hazard',
      mechanism: 'W-198 demonstrated significant wellbore ballooning in Sandstone B. Micro-fractures absorb drilling fluid during circulation and regurgitate fluid back into the well when pumps shut down.',
      directThreats: [
        'Drilling crew at W-204 may misdiagnose ballooning bleed-back as an active formation kick, leading to erroneous barite weighting.',
        'Over-weighting will overpressure Sandstone B and cause catastrophic irreversible losses.',
      ],
      advisories: [
        'Conduct rigorous fingerprinting flow checks on all connections before taking well control actions.',
        'Maintain plastic viscosity between 18–22 cP and yield point at 20 lb/100ft² to minimize pressure surges.',
      ],
    },
  },

  // 🟡 Geologically Similar Wells
  {
    id: 'W-176',
    name: 'W-176',
    category: 'geological',
    categoryLabel: 'Geologically Similar',
    lat: 58.489,
    lon: 1.825,
    distKm: 8.4,
    similarity: 95,
    formation: 'Sandstone B Facies Alpha',
    depth_m: 3840,
    incident: {
      type: 'Mud Loss',
      depth: '3,840 m',
      severity: 'Moderate',
      lossRate: '85 bbl/hr',
      description: 'Permeability streak in Sandstone B resulted in sudden mud losses and pit volume drop.',
    },
    frequentRisks: [
      {
        hazard: 'Mud Losses & Permeability Breaches',
        count: 3,
        severityClass: 'si-count-badge--orange',
        itemClass: 'warning',
        depths: '3,820 m · 3,840 m · 3,870 m',
        metric: 'Peak loss rate 85 bbl/hr',
        details: 'High-permeability subsea channel streaks depleted active mud pit reserves by 115 bbl during two 12-hour tours.',
      },
      {
        hazard: 'Lost Circulation',
        count: 1,
        severityClass: 'si-count-badge--red',
        itemClass: '',
        depths: '3,845 m',
        metric: 'Complete loss of returns',
        details: 'Unpredicted pore pressure regression zone caused total lost circulation upon entering core Sandstone B facies.',
      },
      {
        hazard: 'Shale Sloughing & Tight Hole',
        count: 1,
        severityClass: 'si-count-badge--amber',
        itemClass: 'moderate',
        depths: '3,760 m',
        metric: 'Overpull 65 klb',
        details: 'Reactive shale cavings packed off the stabilizer assembly following mud salinity drop.',
      },
    ],
    impactOnCurrentWell: {
      alertLevel: 'Stratigraphic Analog Twin Alert (95% Match)',
      mechanism: 'With a 95% geological correlation, W-176 represents the exact stratigraphic depositional clone of W-204’s Sandstone B. At 3,840 m, W-176 hit an unmapped high-permeability thief zone that completely drained active returns.',
      directThreats: [
        'W-204 is at 3,842 m — currently positioned right at the mouth of this exact thief sand.',
        'High permeability contrast creates immediate differential pressure across drill collar BHA.',
      ],
      advisories: [
        'Pre-treat active mud system with 25 lb/bbl calcium carbonate bridging blend before drilling past 3,850 m.',
        'Watch for standpipe pressure drops > 60 psi as an instantaneous signature of thief sand penetration.',
      ],
    },
  },
  {
    id: 'W-192',
    name: 'W-192',
    category: 'geological',
    categoryLabel: 'Geologically Similar',
    lat: 58.351,
    lon: 1.832,
    distKm: 11.2,
    similarity: 89,
    formation: 'Sandstone B Lower Member',
    depth_m: 3890,
    incident: {
      type: 'Stuck Pipe',
      depth: '3,890 m',
      severity: 'High',
      lossRate: 'N/A',
      description: 'Differential sticking following severe filtrate invasion into permeable sandstone face under high overbalance.',
    },
    frequentRisks: [
      {
        hazard: 'Stuck Pipe & Differential Sticking',
        count: 2,
        severityClass: 'si-count-badge--red',
        itemClass: '',
        depths: '3,850 m · 3,890 m',
        metric: '120 klb overpull / 6 hrs jarring',
        details: 'Thick filter cake buildup in permeable sandstone combined with 280 psi overbalance caused the bottom hole assembly (BHA) to differentially stick.',
      },
      {
        hazard: 'Torque & Drag Surges',
        count: 4,
        severityClass: 'si-count-badge--orange',
        itemClass: 'warning',
        depths: '3,810 m · 3,830 m · 3,870 m · 3,890 m',
        metric: 'Drag exceeded normal baseline by 45%',
        details: 'Spiral groove wear and heavy drag while reaming through lower Sandstone B transition beds.',
      },
      {
        hazard: 'Mud Filtrate Invasion',
        count: 2,
        severityClass: 'si-count-badge--amber',
        itemClass: 'moderate',
        depths: '3,845 m · 3,880 m',
        metric: 'Filtrate loss > 12 ml/30min API',
        details: 'Excessive cake permeability caused wall embedding and high friction factor.',
      },
    ],
    impactOnCurrentWell: {
      alertLevel: 'Elevated Differential Sticking Warning',
      mechanism: 'Shares lower Sandstone B overburden stress regime. Thick filter cake buildup in permeable sandstone combined with hydrostatic overbalance poses severe wall-sticking danger.',
      directThreats: [
        'Mechanical pack-off requiring jarring operations or side-track if drillstring remains stationary.',
        'Overpull limits exceeded during tripping out of hole through Sandstone B.',
      ],
      advisories: [
        'Keep API fluid loss strictly under 4 ml/30min to prevent spongy filter cake formation.',
        'Perform regular short wiper trips every 150 m drilled through Sandstone B.',
        'Enforce mandatory pipe reciprocation during all mud conditioning stops.',
      ],
    },
  },
  {
    id: 'W-183',
    name: 'W-183',
    category: 'geological',
    categoryLabel: 'Geologically Similar',
    lat: 58.528,
    lon: 2.015,
    distKm: 14.7,
    similarity: 86,
    formation: 'Sandstone B Interbedded',
    depth_m: 3760,
    incident: {
      type: 'Torque Spike',
      depth: '3,760 m',
      severity: 'High',
      lossRate: 'N/A',
      description: 'Hard cemented calcite nodules triggered 34 kft-lb torque fluctuations and stick-slip vibration.',
    },
    frequentRisks: [
      {
        hazard: 'Torque Spikes & Stick-Slip',
        count: 4,
        severityClass: 'si-count-badge--orange',
        itemClass: 'warning',
        depths: '3,740 m · 3,760 m · 3,795 m · 3,825 m',
        metric: 'Torque surges up to 34.2 kft-lb',
        details: 'Hard interbedded calcite lenses caused abrupt bit stalling, torsional drillstring whip, and top-drive motor overcurrent trips.',
      },
      {
        hazard: 'BHA Vibration & MWD Shock',
        count: 2,
        severityClass: 'si-count-badge--red',
        itemClass: '',
        depths: '3,765 m · 3,810 m',
        metric: 'Lateral shock > 18 G peak',
        details: 'Severe backward whirl damaged PDC cutter chamfers and caused telemetry downlink decoding failure.',
      },
      {
        hazard: 'Micro-Fracture Mud Losses',
        count: 1,
        severityClass: 'si-count-badge--amber',
        itemClass: 'moderate',
        depths: '3,780 m',
        metric: '45 bbl/hr dynamic loss',
        details: 'Induced tensile fracturing across hard-soft transition boundary.',
      },
    ],
    impactOnCurrentWell: {
      alertLevel: 'Direct Torsional & Lithology Hazard',
      mechanism: 'W-183 shares 86% geological facies with W-204 across the Sandstone B formation. The same tightly cemented calcite nodules identified at 3,740–3,825 m in W-183 dip directly into W-204’s active drilling corridor at 3,840–3,865 m.',
      directThreats: [
        'Sudden torque spikes exceeding 30 kft-lb leading to BHA connection fatigue and potential twist-off.',
        'Harmonic bit bounce and stick-slip degrading PDC bit life and slowing ROP by up to 55%.',
        'Downhole telemetry signal loss due to high-G axial and lateral vibrations in interbedded intervals.',
      ],
      advisories: [
        'Limit instantaneous WOB to 22 klb upon encountering stringer drilling breaks; avoid rapid set-down.',
        'Program top drive automated soft-torque / anti-stick-slip rotary control system before entering 3,840 m.',
        'Maintain continuous mud flow during reaming to suppress torsional stick-slip oscillations.',
      ],
    },
  },
];

export default function SpatialIntelligence({
  onNavigateToDashboard,
  onNavigateToLanding,
}) {
  const [activeNav, setActiveNav] = useState('Spatial Intelligence');
  const [selectedWell, setSelectedWell] = useState(CURRENT_WELL);
  const [hoveredWell, setHoveredWell] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('Central Basin · Block 15/9');
  const [detailModalWell, setDetailModalWell] = useState(null);
  const [cursorCoords, setCursorCoords] = useState({ lat: 58.435, lon: 1.902 });
  const [specsOpen, setSpecsOpen] = useState(true);
  const [risksOpen, setRisksOpen] = useState(true);

  // Layer Toggles
  const [layers, setLayers] = useState({
    currentWell: true,
    geographicMatches: true,
    geologicalMatches: true,
    historicalIncidents: true,
    riskZones: true,
  });

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const radiusCircleRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    let mounted = true;
    ensureLeaflet().then((L) => {
      if (mounted && L) setLeafletReady(true);
    });
    return () => { mounted = false; };
  }, []);

  // Filter visible wells based on active layer controls
  const visibleWells = useMemo(() => {
    return NEARBY_WELLS.filter((w) => {
      if (w.category === 'geographic' && !layers.geographicMatches) return false;
      if (w.category === 'geological' && !layers.geologicalMatches) return false;
      return true;
    });
  }, [layers]);

  // Reset or focus map handlers
  const handleLocateCurrent = useCallback(() => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.flyTo([CURRENT_WELL.lat, CURRENT_WELL.lon], 11, {
      duration: 1.2,
    });
    setSelectedWell(CURRENT_WELL);
  }, []);

  const handleResetView = useCallback(() => {
    if (!leafletMapRef.current) return;
    const all = [CURRENT_WELL, ...NEARBY_WELLS];
    const bounds = all.map((w) => [w.lat, w.lon]);
    leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }, []);

  const handleZoomIn = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
  };

  // Toggle specific layer
  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Select well handler
  const handleSelectWell = useCallback((well) => {
    setSelectedWell(well);
    if (leafletMapRef.current) {
      leafletMapRef.current.panTo([well.lat, well.lon], { animate: true, duration: 0.8 });
    }
  }, []);

  // Filter evidence buttons
  const handleFilterEvidence = (category) => {
    setLayers((prev) => ({
      ...prev,
      geographicMatches: category === 'geographic',
      geologicalMatches: category === 'geological',
    }));
    const targetWells = NEARBY_WELLS.filter((w) => w.category === category);
    if (targetWells.length > 0 && leafletMapRef.current) {
      const bounds = targetWells.map((w) => [w.lat, w.lon]);
      bounds.push([CURRENT_WELL.lat, CURRENT_WELL.lon]);
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [CURRENT_WELL.lat, CURRENT_WELL.lon],
        zoom: 11,
        minZoom: 6,
        maxZoom: 17,
        zoomControl: false,
      });

      // Realistic OpenStreetMap 2D map with roads, terrain boundaries, and field context
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · DrillSight Spatial Intelligence',
        maxZoom: 19,
      }).addTo(map);

      map.on('mousemove', (e) => {
        setCursorCoords({
          lat: +e.latlng.lat.toFixed(4),
          lon: +e.latlng.lng.toFixed(4),
        });
      });

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;
    setTimeout(() => map.invalidateSize(), 150);
  }, [leafletReady]);

  // Update Layers, Markers, Search Radius, and Connecting Lines
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current) return;
    const L = window.L;
    if (!L) return;
    const map = leafletMapRef.current;

    // 1. Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 2. Clear polylines
    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];

    // 3. Render Search Radius around W-204 (5 km)
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
      radiusCircleRef.current = null;
    }

    if (layers.currentWell && layers.riskZones) {
      radiusCircleRef.current = L.circle([CURRENT_WELL.lat, CURRENT_WELL.lon], {
        radius: 5000, // 5 km radius
        color: '#0066ee',
        weight: 1.8,
        dashArray: '6, 6',
        fillColor: '#0066ee',
        fillOpacity: 0.06,
      }).addTo(map);
    }

    // 4. Add Current Well W-204 marker
    if (layers.currentWell) {
      const isSelected = selectedWell.id === CURRENT_WELL.id;
      const currentIcon = L.divIcon({
        className: 'si-div-icon',
        html: `
          <div class="si-pin si-pin--active ${isSelected ? 'selected' : ''}">
            <div class="si-pin-ring"></div>
            <div class="si-pin-node si-node--current">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="si-pin-tag si-pin-tag--active">W-204 · Current Well</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const currentMarker = L.marker([CURRENT_WELL.lat, CURRENT_WELL.lon], {
        icon: currentIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      currentMarker.on('click', () => handleSelectWell(CURRENT_WELL));
      markersRef.current.push(currentMarker);
    }

    // 5. Add Nearby Wells markers
    visibleWells.forEach((w) => {
      const isSelected = selectedWell.id === w.id;
      const isGeo = w.category === 'geographic';
      const nodeClass = isGeo ? 'si-node--geo' : 'si-node--formation';
      const showIncident = layers.historicalIncidents && w.incident;

      const iconHtml = `
        <div class="si-pin ${isSelected ? 'selected' : ''}">
          <div class="si-pin-node ${nodeClass}">
            ${w.name.replace('W-', '')}
            ${showIncident ? `<div class="si-incident-badge" title="${w.incident.type}">!</div>` : ''}
          </div>
          <div class="si-pin-tag">${w.name} · ${w.distKm} km</div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'si-div-icon',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([w.lat, w.lon], { icon: markerIcon }).addTo(map);
      marker.on('click', () => handleSelectWell(w));
      markersRef.current.push(marker);
    });

    // 6. Draw dynamic connecting relationship line if a nearby well is selected
    if (selectedWell && selectedWell.id !== CURRENT_WELL.id) {
      const isGeo = selectedWell.category === 'geographic';
      const lineColor = isGeo ? '#0066ee' : '#d97706';

      const polyline = L.polyline(
        [
          [CURRENT_WELL.lat, CURRENT_WELL.lon],
          [selectedWell.lat, selectedWell.lon],
        ],
        {
          color: lineColor,
          weight: 2.2,
          dashArray: '5, 7',
          opacity: 0.9,
        }
      ).addTo(map);

      // Midpoint distance label
      const midLat = (CURRENT_WELL.lat + selectedWell.lat) / 2;
      const midLon = (CURRENT_WELL.lon + selectedWell.lon) / 2;

      const distLabel = L.marker([midLat, midLon], {
        icon: L.divIcon({
          className: 'si-dist-div',
          html: `<div style="background: #ffffff; border: 1.5px solid ${lineColor}; color: #0b1e36; padding: 2px 8px; border-radius: 5px; font-size: 0.7rem; font-weight: 800; transform: translate(-50%, -50%); white-space: nowrap; box-shadow: 0 2px 10px rgba(11, 30, 54, 0.15);">${selectedWell.distKm} km · ${selectedWell.similarity}% match</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        }),
      }).addTo(map);

      polylinesRef.current.push(polyline, distLabel);
    }
  }, [leafletReady, visibleWells, selectedWell, layers, handleSelectWell]);

  // Search filtered options
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const all = [CURRENT_WELL, ...NEARBY_WELLS];
    return all.filter((w) => w.name.toLowerCase().includes(query) || w.formation.toLowerCase().includes(query));
  }, [searchQuery]);

  return (
    <div className="spatial-page">
      {/* ── Top Bar ── */}
      <header className="si-topbar">
        <div className="si-topbar__left">
          {/* Brand */}
          <div className="si-brand" onClick={onNavigateToLanding} title="Return to Home">
            <div className="si-brand__icon">
              <Drill size={18} />
            </div>
            <div className="si-brand__title-row">
              <span className="si-brand__name">DRILLSIGHT</span>
              <span className="si-brand__subtitle">Nearby Wells Intelligence System</span>
            </div>
          </div>

          {/* Back to Home Button */}
          <button
            type="button"
            className="si-back-home-btn"
            onClick={onNavigateToLanding}
            title="Return to DrillSight Home Page"
          >
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Center: Search Fields */}
        <div className="si-topbar__center">
          <div className="si-search-box" style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search well (e.g. W-201, W-187)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginTop: 4,
                  zIndex: 2000,
                  boxShadow: '0 8px 24px rgba(11, 30, 54, 0.12)',
                  overflow: 'hidden',
                }}
              >
                {searchResults.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      handleSelectWell(w);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '9px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#0b1e36' }}>{w.name}</span>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{w.formation}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="si-search-box">
            <Compass size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search location..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="si-topbar__right">
          <div className="si-feed-status">
            <span className="si-feed-pulse" />
            <span>Live Spatial Feed Connected</span>
          </div>

          <div className="si-user-profile" title="Signed in as Iqra S.">
            <div className="si-avatar">I</div>
            <span className="si-username">Iqra S.</span>
          </div>
        </div>
      </header>

      {/* ── Main Workspace: Hero Map (75–80%) + Right Intelligence Panel (20–25%) ── */}
      <main className="si-workspace">
        {/* Map Container */}
        <div className="si-map-wrapper">
          <div ref={mapContainerRef} className="si-leaflet-container" />

          {/* Floating Controls HUD: Layer Filters + Map Tools */}
          <div className="si-map-hud">
            {/* Layer Control Card */}
            <div className="si-layer-card">
              <div className="si-layer-card__header">
                <span className="si-layer-card__title">
                  <Layers size={13} />
                  <span>Map Layers</span>
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>5 Active</span>
              </div>

              <div className="si-layer-list">
                <label className="si-layer-item">
                  <input
                    type="checkbox"
                    checked={layers.currentWell}
                    onChange={() => toggleLayer('currentWell')}
                  />
                  <span className="si-dot-badge si-dot--current" />
                  <span>Current Well (W-204)</span>
                </label>

                <label className="si-layer-item">
                  <input
                    type="checkbox"
                    checked={layers.geographicMatches}
                    onChange={() => toggleLayer('geographicMatches')}
                  />
                  <span className="si-dot-badge si-dot--geo" />
                  <span>Geographic Matches (🔵)</span>
                </label>

                <label className="si-layer-item">
                  <input
                    type="checkbox"
                    checked={layers.geologicalMatches}
                    onChange={() => toggleLayer('geologicalMatches')}
                  />
                  <span className="si-dot-badge si-dot--formation" />
                  <span>Geological Matches (🟡)</span>
                </label>

                <label className="si-layer-item">
                  <input
                    type="checkbox"
                    checked={layers.historicalIncidents}
                    onChange={() => toggleLayer('historicalIncidents')}
                  />
                  <span className="si-dot-badge si-dot--incident" />
                  <span>Historical Incidents (🔴)</span>
                </label>

                <label className="si-layer-item">
                  <input
                    type="checkbox"
                    checked={layers.riskZones}
                    onChange={() => toggleLayer('riskZones')}
                  />
                  <span className="si-dot-badge si-dot--radius" />
                  <span>Risk Zones (5 km Radius)</span>
                </label>
              </div>
            </div>

            {/* Map Action Tools */}
            <div className="si-tools-group">
              <button
                type="button"
                className="si-tool-btn"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                className="si-tool-btn"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="si-tool-btn"
                onClick={handleLocateCurrent}
                title="Locate Current Well (W-204)"
              >
                <Crosshair size={15} />
              </button>
              <button
                type="button"
                className="si-tool-btn"
                onClick={handleResetView}
                title="Reset View"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* Bottom Coordinates & Scale HUD */}
          <div className="si-map-footer-hud">
            <div className="si-hud-chip">
              <span>LAT:</span> {cursorCoords.lat}° N
            </div>
            <div className="si-hud-chip">
              <span>LON:</span> {cursorCoords.lon}° E
            </div>
            <div className="si-hud-chip">
              <span>DATUM:</span> WGS 84 / UTM 31N
            </div>
            <div className="si-hud-chip">
              <span>RADIUS:</span> 5.0 km
            </div>
          </div>
        </div>

        {/* ── Right-Side Intelligence Panel (20–25%) ── */}
        <aside className="si-panel">
          {selectedWell.id === CURRENT_WELL.id ? (
            /* W-204 Active Well Mode */
            <>
              {/* Header */}
              <div className="si-panel__header">
                <div className="si-well-title-row">
                  <div className="si-well-title">
                    <span className="si-well-name">W-204</span>
                    <span className="si-live-badge">
                      <span className="si-feed-pulse" style={{ width: 5, height: 5 }} />
                      LIVE
                    </span>
                  </div>
                  <span className="si-type-badge si-type-badge--geo">Active Wellbore</span>
                </div>

                <div className="si-well-specs">
                  <div className="si-spec-box">
                    <div className="si-spec-label">Current Depth</div>
                    <div className="si-spec-val">3,842 m</div>
                  </div>
                  <div className="si-spec-box">
                    <div className="si-spec-label">Formation</div>
                    <div className="si-spec-val">Sandstone B</div>
                  </div>
                </div>
              </div>

              {/* RISK ZONE */}
              <div className="si-panel__section">
                <div className="si-section-header">
                  <span className="si-section-title">
                    <ShieldAlert size={14} color="#ef4444" />
                    <span>Risk Zone</span>
                  </span>
                </div>

                <div className="si-risk-card">
                  <div className="si-risk-top">
                    <span className="si-risk-badge">HIGH RISK</span>
                    <span className="si-risk-confidence">78% confidence</span>
                  </div>
                  <div className="si-risk-hazard">Lost Circulation</div>
                  <div className="si-risk-interval">Depth Interval: 3,780–3,920 m</div>
                </div>

                {/* Why is this predicted? */}
                <div className="si-why-box">
                  <div className="si-why-title">
                    <Info size={14} color="#38bdf8" />
                    <span>Why is this predicted?</span>
                  </div>
                  <ul className="si-why-list">
                    <li className="si-why-item">3 geographically similar wells experienced lost circulation</li>
                    <li className="si-why-item">2 geological matches reported mud loss</li>
                    <li className="si-why-item">Similar formation characteristics in Sandstone B</li>
                    <li className="si-why-item">Consistent historical pattern in this structural block</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="si-action-btns">
                  <button
                    type="button"
                    className="si-btn-primary"
                    onClick={() => handleFilterEvidence('geographic')}
                  >
                    <Activity size={14} />
                    <span>View Geographic Evidence</span>
                  </button>

                  <button
                    type="button"
                    className="si-btn-secondary"
                    onClick={() => handleFilterEvidence('geological')}
                  >
                    <Layers size={14} />
                    <span>View Geological Evidence</span>
                  </button>
                </div>
              </div>

              {/* Surrounding Cluster Summary */}
              <div className="si-panel__section" style={{ borderBottom: 'none' }}>
                <div className="si-section-header">
                  <span className="si-section-title">
                    <Activity size={14} color="#38bdf8" />
                    <span>Spatial Cluster Breakdown</span>
                  </span>
                </div>

                <div className="si-detail-card">
                  <div className="si-detail-row">
                    <span className="si-detail-key">🔵 Geographic Matches</span>
                    <span className="si-detail-val">3 wells (W-187, W-201, W-198)</span>
                  </div>
                  <div className="si-detail-row">
                    <span className="si-detail-key">🟡 Geological Matches</span>
                    <span className="si-detail-val">3 wells (W-176, W-192, W-183)</span>
                  </div>
                  <div className="si-detail-row">
                    <span className="si-detail-key">🔴 Historical Incidents</span>
                    <span className="si-detail-val" style={{ color: '#ef4444' }}>4 events documented</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Nearby Well Selected Mode — Matching Target Design Exactly */
            <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              {/* Top Header Row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Rig Icon Container */}
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0066ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M5 22h14M7 17h10M8 12h8M9 7h6M7 22l5-20 5 20" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                      {selectedWell.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginTop: 3 }}>
                      Offset Well
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: selectedWell.category === 'geographic' ? '#eff6ff' : '#fef3c7',
                      border: `1px solid ${selectedWell.category === 'geographic' ? '#bfdbfe' : '#fde68a'}`,
                      color: selectedWell.category === 'geographic' ? '#0066ee' : '#b45309',
                      borderRadius: 20,
                      padding: '5px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'default',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <MapPin size={13} />
                    <span>{selectedWell.category === 'geographic' ? 'Geographically Similar' : 'Geologically Similar'}</span>
                    <ChevronRight size={13} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedWell(CURRENT_WELL)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                    }}
                    title="Close and return to active well"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Two Metric Cards Side-by-Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {/* Left Card: Match % with Donut Ring */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(11, 30, 54, 0.04)',
                }}>
                  <DonutRing percentage={selectedWell.similarity} size={46} strokeWidth={5.5} />
                  <div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                      {selectedWell.similarity}%
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {selectedWell.category === 'geographic' ? 'Geographic Match' : 'Geological Match'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3, marginTop: 2 }}>
                      {selectedWell.category === 'geographic'
                        ? 'High similarity in location and field characteristics'
                        : 'High similarity in formation stratigraphy'}
                    </div>
                  </div>
                </div>

                {/* Right Card: Distance with Map Pin */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(11, 30, 54, 0.04)',
                }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <MapPin size={20} color="#0066ee" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                      {selectedWell.distKm} km
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      Distance to W-204
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Within search radius
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: OFFSET WELL SPECIFICATIONS */}
              <div style={{ marginBottom: 16 }}>
                <div
                  onClick={() => setSpecsOpen(!specsOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color="#0066ee" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                      OFFSET WELL SPECIFICATIONS
                    </span>
                  </div>
                  {specsOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </div>

                {specsOpen && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '0 16px',
                    boxShadow: '0 1px 3px rgba(11, 30, 54, 0.04)',
                  }}>
                    {/* Row 1: Total Depth */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>Total Depth</span>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {selectedWell.depth_m.toLocaleString()} m
                      </span>
                    </div>

                    {/* Row 2: Target Stratigraphy */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
                        <Layers size={16} />
                        <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>Target Stratigraphy</span>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {selectedWell.formation}
                      </span>
                    </div>

                    {/* Row 3: Spatial Distance */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
                        <MapPin size={16} />
                        <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>Spatial Distance</span>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {selectedWell.distKm} km offset
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: FREQUENTLY OCCURRED RISKS */}
              <div style={{ marginBottom: 16 }}>
                <div
                  onClick={() => setRisksOpen(!risksOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={17} color="#ea580c" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                      FREQUENTLY OCCURRED RISKS
                    </span>
                  </div>
                  {risksOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </div>

                {risksOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedWell.frequentRisks && selectedWell.frequentRisks.map((risk, idx) => {
                      const isMud = risk.hazard.toLowerCase().includes('mud') || risk.hazard.toLowerCase().includes('seepage');
                      const borderColor = isMud ? '#ea580c' : '#ef4444';
                      const iconBg = isMud ? '#fff7ed' : '#fef2f2';
                      const iconColor = isMud ? '#ea580c' : '#ef4444';

                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: '11px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(11, 30, 54, 0.03)',
                            cursor: 'default',
                          }}
                        >
                          {/* Colored left strip */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            background: borderColor,
                          }} />

                          {/* Icon box */}
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            marginLeft: 4,
                            flexShrink: 0,
                          }}>
                            {isMud ? (
                              <Droplets size={18} color={iconColor} />
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v20M5 22h14M7 17h10M8 12h8M9 7h6M7 22l5-20 5 20" />
                              </svg>
                            )}
                          </div>

                          {/* Risk details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {risk.hazard}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Depths: {risk.depths}
                            </div>
                          </div>

                          {/* Count badge */}
                          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 10, flexShrink: 0 }}>
                            <span style={{
                              background: '#fef2f2',
                              color: '#ef4444',
                              border: '1px solid #fecaca',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: 20,
                              whiteSpace: 'nowrap',
                            }}>
                              {risk.count}× Occurred
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 3: IMPACT ON W-204 (CURRENT WELL) */}
              {selectedWell.impactOnCurrentWell && (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Lightbulb size={17} color="#0066ee" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0066ee', letterSpacing: '0.04em' }}>
                      IMPACT ON W-204 (CURRENT WELL)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                    {selectedWell.impactOnCurrentWell.mechanism}
                  </p>
                </div>
              )}

              {/* Action Button: View Risk & Impact Profile */}
              <div>
                <button
                  type="button"
                  onClick={() => setDetailModalWell(selectedWell)}
                  style={{
                    width: '100%',
                    height: 46,
                    background: '#0066ee',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 102, 238, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0052cc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0066ee'; }}
                >
                  <ExternalLink size={16} style={{ marginRight: 8 }} />
                  <span style={{ fontWeight: 800, fontSize: '0.86rem' }}>View Risk & Impact Profile</span>
                  <ChevronRight size={18} style={{ marginLeft: 'auto' }} />
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* ── Modal for Offset Intelligence Profile (Frequently Occurred Risks & Impact on W-204) ── */}
      {detailModalWell && (
        <div className="si-modal-overlay" onClick={() => setDetailModalWell(null)}>
          <div className="si-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="si-modal-header">
              <div className="si-modal-title-group">
                <div className="si-modal-title">
                  <span>{detailModalWell.name} · Offset Intelligence Profile</span>
                </div>
                <div className="si-modal-subheading">
                  <span
                    className={`si-modal-badge ${
                      detailModalWell.category === 'geographic'
                        ? 'si-modal-badge--geo'
                        : 'si-modal-badge--formation'
                    }`}
                  >
                    {detailModalWell.categoryLabel}
                  </span>
                  <span>•</span>
                  <span><strong>{detailModalWell.similarity}%</strong> Similarity</span>
                  <span>•</span>
                  <span><strong>{detailModalWell.distKm} km</strong> offset from W-204</span>
                  <span>•</span>
                  <span>Total Depth: <strong>{detailModalWell.depth_m} m</strong></span>
                  <span>•</span>
                  <span>{detailModalWell.formation}</span>
                </div>
              </div>
              <button
                type="button"
                className="si-modal-close-btn"
                onClick={() => setDetailModalWell(null)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="si-modal-body">
              {/* SECTION 1: Frequently Occurred Risks in That Well */}
              <div>
                <div className="si-modal-section-title">
                  <AlertTriangle size={16} color="#ef4444" />
                  <span>Frequently Occurred Risks in {detailModalWell.name}</span>
                </div>

                <div className="si-risk-freq-list">
                  {detailModalWell.frequentRisks && detailModalWell.frequentRisks.map((item, idx) => (
                    <div key={idx} className={`si-risk-freq-item ${item.itemClass || ''}`}>
                      <div className="si-risk-freq-top">
                        <span className="si-risk-freq-title">
                          <span>{item.hazard}</span>
                        </span>
                        <span className={`si-risk-count-badge ${item.severityClass || 'si-count-badge--red'}`}>
                          {item.count}× Occurred
                        </span>
                      </div>
                      <div className="si-risk-freq-meta">
                        <span>Depths: <strong>{item.depths}</strong></span>
                        <span>•</span>
                        <span>Severity Metric: <strong>{item.metric}</strong></span>
                      </div>
                      <div className="si-risk-freq-desc">
                        {item.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: How is it Affecting Our Current Well (W-204 @ 3,842 m)? */}
              {detailModalWell.impactOnCurrentWell && (
                <div>
                  <div className="si-modal-section-title">
                    <ShieldAlert size={16} color="#0066ee" />
                    <span>How This Affects Our Current Well (W-204 @ 3,842 m)</span>
                  </div>

                  <div className="si-impact-card">
                    <div className="si-impact-header">
                      <div className="si-impact-heading">
                        <Activity size={16} />
                        <span>Offset Risk Transmission Analysis</span>
                      </div>
                      <span className="si-impact-alert-pill">
                        {detailModalWell.impactOnCurrentWell.alertLevel}
                      </span>
                    </div>

                    <div className="si-impact-mechanism">
                      {detailModalWell.impactOnCurrentWell.mechanism}
                    </div>

                    <div className="si-impact-points-title">Direct Threats to W-204 at Current Depth:</div>
                    <ul className="si-impact-list">
                      {detailModalWell.impactOnCurrentWell.directThreats.map((threat, i) => (
                        <li key={i} className="si-impact-item">{threat}</li>
                      ))}
                    </ul>

                    <div className="si-advisories-box">
                      <div className="si-advisories-title">
                        <Info size={14} />
                        <span>Recommended Operational Mitigations for W-204:</span>
                      </div>
                      <ul className="si-advisories-list">
                        {detailModalWell.impactOnCurrentWell.advisories.map((adv, i) => (
                          <li key={i} className="si-advisory-item">{adv}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="si-modal-footer">
              <button
                type="button"
                className="si-btn-primary"
                onClick={() => setDetailModalWell(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
