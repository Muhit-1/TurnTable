/** Tiny event bus so any game or hook can raise a toast or end-of-game popup without knowing about the page shell. */
type Listener = (e: NotifyEvent) => void;
export type NotifyEvent = { kind: 'toast'; message: string } | { kind: 'gameover'; result: 'won' | 'draw' };

const listeners = new Set<Listener>();
let resetter: (() => void) | null = null;

export const notify = {
  toast(message: string): void {
    for (const l of listeners) l({ kind: 'toast', message });
  },
  gameOver(result: 'won' | 'draw'): void {
    for (const l of listeners) l({ kind: 'gameover', result });
  },
  /** The game on screen registers how to start a fresh board; the win popup calls it when it closes. */
  registerReset(fn: () => void): () => void {
    resetter = fn;
    return () => {
      if (resetter === fn) resetter = null;
    };
  },
  reset(): void {
    resetter?.();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
