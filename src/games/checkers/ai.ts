import type { PlayerId } from '../../shared/engine';
import { type Level, maybeRandom } from '../../shared/level';
import { type Cell, type CheckersState, checkersEngine, SIZE } from './engine';

function evaluate(cells: Cell[], me: PlayerId): number {
  let score = 0;
  for (let i = 0; i < cells.length; i++) {
    const p = cells[i];
    if (!p) continue;
    const row = Math.floor(i / SIZE);
    const advance = p.owner === 1 ? SIZE - 1 - row : row; // 0..7 rows travelled
    const value = p.king ? 175 : 100 + advance * 4;
    score += p.owner === me ? value : -value;
  }
  return score;
}

function search(s: CheckersState, depth: number, alpha: number, beta: number, me: PlayerId): number {
  const status = checkersEngine.getStatus(s);
  if (status.state === 'won') return status.winner === me ? 100000 + depth : -100000 - depth;
  if (status.state === 'draw') return 0;
  if (depth === 0) return evaluate(s.cells, me);
  const maximizing = s.current === me;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const m of checkersEngine.legalMoves(s)) {
    const next = checkersEngine.applyMove(s, m);
    if (!next) continue;
    const v = search(next, depth - 1, alpha, beta, me);
    if (maximizing) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function getBestMove(s: CheckersState, depth = 6): number[] {
  const me = s.current;
  let best: number[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const m of checkersEngine.legalMoves(s)) {
    const next = checkersEngine.applyMove(s, m);
    if (!next) continue;
    const v = search(next, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, me);
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}

const DEPTH: Record<Level, number> = { easy: 2, medium: 4, hard: 6 };

export function chooseMove(s: CheckersState, level: Level, random: () => number = Math.random): number[] {
  return maybeRandom(level, getBestMove(s, DEPTH[level]), checkersEngine.legalMoves(s), random);
}
