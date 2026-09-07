import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Drill,
  ArrowLeft,
  Compass,
  Layers,
  Eye,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Activity,
  Sliders,
  Sparkles,
  BookOpen,
  MapPin,
  Flame,
  Droplets,
  Zap,
  Target,
  FileText,
  X,
  Search,
  Bell,
  Box,
  ExternalLink,
  ShieldCheck,
  Navigation
} from 'lucide-react';
import UnifiedNavbar from './UnifiedNavbar';
import '../trajectory.css';

// ── Survey Station & Well Data ────────────────────────────────────────────────
// Scaled for 3D Geological Block:
// Block dimensions: X: 220 units wide (-110 to 110), Z: 160 units deep (-80 to 80), Y: 0 at surface to -180 at 5,000m depth
// Conversion: Y = -(MD / 5000) * 180

const FORMATIONS = [
  { name: 'Nordland Group', topMD: 0, bottomMD: 1050, topY: 0, bottomY: -37.8, color: '#475569', uiColor: '#f1f5f9', pct: 21 },
  { name: 'Hordaland Group', topMD: 1050, bottomMD: 2150, topY: -37.8, bottomY: -77.4, color: '#b5a88e', uiColor: '#fef3c7', pct: 22 },
  { name: 'Heimdal Fm', topMD: 2150, bottomMD: 2500, topY: -77.4, bottomY: -90.0, color: '#94a3b8', uiColor: '#e0f2fe', pct: 7 },
  { name: 'Shetland Chalk', topMD: 2500, bottomMD: 3250, topY: -90.0, bottomY: -117.0, color: '#cbd5e1', uiColor: '#e2e8f0', pct: 15 },
  { name: 'Hugin Reservoir', topMD: 3250, bottomMD: 3950, topY: -117.0, bottomY: -142.2, color: '#d97706', uiColor: '#fef08a', pct: 21, isTarget: true },
  { name: 'Skagerrak Fm', topMD: 3950, bottomMD: 5000, topY: -142.2, bottomY: -180.0, color: '#1e293b', uiColor: '#dbeafe', pct: 14 }
];

const WELLS_DATA = [
  {
    id: '15/9-F-14',
    name: '15/9-F-14',
    color: '#06b6d4', // Cyan
    surfacePos: [-75, 0, 15],
    totalMD: 4200,
    stations: [
      [-75, 0, 15],
      [-74, -36, 14],
      [-70, -78, 12],
      [-65, -115, 8],
      [-62, -145, 6]
    ]
  },
  {
    id: '15/9-F-15 A',
    name: '15/9-F-15 A',
    color: '#eab308', // Gold / Yellow
    surfacePos: [-40, 0, -20],
    totalMD: 4500,
    stations: [
      [-40, 0, -20],
      [-40, -36, -20],
      [-39, -78, -19],
      [-38, -120, -18],
      [-37, -162, -16]
    ]
  },
  {
    id: '15/9-F-12',
    name: '15/9-F-12',
    isCurrent: true,
    color: '#0066ee', // Royal Blue
    surfacePos: [0, 0, 0],
    currentMD: 3842,
    totalMD: 5000,
    location: 'Volve Field, Block 15/9, North Sea',
    inclination: 67,
    azimuth: 142,
    formation: 'Hugin Formation (Reservoir)',
    targetDepth: 4250,
    stations: [
      [0, 0, 0],
      [1, -36, 2],
      [4, -72, 8],
      [10, -108, 18],
      [16, -138.3, 26], // 3,842m active bit in Hugin Sandstone
      [22, -180, 34]    // 5,000m planned TD
    ]
  },
  {
    id: '15/9-F-11 B',
    name: '15/9-F-11 B',
    color: '#f97316', // Orange
    surfacePos: [40, 0, 10],
    totalMD: 4200,
    stations: [
      [40, 0, 10],
      [42, -36, 12],
      [45, -78, 16],
      [49, -125, 22],
      [52, -151, 26]
    ]
  },
  {
    id: '15/9-F-1 C',
    name: '15/9-F-1 C',
    color: '#10b981', // Emerald Green
    surfacePos: [65, 0, -15],
    totalMD: 4600,
    stations: [
      [65, 0, -15],
      [66, -36, -14],
      [69, -80, -11],
      [73, -128, -7],
      [76, -165, -3]
    ]
  },
  {
    id: '15/9-F-5',
    name: '15/9-F-5',
    color: '#a855f7', // Purple
    surfacePos: [90, 0, 25],
    totalMD: 3900,
    stations: [
      [90, 0, 25],
      [89, -36, 26],
      [87, -78, 28],
      [84, -120, 31],
      [82, -140, 33]
    ]
  }
];

