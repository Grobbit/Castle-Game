import * as THREE from 'three';
import { ROOF_PALETTES, STONE_PALETTES } from '../constants/palettes';
import { HeraldryEmblem, RoofColor, StoneStyle } from '../types/castle';

interface StoneMaterialSet {
  material: THREE.MeshStandardMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
}

const stoneCache = new Map<StoneStyle, StoneMaterialSet>();
const roofCache = new Map<RoofColor, THREE.MeshStandardMaterial>();
const bannerCache = new Map<string, THREE.MeshStandardMaterial>();
let halfTimberMaterial: THREE.MeshStandardMaterial | null = null;
let woodBeamMaterial: THREE.MeshStandardMaterial | null = null;
let woodDeckMaterial: THREE.MeshStandardMaterial | null = null;
let ironMaterial: THREE.MeshStandardMaterial | null = null;
let goldMaterial: THREE.MeshStandardMaterial | null = null;
let cobbleTexture: THREE.CanvasTexture | null = null;

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function createCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function getStoneMaterialSet(style: StoneStyle): StoneMaterialSet {
  const existing = stoneCache.get(style);
  if (existing) return existing;

  const def = STONE_PALETTES[style];
  const size = 256;
  const [diffCanvas, dCtx] = createCanvas(size);
  const [bumpCanvas, bCtx] = createCanvas(size);
  const rand = seededRand(style.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7));

  const c1 = hexToRgb(def.primaryHex);
  const c2 = hexToRgb(def.secondaryHex);

  // Mortar base
  dCtx.fillStyle = def.mortarHex;
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#242424';
  bCtx.fillRect(0, 0, size, size);

  if (style === 'whitewash') {
    dCtx.fillStyle = def.primaryHex;
    dCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#9a9a9a';
    bCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 650; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 4 + rand() * 14;
      dCtx.fillStyle = rand() > 0.5 ? 'rgba(255,250,240,0.12)' : 'rgba(155,140,115,0.11)';
      dCtx.beginPath();
      dCtx.arc(x, y, r, 0, Math.PI * 2);
      dCtx.fill();

      bCtx.fillStyle = rand() > 0.5 ? 'rgba(200,200,200,0.08)' : 'rgba(80,80,80,0.08)';
      bCtx.beginPath();
      bCtx.arc(x, y, r * 0.8, 0, Math.PI * 2);
      bCtx.fill();
    }
  } else if (style === 'cobble') {
    // Organic rounded river cobble pattern
    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 6 + (r % 2);
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.45);
      for (let c = -1; c <= cols; c++) {
        const w = colW * (0.82 + rand() * 0.14);
        const h = rowH * (0.76 + rand() * 0.16);
        const x = c * colW + offset + (rand() - 0.5) * 4;
        const yy = y + (rowH - h) * 0.5;
        const mix = rand();
        dCtx.fillStyle = lerpColor(c1, c2, mix);
        dCtx.beginPath();
        dCtx.roundRect(x + 2, yy + 2, w - 4, h - 4, 8);
        dCtx.fill();

        const bVal = Math.floor(155 + rand() * 85);
        bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
        bCtx.beginPath();
        bCtx.roundRect(x + 2, yy + 2, w - 4, h - 4, 8);
        bCtx.fill();
      }
    }
  } else {
    // Ashlar dressed medieval masonry courses
    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 4 + (r % 2);
      let curX = -(r % 2) * 24;
      while (curX < size) {
        const bw = (size / cols) * (0.75 + rand() * 0.5);
        const mix = rand();
        dCtx.fillStyle = lerpColor(c1, c2, mix);
        dCtx.fillRect(curX + 1.5, y + 1.5, bw - 3, rowH - 3);

        // Subtle stone bevel highlight at top
        dCtx.fillStyle = 'rgba(255,255,255,0.08)';
        dCtx.fillRect(curX + 2, y + 2, bw - 4, 3);

        const bVal = Math.floor(165 + rand() * 75);
        bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
        bCtx.fillRect(curX + 2, y + 2, bw - 4, rowH - 4);

        // Weathering speckles
        for (let s = 0; s < 6; s++) {
          const sx = curX + 4 + rand() * Math.max(4, bw - 8);
          const sy = y + 4 + rand() * (rowH - 8);
          dCtx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.06)';
          dCtx.fillRect(sx, sy, 2 + rand() * 4, 1.5);
        }

        if (style === 'mossy' && rand() > 0.58) {
          dCtx.fillStyle = 'rgba(84, 114, 62, 0.36)';
          dCtx.beginPath();
          dCtx.arc(curX + bw * rand(), y + rowH * rand(), 6 + rand() * 8, 0, Math.PI * 2);
          dCtx.fill();
        }
        curX += bw;
      }
    }
  }

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.repeat.set(1.5, 1.5);

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(1.5, 1.5);

  const material = new THREE.MeshStandardMaterial({
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.08,
    roughness: def.roughness,
    metalness: 0.04,
  });

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.trimHex),
    bumpMap: bumpTex,
    bumpScale: 0.03,
    roughness: Math.max(0.65, def.roughness - 0.1),
    metalness: 0.05,
  });

  const set = { material, trimMaterial };
  stoneCache.set(style, set);
  return set;
}

