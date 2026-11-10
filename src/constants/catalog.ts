import {
  ActiveTool,
  AttachmentKind,
  BridgeKind,
  BuildingKind,
  BuildingRoofStyle,
  FloraKind,
  PropKind,
  ToolSettings,
  TowerRoofStyle,
  TowerShape,
  WallTopStyle,
} from '../types/castle';

export interface ToolMeta {
  id: ActiveTool;
  label: string;
  hotkey: string;
  shortDesc: string;
}

export const TOOL_LIST: ToolMeta[] = [
  { id: 'select', label: 'Inspect', hotkey: '1', shortDesc: 'Select, inspect & restyle any built piece' },
  { id: 'terrain', label: 'Terrain', hotkey: '2', shortDesc: 'Sculpt hills, plateaus, valleys & rocky crags' },
  { id: 'water', label: 'Moat', hotkey: '3', shortDesc: 'Carve shimmering water moats, ponds & rivers' },
  { id: 'path', label: 'Paths', hotkey: '4', shortDesc: 'Paint cobble roads & flagstone plazas (auto-opens wall gates!)' },
  { id: 'wall', label: 'Walls', hotkey: '5', shortDesc: 'Draw snapping or freeform curtain walls with turrets' },
  { id: 'tower', label: 'Towers', hotkey: '6', shortDesc: 'Place & stack round, octagonal, or square towers' },
  { id: 'building', label: 'Keeps', hotkey: '7', shortDesc: 'Build great keeps, timbered halls, chapels & gatehouses' },
  { id: 'bridge', label: 'Bridges', hotkey: '8', shortDesc: 'Span moats & cliffs with arch bridges, drawbridges & stairs' },
  { id: 'attach', label: 'Details', hotkey: '9', shortDesc: 'Snap windows, doors, balconies, banners, lanterns & ivy' },
  { id: 'flora', label: 'Flora', hotkey: '0', shortDesc: 'Plant oaks, pines, willows, cherry blossoms & hedges' },
  { id: 'prop', label: 'Props', hotkey: 'P', shortDesc: 'Add fountains, wells, market stalls, gazebos & lamps' },
  { id: 'erase', label: 'Demolish', hotkey: 'X', shortDesc: 'Click any piece to remove it with a dust puff' },
];

export const TOWER_SHAPES: { id: TowerShape; label: string }[] = [
  { id: 'round', label: 'Round' },
  { id: 'octagonal', label: 'Octagonal' },
  { id: 'square', label: 'Square' },
];

export const TOWER_ROOF_STYLES: { id: TowerRoofStyle; label: string }[] = [
  { id: 'conical', label: 'Conical Spire' },
  { id: 'steep_hip', label: 'Steep Château' },
  { id: 'bell', label: 'Bell Cupola' },
  { id: 'gable', label: 'Gabled Roof' },
  { id: 'crenellated', label: 'Battlement Deck' },
  { id: 'ruined', label: 'Ruined Crown' },
  { id: 'none', label: 'Flat Terrace' },
];

export const WALL_TOP_STYLES: { id: WallTopStyle; label: string }[] = [
  { id: 'crenellated', label: 'Crenellations' },
  { id: 'machicolated', label: 'Machicolated' },
  { id: 'smooth', label: 'Smooth Parapet' },
  { id: 'ruined', label: 'Weathered Ruin' },
];

export const BUILDING_KINDS: { id: BuildingKind; label: string; w: number; d: number; h: number; floors: number }[] = [
  { id: 'keep', label: 'Grand Keep', w: 6.2, d: 5.6, h: 7.4, floors: 3 },
  { id: 'hall', label: 'Timber Hall', w: 6.6, d: 4.0, h: 4.4, floors: 2 },
  { id: 'chapel', label: 'Abbey Chapel', w: 4.2, d: 7.2, h: 6.0, floors: 2 },
  { id: 'gatehouse', label: 'Gatehouse', w: 4.8, d: 3.4, h: 5.2, floors: 2 },
  { id: 'cloister', label: 'Cloister Wing', w: 5.6, d: 3.0, h: 3.4, floors: 1 },
];

export const BUILDING_ROOF_STYLES: { id: BuildingRoofStyle; label: string }[] = [
  { id: 'gable', label: 'Pitched Gable' },
  { id: 'hip', label: 'Hipped Roof' },
  { id: 'stepped_gable', label: 'Crow-Step Gable' },
  { id: 'chapel_spire', label: 'Spire Ridge' },
  { id: 'crenellated', label: 'Battlement Roof' },
];

