import React from 'react';
import { Copy, DoorOpen, Trash2, X } from 'lucide-react';
import {
  BUILDING_ROOF_STYLES,
  TOWER_ROOF_STYLES,
  TOWER_SHAPES,
  WALL_TOP_STYLES,
} from '../constants/catalog';
import { ROOF_PALETTES, STONE_PALETTES } from '../constants/palettes';
import {
  BuildingEntity,
  CastleWorldState,
  RoofColor,
  SelectionRef,
  StoneStyle,
  TowerEntity,
  WallEntity,
} from '../types/castle';
import { SliderRow, ToggleChip } from './ToolOptionsPanel';

interface InspectorPanelProps {
  world: CastleWorldState;
  selection: SelectionRef;
  onUpdateWorld: (next: CastleWorldState) => void;
  onDelete: (sel: SelectionRef) => void;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  world,
  selection,
  onUpdateWorld,
  onDelete,
  onClose,
}) => {
  const cloneAndMutate = (mutator: (draft: CastleWorldState) => void) => {
    const next = JSON.parse(JSON.stringify(world)) as CastleWorldState;
    mutator(next);
    onUpdateWorld(next);
  };

  if (selection.kind === 'tower') {
    const tower = world.towers.find((t) => t.id === selection.id);
    if (!tower) return null;
    const patch = (partial: Partial<TowerEntity>) =>
      cloneAndMutate((d) => {
        const target = d.towers.find((t) => t.id === selection.id);
        if (target) Object.assign(target, partial);
      });

    return (
      <InspectorShell title="Inspect Tower" onClose={onClose} onDelete={() => onDelete(selection)}>
        <div className="grid grid-cols-3 gap-1">
          {TOWER_SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => patch({ shape: s.id })}
              className={`rounded-lg px-2 py-1 text-[11px] cursor-pointer ${
                tower.shape === s.id
                  ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                  : 'bg-slate-900/80 text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <SliderRow label="Radius" value={tower.radius} min={1.1} max={5.2} step={0.1} suffix="m" onChange={(v) => patch({ radius: v })} />
        <SliderRow label="Height" value={tower.height} min={2.5} max={18} step={0.3} suffix="m" onChange={(v) => patch({ height: v })} />
        <SliderRow label="Ivy" value={tower.ivyAmount} min={0} max={1} step={0.05} onChange={(v) => patch({ ivyAmount: v })} />
        <div>
          <label className="mb-1 block text-[11px] text-slate-300">Roof Style</label>
          <div className="grid grid-cols-2 gap-1">
            {TOWER_ROOF_STYLES.map((r) => (
              <button
                key={r.id}
                onClick={() => patch({ roofStyle: r.id })}
                className={`rounded-lg px-2 py-1 text-left text-[11px] cursor-pointer ${
                  tower.roofStyle === r.id
                    ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                    : 'bg-slate-900/80 text-slate-400'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
            <span>Machicolation</span>
            <ToggleChip checked={tower.hasMachicolations} onToggle={() => patch({ hasMachicolations: !tower.hasMachicolations })} />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
            <span>Half-Timber</span>
            <ToggleChip checked={tower.hasHalfTimberTop} onToggle={() => patch({ hasHalfTimberTop: !tower.hasHalfTimberTop })} />
          </label>
        </div>
        <StonePaletteRow value={tower.stoneStyle} onChange={(stoneStyle) => patch({ stoneStyle })} />
        <RoofPaletteRow value={tower.roofColor} onChange={(roofColor) => patch({ roofColor })} />
        <button
          onClick={() =>
            cloneAndMutate((d) => {
              d.towers.push({
                ...tower,
                id: `tower-${Date.now().toString(36)}`,
                x: tower.x + tower.radius * 1.9,
              });
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate Adjacent
        </button>
      </InspectorShell>
    );
  }

  if (selection.kind === 'wall') {
    const wall = world.walls.find((w) => w.id === selection.id);
    if (!wall) return null;
    const patch = (partial: Partial<WallEntity>) =>
      cloneAndMutate((d) => {
        const target = d.walls.find((w) => w.id === selection.id);
        if (target) Object.assign(target, partial);
      });

    const segCount = Math.max(0, wall.points.length - 1);

    return (
      <InspectorShell title="Inspect Curtain Wall" onClose={onClose} onDelete={() => onDelete(selection)}>
        <SliderRow label="Height" value={wall.height} min={2.0} max={10} step={0.2} suffix="m" onChange={(v) => patch({ height: v })} />
        <SliderRow label="Thickness" value={wall.thickness} min={0.65} max={2.4} step={0.05} suffix="m" onChange={(v) => patch({ thickness: v })} />
        <SliderRow label="Ivy Overgrowth" value={wall.ivyAmount} min={0} max={1} step={0.05} onChange={(v) => patch({ ivyAmount: v })} />
        <div>
          <label className="mb-1 block text-[11px] text-slate-300">Parapet Style</label>
          <div className="grid grid-cols-2 gap-1">
            {WALL_TOP_STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => patch({ topStyle: st.id })}
                className={`rounded-lg px-2 py-1 text-left text-[11px] cursor-pointer ${
                  wall.topStyle === st.id
                    ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                    : 'bg-slate-900/80 text-slate-400'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Corner Turrets</span>
          <ToggleChip checked={wall.cornerTurrets} onToggle={() => patch({ cornerTurrets: !wall.cornerTurrets })} />
        </div>
        {segCount > 0 && (
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] text-slate-300">
              <DoorOpen className="h-3.5 w-3.5 text-amber-400" /> Force Gatehouse Archways
            </label>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: segCount }).map((_, idx) => {
                const active = wall.forcedGates.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const next = active
                        ? wall.forcedGates.filter((g) => g !== idx)
                        : [...wall.forcedGates, idx];
                      patch({ forcedGates: next });
                    }}
                    className={`rounded-md px-2 py-0.5 text-[10px] cursor-pointer ${
                      active ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Seg #{idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <StonePaletteRow value={wall.stoneStyle} onChange={(stoneStyle) => patch({ stoneStyle })} />
      </InspectorShell>
    );
  }

  if (selection.kind === 'building') {
    const b = world.buildings.find((x) => x.id === selection.id);
    if (!b) return null;
    const patch = (partial: Partial<BuildingEntity>) =>
      cloneAndMutate((d) => {
        const target = d.buildings.find((x) => x.id === selection.id);
        if (target) Object.assign(target, partial);
      });

    return (
      <InspectorShell title={`Inspect ${b.kind}`} onClose={onClose} onDelete={() => onDelete(selection)}>
        <SliderRow label="Width" value={b.width} min={3} max={14} step={0.2} suffix="m" onChange={(v) => patch({ width: v })} />
        <SliderRow label="Depth" value={b.depth} min={3} max={13} step={0.2} suffix="m" onChange={(v) => patch({ depth: v })} />
        <SliderRow label="Height" value={b.height} min={2.5} max={14} step={0.2} suffix="m" onChange={(v) => patch({ height: v })} />
        <SliderRow
          label="Rotation"
          value={Math.round((b.rotation * 180) / Math.PI)}
          min={-180}
          max={180}
          step={5}
          suffix="°"
          onChange={(deg) => patch({ rotation: (deg * Math.PI) / 180 })}
        />
        <div>
          <label className="mb-1 block text-[11px] text-slate-300">Roof Form</label>
          <div className="grid grid-cols-2 gap-1">
            {BUILDING_ROOF_STYLES.map((r) => (
              <button
                key={r.id}
                onClick={() => patch({ roofStyle: r.id })}
                className={`rounded-lg px-2 py-1 text-left text-[11px] cursor-pointer ${
                  b.roofStyle === r.id
                    ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60'
                    : 'bg-slate-900/80 text-slate-400'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
            <span>Half-Timber</span>
            <ToggleChip checked={b.halfTimberUpper} onToggle={() => patch({ halfTimberUpper: !b.halfTimberUpper })} />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2 py-1.5">
            <span>Chimney</span>
            <ToggleChip checked={b.hasChimney} onToggle={() => patch({ hasChimney: !b.hasChimney })} />
          </label>
        </div>
        <StonePaletteRow value={b.stoneStyle} onChange={(stoneStyle) => patch({ stoneStyle })} />
        <RoofPaletteRow value={b.roofColor} onChange={(roofColor) => patch({ roofColor })} />
      </InspectorShell>
    );
  }

  return (
    <InspectorShell title={`Selected ${selection.kind}`} onClose={onClose} onDelete={() => onDelete(selection)}>
      <p className="text-slate-400 leading-relaxed">
        This {selection.kind} can be demolished or restyled by deleting and placing a fresh variant.
      </p>
    </InspectorShell>
  );
};

const InspectorShell: React.FC<{
  title: string;
  onClose: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, onDelete, children }) => (
  <aside className="pointer-events-auto fixed top-20 right-3 z-20 flex max-h-[calc(100vh-11.5rem)] w-72 flex-col rounded-2xl border border-amber-300/25 bg-slate-950/84 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
    <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
      <span className="font-display text-sm font-semibold capitalize text-amber-200">{title}</span>
      <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 cursor-pointer">
        <X className="h-4 w-4" />
      </button>
    </div>
    <div className="space-y-3 overflow-y-auto p-3.5">{children}</div>
    <div className="border-t border-slate-800 p-2.5">
      <button
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 py-1.5 font-medium text-rose-200 hover:bg-rose-500/35 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" /> Demolish Piece
      </button>
    </div>
  </aside>
);

const StonePaletteRow: React.FC<{ value: StoneStyle; onChange: (v: StoneStyle) => void }> = ({ value, onChange }) => (
  <div>
    <label className="mb-1 block text-[11px] text-slate-300">Masonry</label>
    <div className="flex items-center gap-1.5">
      {(Object.keys(STONE_PALETTES) as StoneStyle[]).map((st) => (
        <button
          key={st}
          onClick={() => onChange(st)}
          title={STONE_PALETTES[st].label}
          className={`h-6 w-6 rounded-full border-2 cursor-pointer ${
            value === st ? 'scale-110 border-amber-300' : 'border-slate-700'
          }`}
          style={{ backgroundColor: STONE_PALETTES[st].swatch }}
        />
      ))}
    </div>
  </div>
);

const RoofPaletteRow: React.FC<{ value: RoofColor; onChange: (v: RoofColor) => void }> = ({ value, onChange }) => (
  <div>
    <label className="mb-1 block text-[11px] text-slate-300">Roof Shingles</label>
    <div className="flex items-center gap-1.5">
      {(Object.keys(ROOF_PALETTES) as RoofColor[]).map((rc) => (
        <button
          key={rc}
          onClick={() => onChange(rc)}
          title={ROOF_PALETTES[rc].label}
          className={`h-6 w-6 rounded-full border-2 cursor-pointer ${
            value === rc ? 'scale-110 border-amber-300' : 'border-slate-700'
          }`}
          style={{ backgroundColor: ROOF_PALETTES[rc].swatch }}
        />
      ))}
    </div>
  </div>
);
