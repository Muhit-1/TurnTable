import type { PlayerId } from '../../shared/engine';
import { MILLS, type MorrisMove, type MorrisState, morrisEngine, movesFor } from './engine';

function evaluate(s: MorrisState, me: PlayerId): number {
  const opp: PlayerId = me === 1 ? 2 : 1;
  const count = (p: PlayerId) => s.points.filter((x) => x === p).length + s.hand[p];
  let score = (count(me) - count(opp)) * 100;
  // two-in-a-row with a free third point is a threat
  for (const m of MILLS) {
    const mine = m.filter((i) => s.points[i] === me).length;
    const theirs = m.filter((i) => s.points[i] === opp).length;
    const free = m.filter((i) => s.points[i] === null).length;
    if (mine === 2 && free === 1) score += 15;
    if (theirs === 2 && free === 1) score -= 20;
    if (mine === 3) score += 10;
  }
  score += (movesFor(s, me).length - movesFor(s, opp).length) * 2;
  return score;
}

function search(s: MorrisState, depth: number, alpha: number, beta: number, me: PlayerId): number {
  if (s.status.state === 'won') return s.status.winner === me ? 100000 + depth : -100000 - depth;
  if (s.status.state === 'draw') return 0;
  if (depth === 0) return evaluate(s, me);
  const maximizing = s.current === me;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const m of morrisEngine.legalMoves(s)) {
    const next = morrisEngine.applyMove(s, m);
    if (!next) continue;
    // a removal is part of the same turn, so it does not use up search depth
    const v = search(next, next.mustRemove ? depth : depth - 1, alpha, beta, me);
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

export function getBestMove(s: MorrisState, depth = 3): MorrisMove {
  const me = s.current;
  const moves = morrisEngine.legalMoves(s);
  let best = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const m of moves) {
    const next = morrisEngine.applyMove(s, m);
    if (!next) continue;
    const v = search(
      next,
      next.mustRemove ? depth : depth - 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      me,
    );
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}
