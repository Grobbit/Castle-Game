import * as THREE from 'three';
import { FloraEntity, PropEntity, TerrainData, TowerEntity, WeatherKind } from '../types/castle';
import {
  FlameRef,
  sharedFlameMaterial,
  sharedLanternGlowMaterial,
} from './architecture';
import { getRoofMaterial, getStoneMaterialSet, getWoodBeamMaterial, getIronMaterial } from './textures';
import { getTerrainHeightAt, getTerrainSurfaceAt, WATER_LEVEL } from './terrain';

function tagSelectable(root: THREE.Object3D, kind: string, id: string): void {
  root.userData.selectKind = kind;
  root.userData.selectId = id;
  root.traverse((obj) => {
    obj.userData.selectKind = kind;
    obj.userData.selectId = id;
  });
}

function seededRand(seed: number): () => number {
  let s = Math.floor(Math.abs(seed) * 100000 + 13) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildFloraGroup(flora: FloraEntity, weather: WeatherKind): THREE.Group {
  const group = new THREE.Group();
  const root = new THREE.Group();
  root.position.set(flora.x, flora.y, flora.z);
  root.rotation.y = flora.rotation;
  root.scale.setScalar(flora.scale);
  group.add(root);

  const rand = seededRand(flora.seed + flora.x * 13 + flora.z * 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5d432e', roughness: 0.94 });

  const leafPalette =
    weather === 'autumn'
      ? ['#c47233', '#d49438', '#a8472e']
      : weather === 'snow'
        ? ['#5d7869', '#749080', '#cddce0']
        : ['#4f7e3d', '#5f9147', '#3f6b32'];

  const leafColor = leafPalette[Math.floor(rand() * leafPalette.length)];
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.88, flatShading: true });

  if (flora.kind === 'oak') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 1.8, 7), trunkMat);
    trunk.position.y = 0.85;
    root.add(trunk);

    const puffs = [
      [0, 2.35, 0, 1.15],
      [0.65, 2.05, 0.35, 0.85],
      [-0.65, 2.1, -0.3, 0.88],
      [0.2, 2.65, -0.45, 0.78],
      [-0.25, 2.55, 0.5, 0.75],
    ];
    for (const [px, py, pz, pr] of puffs) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(pr, 1), leafMat);
      puff.position.set(px, py, pz);
      puff.scale.y = 0.78;
      root.add(puff);
    }
  } else if (flora.kind === 'pine') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 1.4, 6), trunkMat);
    trunk.position.y = 0.65;
    root.add(trunk);
    const pineColor = weather === 'snow' ? '#3d6352' : '#2f5938';
    const pineMat = new THREE.MeshStandardMaterial({ color: pineColor, roughness: 0.9, flatShading: true });
    for (let t = 0; t < 4; t++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.18 - t * 0.22, 1.45 - t * 0.14, 7), pineMat);
      cone.position.y = 1.45 + t * 0.78;
      cone.rotation.y = t * 0.4;
      root.add(cone);
    }
    if (weather === 'snow') {
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.78, 7), new THREE.MeshStandardMaterial({ color: '#e6eff4', roughness: 0.85 }));
      snowCap.position.y = 3.88;
      root.add(snowCap);
    }
  } else if (flora.kind === 'cypress') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 6), trunkMat);
    trunk.position.y = 0.42;
    root.add(trunk);
    const cMat = new THREE.MeshStandardMaterial({ color: '#345e3b', roughness: 0.88, flatShading: true });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.68, 4.4, 8), cMat);
    spire.position.y = 2.75;
    root.add(spire);
  } else if (flora.kind === 'willow') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 1.9, 7), trunkMat);
    trunk.position.y = 0.9;
    trunk.rotation.z = 0.12;
    root.add(trunk);
    const wMat = new THREE.MeshStandardMaterial({
      color: weather === 'autumn' ? '#b8a247' : '#6c9c55',
      roughness: 0.9,
    });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), wMat);
    cap.position.set(0.15, 2.35, 0);
    cap.scale.set(1.15, 0.85, 1.15);
    root.add(cap);
    for (let s = 0; s < 10; s++) {
      const a = (s / 10) * Math.PI * 2;
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.03, 1.85, 5), wMat);
      drape.position.set(0.15 + Math.cos(a) * 1.12, 1.4, Math.sin(a) * 1.12);
      root.add(drape);
    }
  } else if (flora.kind === 'blossom') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 1.55, 6), trunkMat);
    trunk.position.y = 0.72;
    trunk.rotation.z = -0.08;
    root.add(trunk);
    const bMat = new THREE.MeshStandardMaterial({ color: '#f3b9cb', roughness: 0.82, flatShading: true });
    const bMat2 = new THREE.MeshStandardMaterial({ color: '#fce0ea', roughness: 0.82, flatShading: true });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), i % 2 === 0 ? bMat : bMat2);
      puff.position.set(Math.cos(a) * 0.45, 2.0 + (i % 2) * 0.25, Math.sin(a) * 0.45);
      puff.scale.y = 0.74;
      root.add(puff);
    }
  } else if (flora.kind === 'hedge') {
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 0.85), leafMat);
    hedge.position.y = 0.45;
    root.add(hedge);
  } else if (flora.kind === 'bush') {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 - i * 0.08, 1), leafMat);
      b.position.set((i - 1) * 0.35, 0.38, (i % 2) * 0.2);
      b.scale.y = 0.78;
      root.add(b);
    }
  } else if (flora.kind === 'wildflowers') {
    const colors = ['#f6d455', '#d98ee0', '#f5f2e8', '#eb7a67'];
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * 0.7;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.32, 4), leafMat);
      stem.position.set(Math.cos(a) * d, 0.16, Math.sin(a) * d);
      root.add(stem);
      const petal = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.09, 0),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7 })
      );
      petal.position.set(Math.cos(a) * d, 0.34, Math.sin(a) * d);
      root.add(petal);
    }
  } else if (flora.kind === 'reeds') {
    const reedMat = new THREE.MeshStandardMaterial({ color: '#618744', roughness: 0.88 });
    const tipMat = new THREE.MeshStandardMaterial({ color: '#5c3c28', roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * 0.55;
      const h = 0.85 + rand() * 0.55;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 5), reedMat);
      stalk.position.set(Math.cos(a) * d, h * 0.5 - 0.15, Math.sin(a) * d);
      stalk.rotation.z = (rand() - 0.5) * 0.18;
      root.add(stalk);
      if (i % 2 === 0) {
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 6), tipMat);
        tip.position.set(stalk.position.x, h - 0.25, stalk.position.z);
        root.add(tip);
      }
    }
  }

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  tagSelectable(group, 'flora', flora.id);
  return group;
}

