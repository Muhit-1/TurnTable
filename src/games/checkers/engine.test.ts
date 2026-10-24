import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  type Cell,
  type CheckersState,
  countPieces,
  checkersEngine as e,
  movesFor,
  QUIET_LIMIT,
  SIZE,
} from './engine';

const at = (r: number, c: number) => r * SIZE + c;
const empty = (): Cell[] => Array<Cell>(SIZE * SIZE).fill(null);
const man = (owner: 1 | 2): Cell => ({ owner, king: false });
const king = (owner: 1 | 2): Cell => ({ owner, king: true });
const st = (cells: Cell[], current: 1 | 2 = 1, quiet = 0): CheckersState => ({ cells, current, quiet });

describe('checkers setup', () => {
  it('12 men each on dark squares; player 1 has the 7 standard opening moves', () => {
    const s = e.initialState();
    expect(countPieces(s.cells)).toEqual({ 1: { men: 12, kings: 0 }, 2: { men: 12, kings: 0 } });
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (s.cells[at(r, c)]) expect((r + c) % 2).toBe(1);
    expect(e.legalMoves(s)).toHaveLength(7);
    expect(s.current).toBe(1);
  });
});

describe('checkers moves', () => {
  it('men move forward diagonally only, one square', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    const moves = movesFor(cells, 1)
      .map((m) => m.join('-'))
      .sort();
    expect(moves).toEqual([`${at(5, 2)}-${at(4, 1)}`, `${at(5, 2)}-${at(4, 3)}`].sort());
  });

  it('men cannot move backward or onto occupied squares', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    cells[at(4, 1)] = man(1);
    cells[at(4, 3)] = man(2);
    cells[at(3, 4)] = man(2); // blocks the jump
    expect(movesFor(cells, 1).filter((m) => m[0] === at(5, 2))).toEqual([]);
  });

  it('kings move in all four directions', () => {
    const cells = empty();
    cells[at(4, 3)] = king(1);
    expect(movesFor(cells, 1)).toHaveLength(4);
  });

  it('rejects illegal moves: wrong piece, backward, off-board, wrong player', () => {
    const s = e.initialState();
    expect(e.applyMove(s, [at(5, 0), at(5, 2)])).toBeNull();
    expect(e.applyMove(s, [at(2, 1), at(3, 0)])).toBeNull(); // player 2's piece
    expect(e.applyMove(s, [at(6, 1), at(5, 0)])).toBeNull(); // blocked by own piece
    expect(e.applyMove(s, [99, 3])).toBeNull();
    expect(e.applyMove(s, [])).toBeNull();
  });

  it('plays a normal move and passes the turn', () => {
    const s = e.applyMove(e.initialState(), [at(5, 0), at(4, 1)]);
    expect(s?.current).toBe(2);
    expect(s?.cells[at(4, 1)]).toEqual(man(1));
    expect(s?.cells[at(5, 0)]).toBeNull();
  });
});

describe('checkers captures', () => {
  it('a capture removes the jumped piece', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    cells[at(4, 3)] = man(2);
    cells[at(0, 7)] = man(2); // keep player 2 alive
    const n = e.applyMove(st(cells), [at(5, 2), at(3, 4)]);
    expect(n?.cells[at(4, 3)]).toBeNull();
    expect(n?.cells[at(3, 4)]).toEqual(man(1));
  });

  it('capturing is mandatory: simple moves are illegal when a jump exists', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    cells[at(4, 3)] = man(2);
    cells[at(6, 7)] = man(1); // has a simple move, but must capture instead
    cells[at(0, 7)] = man(2);
    const moves = e.legalMoves(st(cells));
    expect(moves).toEqual([[at(5, 2), at(3, 4)]]);
    expect(e.applyMove(st(cells), [at(6, 7), at(5, 6)])).toBeNull();
  });

  it('multi-jumps must be completed in one move', () => {
    const cells = empty();
    cells[at(6, 1)] = man(1);
    cells[at(5, 2)] = man(2);
    cells[at(3, 4)] = man(2);
    cells[at(0, 7)] = man(2);
    const moves = e.legalMoves(st(cells));
    expect(moves).toEqual([[at(6, 1), at(4, 3), at(2, 5)]]);
    expect(e.applyMove(st(cells), [at(6, 1), at(4, 3)])).toBeNull(); // stopping early is illegal
    const n = e.applyMove(st(cells), moves[0]);
    expect(n?.cells[at(5, 2)]).toBeNull();
    expect(n?.cells[at(3, 4)]).toBeNull();
    expect(n?.cells[at(2, 5)]).toEqual(man(1));
  });

  it('offers a choice of branches when a jump can go two ways', () => {
    const cells = empty();
    cells[at(6, 3)] = man(1);
    cells[at(5, 2)] = man(2);
    cells[at(5, 4)] = man(2);
    cells[at(0, 7)] = man(2);
    const moves = e.legalMoves(st(cells));
    expect(moves.map((m) => m.join('-')).sort()).toEqual(
      [`${at(6, 3)}-${at(4, 1)}`, `${at(6, 3)}-${at(4, 5)}`].sort(),
    );
  });

  it('men cannot capture backwards, kings can', () => {
    const cells = empty();
    cells[at(3, 2)] = man(1);
    cells[at(4, 3)] = man(2); // behind the man (towards row 7), with an empty square beyond
    cells[at(0, 7)] = man(2);
    expect(movesFor(cells, 1).sort()).toEqual(
      [
        [at(3, 2), at(2, 1)],
        [at(3, 2), at(2, 3)],
      ].sort(),
    );
    cells[at(3, 2)] = king(1);
    expect(movesFor(cells, 1)).toEqual([[at(3, 2), at(5, 4)]]);
  });

  it('cannot jump over two pieces in a row', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    cells[at(4, 3)] = man(2);
    cells[at(3, 4)] = man(2); // landing square is occupied, so (4,3) is safe
    expect(movesFor(cells, 1)).toEqual([[at(5, 2), at(4, 1)]]);
  });

  it('a piece cannot be captured twice in one move', () => {
    const cells = empty();
    cells[at(7, 0)] = king(1);
    cells[at(6, 1)] = man(2);
    cells[at(4, 3)] = man(2);
    cells[at(4, 1)] = man(2);
    cells[at(0, 7)] = man(2);
    for (const m of movesFor(cells, 1)) {
      const taken = new Set<number>();
      for (let k = 1; k < m.length; k++) {
        const mid = (m[k - 1] + m[k]) / 2;
        expect(taken.has(mid)).toBe(false);
        taken.add(mid);
      }
    }
  });
});