export const BRIDGE_KINDS: { id: BridgeKind; label: string }[] = [
  { id: 'stone_arch', label: 'Stone Arch Bridge' },
  { id: 'drawbridge', label: 'Chain Drawbridge' },
  { id: 'timber_bridge', label: 'Timber Footbridge' },
  { id: 'stone_stairs', label: 'Stone Staircase' },
];

export const ATTACHMENT_KINDS: { id: AttachmentKind; label: string; category: string }[] = [
  { id: 'gothic_window', label: 'Gothic Window', category: 'Windows' },
  { id: 'arched_window', label: 'Arched Window', category: 'Windows' },
  { id: 'rose_window', label: 'Rose Window', category: 'Windows' },
  { id: 'shutter_window', label: 'Shuttered Window', category: 'Windows' },
  { id: 'arrow_slit', label: 'Arrow Slit', category: 'Windows' },
  { id: 'oak_door', label: 'Oak Portal Door', category: 'Portals' },
  { id: 'iron_portcullis', label: 'Portcullis Gate', category: 'Portals' },
  { id: 'timber_balcony', label: 'Timber Balcony', category: 'Accents' },
  { id: 'stone_oriel', label: 'Stone Oriel Bay', category: 'Accents' },
  { id: 'banner', label: 'Heraldic Banner', category: 'Accents' },
  { id: 'wall_lantern', label: 'Iron Lantern', category: 'Lights' },
  { id: 'torch_brazier', label: 'Fire Brazier', category: 'Lights' },
  { id: 'ivy_patch', label: 'Climbing Ivy', category: 'Nature' },
];

export const FLORA_KINDS: { id: FloraKind; label: string }[] = [
  { id: 'oak', label: 'Ancient Oak' },
  { id: 'pine', label: 'Highland Pine' },
  { id: 'cypress', label: 'Tall Cypress' },
  { id: 'willow', label: 'Weeping Willow' },
  { id: 'blossom', label: 'Blossom Tree' },
  { id: 'hedge', label: 'Trimmed Hedge' },
  { id: 'bush', label: 'Meadow Shrub' },
  { id: 'wildflowers', label: 'Wildflowers' },
  { id: 'reeds', label: 'Water Reeds' },
];

export const PROP_KINDS: { id: PropKind; label: string }[] = [
  { id: 'fountain', label: 'Stone Fountain' },
  { id: 'well', label: 'Wishing Well' },
  { id: 'market_stall', label: 'Market Stall' },
  { id: 'gazebo', label: 'Garden Gazebo' },
  { id: 'lamp_post', label: 'Street Lantern' },
  { id: 'campfire', label: 'Hearth Brazier' },
  { id: 'statue', label: 'Knight Statue' },
  { id: 'bench', label: 'Courtyard Bench' },
  { id: 'cart', label: 'Timber Cart' },
  { id: 'barrels', label: 'Oak Barrels' },
];

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  activeTool: 'wall',
  stoneStyle: 'limestone',
  roofColor: 'terracotta',
  heraldryColor: '#b8323c',
  emblem: 'crown',
  terrainMode: 'raise',
  pathMode: 'cobble',
  brushRadius: 4.5,
  brushStrength: 0.45,
  wallHeight: 4.6,
  wallThickness: 1.15,
  wallTopStyle: 'crenellated',
  wallCornerTurrets: true,
  wallIvy: 0.25,
  snapAngles: true,
  towerShape: 'round',
  towerRadius: 2.0,
  towerHeight: 7.2,
  towerRoofStyle: 'conical',
  towerRoofPitch: 1.25,
  towerMachicolations: true,
  towerHalfTimber: false,
  towerDormers: true,
  towerFinial: 'flag',
  towerIvy: 0.2,
  buildingKind: 'keep',
  buildingWidth: 6.2,
  buildingDepth: 5.6,
  buildingHeight: 7.4,
  buildingRotation: 0,
  buildingFloors: 3,
  buildingHalfTimber: false,
  buildingRoofStyle: 'hip',
  buildingRoofPitch: 1.05,
  buildingChimney: true,
  buildingButtresses: true,
  buildingDormers: true,
  buildingIvy: 0.2,
  bridgeKind: 'stone_arch',
  bridgeWidth: 2.3,
  bridgeArchHeight: 1.2,
  bridgeLanterns: true,
  attachmentKind: 'gothic_window',
  attachmentScale: 1.0,
  floraKind: 'oak',
  floraScale: 1.0,
  propKind: 'fountain',
  propScale: 1.0,
  propRotation: 0,
};