export function buildPropGroup(
  prop: PropEntity,
  flames: FlameRef[],
  addPointLights: boolean
): THREE.Group {
  const group = new THREE.Group();
  const root = new THREE.Group();
  root.position.set(prop.x, prop.y, prop.z);
  root.rotation.y = prop.rotation;
  root.scale.setScalar(prop.scale);
  group.add(root);

  const { material: stoneMat, trimMaterial } = getStoneMaterialSet('limestone');
  const woodMat = getWoodBeamMaterial();
  const ironMat = getIronMaterial();

  if (prop.kind === 'fountain') {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.55, 8), trimMaterial);
    basin.position.y = 0.26;
    root.add(basin);
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(1.52, 1.52, 0.44, 8),
      new THREE.MeshStandardMaterial({ color: '#3b9aa6', roughness: 0.15, metalness: 0.25 })
    );
    pool.position.y = 0.34;
    root.add(pool);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.35, 8), stoneMat);
    col.position.y = 0.9;
    root.add(col);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.32, 0.26, 8), trimMaterial);
    bowl.position.y = 1.48;
    root.add(bowl);
    const spout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: '#a8e4ec', roughness: 0.1 }));
    spout.position.y = 1.72;
    root.add(spout);
  } else if (prop.kind === 'well') {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.72, 10), stoneMat);
    rim.position.y = 0.35;
    root.add(rim);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.65, 10),
      new THREE.MeshStandardMaterial({ color: '#276478', roughness: 0.2 })
    );
    water.position.y = 0.36;
    root.add(water);
    for (const s of [-0.62, 0.62]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.12), woodMat);
      post.position.set(s, 1.0, 0);
      root.add(post);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.98, 0.8, 4), getRoofMaterial('terracotta'));
    roof.position.y = 2.02;
    roof.rotation.y = Math.PI / 4;
    root.add(roof);
  } else if (prop.kind === 'market_stall') {
    for (const sx of [-1.0, 1.0]) {
      for (const sz of [-0.55, 0.55]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.85, 0.1), woodMat);
        post.position.set(sx, 0.92, sz);
        root.add(post);
      }
    }
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 1.15), woodMat);
    counter.position.set(0, 0.34, 0);
    root.add(counter);
    const canopyMat = new THREE.MeshStandardMaterial({ color: prop.color || '#b8323c', roughness: 0.82 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 1.55), canopyMat);
    canopy.position.set(0, 1.88, 0.05);
    canopy.rotation.x = 0.18;
    root.add(canopy);
    // Goods crates
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.4), new THREE.MeshStandardMaterial({ color: '#c48f47', roughness: 0.85 }));
    crate.position.set(-0.45, 0.8, 0);
    root.add(crate);
  } else if (prop.kind === 'gazebo') {
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.82, 0.24, 8), trimMaterial);
    floor.position.y = 0.12;
    root.add(floor);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.1, 6), woodMat);
      col.position.set(Math.cos(a) * 1.45, 1.18, Math.sin(a) * 1.45);
      root.add(col);
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.55, 8), getRoofMaterial('copper'));
    cap.position.y = 2.95;
    root.add(cap);
  } else if (prop.kind === 'lamp_post') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.4, 6), ironMat);
    base.position.y = 0.2;
    root.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.35, 6), ironMat);
    pole.position.y = 1.4;
    root.add(pole);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.32), sharedLanternGlowMaterial);
    lantern.position.y = 2.65;
    root.add(lantern);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 4), ironMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 2.94;
    root.add(cap);
    let light: THREE.PointLight | undefined;
    if (addPointLights) {
      light = new THREE.PointLight('#ffaa44', 2.4, 10, 1.8);
      light.position.set(0, 2.65, 0);
      root.add(light);
    }
    flames.push({ position: new THREE.Vector3(prop.x, prop.y + 2.65, prop.z), light, phase: prop.x });
  } else if (prop.kind === 'campfire') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), stoneMat);
      rock.position.set(Math.cos(a) * 0.5, 0.12, Math.sin(a) * 0.5);
      root.add(rock);
    }
    for (let l = 0; l < 3; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 6), woodMat);
      log.position.y = 0.15;
      log.rotation.z = Math.PI / 2 - 0.35;
      log.rotation.y = (l / 3) * Math.PI;
      root.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.68, 7), sharedFlameMaterial);
    flame.position.y = 0.42;
    root.add(flame);
    let light: THREE.PointLight | undefined;
    if (addPointLights) {
      light = new THREE.PointLight('#ff7c24', 3.0, 12, 1.8);
      light.position.set(0, 0.65, 0);
      root.add(light);
    }
    flames.push({ position: new THREE.Vector3(prop.x, prop.y + 0.5, prop.z), light, mesh: flame, phase: prop.z });
  } else if (prop.kind === 'statue') {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.95), trimMaterial);
    plinth.position.y = 0.55;
    root.add(plinth);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.2, 8), stoneMat);
    body.position.y = 1.7;
    root.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), stoneMat);
    head.position.y = 2.48;
    root.add(head);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 0.12), ironMat);
    sword.position.set(0.22, 1.85, 0.25);
    root.add(sword);
  } else if (prop.kind === 'bench') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.48), woodMat);
    seat.position.y = 0.42;
    root.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.08), woodMat);
    back.position.set(0, 0.68, -0.2);
    back.rotation.x = -0.18;
    root.add(back);
    for (const sx of [-0.58, 0.58]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.42), ironMat);
      leg.position.set(sx, 0.2, 0);
      root.add(leg);
    }
  } else if (prop.kind === 'cart') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 1.65), woodMat);
    bed.position.y = 0.58;
    root.add(bed);
    for (const sx of [-0.66, 0.66]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10), woodMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, 0.4, 0.1);
      root.add(wheel);
    }
    for (const sx of [-0.35, 0.35]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), woodMat);
      handle.position.set(sx, 0.45, 1.15);
      handle.rotation.x = 0.2;
      root.add(handle);
    }
  } else if (prop.kind === 'barrels') {
    for (const [bx, by, bz] of [
      [-0.25, 0.32, 0],
      [0.28, 0.32, 0.1],
      [0, 0.82, 0.04],
    ]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.56, 8), woodMat);
      barrel.position.set(bx, by, bz);
      root.add(barrel);
    }
  }

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  tagSelectable(group, 'prop', prop.id);
  return group;
}

