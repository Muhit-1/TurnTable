import type { PlayerId } from '../../shared/engine';
import { type TttState, tttEngine } from './engine';

/** Full-depth minimax; the tree is tiny, so no pruning is needed. Prefers faster wins. */
function score(state: TttState, me: PlayerId, depth: number): number {
  const status = tttEngine.getStatus(state);
  if (status.state === 'won') return status.winner === me ? 10 - depth : depth - 10;
  if (status.state === 'draw') return 0;
  const results = tttEngine.legalMoves(state).map((m) => {
    const next = tttEngine.applyMove(state, m);
    return next ? score(next, me, depth + 1) : 0;
  });
  return state.current === me ? Math.max(...results) : Math.min(...results);
}

export function getBestMove(state: TttState): number {
  const me = state.current;
  let best = -Infinity;
  let bestMove = -1;
  for (const m of tttEngine.legalMoves(state)) {
    const next = tttEngine.applyMove(state, m);
    if (!next) continue;
    const s = score(next, me, 1);
    if (s > best) {
      best = s;
      bestMove = m;
    }
  }
  return bestMove;
}
