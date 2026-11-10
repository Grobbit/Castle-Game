import React from 'react';
import { BookOpen, Sparkles, X } from 'lucide-react';

export const GuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-200/20 bg-slate-900/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-amber-100">Royal Architect&apos;s Field Guide</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6 text-xs text-slate-300 leading-relaxed">
          <section className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-amber-200">
              <Sparkles className="h-4 w-4" /> Living Architectural Interactions
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-amber-100/90">
              <li>
                <strong>Auto-Carved Gatehouses:</strong> Paint a Cobblestone or Courtyard Path directly under any Curtain Wall to automatically open a vaulted stone portcullis archway.
              </li>
              <li>
                <strong>Vertical Tower Stacking:</strong> Aim the Tower tool onto the roof of an existing Keep or Tower to stack fairytale spire turrets upward.
              </li>
              <li>
                <strong>Terrain-Aware Foundations:</strong> Place keeps, walls, or bridges on steep cliffs or deep moats — masonry plinths and bridge piers automatically plunge down into rock or water.
              </li>
              <li>
                <strong>Surface-Snapped Details:</strong> Select the Details tool and hover any stone wall, curved tower, or timbered hall to snap gothic windows, rose windows, fluttering banners, balconies, and lanterns flush to the facade.
              </li>
              <li>
                <strong>Night Candlelight:</strong> Drag the Time slider past Sunset to watch every castle window and lantern bloom with warm candlelight while fireflies emerge over the water.
              </li>
            </ul>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="mb-2 font-display text-sm font-semibold text-slate-100">Camera &amp; Mouse</h4>
              <ul className="space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Left Click / Drag:</strong> Place, sculpt, or inspect</li>
                <li><strong className="text-slate-200">Right Drag:</strong> Smooth orbital rotation</li>
                <li><strong className="text-slate-200">Middle Drag / WASD:</strong> Pan across valley</li>
                <li><strong className="text-slate-200">Scroll Wheel:</strong> Zoom in &amp; out</li>
                <li><strong className="text-slate-200">Alt + Sculpt:</strong> Invert brush (lower / drain moat)</li>
                <li><strong className="text-slate-200">Shift + Wall Draw:</strong> Disable 15° angle snap</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="mb-2 font-display text-sm font-semibold text-slate-100">Keyboard Shortcuts</h4>
              <ul className="space-y-1 text-slate-400">
                <li><strong className="text-slate-200">1 – 0, P, X:</strong> Switch tools instantly</li>
                <li><strong className="text-slate-200">Q / E:</strong> Rotate keeps &amp; props</li>
                <li><strong className="text-slate-200">[ / ]:</strong> Decrease / increase brush size</li>
                <li><strong className="text-slate-200">Enter / Double-Click:</strong> Finish wall chain</li>
                <li><strong className="text-slate-200">Esc:</strong> Cancel active draft</li>
                <li><strong className="text-slate-200">Ctrl+Z / Ctrl+Y:</strong> Undo / Redo</li>
                <li><strong className="text-slate-200">H:</strong> Toggle Photo Mode</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