// ── Procedural Geological Texture Generators ──────────────────────────────────
function generateStratigraphyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Fill dark base
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 1024, 1024);

  // Volve formations depth zones
  const zones = [
    {
      top: 0, bottom: 215, // Nordland Group / Upper Shale (0 - 1050m)
      name: 'Nordland Group',
      c1: '#374151', c2: '#4b5563', c3: '#1f2937',
      isShale: true
    },
    {
      top: 215, bottom: 440, // Hordaland Group / Sandstone A (1050 - 2150m)
      name: 'Hordaland Group',
      c1: '#847968', c2: '#a49886', c3: '#6a6152',
      isSandstone: true
    },
    {
      top: 440, bottom: 512, // Heimdal Fm (2150 - 2500m)
      name: 'Heimdal Fm',
      c1: '#64748b', c2: '#78889e', c3: '#475569',
      isSiltstone: true
    },
    {
      top: 512, bottom: 665, // Shetland Chalk / Limestone (2500 - 3250m)
      name: 'Shetland Chalk',
      c1: '#94a3b8', c2: '#cbd5e1', c3: '#64748b',
      isChalk: true
    },
    {
      top: 665, bottom: 810, // Hugin Reservoir / Sandstone B (3250 - 3950m) - TARGET
      name: 'Hugin Reservoir',
      c1: '#b45309', c2: '#d97706', c3: '#f59e0b',
      isReservoir: true
    },
    {
      top: 810, bottom: 890, // Lower Marine Shale (3950 - 4400m)
      name: 'Lower Shale',
      c1: '#1e293b', c2: '#334155', c3: '#0f172a',
      isShale: true
    },
    {
      top: 890, bottom: 1024, // Skagerrak Basement / Reservoir Zone (4400 - 5000m)
      name: 'Skagerrak Basement',
      c1: '#0f172a', c2: '#1e293b', c3: '#020617',
      isBasement: true
    }
  ];

  // Render each formation with lithological realism
  zones.forEach((z, zIdx) => {
    const h = z.bottom - z.top;

    // Base lithology gradient
    const grad = ctx.createLinearGradient(0, z.top, 0, z.bottom);
    grad.addColorStop(0, z.c1);
    grad.addColorStop(0.35, z.c2);
    grad.addColorStop(0.7, z.c3);
    grad.addColorStop(1, z.c1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, z.top, 1024, h);

    // Multi-frequency sinusoidal sediment bedding
    const laminaeCount = Math.max(14, Math.floor(h / 7));
    for (let i = 0; i < laminaeCount; i++) {
      const yBase = z.top + (i / laminaeCount) * h;
      ctx.beginPath();
      ctx.moveTo(0, yBase);
      for (let x = 0; x <= 1024; x += 16) {
        // Natural geological wave undulation
        const wave =
          Math.sin(x * 0.012 + i * 0.5 + zIdx) * 3.5 +
          Math.sin(x * 0.035 + zIdx) * 1.8 +
          Math.cos(x * 0.006) * 2.2;
        ctx.lineTo(x, yBase + wave);
      }

      if (z.isReservoir) {
        // Glowing warm amber bedding in target reservoir
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.45)' : 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = i % 3 === 0 ? 2.5 : 1.2;
      } else if (z.isChalk) {
        // Pale chalky limestone fracture joints
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(30, 41, 59, 0.2)';
        ctx.lineWidth = 1.4;
      } else if (z.isSandstone) {
        // Sandy cross-bedding
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(245, 230, 211, 0.22)' : 'rgba(0, 0, 0, 0.18)';
        ctx.lineWidth = 1.3;
      } else {
        // Fissile shale laminations
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1.2;
      }
      ctx.stroke();
    }

    // Special Hydrocarbon Warm Amber Glow for Hugin Reservoir
    if (z.isReservoir) {
      const glowGrad = ctx.createRadialGradient(512, (z.top + z.bottom) / 2, 30, 512, (z.top + z.bottom) / 2, 480);
      glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
      glowGrad.addColorStop(0.45, 'rgba(217, 119, 6, 0.4)');
      glowGrad.addColorStop(1, 'rgba(180, 83, 9, 0.05)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, z.top, 1024, h);

      // Gold reservoir boundary glow lines
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, z.top);
      for (let x = 0; x <= 1024; x += 16) {
        ctx.lineTo(x, z.top + Math.sin(x * 0.015) * 3);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, z.bottom);
      for (let x = 0; x <= 1024; x += 16) {
        ctx.lineTo(x, z.bottom + Math.sin(x * 0.015 + 1) * 3);
      }
      ctx.stroke();
    }

    // Formation boundary fault / division line
    ctx.beginPath();
    ctx.moveTo(0, z.bottom);
    for (let x = 0; x <= 1024; x += 16) {
      const bWave = Math.sin(x * 0.01 + zIdx) * 4 + Math.cos(x * 0.025) * 2;
      ctx.lineTo(x, z.bottom + bWave);
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  // Natural geological grain noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 16) {
    const noise = (Math.random() - 0.5) * 16;
    d[i] = Math.min(255, Math.max(0, d[i] + noise));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

function generateTerrainCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base earth satellite gradient
  const grad = ctx.createRadialGradient(512, 512, 60, 512, 512, 620);
  grad.addColorStop(0, '#9e967d');
  grad.addColorStop(0.35, '#7e8367');
  grad.addColorStop(0.7, '#5d694c');
  grad.addColorStop(1, '#444f38');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Topographical elevation shading (hills and ridges)
  const hills = [
    { x: 280, y: 320, rx: 160, ry: 90, ang: 0.3 },
    { x: 740, y: 260, rx: 180, ry: 110, ang: -0.4 },
    { x: 380, y: 760, rx: 200, ry: 120, ang: 0.2 },
    { x: 820, y: 720, rx: 150, ry: 100, ang: -0.25 },
    { x: 512, y: 512, rx: 320, ry: 220, ang: 0.1 }
  ];

  hills.forEach((h) => {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.ang);
    const hillGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, h.rx);
    hillGrad.addColorStop(0, 'rgba(189, 180, 154, 0.45)');
    hillGrad.addColorStop(0.5, 'rgba(107, 114, 82, 0.3)');
    hillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Topographic elevation contour lines
  for (let r = 80; r < 520; r += 28) {
    ctx.beginPath();
    ctx.ellipse(512, 512, r * 1.08, r * 0.82, Math.PI / 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(68, 79, 56, 0.22)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Drill pads positions matching WELLS_DATA (mapped from [-110..110, -80..80] to [0..1024])
  const padPositions = [
    [-75, 15],  // 15/9-F-14
    [-40, -20], // 15/9-F-15 A
    [0, 0],     // 15/9-F-12 (Current)
    [40, 10],   // 15/9-F-11 B
    [65, -15],  // 15/9-F-1 C
    [90, 5]     // 15/9-F-5
  ].map(([wx, wz]) => [
    Math.round(((wx + 110) / 220) * 1024),
    Math.round(((wz + 80) / 160) * 1024),
    wx === 0 && wz === 0 // isCurrent
  ]);

  // Winding dirt access roads connecting well pads
  padPositions.forEach(([px, py, isCurrent]) => {
    ctx.beginPath();
    ctx.moveTo(512, 512);
    ctx.quadraticCurveTo((px + 512) / 2 + 25, (py + 512) / 2 - 25, px, py);
    ctx.strokeStyle = 'rgba(196, 181, 157, 0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Gravel drilling pad
    ctx.beginPath();
    ctx.arc(px, py, isCurrent ? 36 : 26, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? '#cbd5e1' : '#c8bfae';
    ctx.fill();
    ctx.strokeStyle = isCurrent ? '#0066ee' : '#8c806d';
    ctx.lineWidth = isCurrent ? 3.5 : 2;
    ctx.stroke();
  });

  return canvas;
}

function generateRiskLensCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Radial gradient: intense glowing red/orange core to soft translucent amber edge
  const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');    // Fiery red center
  grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.65)'); // Vibrant orange
  grad.addColorStop(0.7, 'rgba(234, 179, 8, 0.35)');   // Amber glow
  grad.addColorStop(0.9, 'rgba(245, 158, 11, 0.12)');  // Soft halo
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');            // Transparent edge

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// ── Procedural Text Badge Sprite Generator ──────────────────────────────────
function createTextSprite(text, bgColor = '#ffffff', textColor = '#334155', isPill = true, fontSize = 26, borderColor = 'rgba(0,0,0,0.15)') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);

  canvas.width = Math.max(textWidth + 36, 120);
  canvas.height = 56;

  const ctx2 = canvas.getContext('2d');
  ctx2.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
  ctx2.textBaseline = 'middle';
  ctx2.textAlign = 'center';

  const r = isPill ? 12 : 6;
  const w = canvas.width - 6;
  const h = canvas.height - 6;
  const x = 3;
  const y = 3;

  ctx2.beginPath();
  if (ctx2.roundRect) {
    ctx2.roundRect(x, y, w, h, r);
  } else {
    ctx2.rect(x, y, w, h);
  }
  ctx2.fillStyle = bgColor;
  ctx2.fill();
  ctx2.lineWidth = 2.5;
  ctx2.strokeStyle = borderColor;
  ctx2.stroke();

  ctx2.fillStyle = textColor;
  ctx2.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(canvas.width / 7, canvas.height / 7, 1);
  return sprite;
}

function createRichCalloutSprite({
  title,
  subtitle,
  bgColor = 'rgba(15, 23, 42, 0.94)',
  titleColor = '#ffffff',
  subColor = '#94a3b8',
  borderColor = 'rgba(255, 255, 255, 0.25)',
  scale = 1.0,
  isOrange = false
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 380;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  const r = 16;
  const x = 8, y = 8, w = 364, h = 124;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px Inter, -apple-system, sans-serif';
  ctx.fillStyle = titleColor;
  ctx.fillText(title, 190, 52);

  // Subtitle
  if (subtitle) {
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillStyle = subColor;
    ctx.fillText(subtitle, 190, 98);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(34 * scale, 13 * scale, 1);
  return sprite;
}

// ── Oil Rig Derrick Procedural 3D Mesh Generator ──────────────────────────────
function createDerrickMesh(color = 0x334155, isCurrent = false) {
  const group = new THREE.Group();

  // Rig substructure base platform
  if (isCurrent) {
    const padGeo = new THREE.CylinderGeometry(5.2, 5.5, 1.2, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0052cc,
      roughness: 0.3,
      metalness: 0.8
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.6;
    group.add(pad);
  } else {
    const baseGeo = new THREE.BoxGeometry(4.8, 1.0, 4.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.6
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5;
    group.add(base);
  }

  // 4 Steel lattice leg columns tapering towards apex
  const legMat = new THREE.MeshStandardMaterial({
    color: isCurrent ? 0x0066ee : 0x334155,
    roughness: 0.35,
    metalness: 0.85
  });

  const legGeo = new THREE.CylinderGeometry(0.18, 0.32, 14, 6);
  const legs = [
    [-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]
  ];

  legs.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx * 0.55, 7.5, lz * 0.55);
    leg.rotation.z = lx > 0 ? 0.08 : -0.08;
    leg.rotation.x = lz > 0 ? -0.08 : 0.08;
    group.add(leg);
  });

  // Horizontal perimeter steel girders at 3 height stages
  const strutMat = new THREE.MeshStandardMaterial({
    color: isCurrent ? 0x0044bb : 0x475569,
    metalness: 0.8
  });
  [4.5, 8.5, 12.5].forEach((h) => {
    const w = 4.2 * (1 - h / 22);
    const gGeo = new THREE.BoxGeometry(w, 0.25, 0.25);
    // 4 sides
    const g1 = new THREE.Mesh(gGeo, strutMat);
    g1.position.set(0, h, w / 2);
    group.add(g1);
    const g2 = new THREE.Mesh(gGeo, strutMat);
    g2.position.set(0, h, -w / 2);
    group.add(g2);
    const g3 = new THREE.Mesh(gGeo, strutMat);
    g3.rotation.y = Math.PI / 2;
    g3.position.set(w / 2, h, 0);
    group.add(g3);
    const g4 = new THREE.Mesh(gGeo, strutMat);
    g4.rotation.y = Math.PI / 2;
    g4.position.set(-w / 2, h, 0);
    group.add(g4);
  });

  // Platform deck at lower stage
  const deckGeo = new THREE.BoxGeometry(3.6, 0.4, 3.6);
  const deckMat = new THREE.MeshStandardMaterial({ color: isCurrent ? 0x003399 : 0x1e293b, metalness: 0.7 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 4.5;
  group.add(deck);

  // Crown block at apex
  const crownGeo = new THREE.BoxGeometry(1.6, 1.0, 1.6);
  const crownMat = new THREE.MeshStandardMaterial({
    color: isCurrent ? 0x0066ee : 0x1e293b,
    metalness: 0.9
  });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.y = 15.0;
  group.add(crown);

  // Beacon sphere at crown
  const beaconGeo = new THREE.SphereGeometry(0.8, 12, 12);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: isCurrent ? 0x38bdf8 : new THREE.Color(color),
    emissive: isCurrent ? 0x0066ee : new THREE.Color(color),
    emissiveIntensity: 0.7
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 16.2;
  group.add(beacon);

  // Drill string pipe going down
  const pipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 15, 8);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
  const pipe = new THREE.Mesh(pipeGeo, pipeMat);
  pipe.position.y = 7.5;
  group.add(pipe);

  return group;
}

export default function WellTrajectory3D({
  onNavigateToLanding,
  onNavigateToFeatures,
  onNavigateToDashboard,
  onNavigateToSpatial,
  onNavigateToKnowledge,
  onNavigateToTechnology
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);

  // ── Visualization Controls States ──
  const [layers, setLayers] = useState({
    currentWell: true,
    plannedPath: true,
    safetyCorridor: true,
    offsetWells: true,
    geologicalFormations: true,
    targetFormation: true,
    riskZones: true
  });

  const [viewMode, setViewMode] = useState('3D'); // '3D' | 'Top' | 'Side' | 'Section'

  const [displayOptions, setDisplayOptions] = useState({
    wellLabels: true,
    depthMarkers: true,
    formationLabels: true,
    gridLines: false
  });

  const [formationOpacity, setFormationOpacity] = useState(70);
  const [corridorOpacity, setCorridorOpacity] = useState(40);

  // Dynamic Gizmo Transform Euler angles
  const [gizmoTransform, setGizmoTransform] = useState('');

  // ── Camera Transition Helper ──
  const transitionAnimIdRef = useRef(null);
  const stopTransition = useCallback(() => {
    if (transitionAnimIdRef.current) {
      cancelAnimationFrame(transitionAnimIdRef.current);
      transitionAnimIdRef.current = null;
    }
  }, []);

  const transitionCamera = useCallback((targetPos, targetLookAt, duration = 800) => {
    if (!cameraRef.current || !controlsRef.current) return;
    stopTransition();
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const startTime = performance.now();

    const animateTransition = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startLookAt, targetLookAt, ease);
      controls.update();

      if (progress < 1) {
        transitionAnimIdRef.current = requestAnimationFrame(animateTransition);
      } else {
        transitionAnimIdRef.current = null;
      }
    };
    transitionAnimIdRef.current = requestAnimationFrame(animateTransition);
  }, [stopTransition]);

  const applyViewMode = useCallback((mode) => {
    setViewMode(mode);
    if (!cameraRef.current || !controlsRef.current) return;

    if (mode === '3D') {
      transitionCamera(new THREE.Vector3(185, 135, 235), new THREE.Vector3(5, -95, 10));
    } else if (mode === 'Top') {
      transitionCamera(new THREE.Vector3(0, 310, 0.1), new THREE.Vector3(0, 0, 0));
    } else if (mode === 'Side') {
      transitionCamera(new THREE.Vector3(270, -85, 0), new THREE.Vector3(0, -85, 0));
    } else if (mode === 'Section') {
      transitionCamera(new THREE.Vector3(15, -90, 245), new THREE.Vector3(5, -90, 0));
    }
  }, [transitionCamera]);

  const handleResetView = useCallback(() => {
    applyViewMode('3D');
  }, [applyViewMode]);

  // ── Three.js Initialization ──
  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = '';

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');
    sceneRef.current = scene;

    // 2. Camera (Framed in rich isometric perspective)
    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 3000);
    camera.position.set(185, 135, 235);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';

    renderer.domElement.addEventListener('pointerdown', () => {
      renderer.domElement.style.cursor = 'grabbing';
    });
    renderer.domElement.addEventListener('pointerup', () => {
      renderer.domElement.style.cursor = 'grab';
    });

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.0;
    controls.target.set(5, -95, 10);
    controls.maxDistance = 550;
    controls.minDistance = 40;
    controlsRef.current = controls;

    // 5. Lighting (Warm afternoon sun casting authentic geological relief)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 0.85);
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    sunLight.position.set(180, 240, 160);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    fillLight.position.set(-160, -80, -120);
    scene.add(fillLight);

    // ── Build Geological Cutaway Block ──
    const stratCanvas = generateStratigraphyCanvas();
    const stratTex = new THREE.CanvasTexture(stratCanvas);
    stratTex.wrapS = THREE.RepeatWrapping;
    stratTex.wrapT = THREE.ClampToEdgeWrapping;

    const terrainCanvas = generateTerrainCanvas();
    const terrainTex = new THREE.CanvasTexture(terrainCanvas);

    // Left and Right Cutaway Faces (Solid / High-opacity textured sedimentary rock)
    const blockMatSide = new THREE.MeshStandardMaterial({
      map: stratTex,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Top Terrain Surface (Satellite landscape with hills, access tracks, and wellpads)
    const blockMatTop = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.85,
      metalness: 0.05
    });

    // Bottom Bedrock Base
    const blockMatBottom = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.95
    });

    // Front Cutaway Face (Translucent window revealing subsurface trajectories)
    const blockMatFront = new THREE.MeshStandardMaterial({
      map: stratTex,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: Math.min(0.72, (formationOpacity / 100) * 0.65),
      depthWrite: false,
      side: THREE.FrontSide
    });

    // Back Cutaway Wall
    const blockMatBack = new THREE.MeshStandardMaterial({
      map: stratTex,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Multi-material box: Right(+X), Left(-X), Top(+Y), Bottom(-Y), Front(+Z), Back(-Z)
    const blockMaterials = [
      blockMatSide,
      blockMatSide,
      blockMatTop,
      blockMatBottom,
      blockMatFront,
      blockMatBack
    ];

    const blockGeo = new THREE.BoxGeometry(220, 180, 160);
    const blockMesh = new THREE.Mesh(blockGeo, blockMaterials);
    blockMesh.position.set(0, -90, 0);
    blockMesh.name = 'geological-block';
    scene.add(blockMesh);

    // ── Build 3D Steel Truss Oil Rig Derricks at Surface ──
    const derrickGroup = new THREE.Group();
    derrickGroup.name = 'rig-derricks';

    WELLS_DATA.forEach((w) => {
      const derrick = createDerrickMesh(w.color, w.isCurrent);
      derrick.position.set(w.surfacePos[0], 0, w.surfacePos[2]);
      derrickGroup.add(derrick);
    });
    scene.add(derrickGroup);

    // ── Build 3D Subsurface Well Trajectories ──
    const trajectoriesGroup = new THREE.Group();
    trajectoriesGroup.name = 'well-trajectories';

    WELLS_DATA.forEach((w) => {
      const pts = w.stations.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(pts);

      if (w.isCurrent) {
        // 1. Luminous Glowing Safety Corridor Envelope (±15m cylindrical corridor)
        const corridorGeo = new THREE.TubeGeometry(curve, 110, 6.2, 24, false);
        const corridorMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: Math.max(0.25, (corridorOpacity / 100) * 0.52),
          roughness: 0.15,
          metalness: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const corridorMesh = new THREE.Mesh(corridorGeo, corridorMat);
        corridorMesh.name = 'safety-corridor';
        trajectoriesGroup.add(corridorMesh);

        // Glowing cyan rings along corridor at 1,000m intervals
        [1000, 2000, 3000, 4000].forEach((depthM) => {
          const t = depthM / 5000;
          const p = curve.getPointAt(t);
          const ringGeo = new THREE.TorusGeometry(6.3, 0.45, 12, 32);
          ringGeo.rotateX(Math.PI / 2);
          const ringMat = new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            emissive: 0x0284c7,
            emissiveIntensity: 0.7
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.copy(p);
          trajectoriesGroup.add(ring);
        });

        // 2. Solid Royal Blue Drill String (Actual Wellbore)
        const tubeGeo = new THREE.TubeGeometry(curve, 110, 2.0, 16, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x0052cc,
          roughness: 0.2,
          metalness: 0.85,
          emissive: 0x002e88,
          emissiveIntensity: 0.35
        });
        const currentMesh = new THREE.Mesh(tubeGeo, tubeMat);
        currentMesh.name = 'current-well-actual';
        trajectoriesGroup.add(currentMesh);

        // 3. Active Bit Cone Assembly at 3,842m depth
        const bitPos = curve.getPointAt(3842 / 5000);
        const bitGeo = new THREE.ConeGeometry(3.0, 6.0, 16);
        bitGeo.rotateX(Math.PI);
        const bitMat = new THREE.MeshStandardMaterial({
          color: 0xff7700,
          metalness: 0.9,
          roughness: 0.15,
          emissive: 0xff4400,
          emissiveIntensity: 0.4
        });
        const bitMesh = new THREE.Mesh(bitGeo, bitMat);
        bitMesh.position.copy(bitPos);
        trajectoriesGroup.add(bitMesh);

        // 4. Planned Centerline Extension
        const plannedGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(90));
        const plannedMat = new THREE.LineDashedMaterial({
          color: 0x0284c7,
          dashSize: 3.5,
          gapSize: 2
        });
        const plannedLine = new THREE.Line(plannedGeo, plannedMat);
        plannedLine.computeLineDistances();
        plannedLine.name = 'planned-line';
        trajectoriesGroup.add(plannedLine);

      } else {
        // Offset Well Tubes with metallic sheen
        const tubeGeo = new THREE.TubeGeometry(curve, 80, 1.1, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(w.color),
          roughness: 0.25,
          metalness: 0.75,
          emissive: new THREE.Color(w.color),
          emissiveIntensity: 0.2
        });
        const offsetMesh = new THREE.Mesh(tubeGeo, tubeMat);
        offsetMesh.name = `offset-${w.id}`;
        trajectoriesGroup.add(offsetMesh);

        // Shiny spherical survey nodes / beads along each offset path
        pts.forEach((pt, idx) => {
          if (idx > 0) {
            const sphereGeo = new THREE.SphereGeometry(2.0, 12, 12);
            const sphereMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(w.color),
              roughness: 0.15,
              metalness: 0.9,
              emissive: new THREE.Color(w.color),
              emissiveIntensity: 0.35
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.copy(pt);
            trajectoriesGroup.add(sphere);
          }
        });
      }
    });
    scene.add(trajectoriesGroup);

    // ── Volumetric 3D Hazard Risk Zone (Glowing Elliptical Lens in Hugin Sand) ──
    // Depth 3,780 - 3,920 m (Y: -138.5)
    const riskGroup = new THREE.Group();
    riskGroup.name = 'risk-zone-group';

    const lensCanvas = generateRiskLensCanvas();
    const lensTex = new THREE.CanvasTexture(lensCanvas);
    const lensGeo = new THREE.PlaneGeometry(96, 56);
    lensGeo.rotateX(-Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({
      map: lensTex,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(24, -138.5, 18);
    riskGroup.add(lensMesh);

    // Inner dashed contour ring (orange)
    const innerRingCurve = new THREE.EllipseCurve(24, 18, 36, 22, 0, 2 * Math.PI, false, 0);
    const innerPoints = innerRingCurve.getPoints(64).map(p => new THREE.Vector3(p.x, -138.3, p.y));
    const innerRingGeo = new THREE.BufferGeometry().setFromPoints(innerPoints);
    const innerRingMat = new THREE.LineDashedMaterial({ color: 0xf97316, dashSize: 4, gapSize: 3 });
    const innerRing = new THREE.Line(innerRingGeo, innerRingMat);
    innerRing.computeLineDistances();
    riskGroup.add(innerRing);

    // Outer dashed contour ring (yellow)
    const outerRingCurve = new THREE.EllipseCurve(24, 18, 48, 28, 0, 2 * Math.PI, false, 0);
    const outerPoints = outerRingCurve.getPoints(64).map(p => new THREE.Vector3(p.x, -138.1, p.y));
    const outerRingGeo = new THREE.BufferGeometry().setFromPoints(outerPoints);
    const outerRingMat = new THREE.LineDashedMaterial({ color: 0xfde047, dashSize: 5, gapSize: 3 });
    const outerRing = new THREE.Line(outerRingGeo, outerRingMat);
    outerRing.computeLineDistances();
    riskGroup.add(outerRing);

    // Orange Hazard Marker Pin Node on the Risk Boundary at (36, -138.5, 22)
    const pinGeo = new THREE.SphereGeometry(2.4, 16, 16);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.set(36, -138.5, 22);
    riskGroup.add(pinMesh);

    // Leader line from pin to floating badge
    const leaderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(36, -138.5, 22),
      new THREE.Vector3(56, -130, 26),
      new THREE.Vector3(68, -130, 26)
    ]);
    const leaderMat = new THREE.LineBasicMaterial({ color: 0xf97316, linewidth: 2 });
    const leaderLine = new THREE.Line(leaderGeo, leaderMat);
    riskGroup.add(leaderLine);

    // Floating Dark Glassmorphism 3D Badge: "High Risk Zone | 3,780 – 3,920 m"
    const riskBadge = createRichCalloutSprite({
      title: 'High Risk Zone',
      subtitle: '3,780 – 3,920 m',
      bgColor: 'rgba(35, 12, 2, 0.94)',
      titleColor: '#fdba74',
      subColor: '#ffffff',
      borderColor: '#ea580c',
      scale: 1.05,
      isOrange: true
    });
    riskBadge.position.set(78, -130, 26);
    riskGroup.add(riskBadge);

    riskGroup.visible = layers.riskZones;
    scene.add(riskGroup);

    // ── 1. Build Well Labels Group ──
    const wellLabelsGroup = new THREE.Group();
    wellLabelsGroup.name = 'well-labels-group';

    WELLS_DATA.forEach((w) => {
      if (w.isCurrent) {
        // Prominent 3D Callout Badge above 15/9-F-12 derrick
        const currentWellBadge = createRichCalloutSprite({
          title: '15/9-F-12',
          subtitle: 'Current Well (Volve)',
          bgColor: '#0066ee',
          titleColor: '#ffffff',
          subColor: '#dbeafe',
          borderColor: '#38bdf8',
          scale: 1.15
        });
        currentWellBadge.position.set(w.surfacePos[0], 28, w.surfacePos[2]);
        wellLabelsGroup.add(currentWellBadge);
      } else {
        // Floating pill badge above offset well derricks
        const sprite = createTextSprite(
          w.name,
          'rgba(255, 255, 255, 0.95)',
          '#0f172a',
          true,
          24,
          w.color
        );
        sprite.position.set(w.surfacePos[0], 22, w.surfacePos[2]);
        wellLabelsGroup.add(sprite);
      }
    });
    wellLabelsGroup.visible = displayOptions.wellLabels;
    scene.add(wellLabelsGroup);

    // ── 2. Build Depth Markers Group along 15/9-F-12 ──
    const depthMarkersGroup = new THREE.Group();
    depthMarkersGroup.name = 'depth-markers-group';
    const depthStations = [
      { md: '0 m', pos: [0, 0, 0] },
      { md: '1,000 m', pos: [1, -36, 2] },
      { md: '2,000 m', pos: [4, -72, 8] },
      { md: '3,000 m', pos: [10, -108, 18] },
      { md: '3,842 m (Bit)', pos: [16, -138.3, 26], isBit: true },
      { md: '4,000 m', pos: [17, -144, 28] },
      { md: '5,000 m', pos: [22, -180, 34] }
    ];
    depthStations.forEach((s) => {
      const sprite = createTextSprite(
        s.md,
        s.isBit ? '#0066ee' : 'rgba(15, 23, 42, 0.88)',
        '#ffffff',
        true,
        s.isBit ? 24 : 20,
        s.isBit ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)'
      );
      sprite.position.set(s.pos[0] + 16, s.pos[1], s.pos[2] + 4);
      depthMarkersGroup.add(sprite);

      // Indicator tick line connecting wellbore to badge
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]),
        new THREE.Vector3(s.pos[0] + 9, s.pos[1], s.pos[2] + 2)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: s.isBit ? 0x0066ee : 0x94a3b8 });
      const line = new THREE.Line(lineGeo, lineMat);
      depthMarkersGroup.add(line);
    });
    depthMarkersGroup.visible = displayOptions.depthMarkers;
    scene.add(depthMarkersGroup);

    // ── 3. Build Formation Labels Group on Left Face ──
    const formationLabelsGroup = new THREE.Group();
    formationLabelsGroup.name = 'formation-labels-group';
    const formationPlaques = [
      { name: 'Nordland Group', y: -18.9 },
      { name: 'Hordaland Group', y: -57.6 },
      { name: 'Heimdal Fm', y: -83.7 },
      { name: 'Shetland Chalk', y: -103.5 },
      { name: 'Hugin Reservoir (Target)', y: -132.3, isTarget: true },
      { name: 'Skagerrak Basement', y: -168.0 }
    ];
    formationPlaques.forEach((fp) => {
      const sprite = createTextSprite(
        fp.name,
        fp.isTarget ? '#ea580c' : 'rgba(30, 41, 59, 0.92)',
        '#ffffff',
        false,
        22,
        fp.isTarget ? '#fed7aa' : 'rgba(255, 255, 255, 0.2)'
      );
      sprite.position.set(-112, fp.y, 8);
      formationLabelsGroup.add(sprite);
    });
    formationLabelsGroup.visible = displayOptions.formationLabels;
    scene.add(formationLabelsGroup);

    // ── 4. Build Grid Lines Group ──
    const gridLinesGroup = new THREE.Group();
    gridLinesGroup.name = 'grid-lines-group';

    // Surface Grid
    const surfaceGrid = new THREE.GridHelper(220, 22, 0x0066ee, 0x94a3b8);
    surfaceGrid.position.set(0, 0.5, 0);
    gridLinesGroup.add(surfaceGrid);

    // Block wireframe edges
    const boxHelper = new THREE.BoxHelper(blockMesh, 0x0284c7);
    gridLinesGroup.add(boxHelper);

    // Depth horizontal grid boundary lines
    [-36, -72, -108, -144, -180].forEach((depthY) => {
      const pts = [
        new THREE.Vector3(-110, depthY, -80),
        new THREE.Vector3(110, depthY, -80),
        new THREE.Vector3(110, depthY, 80),
        new THREE.Vector3(-110, depthY, 80),
        new THREE.Vector3(-110, depthY, -80)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 3, gapSize: 2 });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      gridLinesGroup.add(line);
    });
    gridLinesGroup.visible = displayOptions.gridLines;
    scene.add(gridLinesGroup);

    // ── Animation Loop & Gizmo Sync ──
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Compute camera rotation Euler angles to synchronously rotate Orientation Cube
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      const rotX = (-euler.x * 180 / Math.PI).toFixed(1);
      const rotY = (-euler.y * 180 / Math.PI).toFixed(1);
      setGizmoTransform(`rotateX(${rotX}deg) rotateY(${rotY}deg)`);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize Observer ──
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(mountRef.current);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      stopTransition();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      controls.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
      renderer.dispose();
    };
  }, [stopTransition]);

  // Update object visibility & opacity when controls change
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // 1. Block Visibility & Opacity
    const block = scene.getObjectByName('geological-block');
    if (block) {
      block.visible = layers.geologicalFormations;
      if (block.material && Array.isArray(block.material)) {
        block.material[0].opacity = Math.min(1.0, formationOpacity / 100);
        block.material[1].opacity = Math.min(1.0, formationOpacity / 100);
        block.material[4].opacity = Math.min(0.72, (formationOpacity / 100) * 0.65);
        block.material[5].opacity = Math.min(1.0, formationOpacity / 100);
        block.material[2].opacity = Math.min(1.0, (formationOpacity / 100) + 0.15);
      }
    }

    // 2. Current Well
    const currentActual = scene.getObjectByName('current-well-actual');
    if (currentActual) currentActual.visible = layers.currentWell;

    // 3. Safety Corridor
    const corridor = scene.getObjectByName('safety-corridor');
    if (corridor) {
      corridor.visible = layers.currentWell && layers.safetyCorridor;
      corridor.material.opacity = Math.max(0.25, (corridorOpacity / 100) * 0.52);
    }

    // 4. Planned Line
    const planned = scene.getObjectByName('planned-line');
    if (planned) planned.visible = layers.currentWell && layers.plannedPath;

    // 5. Offset Wells
    WELLS_DATA.filter(w => !w.isCurrent).forEach((w) => {
      const ow = scene.getObjectByName(`offset-${w.id}`);
      if (ow) ow.visible = layers.offsetWells;
    });

    // 6. Risk Zone Group
    const riskZone = scene.getObjectByName('risk-zone-group');
    if (riskZone) riskZone.visible = layers.riskZones;

    // ── Display Options Reactivity ──
    // 7. Well Labels
    const wellLabels = scene.getObjectByName('well-labels-group');
    if (wellLabels) wellLabels.visible = displayOptions.wellLabels;

    // 8. Depth Markers
    const depthMarkers = scene.getObjectByName('depth-markers-group');
    if (depthMarkers) depthMarkers.visible = displayOptions.depthMarkers;

    // 9. Formation Labels
    const formationLabels = scene.getObjectByName('formation-labels-group');
    if (formationLabels) formationLabels.visible = displayOptions.formationLabels;

    // 10. Grid Lines
    const gridLines = scene.getObjectByName('grid-lines-group');
    if (gridLines) gridLines.visible = displayOptions.gridLines;

  }, [layers, formationOpacity, corridorOpacity, displayOptions]);

  return (
    <div className="traj-page">
      {/* ── Top Header Navigation Bar ── */}
      <UnifiedNavbar
        onNavigateToFeatures={onNavigateToFeatures}
        onNavigateToLanding={onNavigateToLanding}
        activePage="trajectory"
      />

      {/* ── Main Workspace: 3 Columns ── */}
      <div className="traj-workspace">
        {/* ── LEFT ENGINEERING PANEL: "Visualization Controls" ── */}
        <aside className="traj-left-panel">
          <div className="traj-panel-header">
            <span className="traj-panel-title">Visualization Controls</span>
            <ChevronUp size={16} color="#64748b" />
          </div>

          {/* Section 1: Well Layers */}
          <div className="traj-panel-section">
            <div className="traj-section-subtitle">Well Layers</div>
            <div className="traj-layers-list">
              {/* Current Well (15/9-F-12) */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box ${layers.currentWell ? 'checked' : ''}`}
                  onClick={() => setLayers(prev => ({ ...prev, currentWell: !prev.currentWell }))}
                >
                  {layers.currentWell && <CheckCircle2 size={12} />}
                </div>
                <span>Current Well (15/9-F-12)</span>
              </label>

              {/* Planned Path */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box ${layers.plannedPath ? 'checked' : ''}`}
                  onClick={() => setLayers(prev => ({ ...prev, plannedPath: !prev.plannedPath }))}
                >
                  {layers.plannedPath && <CheckCircle2 size={12} />}
                </div>
                <span>Planned Path</span>
              </label>

              {/* Safety Corridor */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box ${layers.safetyCorridor ? 'checked' : ''}`}
                  onClick={() => setLayers(prev => ({ ...prev, safetyCorridor: !prev.safetyCorridor }))}
                >
                  {layers.safetyCorridor && <CheckCircle2 size={12} />}
                </div>
                <span>Safety Corridor (±15m)</span>
              </label>

              {/* Offset Wells */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box ${layers.offsetWells ? 'checked' : ''}`}
                  onClick={() => setLayers(prev => ({ ...prev, offsetWells: !prev.offsetWells }))}
                >
                  {layers.offsetWells && <CheckCircle2 size={12} />}
                </div>
                <span>Offset Wells (Volve Cluster)</span>
              </label>

              {/* Geological Formations */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box ${layers.geologicalFormations ? 'checked' : ''}`}
                  onClick={() => setLayers(prev => ({ ...prev, geologicalFormations: !prev.geologicalFormations }))}
                >
                  {layers.geologicalFormations && <CheckCircle2 size={12} />}
                </div>
                <span>Geological Formations</span>
              </label>

              {/* Target Formation */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box ${layers.targetFormation ? 'checked' : ''}`}
                  onClick={() => setLayers(prev => ({ ...prev, targetFormation: !prev.targetFormation }))}
                >
                  {layers.targetFormation && <CheckCircle2 size={12} />}
                </div>
                <span>Target Formation (Hugin Fm)</span>
              </label>

              {/* Risk Zones */}
              <label className="traj-checkbox-item">
                <div
                  className={`traj-checkbox-box checked risk`}
                  onClick={() => setLayers(prev => ({ ...prev, riskZones: !prev.riskZones }))}
                >
                  {layers.riskZones && <AlertTriangle size={11} />}
                </div>
                <span style={{ color: '#ea580c', fontWeight: 700 }}>Risk Zones</span>
              </label>
            </div>
          </div>

          {/* Section 2: View Mode */}
          <div className="traj-panel-section">
            <div className="traj-section-subtitle">View Mode</div>
            <div className="traj-view-grid">
              <button
                type="button"
                className={`traj-view-btn ${viewMode === '3D' ? 'active' : ''}`}
                onClick={() => applyViewMode('3D')}
              >
                <Box size={13} />
                <span>3D View</span>
              </button>

              <button
                type="button"
                className={`traj-view-btn ${viewMode === 'Top' ? 'active' : ''}`}
                onClick={() => applyViewMode('Top')}
              >
                <span>Top View</span>
              </button>

              <button
                type="button"
                className={`traj-view-btn ${viewMode === 'Side' ? 'active' : ''}`}
                onClick={() => applyViewMode('Side')}
              >
                <span>Side View</span>
              </button>

              <button
                type="button"
                className={`traj-view-btn ${viewMode === 'Section' ? 'active' : ''}`}
                onClick={() => applyViewMode('Section')}
              >
                <span>Section View</span>
              </button>
            </div>
          </div>

          {/* Section 3: Display Options */}
          <div className="traj-panel-section">
            <div className="traj-section-subtitle">Display Options</div>
            <div className="traj-switch-item" onClick={() => setDisplayOptions(prev => ({ ...prev, wellLabels: !prev.wellLabels }))}>
              <span>Well Labels</span>
              <div className={`traj-switch-pill ${displayOptions.wellLabels ? 'on' : ''}`}>
                <span className="traj-switch-thumb" />
              </div>
            </div>

            <div className="traj-switch-item" onClick={() => setDisplayOptions(prev => ({ ...prev, depthMarkers: !prev.depthMarkers }))}>
              <span>Depth Markers</span>
              <div className={`traj-switch-pill ${displayOptions.depthMarkers ? 'on' : ''}`}>
                <span className="traj-switch-thumb" />
              </div>
            </div>

            <div className="traj-switch-item" onClick={() => setDisplayOptions(prev => ({ ...prev, formationLabels: !prev.formationLabels }))}>
              <span>Formation Labels</span>
              <div className={`traj-switch-pill ${displayOptions.formationLabels ? 'on' : ''}`}>
                <span className="traj-switch-thumb" />
              </div>
            </div>

            <div className="traj-switch-item" onClick={() => setDisplayOptions(prev => ({ ...prev, gridLines: !prev.gridLines }))}>
              <span>Grid Lines</span>
              <div className={`traj-switch-pill ${displayOptions.gridLines ? 'on' : ''}`}>
                <span className="traj-switch-thumb" />
              </div>
            </div>
          </div>

          {/* Section 4: Opacity */}
          <div className="traj-panel-section">
            <div className="traj-section-subtitle">Opacity</div>
            <div className="traj-slider-group">
              <div className="traj-slider-row">
                <span className="traj-slider-label">Formations</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formationOpacity}
                  onChange={(e) => setFormationOpacity(Number(e.target.value))}
                  className="traj-slider-bar"
                />
                <span className="traj-slider-val">{formationOpacity}%</span>
              </div>

              <div className="traj-slider-row">
                <span className="traj-slider-label">Safety Corridor</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={corridorOpacity}
                  onChange={(e) => setCorridorOpacity(Number(e.target.value))}
                  className="traj-slider-bar"
                />
                <span className="traj-slider-val">{corridorOpacity}%</span>
              </div>
            </div>
          </div>

          {/* Bottom Reset Button */}
          <button type="button" className="traj-reset-btn" onClick={handleResetView}>
            <RotateCcw size={14} />
            <span>Reset View</span>
          </button>
        </aside>

        {/* ── CENTRAL 3D VIEWPORT ── */}
        <main className="traj-viewport-container">
          <div ref={mountRef} className="traj-canvas" />

          {/* 3D Orientation Gizmo Cube (Top-Left) */}
          <div className="traj-gizmo-box">
            <span className="traj-gizmo-compass-text traj-gizmo-north">N</span>
            <span className="traj-gizmo-compass-text traj-gizmo-east">E</span>
            <span className="traj-gizmo-compass-text traj-gizmo-south">S</span>
            <span className="traj-gizmo-compass-text traj-gizmo-west">W</span>

            <div className="traj-gizmo-cube" style={{ transform: gizmoTransform }}>
              <div className="traj-gizmo-face traj-gizmo-front" onClick={() => applyViewMode('Side')}>Front</div>
              <div className="traj-gizmo-face traj-gizmo-back" onClick={() => applyViewMode('Side')}>Back</div>
              <div className="traj-gizmo-face traj-gizmo-right" onClick={() => applyViewMode('Section')}>Right</div>
              <div className="traj-gizmo-face traj-gizmo-left" onClick={() => applyViewMode('Section')}>Left</div>
              <div className="traj-gizmo-face traj-gizmo-top" onClick={() => applyViewMode('Top')}>Top</div>
              <div className="traj-gizmo-face traj-gizmo-bottom">Bottom</div>
            </div>
          </div>

          {/* Top-Right Scale Bar */}
          <div className="traj-scale-bar">
            <div className="traj-scale-ticks">
              <span>0</span>
              <span>2.5</span>
              <span>5 km</span>
            </div>
            <div className="traj-scale-line">
              <span className="traj-scale-mid-tick" />
            </div>
          </div>

          {/* Bottom-Right Vertical Exaggeration Badge */}
          <div className="traj-exaggeration-badge">
            Vertical Exaggeration: 1.5x
          </div>
        </main>

        {/* ── RIGHT INTELLIGENCE PANEL ── */}
        <aside className="traj-right-panel">
          {/* Well Identity Header Card */}
          <div className="traj-info-card">
            <div className="traj-info-top">
              <div className="traj-rig-avatar">
                <Drill size={20} />
              </div>
              <div className="traj-well-title-block">
                <div className="traj-well-row1">
                  <span className="traj-well-title">15/9-F-12</span>
                  <span className="traj-live-badge">
                    <span className="traj-live-dot" />
                    LIVE
                  </span>
                </div>
                <span className="traj-well-sub">Current Well (Volve Field)</span>
              </div>
            </div>

            <div className="traj-meta-grid">
              <div className="traj-meta-row">
                <span className="traj-meta-lbl"><MapPin size={12} /> Location</span>
                <span className="traj-meta-val">Volve Field, Block 15/9</span>
              </div>

              <div className="traj-meta-row">
                <span className="traj-meta-lbl"><Activity size={12} /> Current Depth</span>
                <span className="traj-meta-val">3,842 m</span>
              </div>

              <div className="traj-meta-row">
                <span className="traj-meta-lbl"><Compass size={12} /> Inclination</span>
                <span className="traj-meta-val">67°</span>
              </div>

              <div className="traj-meta-row">
                <span className="traj-meta-lbl"><Navigation size={12} /> Azimuth</span>
                <span className="traj-meta-val">142°</span>
              </div>

              <div className="traj-meta-row">
                <span className="traj-meta-lbl"><Layers size={12} /> Formation</span>
                <span className="traj-meta-val">Hugin Fm (Reservoir)</span>
              </div>

              <div className="traj-meta-row">
                <span className="traj-meta-lbl"><Target size={12} /> Target Depth</span>
                <span className="traj-meta-val">4,250 m</span>
              </div>
            </div>
          </div>

          {/* Trajectory Corridor Status Box */}
          <div className="traj-safety-status-box">
            <div className="traj-safety-status-text">
              <ShieldCheck size={16} color="#16a34a" />
              <span>Within planned safety corridor</span>
            </div>
            <Info size={14} color="#64748b" style={{ cursor: 'pointer' }} />
          </div>

          {/* Predicted Risk Zone Card */}
          <div className="traj-predicted-card">
            <div className="traj-predicted-header">
              <div className="traj-predicted-title">
                <AlertTriangle size={15} color="#ea580c" />
                <span>Predicted Risk Zone</span>
              </div>
              <span className="traj-confidence-pill">78% Confidence</span>
            </div>

            <div className="traj-predicted-depth">3,780 – 3,920 m</div>

            <div className="traj-risk-desc-block">
              <div className="traj-risk-lbl">Primary Risk</div>
              <div className="traj-risk-val">High likelihood of Lost Circulation in Hugin Sand</div>
            </div>

            <div className="traj-historical-events">
              <div className="traj-risk-lbl" style={{ marginBottom: 6 }}>Related Historical Events</div>
              <div className="traj-history-item">
                <span className="traj-history-dot" style={{ background: '#f97316' }} />
                <span>Mud Loss (Well 15/9-F-11 B)</span>
              </div>
              <div className="traj-history-item">
                <span className="traj-history-dot" style={{ background: '#ef4444' }} />
                <span>Lost Circulation (Well 15/9-F-15 A)</span>
              </div>
              <div className="traj-history-item">
                <span className="traj-history-dot" style={{ background: '#f97316' }} />
                <span>Borehole Ballooning (Well 15/9-F-1 C)</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── BOTTOM PANEL: "Depth Profile & Formations (Well 15/9-F-12)" ── */}
      <footer className="traj-depth-panel">
        <div className="traj-depth-header">
          <span className="traj-depth-title">Depth Profile & Formations (Well 15/9-F-12)</span>
          <div className="traj-depth-select-wrap">
            <span>Show:</span>
            <select className="traj-depth-select">
              <option>All Layers</option>
              <option>Target Formations Only</option>
              <option>Hazard Zones</option>
            </select>
          </div>
        </div>

        <div className="traj-chart-container">
          {/* Active 3,842m Depth Indicator Pill */}
          <div className="traj-depth-cursor-badge" style={{ left: '76.8%' }}>
            3,842 m
          </div>
          <div className="traj-depth-cursor-line" style={{ left: '76.8%' }} />

          {/* Horizontal Formation Track */}
          <div className="traj-formation-track">
            {FORMATIONS.map(f => (
              <div
                key={f.name}
                className="traj-formation-block"
                style={{
                  width: `${f.pct}%`,
                  background: f.uiColor,
                  borderBottom: f.isTarget ? '2.5px solid #d97706' : 'none'
                }}
              >
                {f.name}
              </div>
            ))}
          </div>

          {/* 2D Trajectory Profile Curve SVG */}
          <div className="traj-2d-curve-area">
            <svg className="traj-svg-curve" viewBox="0 0 1000 36" preserveAspectRatio="none">
              {/* Risk Zone shaded box (3,780m - 3,920m = 75.6% - 78.4%) */}
              <rect x="740" y="2" width="65" height="32" rx="4" fill="rgba(249, 115, 22, 0.22)" stroke="#f97316" strokeDasharray="3 2" />

              {/* Target Formation shaded box (3,250m - 3,950m = 65% - 79%) */}
              <rect x="650" y="4" width="140" height="28" rx="2" fill="rgba(234, 179, 8, 0.12)" />

              {/* Planned Trajectory (Dashed) */}
              <path
                d="M 10 14 C 200 14, 450 16, 768 22 C 850 25, 950 28, 990 30"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Actual Trajectory (Solid Blue) */}
              <path
                d="M 10 14 C 200 14, 450 16, 768 22"
                fill="none"
                stroke="#0066ee"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Active bit circle node at 3,842m */}
              <circle cx="768" cy="22" r="4.5" fill="#0066ee" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          {/* Depth Axis Ticks */}
          <div className="traj-axis-ticks">
            <span>0</span>
            <span>500</span>
            <span>1,000</span>
            <span>1,500</span>
            <span>2,000</span>
            <span>2,500</span>
            <span>3,000</span>
            <span>3,500</span>
            <span>4,000</span>
            <span>4,500</span>
            <span>5,000</span>
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="traj-bottom-legend">
          <div className="traj-legend-chip">
            <span style={{ width: 22, height: 3.5, background: '#0066ee', borderRadius: 2 }} />
            <span>Actual Path (15/9-F-12)</span>
          </div>

          <div className="traj-legend-chip">
            <span style={{ width: 22, height: 2.5, borderTop: '2.5px dashed #0284c7' }} />
            <span>Planned Path</span>
          </div>

          <div className="traj-legend-chip">
            <span style={{ width: 14, height: 10, background: '#ffedd5', border: '1px solid #f97316', borderRadius: 2 }} />
            <span>Risk Zone (3,780 – 3,920 m)</span>
          </div>

          <div className="traj-legend-chip">
            <span style={{ width: 14, height: 10, background: '#fef9c3', border: '1px solid #eab308', borderRadius: 2 }} />
            <span>Target Formation (Hugin Fm)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
