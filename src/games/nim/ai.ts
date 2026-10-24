import type { NimMove, NimState } from './engine';

const nimSum = (piles: number[]) => piles.reduce((a, b) => a ^ b, 0);

/** Optimal Nim play via nim-sum, with the standard misère adjustment near the end. */
export function getBestMove(s: NimState): NimMove {
  const { piles, misere } = s;
  const big = piles.filter((p) => p > 1).length;

  if (misere && big <= 1) {
    // Endgame: leave an odd number of piles of size 1.
    const ones = piles.filter((p) => p === 1).length;
    const bigIdx = piles.findIndex((p) => p > 1);
    if (bigIdx >= 0) {
      return { pile: bigIdx, count: piles[bigIdx] - (ones % 2 === 0 ? 1 : 0) };
    }
    return { pile: piles.indexOf(1), count: 1 };
  }

  const x = nimSum(piles);
  if (x !== 0) {
    for (let i = 0; i < piles.length; i++) {
      const target = piles[i] ^ x;
      if (target < piles[i]) return { pile: i, count: piles[i] - target };
    }
  }
  // Losing position: take one from the largest pile and hope for a mistake.
  const i = piles.indexOf(Math.max(...piles));
  return { pile: i, count: 1 };
}
