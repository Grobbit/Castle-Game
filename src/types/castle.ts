export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type StoneStyle =
  | 'limestone'
  | 'sandstone'
  | 'cobble'
  | 'basalt'
  | 'whitewash'
  | 'mossy';

export type RoofColor =
  | 'terracotta'
  | 'slate'
  | 'copper'
  | 'thatch'
  | 'obsidian'
  | 'crimson';

export type TowerShape = 'round' | 'octagonal' | 'square';

export type TowerRoofStyle =
  | 'conical'
  | 'steep_hip'
  | 'bell'
  | 'crenellated'
  | 'gable'
  | 'ruined'
  | 'none';

export type BuildingKind = 'keep' | 'hall' | 'chapel' | 'cloister' | 'gatehouse';

export type BuildingRoofStyle =
  | 'gable'
  | 'hip'
  | 'crenellated'
  | 'stepped_gable'
  | 'chapel_spire';

export type WallTopStyle =
  | 'crenellated'
  | 'machicolated'
  | 'smooth'
  | 'ruined';

export type BridgeKind =
  | 'stone_arch'
  | 'drawbridge'
  | 'timber_bridge'
  | 'stone_stairs';

export type AttachmentKind =
  | 'gothic_window'
  | 'arched_window'
  | 'rose_window'
  | 'shutter_window'
  | 'arrow_slit'
  | 'oak_door'
  | 'iron_portcullis'
  | 'timber_balcony'
  | 'stone_oriel'
  | 'banner'
  | 'wall_lantern'
  | 'torch_brazier'
  | 'ivy_patch';

export type HeraldryEmblem = 'crown' | 'lion' | 'fleur' | 'star' | 'chevron' | 'sun';

export type FloraKind =
  | 'oak'
  | 'pine'
  | 'cypress'
  | 'willow'
  | 'blossom'
  | 'hedge'
  | 'bush'
  | 'wildflowers'
  | 'reeds';

export type PropKind =
  | 'fountain'
  | 'well'
  | 'market_stall'
  | 'gazebo'
  | 'cart'
  | 'barrels'
  | 'bench'
  | 'statue'
  | 'lamp_post'
  | 'campfire';

export type WeatherKind = 'clear' | 'mist' | 'rain' | 'autumn' | 'snow';

export type SurfaceType = 0 | 1 | 2 | 3 | 4; // 0: grass, 1: cobble, 2: flagstone, 3: dirt, 4: cliff rock

export interface TerrainData {
  gridRes: number; // e.g., 81
  worldSize: number; // e.g., 80 (-40..40)
  heights: number[];
  surface: number[];
}

export interface WallEntity {
  id: string;
  points: Vec3[];
  height: number;
  thickness: number;
  stoneStyle: StoneStyle;
  topStyle: WallTopStyle;
  cornerTurrets: boolean;
  ivyAmount: number;
  forcedGates: number[]; // segment indices forced to render as arch gatehouse
}

export interface TowerEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  shape: TowerShape;
  radius: number;
  height: number;
  stoneStyle: StoneStyle;
  roofStyle: TowerRoofStyle;
  roofColor: RoofColor;
  roofPitch: number;
  hasMachicolations: boolean;
  hasHalfTimberTop: boolean;
  dormers: boolean;
  finial: 'spire' | 'flag' | 'weathervane' | 'none';
  heraldryColor: string;
  ivyAmount: number;
}

export interface BuildingEntity {
  id: string;
  kind: BuildingKind;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  floors: number;
  stoneStyle: StoneStyle;
  halfTimberUpper: boolean;
  roofStyle: BuildingRoofStyle;
  roofColor: RoofColor;
  roofPitch: number;
  hasChimney: boolean;
  hasButtresses: boolean;
  hasDormers: boolean;
  heraldryColor: string;
  ivyAmount: number;
}

export interface BridgeEntity {
  id: string;
  kind: BridgeKind;
  start: Vec3;
  end: Vec3;
  width: number;
  archHeight: number;
  stoneStyle: StoneStyle;
  hasLanterns: boolean;
}

export interface AttachmentEntity {
  id: string;
  kind: AttachmentKind;
  position: Vec3;
  normal: Vec3;
  scale: number;
  heraldryColor: string;
  emblem: HeraldryEmblem;
  hostId?: string;
}

export interface FloraEntity {
  id: string;
  kind: FloraKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  seed: number;
}

export interface PropEntity {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  color: string;
}

export interface AtmosphereState {
  timeOfDay: number; // 0..24
  sunAzimuth: number; // 0..360
  weather: WeatherKind;
  fov: number; // 20..65
  bloomStrength: number; // 0..1
  wildlifeEnabled: boolean;
  turntable: boolean;
  photoMode: boolean;
}

export interface CastleWorldState {
  version: number;
  name: string;
  terrain: TerrainData;
  walls: WallEntity[];
  towers: TowerEntity[];
  buildings: BuildingEntity[];
  bridges: BridgeEntity[];
  attachments: AttachmentEntity[];
  flora: FloraEntity[];
  props: PropEntity[];
  atmosphere: AtmosphereState;
}

export type ActiveTool =
  | 'select'
  | 'terrain'
  | 'water'
  | 'path'
  | 'wall'
  | 'tower'
  | 'building'
  | 'bridge'
  | 'attach'
  | 'flora'
  | 'prop'
  | 'erase';

export type TerrainBrushMode = 'raise' | 'lower' | 'level' | 'smooth' | 'cliff';
export type PathBrushMode = 'cobble' | 'flagstone' | 'dirt' | 'meadow';

export interface ToolSettings {
  activeTool: ActiveTool;
  stoneStyle: StoneStyle;
  roofColor: RoofColor;
  heraldryColor: string;
  emblem: HeraldryEmblem;
  // Terrain / Water / Path brush
  terrainMode: TerrainBrushMode;
  pathMode: PathBrushMode;
  brushRadius: number;
  brushStrength: number;
  // Wall
  wallHeight: number;
  wallThickness: number;
  wallTopStyle: WallTopStyle;
  wallCornerTurrets: boolean;
  wallIvy: number;
  snapAngles: boolean;
  // Tower
  towerShape: TowerShape;
  towerRadius: number;
  towerHeight: number;
  towerRoofStyle: TowerRoofStyle;
  towerRoofPitch: number;
  towerMachicolations: boolean;
  towerHalfTimber: boolean;
  towerDormers: boolean;
  towerFinial: 'spire' | 'flag' | 'weathervane' | 'none';
  towerIvy: number;
  // Building
  buildingKind: BuildingKind;
  buildingWidth: number;
  buildingDepth: number;
  buildingHeight: number;
  buildingRotation: number;
  buildingFloors: number;
  buildingHalfTimber: boolean;
  buildingRoofStyle: BuildingRoofStyle;
  buildingRoofPitch: number;
  buildingChimney: boolean;
  buildingButtresses: boolean;
  buildingDormers: boolean;
  buildingIvy: number;
  // Bridge
  bridgeKind: BridgeKind;
  bridgeWidth: number;
  bridgeArchHeight: number;
  bridgeLanterns: boolean;
  // Attachment
  attachmentKind: AttachmentKind;
  attachmentScale: number;
  // Flora
  floraKind: FloraKind;
  floraScale: number;
  // Prop
  propKind: PropKind;
  propScale: number;
  propRotation: number;
}

export type SelectableKind =
  | 'wall'
  | 'tower'
  | 'building'
  | 'bridge'
  | 'attachment'
  | 'flora'
  | 'prop';

export interface SelectionRef {
  kind: SelectableKind;
  id: string;
}
