import * as THREE from 'three';
import { PathBrushMode, TerrainBrushMode, TerrainData, WeatherKind } from '../types/castle';

export const WATER_LEVEL = 0.0;
export const TERRAIN_GRID_RES = 81;
export const TERRAIN_WORLD_SIZE = 80;

export function createEmptyTerrain(baseHeight = 1.25): TerrainData {
  const count = TERRAIN_GRID_RES * TERRAIN_GRID_RES;
  const heights = new Array<number>(count).fill(baseHeight);
  const surface = new Array<number>(count).fill(0);
  return {
    gridRes: TERRAIN_GRID_RES,
    worldSize: TERRAIN_WORLD_SIZE,
    heights,
    surface,
  };
}

export function getGridStep(terrain: TerrainData): number {
  return terrain.worldSize / (terrain.gridRes - 1);
}

export function worldToGrid(terrain: TerrainData, wx: number, wz: number): [number, number] {
  const half = terrain.worldSize * 0.5;
  const step = getGridStep(terrain);
  const gx = (wx + half) / step;
  const gz = (wz + half) / step;
  return [gx, gz];
}

export function gridToWorld(terrain: TerrainData, gx: number, gz: number): [number, number] {
  const half = terrain.worldSize * 0.5;
  const step = getGridStep(terrain);
  return [gx * step - half, gz * step - half];
}

export function getTerrainHeightAt(terrain: TerrainData, wx: number, wz: number): number {
  const [gx, gz] = worldToGrid(terrain, wx, wz);
  const maxIdx = terrain.gridRes - 1;
  const x0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(gx)));
  const z0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(gz)));
  const x1 = Math.min(maxIdx, x0 + 1);
  const z1 = Math.min(maxIdx, z0 + 1);
  const tx = Math.max(0, Math.min(1, gx - x0));
  const tz = Math.max(0, Math.min(1, gz - z0));

  const res = terrain.gridRes;
  const h00 = terrain.heights[z0 * res + x0];
  const h10 = terrain.heights[z0 * res + x1];
  const h01 = terrain.heights[z1 * res + x0];
  const h11 = terrain.heights[z1 * res + x1];

  const h0 = h00 + (h10 - h00) * tx;
  const h1 = h01 + (h11 - h01) * tx;
  return h0 + (h1 - h0) * tz;
}

export function getTerrainSurfaceAt(terrain: TerrainData, wx: number, wz: number): number {
  const [gx, gz] = worldToGrid(terrain, wx, wz);
  const maxIdx = terrain.gridRes - 1;
  const ix = Math.max(0, Math.min(maxIdx, Math.round(gx)));
  const iz = Math.max(0, Math.min(maxIdx, Math.round(gz)));
  return terrain.surface[iz * terrain.gridRes + ix] ?? 0;
}

export function isPathSurfaceAt(terrain: TerrainData, wx: number, wz: number): boolean {
  const s = getTerrainSurfaceAt(terrain, wx, wz);
  return s === 1 || s === 2 || s === 3;
}

export function applyTerrainBrush(
  terrain: TerrainData,
  wx: number,
  wz: number,
  mode: TerrainBrushMode,
  radius: number,
  strength: number,
  targetLevelHeight?: number
): boolean {
  const res = terrain.gridRes;
  const step = getGridStep(terrain);
  const [cgx, cgz] = worldToGrid(terrain, wx, wz);
  const cellRadius = Math.ceil(radius / step) + 1;
  const minX = Math.max(1, Math.floor(cgx - cellRadius));
  const maxX = Math.min(res - 2, Math.ceil(cgx + cellRadius));
  const minZ = Math.max(1, Math.floor(cgz - cellRadius));
  const maxZ = Math.min(res - 2, Math.ceil(cgz + cellRadius));

  const refHeight = targetLevelHeight ?? getTerrainHeightAt(terrain, wx, wz);
  const copyHeights = mode === 'smooth' ? [...terrain.heights] : null;
  let changed = false;

  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const [px, pz] = gridToWorld(terrain, x, z);
      const dist = Math.hypot(px - wx, pz - wz);
      if (dist > radius) continue;

      const t = 1 - dist / radius;
      const falloff = t * t * (3 - 2 * t);
      const idx = z * res + x;
      const prev = terrain.heights[idx];

      if (mode === 'raise') {
        terrain.heights[idx] = Math.min(14, prev + strength * 0.65 * falloff);
      } else if (mode === 'lower') {
        terrain.heights[idx] = Math.max(-4.5, prev - strength * 0.65 * falloff);
      } else if (mode === 'level') {
        const lerpRate = Math.min(1, strength * 0.65 * falloff);
        terrain.heights[idx] = prev + (refHeight - prev) * lerpRate;
      } else if (mode === 'smooth' && copyHeights) {
        const avg =
          (copyHeights[(z - 1) * res + x] +
            copyHeights[(z + 1) * res + x] +
            copyHeights[z * res + (x - 1)] +
            copyHeights[z * res + (x + 1)] +
            copyHeights[idx] * 2) /
          6;
        terrain.heights[idx] = prev + (avg - prev) * Math.min(1, strength * 0.85 * falloff);
      } else if (mode === 'cliff') {
        // Steep crag outcrop
        const cragNoise = Math.sin(px * 0.85) * Math.cos(pz * 0.85) * 0.45 + 0.75;
        terrain.heights[idx] = Math.min(14, prev + strength * 0.85 * cragNoise * falloff);
        if (falloff > 0.35) {
          terrain.surface[idx] = 4;
        }
      }
      changed = true;
    }
  }
  return changed;
}

