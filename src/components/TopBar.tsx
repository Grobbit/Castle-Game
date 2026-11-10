import React from 'react';
import {
  Camera,
  Castle,
  FolderOpen,
  HelpCircle,
  Redo2,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TopBarProps {
  castleName: string;
  onRename: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenPresets: () => void;
  onTogglePhotoMode: () => void;
  onOpenGuide: () => void;
  onResetCamera: () => void;
  stats: { walls: number; towers: number; buildings: number };
}

export const TopBar: React.FC<TopBarProps> = ({
  castleName,
  onRename,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  soundEnabled,
  onToggleSound,
  onOpenPresets,
  onTogglePhotoMode,
  onOpenGuide,
  onResetCamera,
  stats,
}) => {
  return (
    <header className="pointer-events-none fixed top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2">
      {/* Left Brand + Castle Title */}
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-amber-200/15 bg-slate-950/75 px-3.5 py-2 shadow-xl backdrop-blur-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-inner">
          <Castle className="h-4.5 w-4.5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-bold tracking-[0.18em] text-amber-300/90 uppercase">
              Castellum
            </span>
            <span className="text-[10px] text-slate-400">
              {stats.towers}T · {stats.walls}W · {stats.buildings}K
            </span>
          </div>
          <input
            type="text"
            value={castleName}
            onChange={(e) => onRename(e.target.value)}
            aria-label="Castle Name"
            className="w-44 bg-transparent font-display text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:text-amber-200"
            placeholder="Name your fortress..."
          />
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-200/10 bg-slate-950/75 p-1.5 shadow-xl backdrop-blur-md">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/25 cursor-pointer"
          title="Dioramas, Save Slots & Blueprints"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Dioramas & Saves</span>
        </button>

        <div className="mx-0.5 h-5 w-px bg-slate-700/70" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-xl p-1.5 text-slate-200 transition hover:bg-slate-800/80 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-xl p-1.5 text-slate-200 transition hover:bg-slate-800/80 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-slate-700/70" />

        <button
          onClick={onResetCamera}
          className="rounded-xl p-1.5 text-slate-300 transition hover:bg-slate-800/80 hover:text-amber-200 cursor-pointer"
          title="Reset Camera View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={onToggleSound}
          className={`rounded-xl p-1.5 transition cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
          title={soundEnabled ? 'Mute Ambient Sound & Foley' : 'Enable Ambient Sound & Foley'}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <button
          onClick={onTogglePhotoMode}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-amber-200 cursor-pointer"
          title="Hide HUD for Photo Mode (H)"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Photo Mode</span>
        </button>

        <button
          onClick={onOpenGuide}
          className="rounded-xl p-1.5 text-slate-300 transition hover:bg-slate-800/80 hover:text-amber-200 cursor-pointer"
          title="Builder Guide & Shortcuts (?)"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
