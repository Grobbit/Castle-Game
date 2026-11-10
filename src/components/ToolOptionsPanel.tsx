import React, { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import {
  ATTACHMENT_KINDS,
  BRIDGE_KINDS,
  BUILDING_KINDS,
  BUILDING_ROOF_STYLES,
  FLORA_KINDS,
  PROP_KINDS,
  TOOL_LIST,
  TOWER_ROOF_STYLES,
  TOWER_SHAPES,
  WALL_TOP_STYLES,
} from '../constants/catalog';
import {
  HERALDRY_COLORS,
  HERALDRY_EMBLEMS,
  ROOF_PALETTES,
  STONE_PALETTES,
} from '../constants/palettes';
import {
  PathBrushMode,
  RoofColor,
  StoneStyle,
  TerrainBrushMode,
  ToolSettings,
} from '../types/castle';

interface ToolOptionsPanelProps {
  settings: ToolSettings;
  onChange: (next: ToolSettings) => void;
}

export const ToolOptionsPanel: React.FC<ToolOptionsPanelProps> = ({ settings, onChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const toolMeta = TOOL_LIST.find((t) => t.id === settings.activeTool)!;
  const set = <K extends keyof ToolSettings>(key: K, value: ToolSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  if (settings.activeTool === 'select' || settings.activeTool === 'erase') {
    return (
      <aside className="pointer-events-auto fixed top-20 left-3 z-20 w-64 rounded-2xl border border-slate-200/12 bg-slate-950/78 p-3.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold text-amber-200">{toolMeta.label}</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            {toolMeta.hotkey}
          </span>
        </div>
        <p className="mt-1.5 leading-relaxed text-slate-400">{toolMeta.shortDesc}</p>
        {settings.activeTool === 'select' && (
          <p className="mt-2 rounded-xl bg-amber-500/10 p-2 text-[11px] text-amber-200/90">
            Click any tower, wall, keep, bridge, window, or tree to inspect and customize it live. Drag empty space to orbit.
          </p>
        )}
      </aside>
    );
  }

  const showStonePicker = ['wall', 'tower', 'building', 'bridge'].includes(settings.activeTool);
  const showRoofPicker = ['tower', 'building'].includes(settings.activeTool);

  return (
    <aside className="pointer-events-auto fixed top-20 left-3 z-20 flex max-h-[calc(100vh-11.5rem)] w-72 flex-col rounded-2xl border border-slate-200/12 bg-slate-950/80 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-900/60 rounded-t-2xl cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-display text-sm font-semibold text-amber-200">{toolMeta.label} Atelier</span>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
      </button>

      {!collapsed && (
        <div className="space-y-3.5 overflow-y-auto px-3.5 pb-3.5 pt-1">
          <p className="text-[11px] text-slate-400 leading-snug">{toolMeta.shortDesc}</p>

          {/* TERRAIN SCULPTING */}
          {settings.activeTool === 'terrain' && (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Brush Action</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['raise', 'lower', 'level', 'smooth', 'cliff'] as TerrainBrushMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => set('terrainMode', m)}
                      className={`rounded-lg px-2 py-1.5 capitalize transition cursor-pointer ${
                        settings.terrainMode === m
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow
                label="Brush Radius"
                value={settings.brushRadius}
                min={1.5}
                max={12}
                step={0.5}
                suffix="m"
                onChange={(v) => set('brushRadius', v)}
              />
              <SliderRow
                label="Strength"
                value={settings.brushStrength}
                min={0.15}
                max={1.0}
                step={0.05}
                onChange={(v) => set('brushStrength', v)}
              />
              <p className="text-[10px] text-slate-400">Tip: Hold Alt while raising to lower terrain.</p>
            </>
          )}

          {/* WATER MOAT */}
          {settings.activeTool === 'water' && (
            <>
              <SliderRow
                label="Moat Width"
                value={settings.brushRadius}
                min={1.8}
                max={12}
                step={0.5}
                suffix="m"
                onChange={(v) => set('brushRadius', v)}
              />
              <SliderRow
                label="Carve Depth Speed"
                value={settings.brushStrength}
                min={0.15}
                max={1.0}
                step={0.05}
                onChange={(v) => set('brushStrength', v)}
              />
              <p className="rounded-xl bg-sky-500/10 p-2 text-[11px] text-sky-200/90 leading-relaxed">
                Paint to carve below the water table and reveal shimmering moats &amp; ponds. Hold <strong>Alt + Drag</strong> to raise dry land back up.
              </p>
            </>
          )}

          {/* COBBLESTONE PATHS */}
          {settings.activeTool === 'path' && (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Surface Paving</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'cobble', label: 'Cobblestone' },
                      { id: 'flagstone', label: 'Courtyard Stone' },
                      { id: 'dirt', label: 'Dirt Trail' },
                      { id: 'meadow', label: 'Erase to Grass' },
                    ] as { id: PathBrushMode; label: string }[]
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => set('pathMode', p.id)}
                      className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                        settings.pathMode === p.id
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow
                label="Path Width"
                value={settings.brushRadius}
                min={1.5}
                max={10}
                step={0.5}
                suffix="m"
                onChange={(v) => set('brushRadius', v)}
              />
              <p className="rounded-xl bg-amber-500/10 p-2 text-[11px] text-amber-200/90 leading-relaxed">
                Magic detail: painting a path beneath any curtain wall automatically carves an arched portcullis gateway!
              </p>
            </>
          )}

          {/* CURTAIN WALLS */}
          {settings.activeTool === 'wall' && (
            <>
              <SliderRow
                label="Wall Height"
                value={settings.wallHeight}
                min={2.2}
                max={9.5}
                step={0.2}
                suffix="m"
                onChange={(v) => set('wallHeight', v)}
              />
              <SliderRow
                label="Thickness"
                value={settings.wallThickness}
                min={0.7}
                max={2.2}
                step={0.05}
                suffix="m"
                onChange={(v) => set('wallThickness', v)}
              />
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Parapet Crown</label>
                <div className="grid grid-cols-2 gap-1">
                  {WALL_TOP_STYLES.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => set('wallTopStyle', w.id)}
                      className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                        settings.wallTopStyle === w.id
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Corner Bartizan Turrets</span>
                <ToggleChip
                  checked={settings.wallCornerTurrets}
                  onToggle={() => set('wallCornerTurrets', !settings.wallCornerTurrets)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">15° Angle Snapping</span>
                <ToggleChip
                  checked={settings.snapAngles}
                  onToggle={() => set('snapAngles', !settings.snapAngles)}
                />
              </div>
              <SliderRow
                label="Climbing Ivy"
                value={settings.wallIvy}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set('wallIvy', v)}
              />
            </>
          )}

          {/* TOWERS */}
          {settings.activeTool === 'tower' && (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Tower Profile</label>
                <div className="grid grid-cols-3 gap-1">
                  {TOWER_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => set('towerShape', s.id)}
                      className={`rounded-lg px-2 py-1.5 transition cursor-pointer ${
                        settings.towerShape === s.id
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow
                label="Radius"
                value={settings.towerRadius}
                min={1.1}
                max={5.0}
                step={0.1}
                suffix="m"
                onChange={(v) => set('towerRadius', v)}
              />
              <SliderRow
                label="Height"
                value={settings.towerHeight}
                min={3.0}
                max={17.0}
                step={0.3}
                suffix="m"
                onChange={(v) => set('towerHeight', v)}
              />
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Roof Architecture</label>
                <div className="grid grid-cols-2 gap-1">
                  {TOWER_ROOF_STYLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => set('towerRoofStyle', r.id)}
                      className={`rounded-lg px-2 py-1 text-left transition cursor-pointer ${
                        settings.towerRoofStyle === r.id
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow
                label="Roof Spire Pitch"
                value={settings.towerRoofPitch}
                min={0.75}
                max={1.8}
                step={0.05}
                onChange={(v) => set('towerRoofPitch', v)}
              />
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
                  <span>Machicolations</span>
                  <ToggleChip
                    checked={settings.towerMachicolations}
                    onToggle={() => set('towerMachicolations', !settings.towerMachicolations)}
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
                  <span>Half-Timber</span>
                  <ToggleChip
                    checked={settings.towerHalfTimber}
                    onToggle={() => set('towerHalfTimber', !settings.towerHalfTimber)}
                  />
                </label>
              </div>
              <SliderRow
                label="Ivy Overgrowth"
                value={settings.towerIvy}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set('towerIvy', v)}
              />
            </>
          )}

          {/* KEEPS & HALLS */}
          {settings.activeTool === 'building' && (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Building Archetype</label>
                <div className="grid grid-cols-2 gap-1">
                  {BUILDING_KINDS.map((bk) => (
                    <button
                      key={bk.id}
                      onClick={() =>
                        onChange({
                          ...settings,
                          buildingKind: bk.id,
                          buildingWidth: bk.w,
                          buildingDepth: bk.d,
                          buildingHeight: bk.h,
                          buildingFloors: bk.floors,
                          buildingRoofStyle:
                            bk.id === 'chapel'
                              ? 'chapel_spire'
                              : bk.id === 'keep'
                                ? 'crenellated'
                                : bk.id === 'hall'
                                  ? 'stepped_gable'
                                  : 'hip',
                          buildingHalfTimber: bk.id === 'hall',
                        })
                      }
                      className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                        settings.buildingKind === bk.id
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {bk.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SliderRow
                  label="Width"
                  value={settings.buildingWidth}
                  min={3}
                  max={13}
                  step={0.2}
                  suffix="m"
                  onChange={(v) => set('buildingWidth', v)}
                />
                <SliderRow
                  label="Depth"
                  value={settings.buildingDepth}
                  min={3}
                  max={12}
                  step={0.2}
                  suffix="m"
                  onChange={(v) => set('buildingDepth', v)}
                />
              </div>
              <SliderRow
                label="Wall Height"
                value={settings.buildingHeight}
                min={2.8}
                max={13}
                step={0.2}
                suffix="m"
                onChange={(v) => set('buildingHeight', v)}
              />
              <SliderRow
                label="Rotation (Q/E)"
                value={Math.round((settings.buildingRotation * 180) / Math.PI)}
                min={0}
                max={360}
                step={5}
                suffix="°"
                onChange={(deg) => set('buildingRotation', (deg * Math.PI) / 180)}
              />
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Roof Form</label>
                <div className="grid grid-cols-2 gap-1">
                  {BUILDING_ROOF_STYLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => set('buildingRoofStyle', r.id)}
                      className={`rounded-lg px-2 py-1 text-left transition cursor-pointer ${
                        settings.buildingRoofStyle === r.id
                          ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
                  <span>Half-Timber</span>
                  <ToggleChip
                    checked={settings.buildingHalfTimber}
                    onToggle={() => set('buildingHalfTimber', !settings.buildingHalfTimber)}
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
                  <span>Chimney</span>
                  <ToggleChip
                    checked={settings.buildingChimney}
                    onToggle={() => set('buildingChimney', !settings.buildingChimney)}
                  />
                </label>
              </div>
            </>
          )}

          {/* BRIDGES & STAIRS */}
          {settings.activeTool === 'bridge' && (
            <>
              <div className="grid grid-cols-2 gap-1">
                {BRIDGE_KINDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => set('bridgeKind', b.id)}
                    className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                      settings.bridgeKind === b.id
                        ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <SliderRow
                label="Span Width"
                value={settings.bridgeWidth}
                min={1.4}
                max={4.2}
                step={0.2}
                suffix="m"
                onChange={(v) => set('bridgeWidth', v)}
              />
              {settings.bridgeKind !== 'stone_stairs' && (
                <SliderRow
                  label="Arch Rise"
                  value={settings.bridgeArchHeight}
                  min={0.2}
                  max={2.8}
                  step={0.1}
                  suffix="m"
                  onChange={(v) => set('bridgeArchHeight', v)}
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Bridge Lanterns</span>
                <ToggleChip
                  checked={settings.bridgeLanterns}
                  onToggle={() => set('bridgeLanterns', !settings.bridgeLanterns)}
                />
              </div>
            </>
          )}

          {/* SURFACE ARCHITECTURAL DETAILS */}
          {settings.activeTool === 'attach' && (
            <>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-1">
                {ATTACHMENT_KINDS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => set('attachmentKind', a.id)}
                    className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                      settings.attachmentKind === a.id
                        ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <SliderRow
                label="Detail Scale"
                value={settings.attachmentScale}
                min={0.6}
                max={1.8}
                step={0.05}
                onChange={(v) => set('attachmentScale', v)}
              />
              {settings.attachmentKind === 'banner' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Banner Emblem</label>
                    <div className="grid grid-cols-3 gap-1">
                      {HERALDRY_EMBLEMS.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => set('emblem', e.id)}
                          className={`rounded-lg px-1.5 py-1 text-[10px] cursor-pointer ${
                            settings.emblem === e.id
                              ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                              : 'bg-slate-900/80 text-slate-400'
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* FLORA */}
          {settings.activeTool === 'flora' && (
            <>
              <div className="grid grid-cols-2 gap-1">
                {FLORA_KINDS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => set('floraKind', f.id)}
                    className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                      settings.floraKind === f.id
                        ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/60'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <SliderRow
                label="Tree / Plant Scale"
                value={settings.floraScale}
                min={0.6}
                max={1.8}
                step={0.05}
                onChange={(v) => set('floraScale', v)}
              />
            </>
          )}

          {/* COURTYARD PROPS */}
          {settings.activeTool === 'prop' && (
            <>
              <div className="grid grid-cols-2 gap-1">
                {PROP_KINDS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => set('propKind', p.id)}
                    className={`rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                      settings.propKind === p.id
                        ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <SliderRow
                label="Scale"
                value={settings.propScale}
                min={0.65}
                max={1.6}
                step={0.05}
                onChange={(v) => set('propScale', v)}
              />
              <SliderRow
                label="Rotation (Q/E)"
                value={Math.round((settings.propRotation * 180) / Math.PI)}
                min={0}
                max={360}
                step={10}
                suffix="°"
                onChange={(deg) => set('propRotation', (deg * Math.PI) / 180)}
              />
            </>
          )}

          {/* SHARED STONE MASONRY PALETTE */}
          {showStonePicker && (
            <div className="border-t border-slate-800 pt-2.5">
              <label className="mb-1.5 block text-[11px] font-medium text-slate-300">
                Masonry: {STONE_PALETTES[settings.stoneStyle].label}
              </label>
              <div className="flex items-center gap-1.5">
                {(Object.keys(STONE_PALETTES) as StoneStyle[]).map((st) => {
                  const def = STONE_PALETTES[st];
                  return (
                    <button
                      key={st}
                      onClick={() => set('stoneStyle', st)}
                      title={def.label}
                      className={`h-6 w-6 rounded-full border-2 transition cursor-pointer ${
                        settings.stoneStyle === st
                          ? 'scale-110 border-amber-300 ring-2 ring-amber-400/40'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: def.swatch }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* SHARED ROOF COLOR PALETTE */}
          {showRoofPicker && (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-300">
                Roof Tile: {ROOF_PALETTES[settings.roofColor].label}
              </label>
              <div className="flex items-center gap-1.5">
                {(Object.keys(ROOF_PALETTES) as RoofColor[]).map((rc) => {
                  const def = ROOF_PALETTES[rc];
                  return (
                    <button
                      key={rc}
                      onClick={() => set('roofColor', rc)}
                      title={def.label}
                      className={`h-6 w-6 rounded-full border-2 transition cursor-pointer ${
                        settings.roofColor === rc
                          ? 'scale-110 border-amber-300 ring-2 ring-amber-400/40'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: def.swatch }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* SHARED HERALDRY COLOR */}
          {(settings.activeTool === 'tower' ||
            settings.activeTool === 'attach' ||
            settings.activeTool === 'prop') && (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-300">Heraldry Tint</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {HERALDRY_COLORS.map((hc) => (
                  <button
                    key={hc.hex}
                    onClick={() => set('heraldryColor', hc.hex)}
                    title={hc.label}
                    className={`h-5 w-5 rounded-full border-2 transition cursor-pointer ${
                      settings.heraldryColor === hc.hex ? 'scale-110 border-white' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: hc.hex }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step, suffix = '', onChange }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-[11px]">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono text-amber-200">
        {Number.isInteger(step) ? value : value.toFixed(1)}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1.5 w-full rounded-lg bg-slate-800"
    />
  </div>
);

export const ToggleChip: React.FC<{ checked: boolean; onToggle: () => void }> = ({ checked, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`h-5 w-9 rounded-full p-0.5 transition cursor-pointer ${
      checked ? 'bg-amber-500' : 'bg-slate-700'
    }`}
  >
    <div
      className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);
