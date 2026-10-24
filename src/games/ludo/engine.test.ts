import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  createLudo,
  HOME,
  type LudoState,
  MAX_SIXES,
  movableTokens,
  START,
  TRACK,
  trackSquare,
} from './engine';

const e = createLudo(1);
const base = (over: Partial<LudoState> = {}): LudoState => ({ ...e.initialState(), ...over });
/** A state with the given dice value ready, so tests need no lucky seeds. */
const ready = (dice: number, tokens: LudoState['tokens'], current: 1 | 2 = 1, sixes = 0) =>
  base({ dice, tokens, current, sixes });
const yard = [-1, -1, -1, -1];

/** Finds a seed whose first roll equals `roll`. */
const seedFor = (roll: number) => {
  for (let seed = 0; seed < 2000; seed++) {
    const n = e.applyMove(base({ seed }), { kind: 'roll' });
    if (n?.last?.roll === roll) return seed;
  }
  throw new Error('no seed');
};

describe('ludo geometry', () => {
  it('maps progress to absolute squares from each start', () => {
    expect(trackSquare(1, 0)).toBe(0);
    expect(trackSquare(1, 10)).toBe(10);
    expect(trackSquare(2, 0)).toBe(26);
    expect(trackSquare(2, 30)).toBe((26 + 30) % TRACK);
    expect(trackSquare(1, -1)).toBeNull();
    expect(trackSquare(1, 51)).toBeNull(); // home column
    expect(trackSquare(1, HOME)).toBeNull();
    expect(START).toEqual({ 1: 0, 2: 26 });
  });
});

describe('ludo moves', () => {
  it('a token leaves the yard only on a six', () => {
    expect(movableTokens({ tokens: { 1: yard, 2: yard } }, 1, 5)).toEqual([]);
    expect(movableTokens({ tokens: { 1: yard, 2: yard } }, 1, 6)).toEqual([0, 1, 2, 3]);
  });

  it('rolling with no possible move passes the turn', () => {
    const s = e.applyMove(base({ seed: seedFor(3) }), { kind: 'roll' });
    expect(s?.dice).toBeNull();
    expect(s?.current).toBe(2);
    expect(s?.last).toMatchObject({ roll: 3, note: 'no move possible' });
  });

  it('rolling a six with all tokens in the yard lets you enter and then roll again', () => {
    const rolled = e.applyMove(base({ seed: seedFor(6) }), { kind: 'roll' });
    expect(rolled?.dice).toBe(6);
    expect(rolled?.current).toBe(1);
    const moved = rolled && e.applyMove(rolled, { kind: 'move', token: 2 });
    expect(moved?.tokens[1]).toEqual([-1, -1, 0, -1]);
    expect(moved?.current).toBe(1); // extra roll
    expect(moved?.dice).toBeNull();
    expect(moved?.sixes).toBe(1);
  });

  it('a non-six move passes the turn and moves exactly the rolled steps', () => {
    const s = ready(4, { 1: [10, -1, -1, -1], 2: yard });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[1][0]).toBe(14);
    expect(n?.current).toBe(2);
    expect(n?.sixes).toBe(0);
  });

  it('three sixes in a row forfeit the turn without moving', () => {
    const s = base({ sixes: MAX_SIXES - 1, seed: seedFor(6), tokens: { 1: [5, 5, 5, 5], 2: yard } });
    const n = e.applyMove(s, { kind: 'roll' });
    expect(n?.current).toBe(2);
    expect(n?.tokens[1]).toEqual([5, 5, 5, 5]);
    expect(n?.last?.note).toMatch(/third six/);
  });

  it('rejects rolling twice, moving before rolling, illegal tokens and unknown moves', () => {
    expect(e.applyMove(base(), { kind: 'move', token: 0 })).toBeNull();
    const s = ready(3, { 1: [10, -1, -1, -1], 2: yard });
    expect(e.applyMove(s, { kind: 'roll' })).toBeNull();
    expect(e.applyMove(s, { kind: 'move', token: 1 })).toBeNull(); // in the yard, roll is not a six
    expect(e.applyMove(s, { kind: 'move', token: 9 })).toBeNull();
    // @ts-expect-error deliberately invalid
    expect(e.applyMove(s, { kind: 'jump' })).toBeNull();
  });
});