// ============================================================
// AUTONOMOUS DIORAMA LIFE & WEATHER PARTICLES
// ============================================================

interface DoveAgent {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  center: THREE.Vector3;
  radius: number;
  speed: number;
  phase: number;
  height: number;
}

interface SheepAgent {
  group: THREE.Group;
  x: number;
  z: number;
  angle: number;
  timer: number;
  walking: boolean;
}

interface PuffParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

export class DioramaLifeSystem {
  public readonly group = new THREE.Group();
  private doves: DoveAgent[] = [];
  private sheep: SheepAgent[] = [];
  private smokePuffs: PuffParticle[] = [];
  private weatherPoints: THREE.Points | null = null;
  private firefliesPoints: THREE.Points | null = null;
  private currentWeather: WeatherKind = 'clear';
  private smokeAccum = 0;

  constructor() {
    this.initDoves();
    this.initWeatherParticles('clear');
    this.initFireflies();
  }

  private initDoves(): void {
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#f6f5f0', roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), bodyMat);
      body.scale.set(0.75, 0.75, 1.55);
      g.add(body);

      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.16), bodyMat);
      leftWing.position.set(-0.18, 0.03, 0);
      g.add(leftWing);

      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.16), bodyMat);
      rightWing.position.set(0.18, 0.03, 0);
      g.add(rightWing);

      this.group.add(g);
      this.doves.push({
        group: g,
        leftWing,
        rightWing,
        center: new THREE.Vector3((i % 3 - 1) * 5, 0, ((i + 1) % 3 - 1) * 5),
        radius: 6 + (i % 4) * 2.4,
        speed: 0.28 + (i % 3) * 0.09,
        phase: i * 1.15,
        height: 11.5 + (i % 5) * 1.8,
      });
    }
  }

  public syncTerrainAndTowers(terrain: TerrainData, towers: TowerEntity[]): void {
    // Re-center dove flight paths near tallest towers
    if (towers.length > 0) {
      const sorted = [...towers].sort((a, b) => b.y + b.height - (a.y + a.height));
      this.doves.forEach((d, idx) => {
        const t = sorted[idx % Math.min(3, sorted.length)];
        d.center.set(t.x, 0, t.z);
        d.height = t.y + t.height + 4.5 + (idx % 3) * 1.6;
      });
    }

    // Spawn/reposition sheep on grassy dry land
    if (this.sheep.length === 0) {
      const woolMat = new THREE.MeshStandardMaterial({ color: '#f3efe4', roughness: 0.95 });
      const darkMat = new THREE.MeshStandardMaterial({ color: '#33302c', roughness: 0.9 });
      let attempts = 0;
      while (this.sheep.length < 7 && attempts < 200) {
        attempts++;
        const sx = (Math.random() - 0.5) * 56;
        const sz = (Math.random() - 0.5) * 56;
        const h = getTerrainHeightAt(terrain, sx, sz);
        const surf = getTerrainSurfaceAt(terrain, sx, sz);
        if (h > WATER_LEVEL + 0.5 && h < 5.5 && surf === 0) {
          const g = new THREE.Group();
          const wool = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), woolMat);
          wool.scale.set(0.9, 0.85, 1.25);
          wool.position.y = 0.34;
          wool.castShadow = true;
          g.add(wool);

          const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.24), darkMat);
          head.position.set(0, 0.42, 0.38);
          g.add(head);

          for (const lx of [-0.14, 0.14]) {
            for (const lz of [-0.18, 0.18]) {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 5), darkMat);
              leg.position.set(lx, 0.12, lz);
              g.add(leg);
            }
          }
          g.position.set(sx, h, sz);
          this.group.add(g);
          this.sheep.push({
            group: g,
            x: sx,
            z: sz,
            angle: Math.random() * Math.PI * 2,
            timer: 1 + Math.random() * 4,
            walking: Math.random() > 0.5,
          });
        }
      }
    }
  }

  public initWeatherParticles(weather: WeatherKind): void {
    this.currentWeather = weather;
    if (this.weatherPoints) {
      this.group.remove(this.weatherPoints);
      this.weatherPoints.geometry.dispose();
      (this.weatherPoints.material as THREE.Material).dispose();
      this.weatherPoints = null;
    }

    if (weather === 'clear' || weather === 'mist') return;

    const count = weather === 'rain' ? 1400 : weather === 'snow' ? 950 : 320;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 78;
      positions[i * 3 + 1] = Math.random() * 34;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 78;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const color =
      weather === 'rain' ? '#a6c7e2' : weather === 'snow' ? '#ffffff' : '#d68238';
    const size = weather === 'rain' ? 0.18 : weather === 'snow' ? 0.28 : 0.34;
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: weather === 'rain' ? 0.58 : 0.85,
      depthWrite: false,
    });
    this.weatherPoints = new THREE.Points(geo, mat);
    this.group.add(this.weatherPoints);
  }

  private initFireflies(): void {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 64;
      positions[i * 3 + 1] = 0.6 + Math.random() * 3.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 64;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: '#ffe57a',
      size: 0.24,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.firefliesPoints = new THREE.Points(geo, mat);
    this.group.add(this.firefliesPoints);
  }

  public spawnSmokePuff(origin: THREE.Vector3): void {
    if (this.smokePuffs.length > 55) return;
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: '#dde2e8',
        transparent: true,
        opacity: 0.48,
        roughness: 1,
        depthWrite: false,
      })
    );
    mesh.position.copy(origin);
    this.group.add(mesh);
    this.smokePuffs.push({
      mesh,
      vel: new THREE.Vector3(0.35 + Math.random() * 0.25, 0.85 + Math.random() * 0.3, (Math.random() - 0.5) * 0.25),
      age: 0,
      maxAge: 2.8 + Math.random() * 1.2,
    });
  }

  public spawnDustBurst(origin: THREE.Vector3, count = 8): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28 + Math.random() * 0.2, 0),
        new THREE.MeshStandardMaterial({
          color: '#dfd8c8',
          transparent: true,
          opacity: 0.65,
          roughness: 1,
          depthWrite: false,
        })
      );
      mesh.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.4, (Math.random() - 0.5) * 0.8));
      this.group.add(mesh);
      this.smokePuffs.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.1 + Math.random() * 1.3, (Math.random() - 0.5) * 2.2),
        age: 0,
        maxAge: 0.9 + Math.random() * 0.4,
      });
    }
  }

  public update(
    dt: number,
    elapsed: number,
    terrain: TerrainData,
    chimneys: { position: THREE.Vector3 }[],
    daylightFactor: number,
    wildlifeEnabled: boolean
  ): void {
    // Update doves
    for (const d of this.doves) {
      d.group.visible = wildlifeEnabled && this.currentWeather !== 'rain';
      if (!d.group.visible) continue;
      const t = elapsed * d.speed + d.phase;
      const x = d.center.x + Math.cos(t) * d.radius;
      const z = d.center.z + Math.sin(t) * d.radius;
      const y = d.height + Math.sin(t * 1.8) * 0.85;
      const dx = -Math.sin(t) * d.radius;
      const dz = Math.cos(t) * d.radius;
      d.group.position.set(x, y, z);
      d.group.rotation.y = Math.atan2(dx, dz);

      const flap = Math.sin(elapsed * 13 + d.phase * 4) * 0.55;
      d.leftWing.rotation.z = flap;
      d.rightWing.rotation.z = -flap;
    }

    // Update grazing sheep
    for (const s of this.sheep) {
      s.group.visible = wildlifeEnabled;
      if (!wildlifeEnabled) continue;
      s.timer -= dt;
      if (s.timer <= 0) {
        s.walking = !s.walking;
        s.timer = 1.6 + Math.random() * 3.5;
        s.angle += (Math.random() - 0.5) * 1.8;
      }
      if (s.walking) {
        const nx = s.x + Math.sin(s.angle) * 0.75 * dt;
        const nz = s.z + Math.cos(s.angle) * 0.75 * dt;
        if (Math.abs(nx) < 35 && Math.abs(nz) < 35) {
          const nh = getTerrainHeightAt(terrain, nx, nz);
          const surf = getTerrainSurfaceAt(terrain, nx, nz);
          if (nh > WATER_LEVEL + 0.4 && nh < 6.0 && surf === 0) {
            s.x = nx;
            s.z = nz;
            s.group.position.set(s.x, nh + Math.abs(Math.sin(elapsed * 7 + s.x)) * 0.04, s.z);
          } else {
            s.angle += Math.PI * 0.75;
          }
        } else {
          s.angle += Math.PI;
        }
      }
      s.group.rotation.y = s.angle;
    }

    // Chimney smoke
    this.smokeAccum += dt;
    if (this.smokeAccum > 0.35 && chimneys.length > 0) {
      this.smokeAccum = 0;
      for (const c of chimneys) {
        this.spawnSmokePuff(c.position);
      }
    }

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const p = this.smokePuffs[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.smokePuffs.splice(i, 1);
        continue;
      }
      const prog = p.age / p.maxAge;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(1 + prog * 1.9);
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = (1 - prog) * 0.45;
    }

    // Fireflies at dusk/night
    if (this.firefliesPoints) {
      const nightGlow = Math.max(0, 1 - daylightFactor * 1.8);
      const mat = this.firefliesPoints.material as THREE.PointsMaterial;
      mat.opacity = wildlifeEnabled ? nightGlow * 0.85 : 0;
      if (mat.opacity > 0.02) {
        const pos = this.firefliesPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const bx = pos.getX(i) + Math.sin(elapsed * 0.9 + i) * 0.012;
          const by = pos.getY(i) + Math.cos(elapsed * 1.4 + i * 2) * 0.008;
          const bz = pos.getZ(i) + Math.cos(elapsed * 0.8 + i * 1.3) * 0.012;
          pos.setXYZ(i, bx, by, bz);
        }
        pos.needsUpdate = true;
      }
    }

    // Weather precipitation particles
    if (this.weatherPoints) {
      const pos = this.weatherPoints.geometry.attributes.position as THREE.BufferAttribute;
      const fallSpeed =
        this.currentWeather === 'rain' ? 24.0 : this.currentWeather === 'snow' ? 2.4 : 3.2;
      const driftX =
        this.currentWeather === 'rain' ? 2.5 : this.currentWeather === 'snow' ? 0.9 : 2.1;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + driftX * dt + Math.sin(elapsed + i) * (this.currentWeather === 'rain' ? 0 : 0.45 * dt);
        let y = pos.getY(i) - fallSpeed * dt;
        let z = pos.getZ(i) + Math.cos(elapsed * 0.8 + i) * (this.currentWeather === 'rain' ? 0 : 0.35 * dt);
        if (y < 0) {
          y = 33;
          x = (Math.random() - 0.5) * 78;
          z = (Math.random() - 0.5) * 78;
        }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.weatherPoints) {
      this.weatherPoints.geometry.dispose();
      (this.weatherPoints.material as THREE.Material).dispose();
    }
    if (this.firefliesPoints) {
      this.firefliesPoints.geometry.dispose();
      (this.firefliesPoints.material as THREE.Material).dispose();
    }
    for (const p of this.smokePuffs) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
  }
}
