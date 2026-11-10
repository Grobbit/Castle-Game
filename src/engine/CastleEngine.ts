import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  AtmosphereState,
  BridgeEntity,
  BuildingEntity,
  CastleWorldState,
  FloraEntity,
  PropEntity,
  SelectableKind,
  SelectionRef,
  ToolSettings,
  TowerEntity,
  Vec3,
  WallEntity,
} from '../types/castle';
import {
  AnimatedBannerRef,
  ArchBuildContext,
  buildAttachmentGroup,
  buildBridgeGroup,
  buildBuildingGroup,
  buildTowerGroup,
  buildWallGroup,
  ChimneyRef,
  FlameRef,
  sharedFlameMaterial,
  sharedLanternGlowMaterial,
  sharedWindowGlassMaterial,
} from './architecture';
import { buildFloraGroup, buildPropGroup, DioramaLifeSystem } from './dioramaLife';
import {
  applyMoatBrush,
  applyPathBrush,
  applyTerrainBrush,
  getTerrainHeightAt,
  TerrainSystem,
} from './terrain';
import { soundscape } from '../audio/soundscape';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneWorld(w: CastleWorldState): CastleWorldState {
  return JSON.parse(JSON.stringify(w)) as CastleWorldState;
}

export interface EngineCallbacks {
  onWorldCommit: (world: CastleWorldState) => void;
  onSelect: (sel: SelectionRef | null) => void;
  onHoverHint: (hint: string | null) => void;
  onChainCountChange: (count: number) => void;
}