describe('ludo captures and safety', () => {
  it('landing on an opponent token sends it back to the yard', () => {
    // player 1 progress 30 -> square 30; player 2 progress 4 -> square 30 (26 + 4)
    const s = ready(2, { 1: [28, -1, -1, -1], 2: [4, 10, -1, -1] });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[2]).toEqual([-1, 10, -1, -1]);
    expect(n?.last?.note).toMatch(/captures 1/);
  });

  it('start squares are safe: no capture', () => {
    // player 2 sits on its start square 26 (progress 0); player 1 lands there at progress 26
    const s = ready(2, { 1: [24, -1, -1, -1], 2: [0, -1, -1, -1] });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[2][0]).toBe(0);
  });

  it('tokens in the home column cannot be captured', () => {
    const s = ready(1, { 1: [10, -1, -1, -1], 2: [51, -1, -1, -1] });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[2][0]).toBe(51);
  });

  it('own tokens may share a square', () => {
    const s = ready(2, { 1: [3, 5, -1, -1], 2: yard });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[1].slice(0, 2)).toEqual([5, 5]);
  });

  it('a capture on the way around uses the right wrap-around square', () => {
    // player 2 progress 45 -> square (26 + 45) % 52 = 19; player 1 progress 17 + 2 = 19
    const s = ready(2, { 1: [17, -1, -1, -1], 2: [45, -1, -1, -1] });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[2][0]).toBe(-1);
  });
});

describe('ludo finishing', () => {
  it('needs an exact roll to reach home', () => {
    expect(movableTokens({ tokens: { 1: [54, HOME, -1, -1], 2: yard } }, 1, 3)).toEqual([]);
    expect(movableTokens({ tokens: { 1: [54, HOME, -1, -1], 2: yard } }, 1, 2)).toEqual([0]);
  });

  it('getting every token home wins and stops play', () => {
    const s = ready(2, { 1: [HOME, HOME, HOME, 54], 2: yard });
    const n = e.applyMove(s, { kind: 'move', token: 3 });
    expect(n && e.getStatus(n)).toEqual({ state: 'won', winner: 1 });
    expect(n && e.legalMoves(n)).toEqual([]);
    expect(n && e.applyMove(n, { kind: 'roll' })).toBeNull();
  });

  it('entering the home column and moving along it works', () => {
    const s = ready(3, { 1: [49, -1, -1, -1], 2: yard });
    const n = e.applyMove(s, { kind: 'move', token: 0 });
    expect(n?.tokens[1][0]).toBe(52);
  });
});

describe('ludo AI', () => {
  it('rolls when it must, captures when it can, and gets out of the yard on a six', () => {
    expect(getBestMove(base())).toEqual({ kind: 'roll' });
    const cap = ready(2, { 1: [28, 10, -1, -1], 2: [4, -1, -1, -1] });
    expect(getBestMove(cap)).toEqual({ kind: 'move', token: 0 });
    const six = ready(6, { 1: [3, -1, -1, -1], 2: yard });
    expect(getBestMove(six)).toEqual({ kind: 'move', token: 1 });
  });

  it('plays a full game against itself with only legal moves, always ending in a win', () => {
    let s = createLudo(7).initialState();
    const eng = createLudo(7);
    let n = 0;
    while (eng.getStatus(s).state === 'playing' && n++ < 20000) {
      const next = eng.applyMove(s, getBestMove(s));
      expect(next).not.toBeNull();
      if (!next) break;
      s = next;
    }
    expect(eng.getStatus(s).state).toBe('won');
    const w = s.winner as 1 | 2;
    expect(s.tokens[w].every((p) => p === HOME)).toBe(true);
  });
});
