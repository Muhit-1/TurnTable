import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEngine, Outcome, PlayerId } from './engine';
import { notify } from './notify';
import { sfx } from './sound';
import { loadJson, saveJson } from './storage';

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
  /** Step back at least once, then keep stepping back while `keepGoing(candidate)` holds. */
  undoWhile: (keepGoing: (state: State) => boolean) => void;
  redo: () => void;
  reset: () => void;
}

export interface UseGameOptions {
  /**
   * Save the current position under this key in localStorage and resume it on the next visit.
   * Only the current position is saved (not the undo history).
   */
  persistKey?: string;
}

/** A saved position is only used if the engine can make sense of it. */
function restore<State, Move, Line>(
  engine: GameEngine<State, Move, Line>,
  key: string | undefined,
): State | null {
  if (!key) return null;
  const saved = loadJson<State>(`${key}:state`);
  if (saved === null || typeof saved !== 'object') return null;
  try {
    const player = engine.currentPlayer(saved);
    engine.getStatus(saved);
    return player === 1 || player === 2 ? saved : null;
  } catch {
    return null;
  }
}

/** Binds a GameEngine to React state, with undo/redo history and optional save/resume. */
export function useGame<State, Move, Line = unknown>(
  engine: GameEngine<State, Move, Line>,
  { persistKey }: UseGameOptions = {},
): UseGame<State, Move, Line> {
  const [history, setHistory] = useState<History<State>>(() => ({
    past: [],
    present: restore(engine, persistKey) ?? engine.initialState(),
    future: [],
  }));
  const { past, present, future } = history;

  useEffect(() => {
    if (persistKey) saveJson(`${persistKey}:state`, present);
  }, [persistKey, present]);

  // Sound: a win or draw chime when a game ends during this visit (not when a finished game is resumed).
  const endState = engine.getStatus(present).state;
  const prevEnd = useRef(endState);
  useEffect(() => {
    if (prevEnd.current === 'playing') {
      if (endState === 'won') {
        sfx.win();
        notify.gameOver('won');
      } else if (endState === 'draw') {
        sfx.draw();
        notify.gameOver('draw');
      }
    }
    prevEnd.current = endState;
  }, [endState]);

  const play = useCallback(
    (move: Move) => {
      const next = engine.applyMove(present, move);
      if (next === null) {
        notify.toast("That move isn't allowed");
        return false;
      }
      sfx.move(engine.currentPlayer(present));
      setHistory({ past: [...past, present], present: next, future: [] });
      return true;
    },
    [engine, past, present],
  );

  const rewind = useCallback((pick: (past: State[]) => number) => {
    setHistory((h) => {
      const n = Math.min(pick(h.past), h.past.length);
      if (n <= 0) return h;
      const taken = h.past.slice(h.past.length - n);
      return {
        past: h.past.slice(0, h.past.length - n),
        present: taken[0],
        future: [...taken.slice(1), h.present, ...h.future],
      };
    });
  }, []);

  const undo = useCallback(
    (steps = 1) => {
      sfx.undo();
      rewind(() => steps);
    },
    [rewind],
  );

  const undoWhile = useCallback(
    (keepGoing: (state: State) => boolean) =>
      rewind((past) => {
        let n = 1;
        while (n < past.length && keepGoing(past[past.length - n])) n++;
        return n;
      }),
    [rewind],
  );

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
  useEffect(() => notify.registerReset(reset), [reset]);

  return {
    state: present,
    status: engine.getStatus(present),
    player: engine.currentPlayer(present),
    legalMoves: engine.legalMoves(present),
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    play,
    undo,
    undoWhile,
    redo,
    reset,
  };
}
