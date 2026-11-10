import { useCallback, useEffect, useState } from 'react';
import { CastleWorldState } from '../types/castle';
import { DIORAMA_PRESETS } from '../presets/dioramas';

const AUTOSAVE_KEY = 'castellum_autosave_v1';
const SAVES_LIST_KEY = 'castellum_saved_slots_v1';

export interface SavedCastleSlot {
  id: string;
  name: string;
  updatedAt: string;
  stats: { walls: number; towers: number; buildings: number; flora: number };
  world: CastleWorldState;
}

function cloneWorld(w: CastleWorldState): CastleWorldState {
  return JSON.parse(JSON.stringify(w)) as CastleWorldState;
}

function loadInitialWorld(): CastleWorldState {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CastleWorldState;
      if (parsed && parsed.terrain && Array.isArray(parsed.terrain.heights)) {
        return parsed;
      }
    }
  } catch {
    // fallback to preset
  }
  return DIORAMA_PRESETS[0].build();
}

export function loadSavedSlots(): SavedCastleSlot[] {
  try {
    const raw = localStorage.getItem(SAVES_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCastleSlot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedSlots(slots: SavedCastleSlot[]): void {
  try {
    localStorage.setItem(SAVES_LIST_KEY, JSON.stringify(slots));
  } catch {
    // ignore storage quota errors
  }
}

export function useCastleHistory() {
  const [initial] = useState<CastleWorldState>(() => loadInitialWorld());
  const [history, setHistory] = useState<CastleWorldState[]>([initial]);
  const [index, setIndex] = useState<number>(0);

  const currentWorld = history[index];

  useEffect(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(currentWorld));
    } catch {
      // ignore storage quota errors
    }
  }, [currentWorld]);

  const commitWorld = useCallback(
    (next: CastleWorldState) => {
      const snap = cloneWorld(next);
      setHistory((prev) => {
        const sliced = prev.slice(0, index + 1);
        const updated = [...sliced, snap];
        if (updated.length > 35) {
          updated.shift();
          setIndex(updated.length - 1);
          return updated;
        }
        setIndex(updated.length - 1);
        return updated;
      });
    },
    [index]
  );

  const replaceCurrentAtmosphere = useCallback(
    (updater: (w: CastleWorldState) => CastleWorldState) => {
      setHistory((prev) => {
        const copy = [...prev];
        copy[index] = cloneWorld(updater(copy[index]));
        return copy;
      });
    },
    [index]
  );

  const undo = useCallback((): CastleWorldState | null => {
    if (index <= 0) return null;
    const nextIdx = index - 1;
    setIndex(nextIdx);
    return cloneWorld(history[nextIdx]);
  }, [history, index]);

  const redo = useCallback((): CastleWorldState | null => {
    if (index >= history.length - 1) return null;
    const nextIdx = index + 1;
    setIndex(nextIdx);
    return cloneWorld(history[nextIdx]);
  }, [history, index]);

  return {
    currentWorld,
    commitWorld,
    replaceCurrentAtmosphere,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}
