import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';
import { nextInt, randomSeed } from '../../shared/rng';

export const CATEGORIES = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'threeKind',
  'fourKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'yahtzee',
  'chance',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const UPPER: Category[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;
export const YAHTZEE_BONUS = 100;
export const DICE = 5;
export const ROLLS_PER_TURN = 3;

export type YahtzeeMove =
  | { kind: 'roll' }
  | { kind: 'hold'; index: number } // toggles whether die `index` is kept
  | { kind: 'score'; category: Category };

export interface Scorecard {
  scores: Record<Category, number | null>;
  /** number of extra Yahtzees scored on top of a 50 in the Yahtzee box */
  bonuses: number;
}

export interface YahtzeeState {
  dice: number[]; // 5 values 1-6; zeros before the first roll of a turn
  held: boolean[];
  rollsLeft: number;
  cards: Record<PlayerId, Scorecard>;
  current: PlayerId;
  seed: number;
}

const counts = (dice: number[]) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) c[d]++;
  return c;
};
const sum = (dice: number[]) => dice.reduce((a, b) => a + b, 0);
export const isYahtzee = (dice: number[]) => dice.every((d) => d > 0 && d === dice[0]);

function hasRun(dice: number[], length: number): boolean {
  const c = counts(dice);
  let run = 0;
  for (let v = 1; v <= 6; v++) {
    run = c[v] > 0 ? run + 1 : 0;
    if (run >= length) return true;
  }
  return false;
}

/** Raw score of `dice` in `category`. `joker` awards fixed-value categories in full (extra Yahtzee rule). */
export function scoreFor(category: Category, dice: number[], joker = false): number {
  const c = counts(dice);
  const upperIdx = UPPER.indexOf(category);
  if (upperIdx >= 0) return c[upperIdx + 1] * (upperIdx + 1);
  switch (category) {
    case 'threeKind':
      return c.some((n) => n >= 3) ? sum(dice) : 0;
    case 'fourKind':
      return c.some((n) => n >= 4) ? sum(dice) : 0;
    case 'fullHouse':
      return joker || (c.includes(3) && c.includes(2)) ? 25 : 0;
    case 'smallStraight':
      return joker || hasRun(dice, 4) ? 30 : 0;
    case 'largeStraight':
      return joker || hasRun(dice, 5) ? 40 : 0;
    case 'yahtzee':
      return isYahtzee(dice) ? 50 : 0;
    case 'chance':
      return sum(dice);
    default:
      return 0;
  }
}

export const upperTotal = (card: Scorecard) => UPPER.reduce((a, k) => a + (card.scores[k] ?? 0), 0);
export const upperBonus = (card: Scorecard) => (upperTotal(card) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0);
export const totalScore = (card: Scorecard) =>
  CATEGORIES.reduce((a, k) => a + (card.scores[k] ?? 0), 0) + upperBonus(card) + card.bonuses * YAHTZEE_BONUS;

const emptyCard = (): Scorecard => ({
  scores: Object.fromEntries(CATEGORIES.map((k) => [k, null])) as Record<Category, number | null>,
  bonuses: 0,
});

const isFull = (card: Scorecard) => CATEGORIES.every((k) => card.scores[k] !== null);
const rolled = (s: YahtzeeState) => s.rollsLeft < ROLLS_PER_TURN;

/** Extra Yahtzee while the Yahtzee box already holds 50: +100 bonus and joker scoring. */
const bonusApplies = (s: YahtzeeState) => isYahtzee(s.dice) && s.cards[s.current].scores.yahtzee === 50;

export function openCategories(s: YahtzeeState): Category[] {
  return CATEGORIES.filter((k) => s.cards[s.current].scores[k] === null);
}

/** What `category` would be worth right now, including the joker rule. */
export function potentialScore(s: YahtzeeState, category: Category): number {
  return scoreFor(category, s.dice, bonusApplies(s));
}

export function createYahtzee(fixedSeed?: number): GameEngine<YahtzeeState, YahtzeeMove> {
  const isOver = (s: YahtzeeState) => isFull(s.cards[1]) && isFull(s.cards[2]);
  return {
    initialState: () => ({
      dice: Array(DICE).fill(0),
      held: Array(DICE).fill(false),
      rollsLeft: ROLLS_PER_TURN,
      cards: { 1: emptyCard(), 2: emptyCard() },
      current: 1,
      seed: fixedSeed ?? randomSeed(),
    }),
    currentPlayer: (s) => s.current,
    legalMoves(s) {
      if (isOver(s)) return [];
      const moves: YahtzeeMove[] = [];
      if (s.rollsLeft > 0) moves.push({ kind: 'roll' });
      if (rolled(s) && s.rollsLeft > 0) for (let i = 0; i < DICE; i++) moves.push({ kind: 'hold', index: i });
      if (rolled(s)) for (const category of openCategories(s)) moves.push({ kind: 'score', category });
      return moves;
    },
    applyMove(s, move) {
      if (isOver(s)) return null;
      switch (move.kind) {
        case 'roll': {
          if (s.rollsLeft === 0) return null;
          let seed = s.seed;
          const dice = s.dice.slice();
          for (let i = 0; i < DICE; i++) {
            if (rolled(s) && s.held[i]) continue;
            let r: number;
            [r, seed] = nextInt(seed, 6);
            dice[i] = r + 1;
          }
          return { ...s, dice, seed, rollsLeft: s.rollsLeft - 1 };
        }
        case 'hold': {
          if (!rolled(s) || s.rollsLeft === 0) return null;
          if (!Number.isInteger(move.index) || move.index < 0 || move.index >= DICE) return null;
          const held = s.held.slice();
          held[move.index] = !held[move.index];
          return { ...s, held };
        }
        case 'score': {
          if (!rolled(s) || !(CATEGORIES as readonly string[]).includes(move.category)) return null;
          const card = s.cards[s.current];
          if (card.scores[move.category] !== null) return null;
          const bonus = bonusApplies(s);
          const next: Scorecard = {
            scores: { ...card.scores, [move.category]: scoreFor(move.category, s.dice, bonus) },
            bonuses: card.bonuses + (bonus ? 1 : 0),
          };
          return {
            ...s,
            cards: { ...s.cards, [s.current]: next },
            current: s.current === 1 ? 2 : 1,
            dice: Array(DICE).fill(0),
            held: Array(DICE).fill(false),
            rollsLeft: ROLLS_PER_TURN,
          };
        }
        default:
          return null;
      }
    },
    getStatus(s): Outcome {
      if (!isOver(s)) return { state: 'playing' };
      const a = totalScore(s.cards[1]);
      const b = totalScore(s.cards[2]);
      if (a === b) return { state: 'draw' };
      return { state: 'won', winner: a > b ? 1 : 2 };
    },
  };
}

export const yahtzeeEngine = createYahtzee();
