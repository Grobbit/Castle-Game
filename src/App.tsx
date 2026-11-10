import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, Eye, RefreshCw } from 'lucide-react';
import { soundscape } from './audio/soundscape';
import { AtmospherePanel } from './components/AtmospherePanel';
import { GuideModal } from './components/GuideModal';
import { InspectorPanel } from './components/InspectorPanel';
import { PresetsModal } from './components/PresetsModal';
import { ToolDock } from './components/ToolDock';
import { ToolOptionsPanel } from './components/ToolOptionsPanel';
import { TopBar } from './components/TopBar';
import { DEFAULT_TOOL_SETTINGS, TOOL_LIST } from './constants/catalog';
import { TIME_PRESETS } from './constants/palettes';
import { CastleEngine } from './engine/CastleEngine';
import { useCastleHistory } from './state/useCastleStore';
import { AtmosphereState, CastleWorldState, SelectionRef, ToolSettings } from './types/castle';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CastleEngine | null>(null);

  const {
    currentWorld,
    commitWorld,
    replaceCurrentAtmosphere,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCastleHistory();

  const [settings, setSettings] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS);
  const [selection, setSelection] = useState<SelectionRef | null>(null);
  const [hoverHint, setHoverHint] = useState<string | null>(null);
  const [wallChainCount, setWallChainCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  // Mount Three.js CastleEngine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CastleEngine(canvas, currentWorld, settings, {
      onWorldCommit: (w) => commitWorld(w),
      onSelect: (sel) => setSelection(sel),
      onHoverHint: (hint) => setHoverHint(hint),
      onChainCountChange: (c) => setWallChainCount(c),
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Mount once; state updates flow cleanly via methods
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push tool setting updates to engine
  useEffect(() => {
    engineRef.current?.setSettings(settings);
  }, [settings]);

  const handleAtmosphereChange = useCallback(
    (nextAtm: AtmosphereState) => {
      engineRef.current?.updateAtmosphere(nextAtm);
      replaceCurrentAtmosphere((w) => ({ ...w, atmosphere: nextAtm }));
    },
    [replaceCurrentAtmosphere]
  );

  const handleLoadWorld = useCallback(
    (next: CastleWorldState) => {
      setSelection(null);
      engineRef.current?.setWorld(next, true);
      commitWorld(next);
      showToast(`Loaded "${next.name}"`);
    },
    [commitWorld, showToast]
  );

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      setSelection(null);
      engineRef.current?.setWorld(prev, true);
      showToast('Undid last action');
    }
  }, [undo, showToast]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) {
      setSelection(null);
      engineRef.current?.setWorld(next, true);
      showToast('Redid action');
    }
  }, [redo, showToast]);

  const handleScreenshot = useCallback(() => {
    if (!engineRef.current) return;
    const dataUrl = engineRef.current.captureScreenshot();
    const a = document.createElement('a');
    a.href = dataUrl;
    const safeName = (currentWorld.name || 'castellum').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeName}-diorama.png`;
    a.click();
    showToast('Saved high-res PNG snapshot');
  }, [currentWorld.name, showToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'h') {
        handleAtmosphereChange({
          ...currentWorld.atmosphere,
          photoMode: !currentWorld.atmosphere.photoMode,
        });
        return;
      }
      if (key === '?') {
        setShowGuide((g) => !g);
        return;
      }
      if (key === 'q') {
        setSettings((s) => ({
          ...s,
          buildingRotation: s.buildingRotation - Math.PI / 12,
          propRotation: s.propRotation - Math.PI / 12,
        }));
        return;
      }
      if (key === 'e') {
        setSettings((s) => ({
          ...s,
          buildingRotation: s.buildingRotation + Math.PI / 12,
          propRotation: s.propRotation + Math.PI / 12,
        }));
        return;
      }
      if (key === '[') {
        setSettings((s) => ({ ...s, brushRadius: Math.max(1.5, s.brushRadius - 0.5) }));
        return;
      }
      if (key === ']') {
        setSettings((s) => ({ ...s, brushRadius: Math.min(12, s.brushRadius + 0.5) }));
        return;
      }

      const matchedTool = TOOL_LIST.find((t) => t.hotkey.toLowerCase() === key);
      if (matchedTool) {
        setSettings((s) => ({ ...s, activeTool: matchedTool.id }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentWorld.atmosphere, handleAtmosphereChange, handleRedo, handleUndo]);

  const photoMode = currentWorld.atmosphere.photoMode;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Full-Bleed 3D WebGL Diorama Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair outline-none" />

      {/* Standard Studio HUD */}
      {!photoMode && (
        <>
          <TopBar
            castleName={currentWorld.name}
            onRename={(name) => replaceCurrentAtmosphere((w) => ({ ...w, name }))}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            soundEnabled={soundEnabled}
            onToggleSound={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundscape.setEnabled(next);
              soundscape.setWeather(currentWorld.atmosphere.weather);
              showToast(next ? 'Ambient soundscape enabled' : 'Sound muted');
            }}
            onOpenPresets={() => setShowPresets(true)}
            onTogglePhotoMode={() =>
              handleAtmosphereChange({ ...currentWorld.atmosphere, photoMode: true })
            }
            onOpenGuide={() => setShowGuide(true)}
            onResetCamera={() => engineRef.current?.setCameraPreset('reset')}
            stats={{
              walls: currentWorld.walls.length,
              towers: currentWorld.towers.length,
              buildings: currentWorld.buildings.length,
            }}
          />

          <ToolOptionsPanel settings={settings} onChange={setSettings} />

          {selection ? (
            <InspectorPanel
              world={currentWorld}
              selection={selection}
              onUpdateWorld={(next) => {
                engineRef.current?.setWorld(next, false);
                commitWorld(next);
              }}
              onDelete={(sel) => engineRef.current?.deleteEntity(sel)}
              onClose={() => engineRef.current?.setSelection(null)}
            />
          ) : (
            <AtmospherePanel
              atmosphere={currentWorld.atmosphere}
              onChange={handleAtmosphereChange}
              onCameraPreset={(p) => engineRef.current?.setCameraPreset(p)}
              onScreenshot={handleScreenshot}
            />
          )}

          <ToolDock
            activeTool={settings.activeTool}
            onSelectTool={(t) => setSettings((s) => ({ ...s, activeTool: t }))}
            hoverHint={hoverHint}
            wallChainCount={wallChainCount}
            onFinishWallChain={() => engineRef.current?.finishWallChain()}
            onCancelDraft={() => engineRef.current?.cancelDrafts()}
          />
        </>
      )}

      {/* Minimal Photo / Contemplation Mode Toolbar */}
      {photoMode && (
        <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/20 bg-slate-950/75 px-4 py-2 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            {TIME_PRESETS.map((tp) => (
              <button
                key={tp.label}
                onClick={() =>
                  handleAtmosphereChange({ ...currentWorld.atmosphere, timeOfDay: tp.hour })
                }
                title={tp.label}
                className="rounded-full px-2 py-1 hover:bg-slate-800 cursor-pointer"
              >
                {tp.icon}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={() =>
              handleAtmosphereChange({
                ...currentWorld.atmosphere,
                turntable: !currentWorld.atmosphere.turntable,
              })
            }
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 cursor-pointer ${
              currentWorld.atmosphere.turntable ? 'bg-amber-500/25 text-amber-200' : 'hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Orbit
          </button>
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" />
            <Download className="h-3 w-3" /> PNG
          </button>
          <button
            onClick={() =>
              handleAtmosphereChange({ ...currentWorld.atmosphere, photoMode: false })
            }
            className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" /> Exit (H)
          </button>
        </div>
      )}

      {/* Modals */}
      {showPresets && (
        <PresetsModal
          currentWorld={currentWorld}
          onLoadWorld={handleLoadWorld}
          onClose={() => setShowPresets(false)}
        />
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* Subtle Toast Notification */}
      {toast && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-300/30 bg-slate-950/85 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
