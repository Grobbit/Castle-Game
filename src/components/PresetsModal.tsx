import React, { useRef, useState } from 'react';
import { Castle, Download, FolderPlus, Save, Trash2, Upload, X } from 'lucide-react';
import { DIORAMA_PRESETS } from '../presets/dioramas';
import { loadSavedSlots, persistSavedSlots, SavedCastleSlot } from '../state/useCastleStore';
import { CastleWorldState } from '../types/castle';

interface PresetsModalProps {
  currentWorld: CastleWorldState;
  onLoadWorld: (world: CastleWorldState) => void;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  currentWorld,
  onLoadWorld,
  onClose,
}) => {
  const [slots, setSlots] = useState<SavedCastleSlot[]>(() => loadSavedSlots());
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSlot = () => {
    const newSlot: SavedCastleSlot = {
      id: `slot-${Date.now().toString(36)}`,
      name: currentWorld.name || 'Untitled Castle',
      updatedAt: new Date().toLocaleString(),
      stats: {
        walls: currentWorld.walls.length,
        towers: currentWorld.towers.length,
        buildings: currentWorld.buildings.length,
        flora: currentWorld.flora.length,
      },
      world: JSON.parse(JSON.stringify(currentWorld)) as CastleWorldState,
    };
    const next = [newSlot, ...slots].slice(0, 12);
    setSlots(next);
    persistSavedSlots(next);
  };

  const handleDeleteSlot = (id: string) => {
    const next = slots.filter((s) => s.id !== id);
    setSlots(next);
    persistSavedSlots(next);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(currentWorld, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (currentWorld.name || 'castle').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeName}.castle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CastleWorldState;
      if (!parsed.terrain || !Array.isArray(parsed.terrain.heights)) {
        throw new Error('Invalid castle blueprint format');
      }
      setImportError(null);
      onLoadWorld(parsed);
      onClose();
    } catch {
      setImportError('Could not load file — please select a valid .castle.json blueprint.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-200/20 bg-slate-900/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Castle className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-amber-100">Dioramas, Saves &amp; Blueprints</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          {/* Save & Blueprint Actions */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
            <button
              onClick={handleSaveSlot}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" /> Save Current Castle
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export .castle.json
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" /> Import Blueprint
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
            {importError && <span className="text-xs text-rose-400">{importError}</span>}
          </div>

          {/* Curated Starter Dioramas */}
          <div>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-amber-300/90">
              Curated Starter Dioramas
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DIORAMA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadWorld(preset.build());
                    onClose();
                  }}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-amber-400/50 hover:bg-slate-800/70 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-semibold text-slate-100 group-hover:text-amber-200">
                        {preset.title}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{preset.subtitle}</p>
                  </div>
                  <div className="mt-3 text-[11px] font-medium text-amber-400/80 group-hover:text-amber-300">
                    Load Diorama →
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Castles */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">
              <FolderPlus className="h-4 w-4 text-amber-400" /> Browser Save Slots ({slots.length})
            </h3>
            {slots.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                No manual saves yet — your latest castle is also automatically preserved in autosave.
              </p>
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <div>
                      <div className="font-display text-sm font-semibold text-slate-100">{slot.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {slot.updatedAt} · {slot.stats.towers} Towers · {slot.stats.walls} Walls · {slot.stats.buildings} Keeps
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onLoadWorld(slot.world);
                          onClose();
                        }}
                        className="rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/35 cursor-pointer"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
                        title="Delete save"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
