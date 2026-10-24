import { describe, expect, it } from 'vitest';
import { chooseMove, evaluate, LEVELS, MATE, search } from './ai';
import {
  type ChessState,
  chessEngine as e,
  endReason,
  fromFen,
  parseSquare,
  START_FEN,
  squareName,
} from './engine';

const name = (m: { from: number; to: number } | null) =>
  m ? `${squareName(m.from)}${squareName(m.to)}` : 'none';
const quick = { maxDepth: 3, timeMs: 5000 };

describe('evaluation', () => {
  it('is zero-ish for the symmetrical start and favours the side with more material', () => {
    expect(evaluate(fromFen(START_FEN))).toBe(0);
    const up = fromFen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
    expect(evaluate(up)).toBeGreaterThan(800);
    expect(evaluate({ ...up, current: 2 })).toBeLessThan(-800); // from Black's view it is bad
  });

  it('prefers knights in the centre', () => {
    const centre = fromFen('4k3/8/8/8/3N4/8/8/4K3 w - - 0 1');
    const rim = fromFen('4k3/8/8/8/8/8/8/N3K3 w - - 0 1');
    expect(evaluate(centre)).toBeGreaterThan(evaluate(rim));
  });
});

describe('search', () => {
  it('finds mate in one', () => {
    const s = fromFen('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    const r = search(s, quick);
    expect(name(r.move)).toBe('a1a8');
    expect(r.score).toBeGreaterThan(MATE - 1000);
  });

  it("finds Scholar's mate", () => {
    const s = fromFen('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
    expect(name(search(s, quick).move)).toBe('h5f7');
  });

  it("finds Légal's mate in two (Nf6+ then Bxf7#)", () => {
    const s = fromFen('r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1');
    const r = search(s, { maxDepth: 4, timeMs: 20000 });
    expect(name(r.move)).toBe('d5f6');
    expect(r.score).toBeGreaterThan(MATE - 1000);
  });

  it('takes a free queen rather than ignoring it', () => {
    const s = fromFen('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1');
    expect(name(search(s, quick).move)).toBe('d1d5');
  });

  it('does not walk into a one-move capture of its queen', () => {
    // the queen can take a defended pawn on d5 and be recaptured; a sensible engine declines
    const s = fromFen('4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1');
    expect(name(search(s, quick).move)).not.toBe('d1d5');
  });

  it('as Black, finds the mate in one too', () => {
    const s = fromFen('r3k3/8/8/8/8/8/5PPP/6K1 b - - 0 1');
    expect(name(search(s, quick).move)).toBe('a8a1');
  });

  it('returns the only legal move instantly', () => {
    const forced = fromFen('7k/8/8/8/8/8/6q1/7K w - - 0 1'); // the king must capture the queen
    const r = search(forced, quick);
    expect(name(r.move)).toBe('h1g2');
    expect(r.depth).toBe(0);
  });

  it('returns no move (and a mate score) when the game is already over', () => {
    const mated = fromFen('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
    expect(endReason(mated)).toBe('checkmate');
    expect(search(mated, quick)).toEqual({ move: null, score: -MATE, depth: 0 });
    const stalemate = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(search(stalemate, quick)).toEqual({ move: null, score: 0, depth: 0 });
    expect(chooseMove(mated, 'hard')).toBeNull();
  });

  it('respects its time limit even at a large depth', () => {
    const t0 = Date.now();
    const r = search(fromFen('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'), {
      maxDepth: 20,
      timeMs: 400,
    });
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(r.move).not.toBeNull();
    expect(r.depth).toBeGreaterThanOrEqual(1);
  });

  it('always returns a legal move at every level', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const s = fromFen(START_FEN);
      const m = chooseMove(s, level);
      expect(m && e.applyMove(s, m)).not.toBeNull();
    }
    expect(Object.keys(LEVELS)).toEqual(['easy', 'medium', 'hard']);
  });

  it('plays a whole game against itself with only legal moves', () => {
    let s: ChessState = fromFen(START_FEN);
    let plies = 0;
    while (!endReason(s) && plies++ < 120) {
      const m = search(s, { maxDepth: 2, timeMs: 1000 }).move;
      expect(m).not.toBeNull();
      const next = e.applyMove(s, m as NonNullable<typeof m>);
      expect(next, `ply ${plies}`).not.toBeNull();
      s = next as ChessState;
    }
    expect(plies).toBeGreaterThan(10);
  }, 120000);
});

describe('parse helpers used by the search tests', () => {
  it('squares map as expected', () => {
    expect(squareName(parseSquare('d1'))).toBe('d1');
  });
});
