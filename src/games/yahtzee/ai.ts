import type { Level } from '../../shared/level';
import {
  type Category,
  DICE,
  isYahtzee,
  openCategories,
  potentialScore,
  ROLLS_PER_TURN,
  type YahtzeeMove,
  type YahtzeeState,
} from './engine';

/** Rough average score of each box over a game; scoring above this is "good value". */
const AVERAGE: Record<Category, number> = {
  ones: 2.1,
  twos: 5.3,
  threes: 8.6,
  fours: 12.1,
  fives: 15.7,
  sixes: 19.2,
  threeKind: 21.7,
  fourKind: 13.1,
  fullHouse: 22.9,
  smallStraight: 29.5,
  largeStraight: 32.7,
  yahtzee: 16.9,
  chance: 22,
};

function bestCategory(s: YahtzeeState): Category {
  let best = openCategories(s)[0];
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const k of openCategories(s)) {
    const v = potentialScore(s, k) - AVERAGE[k];
    if (v > bestValue) {
      bestValue = v;
      best = k;
    }
  }
  return best;
}

/** Which dice to keep before the next roll. */
export function desiredHold(dice: number[]): boolean[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) c[d]++;
  const sorted = [...c].slice(1).sort();
  const full = c.includes(3) && c.includes(2);
  const run = (len: number) => {
    let r = 0;
    for (let v = 1; v <= 6; v++) {
      r = c[v] > 0 ? r + 1 : 0;
      if (r >= len) return v - len + 1; // start of the run
    }
    return 0;
  };
  if (isYahtzee(dice) || full || run(5)) return Array(DICE).fill(true);

  // Go for a straight when 4 in a row are already showing and no triple is held.
  const start = run(4);
  if (start && sorted[sorted.length - 1] < 3) {
    const used = new Set<number>();
    return dice.map((d) => {
      if (d >= start && d < start + 4 && !used.has(d)) {
        used.add(d);
        return true;
      }
      return false;
    });
  }

  // Otherwise keep the most common face (higher face wins ties).
  let face = 1;
  for (let v = 1; v <= 6; v++) if (c[v] >= c[face]) face = v;
  return dice.map((d) => d === face);
}

/** One micro-step at a time: roll, toggle a hold flag, or score. The caller re-invokes after each step. */
export function getBestMove(s: YahtzeeState): YahtzeeMove {
  if (s.rollsLeft === ROLLS_PER_TURN) return { kind: 'roll' };
  if (s.rollsLeft > 0) {
    const want = desiredHold(s.dice);
    const mismatch = want.findIndex((w, i) => w !== s.held[i]);
    if (mismatch >= 0) return { kind: 'hold', index: mismatch };
    if (!want.every(Boolean)) return { kind: 'roll' };
  }
  return { kind: 'score', category: bestCategory(s) };
}

/** Easy plays out one roll per turn, medium two, hard all three (and always keeps sensible dice). */
const MAX_ROLLS: Record<Level, number> = { easy: 1, medium: 2, hard: ROLLS_PER_TURN };

export function chooseMove(s: YahtzeeState, level: Level): YahtzeeMove {
  const rolled = ROLLS_PER_TURN - s.rollsLeft;
  if (rolled > 0 && rolled >= MAX_ROLLS[level]) return { kind: 'score', category: bestCategory(s) };
  return getBestMove(s);
}
