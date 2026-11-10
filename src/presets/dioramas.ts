import { CastleWorldState, TerrainData } from '../types/castle';
import { createEmptyTerrain, getTerrainHeightAt, gridToWorld } from '../engine/terrain';

export interface DioramaPresetMeta {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  build: () => CastleWorldState;
}

function sculptHeight(
  terrain: TerrainData,
  fn: (wx: number, wz: number) => { h: number; surf?: number }
): void {
  const res = terrain.gridRes;
  for (let z = 0; z < res; z++) {
    for (let x = 0; x < res; x++) {
      const [wx, wz] = gridToWorld(terrain, x, z);
      const { h, surf } = fn(wx, wz);
      const idx = z * res + x;
      terrain.heights[idx] = h;
      if (surf !== undefined) terrain.surface[idx] = surf;
    }
  }
}

function paintPathLine(
  terrain: TerrainData,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  radius: number,
  surfCode: number
): void {
  const res = terrain.gridRes;
  const steps = Math.max(8, Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 1.5));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x0 + (x1 - x0) * t;
    const pz = z0 + (z1 - z0) * t;
    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const [wx, wz] = gridToWorld(terrain, x, z);
        if (Math.hypot(wx - px, wz - pz) <= radius) {
          const idx = z * res + x;
          if (terrain.heights[idx] > 0.12) {
            terrain.surface[idx] = surfCode;
          }
        }
      }
    }
  }
}

function paintCircleSurface(
  terrain: TerrainData,
  cx: number,
  cz: number,
  radius: number,
  surfCode: number
): void {
  const res = terrain.gridRes;
  for (let z = 0; z < res; z++) {
    for (let x = 0; x < res; x++) {
      const [wx, wz] = gridToWorld(terrain, x, z);
      if (Math.hypot(wx - cx, wz - cz) <= radius && terrain.heights[z * res + x] > 0.15) {
        terrain.surface[z * res + x] = surfCode;
      }
    }
  }
}

