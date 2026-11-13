import { useSyncExternalStore } from 'react';
import type { PlayerId } from './engine';
import { loadJson, saveJson } from './storage';

/** Names the two people at the table chose for themselves. Shared by every game; empty means "use the game's own name". */
export type PlayerNames = Record<PlayerId, string>;

export const MAX_NAME_LENGTH = 14;
const KEY = 'players';
const EMPTY: PlayerNames = { 1: '', 2: '' };

const clean = (v: unknown) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH) : '';

function read(): PlayerNames {
  const saved = loadJson<Partial<PlayerNames>>(KEY);
  return saved && typeof saved === 'object' ? { 1: clean(saved[1]), 2: clean(saved[2]) } : EMPTY;
}

let names: PlayerNames | null = null;
const listeners = new Set<() => void>();
const current = () => {
  names ??= read();
  return names;
};

/** Sets one player's name. An empty name goes back to the game's own name for that seat. */
export function setPlayerName(player: PlayerId, name: string): void {
  const next = { ...current(), [player]: clean(name) };
  names = next;
  saveJson(KEY, next);
  for (const l of listeners) l();
}

export function usePlayerNames(): PlayerNames {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    current,
    () => EMPTY,
  );
}

/** For tests: forget the cached names so the next read comes from storage. */
export function resetPlayerNamesCache(): void {
  names = null;
}
