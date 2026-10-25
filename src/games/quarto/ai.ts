import { type Level, maybeRandom } from '../../shared/level';
import { availablePieces, type QuartoMove, type QuartoState, quartoEngine, winningSquares } from './engine';

/**
 * Place: win if possible, otherwise play where it leaves the opponent the fewest winning gifts.
 * Give: hand over a piece that cannot win immediately, if one exists.
 */
export function getBestMove(s: QuartoState): QuartoMove {
  if (s.handed === null) {
    const pieces = availablePieces(s);
    const safe = pieces.filter((p) => winningSquares(s.board, p).length === 0);
    const pool = safe.length ? safe : pieces;
    return { kind: 'give', piece: pool[(s.board.filter((x) => x !== null).length * 5) % pool.length] };
  }

  const win = winningSquares(s.board, s.handed)[0];
  if (win !== undefined) return { kind: 'place', square: win };

  const empties = s.board.flatMap((p, i) => (p === null ? [i] : []));
  let best = empties[0];
  let bestRisk = Number.POSITIVE_INFINITY;
  for (const sq of empties) {
    const board = s.board.slice();
    board[sq] = s.handed;
    const rest = Array.from({ length: 16 }, (_, p) => p).filter((p) => !board.includes(p));
    // how many of the remaining pieces would win for the opponent after this placement
    const risk = rest.filter((p) => winningSquares(board, p).length > 0).length;
    if (risk < bestRisk) {
      bestRisk = risk;
      best = sq;
    }
  }
  return { kind: 'place', square: best };
}

export function chooseMove(s: QuartoState, level: Level, random: () => number = Math.random): QuartoMove {
  return maybeRandom(level, getBestMove(s), quartoEngine.legalMoves(s), random);
}
