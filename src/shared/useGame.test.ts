// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { tttEngine } from '../games/tic-tac-toe/engine';
import { useGame } from './useGame';

const setup = () => renderHook(() => useGame(tttEngine));

describe('useGame', () => {
  it('plays moves, rejects illegal ones, and tracks the current player', () => {
    const { result } = setup();
    expect(result.current.player).toBe(1);
    act(() => void result.current.play(4));
    expect(result.current.player).toBe(2);
    let ok = true;
    act(() => {
      ok = result.current.play(4); // occupied
    });
    expect(ok).toBe(false);
    expect(result.current.state.cells[4]).toBe(1);
  });

  it('undo / redo walk through history and a new move clears redo', () => {
    const { result } = setup();
    act(() => void result.current.play(0));
    act(() => void result.current.play(1));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    expect(result.current.state.cells[1]).toBeNull();
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.state.cells[1]).toBe(2);

    act(() => result.current.undo());
    act(() => void result.current.play(8));
    expect(result.current.canRedo).toBe(false);
  });

  it('undo(n) steps back several moves and redo restores them one by one', () => {
    const { result } = setup();
    for (const m of [0, 1, 2]) act(() => void result.current.play(m));
    act(() => result.current.undo(2));
    expect(result.current.state.cells.filter(Boolean)).toHaveLength(1);
    act(() => result.current.redo());
    expect(result.current.state.cells.filter(Boolean)).toHaveLength(2);
    act(() => result.current.undo(99)); // clamps at the start
    expect(result.current.state.cells.every((c) => c === null)).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it('undoWhile rewinds to the first state where the predicate stops holding', () => {
    const { result } = setup();
    for (const m of [0, 1, 2, 3]) act(() => void result.current.play(m)); // 4 moves, player 1 to move
    // keep rewinding while it is player 2's turn: from 4 moves back to 3 moves is player 2's turn... stop at an even count
    act(() => result.current.undoWhile((s) => s.current === 2));
    expect(result.current.state.current).toBe(1);
    expect(result.current.state.cells.filter(Boolean)).toHaveLength(2);
  });

  it('reset clears the board and history', () => {
    const { result } = setup();
    act(() => void result.current.play(0));
    act(() => result.current.reset());
    expect(result.current.state.cells.every((c) => c === null)).toBe(true);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
