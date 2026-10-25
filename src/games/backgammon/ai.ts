import type { PlayerId } from '../../shared/engine';
import { type Level, maybeRandom } from '../../shared/level';
import { applyStep, type BgMove, type BgState, backgammonEngine, countAt, POINTS, pipCount } from './engine';

/** Heuristic value of a position for `me`: race lead, hits, safe points and exposed blots. */
function evaluate(s: BgState, me: PlayerId): number {
  const opp: PlayerId = me === 1 ? 2 : 1;
  let score = pipCount(s, opp) - pipCount(s, me);
  score += (s.bar[opp] - s.bar[me]) * 20;
  score += (s.off[me] - s.off[opp]) * 15;
  for (let i = 0; i < POINTS; i++) {
    const mine = countAt(s.points, me, i);
    if (mine === 1) score -= 6; // blot
    if (mine >= 2) score += 3; // made point
  }
  return score;
}

/** Rolls when needed; otherwise plays the checker move whose resulting position scores best. */
export function getBestMove(s: BgState): BgMove {
  const moves = backgammonEngine.legalMoves(s);
  if (moves.length === 1 || moves[0].kind === 'roll') return moves[0];
  let best = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const m of moves) {
    if (m.kind !== 'move') continue;
    const v = evaluate(applyStep(s, s.current, { from: m.from, to: m.to }), s.current);
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}

export function chooseMove(s: BgState, level: Level, random: () => number = Math.random): BgMove {
  const best = getBestMove(s);
  if (best.kind !== 'move') return best;
  return maybeRandom(
    level,
    best,
    backgammonEngine.legalMoves(s).filter((m) => m.kind === 'move'),
    random,
  );
}
