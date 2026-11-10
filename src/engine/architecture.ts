import * as THREE from 'three';
import {
  AttachmentEntity,
  BridgeEntity,
  BuildingEntity,
  TerrainData,
  TowerEntity,
  WallEntity,
} from '../types/castle';
import {
  getBannerMaterial,
  getGoldMaterial,
  getHalfTimberMaterial,
  getIronMaterial,
  getRoofMaterial,
  getStoneMaterialSet,
  getWoodBeamMaterial,
  getWoodDeckMaterial,
} from './textures';
import { getTerrainHeightAt, isPathSurfaceAt } from './terrain';

// Shared dynamic materials controlled by CastleEngine time-of-day
export const sharedWindowGlassMaterial = new THREE.MeshStandardMaterial({
  color: '#2c3846',
  emissive: new THREE.Color('#ffaa44'),
  emissiveIntensity: 0.15,
  roughness: 0.25,
  metalness: 0.35,
});

export const sharedLanternGlowMaterial = new THREE.MeshStandardMaterial({
  color: '#ffe29c',
  emissive: new THREE.Color('#ff9d2e'),
  emissiveIntensity: 1.35,
  roughness: 0.3,
});

export const sharedFlameMaterial = new THREE.MeshStandardMaterial({
  color: '#ff9030',
  emissive: new THREE.Color('#ff6a18'),
  emissiveIntensity: 1.9,
  roughness: 0.2,
});

export const sharedIvyMaterial = new THREE.MeshStandardMaterial({
  color: '#466f34',
  roughness: 0.9,
  metalness: 0.0,
});

export interface AnimatedBannerRef {
  mesh: THREE.Mesh;
  phase: number;
  baseVertices: Float32Array;
}

export interface ChimneyRef {
  position: THREE.Vector3;
}

export interface FlameRef {
  position: THREE.Vector3;
  light?: THREE.PointLight;
  mesh?: THREE.Mesh;
  phase: number;
}

export interface ArchBuildContext {
  terrain: TerrainData;
  banners: AnimatedBannerRef[];
  chimneys: ChimneyRef[];
  flames: FlameRef[];
  addPointLights: boolean;
}

function tagSelectable(root: THREE.Object3D, kind: string, id: string): void {
  root.userData.selectKind = kind;
  root.userData.selectId = id;
  root.traverse((obj) => {
    obj.userData.selectKind = kind;
    obj.userData.selectId = id;
  });
}

function setShadowFlags(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function sampleMinTerrainInRadius(terrain: TerrainData, cx: number, cz: number, r: number): number {
  let minY = getTerrainHeightAt(terrain, cx, cz);
  const dirs = 8;
  for (let i = 0; i < dirs; i++) {
    const a = (i / dirs) * Math.PI * 2;
    const h = getTerrainHeightAt(terrain, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    if (h < minY) minY = h;
  }
  return minY;
}

function addIvyCluster(parent: THREE.Group, x: number, y: number, z: number, scale: number, seed: number): void {
  const cluster = new THREE.Group();
  cluster.position.set(x, y, z);
  for (let i = 0; i < 4; i++) {
    const a = seed * 2.1 + i * 1.4;
    const r = (0.2 + ((i * 37) % 10) * 0.025) * scale;
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), sharedIvyMaterial);
    leaf.position.set(Math.cos(a) * 0.18 * scale, (i - 1.5) * 0.16 * scale, Math.sin(a) * 0.18 * scale);
    cluster.add(leaf);
  }
  parent.add(cluster);
}

function createWavingBannerMesh(
  width: number,
  height: number,
  mat: THREE.MeshStandardMaterial,
  ctx?: ArchBuildContext,
  phase = 0
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, height, 6, 8);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const baseVertices = new Float32Array(pos.array as Float32Array);
  const mesh = new THREE.Mesh(geo, mat);
  if (ctx) {
    ctx.banners.push({ mesh, phase, baseVertices });
  }
  return mesh;
}

function createWindowInset(width: number, height: number, pointed = true): THREE.Group {
  const g = new THREE.Group();
  const frameMat = getStoneMaterialSet('limestone').trimMaterial;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.14), frameMat);
  g.add(frame);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, height * 0.84, 0.16), sharedWindowGlassMaterial);
  g.add(glass);

  if (pointed) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry((width + 0.16) * 0.52, width * 0.5, 4), frameMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = height * 0.5 + width * 0.16;
    g.add(cap);
  }
  return g;
}

// ============================================================
// CURTAIN WALLS
// ============================================================

