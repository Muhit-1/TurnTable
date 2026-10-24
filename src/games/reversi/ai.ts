import type { PlayerId } from '../../shared/engine';
import { type Cell, flipsFor, movesFor, type ReversiState, reversiEngine, SIZE } from './engine';

// Corners are gold, squares next to corners are poison, edges are decent.
const WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
];

function evaluate(cells: Cell[], me: PlayerId): number {
  const opp: PlayerId = me === 1 ? 2 : 1;
  let score = 0;
  for (let i = 0; i < cells.length; i++) {
    const w = WEIGHTS[Math.floor(i / SIZE)][i % SIZE];
    if (cells[i] === me) score += w;
    else if (cells[i] === opp) score -= w;
  }
  score += (movesFor(cells, me).length - movesFor(cells, opp).length) * 5; // mobility
  return score;
}

function search(s: ReversiState, depth: number, alpha: number, beta: number, me: PlayerId): number {
  if (s.over) {
    const st = reversiEngine.getStatus(s);
    if (st.state === 'draw') return 0;
    return st.state === 'won' && st.winner === me ? 100000 : -100000;
  }
  if (depth === 0) return evaluate(s.cells, me);
  const maximizing = s.current === me;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const m of movesFor(s.cells, s.current)) {
    const next = reversiEngine.applyMove(s, m);
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

export function getBestMove(s: ReversiState, depth = 4): number {
  const me = s.current;
  let best = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const m of movesFor(s.cells, me)) {
    const next = reversiEngine.applyMove(s, m);
    if (!next) continue;
    const v = search(next, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, me);
    if (
      v > bestScore ||
      (v === bestScore && flipsFor(s.cells, m, me).length > flipsFor(s.cells, best, me).length)
    ) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}
