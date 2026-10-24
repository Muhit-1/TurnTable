import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  availablePieces,
  quartoEngine as e,
  LINES,
  type QuartoMove,
  type QuartoState,
  traitOf,
  winningLine,
  winningSquares,
} from './engine';

const give = (piece: number): QuartoMove => ({ kind: 'give', piece });
const place = (square: number): QuartoMove => ({ kind: 'place', square });
const run = (s: QuartoState, ...moves: QuartoMove[]) => {
  let cur = s;
  for (const m of moves) {
    const n = e.applyMove(cur, m);
    if (!n) throw new Error(`illegal ${JSON.stringify(m)}`);
    cur = n;
  }
  return cur;
};

describe('quarto basics', () => {
  it('has 16 unique pieces, 10 lines, and each piece differs in at least one trait', () => {
    expect(LINES).toHaveLength(10);
    const s = e.initialState();
    expect(availablePieces(s)).toHaveLength(16);
    expect(
      new Set(Array.from({ length: 16 }, (_, p) => [0, 1, 2, 3].map((b) => traitOf(p, b)).join(''))).size,
    ).toBe(16);
  });

  it('the first move is a give by player 1; then player 2 places', () => {
    const s = e.initialState();
    expect(e.currentPlayer(s)).toBe(1);
    expect(e.legalMoves(s).every((m) => m.kind === 'give')).toBe(true);
    const s1 = run(s, give(3));
    expect(e.currentPlayer(s1)).toBe(2);
    expect(s1.handed).toBe(3);
    expect(e.legalMoves(s1).every((m) => m.kind === 'place')).toBe(true);
    expect(e.legalMoves(s1)).toHaveLength(16);
  });

  it('after placing, the same player gives, then the other places', () => {
    const s = run(e.initialState(), give(0), place(0));
    expect(s.current).toBe(2);
    expect(s.handed).toBeNull();
    expect(e.legalMoves(s).every((m) => m.kind === 'give')).toBe(true);
    expect(availablePieces(s)).not.toContain(0);
    const s2 = run(s, give(1));
    expect(s2.current).toBe(1);
  });

  it('rejects wrong-phase, repeated and out-of-range moves', () => {
    const s = e.initialState();
    expect(e.applyMove(s, place(0))).toBeNull(); // must give first
    expect(e.applyMove(s, give(16))).toBeNull();
    expect(e.applyMove(s, give(-1))).toBeNull();
    const s1 = run(s, give(5));
    expect(e.applyMove(s1, give(6))).toBeNull(); // must place
    expect(e.applyMove(s1, place(16))).toBeNull();
    const s2 = run(s1, place(0));
    expect(e.applyMove(s2, give(5))).toBeNull(); // 5 already on the board
    expect(e.applyMove(run(s2, give(6)), place(0))).toBeNull(); // occupied
  });
});