export function applyMoatBrush(
  terrain: TerrainData,
  wx: number,
  wz: number,
  radius: number,
  strength: number,
  raiseToDry = false
): boolean {
  const res = terrain.gridRes;
  const step = getGridStep(terrain);
  const [cgx, cgz] = worldToGrid(terrain, wx, wz);
  const cellRadius = Math.ceil(radius / step) + 1;
  const minX = Math.max(1, Math.floor(cgx - cellRadius));
  const maxX = Math.min(res - 2, Math.ceil(cgx + cellRadius));
  const minZ = Math.max(1, Math.floor(cgz - cellRadius));
  const maxZ = Math.min(res - 2, Math.ceil(cgz + cellRadius));

  const targetDepth = raiseToDry ? 1.25 : -1.85;
  let changed = false;

  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const [px, pz] = gridToWorld(terrain, x, z);
      const dist = Math.hypot(px - wx, pz - wz);
      if (dist > radius) continue;

      const t = 1 - dist / radius;
      const falloff = t * t * (3 - 2 * t);
      const idx = z * res + x;
      const cur = terrain.heights[idx];
      if (!raiseToDry) {
        if (cur > targetDepth) {
          terrain.heights[idx] = cur + (targetDepth - cur) * Math.min(1, strength * 0.55 * falloff);
          if (terrain.heights[idx] < 0.35 && terrain.surface[idx] === 0) {
            terrain.surface[idx] = 0;
          }
          changed = true;
        }
      } else {
        if (cur < targetDepth) {
          terrain.heights[idx] = cur + (targetDepth - cur) * Math.min(1, strength * 0.55 * falloff);
          changed = true;
        }
      }
    }
  }
  return changed;
}

export function applyPathBrush(
  terrain: TerrainData,
  wx: number,
  wz: number,
  mode: PathBrushMode,
  radius: number
): boolean {
  const res = terrain.gridRes;
  const step = getGridStep(terrain);
  const [cgx, cgz] = worldToGrid(terrain, wx, wz);
  const cellRadius = Math.ceil(radius / step) + 1;
  const minX = Math.max(0, Math.floor(cgx - cellRadius));
  const maxX = Math.min(res - 1, Math.ceil(cgx + cellRadius));
  const minZ = Math.max(0, Math.floor(cgz - cellRadius));
  const maxZ = Math.min(res - 1, Math.ceil(cgz + cellRadius));

  const code = mode === 'cobble' ? 1 : mode === 'flagstone' ? 2 : mode === 'dirt' ? 3 : 0;
  let changed = false;

  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const [px, pz] = gridToWorld(terrain, x, z);
      const dist = Math.hypot(px - wx, pz - wz);
      if (dist > radius * 0.92) continue;
      const idx = z * res + x;
      if (terrain.heights[idx] > WATER_LEVEL + 0.08 && terrain.surface[idx] !== code) {
        terrain.surface[idx] = code;
        changed = true;
      }
    }
  }
  return changed;
}

export class TerrainSystem {
  public readonly group = new THREE.Group();
  public terrainMesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public skirtMesh: THREE.Mesh;
  private terrainGeo: THREE.BufferGeometry;
  private waterGeo: THREE.BufferGeometry;
  private waterMat: THREE.ShaderMaterial;
  private terrainMat: THREE.MeshStandardMaterial;

