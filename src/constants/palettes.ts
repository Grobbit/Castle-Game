import { HeraldryEmblem, RoofColor, StoneStyle, WeatherKind } from '../types/castle';

export interface StonePaletteDef {
  id: StoneStyle;
  label: string;
  primaryHex: string;
  secondaryHex: string;
  mortarHex: string;
  trimHex: string;
  roughness: number;
  swatch: string;
}

export const STONE_PALETTES: Record<StoneStyle, StonePaletteDef> = {
  limestone: {
    id: 'limestone',
    label: 'Warm Limestone',
    primaryHex: '#c9bfa8',
    secondaryHex: '#b4a88e',
    mortarHex: '#8d836f',
    trimHex: '#dfd7c3',
    roughness: 0.88,
    swatch: '#c9bfa8',
  },
  sandstone: {
    id: 'sandstone',
    label: 'Sun Sandstone',
    primaryHex: '#cf9e6e',
    secondaryHex: '#ba8556',
    mortarHex: '#8c613e',
    trimHex: '#e3bb90',
    roughness: 0.9,
    swatch: '#cf9e6e',
  },
  cobble: {
    id: 'cobble',
    label: 'River Cobble',
    primaryHex: '#92969c',
    secondaryHex: '#767b84',
    mortarHex: '#5a5d64',
    trimHex: '#b8bcc2',
    roughness: 0.92,
    swatch: '#8b9098',
  },
  basalt: {
    id: 'basalt',
    label: 'Dark Basalt',
    primaryHex: '#4f5560',
    secondaryHex: '#3c424c',
    mortarHex: '#282c34',
    trimHex: '#737b88',
    roughness: 0.82,
    swatch: '#4f5560',
  },
  whitewash: {
    id: 'whitewash',
    label: 'Chalk Plaster',
    primaryHex: '#ece5d6',
    secondaryHex: '#ddd3be',
    mortarHex: '#c2b69e',
    trimHex: '#8d7f68',
    roughness: 0.94,
    swatch: '#ece5d6',
  },
  mossy: {
    id: 'mossy',
    label: 'Mossy Ruins',
    primaryHex: '#8f947e',
    secondaryHex: '#6c7758',
    mortarHex: '#515943',
    trimHex: '#aeb39b',
    roughness: 0.95,
    swatch: '#7c8667',
  },
};

export interface RoofPaletteDef {
  id: RoofColor;
  label: string;
  primaryHex: string;
  secondaryHex: string;
  ridgeHex: string;
  roughness: number;
  metalness: number;
  swatch: string;
}

export const ROOF_PALETTES: Record<RoofColor, RoofPaletteDef> = {
  terracotta: {
    id: 'terracotta',
    label: 'Terracotta Clay',
    primaryHex: '#b95c40',
    secondaryHex: '#99462d',
    ridgeHex: '#d37657',
    roughness: 0.82,
    metalness: 0.04,
    swatch: '#b95c40',
  },
  slate: {
    id: 'slate',
    label: 'Blue Slate',
    primaryHex: '#4e6074',
    secondaryHex: '#3c4b5c',
    ridgeHex: '#74889d',
    roughness: 0.68,
    metalness: 0.14,
    swatch: '#4e6074',
  },
  copper: {
    id: 'copper',
    label: 'Verdigris Copper',
    primaryHex: '#5b9c86',
    secondaryHex: '#447e6a',
    ridgeHex: '#85bfa8',
    roughness: 0.56,
    metalness: 0.35,
    swatch: '#5b9c86',
  },
  thatch: {
    id: 'thatch',
    label: 'Golden Thatch',
    primaryHex: '#b9964f',
    secondaryHex: '#967638',
    ridgeHex: '#cfa963',
    roughness: 0.96,
    metalness: 0.0,
    swatch: '#b9964f',
  },
  obsidian: {
    id: 'obsidian',
    label: 'Charcoal Shingle',
    primaryHex: '#30343f',
    secondaryHex: '#22252e',
    ridgeHex: '#505666',
    roughness: 0.72,
    metalness: 0.12,
    swatch: '#30343f',
  },
  crimson: {
    id: 'crimson',
    label: 'Royal Crimson',
    primaryHex: '#9c363e',
    secondaryHex: '#78252c',
    ridgeHex: '#c85a62',
    roughness: 0.76,
    metalness: 0.08,
    swatch: '#9c363e',
  },
};

export const HERALDRY_COLORS = [
  { label: 'Royal Crimson', hex: '#b8323c' },
  { label: 'Sapphire Azure', hex: '#2f64a8' },
  { label: 'Forest Emerald', hex: '#2e7d54' },
  { label: 'Sovereign Gold', hex: '#d49a2a' },
  { label: 'Amethyst Plum', hex: '#714091' },
  { label: 'Ivory Banner', hex: '#ebe3cf' },
  { label: 'Obsidian Raven', hex: '#262b36' },
];

export const HERALDRY_EMBLEMS: { id: HeraldryEmblem; label: string }[] = [
  { id: 'crown', label: 'Crown' },
  { id: 'lion', label: 'Shield Lion' },
  { id: 'fleur', label: 'Fleur-de-lis' },
  { id: 'star', label: 'North Star' },
  { id: 'chevron', label: 'Chevron' },
  { id: 'sun', label: 'Sunburst' },
];

export const TIME_PRESETS: { label: string; hour: number; icon: string }[] = [
  { label: 'Dawn', hour: 6.4, icon: '🌅' },
  { label: 'Morning', hour: 9.5, icon: '🌤️' },
  { label: 'Noon', hour: 13.0, icon: '☀️' },
  { label: 'Golden Hour', hour: 17.6, icon: '🌇' },
  { label: 'Twilight', hour: 19.3, icon: '🌆' },
  { label: 'Moonlight', hour: 22.8, icon: '🌙' },
];

export const WEATHER_OPTIONS: { id: WeatherKind; label: string; desc: string }[] = [
  { id: 'clear', label: 'Clear Breeze', desc: 'Crisp storybook sunshine & gentle winds' },
  { id: 'mist', label: 'Valley Mist', desc: 'Soft morning haze curling through moats' },
  { id: 'rain', label: 'Soft Rain', desc: 'Shimmering rainfall & glowing castle windows' },
  { id: 'autumn', label: 'Autumn Drift', desc: 'Drifting amber leaves across the courtyard' },
  { id: 'snow', label: 'Winter Frost', desc: 'Snow-dusted roofs, meadows & falling flakes' },
];
