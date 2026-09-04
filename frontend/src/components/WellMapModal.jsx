import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  AlertTriangle,
  X,
  MapPin,
} from 'lucide-react';
import Modal from './Modal';

// Haversine formula for distance and bearing
function getDistanceAndBearing(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const compassDir = directions[Math.round(brng / 22.5) % 16];

  return {
    distKm: d,
    bearing: compassDir,
  };
}

const HAZARD_LABELS = {
  stuck_pipe: 'Stuck Pipe',
  kick_influx: 'Kick / Influx',
  lost_circulation: 'Lost Circulation',
  excessive_vibration: 'Vibration',
  normal: 'Normal Operations',
};

const HAZARD_COLORS = {
  stuck_pipe: '#ef4444',
  kick_influx: '#f59e0b',
  lost_circulation: '#d97706',
  excessive_vibration: '#8b5cf6',
  normal: '#10b981',
};

// Dynamic one-liner explaining relationship between the hovered well and active drilling
function getDynamicRelationship(well, currentRisk) {
  if (!well) return '';
  const hazard = currentRisk || well.risk_type || 'normal';
  const dist = well.distText || (well.distKm ? `${well.distKm.toFixed(1)} km away` : 'nearby');

  if (well.category === 'main') {
    return 'Active drilling location under continuous real-time telemetry surveillance for downhole hazard onset.';
  }

  if (well.category === 'geographic') {
    switch (hazard) {
      case 'kick_influx':
        return `Adjacent Volve well (${dist}) — encountered gas influx and sudden pressure surge in the high-permeability Hugin zone.`;
      case 'lost_circulation':
        return `Direct offset in Block 15/9 (${dist}) — experienced total mud returns loss into naturally fractured Hugin sands.`;
      case 'stuck_pipe':
        return `Direct Volve cluster sister (${dist}) — suffered differential sticking under elevated torque and drag profiles.`;
      case 'excessive_vibration':
        return `Adjacent Volve wellbore (${dist}) — sustained damaging BHA shock and lateral drillstring resonance in this section.`;
      default:
        return `Offset well in the same Volve block (${dist}) — provides direct local baseline telemetry for current drilling.`;
    }
  }

  // Geological sister
  switch (hazard) {
    case 'kick_influx':
      return `Stratigraphic analog sharing identical ${well.formation} depositional facies, where pore pressure exceeded mud weight.`;
    case 'lost_circulation':
      return `Penetrated matching subsea reservoir sandstones where formation breakdown gradient led to lost circulation.`;
    case 'stuck_pipe':
      return `Shares analogous overburden stress and reactive shale stratigraphy, leading to tight hole and drillstring pack-off.`;
    case 'excessive_vibration':
      return `Drilled through equivalent hard interbedded stringers that caused severe stick-slip and bit bounce.`;
    default:
      return `Regional geological analog with equivalent rock mechanics, lithology, and reservoir pressure characteristics.`;
  }
}

// Dynamically ensure Leaflet is loaded
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