describe('checkers kings', () => {
  it('a man reaching the far row is crowned', () => {
    const cells = empty();
    cells[at(1, 2)] = man(1);
    cells[at(7, 6)] = man(2);
    const n = e.applyMove(st(cells), [at(1, 2), at(0, 1)]);
    expect(n?.cells[at(0, 1)]).toEqual(king(1));
  });

  it('crowning by capture ends the move even if another jump would be possible', () => {
    const cells = empty();
    cells[at(2, 3)] = man(1);
    cells[at(1, 2)] = man(2); // jump to (0,1) and be crowned
    cells[at(1, 0)] = man(2); // a king at (0,1) could jump this backwards... but the move must stop
    cells[at(7, 6)] = man(2);
    const moves = e.legalMoves(st(cells));
    expect(moves).toEqual([[at(2, 3), at(0, 1)]]);
    const n = e.applyMove(st(cells), moves[0]);
    expect(n?.cells[at(0, 1)]).toEqual(king(1));
    expect(n?.cells[at(1, 0)]).toEqual(man(2));
  });

  it('player 2 is crowned on row 7', () => {
    const cells = empty();
    cells[at(6, 3)] = man(2);
    cells[at(0, 1)] = man(1);
    const n = e.applyMove(st(cells, 2), [at(6, 3), at(7, 2)]);
    expect(n?.cells[at(7, 2)]).toEqual(king(2));
  });
});

describe('checkers end of game', () => {
  it('a player with no pieces loses', () => {
    const cells = empty();
    cells[at(4, 3)] = man(1);
    const s = st(cells, 2);
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, [at(4, 3), at(3, 2)])).toBeNull();
  });

  it('a blocked player loses', () => {
    const cells = empty();
    cells[at(0, 1)] = man(2);
    cells[at(1, 0)] = man(1);
    cells[at(1, 2)] = man(1);
    cells[at(2, 3)] = man(1); // protects (1,2) from being jumped
    // player 2's man on (0,1) moves down: (1,0) and (1,2) occupied, jumps land on (2,-1)/(2,3) -> blocked
    expect(e.getStatus(st(cells, 2))).toEqual({ state: 'won', winner: 1 });
  });

  it('a long stretch of king shuffles with no capture is a draw', () => {
    const cells = empty();
    cells[at(0, 1)] = king(1);
    cells[at(7, 6)] = king(2);
    expect(e.getStatus(st(cells, 1, QUIET_LIMIT - 1)).state).toBe('playing');
    expect(e.getStatus(st(cells, 1, QUIET_LIMIT)).state).toBe('draw');
    const n = e.applyMove(st(cells, 1, QUIET_LIMIT - 1), [at(0, 1), at(1, 0)]);
    expect(n && e.getStatus(n).state).toBe('draw');
  });

  it('moving a man or capturing resets the quiet counter', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    cells[at(0, 1)] = king(2);
    const n = e.applyMove(st(cells, 1, 30), [at(5, 2), at(4, 1)]);
    expect(n?.quiet).toBe(0);
  });
});

describe('checkers AI', () => {
  it('returns a legal move from the start', () => {
    const s = e.initialState();
    const m = getBestMove(s, 4);
    expect(e.applyMove(s, m)).not.toBeNull();
  });

  it('takes a free capture rather than ignoring material', () => {
    const cells = empty();
    cells[at(5, 2)] = man(1);
    cells[at(4, 3)] = man(2);
    cells[at(0, 7)] = man(2);
    expect(getBestMove(st(cells), 4)).toEqual([at(5, 2), at(3, 4)]);
  });

  it('plays a complete game against itself with only legal moves', () => {
    let s = e.initialState();
    let plies = 0;
    while (e.getStatus(s).state === 'playing' && plies++ < 400) {
      const m = getBestMove(s, 2);
      const n = e.applyMove(s, m);
      expect(n, `ply ${plies}`).not.toBeNull();
      if (!n) break;
      s = n;
    }
    expect(e.getStatus(s).state).not.toBe('playing');
  });
});
