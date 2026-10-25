// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tttEngine } from '../games/tic-tac-toe/engine';
import { loadJson, removeJson, STORAGE_VERSION, saveJson, usePersistentState } from './storage';
import { useGame } from './useGame';
import { useMatch } from './useMatch';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('storage helpers', () => {
  it('round-trips values and ignores missing, corrupt and other-version data', () => {
    expect(loadJson('x')).toBeNull();
    saveJson('x', { a: 1 });
    expect(loadJson('x')).toEqual({ a: 1 });
    localStorage.setItem('turntable:bad', '{not json');
    expect(loadJson('bad')).toBeNull();
    localStorage.setItem('turntable:old', JSON.stringify({ v: STORAGE_VERSION + 1, data: 5 }));
    expect(loadJson('old')).toBeNull();
    removeJson('x');
    expect(loadJson('x')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadJson('x')).toBeNull();
    expect(() => saveJson('x', 1)).not.toThrow();
  });

  it('usePersistentState remembers a setting and rejects values of the wrong type', () => {
    const first = renderHook(() => usePersistentState('level', 'medium'));
    act(() => first.result.current[1]('hard'));
    first.unmount();
    expect(renderHook(() => usePersistentState('level', 'medium')).result.current[0]).toBe('hard');
    saveJson('level', 42);
    expect(renderHook(() => usePersistentState('level', 'medium')).result.current[0]).toBe('medium');
  });
});

describe('useGame resume', () => {
  const play = (hook: ReturnType<typeof renderGame>, ...moves: number[]) => {
    for (const m of moves) act(() => void hook.result.current.play(m));
  };
  const renderGame = (key?: string) => renderHook(() => useGame(tttEngine, { persistKey: key }));

  it('resumes the saved position after a reload, but not the undo history', () => {
    const a = renderGame('ttt');
    play(a, 4, 0);
    a.unmount();
    const b = renderGame('ttt');
    expect(b.result.current.state.cells[4]).toBe(1);
    expect(b.result.current.state.cells[0]).toBe(2);
    expect(b.result.current.player).toBe(1);
    expect(b.result.current.canUndo).toBe(false);
    play(b, 8);
    expect(b.result.current.state.cells[8]).toBe(1);
  });

  it('does not save without a key, and separate keys do not interfere', () => {
    const plain = renderGame();
    play(plain, 4);
    plain.unmount();
    expect(renderGame().result.current.state.cells[4]).toBeNull();

    const one = renderGame('a');
    play(one, 1);
    one.unmount();
    expect(renderGame('b').result.current.state.cells[1]).toBeNull();
    expect(renderGame('a').result.current.state.cells[1]).toBe(1);
  });

  it('starting a new game overwrites the save', () => {
    const a = renderGame('ttt');
    play(a, 4);
    act(() => a.result.current.reset());
    a.unmount();
    expect(renderGame('ttt').result.current.state.cells.every((c) => c === null)).toBe(true);
  });

  it('ignores a save that does not look like a game state', () => {
    saveJson('ttt:state', { nonsense: true });
    expect(renderGame('ttt').result.current.state.cells.every((c) => c === null)).toBe(true);
    saveJson('ttt:state', 'a string');
    expect(renderGame('ttt').result.current.state.cells.every((c) => c === null)).toBe(true);
    localStorage.setItem('turntable:ttt:state', '{broken');
    expect(renderGame('ttt').result.current.state.cells.every((c) => c === null)).toBe(true);
  });

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const g = renderGame('ttt');
    play(g, 4);
    expect(g.result.current.state.cells[4]).toBe(1);
  });
});

describe('useMatch resume', () => {
  const renderMatch = () => renderHook(() => useMatch(tttEngine, { persistId: 'ttt' }));
  const finishWithXWin = (h: ReturnType<typeof renderMatch>) => {
    for (const m of [0, 3, 1, 4, 2]) act(() => void h.result.current.game.play(m));
  };

  it('restores mode, scores and position', () => {
    const a = renderMatch();
    act(() => a.result.current.changeMode('vs-cpu')); // resets the game and the scores
    finishWithXWin(a);
    expect(a.result.current.scores).toEqual({ 1: 1, 2: 0 });
    a.unmount();
    const b = renderMatch();
    expect(b.result.current.mode).toBe('vs-cpu');
    expect(b.result.current.scores).toEqual({ 1: 1, 2: 0 });
    expect(b.result.current.game.status).toEqual({ state: 'won', winner: 1, line: [0, 1, 2] });
  });

  it('does not count a resumed finished game again, however often the page reloads', () => {
    const a = renderMatch();
    finishWithXWin(a);
    a.unmount();
    for (let i = 0; i < 3; i++) {
      const again = renderMatch();
      expect(again.result.current.scores).toEqual({ 1: 1, 2: 0 });
      again.unmount();
    }
  });

  it('a new game after a resumed finished game still counts its win', () => {
    const a = renderMatch();
    finishWithXWin(a);
    a.unmount();
    const b = renderMatch();
    act(() => b.result.current.game.reset());
    finishWithXWin(b);
    expect(b.result.current.scores).toEqual({ 1: 2, 2: 0 });
  });

  it('tolerates garbage in the saved scores', () => {
    saveJson('ttt:meta', { mode: 'sideways', scores: { 1: 'x' } });
    const h = renderMatch();
    expect(h.result.current.mode).toBe('pvp');
    expect(h.result.current.scores).toEqual({ 1: 0, 2: 0 });
  });
});