export default function WellMapModal({
  open,
  onClose,
  wells = [],
  params = {},
  riskType = 'normal',
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'geographic' | 'geological'
  const [hoveredWell, setHoveredWell] = useState(null);
  const [selectedWell, setSelectedWell] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  const currentDepth = params?.depth ? Math.round(params.depth) : 3200;
  const targetHazard = riskType || 'normal';

  // 1. Define Main Well (Volve 15/9-F-14)
  const mainWell = useMemo(() => ({
    id: 'main_rig',
    well_name: 'Well_Real_Volve',
    display_name: 'Well 15/9-F-14 (Active Well)',
    category: 'main',
    categoryLabel: 'Active Wellbore',
    lat: 58.435,
    lon: 1.902,
    formation: 'Hugin / Sleipner',
    field: 'Volve Field, Block 15/9',
    country: 'Norway',
    depth_m: currentDepth,
    risk_type: targetHazard,
    color: '#0284c7', // Blue Rig
    badgeClass: 'badge--main',
    waterDepth: '80 m (Mærsk Inspirer)',
  }), [currentDepth, targetHazard]);

  // 2. Define Geographically Similar Wells (RED PINS)
  const geographicWells = useMemo(() => [
    {
      id: 'geo_1',
      well_name: 'Well_Geo_Sister_1',
      display_name: 'Well 15/9-F-12',
      category: 'geographic',
      categoryLabel: 'Geographically Similar',
      lat: 58.421,
      lon: 1.875,
      formation: 'Hugin Sandstone',
      field: 'Volve Field, North Sea',
      country: 'Norway',
      depth_m: Math.max(200, currentDepth - 18),
      risk_type: targetHazard,
      color: '#ef4444', // RED PIN
      badgeClass: 'badge--geographic',
      waterDepth: '82 m',
    },
    {
      id: 'geo_2',
      well_name: 'Well_Geo_Sister_2',
      display_name: 'Well 15/9-F-15 A',
      category: 'geographic',
      categoryLabel: 'Geographically Similar',
      lat: 58.448,
      lon: 1.931,
      formation: 'Hugin Sandstone',
      field: 'Volve Field, North Sea',
      country: 'Norway',
      depth_m: Math.max(200, currentDepth + 24),
      risk_type: targetHazard,
      color: '#ef4444', // RED PIN
      badgeClass: 'badge--geographic',
      waterDepth: '80 m',
    },
    {
      id: 'geo_3',
      well_name: 'Well_Geo_Sister_3',
      display_name: 'Well 15/9-F-11 B',
      category: 'geographic',
      categoryLabel: 'Geographically Similar',
      lat: 58.410,
      lon: 1.862,
      formation: 'Hugin / Skagerrak',
      field: 'Volve Field, North Sea',
      country: 'Norway',
      depth_m: Math.max(200, currentDepth - 32),
      risk_type: targetHazard,
      color: '#ef4444', // RED PIN
      badgeClass: 'badge--geographic',
      waterDepth: '84 m',
    },
  ], [currentDepth, targetHazard]);

  // 3. Define Geologically Similar Wells (GREEN PINS)
  const geologicalWells = useMemo(() => [
    {
      id: 'form_1',
      well_name: 'Well_Formation_Sister_1',
      display_name: 'Well 15/9-F-1 C',
      category: 'geological',
      categoryLabel: 'Geologically Similar',
      lat: 57.984,
      lon: 2.251,
      formation: 'Hugin / Skagerrak',
      field: 'Volve Area, North Sea',
      country: 'Norway',
      depth_m: Math.max(200, currentDepth + 15),
      risk_type: targetHazard,
      color: '#22c55e', // GREEN PIN
      badgeClass: 'badge--geological',
      waterDepth: '90 m',
    },
    {
      id: 'form_2',
      well_name: 'Well_Formation_Sister_2',
      display_name: 'Well 15/9-F-5',
      category: 'geological',
      categoryLabel: 'Geologically Similar',
      lat: 57.901,
      lon: 2.135,
      formation: 'Hugin Sandstone',
      field: 'Volve Area, North Sea',
      country: 'Norway',
      depth_m: Math.max(200, currentDepth - 24),
      risk_type: targetHazard,
      color: '#22c55e', // GREEN PIN
      badgeClass: 'badge--geological',
      waterDepth: '88 m',
    },
    {
      id: 'form_3',
      well_name: 'Well_Formation_Sister_3',
      display_name: 'Well 15/9-F-4',
      category: 'geological',
      categoryLabel: 'Geologically Similar',
      lat: 57.742,
      lon: 1.989,
      formation: 'Hugin Sandstone',
      field: 'Volve Area, North Sea',
      country: 'Norway',
      depth_m: Math.max(200, currentDepth + 31),
      risk_type: targetHazard,
      color: '#22c55e', // GREEN PIN
      badgeClass: 'badge--geological',
      waterDepth: '85 m',
    },
  ], [currentDepth, targetHazard]);

  // Combine and calculate distances
  const allWells = useMemo(() => {
    const list = [mainWell, ...geographicWells, ...geologicalWells];
    return list.map((w) => {
      if (w.id === 'main_rig') {
        return { ...w, distText: 'Active Rig Site' };
      }
      const { distKm, bearing } = getDistanceAndBearing(
        mainWell.lat,
        mainWell.lon,
        w.lat,
        w.lon
      );
      const formattedDist =
        distKm < 5 ? `${distKm.toFixed(1)} km ${bearing}` : `${Math.round(distKm)} km ${bearing}`;
      return {
        ...w,
        distKm,
        bearing,
        distText: `${formattedDist} of active rig`,
      };
    });
  }, [mainWell, geographicWells, geologicalWells]);

  // Filtered wells
  const visibleWells = useMemo(() => {
    if (filter === 'geographic') {
      return allWells.filter((w) => w.category === 'main' || w.category === 'geographic');
    }
    if (filter === 'geological') {
      return allWells.filter((w) => w.category === 'main' || w.category === 'geological');
    }
    return allWells;
  }, [allWells, filter]);

  // Load Leaflet library dynamically
  useEffect(() => {
    let isMounted = true;
    ensureLeaflet().then((L) => {
      if (isMounted && L) {
        setLeafletLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize and update Leaflet map
  useEffect(() => {
    if (!open || !leafletLoaded || !mapContainerRef.current) {
      return;
    }

    const L = window.L;
    if (!L) return;

    if (!leafletMapRef.current) {
      // Create OpenLeaf / Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: [58.15, 2.05],
        zoom: 8,
        minZoom: 5,
        maxZoom: 16,
        zoomControl: false,
      });

      // OpenStreetMap tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Invalidate size once open to ensure all tiles render crisp and aligned
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers
    const bounds = [];

    visibleWells.forEach((w) => {
      bounds.push([w.lat, w.lon]);

      let iconHtml = '';
      if (w.category === 'main') {
        // Main Well: Distinct Blue rig marker with pulsing ring
        iconHtml = `
          <div class="map-pin map-pin--main" title="${w.display_name}">
            <div class="map-pin__pulse map-pin__pulse--blue"></div>
            <div class="map-pin__core map-pin__core--blue">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <span class="map-pin__label map-pin__label--main">15/9-F-14 (Main)</span>
          </div>
        `;
      } else if (w.category === 'geographic') {
        // Geographic: RED PIN
        iconHtml = `
          <div class="map-pin map-pin--geo" title="${w.display_name}">
            <div class="map-pin__pulse map-pin__pulse--red"></div>
            <div class="map-pin__core map-pin__core--red">
              <div class="map-pin__dot"></div>
            </div>
            <span class="map-pin__label map-pin__label--geo">${w.display_name.replace('Well ', '')}</span>
          </div>
        `;
      } else {
        // Geological: GREEN PIN
        iconHtml = `
          <div class="map-pin map-pin--form" title="${w.display_name}">
            <div class="map-pin__pulse map-pin__pulse--green"></div>
            <div class="map-pin__core map-pin__core--green">
              <div class="map-pin__dot"></div>
            </div>
            <span class="map-pin__label map-pin__label--form">${w.display_name.replace('Well ', '')}</span>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-map-div-icon',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([w.lat, w.lon], { icon: customIcon }).addTo(map);

      marker.on('mouseover', () => {
        setHoveredWell(w);
      });
      marker.on('mouseout', () => {
        setHoveredWell(null);
      });
      marker.on('click', () => {
        setSelectedWell(w);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [65, 65],
        maxZoom: 10,
      });
    }

    return () => {
      if (!open && leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [open, leafletLoaded, visibleWells]);

  // Cleanup on modal close
  useEffect(() => {
    if (!open) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      setHoveredWell(null);
      setSelectedWell(null);
    }
  }, [open]);

  const activeInfoWell = hoveredWell || selectedWell || mainWell;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Offshore Well Location & Analog Offset Map"
      hideHeader
      hideClose
      className="modal--map-dossier"
    >
      <div className="well-map-dossier well-map-dossier--light">
        {/* 1. Light Header Bar */}
        <div className="well-map-header">
          <div className="well-map-header__title-area">
            <div className="well-map-header__icon">
              <Compass size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className="well-map-header__pill">NORTH SEA GEOSPATIAL INTELLIGENCE</div>
              <h2 className="well-map-header__heading">
                Offshore Well Location &amp; Analog Offset Map
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="well-map-close-btn"
            onClick={onClose}
            aria-label="Close Map"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Light Toolbar & Legend */}
        <div className="well-map-toolbar">
          {/* Legend Items */}
          <div className="well-map-legend">
            <div className="well-map-legend__item">
              <span className="legend-dot legend-dot--main" />
              <span className="legend-label">
                <strong>Main Well:</strong> 15/9-F-14 (Blue)
              </span>
            </div>
            <div className="well-map-legend__item">
              <span className="legend-dot legend-dot--geo" />
              <span className="legend-label">
                <strong>Geographic Sisters:</strong> 3 Wells <span className="legend-highlight--red">(Red Pins)</span>
              </span>
            </div>
            <div className="well-map-legend__item">
              <span className="legend-dot legend-dot--form" />
              <span className="legend-label">
                <strong>Geological Sisters:</strong> 3 Wells <span className="legend-highlight--green">(Green Pins)</span>
              </span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="well-map-filters">
            <button
              type="button"
              className={`map-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({allWells.length})
            </button>
            <button
              type="button"
              className={`map-filter-btn map-filter-btn--red ${filter === 'geographic' ? 'active' : ''}`}
              onClick={() => setFilter('geographic')}
            >
              Geographic (3)
            </button>
            <button
              type="button"
              className={`map-filter-btn map-filter-btn--green ${filter === 'geological' ? 'active' : ''}`}
              onClick={() => setFilter('geological')}
            >
              Geological (3)
            </button>
          </div>
        </div>

        {/* 3. Main Body */}
        <div className="well-map-body">
          {/* MAP CANVAS VIEWPORT */}
          <div className="well-map-viewport">
            <div
              ref={mapContainerRef}
              className="well-map-leaflet-container"
              style={{ width: '100%', height: '100%', background: '#f8fafc' }}
            />

            {/* FLOATING HOVER CARD (LIGHT THEME) */}
            {activeInfoWell && (
              <div className="well-map-hover-card">
                <div className="hover-card__header">
                  <span className={`hover-card__badge ${activeInfoWell.badgeClass}`}>
                    {activeInfoWell.categoryLabel}
                  </span>
                  <span className="hover-card__dist">{activeInfoWell.distText}</span>
                </div>

                <div className="hover-card__well-title">
                  {activeInfoWell.display_name}
                </div>

                <div className="hover-card__coords">
                  <Navigation size={13} color="#0284c7" />
                  <span>
                    {activeInfoWell.lat.toFixed(4)}°N, {activeInfoWell.lon.toFixed(4)}°E
                  </span>
                  <span className="hover-card__country">&bull; {activeInfoWell.country}</span>
                </div>

                {/* Dynamic Correlation One-Liner */}
                <div className="hover-card__relation">
                  <span className="hover-card__relation-label">CORRELATION / RELEVANCE</span>
                  <p className="hover-card__relation-text">
                    {getDynamicRelationship(activeInfoWell, riskType)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* LIGHT SIDEBAR WELL DIRECTORY */}
          <div className="well-map-sidebar">
            <div className="well-map-sidebar__header">
              <span>ACTIVE RIG &amp; SISTER ANALOGS ({visibleWells.length})</span>
            </div>

            <div className="well-map-list">
              {visibleWells.map((w) => {
                const isSelected = activeInfoWell.id === w.id;
                return (
                  <div
                    key={w.id}
                    className={`well-map-item ${isSelected ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredWell(w)}
                    onMouseLeave={() => setHoveredWell(null)}
                    onClick={() => {
                      setSelectedWell(w);
                      if (leafletMapRef.current) {
                        leafletMapRef.current.setView([w.lat, w.lon], 9, { animate: true });
                      }
                    }}
                  >
                    <div className="well-map-item__top">
                      <span
                        className="well-map-item__dot"
                        style={{ background: w.color }}
                      />
                      <strong className="well-map-item__name">{w.display_name}</strong>
                      <span className={`well-map-item__pill ${w.badgeClass}`}>
                        {w.category === 'main'
                          ? 'Main'
                          : w.category === 'geographic'
                          ? 'Geographic'
                          : 'Geological'}
                      </span>
                    </div>

                    <div className="well-map-item__meta">
                      <span>{w.formation}</span>
                      <span>&bull;</span>
                      <span>{w.depth_m.toLocaleString()} m</span>
                    </div>

                    <div className="well-map-item__coords">
                      {w.lat.toFixed(3)}°N, {w.lon.toFixed(3)}°E ({w.distText})
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="well-map-sidebar__footer">
              <button
                type="button"
                className="well-map-btn-close"
                onClick={onClose}
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