export function buildWallGroup(wall: WallEntity, ctx: ArchBuildContext): THREE.Group {
  const group = new THREE.Group();
  const { material: stoneMat, trimMaterial } = getStoneMaterialSet(wall.stoneStyle);
  const ironMat = getIronMaterial();
  const woodMat = getWoodBeamMaterial();

  const pts = wall.points;
  if (pts.length < 2) return group;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.25) continue;

    const angle = Math.atan2(dx, dz);
    const midX = (p0.x + p1.x) * 0.5;
    const midZ = (p0.z + p1.z) * 0.5;

    const topY = Math.max(p0.y, p1.y) + wall.height;
    const g0 = getTerrainHeightAt(ctx.terrain, p0.x, p0.z);
    const gm = getTerrainHeightAt(ctx.terrain, midX, midZ);
    const g1 = getTerrainHeightAt(ctx.terrain, p1.x, p1.z);
    const minGround = Math.min(g0, gm, g1) - 1.6;
    const fullH = Math.max(1.5, topY - minGround);

    const segGroup = new THREE.Group();
    segGroup.position.set(midX, minGround, midZ);
    segGroup.rotation.y = angle;

    // Detect if a path crosses near the center of this wall segment OR if forced gate
    let pathCrosses = wall.forcedGates.includes(i);
    if (!pathCrosses && len > 2.2) {
      for (const t of [0.35, 0.5, 0.65]) {
        const sx = p0.x + dx * t;
        const sz = p0.z + dz * t;
        if (isPathSurfaceAt(ctx.terrain, sx, sz)) {
          pathCrosses = true;
          break;
        }
      }
    }

    const groundAtMid = Math.max(gm, 0.1);
    const relDeckFloor = groundAtMid - minGround;

    if (pathCrosses && len >= 2.6 && wall.height >= 2.8) {
      // AUTO-CARVED ARCH GATEHOUSE SEGMENT!
      const gateWidth = Math.min(2.4, len * 0.52);
      const gateHeight = Math.min(wall.height * 0.68, 2.75);
      const sideW = Math.max(0.45, (len - gateWidth) * 0.5);

      // Left & Right piers
      for (const side of [-1, 1]) {
        const pier = new THREE.Mesh(
          new THREE.BoxGeometry(wall.thickness * 1.15, fullH, sideW),
          stoneMat
        );
        pier.position.set(0, fullH * 0.5, side * (gateWidth * 0.5 + sideW * 0.5));
        segGroup.add(pier);
      }

      // Lintel / Bridge mass above arch
      const lintelBottom = relDeckFloor + gateHeight;
      const lintelH = Math.max(0.65, fullH - lintelBottom);
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(wall.thickness * 1.24, lintelH, gateWidth + 0.3),
        stoneMat
      );
      lintel.position.set(0, lintelBottom + lintelH * 0.5, 0);
      segGroup.add(lintel);

      // Stone arch ring / voussoir trim
      const archShape = new THREE.Shape();
      const outerR = gateWidth * 0.56;
      const innerR = gateWidth * 0.44;
      archShape.absarc(0, 0, outerR, 0, Math.PI, false);
      archShape.absarc(0, 0, innerR, Math.PI, 0, true);
      archShape.closePath();

      const archGeo = new THREE.ExtrudeGeometry(archShape, {
        depth: wall.thickness * 1.32,
        bevelEnabled: false,
      });
      archGeo.center();
      const archMesh = new THREE.Mesh(archGeo, trimMaterial);
      archMesh.rotation.y = Math.PI / 2;
      archMesh.position.set(0, relDeckFloor + gateHeight - innerR * 0.72, 0);
      segGroup.add(archMesh);

      // Raised portcullis grate bars hanging under arch
      const barCount = 5;
      for (let b = 0; b < barCount; b++) {
        const bz = -gateWidth * 0.34 + (b / (barCount - 1)) * (gateWidth * 0.68);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), ironMat);
        bar.position.set(0, relDeckFloor + gateHeight - 0.35, bz);
        segGroup.add(bar);
      }
      const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, gateWidth * 0.76), woodMat);
      crossBar.position.set(0, relDeckFloor + gateHeight - 0.55, 0);
      segGroup.add(crossBar);
    } else {
      // SOLID CURTAIN WALL SEGMENT
      // Battered stone plinth
      const plinthH = Math.max(0.8, relDeckFloor + 0.45);
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(wall.thickness * 1.24, plinthH, len),
        trimMaterial
      );
      plinth.position.y = plinthH * 0.5;
      segGroup.add(plinth);

      // Main masonry body
      const body = new THREE.Mesh(new THREE.BoxGeometry(wall.thickness, fullH, len), stoneMat);
      body.position.y = fullH * 0.5;
      segGroup.add(body);
    }

    // Wall Top Parapet & Crenellations
    if (wall.topStyle === 'crenellated' || wall.topStyle === 'machicolated') {
      const overhang = wall.topStyle === 'machicolated' ? 0.24 : 0.08;
      const topSlab = new THREE.Mesh(
        new THREE.BoxGeometry(wall.thickness + overhang * 2, 0.22, len + 0.08),
        trimMaterial
      );
      topSlab.position.y = fullH + 0.1;
      segGroup.add(topSlab);

      if (wall.topStyle === 'machicolated') {
        const corbelStep = 0.85;
        const count = Math.max(2, Math.floor(len / corbelStep));
        for (let c = 0; c < count; c++) {
          const cz = -len * 0.46 + (c / Math.max(1, count - 1)) * (len * 0.92);
          const corbel = new THREE.Mesh(
            new THREE.BoxGeometry(wall.thickness + 0.42, 0.28, 0.22),
            trimMaterial
          );
          corbel.position.set(0, fullH - 0.14, cz);
          segGroup.add(corbel);
        }
      }

      // Alternating merlons on both outer and inner edge
      const merlonW = 0.55;
      const merlonGap = 0.42;
      const step = merlonW + merlonGap;
      const mCount = Math.max(1, Math.floor((len - 0.3) / step));
      for (let m = 0; m < mCount; m++) {
        const mz = -((mCount - 1) * step) * 0.5 + m * step;
        for (const side of [-1, 1]) {
          const merlon = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.48, merlonW),
            stoneMat
          );
          merlon.position.set(side * (wall.thickness * 0.5 + overhang - 0.12), fullH + 0.44, mz);
          segGroup.add(merlon);

          const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, merlonW + 0.06), trimMaterial);
          cap.position.set(side * (wall.thickness * 0.5 + overhang - 0.12), fullH + 0.71, mz);
          segGroup.add(cap);
        }
      }
    } else if (wall.topStyle === 'smooth') {
      const coping = new THREE.Mesh(
        new THREE.BoxGeometry(wall.thickness + 0.18, 0.2, len + 0.06),
        trimMaterial
      );
      coping.position.y = fullH + 0.08;
      segGroup.add(coping);
    } else if (wall.topStyle === 'ruined') {
      const chunks = Math.max(2, Math.floor(len / 0.8));
      for (let k = 0; k < chunks; k++) {
        if ((k + i) % 3 === 0) continue;
        const cz = -len * 0.44 + (k / chunks) * len * 0.88;
        const hVar = 0.22 + ((k * 17) % 5) * 0.11;
        const broken = new THREE.Mesh(
          new THREE.BoxGeometry(wall.thickness * 0.85, hVar, 0.52),
          stoneMat
        );
        broken.position.set(((k % 2) - 0.5) * 0.1, fullH + hVar * 0.45, cz);
        broken.rotation.z = ((k % 3) - 1) * 0.06;
        segGroup.add(broken);
      }
    }

    // Ivy clusters along the wall
    if (wall.ivyAmount > 0.05) {
      const ivyCount = Math.max(1, Math.round(len * 0.55 * wall.ivyAmount));
      for (let v = 0; v < ivyCount; v++) {
        const vz = -len * 0.42 + (v / Math.max(1, ivyCount - 1)) * (len * 0.84);
        const side = v % 2 === 0 ? 1 : -1;
        const vy = relDeckFloor + 0.6 + ((v * 23) % 10) * 0.18 * (wall.height * 0.35);
        addIvyCluster(segGroup, side * (wall.thickness * 0.52), vy, vz, 0.85 + wall.ivyAmount * 0.5, i + v);
      }
    }

    group.add(segGroup);
  }

  // Corner / End Stone Piers & Bartizan Turrets
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const gY = getTerrainHeightAt(ctx.terrain, p.x, p.z) - 1.6;
    const topY = p.y + wall.height;
    const h = Math.max(1.5, topY - gY);

    const isCornerOrEnd = i === 0 || i === pts.length - 1 || wall.cornerTurrets;
    if (!isCornerOrEnd) continue;

    const pierRadius = wall.cornerTurrets ? wall.thickness * 0.72 : wall.thickness * 0.54;
    const pier = new THREE.Mesh(
      new THREE.CylinderGeometry(pierRadius, pierRadius * 1.08, h, 10),
      stoneMat
    );
    pier.position.set(p.x, gY + h * 0.5, p.z);
    group.add(pier);

    if (wall.topStyle !== 'ruined') {
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(pierRadius * 1.12, pierRadius * 1.06, 0.24, 10),
        trimMaterial
      );
      rim.position.set(p.x, topY + 0.12, p.z);
      group.add(rim);

      if (wall.cornerTurrets && wall.topStyle === 'crenellated') {
        for (let m = 0; m < 4; m++) {
          const a = (m / 4) * Math.PI * 2;
          const merl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.45, 0.34), stoneMat);
          merl.position.set(
            p.x + Math.cos(a) * pierRadius * 0.96,
            topY + 0.44,
            p.z + Math.sin(a) * pierRadius * 0.96
          );
          merl.rotation.y = -a;
          group.add(merl);
        }
      }
    }
  }

  tagSelectable(group, 'wall', wall.id);
  setShadowFlags(group, true, true);
  return group;
}

