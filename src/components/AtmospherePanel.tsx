import React, { useState } from 'react';
import {
  Bird,
  Camera,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Download,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { TIME_PRESETS, WEATHER_OPTIONS } from '../constants/palettes';
import { AtmosphereState } from '../types/castle';
import { SliderRow, ToggleChip } from './ToolOptionsPanel';

interface AtmospherePanelProps {
  atmosphere: AtmosphereState;
  onChange: (next: AtmosphereState) => void;
  onCameraPreset: (preset: 'iso' | 'hero' | 'top' | 'reset') => void;
  onScreenshot: () => void;
}

export const AtmospherePanel: React.FC<AtmospherePanelProps> = ({
  atmosphere,
  onChange,
  onCameraPreset,
  onScreenshot,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const set = <K extends keyof AtmosphereState>(k: K, v: AtmosphereState[K]) => {
    onChange({ ...atmosphere, [k]: v });
  };

  const formatHour = (h: number) => {
    const hrs = Math.floor(h) % 24;
    const mins = Math.round((h - Math.floor(h)) * 60) % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="pointer-events-auto fixed top-20 right-3 z-20 flex max-h-[calc(100vh-11.5rem)] w-68 flex-col rounded-2xl border border-slate-200/12 bg-slate-950/78 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-900/60 rounded-t-2xl cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-display text-sm font-semibold text-amber-200">Sky &amp; Lens</span>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
      </button>

      {!collapsed && (
        <div className="space-y-3 overflow-y-auto px-3.5 pb-3.5 pt-1">
          {/* Time of Day */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Sun &amp; Moon Time</span>
              <span className="font-mono text-amber-200">{formatHour(atmosphere.timeOfDay)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              step={0.1}
              value={atmosphere.timeOfDay}
              onChange={(e) => set('timeOfDay', parseFloat(e.target.value))}
              className="h-1.5 w-full rounded-lg bg-slate-800"
            />
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {TIME_PRESETS.map((tp) => (
                <button
                  key={tp.label}
                  onClick={() => set('timeOfDay', tp.hour)}
                  className="rounded-lg bg-slate-900/85 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-amber-200 cursor-pointer"
                >
                  {tp.icon} {tp.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <SliderRow
            label="Sun Azimuth"
            value={atmosphere.sunAzimuth}
            min={0}
            max={360}
            step={5}
            suffix="°"
            onChange={(v) => set('sunAzimuth', v)}
          />

          {/* Weather */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <CloudRain className="h-3.5 w-3.5 text-sky-300" /> Weather Mood
            </label>
            <div className="grid grid-cols-2 gap-1">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => set('weather', w.id)}
                  title={w.desc}
                  className={`rounded-lg px-2 py-1.5 text-left text-[11px] transition cursor-pointer ${
                    atmosphere.weather === w.id
                      ? 'bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/50'
                      : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diorama Lens & Bloom */}
          <SliderRow
            label="Lens FOV (Miniature)"
            value={atmosphere.fov}
            min={20}
            max={62}
            step={1}
            suffix="°"
            onChange={(v) => set('fov', v)}
          />
          <SliderRow
            label="Lantern Bloom"
            value={atmosphere.bloomStrength}
            min={0}
            max={0.9}
            step={0.05}
            onChange={(v) => set('bloomStrength', v)}
          />

          {/* Toggles */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between rounded-xl bg-slate-900/75 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Bird className="h-3.5 w-3.5 text-emerald-300" /> Doves &amp; Sheep
              </span>
              <ToggleChip
                checked={atmosphere.wildlifeEnabled}
                onToggle={() => set('wildlifeEnabled', !atmosphere.wildlifeEnabled)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/75 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <RefreshCw className="h-3.5 w-3.5 text-amber-300" /> Turntable Orbit
              </span>
              <ToggleChip
                checked={atmosphere.turntable}
                onToggle={() => set('turntable', !atmosphere.turntable)}
              />
            </div>
          </div>

          {/* Camera Views + Screenshot */}
          <div className="border-t border-slate-800 pt-2.5 space-y-2">
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => onCameraPreset('iso')}
                className="rounded-lg bg-slate-900/90 py-1 text-[10px] text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Diorama
              </button>
              <button
                onClick={() => onCameraPreset('hero')}
                className="rounded-lg bg-slate-900/90 py-1 text-[10px] text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Low Hero
              </button>
              <button
                onClick={() => onCameraPreset('top')}
                className="rounded-lg bg-slate-900/90 py-1 text-[10px] text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Plan View
              </button>
            </div>
            <button
              onClick={onScreenshot}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-xs font-semibold text-slate-950 shadow hover:from-amber-400 hover:to-amber-500 cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <Download className="h-3.5 w-3.5" />
              <span>Export PNG Snapshot</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
