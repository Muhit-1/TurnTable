import { useSyncExternalStore } from 'react';
import type { PlayerId } from './engine';

/** Who is playing and whose turn it is, published by `useMatch` so the page chrome (board plaques, player rows) can show it. */
export interface MatchInfo {
  names: Record<PlayerId, string>;
  player: PlayerId;
  over: boolean;
}

let info: MatchInfo | null = null;
const listeners = new Set<() => void>();

export function publishMatch(next: MatchInfo | null): void {
  const same =
    (next === null && info === null) ||
    (next !== null &&
      info !== null &&
      next.player === info.player &&
      next.over === info.over &&
      next.names[1] === info.names[1] &&
      next.names[2] === info.names[2]);
  if (same) return;
  info = next;
  for (const l of listeners) l();
}

export function useMatchInfo(): MatchInfo | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => info,
    () => null,
  );
}