  constructor(terrain: TerrainData) {
    this.terrainGeo = this.createTerrainGeometry(terrain);
    this.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: false,
    });
    this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.terrainMesh.name = 'terrain-ground';
    this.group.add(this.terrainMesh);

    // Sculpted diorama table skirt around the 80x80 terrain edge
    this.skirtMesh = this.createDioramaSkirt(terrain);
    this.group.add(this.skirtMesh);

    // Custom animated reflective water plane
    this.waterGeo = this.createWaterGeometry(terrain);
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
        uSunColor: { value: new THREE.Color('#fff5dc') },
        uDeepColor: { value: new THREE.Color('#1d566e') },
        uShallowColor: { value: new THREE.Color('#479ea3') },
        uSkyColor: { value: new THREE.Color('#95c8e8') },
      },
      vertexShader: /* glsl */ `
        attribute float aDepth;
        varying float vDepth;
        varying vec3 vWorldPos;
        uniform float uTime;

        void main() {
          vDepth = aDepth;
          vec3 pos = position;
          float wave = sin(pos.x * 0.75 + uTime * 1.45) * cos(pos.z * 0.68 - uTime * 1.15) * 0.035;
          pos.y += wave * clamp(aDepth * 1.4, 0.0, 1.0);
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vDepth;
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSkyColor;

        void main() {
          if (vDepth <= 0.01) discard;

          // Procedural wave normal perturbation
          float nx = cos(vWorldPos.x * 1.9 + uTime * 1.7) * 0.07 + cos(vWorldPos.z * 2.7 - uTime * 1.2) * 0.04;
          float nz = sin(vWorldPos.z * 2.1 - uTime * 1.4) * 0.07 + sin(vWorldPos.x * 2.4 + uTime * 1.3) * 0.04;
          vec3 N = normalize(vec3(nx, 1.0, nz));
          vec3 V = normalize(cameraPosition - vWorldPos);

          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float depthMix = clamp(vDepth / 1.85, 0.0, 1.0);
          vec3 baseWater = mix(uShallowColor, uDeepColor, depthMix);
          vec3 col = mix(baseWater, uSkyColor, fresnel * 0.55);

          // Sun specular sparkle
          vec3 H = normalize(uSunDir + V);
          float spec = pow(max(dot(N, H), 0.0), 96.0);
          col += uSunColor * spec * 0.9;

          // Animated shoreline foam
          float foamBand = smoothstep(0.45, 0.02, vDepth);
          float ripple = sin(vDepth * 22.0 - uTime * 2.5 + sin(vWorldPos.x + vWorldPos.z) * 1.5);
          float foam = foamBand * smoothstep(0.15, 0.85, ripple * 0.5 + 0.5) * 0.65 + smoothstep(0.14, 0.01, vDepth) * 0.7;
          col = mix(col, vec3(0.92, 0.96, 0.98), clamp(foam, 0.0, 0.85));

          float alpha = clamp(0.62 + depthMix * 0.30 + foam * 0.25, 0.0, 0.94);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.waterMesh = new THREE.Mesh(this.waterGeo, this.waterMat);
    this.waterMesh.position.y = WATER_LEVEL;
    this.waterMesh.renderOrder = 2;
    this.group.add(this.waterMesh);

    this.update(terrain, 'clear');
  }

  private createTerrainGeometry(terrain: TerrainData): THREE.BufferGeometry {
    const res = terrain.gridRes;
    const size = terrain.worldSize;
    const geo = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
    geo.rotateX(-Math.PI / 2);
    const count = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return geo;
  }

  private createWaterGeometry(terrain: TerrainData): THREE.BufferGeometry {
    const res = terrain.gridRes;
    const size = terrain.worldSize;
    const geo = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
    geo.rotateX(-Math.PI / 2);
    const count = geo.attributes.position.count;
    geo.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(count), 1));
    return geo;
  }

  private createDioramaSkirt(terrain: TerrainData): THREE.Mesh {
    const half = terrain.worldSize * 0.5;
    const outer = half + 0.6;
    const depth = -5.5;
    // Build a clean beveled diorama frame around the perimeter
    const geo = new THREE.BoxGeometry(outer * 2, 5.2, outer * 2);
    const mat = new THREE.MeshStandardMaterial({
      color: '#252b34',
      roughness: 0.9,
      metalness: 0.08,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = depth * 0.5 - 1.25;
    mesh.receiveShadow = true;
    return mesh;
  }

  public update(terrain: TerrainData, weather: WeatherKind): void {
    const res = terrain.gridRes;
    const pos = this.terrainGeo.attributes.position as THREE.BufferAttribute;
    const col = this.terrainGeo.attributes.color as THREE.BufferAttribute;
    const waterDepth = this.waterGeo.attributes.aDepth as THREE.BufferAttribute;

    const count = res * res;
    for (let i = 0; i < count; i++) {
      const h = terrain.heights[i];
      pos.setY(i, h);
      waterDepth.setX(i, WATER_LEVEL - h);
    }
    pos.needsUpdate = true;
    waterDepth.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();

    const norm = this.terrainGeo.attributes.normal as THREE.BufferAttribute;

    const grassA = new THREE.Color('#668c4a');
    const grassB = new THREE.Color('#7ca358');
    const autumnGrass = new THREE.Color('#978c47');
    const snowColor = new THREE.Color('#e6edf2');
    const cliffColor = new THREE.Color('#7d776d');
    const sandColor = new THREE.Color('#cbb78e');
    const cobbleA = new THREE.Color('#8e8b84');
    const cobbleB = new THREE.Color('#75716a');
    const flagColor = new THREE.Color('#bfb6a2');
    const dirtColor = new THREE.Color('#8b7152');
    const tmp = new THREE.Color();

    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const i = z * res + x;
        const h = terrain.heights[i];
        const ny = norm.getY(i);
        const surf = terrain.surface[i];
        const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        const n = hash - Math.floor(hash);

        if (surf === 1) {
          // Cobblestone road
          tmp.copy(cobbleA).lerp(cobbleB, n * 0.65);
        } else if (surf === 2) {
          // Courtyard flagstone
          tmp.copy(flagColor).offsetHSL(0, 0, (n - 0.5) * 0.05);
        } else if (surf === 3) {
          // Dirt footpath
          tmp.copy(dirtColor).offsetHSL(0, 0, (n - 0.5) * 0.06);
        } else if (surf === 4) {
          // Cliff outcrop
          tmp.copy(cliffColor).offsetHSL(0, 0, (n - 0.5) * 0.08);
        } else {
          // Organic meadow grass
          tmp.copy(grassA).lerp(grassB, n);
          if (weather === 'autumn') {
            tmp.lerp(autumnGrass, 0.42);
          }
        }

        // Shoreline sand near water level
        if (h < WATER_LEVEL + 0.38) {
          const shoreMix = Math.max(0, Math.min(1, (WATER_LEVEL + 0.38 - h) / 0.55));
          tmp.lerp(sandColor, shoreMix * 0.88);
        }

        // Steep slope rock blending
        if (ny < 0.84) {
          const cliffMix = Math.min(1, (0.84 - ny) / 0.24);
          tmp.lerp(cliffColor, cliffMix);
        }

        // Snow dusting on gentle elevated surfaces in winter weather
        if (weather === 'snow' && h > WATER_LEVEL + 0.25 && ny > 0.72) {
          const snowMix = Math.min(0.88, ((ny - 0.72) / 0.24) * 0.82);
          tmp.lerp(snowColor, surf === 1 || surf === 2 ? snowMix * 0.42 : snowMix);
        }

        col.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
    }
    col.needsUpdate = true;

    // Update skirt height slightly below edge minimum
    const minEdge = -3.8;
    this.skirtMesh.position.y = minEdge;
  }

  public updateAtmosphere(
    elapsedSec: number,
    sunDir: THREE.Vector3,
    sunColor: THREE.Color,
    skyColor: THREE.Color,
    daylightFactor: number,
    weather: WeatherKind
  ): void {
    this.waterMat.uniforms.uTime.value = elapsedSec;
    this.waterMat.uniforms.uSunDir.value.copy(sunDir).normalize();
    this.waterMat.uniforms.uSunColor.value.copy(sunColor);
    this.waterMat.uniforms.uSkyColor.value.copy(skyColor);

    const deep = new THREE.Color('#0c2838').lerp(new THREE.Color('#1c5d78'), daylightFactor);
    const shallow = new THREE.Color('#194652').lerp(new THREE.Color('#4ca8ac'), daylightFactor);
    if (weather === 'rain') {
      deep.lerp(new THREE.Color('#273947'), 0.35);
      shallow.lerp(new THREE.Color('#3e5a68'), 0.35);
    }
    this.waterMat.uniforms.uDeepColor.value.copy(deep);
    this.waterMat.uniforms.uShallowColor.value.copy(shallow);

    this.terrainMat.roughness = weather === 'rain' ? 0.65 : 0.92;
  }

  public dispose(): void {
    this.terrainGeo.dispose();
    this.terrainMat.dispose();
    this.waterGeo.dispose();
    this.waterMat.dispose();
    this.skirtMesh.geometry.dispose();
    (this.skirtMesh.material as THREE.Material).dispose();
  }
}
