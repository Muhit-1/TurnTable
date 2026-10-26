import { useEffect, useRef, useState } from 'react';
import type { Mode } from './components';
import type { GameEngine, PlayerId } from './engine';
import { publishMatch } from './matchInfo';
import { loadJson, saveJson } from './storage';
import { type UseGame, useGame } from './useGame';

interface Options<State, Move> {
  /** Computer's move for the current position. Omit for games with no computer opponent. */
  /** May return a promise (for example from a Web Worker); a stale answer is ignored if the position changed. */
  pickMove?: (state: State) => Move | Promise<Move>;
  cpu?: PlayerId;
  delayMs?: number;
  /** Save and resume this match (position, mode and scores) under this id. Include any variant in the id. */
  persistId?: string;
}

export interface UseMatch<State, Move, Line> {
  game: UseGame<State, Move, Line>;
  mode: Mode;
  changeMode: (m: Mode) => void;
  scores: Record<PlayerId, number>;
  isCpuTurn: boolean;
  /** Undo that also rewinds the computer's reply. */
  undo: () => void;
  names: (p1: string, p2: string) => Record<PlayerId, string>;
}

/** Wraps useGame with pvp / vs-computer mode, a computer-move effect, and a per-session scoreboard. */
export function useMatch<State, Move, Line = unknown>(
  engine: GameEngine<State, Move, Line>,
  { pickMove, cpu = 2, delayMs = 450, persistId }: Options<State, Move> = {},
): UseMatch<State, Move, Line> {
  const game = useGame(engine, { persistKey: persistId });
  const meta = persistId ? loadJson<{ mode?: unknown; scores?: unknown }>(`${persistId}:meta`) : null;
  const [mode, setMode] = useState<Mode>(() => (meta?.mode === 'vs-cpu' ? 'vs-cpu' : 'pvp'));
  const [scores, setScores] = useState<Record<PlayerId, number>>(() => {
    const s = meta?.scores as Record<PlayerId, number> | undefined;
    return s && Number.isFinite(s[1]) && Number.isFinite(s[2]) ? { 1: s[1], 2: s[2] } : { 1: 0, 2: 0 };
  });

  useEffect(() => {
    if (persistId) saveJson(`${persistId}:meta`, { mode, scores });
  }, [persistId, mode, scores]);
  const { state, status, player, play, reset } = game;
  const lastNames = useRef<Record<PlayerId, string> | null>(null);
  // Let the page chrome show the player names and whose turn it is.
  useEffect(() => {
    if (lastNames.current)
      publishMatch({ names: lastNames.current, player, over: status.state !== 'playing' });
  });
  useEffect(() => () => publishMatch(null), []);

  const isCpuTurn = !!pickMove && mode === 'vs-cpu' && player === cpu && status.state === 'playing';

  useEffect(() => {
    if (!isCpuTurn || !pickMove) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const move = await pickMove(state);
      if (!cancelled) play(move);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isCpuTurn, pickMove, state, play, delayMs]);

  // Count each finished position once; redo restores the same state object, so it is not re-counted.
  // A resumed finished game was already counted when it ended, so it must not be counted again.
  const winner = status.state === 'won' ? status.winner : null;
  const scored = useRef<unknown>(winner ? state : null);
  useEffect(() => {
    if (!winner || scored.current === state) return;
    scored.current = state;
    setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
  }, [winner, state]);

  return {
    game,
    mode,
    changeMode: (next) => {
      if (next === mode) return;
      setMode(next);
      setScores({ 1: 0, 2: 0 });
      reset();
    },
    scores,
    isCpuTurn,
    // Against the computer, rewind to the human's previous turn (the computer may have moved several times).
    undo: () =>
      mode === 'vs-cpu' && pickMove ? game.undoWhile((st) => engine.currentPlayer(st) === cpu) : game.undo(1),
    names: (p1, p2) => {
      const n: Record<PlayerId, string> = mode === 'vs-cpu' ? { 1: 'You', 2: 'Computer' } : { 1: p1, 2: p2 };
      lastNames.current = n;
      return n;
    },
  };
}
