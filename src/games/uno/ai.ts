import { COLORS, type Color, isWild, type UnoMove, type UnoState, unoEngine } from './engine';

/** Play coloured cards first (action cards early), save wilds for when stuck, and pick the colour held most. */
export function getBestMove(s: UnoState): UnoMove {
  const moves = unoEngine.legalMoves(s);
  const hand = s.hands[s.current];
  const plays = moves.filter((m): m is Extract<UnoMove, { kind: 'play' }> => m.kind === 'play');
  if (plays.length === 0) return moves[0]; // draw (or pass after an unplayable draw)

  const count = (c: Color) => hand.filter((x) => x.color === c).length;
  const bestColor = COLORS.reduce((a, b) => (count(b) > count(a) ? b : a), COLORS[0]);

  let best = plays[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const m of plays) {
    const card = hand[m.index];
    let score: number;
    if (isWild(card)) {
      if (m.color !== bestColor) continue; // only consider the sensible colour
      score = card.value === 'wild4' ? -30 : -20;
      if (hand.length === 1) score += 100; // playing the last card wins
    } else {
      score = typeof card.value === 'number' ? 10 + card.value / 10 : 15; // action cards (skip/draw) pressure the opponent
      if (card.color === bestColor) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