// ============================================================
// TOWERS
// ============================================================

export function buildTowerGroup(tower: TowerEntity, ctx: ArchBuildContext): THREE.Group {
  const group = new THREE.Group();
  const { material: stoneMat, trimMaterial } = getStoneMaterialSet(tower.stoneStyle);
  const roofMat = getRoofMaterial(tower.roofColor);
  const halfTimberMat = getHalfTimberMaterial();
  const woodMat = getWoodBeamMaterial();
  const goldMat = getGoldMaterial();
  const ironMat = getIronMaterial();

  const segs = tower.shape === 'round' ? 24 : tower.shape === 'octagonal' ? 8 : 4;
  const rotOffset = tower.shape === 'square' ? Math.PI / 4 : tower.shape === 'octagonal' ? Math.PI / 8 : 0;

  const minGround = sampleMinTerrainInRadius(ctx.terrain, tower.x, tower.z, tower.radius) - 1.8;
  const foundationDrop = Math.max(0, tower.y - minGround);
  const totalStoneH = tower.height + foundationDrop;

  const towerOrigin = new THREE.Group();
  towerOrigin.position.set(tower.x, minGround, tower.z);
  group.add(towerOrigin);

  // Battered stone plinth foundation
  const plinthH = Math.max(1.2, foundationDrop + tower.height * 0.2);
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(tower.radius * 1.03, tower.radius * 1.18, plinthH, segs),
    trimMaterial
  );
  plinth.position.y = plinthH * 0.5;
  plinth.rotation.y = rotOffset;
  towerOrigin.add(plinth);

  // Main shaft (if half-timber top, upper 32% is overhanging half-timber!)
  const bodyH = tower.hasHalfTimberTop ? totalStoneH * 0.72 : totalStoneH;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(tower.radius * 0.98, tower.radius * 1.04, bodyH, segs),
    stoneMat
  );
  body.position.y = bodyH * 0.5;
  body.rotation.y = rotOffset;
  towerOrigin.add(body);

  // String course belt ring(s)
  const relSurfaceBase = foundationDrop;
  for (const frac of [0.42, 0.74]) {
    if (tower.height * frac > 1.8) {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(tower.radius * 1.04, tower.radius * 1.04, 0.18, segs),
        trimMaterial
      );
      ring.position.y = relSurfaceBase + tower.height * frac;
      ring.rotation.y = rotOffset;
      towerOrigin.add(ring);
    }
  }

  // Procedural glowing recessed windows / arrow slits on tower stories
  const slitAngles = tower.shape === 'square' ? [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] : [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  const floors = Math.max(1, Math.floor(tower.height / 3.2));
  for (let f = 0; f < floors; f++) {
    const wy = relSurfaceBase + 1.8 + f * 2.6;
    if (wy > totalStoneH - 0.9) break;
    for (let s = 0; s < slitAngles.length; s++) {
      if ((f + s) % 2 === 1 && floors > 1) continue;
      const a = slitAngles[s] + (f % 2 === 1 ? Math.PI / 4 : 0);
      const rDist = tower.shape === 'square' ? tower.radius * 0.71 : tower.radius * 0.97;
      const win = createWindowInset(0.32, 0.78, true);
      win.position.set(Math.sin(a) * rDist, wy, Math.cos(a) * rDist);
      win.rotation.y = a;
      towerOrigin.add(win);
    }
  }

  let topRadius = tower.radius;
  const topY = totalStoneH;

  if (tower.hasHalfTimberTop) {
    const htH = totalStoneH * 0.28 + 0.2;
    const htRadius = tower.radius * 1.13;
    const htMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(htRadius, htRadius * 0.98, htH, segs),
      halfTimberMat
    );
    htMesh.position.y = bodyH + htH * 0.5;
    htMesh.rotation.y = rotOffset;
    towerOrigin.add(htMesh);

    // Timber support struts underneath overhang
    const strutCount = Math.min(12, Math.max(4, segs));
    for (let i = 0; i < strutCount; i++) {
      const a = (i / strutCount) * Math.PI * 2 + rotOffset;
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.36), woodMat);
      strut.position.set(
        Math.sin(a) * (tower.radius * 1.02),
        bodyH - 0.14,
        Math.cos(a) * (tower.radius * 1.02)
      );
      strut.rotation.y = a;
      strut.rotation.x = 0.45;
      towerOrigin.add(strut);
    }
    topRadius = htRadius;
  }

  // Machicolation stone collar
  if (tower.hasMachicolations && tower.roofStyle !== 'ruined') {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius * 1.12, topRadius * 1.01, 0.34, segs),
      trimMaterial
    );
    collar.position.y = topY + 0.1;
    collar.rotation.y = rotOffset;
    towerOrigin.add(collar);

    const corbelN = tower.shape === 'round' ? 12 : segs;
    for (let i = 0; i < corbelN; i++) {
      const a = (i / corbelN) * Math.PI * 2 + rotOffset;
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.32), trimMaterial);
      cMesh.position.set(Math.sin(a) * topRadius * 1.03, topY - 0.15, Math.cos(a) * topRadius * 1.03);
      cMesh.rotation.y = a;
      towerOrigin.add(cMesh);
    }
    topRadius *= 1.08;
  }

  // Roof Construction
  const roofBaseY = topY + (tower.hasMachicolations ? 0.25 : 0.02);
  let apexY = roofBaseY;

  if (tower.roofStyle === 'conical' || tower.roofStyle === 'steep_hip') {
    const roofH = topRadius * (tower.roofStyle === 'steep_hip' ? 2.5 : 2.1) * tower.roofPitch;
    const roofSegs = tower.roofStyle === 'conical' && tower.shape === 'round' ? 24 : segs;
    const eavesR = topRadius * 1.18;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(eavesR, roofH, roofSegs), roofMat);
    cone.position.y = roofBaseY + roofH * 0.5;
    cone.rotation.y = rotOffset;
    towerOrigin.add(cone);

    // Eaves trim ring
    const eaves = new THREE.Mesh(
      new THREE.CylinderGeometry(eavesR * 1.01, eavesR * 1.03, 0.14, roofSegs),
      woodMat
    );
    eaves.position.y = roofBaseY + 0.04;
    eaves.rotation.y = rotOffset;
    towerOrigin.add(eaves);

    if (tower.dormers && tower.radius >= 1.5) {
      for (let d = 0; d < 2; d++) {
        const da = d * Math.PI + 0.35;
        const dGroup = new THREE.Group();
        dGroup.position.set(Math.sin(da) * (eavesR * 0.58), roofBaseY + roofH * 0.34, Math.cos(da) * (eavesR * 0.58));
        dGroup.rotation.y = da;
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.68), trimMaterial);
        dGroup.add(box);
        const dCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.48, 4), roofMat);
        dCap.rotation.y = Math.PI / 4;
        dCap.position.y = 0.52;
        dGroup.add(dCap);
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.72), sharedWindowGlassMaterial);
        dGroup.add(pane);
        towerOrigin.add(dGroup);
      }
    }
    apexY = roofBaseY + roofH;
  } else if (tower.roofStyle === 'bell') {
    const roofH = topRadius * 2.2 * tower.roofPitch;
    const pts: THREE.Vector2[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r =
        t < 0.35
          ? topRadius * 1.14 * (1 - t * 0.25)
          : topRadius * 1.14 * Math.sin((1 - t) * Math.PI * 0.85) * 0.95;
      pts.push(new THREE.Vector2(Math.max(0.02, r), t * roofH));
    }
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(pts, tower.shape === 'round' ? 24 : segs), roofMat);
    lathe.position.y = roofBaseY;
    lathe.rotation.y = rotOffset;
    towerOrigin.add(lathe);
    apexY = roofBaseY + roofH;
  } else if (tower.roofStyle === 'gable') {
    const roofH = topRadius * 1.65 * tower.roofPitch;
    const w = topRadius * 1.95;
    const shape = new THREE.Shape();
    shape.moveTo(-w * 0.55, 0);
    shape.lineTo(w * 0.55, 0);
    shape.lineTo(0, roofH);
    shape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    gableGeo.center();
    const gable = new THREE.Mesh(gableGeo, roofMat);
    gable.position.y = roofBaseY + roofH * 0.5;
    towerOrigin.add(gable);
    apexY = roofBaseY + roofH;
  } else if (tower.roofStyle === 'crenellated' || tower.roofStyle === 'none') {
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius * 1.04, topRadius * 1.04, 0.18, segs),
      trimMaterial
    );
    deck.position.y = roofBaseY + 0.08;
    deck.rotation.y = rotOffset;
    towerOrigin.add(deck);

    if (tower.roofStyle === 'crenellated') {
      const merlons = tower.shape === 'round' ? 10 : Math.max(4, segs);
      for (let m = 0; m < merlons; m++) {
        const a = (m / merlons) * Math.PI * 2 + rotOffset;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.26), stoneMat);
        merlon.position.set(
          Math.sin(a) * topRadius * 0.93,
          roofBaseY + 0.36,
          Math.cos(a) * topRadius * 0.93
        );
        merlon.rotation.y = a;
        towerOrigin.add(merlon);
      }
      // Small wooden turret stair hatch
      const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.7), woodMat);
      hatch.position.set(0, roofBaseY + 0.32, 0);
      towerOrigin.add(hatch);
    }
    apexY = roofBaseY + 0.22;
  } else if (tower.roofStyle === 'ruined') {
    const jagged = 8;
    for (let j = 0; j < jagged; j++) {
      if (j % 3 === 0) continue;
      const a = (j / jagged) * Math.PI * 2;
      const jh = 0.3 + ((j * 13) % 5) * 0.22;
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.55, jh, 0.42), stoneMat);
      block.position.set(Math.sin(a) * topRadius * 0.88, roofBaseY + jh * 0.4, Math.cos(a) * topRadius * 0.88);
      block.rotation.y = a;
      block.rotation.z = (j % 2 === 0 ? 1 : -1) * 0.08;
      towerOrigin.add(block);
    }
    apexY = roofBaseY + 0.5;
  }

  // Finial (Spire / Flag / Weathervane)
  if (
    tower.finial !== 'none' &&
    tower.roofStyle !== 'crenellated' &&
    tower.roofStyle !== 'ruined' &&
    tower.roofStyle !== 'none'
  ) {
    const poleH = tower.finial === 'flag' ? 1.7 : 1.35;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, poleH, 6), ironMat);
    pole.position.y = apexY + poleH * 0.5 - 0.1;
    towerOrigin.add(pole);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), goldMat);
    orb.position.y = apexY + 0.08;
    towerOrigin.add(orb);

    if (tower.finial === 'flag') {
      const flagMat = getBannerMaterial(tower.heraldryColor, 'crown');
      const flagMesh = createWavingBannerMesh(0.95, 0.52, flagMat, ctx, tower.x + tower.z);
      flagMesh.position.set(0.48, apexY + poleH - 0.34, 0);
      towerOrigin.add(flagMesh);
    } else if (tower.finial === 'weathervane') {
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.04), goldMat);
      arrow.position.y = apexY + poleH - 0.15;
      towerOrigin.add(arrow);
    }
  }

  // Ivy Overgrowth
  if (tower.ivyAmount > 0.05) {
    const clusters = Math.max(2, Math.round(7 * tower.ivyAmount));
    for (let c = 0; c < clusters; c++) {
      const a = c * 1.9 + tower.x;
      const iy = relSurfaceBase + 0.7 + (c / clusters) * Math.min(tower.height * 0.7, 5.5);
      addIvyCluster(
        towerOrigin,
        Math.sin(a) * tower.radius * 1.03,
        iy,
        Math.cos(a) * tower.radius * 1.03,
        0.95,
        c + tower.z
      );
    }
  }

  tagSelectable(group, 'tower', tower.id);
  setShadowFlags(group, true, true);
  return group;
}

