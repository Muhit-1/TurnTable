import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  BAR,
  type BgMove,
  type BgState,
  CHECKERS,
  createBackgammon,
  OFF,
  POINTS,
  pipCount,
  startingPoints,
  stepsFor,
} from './engine';

const e = createBackgammon(3);
const empty = (): number[] => Array<number>(POINTS).fill(0);
const st = (over: Partial<BgState>): BgState => ({
  ...e.initialState(),
  points: empty(),
  dice: [],
  ...over,
});
const mv = (from: number | typeof BAR, to: number | typeof OFF, die: number): BgMove => ({
  kind: 'move',
  from,
  to,
  die,
});
const total = (s: BgState, p: 1 | 2) =>
  s.points.reduce((a, c) => a + (p === 1 ? Math.max(c, 0) : Math.max(-c, 0)), 0) + s.bar[p] + s.off[p];

describe('backgammon setup', () => {
  it('has the standard opening: 15 checkers each in the right places', () => {
    const s = e.initialState();
    expect(total(s, 1)).toBe(CHECKERS);
    expect(total(s, 2)).toBe(CHECKERS);
    expect(s.points[23]).toBe(2);
    expect(s.points[12]).toBe(5);
    expect(s.points[7]).toBe(3);
    expect(s.points[5]).toBe(5);
    // player 2 mirrors player 1 across the board
    for (let i = 0; i < POINTS; i++) expect(startingPoints()[i] + startingPoints()[POINTS - 1 - i]).toBe(0);
    expect(pipCount(s, 1)).toBe(167);
    expect(pipCount(s, 2)).toBe(167);
  });

  it('starts by asking player 1 to roll', () => {
    expect(e.legalMoves(e.initialState())).toEqual([{ kind: 'roll' }]);
  });
});

describe('rolling', () => {
  it('gives two dice, or four equal dice on doubles, and rejects a second roll', () => {
    let doubles = 0;
    let normal = 0;
    for (let seed = 0; seed < 40; seed++) {
      const eng = createBackgammon(seed);
      const s = eng.applyMove(eng.initialState(), { kind: 'roll' }) as BgState;
      expect(s.last?.dice).toHaveLength(2);
      if (s.last?.dice[0] === s.last?.dice[1]) {
        doubles++;
        expect(s.dice).toEqual(Array(4).fill(s.last?.dice[0]));
      } else {
        normal++;
        expect(s.dice).toHaveLength(2);
      }
      expect(eng.applyMove(s, { kind: 'roll' })).toBeNull();
    }
    expect(doubles).toBeGreaterThan(0);
    expect(normal).toBeGreaterThan(0);
  });

  it('is reproducible for a given seed', () => {
    const a = createBackgammon(9).applyMove(createBackgammon(9).initialState(), { kind: 'roll' });
    const b = createBackgammon(9).applyMove(createBackgammon(9).initialState(), { kind: 'roll' });
    expect(a?.dice).toEqual(b?.dice);
  });
});

