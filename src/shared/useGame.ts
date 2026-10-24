import { useCallback, useState } from 'react';
import type { GameEngine, Outcome, PlayerId } from './engine';

interface History<State> {
  past: State[];
  present: State;
  future: State[];
}

export interface UseGame<State, Move, Line> {
  state: State;
  status: Outcome<Line>;
  player: PlayerId;
  legalMoves: Move[];
  canUndo: boolean;
  canRedo: boolean;
  play: (move: Move) => boolean;
  undo: (steps?: number) => void;
  redo: () => void;
  reset: () => void;
}

/** Binds a GameEngine to React state, with undo/redo history. */
export function useGame<State, Move, Line = unknown>(
  engine: GameEngine<State, Move, Line>,
): UseGame<State, Move, Line> {
  const [history, setHistory] = useState<History<State>>(() => ({
    past: [],
    present: engine.initialState(),
    future: [],
  }));
  const { past, present, future } = history;

  const play = useCallback(
    (move: Move) => {
      const next = engine.applyMove(present, move);
      if (next === null) return false;
      setHistory({ past: [...past, present], present: next, future: [] });
      return true;
    },
    [engine, past, present],
  );

  const undo = useCallback((steps = 1) => {
    setHistory((h) => {
      const n = Math.min(steps, h.past.length);
      if (n === 0) return h;
      const taken = h.past.slice(h.past.length - n);
      return {
        past: h.past.slice(0, h.past.length - n),
        present: taken[0],
        future: [...taken.slice(1), h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      return {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setHistory({ past: [], present: engine.initialState(), future: [] });
  }, [engine]);

  return {
    state: present,
    status: engine.getStatus(present),
    player: engine.currentPlayer(present),
    legalMoves: engine.legalMoves(present),
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    play,
    undo,
    redo,
    reset,
  };
}