// ============================================================
// KEEPS, HALLS, CHAPELS, CLOISTERS & GATEHOUSES
// ============================================================

export function buildBuildingGroup(b: BuildingEntity, ctx: ArchBuildContext): THREE.Group {
  const group = new THREE.Group();
  const { material: stoneMat, trimMaterial } = getStoneMaterialSet(b.stoneStyle);
  const roofMat = getRoofMaterial(b.roofColor);
  const halfTimberMat = getHalfTimberMaterial();
  const woodMat = getWoodBeamMaterial();
  const ironMat = getIronMaterial();
  const goldMat = getGoldMaterial();

  const radiusApprox = Math.max(b.width, b.depth) * 0.55;
  const minGround = sampleMinTerrainInRadius(ctx.terrain, b.x, b.z, radiusApprox) - 1.8;
  const foundationDrop = Math.max(0, b.y - minGround);
  const totalWallH = b.height + foundationDrop;

  const origin = new THREE.Group();
  origin.position.set(b.x, minGround, b.z);
  origin.rotation.y = b.rotation;
  group.add(origin);

  // Battered stone foundation plinth
  const plinthH = Math.max(1.2, foundationDrop + 0.55);
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(b.width + 0.45, plinthH, b.depth + 0.45),
    trimMaterial
  );
  plinth.position.y = plinthH * 0.5;
  origin.add(plinth);

  const relGround = foundationDrop;

  if (b.kind === 'gatehouse') {
    // Vaulted Gatehouse with twin flanking mass & archway tunnel
    const tunnelW = Math.min(2.6, b.width * 0.44);
    const sideW = Math.max(0.8, (b.width - tunnelW) * 0.5);
    const archH = Math.min(b.height * 0.62, 3.0);

    for (const side of [-1, 1]) {
      const flank = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalWallH, b.depth), stoneMat);
      flank.position.set(side * (tunnelW * 0.5 + sideW * 0.5), totalWallH * 0.5, 0);
      origin.add(flank);
    }
    const bridgeH = Math.max(1.0, totalWallH - (relGround + archH));
    const upperBridge = new THREE.Mesh(new THREE.BoxGeometry(tunnelW + 0.1, bridgeH, b.depth), stoneMat);
    upperBridge.position.set(0, relGround + archH + bridgeH * 0.5, 0);
    origin.add(upperBridge);

    // Portcullis front/back
    for (const zSide of [-1, 1]) {
      for (let bar = -2; bar <= 2; bar++) {
        const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), ironMat);
        spike.position.set(bar * (tunnelW * 0.16), relGround + archH - 0.38, zSide * (b.depth * 0.46));
        origin.add(spike);
      }
    }
  } else {
    // Standard Multi-Story Keep / Hall / Chapel / Cloister
    const stoneFrac = b.halfTimberUpper && b.floors >= 2 ? 0.58 : 1.0;
    const stoneH = relGround + b.height * stoneFrac;
    const stoneBox = new THREE.Mesh(new THREE.BoxGeometry(b.width, stoneH, b.depth), stoneMat);
    stoneBox.position.y = stoneH * 0.5;
    origin.add(stoneBox);

    if (b.halfTimberUpper && b.floors >= 2) {
      const upperH = b.height * (1 - stoneFrac) + 0.15;
      const upperBox = new THREE.Mesh(
        new THREE.BoxGeometry(b.width + 0.45, upperH, b.depth + 0.45),
        halfTimberMat
      );
      upperBox.position.y = stoneH + upperH * 0.5;
      origin.add(upperBox);

      // Timber jetty corbels
      const braceCount = Math.max(3, Math.floor(b.width / 1.4));
      for (let i = 0; i < braceCount; i++) {
        const bx = -b.width * 0.4 + (i / Math.max(1, braceCount - 1)) * (b.width * 0.8);
        for (const zSide of [-1, 1]) {
          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.38), woodMat);
          brace.position.set(bx, stoneH - 0.12, zSide * (b.depth * 0.5 + 0.08));
          brace.rotation.x = zSide * -0.45;
          origin.add(brace);
        }
      }
    }
  }

  // Corner & Wall Buttresses
  if (b.hasButtresses) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const buttress = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, totalWallH * 0.82, 0.45),
          trimMaterial
        );
        buttress.position.set(sx * (b.width * 0.5 + 0.1), totalWallH * 0.41, sz * (b.depth * 0.5 + 0.1));
        origin.add(buttress);
      }
    }
  }

  // Cloister Arcade Arches along long side
  if (b.kind === 'cloister') {
    const arches = Math.max(2, Math.floor(b.width / 1.4));
    for (let a = 0; a < arches; a++) {
      const ax = -b.width * 0.42 + (a / Math.max(1, arches - 1)) * (b.width * 0.84);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, b.height * 0.72, 8), trimMaterial);
      col.position.set(ax, relGround + b.height * 0.36, b.depth * 0.5 + 0.22);
      origin.add(col);
    }
    const arcadeBeam = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.2, 0.28, 0.45), trimMaterial);
    arcadeBeam.position.set(0, relGround + b.height * 0.74, b.depth * 0.5 + 0.2);
    origin.add(arcadeBeam);
  }

  // Automatic Procedural Facade Windows & Oak Portal Door
  if (b.kind !== 'gatehouse') {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.85, 0.2), woodMat);
    door.position.set(0, relGround + 0.92, b.depth * 0.5 + 0.06);
    origin.add(door);
    const doorArch = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.24, 0.24), trimMaterial);
    doorArch.position.set(0, relGround + 1.9, b.depth * 0.5 + 0.06);
    origin.add(doorArch);
  }

  const winColsX = Math.max(1, Math.floor(b.width / 2.0));
  const winColsZ = Math.max(1, Math.floor(b.depth / 2.2));
  const floorStep = b.height / Math.max(1, b.floors);
  const wScaleW = b.kind === 'chapel' ? 0.44 : 0.42;
  const wScaleH = b.kind === 'chapel' ? 1.35 : 0.86;
  const halfW = b.width * 0.5 + (b.halfTimberUpper ? 0.22 : 0.02);
  const halfD = b.depth * 0.5 + (b.halfTimberUpper ? 0.22 : 0.02);

  for (let f = 0; f < b.floors; f++) {
    const wy = relGround + f * floorStep + floorStep * 0.55;
    if (wy > totalWallH - 0.6) break;
    const isUpperOverhang = b.halfTimberUpper && b.floors >= 2 && wy > relGround + b.height * 0.58;
    const zPush = isUpperOverhang ? halfD : b.depth * 0.5 + 0.03;
    const xPush = isUpperOverhang ? halfW : b.width * 0.5 + 0.03;

    // Front & Back Windows
    for (let cx = 0; cx < winColsX; cx++) {
      const wx = -b.width * 0.34 + (winColsX === 1 ? b.width * 0.34 : (cx / (winColsX - 1)) * b.width * 0.68);
      if (f === 0 && Math.abs(wx) < 0.7 && b.kind !== 'chapel') continue; // avoid front door overlap
      for (const sideZ of [-1, 1]) {
        if (f === 0 && sideZ === 1 && Math.abs(wx) < 0.85) continue;
        const win = createWindowInset(wScaleW, wScaleH, b.kind === 'chapel');
        win.position.set(wx, wy, sideZ * zPush);
        if (sideZ === -1) win.rotation.y = Math.PI;
        origin.add(win);
      }
    }

    // Left & Right Windows
    for (let cz = 0; cz < winColsZ; cz++) {
      const wz = -b.depth * 0.32 + (winColsZ === 1 ? b.depth * 0.32 : (cz / (winColsZ - 1)) * b.depth * 0.64);
      for (const sideX of [-1, 1]) {
        const win = createWindowInset(wScaleW, wScaleH, b.kind === 'chapel');
        win.position.set(sideX * xPush, wy, wz);
        win.rotation.y = sideX * (Math.PI / 2);
        origin.add(win);
      }
    }
  }

  // Roof Builder
  const roofW = b.width + (b.halfTimberUpper ? 0.5 : 0.1) + 0.45;
  const roofD = b.depth + (b.halfTimberUpper ? 0.5 : 0.1) + 0.45;
  const roofBaseY = totalWallH + (b.halfTimberUpper ? 0.14 : 0);
  const roofH = Math.min(roofW, roofD) * 0.68 * b.roofPitch;

  if (b.roofStyle === 'gable' || b.roofStyle === 'stepped_gable' || b.roofStyle === 'chapel_spire') {
    // Extruded triangular pitched roof along Z or X (ridge along longer axis!)
    const ridgeAlongX = b.width >= b.depth;
    const span = ridgeAlongX ? roofD : roofW;
    const run = ridgeAlongX ? roofW : roofD;

    const rShape = new THREE.Shape();
    rShape.moveTo(-span * 0.5, 0);
    rShape.lineTo(span * 0.5, 0);
    rShape.lineTo(0, roofH);
    rShape.closePath();

    const rGeo = new THREE.ExtrudeGeometry(rShape, { depth: run, bevelEnabled: false });
    rGeo.translate(0, 0, -run * 0.5);
    const roofMesh = new THREE.Mesh(rGeo, roofMat);
    roofMesh.position.y = roofBaseY;
    if (ridgeAlongX) roofMesh.rotation.y = Math.PI / 2;
    origin.add(roofMesh);

    if (b.roofStyle === 'stepped_gable') {
      // Flemish crow-stepped gable stone peaks on both ends!
      const steps = 4;
      for (const endSide of [-1, 1]) {
        for (let st = 0; st < steps; st++) {
          const frac = st / steps;
          const sw = span * (1 - frac) * 0.92;
          const sh = (roofH / steps) * 1.15;
          const stepMesh = new THREE.Mesh(
            new THREE.BoxGeometry(ridgeAlongX ? 0.26 : sw, sh, ridgeAlongX ? sw : 0.26),
            trimMaterial
          );
          stepMesh.position.set(
            ridgeAlongX ? endSide * (run * 0.5 - 0.08) : 0,
            roofBaseY + frac * roofH + sh * 0.5,
            ridgeAlongX ? 0 : endSide * (run * 0.5 - 0.08)
          );
          origin.add(stepMesh);
        }
      }
    }

    if (b.roofStyle === 'chapel_spire') {
      const flH = roofH * 1.6;
      const fleche = new THREE.Mesh(new THREE.ConeGeometry(0.52, flH, 8), roofMat);
      fleche.position.y = roofBaseY + roofH + flH * 0.45;
      origin.add(fleche);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), goldMat);
      crossV.position.y = roofBaseY + roofH + flH + 0.15;
      origin.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.08), goldMat);
      crossH.position.y = roofBaseY + roofH + flH + 0.3;
      origin.add(crossH);
    }

    if (b.hasDormers) {
      for (const side of [-1, 1]) {
        const dGroup = new THREE.Group();
        dGroup.position.set(
          ridgeAlongX ? 0 : side * (span * 0.24),
          roofBaseY + roofH * 0.45,
          ridgeAlongX ? side * (span * 0.24) : 0
        );
        if (!ridgeAlongX) dGroup.rotation.y = side * (Math.PI / 2);
        else if (side === -1) dGroup.rotation.y = Math.PI;
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.75), trimMaterial);
        dGroup.add(box);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.55, 4), roofMat);
        cap.rotation.y = Math.PI / 4;
        cap.position.y = 0.58;
        dGroup.add(cap);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.78), sharedWindowGlassMaterial);
        dGroup.add(glass);
        origin.add(dGroup);
      }
    }
  } else if (b.roofStyle === 'hip') {
    const hip = new THREE.Mesh(new THREE.ConeGeometry(0.75, roofH, 4), roofMat);
    hip.scale.set(roofW, 1, roofD);
    hip.rotation.y = Math.PI / 4;
    hip.position.y = roofBaseY + roofH * 0.5;
    origin.add(hip);
  } else if (b.roofStyle === 'crenellated') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.35, 0.22, b.depth + 0.35), trimMaterial);
    deck.position.y = roofBaseY + 0.1;
    origin.add(deck);

    // Merlons along perimeter
    const merlonsX = Math.max(3, Math.floor(b.width / 1.1));
    const merlonsZ = Math.max(3, Math.floor(b.depth / 1.1));
    for (let i = 0; i < merlonsX; i++) {
      const mx = -b.width * 0.42 + (i / Math.max(1, merlonsX - 1)) * b.width * 0.84;
      for (const sz of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.25), stoneMat);
        m.position.set(mx, roofBaseY + 0.44, sz * (b.depth * 0.5 + 0.04));
        origin.add(m);
      }
    }
    for (let j = 0; j < merlonsZ; j++) {
      const mz = -b.depth * 0.42 + (j / Math.max(1, merlonsZ - 1)) * b.depth * 0.84;
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.52, 0.52), stoneMat);
        m.position.set(sx * (b.width * 0.5 + 0.04), roofBaseY + 0.44, mz);
        origin.add(m);
      }
    }

    // Corner Bartizan Watch Turrets on Keep!
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.35, 8), stoneMat);
        bt.position.set(sx * (b.width * 0.5), roofBaseY + 0.5, sz * (b.depth * 0.5));
        origin.add(bt);
        const btCap = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.1, 8), roofMat);
        btCap.position.set(sx * (b.width * 0.5), roofBaseY + 1.65, sz * (b.depth * 0.5));
        origin.add(btCap);
      }
    }
  }

  // Chimney + Animated Smoke Point Registration
  if (b.hasChimney) {
    const chLocalX = b.width * 0.26;
    const chLocalZ = -b.depth * 0.22;
    const chBase = roofBaseY;
    const chH = b.roofStyle === 'crenellated' ? 1.45 : roofH * 0.88 + 0.9;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.62, chH, 0.62), stoneMat);
    chimney.position.set(chLocalX, chBase + chH * 0.5, chLocalZ);
    origin.add(chimney);
    const chCap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.76), trimMaterial);
    chCap.position.set(chLocalX, chBase + chH + 0.06, chLocalZ);
    origin.add(chCap);

    // Compute world position of chimney flue
    const localPos = new THREE.Vector3(chLocalX, chBase + chH + 0.2, chLocalZ);
    localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), b.rotation);
    localPos.add(new THREE.Vector3(b.x, minGround, b.z));
    ctx.chimneys.push({ position: localPos });
  }

  // Ivy Overgrowth
  if (b.ivyAmount > 0.05) {
    const count = Math.max(2, Math.round(6 * b.ivyAmount));
    for (let i = 0; i < count; i++) {
      const side = i % 4;
      const iy = relGround + 0.8 + (i % 3) * 1.1;
      if (side === 0) addIvyCluster(origin, (i - 1) * 0.8, iy, b.depth * 0.52, 1.0, i);
      else if (side === 1) addIvyCluster(origin, (i - 2) * 0.8, iy, -b.depth * 0.52, 1.0, i);
      else if (side === 2) addIvyCluster(origin, b.width * 0.52, iy, (i - 1) * 0.7, 1.0, i);
      else addIvyCluster(origin, -b.width * 0.52, iy, (i - 1) * 0.7, 1.0, i);
    }
  }

  tagSelectable(group, 'building', b.id);
  setShadowFlags(group, true, true);
  return group;
}