describe('quarto winning', () => {
  // pieces 0,2,4,6 share bit0 = 0 ("short"): row 0 of the board
  it('the placer wins by completing a line with a shared trait', () => {
    let s = e.initialState();
    // player 1 gives, player 2 places; roles alternate. Fill row 0 with short pieces 0,2,4,6 and never complete elsewhere.
    s = run(s, give(0), place(0), give(2), place(1), give(4), place(2), give(6));
    // player 1 now places piece 6 at square 3 and wins (player 1 placed after player 2 gave)
    expect(s.current).toBe(1);
    const won = run(s, place(3));
    expect(e.getStatus(won)).toMatchObject({ state: 'won', winner: 1 });
    expect(won.status.state === 'won' && won.status.line).toEqual([0, 1, 2, 3]);
    expect(e.legalMoves(won)).toEqual([]);
    expect(e.applyMove(won, give(7))).toBeNull();
  });

  it('mixed traits do not win: 0,1,2,... shares nothing across all four bits', () => {
    const board = Array(16).fill(null);
    [0b0000, 0b0111, 0b1010, 0b0101].forEach((p, i) => {
      board[i] = p;
    });
    expect(winningLine(board, [0, 1, 2, 3])).toBe(false);
  });

  it('a line needs four pieces', () => {
    const board = Array(16).fill(null);
    board[0] = 0;
    board[1] = 2;
    board[2] = 4;
    expect(winningLine(board, [0, 1, 2, 3])).toBe(false);
  });

  it('diagonals and columns count', () => {
    const board = Array(16).fill(null);
    [1, 3, 5, 7].forEach((p, i) => {
      board[i * 5] = p; // main diagonal, all share bit0 = 1
    });
    expect(winningLine(board, [0, 5, 10, 15])).toBe(true);
    const col = Array(16).fill(null);
    [0, 1, 2, 3].forEach((p, i) => {
      col[i * 4 + 2] = p * 4; // pieces 0,4,8,12: share bit0=0 and bit1=0
    });
    expect(winningLine(col, [2, 6, 10, 14])).toBe(true);
  });

  it('winningSquares finds the completing square for a piece', () => {
    const board = Array(16).fill(null);
    board[0] = 0;
    board[1] = 2;
    board[2] = 4; // short pieces
    expect(winningSquares(board, 6)).toEqual([3]); // short: wins
    expect(winningSquares(board, 1)).toEqual([3]); // tall, but pieces 0,2,4,1 all share bit 3 (solid)
    expect(winningSquares(board, 9)).toEqual([]); // tall and hollow: shares no trait with all of 0,2,4
  });

  it('a full board with no winning line is a draw', () => {
    // Known no-line arrangement check by search: place pieces so that no line shares a trait.
    const order = findDrawArrangement();
    expect(order).not.toBeNull();
    let s = e.initialState();
    const moves: QuartoMove[] = [];
    (order as number[]).forEach((piece, sq) => {
      moves.push(give(piece), place(sq));
    });
    s = run(s, ...moves);
    expect(e.getStatus(s)).toEqual({ state: 'draw' });
    expect(e.legalMoves(s)).toEqual([]);
  });
});

function findDrawArrangement(): number[] | null {
  const board: (number | null)[] = Array(16).fill(null);
  const used = new Set<number>();
  const order: number[] = [];
  const dfs = (sq: number): boolean => {
    if (sq === 16) return true;
    for (let p = 0; p < 16; p++) {
      if (used.has(p)) continue;
      board[sq] = p;
      const bad = LINES.some((l) => l.includes(sq) && winningLine(board, l));
      if (!bad) {
        used.add(p);
        order.push(p);
        if (dfs(sq + 1)) return true;
        order.pop();
        used.delete(p);
      }
      board[sq] = null;
    }
    return false;
  };
  return dfs(0) ? order : null;
}

describe('quarto AI', () => {
  it('takes a winning square when it has one', () => {
    const s: QuartoState = {
      board: [0, 2, 4, null, ...Array(12).fill(null)],
      handed: 6,
      current: 1,
      status: { state: 'playing' },
    };
    expect(getBestMove(s)).toEqual(place(3));
  });

  it('does not hand over a piece that wins immediately when a safe one exists', () => {
    const s: QuartoState = {
      board: [0, 2, 4, null, ...Array(12).fill(null)],
      handed: null,
      current: 1,
      status: { state: 'playing' },
    };
    const m = getBestMove(s);
    expect(m.kind).toBe('give');
    if (m.kind === 'give') expect(winningSquares(s.board, m.piece)).toEqual([]);
  });

  it('plays full games against itself with only legal moves', () => {
    let s = e.initialState();
    let n = 0;
    while (e.getStatus(s).state === 'playing' && n++ < 100) {
      const m = getBestMove(s);
      const next = e.applyMove(s, m);
      expect(next, JSON.stringify(m)).not.toBeNull();
      if (!next) break;
      s = next;
    }
    expect(e.getStatus(s).state).not.toBe('playing');
  });
});
