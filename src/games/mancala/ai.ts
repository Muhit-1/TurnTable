import type { PlayerId } from '../../shared/engine';
import { type MancalaState, mancalaEngine, P1_STORE, P2_STORE } from './engine';

function search(s: MancalaState, depth: number, alpha: number, beta: number, me: PlayerId): number {
  if (s.over || depth === 0) {
    const diff = s.slots[me === 1 ? P1_STORE : P2_STORE] - s.slots[me === 1 ? P2_STORE : P1_STORE];
    return s.over ? diff * 100 : diff;
  }
  const maximizing = s.current === me;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const m of mancalaEngine.legalMoves(s)) {
    const next = mancalaEngine.applyMove(s, m);
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

/** Alpha-beta over store difference. Extra turns are handled naturally because `current` does not change. */
export function getBestMove(s: MancalaState, depth = 8): number {
  const me = s.current;
  let best = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const m of mancalaEngine.legalMoves(s)) {
    const next = mancalaEngine.applyMove(s, m);
    if (!next) continue;
    const v = search(next, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, me);
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}