// ============================================================
// BRIDGES & STAIRCASES
// ============================================================

export function buildBridgeGroup(bridge: BridgeEntity, ctx: ArchBuildContext): THREE.Group {
  const group = new THREE.Group();
  const { material: stoneMat, trimMaterial } = getStoneMaterialSet(bridge.stoneStyle);
  const woodMat = getWoodBeamMaterial();
  const deckMat = getWoodDeckMaterial();
  const ironMat = getIronMaterial();

  const dx = bridge.end.x - bridge.start.x;
  const dz = bridge.end.z - bridge.start.z;
  const dy = bridge.end.y - bridge.start.y;
  const horizLen = Math.hypot(dx, dz);
  if (horizLen < 0.8) return group;

  const angle = Math.atan2(dx, dz);
  const midX = (bridge.start.x + bridge.end.x) * 0.5;
  const midZ = (bridge.start.z + bridge.end.z) * 0.5;

  const bGroup = new THREE.Group();
  bGroup.position.set(midX, 0, midZ);
  bGroup.rotation.y = angle;
  group.add(bGroup);

  if (bridge.kind === 'stone_stairs') {
    const steps = Math.max(4, Math.round(horizLen * 2.4));
    const stepLen = horizLen / steps;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sz = -horizLen * 0.5 + t * horizLen;
      const sy = bridge.start.y + t * dy;
      const wx = midX + Math.sin(angle) * sz;
      const wz = midZ + Math.cos(angle) * sz;
      const gY = getTerrainHeightAt(ctx.terrain, wx, wz) - 1.2;
      const h = Math.max(0.5, sy - gY);

      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(bridge.width, h, stepLen + 0.08), stoneMat);
      stepMesh.position.set(0, gY + h * 0.5, sz);
      bGroup.add(stepMesh);

      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, stepLen + 0.08), trimMaterial);
        rail.position.set(side * (bridge.width * 0.5 - 0.1), sy + 0.25, sz);
        bGroup.add(rail);
      }
    }
  } else if (bridge.kind === 'drawbridge') {
    const deckY = Math.max(bridge.start.y, bridge.end.y) + 0.35;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bridge.width, 0.24, horizLen), deckMat);
    deck.position.set(0, deckY, 0);
    bGroup.add(deck);

    // Timber cross beams underneath
    const beams = Math.max(3, Math.floor(horizLen / 1.4));
    for (let i = 0; i <= beams; i++) {
      const bz = -horizLen * 0.48 + (i / beams) * (horizLen * 0.96);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(bridge.width + 0.16, 0.18, 0.2), woodMat);
      beam.position.set(0, deckY - 0.16, bz);
      bGroup.add(beam);
    }

    // Gatehouse Timber Portal & Chains at start side
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.2, 0.45), stoneMat);
      post.position.set(side * (bridge.width * 0.55), deckY + 1.4, -horizLen * 0.48);
      bGroup.add(post);

      // Diagonal iron chain from top of post to outer deck
      const pTop = new THREE.Vector3(side * (bridge.width * 0.55), deckY + 2.7, -horizLen * 0.48);
      const pEnd = new THREE.Vector3(side * (bridge.width * 0.52), deckY + 0.12, horizLen * 0.38);
      const cLen = pTop.distanceTo(pEnd);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, cLen, 6), ironMat);
      chain.position.copy(pTop).add(pEnd).multiplyScalar(0.5);
      chain.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        pEnd.clone().sub(pTop).normalize()
      );
      bGroup.add(chain);
    }
  } else {
    // Stone Arch Bridge or Timber Footbridge
    const segments = Math.max(8, Math.round(horizLen * 2.2));
    const segLen = horizLen / segments;
    const isStone = bridge.kind === 'stone_arch';
    const deckMatUse = isStone ? trimMaterial : deckMat;

    for (let i = 0; i < segments; i++) {
      const t = (i + 0.5) / segments;
      const sz = -horizLen * 0.5 + t * horizLen;
      const archCurve = Math.sin(t * Math.PI) * bridge.archHeight;
      const baseDeckY = bridge.start.y + t * dy + archCurve;

      const slab = new THREE.Mesh(new THREE.BoxGeometry(bridge.width, 0.28, segLen + 0.08), deckMatUse);
      slab.position.set(0, baseDeckY, sz);
      bGroup.add(slab);

      // Side parapets / timber railings
      for (const side of [-1, 1]) {
        if (isStone) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, segLen + 0.08), stoneMat);
          wall.position.set(side * (bridge.width * 0.5 - 0.12), baseDeckY + 0.42, sz);
          bGroup.add(wall);
        } else if (i % 2 === 0) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), woodMat);
          post.position.set(side * (bridge.width * 0.5 - 0.08), baseDeckY + 0.4, sz);
          bGroup.add(post);
        }
      }
    }

    if (!isStone) {
      // Top timber handrail bars
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, horizLen), woodMat);
        rail.position.set(side * (bridge.width * 0.5 - 0.08), (bridge.start.y + bridge.end.y) * 0.5 + bridge.archHeight * 0.6 + 0.72, 0);
        bGroup.add(rail);
      }
    }

    // Bridge Piers reaching down to riverbed/moat floor
    const pierCount = Math.max(2, Math.floor(horizLen / 3.8) + 1);
    for (let p = 0; p < pierCount; p++) {
      const t = pierCount === 1 ? 0.5 : p / (pierCount - 1);
      const sz = -horizLen * 0.46 + t * horizLen * 0.92;
      const wx = midX + Math.sin(angle) * sz;
      const wz = midZ + Math.cos(angle) * sz;
      const gY = getTerrainHeightAt(ctx.terrain, wx, wz) - 1.8;
      const deckY = bridge.start.y + t * dy + Math.sin(t * Math.PI) * bridge.archHeight;
      const h = Math.max(0.8, deckY - gY);

      if (isStone) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(bridge.width * 0.95, h, 0.85), stoneMat);
        pier.position.set(0, gY + h * 0.5, sz);
        bGroup.add(pier);
      } else {
        for (const side of [-1, 1]) {
          const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, h, 8), woodMat);
          piling.position.set(side * (bridge.width * 0.42), gY + h * 0.5, sz);
          bGroup.add(piling);
        }
      }

      if (bridge.hasLanterns && (p === 0 || p === pierCount - 1)) {
        for (const side of [-1, 1]) {
          const lx = side * (bridge.width * 0.5 - 0.12);
          const ly = deckY + 1.05;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.85, 6), ironMat);
          post.position.set(lx, deckY + 0.72, sz);
          bGroup.add(post);

          const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), sharedLanternGlowMaterial);
          lantern.position.set(lx, ly + 0.15, sz);
          bGroup.add(lantern);
        }
      }
    }
  }

  tagSelectable(group, 'bridge', bridge.id);
  setShadowFlags(group, true, true);
  return group;
}