export class CastleEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;
  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;

  private terrainSystem: TerrainSystem;
  private structuresGroup = new THREE.Group();
  private floraPropsGroup = new THREE.Group();
  private previewGroup = new THREE.Group();
  private selectionBoxHelper: THREE.BoxHelper | null = null;
  private brushRingMesh: THREE.Mesh;
  private lifeSystem = new DioramaLifeSystem();

  private world: CastleWorldState;
  private settings: ToolSettings;
  private callbacks: EngineCallbacks;
  private selected: SelectionRef | null = null;

  private banners: AnimatedBannerRef[] = [];
  private chimneys: ChimneyRef[] = [];
  private flames: FlameRef[] = [];

  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private keysPressed = new Set<string>();

  // Interactive tool state
  private isPointerDown = false;
  private isSculpting = false;
  private sculptLevelRef: number | undefined;
  private pointerDownPos = { x: 0, y: 0 };
  private dragStartWorld: Vec3 | null = null;
  private wallDraftPoints: Vec3[] = [];
  private bridgeDraftStart: Vec3 | null = null;
  private currentHoverWorld: Vec3 | null = null;
  private currentHoverNormal: Vec3 | null = null;
  private currentHoverStructureHit = false;
  private currentHoverSelect: SelectionRef | null = null;

  private animFrameId = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    initialWorld: CastleWorldState,
    initialSettings: ToolSettings,
    callbacks: EngineCallbacks
  ) {
    this.canvas = canvas;
    this.world = cloneWorld(initialWorld);
    this.settings = { ...initialSettings };
    this.callbacks = callbacks;

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#b9d4e8', 0.0045);

    this.camera = new THREE.PerspectiveCamera(this.world.atmosphere.fov, width / height, 0.3, 450);
    this.camera.position.set(27, 22, 34);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 95;
    this.controls.target.set(0, 2.5, 0);
    this.syncOrbitMouseButtons();

    // Post-processing with subtle bloom for glowing windows & torches
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.5, 0.86);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // Sky Dome
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color('#4a7eb8') },
        uHorizonColor: { value: new THREE.Color('#cce2f4') },
        uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.4).normalize() },
        uSunGlow: { value: new THREE.Color('#ffdca4') },
        uStarIntensity: { value: 0.0 },
        uTime: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vWorldDir;
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunGlow;
        uniform float uStarIntensity;
        uniform float uTime;

        float hash(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yzx + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.55));

          // Sun halo
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          col += uSunGlow * pow(sunDot, 10.0) * 0.42;
          col += uSunGlow * pow(sunDot, 160.0) * 1.1;

          // Subtle twinkling night stars
          if (uStarIntensity > 0.01 && dir.y > 0.05) {
            vec3 cell = floor(dir * 210.0);
            float n = hash(cell);
            if (n > 0.992) {
              float twinkle = 0.65 + 0.35 * sin(uTime * 2.5 + n * 120.0);
              col += vec3(0.95, 0.97, 1.0) * uStarIntensity * twinkle * smoothstep(0.05, 0.35, dir.y);
            }
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 20), this.skyMat);
    this.scene.add(this.skyMesh);

    // Lights
    this.ambientLight = new THREE.AmbientLight('#d4dce8', 0.38);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#a6d4ff', '#6d7a52', 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff2d6', 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 140;
    const d = 44;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    // Terrain + Structures + Flora/Props + Life + Preview
    this.terrainSystem = new TerrainSystem(this.world.terrain);
    this.scene.add(this.terrainSystem.group);
    this.scene.add(this.structuresGroup);
    this.scene.add(this.floraPropsGroup);
    this.scene.add(this.lifeSystem.group);
    this.scene.add(this.previewGroup);

    // Brush ring cursor
    const ringGeo = new THREE.RingGeometry(0.92, 1.0, 48);
    ringGeo.rotateX(-Math.PI / 2);
    this.brushRingMesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthTest: false,
      })
    );
    this.brushRingMesh.visible = false;
    this.brushRingMesh.renderOrder = 10;
    this.scene.add(this.brushRingMesh);

    this.rebuildAll();
    this.applyAtmosphere(this.world.atmosphere);
    this.bindEvents();
    this.animate();
  }

  private syncOrbitMouseButtons(): void {
    const t = this.settings.activeTool;
    const orbitOnLeft = this.world.atmosphere.photoMode || t === 'select';
    this.controls.mouseButtons = {
      LEFT: orbitOnLeft ? THREE.MOUSE.ROTATE : (null as unknown as THREE.MOUSE),
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
  }

  public setSettings(next: ToolSettings): void {
    const prevTool = this.settings.activeTool;
    this.settings = { ...next };
    if (prevTool !== next.activeTool) {
      this.cancelDrafts();
      if (next.activeTool !== 'select') {
        this.setSelection(null);
      }
    }
    this.syncOrbitMouseButtons();
    this.refreshPreview();
  }

  public setWorld(nextWorld: CastleWorldState, rebuildTerrain = true): void {
    const prevWeather = this.world.atmosphere.weather;
    this.world = cloneWorld(nextWorld);
    this.cancelDrafts();
    if (rebuildTerrain) {
      this.terrainSystem.update(this.world.terrain, this.world.atmosphere.weather);
    }
    if (prevWeather !== this.world.atmosphere.weather) {
      this.lifeSystem.initWeatherParticles(this.world.atmosphere.weather);
    }
    this.rebuildStructures();
    this.rebuildFloraProps();
    this.applyAtmosphere(this.world.atmosphere);
    this.refreshSelectionVisual();
  }

  public getWorld(): CastleWorldState {
    return cloneWorld(this.world);
  }

  public updateAtmosphere(atm: AtmosphereState): void {
    const prevWeather = this.world.atmosphere.weather;
    this.world.atmosphere = { ...atm };
    if (prevWeather !== atm.weather) {
      this.terrainSystem.update(this.world.terrain, atm.weather);
      this.lifeSystem.initWeatherParticles(atm.weather);
      this.rebuildFloraProps();
      soundscape.setWeather(atm.weather);
    }
    this.applyAtmosphere(atm);
    this.syncOrbitMouseButtons();
  }

  private applyAtmosphere(atm: AtmosphereState): void {
    this.camera.fov = atm.fov;
    this.camera.updateProjectionMatrix();
    this.bloomPass.strength = atm.bloomStrength;
    this.controls.autoRotate = atm.turntable;
    this.controls.autoRotateSpeed = 0.75;

    // Solar angle from timeOfDay (6 = sunrise, 12 = noon, 18 = sunset, 24 = midnight)
    const sunAngle = ((atm.timeOfDay - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(sunAngle); // -1..1
    const azRad = (atm.sunAzimuth * Math.PI) / 180;
    const sunDist = 56;
    const horiz = Math.max(0.18, Math.cos(sunAngle));

    const sunPos = new THREE.Vector3(
      Math.cos(azRad) * horiz * sunDist,
      Math.max(elev * sunDist, -sunDist * 0.4),
      Math.sin(azRad) * horiz * sunDist
    );

    const daylight = THREE.MathUtils.clamp((elev + 0.14) / 0.85, 0, 1);
    const golden = THREE.MathUtils.clamp(1 - Math.abs(elev - 0.12) / 0.28, 0, 1);

    // Light position tracks sun by day and high silver moon by night
    if (elev > -0.05) {
      this.sunLight.position.copy(sunPos);
    } else {
      this.sunLight.position.set(-sunPos.x * 0.7, 36, -sunPos.z * 0.7);
    }

    const noonCol = new THREE.Color('#fff7e8');
    const goldCol = new THREE.Color('#ff9d54');
    const moonCol = new THREE.Color('#8cb2e8');
    const lightCol = new THREE.Color().copy(moonCol).lerp(noonCol, daylight).lerp(goldCol, golden * 0.75);
    this.sunLight.color.copy(lightCol);
    this.sunLight.intensity = 0.58 + daylight * 1.95;

    // Sky colors
    const dayTop = new THREE.Color('#427ec7');
    const dayHor = new THREE.Color('#cae3f5');
    const duskTop = new THREE.Color('#2c325e');
    const duskHor = new THREE.Color('#f29263');
    const nightTop = new THREE.Color('#091020');
    const nightHor = new THREE.Color('#182844');

    const topCol = new THREE.Color().copy(nightTop).lerp(dayTop, daylight).lerp(duskTop, golden * 0.72);
    const horCol = new THREE.Color().copy(nightHor).lerp(dayHor, daylight).lerp(duskHor, golden * 0.85);

    if (atm.weather === 'rain') {
      topCol.lerp(new THREE.Color('#4e5d6c'), 0.52);
      horCol.lerp(new THREE.Color('#7c8b99'), 0.55);
      this.sunLight.intensity *= 0.65;
    } else if (atm.weather === 'mist') {
      horCol.lerp(new THREE.Color('#dde7ec'), 0.45);
    } else if (atm.weather === 'snow') {
      topCol.lerp(new THREE.Color('#9fb5ca'), 0.45);
      horCol.lerp(new THREE.Color('#d9e6f0'), 0.5);
    }

    this.skyMat.uniforms.uTopColor.value.copy(topCol);
    this.skyMat.uniforms.uHorizonColor.value.copy(horCol);
    this.skyMat.uniforms.uSunDir.value.copy(sunPos).normalize();
    this.skyMat.uniforms.uSunGlow.value.copy(goldCol).lerp(noonCol, daylight * 0.5);
    this.skyMat.uniforms.uStarIntensity.value = THREE.MathUtils.clamp(1 - daylight * 2.2, 0, 1);

    this.hemiLight.color.copy(horCol);
    this.hemiLight.groundColor.copy(new THREE.Color('#242b1c').lerp(new THREE.Color('#6a764c'), daylight));
    this.hemiLight.intensity = 0.28 + daylight * 0.52;
    this.ambientLight.intensity = 0.22 + daylight * 0.24;

    const fogDensity = atm.weather === 'mist' ? 0.011 : atm.weather === 'rain' ? 0.0085 : atm.weather === 'snow' ? 0.0075 : 0.0042;
    this.scene.fog = new THREE.FogExp2(horCol, fogDensity);

    // Warm window glow ramps up smoothly as evening falls!
    const nightGlow = THREE.MathUtils.clamp(1 - daylight * 1.45, 0, 1);
    const rainCozy = atm.weather === 'rain' ? 0.45 : 0;
    const winGlow = Math.max(nightGlow, rainCozy);
    sharedWindowGlassMaterial.emissiveIntensity = 0.1 + winGlow * 1.75;
    sharedLanternGlowMaterial.emissiveIntensity = 0.45 + winGlow * 1.65;

    for (const f of this.flames) {
      if (f.light) {
        f.light.intensity = 0.6 + winGlow * 2.6;
      }
    }
  }

  public setCameraPreset(preset: 'iso' | 'hero' | 'top' | 'reset'): void {
    if (preset === 'top') {
      this.camera.position.set(0, 56, 12);
      this.controls.target.set(0, 1.5, 0);
    } else if (preset === 'hero') {
      this.camera.position.set(16, 7.5, 24);
      this.controls.target.set(0, 5.5, -2);
    } else {
      this.camera.position.set(27, 22, 34);
      this.controls.target.set(0, 2.5, 0);
    }
    this.controls.update();
  }

  public captureScreenshot(): string {
    this.brushRingMesh.visible = false;
    this.previewGroup.visible = false;
    if (this.selectionBoxHelper) this.selectionBoxHelper.visible = false;
    this.composer.render();
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    this.previewGroup.visible = true;
    if (this.selectionBoxHelper) this.selectionBoxHelper.visible = true;
    return dataUrl;
  }

  public setSelection(sel: SelectionRef | null): void {
    this.selected = sel;
    this.refreshSelectionVisual();
    this.callbacks.onSelect(sel);
  }

  private refreshSelectionVisual(): void {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
    if (!this.selected) return;

    const match = this.findObjectBySelection(this.selected);
    if (match) {
      this.selectionBoxHelper = new THREE.BoxHelper(match, '#fbbf24');
      this.scene.add(this.selectionBoxHelper);
    }
  }

  private findObjectBySelection(sel: SelectionRef): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    const search = (root: THREE.Object3D) => {
      for (const child of root.children) {
        if (child.userData.selectKind === sel.kind && child.userData.selectId === sel.id) {
          found = child;
          return;
        }
      }
    };
    search(this.structuresGroup);
    if (!found) search(this.floraPropsGroup);
    return found;
  }

  private rebuildAll(): void {
    this.terrainSystem.update(this.world.terrain, this.world.atmosphere.weather);
    this.rebuildStructures();
    this.rebuildFloraProps();
  }

  private clearGroup(g: THREE.Group): void {
    while (g.children.length > 0) {
      const child = g.children[0];
      g.remove(child);
      child.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
  }

  private rebuildStructures(): void {
    this.clearGroup(this.structuresGroup);
    this.banners = [];
    this.chimneys = [];
    this.flames = [];

    const ctx: ArchBuildContext = {
      terrain: this.world.terrain,
      banners: this.banners,
      chimneys: this.chimneys,
      flames: this.flames,
      addPointLights: true,
    };

    for (const wall of this.world.walls) {
      this.structuresGroup.add(buildWallGroup(wall, ctx));
    }
    for (const tower of this.world.towers) {
      this.structuresGroup.add(buildTowerGroup(tower, ctx));
    }
    for (const b of this.world.buildings) {
      this.structuresGroup.add(buildBuildingGroup(b, ctx));
    }
    for (const br of this.world.bridges) {
      this.structuresGroup.add(buildBridgeGroup(br, ctx));
    }
    for (const att of this.world.attachments) {
      this.structuresGroup.add(buildAttachmentGroup(att, ctx));
    }

    this.lifeSystem.syncTerrainAndTowers(this.world.terrain, this.world.towers);
  }

  private rebuildFloraProps(): void {
    this.clearGroup(this.floraPropsGroup);
    for (const f of this.world.flora) {
      this.floraPropsGroup.add(buildFloraGroup(f, this.world.atmosphere.weather));
    }
    for (const p of this.world.props) {
      this.floraPropsGroup.add(buildPropGroup(p, this.flames, true));
    }
  }

  public cancelDrafts(): void {
    this.wallDraftPoints = [];
    this.bridgeDraftStart = null;
    this.callbacks.onChainCountChange(0);
    this.refreshPreview();
  }

  public finishWallChain(): void {
    if (this.wallDraftPoints.length >= 2) {
      this.commitWall(this.wallDraftPoints);
    }
    this.wallDraftPoints = [];
    this.callbacks.onChainCountChange(0);
    this.refreshPreview();
  }

  private commitWall(points: Vec3[]): void {
    const wall: WallEntity = {
      id: makeId('wall'),
      points: points.map((p) => ({ ...p })),
      height: this.settings.wallHeight,
      thickness: this.settings.wallThickness,
      stoneStyle: this.settings.stoneStyle,
      topStyle: this.settings.wallTopStyle,
      cornerTurrets: this.settings.wallCornerTurrets,
      ivyAmount: this.settings.wallIvy,
      forcedGates: [],
    };
    this.world.walls.push(wall);
    this.rebuildStructures();
    soundscape.playStonePlace(0.95);
    this.callbacks.onWorldCommit(this.getWorld());
  }

  private snapPoint(raw: Vec3, anchor?: Vec3): Vec3 {
    const out = { ...raw };
    const snapDist = 1.35;
    let bestDist = snapDist;

    // Snap to wall endpoints
    for (const w of this.world.walls) {
      for (const p of w.points) {
        const d = Math.hypot(p.x - raw.x, p.z - raw.z);
        if (d < bestDist) {
          bestDist = d;
          out.x = p.x;
          out.z = p.z;
          out.y = p.y;
        }
      }
    }
    // Snap to tower centers
    for (const t of this.world.towers) {
      const d = Math.hypot(t.x - raw.x, t.z - raw.z);
      if (d < bestDist) {
        bestDist = d;
        out.x = t.x;
        out.z = t.z;
        out.y = t.y;
      }
    }
    // Snap to start of current draft wall to close ring!
    if (this.wallDraftPoints.length >= 2) {
      const first = this.wallDraftPoints[0];
      const d = Math.hypot(first.x - raw.x, first.z - raw.z);
      if (d < 1.55) {
        out.x = first.x;
        out.z = first.z;
        out.y = first.y;
        return out;
      }
    }

    // 15-degree angle snap relative to previous draft anchor
    if (anchor && this.settings.snapAngles && !this.keysPressed.has('shift')) {
      const dx = out.x - anchor.x;
      const dz = out.z - anchor.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.6 && bestDist === snapDist) {
        const step = Math.PI / 12;
        const a = Math.round(Math.atan2(dz, dx) / step) * step;
        out.x = anchor.x + Math.cos(a) * len;
        out.z = anchor.z + Math.sin(a) * len;
        out.y = getTerrainHeightAt(this.world.terrain, out.x, out.z);
      }
    }
    return out;
  }

  private raycastScene(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const tool = this.settings.activeTool;
    this.currentHoverStructureHit = false;
    this.currentHoverSelect = null;

    if (tool === 'select' || tool === 'erase') {
      const hits = this.raycaster.intersectObjects(
        [...this.structuresGroup.children, ...this.floraPropsGroup.children],
        true
      );
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData.selectKind && obj.userData.selectId) {
          this.currentHoverSelect = {
            kind: obj.userData.selectKind as SelectableKind,
            id: obj.userData.selectId as string,
          };
          this.currentHoverWorld = hits[0].point.clone();
          this.callbacks.onHoverHint(
            tool === 'erase' ? `Click to demolish ${obj.userData.selectKind}` : `Click to inspect ${obj.userData.selectKind}`
          );
          return;
        }
      }
      this.currentHoverWorld = null;
      this.callbacks.onHoverHint(null);
      return;
    }

    if (tool === 'attach') {
      const hits = this.raycaster.intersectObjects(this.structuresGroup.children, true);
      if (hits.length > 0) {
        const hit = hits[0];
        const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
        this.currentHoverWorld = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
        this.currentHoverNormal = { x: n.x, y: n.y, z: n.z };
        this.currentHoverStructureHit = true;
        this.callbacks.onHoverHint('Click surface to snap architectural detail');
      } else {
        this.currentHoverWorld = null;
        this.currentHoverNormal = null;
        this.callbacks.onHoverHint('Hover a wall, tower, or keep surface to attach');
      }
      return;
    }

    // For building stacking: tower & prop can stack on structures OR terrain; others raycast terrain
    const canStackOnStructure = tool === 'tower';
    if (canStackOnStructure) {
      const structHits = this.raycaster.intersectObjects(this.structuresGroup.children, true);
      if (structHits.length > 0) {
        const hit = structHits[0];
        const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
        if (n.y > 0.65) {
          this.currentHoverWorld = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
          this.currentHoverNormal = { x: 0, y: 1, z: 0 };
          this.callbacks.onHoverHint('Click to stack turret onto structure roof');
          return;
        }
      }
    }

    const groundHits = this.raycaster.intersectObject(this.terrainSystem.terrainMesh, false);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      this.currentHoverWorld = { x: pt.x, y: pt.y, z: pt.z };
      this.currentHoverNormal = { x: 0, y: 1, z: 0 };
      if (tool === 'wall') {
        this.callbacks.onHoverHint(
          this.wallDraftPoints.length === 0
            ? 'Click to begin wall chain (or click-drag a segment)'
            : `Wall chain (${this.wallDraftPoints.length} pts) • Click to extend • Double-click / Enter to finish`
        );
      } else if (tool === 'bridge') {
        this.callbacks.onHoverHint(
          this.bridgeDraftStart ? 'Click opposite bank to complete span' : 'Click starting bank to span bridge or stairs'
        );
      } else {
        this.callbacks.onHoverHint(null);
      }
    } else {
      this.currentHoverWorld = null;
      this.callbacks.onHoverHint(null);
    }
  }

  private refreshPreview(): void {
    this.clearGroup(this.previewGroup);
    this.brushRingMesh.visible = false;

    const tool = this.settings.activeTool;
    if (!this.currentHoverWorld) return;

    if (tool === 'terrain' || tool === 'water' || tool === 'path') {
      this.brushRingMesh.visible = true;
      this.brushRingMesh.position.set(
        this.currentHoverWorld.x,
        Math.max(this.currentHoverWorld.y, 0) + 0.14,
        this.currentHoverWorld.z
      );
      this.brushRingMesh.scale.setScalar(this.settings.brushRadius);
      (this.brushRingMesh.material as THREE.MeshBasicMaterial).color.set(
        tool === 'water' ? '#38bdf8' : tool === 'path' ? '#d4c3a1' : '#fbbf24'
      );
      return;
    }

    const dummyCtx: ArchBuildContext = {
      terrain: this.world.terrain,
      banners: [],
      chimneys: [],
      flames: [],
      addPointLights: false,
    };

    const makeGhost = (obj: THREE.Object3D, color = '#fbbf24') => {
      obj.traverse((child) => {
        const m = child as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = false;
          m.receiveShadow = false;
          m.material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.45,
            roughness: 0.5,
          });
        }
      });
      this.previewGroup.add(obj);
    };

    if (tool === 'wall') {
      const anchor = this.wallDraftPoints[this.wallDraftPoints.length - 1] ?? (this.isPointerDown ? this.dragStartWorld ?? undefined : undefined);
      const snapped = this.snapPoint(this.currentHoverWorld, anchor);

      // Show cursor pier
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(this.settings.wallThickness * 0.65, this.settings.wallThickness * 0.65, this.settings.wallHeight, 10),
        new THREE.MeshStandardMaterial({ color: '#fbbf24', transparent: true, opacity: 0.48 })
      );
      marker.position.set(snapped.x, snapped.y + this.settings.wallHeight * 0.5, snapped.z);
      this.previewGroup.add(marker);

      const previewPts =
        this.wallDraftPoints.length >= 1
          ? [...this.wallDraftPoints, snapped]
          : this.isPointerDown && this.dragStartWorld
            ? [this.snapPoint(this.dragStartWorld), snapped]
            : null;

      if (previewPts && previewPts.length >= 2) {
        const draftWall: WallEntity = {
          id: 'preview-wall',
          points: previewPts,
          height: this.settings.wallHeight,
          thickness: this.settings.wallThickness,
          stoneStyle: this.settings.stoneStyle,
          topStyle: this.settings.wallTopStyle,
          cornerTurrets: this.settings.wallCornerTurrets,
          ivyAmount: 0,
          forcedGates: [],
        };
        makeGhost(buildWallGroup(draftWall, dummyCtx), '#fcd34d');
      }
    } else if (tool === 'tower') {
      const previewTower: TowerEntity = {
        id: 'preview-tower',
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        shape: this.settings.towerShape,
        radius: this.settings.towerRadius,
        height: this.settings.towerHeight,
        stoneStyle: this.settings.stoneStyle,
        roofStyle: this.settings.towerRoofStyle,
        roofColor: this.settings.roofColor,
        roofPitch: this.settings.towerRoofPitch,
        hasMachicolations: this.settings.towerMachicolations,
        hasHalfTimberTop: this.settings.towerHalfTimber,
        dormers: false,
        finial: this.settings.towerFinial,
        heraldryColor: this.settings.heraldryColor,
        ivyAmount: 0,
      };
      makeGhost(buildTowerGroup(previewTower, dummyCtx));
    } else if (tool === 'building') {
      const previewB: BuildingEntity = {
        id: 'preview-building',
        kind: this.settings.buildingKind,
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        width: this.settings.buildingWidth,
        depth: this.settings.buildingDepth,
        height: this.settings.buildingHeight,
        rotation: this.settings.buildingRotation,
        floors: this.settings.buildingFloors,
        stoneStyle: this.settings.stoneStyle,
        halfTimberUpper: this.settings.buildingHalfTimber,
        roofStyle: this.settings.buildingRoofStyle,
        roofColor: this.settings.roofColor,
        roofPitch: this.settings.buildingRoofPitch,
        hasChimney: this.settings.buildingChimney,
        hasButtresses: this.settings.buildingButtresses,
        hasDormers: false,
        heraldryColor: this.settings.heraldryColor,
        ivyAmount: 0,
      };
      makeGhost(buildBuildingGroup(previewB, dummyCtx));
    } else if (tool === 'bridge') {
      if (this.bridgeDraftStart) {
        const previewBr: BridgeEntity = {
          id: 'preview-bridge',
          kind: this.settings.bridgeKind,
          start: this.bridgeDraftStart,
          end: this.currentHoverWorld,
          width: this.settings.bridgeWidth,
          archHeight: this.settings.bridgeArchHeight,
          stoneStyle: this.settings.stoneStyle,
          hasLanterns: this.settings.bridgeLanterns,
        };
        makeGhost(buildBridgeGroup(previewBr, dummyCtx), '#38bdf8');
      } else {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 10, 8),
          new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7 })
        );
        marker.position.set(this.currentHoverWorld.x, this.currentHoverWorld.y + 0.3, this.currentHoverWorld.z);
        this.previewGroup.add(marker);
      }
    } else if (tool === 'attach' && this.currentHoverStructureHit && this.currentHoverNormal) {
      makeGhost(
        buildAttachmentGroup(
          {
            id: 'preview-att',
            kind: this.settings.attachmentKind,
            position: this.currentHoverWorld,
            normal: this.currentHoverNormal,
            scale: this.settings.attachmentScale,
            heraldryColor: this.settings.heraldryColor,
            emblem: this.settings.emblem,
          },
          dummyCtx
        ),
        '#fcd34d'
      );
    } else if (tool === 'flora') {
      const f: FloraEntity = {
        id: 'preview-flora',
        kind: this.settings.floraKind,
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        scale: this.settings.floraScale,
        rotation: this.settings.propRotation,
        seed: 42,
      };
      makeGhost(buildFloraGroup(f, this.world.atmosphere.weather), '#4ade80');
    } else if (tool === 'prop') {
      const p: PropEntity = {
        id: 'preview-prop',
        kind: this.settings.propKind,
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        scale: this.settings.propScale,
        rotation: this.settings.propRotation,
        color: this.settings.heraldryColor,
      };
      makeGhost(buildPropGroup(p, [], false), '#fbbf24');
    }
  }

  private performBrushStroke(worldPt: Vec3, altInvert: boolean): void {
    const tool = this.settings.activeTool;
    let changed = false;
    if (tool === 'terrain') {
      const mode = altInvert && this.settings.terrainMode === 'raise' ? 'lower' : this.settings.terrainMode;
      changed = applyTerrainBrush(
        this.world.terrain,
        worldPt.x,
        worldPt.z,
        mode,
        this.settings.brushRadius,
        this.settings.brushStrength * 0.35,
        this.sculptLevelRef
      );
      if (changed) soundscape.playBrushTick(false);
    } else if (tool === 'water') {
      changed = applyMoatBrush(
        this.world.terrain,
        worldPt.x,
        worldPt.z,
        this.settings.brushRadius,
        this.settings.brushStrength * 0.45,
        altInvert
      );
      if (changed) soundscape.playBrushTick(true);
    } else if (tool === 'path') {
      changed = applyPathBrush(
        this.world.terrain,
        worldPt.x,
        worldPt.z,
        altInvert ? 'meadow' : this.settings.pathMode,
        this.settings.brushRadius * 0.72
      );
      if (changed) soundscape.playBrushTick(false);
    }

    if (changed) {
      this.terrainSystem.update(this.world.terrain, this.world.atmosphere.weather);
    }
  }

  private handlePrimaryClick(clientX: number, clientY: number, isAlt: boolean): void {
    this.raycastScene(clientX, clientY);
    const tool = this.settings.activeTool;

    if (tool === 'select') {
      if (this.currentHoverSelect) {
        this.setSelection(this.currentHoverSelect);
        soundscape.playSelect();
      } else {
        this.setSelection(null);
      }
      return;
    }

    if (tool === 'erase') {
      if (this.currentHoverSelect) {
        this.deleteEntity(this.currentHoverSelect);
      }
      return;
    }

    if (!this.currentHoverWorld) return;

    if (tool === 'wall') {
      const anchor = this.wallDraftPoints[this.wallDraftPoints.length - 1];
      const pt = this.snapPoint(this.currentHoverWorld, anchor);

      // Check if clicking back onto first point to close loop!
      if (this.wallDraftPoints.length >= 2) {
        const first = this.wallDraftPoints[0];
        if (Math.hypot(pt.x - first.x, pt.z - first.z) < 0.4) {
          this.wallDraftPoints.push({ ...first });
          this.finishWallChain();
          return;
        }
      }

      if (anchor && Math.hypot(pt.x - anchor.x, pt.z - anchor.z) < 0.35) {
        return;
      }
      this.wallDraftPoints.push(pt);
      this.callbacks.onChainCountChange(this.wallDraftPoints.length);
      soundscape.playStonePlace(1.08);
      this.refreshPreview();
      return;
    }

    if (tool === 'bridge') {
      if (!this.bridgeDraftStart) {
        this.bridgeDraftStart = { ...this.currentHoverWorld };
        soundscape.playWoodSnap();
        this.refreshPreview();
      } else {
        const dist = Math.hypot(
          this.currentHoverWorld.x - this.bridgeDraftStart.x,
          this.currentHoverWorld.z - this.bridgeDraftStart.z
        );
        if (dist >= 1.0) {
          this.world.bridges.push({
            id: makeId('bridge'),
            kind: this.settings.bridgeKind,
            start: this.bridgeDraftStart,
            end: { ...this.currentHoverWorld },
            width: this.settings.bridgeWidth,
            archHeight: this.settings.bridgeArchHeight,
            stoneStyle: this.settings.stoneStyle,
            hasLanterns: this.settings.bridgeLanterns,
          });
          this.bridgeDraftStart = null;
          this.rebuildStructures();
          soundscape.playStonePlace(0.9);
          this.callbacks.onWorldCommit(this.getWorld());
          this.refreshPreview();
        }
      }
      return;
    }

    if (tool === 'tower') {
      const t: TowerEntity = {
        id: makeId('tower'),
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        shape: this.settings.towerShape,
        radius: this.settings.towerRadius,
        height: this.settings.towerHeight,
        stoneStyle: this.settings.stoneStyle,
        roofStyle: this.settings.towerRoofStyle,
        roofColor: this.settings.roofColor,
        roofPitch: this.settings.towerRoofPitch,
        hasMachicolations: this.settings.towerMachicolations,
        hasHalfTimberTop: this.settings.towerHalfTimber,
        dormers: this.settings.towerDormers,
        finial: this.settings.towerFinial,
        heraldryColor: this.settings.heraldryColor,
        ivyAmount: this.settings.towerIvy,
      };
      this.world.towers.push(t);
      this.rebuildStructures();
      soundscape.playStonePlace(0.88);
      this.callbacks.onWorldCommit(this.getWorld());
      return;
    }

    if (tool === 'building') {
      const b: BuildingEntity = {
        id: makeId('keep'),
        kind: this.settings.buildingKind,
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        width: this.settings.buildingWidth,
        depth: this.settings.buildingDepth,
        height: this.settings.buildingHeight,
        rotation: this.settings.buildingRotation,
        floors: this.settings.buildingFloors,
        stoneStyle: this.settings.stoneStyle,
        halfTimberUpper: this.settings.buildingHalfTimber,
        roofStyle: this.settings.buildingRoofStyle,
        roofColor: this.settings.roofColor,
        roofPitch: this.settings.buildingRoofPitch,
        hasChimney: this.settings.buildingChimney,
        hasButtresses: this.settings.buildingButtresses,
        hasDormers: this.settings.buildingDormers,
        heraldryColor: this.settings.heraldryColor,
        ivyAmount: this.settings.buildingIvy,
      };
      this.world.buildings.push(b);
      this.rebuildStructures();
      soundscape.playStonePlace(0.75);
      this.callbacks.onWorldCommit(this.getWorld());
      return;
    }

    if (tool === 'attach' && this.currentHoverStructureHit && this.currentHoverNormal) {
      this.world.attachments.push({
        id: makeId('att'),
        kind: this.settings.attachmentKind,
        position: { ...this.currentHoverWorld },
        normal: { ...this.currentHoverNormal },
        scale: this.settings.attachmentScale,
        heraldryColor: this.settings.heraldryColor,
        emblem: this.settings.emblem,
      });
      this.rebuildStructures();
      soundscape.playWoodSnap();
      this.callbacks.onWorldCommit(this.getWorld());
      return;
    }

    if (tool === 'flora') {
      this.world.flora.push({
        id: makeId('flora'),
        kind: this.settings.floraKind,
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        scale: this.settings.floraScale * (0.88 + Math.random() * 0.28),
        rotation: Math.random() * Math.PI * 2,
        seed: Math.floor(Math.random() * 10000),
      });
      this.rebuildFloraProps();
      soundscape.playBrushTick(false);
      this.callbacks.onWorldCommit(this.getWorld());
      return;
    }

    if (tool === 'prop') {
      this.world.props.push({
        id: makeId('prop'),
        kind: this.settings.propKind,
        x: this.currentHoverWorld.x,
        y: this.currentHoverWorld.y,
        z: this.currentHoverWorld.z,
        scale: this.settings.propScale,
        rotation: this.settings.propRotation,
        color: this.settings.heraldryColor,
      });
      this.rebuildFloraProps();
      soundscape.playWoodSnap();
      this.callbacks.onWorldCommit(this.getWorld());
      return;
    }

    if (tool === 'terrain' || tool === 'water' || tool === 'path') {
      this.performBrushStroke(this.currentHoverWorld, isAlt);
    }
  }

  public deleteEntity(sel: SelectionRef): void {
    const obj = this.findObjectBySelection(sel);
    if (obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      this.lifeSystem.spawnDustBurst(center, 9);
    }

    if (sel.kind === 'wall') this.world.walls = this.world.walls.filter((x) => x.id !== sel.id);
    else if (sel.kind === 'tower') this.world.towers = this.world.towers.filter((x) => x.id !== sel.id);
    else if (sel.kind === 'building') this.world.buildings = this.world.buildings.filter((x) => x.id !== sel.id);
    else if (sel.kind === 'bridge') this.world.bridges = this.world.bridges.filter((x) => x.id !== sel.id);
    else if (sel.kind === 'attachment') this.world.attachments = this.world.attachments.filter((x) => x.id !== sel.id);
    else if (sel.kind === 'flora') this.world.flora = this.world.flora.filter((x) => x.id !== sel.id);
    else if (sel.kind === 'prop') this.world.props = this.world.props.filter((x) => x.id !== sel.id);

    if (this.selected?.id === sel.id) {
      this.setSelection(null);
    }
    this.rebuildStructures();
    this.rebuildFloraProps();
    soundscape.playDemolish();
    this.callbacks.onWorldCommit(this.getWorld());
  }

  private bindEvents(): void {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.isPointerDown = true;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };

      const tool = this.settings.activeTool;
      this.raycastScene(e.clientX, e.clientY);
      this.dragStartWorld = this.currentHoverWorld ? { ...this.currentHoverWorld } : null;

      if (tool === 'terrain' || tool === 'water' || tool === 'path') {
        if (this.currentHoverWorld) {
          this.isSculpting = true;
          this.sculptLevelRef = this.currentHoverWorld.y;
          this.performBrushStroke(this.currentHoverWorld, e.altKey);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      this.raycastScene(e.clientX, e.clientY);
      if (this.isPointerDown && this.isSculpting && this.currentHoverWorld) {
        this.performBrushStroke(this.currentHoverWorld, e.altKey);
      }
      this.refreshPreview();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !this.isPointerDown) return;
      this.isPointerDown = false;
      const distMoved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

      if (this.isSculpting) {
        this.isSculpting = false;
        this.sculptLevelRef = undefined;
        // Re-settle foundations & auto-open any path-crossing wall gates!
        this.rebuildStructures();
        this.rebuildFloraProps();
        this.callbacks.onWorldCommit(this.getWorld());
        return;
      }

      const tool = this.settings.activeTool;
      if (tool === 'select') {
        if (distMoved < 6) {
          this.handlePrimaryClick(e.clientX, e.clientY, e.altKey);
        }
        return;
      }

      if (this.world.atmosphere.photoMode) return;

      // Support fluid single-stroke click-and-drag for Walls and Bridges
      if (distMoved >= 16 && this.dragStartWorld && this.currentHoverWorld) {
        if (tool === 'wall' && this.wallDraftPoints.length === 0) {
          const p0 = this.snapPoint(this.dragStartWorld);
          const p1 = this.snapPoint(this.currentHoverWorld, p0);
          if (Math.hypot(p1.x - p0.x, p1.z - p0.z) >= 0.9) {
            this.commitWall([p0, p1]);
            this.refreshPreview();
            return;
          }
        } else if (tool === 'bridge' && !this.bridgeDraftStart) {
          if (
            Math.hypot(
              this.currentHoverWorld.x - this.dragStartWorld.x,
              this.currentHoverWorld.z - this.dragStartWorld.z
            ) >= 1.2
          ) {
            this.bridgeDraftStart = { ...this.dragStartWorld };
            this.handlePrimaryClick(e.clientX, e.clientY, e.altKey);
            return;
          }
        }
      }

      if (distMoved < 10) {
        this.handlePrimaryClick(e.clientX, e.clientY, e.altKey);
      }
    };

    const onDoubleClick = () => {
      if (this.settings.activeTool === 'wall' && this.wallDraftPoints.length >= 2) {
        this.finishWallChain();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (this.wallDraftPoints.length >= 2) {
        this.finishWallChain();
      } else if (this.wallDraftPoints.length > 0 || this.bridgeDraftStart) {
        this.cancelDrafts();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      this.keysPressed.add(e.key.toLowerCase());
      if (e.key === 'Escape') {
        this.cancelDrafts();
      } else if (e.key === 'Enter' && this.wallDraftPoints.length >= 2) {
        this.finishWallChain();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.key.toLowerCase());
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
      const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
      this.composer.setSize(w, h);
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('dblclick', onDoubleClick);
    this.canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    // Store cleanup on instance
    this.cleanupListeners = () => {
      this.canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      this.canvas.removeEventListener('dblclick', onDoubleClick);
      this.canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
    };
  }

  private cleanupListeners: () => void = () => {};

  private animate = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    // Smooth WASD / Arrow panning relative to camera facing direction
    const panSpeed = 24 * dt;
    let panX = 0;
    let panZ = 0;
    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) panZ -= 1;
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) panZ += 1;
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) panX -= 1;
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) panX += 1;

    if ((panX !== 0 || panZ !== 0) && document.activeElement?.tagName !== 'INPUT') {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const move = new THREE.Vector3()
        .addScaledVector(right, panX * panSpeed)
        .addScaledVector(forward, -panZ * panSpeed);
      this.camera.position.add(move);
      this.controls.target.add(move);
    }

    this.controls.update();

    // Update Sky & Water shaders
    const sunAngle = ((this.world.atmosphere.timeOfDay - 6) / 24) * Math.PI * 2;
    const daylight = THREE.MathUtils.clamp((Math.sin(sunAngle) + 0.14) / 0.85, 0, 1);

    this.skyMat.uniforms.uTime.value = this.elapsed;
    this.terrainSystem.updateAtmosphere(
      this.elapsed,
      this.sunLight.position,
      this.sunLight.color,
      this.skyMat.uniforms.uHorizonColor.value,
      daylight,
      this.world.atmosphere.weather
    );

    // Animate cloth banners waving in the breeze
    for (const b of this.banners) {
      const pos = b.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const base = b.baseVertices;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];
        const waveFactor = Math.max(0, 1 - (by + 1) * 0.5);
        const zOff = Math.sin(this.elapsed * 3.8 + b.phase + bx * 2.5 + by * 1.9) * 0.09 * (0.35 + waveFactor);
        pos.setXYZ(i, bx, by, bz + zOff);
      }
      pos.needsUpdate = true;
    }

    // Flicker brazier flames & torch lights
    sharedFlameMaterial.emissiveIntensity = 1.65 + Math.sin(this.elapsed * 14) * 0.35;
    for (const f of this.flames) {
      if (f.mesh) {
        const s = 0.92 + Math.sin(this.elapsed * 16 + f.phase) * 0.15;
        f.mesh.scale.set(s, 0.88 + Math.cos(this.elapsed * 19 + f.phase) * 0.2, s);
      }
    }

    // Update doves, sheep, smoke, fireflies, and weather particles
    this.lifeSystem.update(
      dt,
      this.elapsed,
      this.world.terrain,
      this.chimneys,
      daylight,
      this.world.atmosphere.wildlifeEnabled
    );

    this.composer.render();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.cleanupListeners();
    this.controls.dispose();
    this.clearGroup(this.structuresGroup);
    this.clearGroup(this.floraPropsGroup);
    this.clearGroup(this.previewGroup);
    this.terrainSystem.dispose();
    this.lifeSystem.dispose();
    this.skyMesh.geometry.dispose();
    this.skyMat.dispose();
    this.brushRingMesh.geometry.dispose();
    (this.brushRingMesh.material as THREE.Material).dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
