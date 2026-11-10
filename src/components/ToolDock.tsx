import React from 'react';
import {
  BrickWall,
  Castle,
  Check,
  Eraser,
  Footprints,
  Landmark,
  MousePointer,
  Mountain,
  Route,
  Sparkles,
  Trees,
  Waves,
  X,
} from 'lucide-react';
import { TOOL_LIST } from '../constants/catalog';
import { ActiveTool } from '../types/castle';

interface ToolDockProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  hoverHint: string | null;
  wallChainCount: number;
  onFinishWallChain: () => void;
  onCancelDraft: () => void;
}

const TOOL_ICONS: Record<ActiveTool, React.ReactNode> = {
  select: <MousePointer className="h-4 w-4" />,
  terrain: <Mountain className="h-4 w-4" />,
  water: <Waves className="h-4 w-4" />,
  path: <Route className="h-4 w-4" />,
  wall: <BrickWall className="h-4 w-4" />,
  tower: <Castle className="h-4 w-4" />,
  building: <Landmark className="h-4 w-4" />,
  bridge: <Footprints className="h-4 w-4" />,
  attach: <Sparkles className="h-4 w-4" />,
  flora: <Trees className="h-4 w-4" />,
  prop: <Landmark className="h-4 w-4" />,
  erase: <Eraser className="h-4 w-4" />,
};

export const ToolDock: React.FC<ToolDockProps> = ({
  activeTool,
  onSelectTool,
  hoverHint,
  wallChainCount,
  onFinishWallChain,
  onCancelDraft,
}) => {
  return (
    <div className="pointer-events-none fixed bottom-3 left-0 right-0 z-30 flex flex-col items-center gap-2 px-3">
      {/* Contextual Hint or Wall Chain Finish Pill */}
      {(wallChainCount > 0 || hoverHint) && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/20 bg-slate-950/80 px-3.5 py-1.5 text-xs text-slate-200 shadow-lg backdrop-blur-md">
          {wallChainCount > 0 ? (
            <>
              <span className="text-amber-300 font-medium">
                Wall Chain: {wallChainCount} {wallChainCount === 1 ? 'point' : 'points'}
              </span>
              {wallChainCount >= 2 && (
                <button
                  onClick={onFinishWallChain}
                  className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Finish (Enter)
                </button>
              )}
              <button
                onClick={onCancelDraft}
                className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Esc
              </button>
            </>
          ) : (
            <span className="text-slate-300">{hoverHint}</span>
          )}
        </div>
      )}

      {/* Main Tool Dock */}
      <nav
        aria-label="Castle Builder Tools"
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/12 bg-slate-950/82 p-1.5 shadow-2xl backdrop-blur-md"
      >
        {TOOL_LIST.map((tool) => {
          const active = activeTool === tool.id;
          const isDanger = tool.id === 'erase';
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} (${tool.hotkey}) — ${tool.shortDesc}`}
              className={`group relative flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 transition cursor-pointer shrink-0 ${
                active
                  ? isDanger
                    ? 'bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/50'
                    : 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60 shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <span className="mb-0.5">{TOOL_ICONS[tool.id]}</span>
              <span className="text-[10px] font-medium leading-tight tracking-wide">{tool.label}</span>
              <span className="absolute top-0.5 right-1 text-[8px] font-mono opacity-40 group-hover:opacity-80">
                {tool.hotkey}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Subtle Controls Legend */}
      <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-300/65 bg-slate-950/45 px-3 py-0.5 rounded-full backdrop-blur-sm">
        <span>Left Click/Drag: Build &amp; Sculpt</span>
        <span>•</span>
        <span>Right Drag: Orbit</span>
        <span>•</span>
        <span>Middle Drag / WASD: Pan</span>
        <span>•</span>
        <span>Scroll: Zoom</span>
        <span>•</span>
        <span>Q/E: Rotate</span>
      </div>
    </div>
  );
};
