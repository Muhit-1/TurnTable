import { describe, expect, it } from 'vitest';
import { distance, getBestMove } from './ai';
import {
  canSwap,
  hexEngine as e,
  findChain,
  type HexState,
  hexEngine,
  neighbours,
  SIZE,
  SWAP,
} from './engine';

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

describe('hex geometry', () => {
  it('interior cells have 6 neighbours, corners 2 or 3', () => {
    expect(neighbours(at(5, 5))).toHaveLength(6);
    expect(neighbours(at(0, 0))).toHaveLength(2);
    expect(neighbours(at(0, SIZE - 1))).toHaveLength(3);
    expect(neighbours(at(SIZE - 1, 0))).toHaveLength(3);
    expect(neighbours(at(SIZE - 1, SIZE - 1))).toHaveLength(2);
  });

  it('adjacency is symmetric', () => {
    for (let i = 0; i < SIZE * SIZE; i++) for (const n of neighbours(i)) expect(neighbours(n)).toContain(i);
  });
});

describe('hex engine', () => {
  it('rejects occupied / out-of-range cells', () => {
    const s = play([at(0, 0)]);
    expect(e.applyMove(s, at(0, 0))).toBeNull();
    expect(e.applyMove(s, SIZE * SIZE)).toBeNull();
  });

  it('player 1 wins with a straight top-to-bottom column', () => {
    const moves: number[] = [];
    for (let r = 0; r < SIZE; r++) {
      moves.push(at(r, 0));
      if (r < SIZE - 1) moves.push(at(r, 5)); // white wanders in one column (never connects sides)
    }
    const s = play(moves);
    const st = e.getStatus(s);
    expect(st).toMatchObject({ state: 'won', winner: 1 });
    expect(st.state === 'won' && st.line).toHaveLength(SIZE);
  });

  it('player 2 wins left-to-right', () => {
    // White fills row 3 left to right; black plays scattered stones that never connect top to bottom.
    const blackStones = [
      at(0, 8),
      at(1, 8),
      at(2, 8),
      at(4, 8),
      at(5, 8),
      at(6, 8),
      at(7, 8),
      at(8, 8),
      at(9, 8),
      at(10, 9),
      at(10, 10),
    ];
    const seq: number[] = [];
    for (let c = 0; c < SIZE; c++) seq.push(blackStones[c], at(3, c));
    const s = play(seq);
    expect(e.getStatus(s)).toMatchObject({ state: 'won', winner: 2 });
  });

  it('connects through the hex diagonal (r-1, c+1) but not the other diagonal', () => {
    const cells = Array(SIZE * SIZE).fill(null);
    // zig-zag chain using only the connected diagonal: (r, c) -> (r+1, c-1)
    for (let r = 0; r < SIZE; r++) cells[at(r, SIZE - 1 - r)] = 1;
    expect(findChain(cells, 1)).not.toBeNull();
    const wrong = Array(SIZE * SIZE).fill(null);
    for (let r = 0; r < SIZE; r++) wrong[at(r, r)] = 1; // (r+1, c+1) is NOT adjacent in hex
    expect(findChain(wrong, 1)).toBeNull();
  });

  it('rejects moves after the game ends', () => {
    const moves: number[] = [];
    for (let r = 0; r < SIZE; r++) {
      moves.push(at(r, 0));
      if (r < SIZE - 1) moves.push(at(r, 5));
    }
    const s = play(moves);
    expect(e.applyMove(s, at(0, 9))).toBeNull();
    expect(e.legalMoves(s)).toEqual([]);
  });
});

describe('hex AI', () => {
  it('distance is 11 on an empty board and shrinks as stones are placed', () => {
    const empty = e.initialState().cells;
    expect(distance(empty, 1)).toBe(SIZE);
    const s: HexState = play([at(5, 5)]);
    expect(distance(s.cells, 1)).toBe(SIZE - 1);
  });

  it('completes an immediate winning connection', () => {
    const cells = Array(SIZE * SIZE).fill(null);
    for (let r = 0; r < SIZE - 1; r++) cells[at(r, 0)] = 1; // one cell short
    const s: HexState = { cells, current: 1, status: { state: 'playing' } };
    expect(getBestMove(s)).toBe(at(SIZE - 1, 0));
  });
});

describe('swap rule', () => {
  const first = hexEngine.applyMove(hexEngine.initialState(), 2 * SIZE + 5) as HexState;

  it('is offered to the second player only, right after the first stone', () => {
    expect(canSwap(hexEngine.initialState())).toBe(false);
    expect(canSwap(first)).toBe(true);
    expect(hexEngine.legalMoves(first)).toContain(SWAP);
    const second = hexEngine.applyMove(first, 0) as HexState;
    expect(canSwap(second)).toBe(false);
    expect(hexEngine.applyMove(second, SWAP)).toBeNull();
  });

  it('turns the stone into a mirrored stone of the second player and hands the move back', () => {
    const swapped = hexEngine.applyMove(first, SWAP) as HexState;
    expect(swapped.cells.filter((c) => c !== null)).toHaveLength(1);
    // row 2, column 5 becomes row 5, column 2
    expect(swapped.cells[5 * SIZE + 2]).toBe(2);
    expect(swapped.current).toBe(1);
    expect(canSwap(swapped)).toBe(false);
  });

  it('the computer takes a central opening and leaves an edge one', () => {
    const centre = hexEngine.applyMove(hexEngine.initialState(), 5 * SIZE + 5) as HexState;
    expect(getBestMove(centre)).toBe(SWAP);
    const corner = hexEngine.applyMove(hexEngine.initialState(), 0) as HexState;
    expect(getBestMove(corner)).not.toBe(SWAP);
  });
});