export function getRoofMaterial(roofColor: RoofColor): THREE.MeshStandardMaterial {
  const existing = roofCache.get(roofColor);
  if (existing) return existing;

  const def = ROOF_PALETTES[roofColor];
  const size = 256;
  const [diffCanvas, dCtx] = createCanvas(size);
  const [bumpCanvas, bCtx] = createCanvas(size);
  const rand = seededRand(roofColor.split('').reduce((acc, ch) => acc * 37 + ch.charCodeAt(0), 19));

  const c1 = hexToRgb(def.primaryHex);
  const c2 = hexToRgb(def.secondaryHex);

  dCtx.fillStyle = def.secondaryHex;
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#404040';
  bCtx.fillRect(0, 0, size, size);

  if (roofColor === 'thatch') {
    // Organic layered straw thatch streaks
    for (let i = 0; i < 950; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 14 + rand() * 24;
      dCtx.strokeStyle = lerpColor(c1, c2, rand());
      dCtx.lineWidth = 1.6 + rand() * 1.4;
      dCtx.beginPath();
      dCtx.moveTo(x, y);
      dCtx.lineTo(x + (rand() - 0.5) * 4, y + len);
      dCtx.stroke();

      const bv = Math.floor(110 + rand() * 120);
      bCtx.strokeStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.lineWidth = 1.6;
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(x, y + len);
      bCtx.stroke();
    }
  } else {
    // Scalloped / overlapping clay or slate shingles
    const rows = 12;
    const cols = 10;
    const rowH = size / rows;
    const colW = size / cols;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset;
        dCtx.fillStyle = lerpColor(c1, c2, rand());
        dCtx.beginPath();
        dCtx.roundRect(x + 1, y + 1, colW - 2, rowH * 1.05, [2, 2, 7, 7]);
        dCtx.fill();

        // Bottom lip shadow
        dCtx.fillStyle = 'rgba(0,0,0,0.22)';
        dCtx.fillRect(x + 1, y + rowH - 2, colW - 2, 2);

        const bv = Math.floor(155 + rand() * 80);
        bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
        bCtx.beginPath();
        bCtx.roundRect(x + 1, y + 1, colW - 2, rowH - 1, [2, 2, 6, 6]);
        bCtx.fill();
      }
    }
  }

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.repeat.set(2.2, 2.2);

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(2.2, 2.2);

  const mat = new THREE.MeshStandardMaterial({
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.06,
    roughness: def.roughness,
    metalness: def.metalness,
  });

  roofCache.set(roofColor, mat);
  return mat;
}

export function getHalfTimberMaterial(): THREE.MeshStandardMaterial {
  if (halfTimberMaterial) return halfTimberMaterial;

  const size = 256;
  const [c, ctx] = createCanvas(size);
  const [bc, bCtx] = createCanvas(size);

  // Cream limewash plaster
  ctx.fillStyle = '#eadec5';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, size, size);

  const rand = seededRand(441);
  for (let i = 0; i < 350; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(180,160,130,0.12)' : 'rgba(255,250,235,0.14)';
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 3 + rand() * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dark medieval oak timber beams
  const beam = '#4b3423';
  const beamBump = '#e8e8e8';
  ctx.fillStyle = beam;
  bCtx.fillStyle = beamBump;

  // Horizontal sills
  ctx.fillRect(0, 0, size, 18);
  ctx.fillRect(0, size - 18, size, 18);
  bCtx.fillRect(0, 0, size, 18);
  bCtx.fillRect(0, size - 18, size, 18);

  // Vertical posts
  for (const x of [0, 120, size - 16]) {
    ctx.fillRect(x, 0, 16, size);
    bCtx.fillRect(x, 0, 16, size);
  }

  // Diagonal X-bracing
  ctx.strokeStyle = beam;
  ctx.lineWidth = 14;
  bCtx.strokeStyle = beamBump;
  bCtx.lineWidth = 14;
  for (const [x0, x1] of [
    [8, 128],
    [128, 248],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x0, 12);
    ctx.lineTo(x1, size - 12);
    ctx.moveTo(x1, 12);
    ctx.lineTo(x0, size - 12);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x0, 12);
    bCtx.lineTo(x1, size - 12);
    bCtx.moveTo(x1, 12);
    bCtx.lineTo(x0, size - 12);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(2, 1);

  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 1);

  halfTimberMaterial = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 0.07,
    roughness: 0.88,
  });
  return halfTimberMaterial;
}

