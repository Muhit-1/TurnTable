import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { boxesOfLine, createDots, type DotsState, hLine, lineCount, sidesOf, vLine } from './engine';

const e = createDots(2, 2);
const d = { rows: 2, cols: 2 };
const play = (s: DotsState, ...moves: number[]) => {
  let cur = s;
  for (const m of moves) {
    const n = e.applyMove(cur, m);
    if (!n) throw new Error(`illegal ${m}`);
    cur = n;
  }
  return cur;
};

describe('dots and boxes geometry', () => {
  it('a 4x4 board has 40 lines and 16 boxes', () => {
    const e4 = createDots(4, 4);
    expect(lineCount({ rows: 4, cols: 4 })).toBe(40);
    expect(e4.initialState().boxes).toHaveLength(16);
    expect(e4.legalMoves(e4.initialState())).toHaveLength(40);
  });

  it('every box has four distinct sides and every line touches 1 or 2 boxes', () => {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) expect(new Set(sidesOf(d, r, c)).size).toBe(4);
    for (let l = 0; l < lineCount(d); l++) {
      const n = boxesOfLine(d, l).length;
      expect(n === 1 || n === 2).toBe(true);
    }
    // the centre line between the two top boxes is vertical (0, 1) and belongs to boxes 0 and 1
    expect(boxesOfLine(d, vLine(d, 0, 1)).sort()).toEqual([0, 1]);
    expect(boxesOfLine(d, hLine(d, 1, 0)).sort()).toEqual([0, 2]);
  });
});

describe('dots and boxes engine', () => {
  it('alternates turns when no box is completed', () => {
    const s = play(e.initialState(), hLine(d, 0, 0));
    expect(s.current).toBe(2);
    expect(s.extraTurn).toBe(false);
  });

  it('completing a box scores it and grants another turn', () => {
    // p1 top, p2 bottom, p1 left; then p2 draws the right side and closes box 0
    const s = play(e.initialState(), hLine(d, 0, 0), hLine(d, 1, 0), vLine(d, 0, 0), vLine(d, 0, 1));
    expect(s.boxes[0]).toBe(2);
    expect(s.score).toEqual({ 1: 0, 2: 1 });
    expect(s.current).toBe(2);
    expect(s.extraTurn).toBe(true);
  });

  it('one line can complete two boxes at once', () => {
    // surround boxes 0 and 1 except for the shared middle line
    let s = e.initialState();
    const around = [
      hLine(d, 0, 0),
      hLine(d, 0, 1),
      hLine(d, 1, 0),
      hLine(d, 1, 1),
      vLine(d, 0, 0),
      vLine(d, 0, 2),
    ];
    for (const l of around) s = play(s, l);
    const before = s.score[1] + s.score[2];
    const closer = s.current;
    s = play(s, vLine(d, 0, 1));
    expect(s.score[1] + s.score[2]).toBe(before + 2);
    expect(s.boxes[0]).toBe(closer);
    expect(s.boxes[1]).toBe(closer);
  });

  it('rejects drawn, out-of-range lines and moves after the end', () => {
    const s = play(e.initialState(), 0);
    expect(e.applyMove(s, 0)).toBeNull();
    expect(e.applyMove(s, 99)).toBeNull();
    expect(e.applyMove(s, -1)).toBeNull();
  });

  it('plays out a full game: scores sum to the box count, winner has most boxes', () => {
    let s = e.initialState();
    let guard = 0;
    while (e.getStatus(s).state === 'playing' && guard++ < 50) {
      const moves = e.legalMoves(s);
      s = play(s, moves[0]);
    }
    expect(s.score[1] + s.score[2]).toBe(4);
    expect(s.boxes.every((b) => b !== null)).toBe(true);
    const st = e.getStatus(s);
    if (s.score[1] === s.score[2]) expect(st.state).toBe('draw');
    else expect(st).toEqual({ state: 'won', winner: s.score[1] > s.score[2] ? 1 : 2 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, 0)).toBeNull();
  });
});

describe('dots and boxes AI', () => {
  it('completes a box when it can', () => {
    let s = e.initialState();
    s = play(s, hLine(d, 0, 0), hLine(d, 0, 1), vLine(d, 0, 0)); // box 0 has top + left, but p2 to move next...
    // after 3 lines p2 is to move; box 0 has top and left only (2 sides) -> add bottom to make 3 sides
    s = play(s, hLine(d, 1, 0)); // p2 draws 3rd side of box 0
    expect(getBestMove(s)).toBe(vLine(d, 0, 1)); // p1 closes it
  });

  it('avoids drawing the third side of a box when a safe line exists', () => {
    const s = play(e.initialState(), hLine(d, 0, 0), vLine(d, 0, 0)); // box 0 now has 2 sides
    const m = getBestMove(s);
    for (const b of boxesOfLine(d, m)) {
      const sides = sidesOf(d, Math.floor(b / 2), b % 2).filter((l) => s.lines[l] !== null).length;
      expect(sides).toBeLessThan(2);
    }
  });
});