function buildMontclairCitadel(): CastleWorldState {
  const terrain = createEmptyTerrain(1.4);
  sculptHeight(terrain, (x, z) => {
    const dCenter = Math.hypot(x, z);
    // Elevated flat-ish castle hill at center
    let h = 1.4;
    if (dCenter < 15.5) {
      h += Math.max(0, 1 - Math.pow(dCenter / 15.5, 2.2)) * 2.1;
      if (dCenter < 10.5) h = 3.35;
    }
    // Moat channel wrapping south/east/west arc around the hill
    const dMoat = Math.abs(dCenter - 18.2);
    if (dMoat < 3.6 && z > -14) {
      const moatFactor = Math.cos((dMoat / 3.6) * (Math.PI * 0.5));
      h -= moatFactor * 3.1;
    }
    // Gentle rolling outer hillside to the north
    if (z < -12) {
      h += Math.sin(x * 0.11) * 0.9 + Math.max(0, (-z - 12) * 0.14);
    }
    return { h: Math.max(-2.2, h) };
  });

  // Courtyard flagstone & cobble approach road across the bridge
  paintCircleSurface(terrain, 0, 0, 8.8, 2);
  paintPathLine(terrain, 0, 32, 0, 2, 1.8, 1);
  paintPathLine(terrain, -5, -1, 5, -1, 1.5, 2);

  const g = (x: number, z: number) => getTerrainHeightAt(terrain, x, z);

  return {
    version: 1,
    name: 'Montclair Citadel',
    terrain,
    walls: [
      {
        id: 'w-outer',
        points: [
          { x: -10.5, y: g(-10.5, 8.5), z: 8.5 },
          { x: 10.5, y: g(10.5, 8.5), z: 8.5 },
          { x: 12.2, y: g(12.2, -3.5), z: -3.5 },
          { x: 7.5, y: g(7.5, -10.5), z: -10.5 },
          { x: -7.5, y: g(-7.5, -10.5), z: -10.5 },
          { x: -12.2, y: g(-12.2, -3.5), z: -3.5 },
          { x: -10.5, y: g(-10.5, 8.5), z: 8.5 },
        ],
        height: 4.6,
        thickness: 1.25,
        stoneStyle: 'limestone',
        topStyle: 'crenellated',
        cornerTurrets: true,
        ivyAmount: 0.35,
        forcedGates: [0],
      },
      {
        id: 'w-forecourt',
        points: [
          { x: -6.2, y: g(-6.2, 23.0), z: 23.0 },
          { x: -2.6, y: g(-2.6, 22.8), z: 22.8 },
        ],
        height: 3.1,
        thickness: 0.95,
        stoneStyle: 'limestone',
        topStyle: 'crenellated',
        cornerTurrets: true,
        ivyAmount: 0.25,
        forcedGates: [],
      },
      {
        id: 'w-forecourt-r',
        points: [
          { x: 2.6, y: g(2.6, 22.8), z: 22.8 },
          { x: 6.2, y: g(6.2, 23.0), z: 23.0 },
        ],
        height: 3.1,
        thickness: 0.95,
        stoneStyle: 'limestone',
        topStyle: 'crenellated',
        cornerTurrets: true,
        ivyAmount: 0.25,
        forcedGates: [],
      },
    ],
    towers: [
      {
        id: 't-keep-spire',
        x: 3.8,
        y: g(3.8, -5.2) + 8.6,
        z: -5.2,
        shape: 'round',
        radius: 1.55,
        height: 5.8,
        stoneStyle: 'limestone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.35,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#b8323c',
        ivyAmount: 0.1,
      },
      {
        id: 't-sw',
        x: -10.5,
        y: g(-10.5, 8.5),
        z: 8.5,
        shape: 'round',
        radius: 2.1,
        height: 7.4,
        stoneStyle: 'limestone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.25,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#b8323c',
        ivyAmount: 0.3,
      },
      {
        id: 't-se',
        x: 10.5,
        y: g(10.5, 8.5),
        z: 8.5,
        shape: 'round',
        radius: 2.1,
        height: 7.4,
        stoneStyle: 'limestone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.25,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#b8323c',
        ivyAmount: 0.3,
      },
      {
        id: 't-nw',
        x: -7.6,
        y: g(-7.6, -10.5),
        z: -10.5,
        shape: 'octagonal',
        radius: 2.2,
        height: 9.2,
        stoneStyle: 'limestone',
        roofStyle: 'steep_hip',
        roofColor: 'slate',
        roofPitch: 1.3,
        hasMachicolations: true,
        hasHalfTimberTop: true,
        dormers: true,
        finial: 'weathervane',
        heraldryColor: '#d49a2a',
        ivyAmount: 0.2,
      },
      {
        id: 't-ne',
        x: 7.6,
        y: g(7.6, -10.5),
        z: -10.5,
        shape: 'round',
        radius: 2.35,
        height: 10.6,
        stoneStyle: 'limestone',
        roofStyle: 'conical',
        roofColor: 'slate',
        roofPitch: 1.38,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'spire',
        heraldryColor: '#b8323c',
        ivyAmount: 0.2,
      },
      {
        id: 't-gate-l',
        x: -2.4,
        y: g(-2.4, 8.6),
        z: 8.6,
        shape: 'round',
        radius: 1.45,
        height: 6.8,
        stoneStyle: 'limestone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.2,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: false,
        finial: 'flag',
        heraldryColor: '#b8323c',
        ivyAmount: 0.15,
      },
      {
        id: 't-gate-r',
        x: 2.4,
        y: g(2.4, 8.6),
        z: 8.6,
        shape: 'round',
        radius: 1.45,
        height: 6.8,
        stoneStyle: 'limestone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.2,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: false,
        finial: 'flag',
        heraldryColor: '#b8323c',
        ivyAmount: 0.15,
      },
    ],
    buildings: [
      {
        id: 'b-keep',
        kind: 'keep',
        x: 0.4,
        y: g(0.4, -4.6),
        z: -4.6,
        width: 8.2,
        depth: 6.4,
        height: 8.6,
        rotation: 0,
        floors: 3,
        stoneStyle: 'limestone',
        halfTimberUpper: false,
        roofStyle: 'crenellated',
        roofColor: 'terracotta',
        roofPitch: 1.0,
        hasChimney: true,
        hasButtresses: true,
        hasDormers: true,
        heraldryColor: '#b8323c',
        ivyAmount: 0.25,
      },
      {
        id: 'b-hall',
        kind: 'hall',
        x: -5.6,
        y: g(-5.6, 1.2),
        z: 1.2,
        width: 4.2,
        depth: 6.6,
        height: 4.8,
        rotation: 0.08,
        floors: 2,
        stoneStyle: 'limestone',
        halfTimberUpper: true,
        roofStyle: 'stepped_gable',
        roofColor: 'terracotta',
        roofPitch: 1.15,
        hasChimney: true,
        hasButtresses: false,
        hasDormers: true,
        heraldryColor: '#b8323c',
        ivyAmount: 0.2,
      },
      {
        id: 'b-chapel',
        kind: 'chapel',
        x: 5.8,
        y: g(5.8, 0.8),
        z: 0.8,
        width: 3.8,
        depth: 6.4,
        height: 5.5,
        rotation: -0.08,
        floors: 2,
        stoneStyle: 'limestone',
        halfTimberUpper: false,
        roofStyle: 'chapel_spire',
        roofColor: 'slate',
        roofPitch: 1.2,
        hasChimney: false,
        hasButtresses: true,
        hasDormers: false,
        heraldryColor: '#d49a2a',
        ivyAmount: 0.2,
      },
    ],
    bridges: [
      {
        id: 'br-main',
        kind: 'stone_arch',
        start: { x: 0, y: g(0, 12.2) + 0.18, z: 12.2 },
        end: { x: 0, y: g(0, 22.8) + 0.25, z: 22.8 },
        width: 2.6,
        archHeight: 1.1,
        stoneStyle: 'limestone',
        hasLanterns: true,
      },
    ],
    attachments: [
      {
        id: 'att-b1',
        kind: 'banner',
        position: { x: -2.4, y: g(-2.4, 8.6) + 5.1, z: 10.05 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.0,
        heraldryColor: '#b8323c',
        emblem: 'crown',
      },
      {
        id: 'att-b2',
        kind: 'banner',
        position: { x: 2.4, y: g(2.4, 8.6) + 5.1, z: 10.05 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.0,
        heraldryColor: '#b8323c',
        emblem: 'lion',
      },
      {
        id: 'att-l1',
        kind: 'wall_lantern',
        position: { x: -2.4, y: g(-2.4, 8.6) + 2.8, z: 10.08 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.1,
        heraldryColor: '#b8323c',
        emblem: 'crown',
      },
      {
        id: 'att-l2',
        kind: 'wall_lantern',
        position: { x: 2.4, y: g(2.4, 8.6) + 2.8, z: 10.08 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.1,
        heraldryColor: '#b8323c',
        emblem: 'crown',
      },
    ],
    flora: [
      { id: 'f1', kind: 'oak', x: -16, y: g(-16, -15), z: -15, scale: 1.25, rotation: 0.4, seed: 11 },
      { id: 'f2', kind: 'oak', x: 17, y: g(17, -14), z: -14, scale: 1.15, rotation: 1.8, seed: 22 },
      { id: 'f3', kind: 'pine', x: -23, y: g(-23, -18), z: -18, scale: 1.3, rotation: 0.2, seed: 33 },
      { id: 'f4', kind: 'pine', x: 24, y: g(24, -19), z: -19, scale: 1.4, rotation: 2.1, seed: 44 },
      { id: 'f5', kind: 'cypress', x: 3.1, y: g(3.1, 4.4), z: 4.4, scale: 0.9, rotation: 0, seed: 55 },
      { id: 'f6', kind: 'cypress', x: -3.1, y: g(-3.1, 4.4), z: 4.4, scale: 0.9, rotation: 0.5, seed: 66 },
      { id: 'f7', kind: 'willow', x: -19, y: g(-19, 14), z: 14, scale: 1.15, rotation: 1.1, seed: 77 },
      { id: 'f8', kind: 'blossom', x: 18, y: g(18, 17), z: 17, scale: 1.1, rotation: 0.9, seed: 88 },
      { id: 'f9', kind: 'oak', x: -14, y: g(-14, 24), z: 24, scale: 1.1, rotation: 2.4, seed: 99 },
      { id: 'f10', kind: 'blossom', x: 11, y: g(11, 25), z: 25, scale: 1.0, rotation: 0.3, seed: 105 },
      { id: 'f11', kind: 'wildflowers', x: -8, y: g(-8, 25), z: 25, scale: 1.2, rotation: 0.2, seed: 112 },
      { id: 'f12', kind: 'wildflowers', x: 7.5, y: g(7.5, 26), z: 26, scale: 1.2, rotation: 1.3, seed: 119 },
      { id: 'f13', kind: 'reeds', x: -13.5, y: g(-13.5, 13.5), z: 13.5, scale: 1.1, rotation: 0.7, seed: 125 },
      { id: 'f14', kind: 'reeds', x: 14.5, y: g(14.5, 12.2), z: 12.2, scale: 1.1, rotation: 1.9, seed: 131 },
    ],
    props: [
      { id: 'p1', kind: 'fountain', x: 0, y: g(0, 2.2), z: 2.2, scale: 0.95, rotation: 0, color: '#b8323c' },
      { id: 'p2', kind: 'market_stall', x: -3.2, y: g(-3.2, 5.2), z: 5.2, scale: 0.9, rotation: 0.35, color: '#b8323c' },
      { id: 'p3', kind: 'well', x: 3.3, y: g(3.3, 5.4), z: 5.4, scale: 0.95, rotation: -0.4, color: '#b8323c' },
      { id: 'p4', kind: 'cart', x: 4.8, y: g(4.8, 25.5), z: 25.5, scale: 1.0, rotation: -0.6, color: '#b8323c' },
      { id: 'p5', kind: 'lamp_post', x: -2.4, y: g(-2.4, 24.5), z: 24.5, scale: 0.95, rotation: 0, color: '#b8323c' },
      { id: 'p6', kind: 'lamp_post', x: 2.4, y: g(2.4, 24.5), z: 24.5, scale: 0.95, rotation: 0, color: '#b8323c' },
    ],
    atmosphere: {
      timeOfDay: 16.4,
      sunAzimuth: 52,
      weather: 'clear',
      fov: 38,
      bloomStrength: 0.35,
      wildlifeEnabled: true,
      turntable: false,
      photoMode: false,
    },
  };
}

function buildLochhavenKeep(): CastleWorldState {
  const terrain = createEmptyTerrain(-1.8);
  sculptHeight(terrain, (x, z) => {
    const d = Math.hypot(x, z);
    let h = -1.85;
    // Central castle island
    if (d < 13.5) {
      h = 1.6 - Math.pow(d / 13.5, 4) * 1.4;
      if (d < 9.5) h = 1.85;
    }
    // Outer ring shoreline
    if (d > 23) {
      const bank = Math.min(1, (d - 23) / 7);
      h = -1.8 + bank * 3.4 + Math.sin(x * 0.14) * Math.cos(z * 0.14) * 0.65;
    }
    return { h };
  });

  paintCircleSurface(terrain, 0, 0, 7.6, 2);
  paintPathLine(terrain, 0, 34, 0, 21, 1.8, 1);
  paintPathLine(terrain, -34, 0, -21, 0, 1.8, 1);
  const g = (x: number, z: number) => getTerrainHeightAt(terrain, x, z);

  return {
    version: 1,
    name: 'Lochhaven Water Keep',
    terrain,
    walls: [
      {
        id: 'lw1',
        points: [
          { x: -8.2, y: g(-8.2, 8.2), z: 8.2 },
          { x: 8.2, y: g(8.2, 8.2), z: 8.2 },
          { x: 8.2, y: g(8.2, -8.2), z: -8.2 },
          { x: -8.2, y: g(-8.2, -8.2), z: -8.2 },
          { x: -8.2, y: g(-8.2, 8.2), z: 8.2 },
        ],
        height: 4.4,
        thickness: 1.15,
        stoneStyle: 'cobble',
        topStyle: 'machicolated',
        cornerTurrets: true,
        ivyAmount: 0.45,
        forcedGates: [0, 3],
      },
    ],
    towers: [
      {
        id: 'lt1',
        x: -8.2,
        y: g(-8.2, 8.2),
        z: 8.2,
        shape: 'square',
        radius: 1.95,
        height: 7.5,
        stoneStyle: 'cobble',
        roofStyle: 'steep_hip',
        roofColor: 'slate',
        roofPitch: 1.3,
        hasMachicolations: true,
        hasHalfTimberTop: true,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#2f64a8',
        ivyAmount: 0.3,
      },
      {
        id: 'lt2',
        x: 8.2,
        y: g(8.2, 8.2),
        z: 8.2,
        shape: 'square',
        radius: 1.95,
        height: 7.5,
        stoneStyle: 'cobble',
        roofStyle: 'steep_hip',
        roofColor: 'slate',
        roofPitch: 1.3,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#2f64a8',
        ivyAmount: 0.3,
      },
      {
        id: 'lt3',
        x: 8.2,
        y: g(8.2, -8.2),
        z: -8.2,
        shape: 'round',
        radius: 2.15,
        height: 9.6,
        stoneStyle: 'cobble',
        roofStyle: 'conical',
        roofColor: 'copper',
        roofPitch: 1.35,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'spire',
        heraldryColor: '#2f64a8',
        ivyAmount: 0.35,
      },
      {
        id: 'lt4',
        x: -8.2,
        y: g(-8.2, -8.2),
        z: -8.2,
        shape: 'round',
        radius: 2.0,
        height: 8.2,
        stoneStyle: 'cobble',
        roofStyle: 'conical',
        roofColor: 'copper',
        roofPitch: 1.3,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: false,
        finial: 'weathervane',
        heraldryColor: '#2f64a8',
        ivyAmount: 0.35,
      },
    ],
    buildings: [
      {
        id: 'lb1',
        kind: 'keep',
        x: 0.8,
        y: g(0.8, -1.8),
        z: -1.8,
        width: 7.0,
        depth: 5.4,
        height: 7.8,
        rotation: 0,
        floors: 3,
        stoneStyle: 'cobble',
        halfTimberUpper: true,
        roofStyle: 'stepped_gable',
        roofColor: 'slate',
        roofPitch: 1.15,
        hasChimney: true,
        hasButtresses: true,
        hasDormers: true,
        heraldryColor: '#2f64a8',
        ivyAmount: 0.25,
      },
      {
        id: 'lb2',
        kind: 'hall',
        x: 1.4,
        y: g(1.4, 3.6),
        z: 3.6,
        width: 5.2,
        depth: 3.4,
        height: 4.2,
        rotation: 0,
        floors: 2,
        stoneStyle: 'whitewash',
        halfTimberUpper: true,
        roofStyle: 'gable',
        roofColor: 'copper',
        roofPitch: 1.1,
        hasChimney: true,
        hasButtresses: false,
        hasDormers: true,
        heraldryColor: '#2f64a8',
        ivyAmount: 0.2,
      },
    ],
    bridges: [
      {
        id: 'lbr1',
        kind: 'drawbridge',
        start: { x: 0, y: g(0, 9.2), z: 9.2 },
        end: { x: 0, y: g(0, 24.5), z: 24.5 },
        width: 2.5,
        archHeight: 0.6,
        stoneStyle: 'cobble',
        hasLanterns: true,
      },
      {
        id: 'lbr2',
        kind: 'stone_arch',
        start: { x: -9.2, y: g(-9.2, 0), z: 0 },
        end: { x: -24.5, y: g(-24.5, 0), z: 0 },
        width: 2.3,
        archHeight: 1.35,
        stoneStyle: 'cobble',
        hasLanterns: true,
      },
    ],
    attachments: [
      {
        id: 'la1',
        kind: 'banner',
        position: { x: 0.8, y: g(0.8, -1.8) + 4.8, z: 1.15 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.0,
        heraldryColor: '#2f64a8',
        emblem: 'star',
      },
    ],
    flora: [
      { id: 'lf1', kind: 'willow', x: -25, y: g(-25, 16), z: 16, scale: 1.25, rotation: 0.5, seed: 301 },
      { id: 'lf2', kind: 'willow', x: 24, y: g(24, 15), z: 15, scale: 1.2, rotation: 2.1, seed: 302 },
      { id: 'lf3', kind: 'pine', x: 26, y: g(26, -18), z: -18, scale: 1.35, rotation: 0.8, seed: 303 },
      { id: 'lf4', kind: 'pine', x: -27, y: g(-27, -17), z: -17, scale: 1.4, rotation: 1.5, seed: 304 },
      { id: 'lf5', kind: 'reeds', x: -12.5, y: -0.1, z: 7.5, scale: 1.2, rotation: 0.2, seed: 305 },
      { id: 'lf6', kind: 'reeds', x: 12.2, y: -0.1, z: -6.5, scale: 1.2, rotation: 1.2, seed: 306 },
    ],
    props: [
      { id: 'lp1', kind: 'gazebo', x: 26, y: g(26, 4), z: 4, scale: 1.0, rotation: 0.3, color: '#2f64a8' },
      { id: 'lp2', kind: 'lamp_post', x: -2.0, y: g(-2.0, 26), z: 26, scale: 1.0, rotation: 0, color: '#2f64a8' },
      { id: 'lp3', kind: 'lamp_post', x: 2.0, y: g(2.0, 26), z: 26, scale: 1.0, rotation: 0, color: '#2f64a8' },
      { id: 'lp4', kind: 'campfire', x: -2.8, y: g(-2.8, 3.8), z: 3.8, scale: 1.0, rotation: 0, color: '#2f64a8' },
    ],
    atmosphere: {
      timeOfDay: 18.8,
      sunAzimuth: 120,
      weather: 'mist',
      fov: 36,
      bloomStrength: 0.45,
      wildlifeEnabled: true,
      turntable: false,
      photoMode: false,
    },
  };
}

function buildSunspireAbbey(): CastleWorldState {
  const terrain = createEmptyTerrain(1.2);
  sculptHeight(terrain, (x, z) => {
    const d = Math.hypot(x, z * 1.15);
    let h = 1.2 + Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.55;
    if (d < 16) {
      h = 2.8;
    } else if (d < 22) {
      const t = (d - 16) / 6;
      h = 2.8 - t * 1.5;
    }
    return { h };
  });

  paintCircleSurface(terrain, 0, 2, 11.5, 2);
  paintPathLine(terrain, 0, 32, 0, 12, 2.0, 1);
  const g = (x: number, z: number) => getTerrainHeightAt(terrain, x, z);

  return {
    version: 1,
    name: 'Sunspire Abbey',
    terrain,
    walls: [
      {
        id: 'sw1',
        points: [
          { x: -12, y: g(-12, 11), z: 11 },
          { x: 12, y: g(12, 11), z: 11 },
        ],
        height: 3.4,
        thickness: 0.95,
        stoneStyle: 'sandstone',
        topStyle: 'smooth',
        cornerTurrets: true,
        ivyAmount: 0.3,
        forcedGates: [0],
      },
    ],
    towers: [
      {
        id: 'st1',
        x: -3.6,
        y: g(-3.6, -6.5),
        z: -6.5,
        shape: 'octagonal',
        radius: 1.85,
        height: 13.5,
        stoneStyle: 'sandstone',
        roofStyle: 'bell',
        roofColor: 'copper',
        roofPitch: 1.3,
        hasMachicolations: false,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'spire',
        heraldryColor: '#d49a2a',
        ivyAmount: 0.2,
      },
      {
        id: 'st2',
        x: 3.6,
        y: g(3.6, -6.5),
        z: -6.5,
        shape: 'octagonal',
        radius: 1.85,
        height: 13.5,
        stoneStyle: 'sandstone',
        roofStyle: 'bell',
        roofColor: 'copper',
        roofPitch: 1.3,
        hasMachicolations: false,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'spire',
        heraldryColor: '#d49a2a',
        ivyAmount: 0.2,
      },
      {
        id: 'st3',
        x: -12,
        y: g(-12, 11),
        z: 11,
        shape: 'round',
        radius: 1.5,
        height: 5.5,
        stoneStyle: 'sandstone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.2,
        hasMachicolations: false,
        hasHalfTimberTop: false,
        dormers: false,
        finial: 'weathervane',
        heraldryColor: '#d49a2a',
        ivyAmount: 0.35,
      },
      {
        id: 'st4',
        x: 12,
        y: g(12, 11),
        z: 11,
        shape: 'round',
        radius: 1.5,
        height: 5.5,
        stoneStyle: 'sandstone',
        roofStyle: 'conical',
        roofColor: 'terracotta',
        roofPitch: 1.2,
        hasMachicolations: false,
        hasHalfTimberTop: false,
        dormers: false,
        finial: 'weathervane',
        heraldryColor: '#d49a2a',
        ivyAmount: 0.35,
      },
    ],
    buildings: [
      {
        id: 'sb1',
        kind: 'chapel',
        x: 0,
        y: g(0, -4.5),
        z: -4.5,
        width: 5.4,
        depth: 10.2,
        height: 7.4,
        rotation: 0,
        floors: 2,
        stoneStyle: 'sandstone',
        halfTimberUpper: false,
        roofStyle: 'chapel_spire',
        roofColor: 'copper',
        roofPitch: 1.25,
        hasChimney: false,
        hasButtresses: true,
        hasDormers: true,
        heraldryColor: '#d49a2a',
        ivyAmount: 0.2,
      },
      {
        id: 'sb2',
        kind: 'cloister',
        x: -7.5,
        y: g(-7.5, 2.5),
        z: 2.5,
        width: 7.8,
        depth: 3.2,
        height: 3.6,
        rotation: Math.PI / 2,
        floors: 1,
        stoneStyle: 'sandstone',
        halfTimberUpper: false,
        roofStyle: 'hip',
        roofColor: 'terracotta',
        roofPitch: 0.95,
        hasChimney: false,
        hasButtresses: false,
        hasDormers: false,
        heraldryColor: '#d49a2a',
        ivyAmount: 0.35,
      },
      {
        id: 'sb3',
        kind: 'cloister',
        x: 7.5,
        y: g(7.5, 2.5),
        z: 2.5,
        width: 7.8,
        depth: 3.2,
        height: 3.6,
        rotation: -Math.PI / 2,
        floors: 1,
        stoneStyle: 'sandstone',
        halfTimberUpper: false,
        roofStyle: 'hip',
        roofColor: 'terracotta',
        roofPitch: 0.95,
        hasChimney: false,
        hasButtresses: false,
        hasDormers: false,
        heraldryColor: '#d49a2a',
        ivyAmount: 0.35,
      },
    ],
    bridges: [
      {
        id: 'sbr1',
        kind: 'stone_stairs',
        start: { x: 0, y: g(0, 14.5), z: 14.5 },
        end: { x: 0, y: g(0, 22), z: 22 },
        width: 3.2,
        archHeight: 0,
        stoneStyle: 'sandstone',
        hasLanterns: true,
      },
    ],
    attachments: [
      {
        id: 'satt1',
        kind: 'rose_window',
        position: { x: 0, y: g(0, -4.5) + 4.9, z: 0.65 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.35,
        heraldryColor: '#d49a2a',
        emblem: 'sun',
      },
      {
        id: 'satt2',
        kind: 'banner',
        position: { x: -3.6, y: g(-3.6, -6.5) + 7.5, z: -4.65 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.0,
        heraldryColor: '#d49a2a',
        emblem: 'sun',
      },
      {
        id: 'satt3',
        kind: 'banner',
        position: { x: 3.6, y: g(3.6, -6.5) + 7.5, z: -4.65 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.0,
        heraldryColor: '#d49a2a',
        emblem: 'sun',
      },
    ],
    flora: [
      { id: 'sf1', kind: 'cypress', x: -3.2, y: g(-3.2, 16), z: 16, scale: 1.1, rotation: 0, seed: 501 },
      { id: 'sf2', kind: 'cypress', x: 3.2, y: g(3.2, 16), z: 16, scale: 1.1, rotation: 0, seed: 502 },
      { id: 'sf3', kind: 'cypress', x: -3.4, y: g(-3.4, 24), z: 24, scale: 1.15, rotation: 0, seed: 503 },
      { id: 'sf4', kind: 'cypress', x: 3.4, y: g(3.4, 24), z: 24, scale: 1.15, rotation: 0, seed: 504 },
      { id: 'sf5', kind: 'blossom', x: -4.2, y: g(-4.2, 4.5), z: 4.5, scale: 0.95, rotation: 0.4, seed: 505 },
      { id: 'sf6', kind: 'blossom', x: 4.2, y: g(4.2, 4.5), z: 4.5, scale: 0.95, rotation: 1.7, seed: 506 },
      { id: 'sf7', kind: 'hedge', x: -3.5, y: g(-3.5, 7.8), z: 7.8, scale: 1.0, rotation: 0, seed: 507 },
      { id: 'sf8', kind: 'hedge', x: 3.5, y: g(3.5, 7.8), z: 7.8, scale: 1.0, rotation: 0, seed: 508 },
    ],
    props: [
      { id: 'sp1', kind: 'fountain', x: 0, y: g(0, 4.5), z: 4.5, scale: 1.15, rotation: 0, color: '#d49a2a' },
      { id: 'sp2', kind: 'bench', x: -3.8, y: g(-3.8, 2.2), z: 2.2, scale: 1.0, rotation: Math.PI / 2, color: '#d49a2a' },
      { id: 'sp3', kind: 'bench', x: 3.8, y: g(3.8, 2.2), z: 2.2, scale: 1.0, rotation: -Math.PI / 2, color: '#d49a2a' },
      { id: 'sp4', kind: 'lamp_post', x: -2.2, y: g(-2.2, 12.2), z: 12.2, scale: 0.95, rotation: 0, color: '#d49a2a' },
      { id: 'sp5', kind: 'lamp_post', x: 2.2, y: g(2.2, 12.2), z: 12.2, scale: 0.95, rotation: 0, color: '#d49a2a' },
    ],
    atmosphere: {
      timeOfDay: 17.7,
      sunAzimuth: 225,
      weather: 'clear',
      fov: 35,
      bloomStrength: 0.42,
      wildlifeEnabled: true,
      turntable: false,
      photoMode: false,
    },
  };
}

function buildHighcliffWatch(): CastleWorldState {
  const terrain = createEmptyTerrain(-1.4);
  sculptHeight(terrain, (x, z) => {
    const dPeak = Math.hypot(x, z + 6);
    let h = -1.6;
    let surf = 0;
    if (dPeak < 14) {
      h = 6.2;
      if (dPeak > 10.5) {
        h -= (dPeak - 10.5) * 2.1;
        surf = 4;
      }
    }
    // Southern landing ridge
    const dSouth = Math.hypot(x, z - 20);
    if (dSouth < 11) {
      h = Math.max(h, 3.6 - Math.max(0, dSouth - 6) * 1.1);
    }
    return { h, surf };
  });

  paintCircleSurface(terrain, 0, -6, 8.2, 2);
  paintPathLine(terrain, 0, 26, 0, 12, 1.8, 1);
  const g = (x: number, z: number) => getTerrainHeightAt(terrain, x, z);

  return {
    version: 1,
    name: 'Highcliff Watch',
    terrain,
    walls: [
      {
        id: 'hw1',
        points: [
          { x: -8.5, y: g(-8.5, 2.5), z: 2.5 },
          { x: 8.5, y: g(8.5, 2.5), z: 2.5 },
          { x: 9.5, y: g(9.5, -13), z: -13 },
          { x: -9.5, y: g(-9.5, -13), z: -13 },
          { x: -8.5, y: g(-8.5, 2.5), z: 2.5 },
        ],
        height: 4.5,
        thickness: 1.2,
        stoneStyle: 'basalt',
        topStyle: 'machicolated',
        cornerTurrets: true,
        ivyAmount: 0.15,
        forcedGates: [0],
      },
    ],
    towers: [
      {
        id: 'ht1',
        x: -8.5,
        y: g(-8.5, 2.5),
        z: 2.5,
        shape: 'round',
        radius: 2.0,
        height: 8.2,
        stoneStyle: 'basalt',
        roofStyle: 'conical',
        roofColor: 'obsidian',
        roofPitch: 1.4,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#9c363e',
        ivyAmount: 0.1,
      },
      {
        id: 'ht2',
        x: 8.5,
        y: g(8.5, 2.5),
        z: 2.5,
        shape: 'round',
        radius: 2.0,
        height: 8.2,
        stoneStyle: 'basalt',
        roofStyle: 'conical',
        roofColor: 'obsidian',
        roofPitch: 1.4,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'flag',
        heraldryColor: '#9c363e',
        ivyAmount: 0.1,
      },
      {
        id: 'ht3',
        x: 0,
        y: g(0, -13),
        z: -13,
        shape: 'octagonal',
        radius: 2.8,
        height: 12.0,
        stoneStyle: 'basalt',
        roofStyle: 'steep_hip',
        roofColor: 'crimson',
        roofPitch: 1.35,
        hasMachicolations: true,
        hasHalfTimberTop: false,
        dormers: true,
        finial: 'spire',
        heraldryColor: '#9c363e',
        ivyAmount: 0.1,
      },
    ],
    buildings: [
      {
        id: 'hb1',
        kind: 'keep',
        x: 0,
        y: g(0, -6.5),
        z: -6.5,
        width: 7.4,
        depth: 5.8,
        height: 8.2,
        rotation: 0,
        floors: 3,
        stoneStyle: 'basalt',
        halfTimberUpper: false,
        roofStyle: 'crenellated',
        roofColor: 'crimson',
        roofPitch: 1.0,
        hasChimney: true,
        hasButtresses: true,
        hasDormers: false,
        heraldryColor: '#9c363e',
        ivyAmount: 0.1,
      },
    ],
    bridges: [
      {
        id: 'hbr1',
        kind: 'stone_arch',
        start: { x: 0, y: g(0, 3.0) + 0.2, z: 3.0 },
        end: { x: 0, y: g(0, 14.5) + 0.3, z: 14.5 },
        width: 2.6,
        archHeight: 1.5,
        stoneStyle: 'basalt',
        hasLanterns: true,
      },
    ],
    attachments: [
      {
        id: 'ha1',
        kind: 'torch_brazier',
        position: { x: -2.4, y: g(-2.4, 2.5) + 2.2, z: 3.15 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.15,
        heraldryColor: '#9c363e',
        emblem: 'crown',
      },
      {
        id: 'ha2',
        kind: 'torch_brazier',
        position: { x: 2.4, y: g(2.4, 2.5) + 2.2, z: 3.15 },
        normal: { x: 0, y: 0, z: 1 },
        scale: 1.15,
        heraldryColor: '#9c363e',
        emblem: 'crown',
      },
    ],
    flora: [
      { id: 'hf1', kind: 'pine', x: -4.8, y: g(-4.8, 19), z: 19, scale: 1.2, rotation: 0.2, seed: 701 },
      { id: 'hf2', kind: 'pine', x: 5.2, y: g(5.2, 20), z: 20, scale: 1.3, rotation: 1.1, seed: 702 },
    ],
    props: [
      { id: 'hp1', kind: 'statue', x: -3.2, y: g(-3.2, -1.5), z: -1.5, scale: 1.1, rotation: 0, color: '#9c363e' },
      { id: 'hp2', kind: 'campfire', x: 3.0, y: g(3.0, -1.2), z: -1.2, scale: 1.0, rotation: 0, color: '#9c363e' },
    ],
    atmosphere: {
      timeOfDay: 19.6,
      sunAzimuth: 300,
      weather: 'snow',
      fov: 38,
      bloomStrength: 0.48,
      wildlifeEnabled: true,
      turntable: false,
      photoMode: false,
    },
  };
}

function buildVerdantMeadow(): CastleWorldState {
  const terrain = createEmptyTerrain(1.3);
  sculptHeight(terrain, (x, z) => {
    let h = 1.35 + Math.sin(x * 0.08) * Math.cos(z * 0.09) * 0.48;
    // Gentle meandering brook along one side
    const streamCenter = Math.sin(z * 0.1) * 5 + 16;
    const distStream = Math.abs(x - streamCenter);
    if (distStream < 3.4) {
      h -= Math.cos((distStream / 3.4) * (Math.PI * 0.5)) * 2.3;
    }
    return { h };
  });

  const g = (x: number, z: number) => getTerrainHeightAt(terrain, x, z);

  return {
    version: 1,
    name: 'Verdant Meadow',
    terrain,
    walls: [],
    towers: [],
    buildings: [],
    bridges: [],
    attachments: [],
    flora: [
      { id: 'mf1', kind: 'oak', x: -16, y: g(-16, -12), z: -12, scale: 1.25, rotation: 0.3, seed: 901 },
      { id: 'mf2', kind: 'oak', x: -19, y: g(-19, 14), z: 14, scale: 1.15, rotation: 1.8, seed: 902 },
      { id: 'mf3', kind: 'willow', x: 11.5, y: g(11.5, 4), z: 4, scale: 1.2, rotation: 0.9, seed: 903 },
      { id: 'mf4', kind: 'pine', x: 24, y: g(24, -18), z: -18, scale: 1.35, rotation: 0.4, seed: 904 },
      { id: 'mf5', kind: 'blossom', x: -8, y: g(-8, 18), z: 18, scale: 1.1, rotation: 2.1, seed: 905 },
      { id: 'mf6', kind: 'wildflowers', x: -4, y: g(-4, -5), z: -5, scale: 1.3, rotation: 0.1, seed: 906 },
      { id: 'mf7', kind: 'wildflowers', x: 4, y: g(4, 6), z: 6, scale: 1.2, rotation: 1.1, seed: 907 },
    ],
    props: [],
    atmosphere: {
      timeOfDay: 10.2,
      sunAzimuth: 55,
      weather: 'clear',
      fov: 38,
      bloomStrength: 0.32,
      wildlifeEnabled: true,
      turntable: false,
      photoMode: false,
    },
  };
}

export const DIORAMA_PRESETS: DioramaPresetMeta[] = [
  {
    id: 'montclair',
    title: 'Montclair Citadel',
    subtitle: 'Hilltop concentric fortress, arched moat bridge, keep & village courtyard',
    badge: 'Featured',
    build: buildMontclairCitadel,
  },
  {
    id: 'lochhaven',
    title: 'Lochhaven Water Keep',
    subtitle: 'Misty lake island stronghold with chain drawbridge & copper spires',
    badge: 'Island',
    build: buildLochhavenKeep,
  },
  {
    id: 'sunspire',
    title: 'Sunspire Abbey',
    subtitle: 'Golden-hour sandstone cathedral, rose window, cloisters & cypress walk',
    badge: 'Abbey',
    build: buildSunspireAbbey,
  },
  {
    id: 'highcliff',
    title: 'Highcliff Watch',
    subtitle: 'Basalt crag citadel above frozen waters under winter twilight',
    badge: 'Winter Crag',
    build: buildHighcliffWatch,
  },
  {
    id: 'meadow',
    title: 'Verdant Meadow',
    subtitle: 'Clean sunlit valley with a gentle winding stream — blank canvas',
    badge: 'Blank Canvas',
    build: buildVerdantMeadow,
  },
];
