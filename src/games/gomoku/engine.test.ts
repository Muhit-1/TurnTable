import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { gomokuEngine as e, SIZE } from './engine';

const at = (r: number, c: number) => r * SIZE + c;
const play = (moves: number[]) => {
  let s = e.initialState();
  for (const m of moves) {
    const n = e.applyMove(s, m);
    if (!n) throw new Error(`illegal ${m}`);
    s = n;
  }
  return s;
};

describe('gomoku engine', () => {
  it('starts empty, black to move, 225 legal moves', () => {
    const s = e.initialState();
    expect(e.legalMoves(s)).toHaveLength(SIZE * SIZE);
    expect(e.currentPlayer(s)).toBe(1);
  });

  it('rejects occupied and out-of-range intersections', () => {
    const s = play([at(7, 7)]);
    expect(e.applyMove(s, at(7, 7))).toBeNull();
    expect(e.applyMove(s, SIZE * SIZE)).toBeNull();
    expect(e.applyMove(s, -1)).toBeNull();
  });

  const row = (r: number) => [0, 1, 2, 3, 4].map((c) => at(r, c));
  it('detects a horizontal five', () => {
    // black along row 0, white along row 2
    const s = play([
      at(0, 0),
      at(2, 0),
      at(0, 1),
      at(2, 1),
      at(0, 2),
      at(2, 2),
      at(0, 3),
      at(2, 3),
      at(0, 4),
    ]);
    const st = e.getStatus(s);
    expect(st).toMatchObject({ state: 'won', winner: 1 });
    expect(st.state === 'won' && st.line?.sort((a, b) => a - b)).toEqual(row(0));
  });

  it('detects vertical and both diagonals', () => {
    const vertical = play([
      at(0, 0),
      at(0, 5),
      at(1, 0),
      at(0, 6),
      at(2, 0),
      at(0, 7),
      at(3, 0),
      at(0, 8),
      at(4, 0),
    ]);
    expect(e.getStatus(vertical).state).toBe('won');
    const diag = play([
      at(0, 0),
      at(0, 5),
      at(1, 1),
      at(0, 6),
      at(2, 2),
      at(0, 7),
      at(3, 3),
      at(0, 8),
      at(4, 4),
    ]);
    expect(e.getStatus(diag).state).toBe('won');
    const anti = play([
      at(0, 4),
      at(5, 5),
      at(1, 3),
      at(5, 6),
      at(2, 2),
      at(5, 7),
      at(3, 1),
      at(5, 8),
      at(4, 0),
    ]);
    expect(e.getStatus(anti).state).toBe('won');
  });

  it('four in a row is not a win and broken lines do not count', () => {
    const s = play([at(0, 0), at(5, 0), at(0, 1), at(5, 1), at(0, 3), at(5, 3), at(0, 4), at(5, 4)]);
    expect(e.getStatus(s).state).toBe('playing');
  });

  it('rejects moves after the game is over', () => {
    const s = play([
      at(0, 0),
      at(2, 0),
      at(0, 1),
      at(2, 1),
      at(0, 2),
      at(2, 2),
      at(0, 3),
      at(2, 3),
      at(0, 4),
    ]);
    expect(e.applyMove(s, at(10, 10))).toBeNull();
    expect(e.legalMoves(s)).toEqual([]);
  });

  it('declares a draw on a full board with no five', () => {
    const base = e.initialState();
    const cells = base.cells.slice();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        cells[at(r, c)] = (Math.floor(c / 2) + Math.floor(r / 2) + (r % 2)) % 2 === 0 ? 1 : 2;
    const last = at(14, 14);
    const mover = cells[last] ?? 1;
    cells[last] = null;
    const n = e.applyMove({ ...base, cells, current: mover }, last);
    expect(n && e.getStatus(n)).toEqual({ state: 'draw' });
  });
});

describe('gomoku AI', () => {
  it('opens in the centre', () => {
    expect(getBestMove(e.initialState())).toBe(at(7, 7));
  });

  it('takes an immediate five', () => {
    // black has 4 in a row (0,0)-(0,3); white far away; black to move
    const s = play([at(0, 0), at(10, 0), at(0, 1), at(10, 2), at(0, 2), at(10, 4), at(0, 3), at(12, 6)]);
    expect(getBestMove(s)).toBe(at(0, 4));
  });

  it('blocks an opponent five', () => {
    const s = play([at(10, 0), at(0, 0), at(10, 2), at(0, 1), at(10, 4), at(0, 2), at(12, 6), at(0, 3)]);
    // white (player 2) has 4 in row 0; black to move must block at (0,4)
    expect(getBestMove(s)).toBe(at(0, 4));
  });
});
