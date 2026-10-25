import type { Level } from '../../shared/level';
import {
  BISHOP,
  type ChessMove,
  type ChessState,
  colorOf,
  EMPTY,
  endReason,
  inCheck,
  KING,
  KNIGHT,
  legalMoves,
  makeMove,
  PAWN,
  QUEEN,
  ROOK,
  rowOf,
  typeOf,
} from './engine';

export type { Level };
export interface SearchOptions {
  maxDepth: number;
  timeMs: number;
  /** chance (0-1) of playing a random legal move instead of the best one */
  blunder?: number;
}
export const LEVELS: Record<Level, SearchOptions> = {
  easy: { maxDepth: 2, timeMs: 400, blunder: 0.25 },
  medium: { maxDepth: 4, timeMs: 1200 },
  hard: { maxDepth: 6, timeMs: 3000 },
};

export const MATE = 100000;
const VALUE = [0, 100, 320, 330, 500, 900, 0];

// Piece-square tables from White's point of view (row 0 = rank 8). Black mirrors vertically.
const PST: Record<number, number[]> = {
  [PAWN]: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25,
    10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0,
    0, 0, 0, 0, 0,
  ],
  [KNIGHT]: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20,
    0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  [BISHOP]: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5,
    5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0,
    0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  [ROOK]: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  [QUEEN]: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5,
    5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10,
    -10, -5, -5, -10, -10, -20,
  ],
};
const KING_MID = [
  -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50,
  -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20,
  -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
];
const KING_END = [
  -50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10,
  -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10,
  -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50,
];

/** Static evaluation in centipawns from the point of view of the side to move. */
export function evaluate(s: ChessState): number {
  let material = 0;
  let nonPawn = 0;
  for (const p of s.cells) {
    if (p !== EMPTY) {
      const t = typeOf(p);
      if (t !== PAWN && t !== KING) nonPawn += VALUE[t];
    }
  }
  const endgame = nonPawn <= 1400;
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = s.cells[i];
    if (p === EMPTY) continue;
    const t = typeOf(p);
    const white = colorOf(p) === 1;
    const idx = white ? i : (7 - rowOf(i)) * 8 + (i & 7);
    const table = t === KING ? (endgame ? KING_END : KING_MID) : PST[t];
    const v = VALUE[t] + table[idx];
    material += white ? v : -v;
  }
  score = material;
  return s.current === 1 ? score : -score;
}

class OutOfTime extends Error {}

const isCapture = (s: ChessState, m: ChessMove) =>
  s.cells[m.to] !== EMPTY ||
  !!m.promotion ||
  (typeOf(s.cells[m.from]) === PAWN && (m.from & 7) !== (m.to & 7));

function orderMoves(s: ChessState, moves: ChessMove[], first?: ChessMove): ChessMove[] {
  const score = (m: ChessMove) => {
    if (first && m.from === first.from && m.to === first.to && m.promotion === first.promotion) return 1e6;
    let v = 0;
    const victim = s.cells[m.to];
    if (victim !== EMPTY) v += 10 * VALUE[typeOf(victim)] - VALUE[typeOf(s.cells[m.from])] / 10;
    else if (isCapture(s, m)) v += 900; // en passant
    if (m.promotion) v += VALUE[m.promotion];
    return v;
  };
  return moves
    .map((m) => ({ m, k: score(m) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m);
}

export interface SearchResult {
  move: ChessMove | null;
  /** centipawns for the side to move; values beyond ±(MATE - 1000) mean forced mate */
  score: number;
  depth: number;
}

/** Iterative-deepening alpha-beta with quiescence search. Always returns the best move of the last finished depth. */
export function search(root: ChessState, options: SearchOptions): SearchResult {
  const rootMoves = legalMoves(root);
  if (rootMoves.length === 0) return { move: null, score: inCheck(root) ? -MATE : 0, depth: 0 };
  if (rootMoves.length === 1) return { move: rootMoves[0], score: 0, depth: 0 };

  const deadline = Date.now() + options.timeMs;
  let nodes = 0;
  const tick = () => {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw new OutOfTime();
  };

  const quiesce = (s: ChessState, alpha: number, beta: number, ply: number): number => {
    tick();
    const checked = inCheck(s);
    let best = -Infinity;
    if (!checked) {
      best = evaluate(s);
      if (best >= beta) return best;
      alpha = Math.max(alpha, best);
    }
    const all = legalMoves(s);
    if (all.length === 0) return checked ? -MATE + ply : 0;
    const moves = checked ? all : all.filter((m) => isCapture(s, m));
    for (const m of orderMoves(s, moves)) {
      const v = -quiesce(makeMove(s, m), -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  const negamax = (s: ChessState, depth: number, alpha: number, beta: number, ply: number): number => {
    tick();
    if (s.halfmove >= 100) return 0;
    const moves = legalMoves(s);
    if (moves.length === 0) return inCheck(s) ? -MATE + ply : 0;
    if (depth <= 0) return quiesce(s, alpha, beta, ply);
    let best = -Infinity;
    for (const m of orderMoves(s, moves)) {
      const v = -negamax(makeMove(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  let bestMove = rootMoves[0];
  let bestScore = -Infinity;
  let reached = 0;
  for (let depth = 1; depth <= options.maxDepth; depth++) {
    try {
      let alpha = -Infinity;
      let localBest = rootMoves[0];
      let localScore = -Infinity;
      for (const m of orderMoves(root, rootMoves, bestMove)) {
        const v = -negamax(makeMove(root, m), depth - 1, -Infinity, -alpha, 1);
        if (v > localScore) {
          localScore = v;
          localBest = m;
        }
        if (v > alpha) alpha = v;
      }
      bestMove = localBest;
      bestScore = localScore;
      reached = depth;
      if (Math.abs(bestScore) > MATE - 1000) break; // a forced mate was found
    } catch (e) {
      if (e instanceof OutOfTime) break;
      throw e;
    }
  }
  return { move: bestMove, score: bestScore, depth: reached };
}

/** The move the computer plays at a difficulty level. Weak levels sometimes play a random move. */
export function chooseMove(
  s: ChessState,
  level: Level,
  random: () => number = Math.random,
): ChessMove | null {
  const opts = LEVELS[level];
  const moves = legalMoves(s);
  if (moves.length === 0 || endReason(s)) return null;
  if (opts.blunder && random() < opts.blunder) return moves[Math.floor(random() * moves.length)];
  return search(s, opts).move;
}