export function getWoodBeamMaterial(): THREE.MeshStandardMaterial {
  if (woodBeamMaterial) return woodBeamMaterial;
  woodBeamMaterial = new THREE.MeshStandardMaterial({
    color: '#5a3d28',
    roughness: 0.88,
    metalness: 0.04,
  });
  return woodBeamMaterial;
}

export function getWoodDeckMaterial(): THREE.MeshStandardMaterial {
  if (woodDeckMaterial) return woodDeckMaterial;
  const size = 256;
  const [c, ctx] = createCanvas(size);
  const rand = seededRand(812);
  ctx.fillStyle = '#755237';
  ctx.fillRect(0, 0, size, size);
  const planks = 8;
  const h = size / planks;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#845d3f' : '#6c4b32';
    ctx.fillRect(0, i * h + 1, size, h - 2);
    for (let g = 0; g < 16; g++) {
      ctx.fillStyle = 'rgba(30,18,10,0.14)';
      ctx.fillRect(rand() * size, i * h + 2 + rand() * (h - 5), 18 + rand() * 45, 1.5);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(2, 2);
  woodDeckMaterial = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.86,
  });
  return woodDeckMaterial;
}

export function getIronMaterial(): THREE.MeshStandardMaterial {
  if (ironMaterial) return ironMaterial;
  ironMaterial = new THREE.MeshStandardMaterial({
    color: '#2c313a',
    roughness: 0.45,
    metalness: 0.78,
  });
  return ironMaterial;
}

export function getGoldMaterial(): THREE.MeshStandardMaterial {
  if (goldMaterial) return goldMaterial;
  goldMaterial = new THREE.MeshStandardMaterial({
    color: '#e6b44c',
    roughness: 0.34,
    metalness: 0.82,
  });
  return goldMaterial;
}

export function getCobbleGroundTexture(): THREE.CanvasTexture {
  if (cobbleTexture) return cobbleTexture;
  const size = 256;
  const [c, ctx] = createCanvas(size);
  const rand = seededRand(999);
  ctx.fillStyle = '#6f6b63';
  ctx.fillRect(0, 0, size, size);
  const rows = 10;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 8;
    const colW = size / cols;
    const off = (r % 2) * (colW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const shade = Math.floor(135 + rand() * 55);
      ctx.fillStyle = `rgb(${shade + 4},${shade},${shade - 6})`;
      ctx.beginPath();
      ctx.roundRect(col * colW + off + 2, r * rowH + 2, colW - 4, rowH - 4, 6);
      ctx.fill();
    }
  }
  cobbleTexture = new THREE.CanvasTexture(c);
  cobbleTexture.wrapS = THREE.RepeatWrapping;
  cobbleTexture.wrapT = THREE.RepeatWrapping;
  cobbleTexture.colorSpace = THREE.SRGBColorSpace;
  return cobbleTexture;
}

export function getBannerMaterial(colorHex: string, emblem: HeraldryEmblem): THREE.MeshStandardMaterial {
  const key = `${colorHex}_${emblem}`;
  const existing = bannerCache.get(key);
  if (existing) return existing;

  const [c, ctx] = createCanvas(128);
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle vertical cloth shading & border trim
  ctx.strokeStyle = '#e7c162';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 118, 118);

  // Gold emblem
  ctx.fillStyle = '#f4d374';
  ctx.strokeStyle = '#f4d374';
  ctx.save();
  ctx.translate(64, 58);
  if (emblem === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-24, 16);
    ctx.lineTo(-28, -14);
    ctx.lineTo(-10, 2);
    ctx.lineTo(0, -22);
    ctx.lineTo(10, 2);
    ctx.lineTo(28, -14);
    ctx.lineTo(24, 16);
    ctx.closePath();
    ctx.fill();
  } else if (emblem === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 28 : 10;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (emblem === 'chevron') {
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-26, 12);
    ctx.lineTo(0, -14);
    ctx.lineTo(26, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, 28);
    ctx.lineTo(0, 8);
    ctx.lineTo(20, 28);
    ctx.stroke();
  } else if (emblem === 'sun') {
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.stroke();
    }
  } else if (emblem === 'fleur') {
    ctx.beginPath();
    ctx.ellipse(0, -8, 9, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-14, 4, 12, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 4, 12, 7, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-16, 12, 32, 6);
  } else {
    // Shield / Lion silhouette
    ctx.beginPath();
    ctx.moveTo(-20, -20);
    ctx.lineTo(20, -20);
    ctx.lineTo(20, 4);
    ctx.quadraticCurveTo(0, 28, 0, 28);
    ctx.quadraticCurveTo(0, 28, -20, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  bannerCache.set(key, mat);
  return mat;
}
