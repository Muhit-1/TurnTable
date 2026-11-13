import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { createGomoku, gomokuEngine as e, SIZE, winningRun } from './engine';

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

describe('exactly-five rule', () => {
  const row = (n: number) => {
    const cells = Array<1 | 2 | null>(SIZE * SIZE).fill(null);
    for (let c = 0; c < n; c++) cells[7 * SIZE + c] = 1;
    return cells;
  };

  it('five in a row wins under both rules', () => {
    expect(winningRun(row(5), 7 * SIZE, 'freestyle')).toHaveLength(5);
    expect(winningRun(row(5), 7 * SIZE, 'standard')).toHaveLength(5);
  });

  it('six in a row wins only in freestyle', () => {
    expect(winningRun(row(6), 7 * SIZE, 'freestyle')).toHaveLength(6);
    expect(winningRun(row(6), 7 * SIZE, 'standard')).toBeNull();
  });

  it('the standard engine plays on after an overline', () => {
    const std = createGomoku('standard');
    let s = std.initialState();
    // player 1 fills columns 0-3 and 5 of row 7, then closes the gap at column 4 to make six
    const mine = [0, 1, 2, 3, 5, 4];
    for (let k = 0; k < mine.length; k++) {
      s = std.applyMove(s, 7 * SIZE + mine[k]) as typeof s;
      if (k < mine.length - 1) s = std.applyMove(s, 12 * SIZE + k * 2) as typeof s;
    }
    expect(std.getStatus(s).state).toBe('playing');
  });
});
