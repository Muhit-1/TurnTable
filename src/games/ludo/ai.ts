import {
  HOME,
  LAST_TRACK,
  type LudoMove,
  type LudoState,
  movableTokens,
  SAFE_SQUARES,
  trackSquare,
} from './engine';

/** Roll when needed; otherwise pick the token move with the best simple score. */
export function getBestMove(s: LudoState): LudoMove {
  if (s.dice === null) return { kind: 'roll' };
  const me = s.current;
  const opp = me === 1 ? 2 : 1;
  let best = movableTokens(s, me, s.dice)[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const t of movableTokens(s, me, s.dice)) {
    const from = s.tokens[me][t];
    const to = from === -1 ? 0 : from + s.dice;
    let score = to; // prefer the furthest-advanced token
    if (to === HOME) score += 1000;
    if (from === -1) score += 60; // getting out of the yard is valuable
    const sq = trackSquare(me, to);
    if (sq !== null && !SAFE_SQUARES.includes(sq) && s.tokens[opp].some((p) => trackSquare(opp, p) === sq))
      score += 500; // capture
    if (to > LAST_TRACK) score += 40; // safe in the home column
    // moving a token out of an enemy's range (1-6 squares behind) is good
    const here = trackSquare(me, from);
    if (
      here !== null &&
      s.tokens[opp].some((p) => {
        const o = trackSquare(opp, p);
        return o !== null && (here - o + 52) % 52 >= 1 && (here - o + 52) % 52 <= 6;
      })
    )
      score += 30;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return { kind: 'move', token: best };
}