// ============================================================
// SURFACE-SNAPPED ARCHITECTURAL ATTACHMENTS
// ============================================================

export function buildAttachmentGroup(att: AttachmentEntity, ctx: ArchBuildContext): THREE.Group {
  const group = new THREE.Group();
  const { material: stoneMat, trimMaterial } = getStoneMaterialSet('limestone');
  const woodMat = getWoodBeamMaterial();
  const ironMat = getIronMaterial();

  const normal = new THREE.Vector3(att.normal.x, att.normal.y, att.normal.z).normalize();
  if (normal.lengthSq() < 0.01) normal.set(0, 0, 1);

  const root = new THREE.Group();
  root.position.set(att.position.x, att.position.y, att.position.z);

  // Align local +Z to surface normal while keeping local +Y upright
  const up = Math.abs(normal.y) > 0.95 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, normal).normalize();
  const trueUp = new THREE.Vector3().crossVectors(normal, right).normalize();
  const basis = new THREE.Matrix4().makeBasis(right, trueUp, normal);
  root.quaternion.setFromRotationMatrix(basis);
  root.scale.setScalar(att.scale);
  root.updateMatrix();
  group.add(root);

  if (att.kind === 'gothic_window' || att.kind === 'arched_window') {
    const h = att.kind === 'gothic_window' ? 1.35 : 1.05;
    const w = 0.68;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.18), trimMaterial);
    root.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.86, 0.2), sharedWindowGlassMaterial);
    root.add(glass);
    // Stone mullion bars
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.88, 0.22), trimMaterial);
    root.add(mullionV);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.06, 0.22), trimMaterial);
    mullionH.position.y = 0.1;
    root.add(mullionH);
    if (att.kind === 'gothic_window') {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.55, 4), trimMaterial);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = h * 0.5 + 0.22;
      root.add(cap);
    }
  } else if (att.kind === 'rose_window') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 16), trimMaterial);
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.23, 16), sharedWindowGlassMaterial);
    glass.rotation.x = Math.PI / 2;
    root.add(glass);
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.25), trimMaterial);
      spoke.rotation.z = (s * Math.PI) / 4;
      root.add(spoke);
    }
  } else if (att.kind === 'shutter_window') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.88, 0.16), woodMat);
    root.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.18), sharedWindowGlassMaterial);
    root.add(glass);
    for (const side of [-1, 1]) {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.08), woodMat);
      shutter.position.set(side * 0.54, 0, 0.06);
      shutter.rotation.y = side * -0.25;
      root.add(shutter);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.28), trimMaterial);
    sill.position.set(0, -0.46, 0.08);
    root.add(sill);
  } else if (att.kind === 'arrow_slit') {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.05, 0.16), trimMaterial);
    root.add(stone);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.84, 0.19), ironMat);
    root.add(slit);
  } else if (att.kind === 'oak_door' || att.kind === 'iron_portcullis') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.05, 0.24), trimMaterial);
    frame.position.y = 0.85;
    root.add(frame);
    const panelMat = att.kind === 'oak_door' ? woodMat : ironMat;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.82, 0.28), panelMat);
    panel.position.y = 0.78;
    root.add(panel);
    if (att.kind === 'iron_portcullis') {
      for (let i = -2; i <= 2; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.75, 6), trimMaterial);
        bar.position.set(i * 0.19, 0.78, 0.15);
        root.add(bar);
      }
    }
  } else if (att.kind === 'timber_balcony') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.95), woodMat);
    deck.position.set(0, 0, 0.45);
    root.add(deck);
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.1), woodMat);
    railTop.position.set(0, 0.68, 0.88);
    root.add(railTop);
    for (let i = -2; i <= 2; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), woodMat);
      post.position.set(i * 0.48, 0.34, 0.88);
      root.add(post);
    }
    for (const sx of [-0.75, 0.75]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), woodMat);
      strut.position.set(sx, -0.28, 0.32);
      strut.rotation.x = 0.7;
      root.add(strut);
    }
  } else if (att.kind === 'stone_oriel') {
    const bay = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.35, 1.65, 6), stoneMat);
    bay.position.set(0, 0.35, 0.45);
    root.add(bay);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.76, 0.95, 6), getRoofMaterial('slate'));
    cap.position.set(0, 1.62, 0.45);
    root.add(cap);
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 6), sharedWindowGlassMaterial);
    win.position.set(0, 0.55, 0.52);
    root.add(win);
  } else if (att.kind === 'banner') {
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 6), woodMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 0.95, 0.28);
    root.add(crossbar);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), ironMat);
    arm.position.set(0, 0.95, 0.12);
    root.add(arm);
    const bannerMat = getBannerMaterial(att.heraldryColor, att.emblem);
    const cloth = createWavingBannerMesh(0.95, 1.85, bannerMat, ctx, att.position.x + att.position.z);
    cloth.position.set(0, 0.0, 0.28);
    root.add(cloth);
  } else if (att.kind === 'wall_lantern') {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.48), ironMat);
    arm.position.set(0, 0.22, 0.24);
    root.add(arm);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 4), ironMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.set(0, 0.12, 0.45);
    root.add(cap);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), sharedLanternGlowMaterial);
    glass.position.set(0, -0.05, 0.45);
    root.add(glass);

    const worldPos = new THREE.Vector3(0, -0.05, 0.55).applyMatrix4(root.matrix);
    let light: THREE.PointLight | undefined;
    if (ctx.addPointLights) {
      light = new THREE.PointLight('#ff9f3f', 2.4, 9.5, 1.8);
      light.position.set(0, -0.05, 0.55);
      root.add(light);
    }
    ctx.flames.push({ position: worldPos, light, phase: att.position.x * 1.7 });
  } else if (att.kind === 'torch_brazier') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.12, 0.28, 8), ironMat);
    bowl.position.set(0, 0.05, 0.35);
    root.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 7), sharedFlameMaterial);
    flame.position.set(0, 0.38, 0.35);
    root.add(flame);

    const worldPos = new THREE.Vector3(0, 0.4, 0.35).applyMatrix4(root.matrix);
    let light: THREE.PointLight | undefined;
    if (ctx.addPointLights) {
      light = new THREE.PointLight('#ff822e', 2.8, 11.0, 1.8);
      light.position.set(0, 0.42, 0.35);
      root.add(light);
    }
    ctx.flames.push({ position: worldPos, light, mesh: flame, phase: att.position.z * 2.3 });
  } else if (att.kind === 'ivy_patch') {
    addIvyCluster(root, 0, 0, 0.08, 1.25, att.position.x + att.position.y);
  }

  tagSelectable(group, 'attachment', att.id);
  setShadowFlags(group, true, true);
  return group;
}
