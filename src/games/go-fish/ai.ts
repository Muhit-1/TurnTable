import { countRank, type GoFishMove, type GoFishState, ranksHeld } from './engine';

/** Ask for the rank the opponent has shown interest in, else the rank held most often. */
export function getBestMove(s: GoFishState): GoFishMove {
  const me = s.current;
  const opp = me === 1 ? 2 : 1;
  const held = ranksHeld(s.hands[me]);
  const known = held.filter((r) => s.asked[opp].includes(r) && s.hands[opp].length > 0);
  const pool = known.length ? known : held;
  let best = pool[0];
  for (const r of pool) if (countRank(s.hands[me], r) > countRank(s.hands[me], best)) best = r;
  return { kind: 'ask', rank: best };
}