describe('moving and hitting', () => {
  it('player 1 moves toward index 0, player 2 toward 23', () => {
    const pts = empty();
    pts[10] = 1;
    pts[3] = -1;
    const s1 = st({ points: pts, current: 1, dice: [4, 2] });
    expect(stepsFor(s1, 1, 4)).toContainEqual({ from: 10, to: 6 });
    const s2 = st({ points: pts, current: 2, dice: [4, 2] });
    expect(stepsFor(s2, 2, 4)).toContainEqual({ from: 3, to: 7 });
  });

  it('cannot land on a point held by two or more opposing checkers', () => {
    const pts = empty();
    pts[10] = 1;
    pts[6] = -2;
    expect(stepsFor(st({ points: pts, dice: [4] }), 1, 4)).toEqual([]);
  });

  it('hitting a lone opposing checker sends it to the bar', () => {
    const pts = empty();
    pts[10] = 1;
    pts[6] = -1;
    pts[20] = -1;
    const s = st({ points: pts, current: 1, dice: [4, 1] });
    const n = e.applyMove(s, mv(10, 6, 4)) as BgState;
    expect(n.points[6]).toBe(1);
    expect(n.bar[2]).toBe(1);
    expect(total(n, 2)).toBe(2);
  });

  it('a player on the bar must enter first and enters on the opponent home board', () => {
    const pts = empty();
    pts[10] = 1;
    pts[20] = -1;
    const s = st({ points: pts, current: 1, dice: [3, 2], bar: { 1: 1, 2: 0 } });
    const moves = e.legalMoves(s);
    expect(moves.every((m) => m.kind === 'move' && m.from === BAR)).toBe(true);
    expect(moves).toContainEqual(mv(BAR, 21, 3)); // 24 - 3
    expect(moves).toContainEqual(mv(BAR, 22, 2));
    expect(e.applyMove(s, mv(10, 7, 3))).toBeNull();
    // player 2 enters at die - 1
    const s2 = st({ points: pts, current: 2, dice: [3], bar: { 1: 0, 2: 1 } });
    expect(stepsFor(s2, 2, 3)).toEqual([{ from: BAR, to: 2 }]);
  });

  it('entering onto a blocked point is impossible; with every entry blocked the roll is wasted', () => {
    const pts = empty();
    for (let i = 18; i <= 23; i++) pts[i] = -2; // player 2 holds the whole home board
    pts[10] = 1;
    pts[5] = 1;
    const s = st({ points: pts, current: 1, bar: { 1: 1, 2: 0 }, seed: 1 });
    const n = e.applyMove(s, { kind: 'roll' }) as BgState;
    expect(n.current).toBe(2);
    expect(n.dice).toEqual([]);
    expect(n.last?.note).toBe('no legal move');
  });

  it('alternates turns after the last die is played', () => {
    const pts = empty();
    pts[10] = 1;
    pts[20] = -1;
    let s = st({ points: pts, current: 1, dice: [2, 1] });
    s = e.applyMove(s, mv(10, 8, 2)) as BgState;
    expect(s.current).toBe(1);
    expect(s.dice).toEqual([1]);
    s = e.applyMove(s, mv(8, 7, 1)) as BgState;
    expect(s.current).toBe(2);
    expect(s.dice).toEqual([]);
  });

  it('rejects moves with the wrong die, from empty points, or for the wrong player', () => {
    const pts = empty();
    pts[10] = 1;
    pts[20] = -1;
    const s = st({ points: pts, current: 1, dice: [2, 1] });
    expect(e.applyMove(s, mv(10, 6, 4))).toBeNull(); // no 4 available
    expect(e.applyMove(s, mv(9, 7, 2))).toBeNull(); // empty point
    expect(e.applyMove(s, mv(20, 22, 2))).toBeNull(); // opponent's checker
    expect(e.applyMove(s, { kind: 'roll' })).toBeNull(); // must play the dice first
  });

  it('doubles give four moves', () => {
    const pts = empty();
    pts[12] = 4;
    pts[20] = -1;
    let s = st({ points: pts, current: 1, dice: [3, 3, 3, 3] });
    for (let i = 0; i < 4; i++) {
      expect(s.current).toBe(1);
      s = e.applyMove(s, mv(12, 9, 3)) as BgState;
    }
    expect(s.points[9]).toBe(4);
    expect(s.current).toBe(2);
  });
});

describe('using the dice fully', () => {
  it('forces the larger die when only one die can be played', () => {
    const pts = empty();
    pts[12] = 1; // player 1's single checker, not yet home
    pts[1] = -2; // blocks 12-6-5 = 1 and 12-5-6 = 1, so only one die can be used
    pts[22] = -1;
    const s = st({ points: pts, current: 1, dice: [5, 6], off: { 1: 14, 2: 0 } });
    const moves = e.legalMoves(s);
    expect(moves).toEqual([mv(12, 6, 6)]);
    expect(e.applyMove(s, mv(12, 7, 5))).toBeNull();
    const done = e.applyMove(s, mv(12, 6, 6)) as BgState;
    expect(done.current).toBe(2); // the 5 cannot be played, so the turn ends
    expect(done.dice).toEqual([]);
  });

  it('forces the order of dice that lets both be played', () => {
    const pts = empty();
    pts[12] = 1;
    pts[7] = -2; // blocks the 5 on the first step; 6 first then 5 reaches index 1
    pts[22] = -1;
    const s = st({ points: pts, current: 1, dice: [5, 6], off: { 1: 14, 2: 0 } });
    expect(e.legalMoves(s)).toEqual([mv(12, 6, 6)]);
    const mid = e.applyMove(s, mv(12, 6, 6)) as BgState;
    expect(e.legalMoves(mid)).toEqual([mv(6, 1, 5)]);
  });
});

