import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { createNim, type NimState } from './engine';

const normal = createNim();
const misere = createNim([3, 5, 7], true);

describe('nim engine', () => {
  it('starts with 3-5-7 and 15 legal moves', () => {
    const s = normal.initialState();
    expect(s.piles).toEqual([3, 5, 7]);
    expect(normal.legalMoves(s)).toHaveLength(15);
  });

  it('rejects illegal moves', () => {
    const s = normal.initialState();
    expect(normal.applyMove(s, { pile: 0, count: 4 })).toBeNull();
    expect(normal.applyMove(s, { pile: 0, count: 0 })).toBeNull();
    expect(normal.applyMove(s, { pile: 3, count: 1 })).toBeNull();
    expect(normal.applyMove(s, { pile: -1, count: 1 })).toBeNull();
  });

  it('normal play: taking the last object wins', () => {
    const s: NimState = { piles: [0, 0, 1], current: 2, misere: false, lastTaker: null };
    const end = normal.applyMove(s, { pile: 2, count: 1 });
    expect(end && normal.getStatus(end)).toEqual({ state: 'won', winner: 2 });
    expect(end && normal.applyMove(end, { pile: 0, count: 1 })).toBeNull();
  });

  it('misère: taking the last object loses', () => {
    const s: NimState = { piles: [0, 0, 1], current: 2, misere: true, lastTaker: null };
    const end = misere.applyMove(s, { pile: 2, count: 1 });
    expect(end && misere.getStatus(end)).toEqual({ state: 'won', winner: 1 });
  });

  it('does not mutate the previous state', () => {
    const s = normal.initialState();
    normal.applyMove(s, { pile: 0, count: 2 });
    expect(s.piles).toEqual([3, 5, 7]);
  });
});

describe('nim AI', () => {
  function playout(engine: typeof normal, aiPlayer: 1 | 2, start: number[], isMisere: boolean) {
    let s = engine.initialState();
    s = { ...s, piles: start, misere: isMisere };
    while (engine.getStatus(s).state === 'playing') {
      const moves = engine.legalMoves(s);
      const m =
        s.current === aiPlayer
          ? getBestMove(s)
          : moves[Math.floor((s.piles.length * 7 + moves.length) % moves.length)];
      const n = engine.applyMove(s, m);
      if (!n) throw new Error('AI produced illegal move');
      s = n;
    }
    return engine.getStatus(s);
  }

  it('always makes legal moves and wins from every winning start (normal)', () => {
    for (let a = 0; a <= 4; a++)
      for (let b = 0; b <= 4; b++)
        for (let c = 0; c <= 4; c++) {
          if (a + b + c === 0 || (a ^ b ^ c) === 0) continue; // only winning positions for the mover
          const st = playout(normal, 1, [a, b, c], false);
          expect(st).toEqual({ state: 'won', winner: 1 });
        }
  });

  it('wins misère from winning starts', () => {
    for (let a = 0; a <= 4; a++)
      for (let b = 0; b <= 4; b++)
        for (let c = 0; c <= 4; c++) {
          const piles = [a, b, c];
          if (a + b + c === 0) continue;
          const big = piles.filter((p) => p > 1).length;
          const ones = piles.filter((p) => p === 1).length;
          const winning = big === 0 ? ones % 2 === 0 : (a ^ b ^ c) !== 0;
          if (!winning) continue;
          expect(playout(misere, 1, piles, true)).toEqual({ state: 'won', winner: 1 });
        }
  });
});
