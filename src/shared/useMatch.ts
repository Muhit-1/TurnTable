import { useEffect, useRef, useState } from 'react';
import type { Mode } from './components';
import type { GameEngine, PlayerId } from './engine';
import { type UseGame, useGame } from './useGame';

interface Options<State, Move> {
  /** Computer's move for the current position. Omit for games with no computer opponent. */
  pickMove?: (state: State) => Move;
  cpu?: PlayerId;
  delayMs?: number;
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
  { pickMove, cpu = 2, delayMs = 450 }: Options<State, Move> = {},
): UseMatch<State, Move, Line> {
  const game = useGame(engine);
  const [mode, setMode] = useState<Mode>('pvp');
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0 });
  const { state, status, player, play, reset } = game;

  const isCpuTurn = !!pickMove && mode === 'vs-cpu' && player === cpu && status.state === 'playing';

  useEffect(() => {
    if (!isCpuTurn || !pickMove) return;
    const timer = setTimeout(() => play(pickMove(state)), delayMs);
    return () => clearTimeout(timer);
  }, [isCpuTurn, pickMove, state, play, delayMs]);

  // Count each finished position once; redo restores the same state object, so it is not re-counted.
  const scored = useRef<unknown>(null);
  const winner = status.state === 'won' ? status.winner : null;
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
    names: (p1, p2) => (mode === 'vs-cpu' ? { 1: 'You', 2: 'Computer' } : { 1: p1, 2: p2 }),
  };
}