describe('bearing off', () => {
  it('is not allowed while a checker is outside the home board or on the bar', () => {
    const pts = empty();
    pts[3] = 1;
    pts[8] = 1;
    pts[20] = -1;
    expect(stepsFor(st({ points: pts }), 1, 4)).not.toContainEqual({ from: 3, to: OFF });
    const pts2 = empty();
    pts2[3] = 1;
    pts2[20] = -1;
    // with a checker on the bar the only move is entering (here hitting the lone checker on index 20)
    expect(stepsFor(st({ points: pts2, bar: { 1: 1, 2: 0 } }), 1, 4)).toEqual([{ from: BAR, to: 20 }]);
    expect(stepsFor(st({ points: pts2 }), 1, 4)).toContainEqual({ from: 3, to: OFF });
  });

  it('bears off exactly with the matching die; a larger die only from the farthest point', () => {
    const pts = empty();
    pts[0] = 1;
    pts[3] = 2;
    pts[20] = -1;
    const s = st({ points: pts });
    expect(stepsFor(s, 1, 4)).toContainEqual({ from: 3, to: OFF }); // exact
    expect(stepsFor(s, 1, 6)).toEqual([{ from: 3, to: OFF }]); // larger die: only the farthest (index 3)
    expect(stepsFor(s, 1, 1)).toContainEqual({ from: 0, to: OFF });
    // a smaller die moves within the home board instead
    expect(stepsFor(s, 1, 2)).toContainEqual({ from: 3, to: 1 });
    expect(stepsFor(s, 1, 2)).not.toContainEqual({ from: 3, to: OFF });
  });

  it('works for player 2 with indexes 18-23 and distance 24 - index', () => {
    const pts = empty();
    pts[23] = -1;
    pts[20] = -1;
    pts[2] = 1;
    const s = st({ points: pts, current: 2 });
    expect(stepsFor(s, 2, 1)).toContainEqual({ from: 23, to: OFF });
    expect(stepsFor(s, 2, 4)).toContainEqual({ from: 20, to: OFF });
    expect(stepsFor(s, 2, 6)).toEqual([{ from: 20, to: OFF }]);
  });

  it('bearing off the 15th checker wins and stops play', () => {
    const pts = empty();
    pts[0] = 1;
    pts[20] = -1;
    // both dice could bear off the last checker, so the larger die must be the one used
    const s = st({ points: pts, current: 1, dice: [1, 2], off: { 1: 14, 2: 0 } });
    expect(e.applyMove(s, mv(0, OFF, 1))).toBeNull();
    const n = e.applyMove(s, mv(0, OFF, 2)) as BgState;
    expect(e.getStatus(n)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(n)).toEqual([]);
    expect(e.applyMove(n, { kind: 'roll' })).toBeNull();
    expect(n.off[1]).toBe(15);
  });
});

describe('backgammon AI and whole games', () => {
  it('rolls when needed and hits a blot when it is clearly good', () => {
    expect(getBestMove(e.initialState())).toEqual({ kind: 'roll' });
    const pts = empty();
    pts[10] = 2;
    pts[6] = -1;
    pts[20] = -2;
    const s = st({ points: pts, current: 1, dice: [4, 4, 4, 4] });
    expect(getBestMove(s)).toEqual(mv(10, 6, 4));
  });

  it('AI vs AI finishes with a winner, conserving 15 checkers each, always with legal moves', () => {
    for (const seed of [1, 2, 3]) {
      const eng = createBackgammon(seed);
      let s = eng.initialState();
      let steps = 0;
      while (eng.getStatus(s).state === 'playing' && steps++ < 4000) {
        const m = getBestMove(s);
        expect(eng.legalMoves(s)).toContainEqual(m);
        s = eng.applyMove(s, m) as BgState;
        expect(total(s, 1)).toBe(CHECKERS);
        expect(total(s, 2)).toBe(CHECKERS);
      }
      expect(eng.getStatus(s).state).toBe('won');
      expect(s.off[s.winner as 1 | 2]).toBe(CHECKERS);
    }
  });
});
