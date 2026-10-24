import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  createYahtzee,
  potentialScore,
  scoreFor,
  totalScore,
  upperBonus,
  type YahtzeeMove,
  type YahtzeeState,
} from './engine';

const e = createYahtzee(42);
const roll: YahtzeeMove = { kind: 'roll' };
const withDice = (dice: number[], over: Partial<YahtzeeState> = {}): YahtzeeState => ({
  ...e.initialState(),
  dice,
  rollsLeft: 2,
  ...over,
});

describe('yahtzee scoring', () => {
  it('upper section counts matching faces', () => {
    expect(scoreFor('ones', [1, 1, 2, 3, 1])).toBe(3);
    expect(scoreFor('sixes', [6, 6, 6, 6, 1])).toBe(24);
    expect(scoreFor('fours', [1, 2, 3, 5, 6])).toBe(0);
  });

  it('three and four of a kind score the dice total, otherwise 0', () => {
    expect(scoreFor('threeKind', [3, 3, 3, 4, 5])).toBe(18);
    expect(scoreFor('threeKind', [3, 3, 4, 4, 5])).toBe(0);
    expect(scoreFor('fourKind', [2, 2, 2, 2, 6])).toBe(14);
    expect(scoreFor('fourKind', [2, 2, 2, 3, 6])).toBe(0);
    expect(scoreFor('threeKind', [4, 4, 4, 4, 4])).toBe(20);
  });

  it('full house is 3+2 and a Yahtzee does not count without the joker', () => {
    expect(scoreFor('fullHouse', [2, 2, 3, 3, 3])).toBe(25);
    expect(scoreFor('fullHouse', [2, 2, 2, 2, 3])).toBe(0);
    expect(scoreFor('fullHouse', [4, 4, 4, 4, 4])).toBe(0);
    expect(scoreFor('fullHouse', [4, 4, 4, 4, 4], true)).toBe(25);
  });

  it('straights', () => {
    expect(scoreFor('smallStraight', [1, 2, 3, 4, 6])).toBe(30);
    expect(scoreFor('smallStraight', [3, 4, 5, 6, 6])).toBe(30);
    expect(scoreFor('smallStraight', [1, 2, 3, 5, 6])).toBe(0);
    expect(scoreFor('smallStraight', [1, 2, 3, 4, 5])).toBe(30);
    expect(scoreFor('largeStraight', [2, 3, 4, 5, 6])).toBe(40);
    expect(scoreFor('largeStraight', [1, 2, 3, 4, 6])).toBe(0);
    expect(scoreFor('largeStraight', [1, 1, 2, 3, 4])).toBe(0);
  });

  it('yahtzee and chance', () => {
    expect(scoreFor('yahtzee', [5, 5, 5, 5, 5])).toBe(50);
    expect(scoreFor('yahtzee', [5, 5, 5, 5, 4])).toBe(0);
    expect(scoreFor('chance', [1, 2, 3, 4, 6])).toBe(16);
    expect(scoreFor('yahtzee', [0, 0, 0, 0, 0])).toBe(0); // unrolled dice are not a Yahtzee
  });
});

describe('yahtzee turn flow', () => {
  it('starts unrolled with 3 rolls; only rolling is allowed', () => {
    const s = e.initialState();
    expect(s.rollsLeft).toBe(3);
    expect(e.legalMoves(s)).toEqual([roll]);
    expect(e.applyMove(s, { kind: 'score', category: 'chance' })).toBeNull();
    expect(e.applyMove(s, { kind: 'hold', index: 0 })).toBeNull();
  });

  it('a roll produces five dice 1-6 and uses a roll', () => {
    const s = e.applyMove(e.initialState(), roll);
    expect(s?.dice.every((d) => d >= 1 && d <= 6)).toBe(true);
    expect(s?.rollsLeft).toBe(2);
  });

  it('held dice stay put on re-roll and others change eventually', () => {
    let s = e.applyMove(e.initialState(), roll) as YahtzeeState;
    const first = s.dice.slice();
    s = e.applyMove(s, { kind: 'hold', index: 0 }) as YahtzeeState;
    s = e.applyMove(s, { kind: 'hold', index: 1 }) as YahtzeeState;
    s = e.applyMove(s, roll) as YahtzeeState;
    expect(s.dice[0]).toBe(first[0]);
    expect(s.dice[1]).toBe(first[1]);
    expect(s.rollsLeft).toBe(1);
  });

  it('hold toggles, and held flags reset at the start of the next turn', () => {
    let s = e.applyMove(e.initialState(), roll) as YahtzeeState;
    s = e.applyMove(s, { kind: 'hold', index: 2 }) as YahtzeeState;
    expect(s.held[2]).toBe(true);
    s = e.applyMove(s, { kind: 'hold', index: 2 }) as YahtzeeState;
    expect(s.held[2]).toBe(false);
    s = e.applyMove(s, { kind: 'hold', index: 3 }) as YahtzeeState;
    s = e.applyMove(s, { kind: 'score', category: 'chance' }) as YahtzeeState;
    expect(s.held.every((h) => !h)).toBe(true);
    expect(s.dice.every((d) => d === 0)).toBe(true);
    expect(s.rollsLeft).toBe(3);
    expect(s.current).toBe(2);
  });

  it('no rolls or holds after the third roll, but scoring is allowed', () => {
    let s = e.initialState();
    for (let i = 0; i < 3; i++) s = e.applyMove(s, roll) as YahtzeeState;
    expect(s.rollsLeft).toBe(0);
    expect(e.applyMove(s, roll)).toBeNull();
    expect(e.applyMove(s, { kind: 'hold', index: 0 })).toBeNull();
    expect(e.applyMove(s, { kind: 'score', category: 'chance' })).not.toBeNull();
  });

  it('a category can only be used once per player', () => {
    let s = e.applyMove(e.initialState(), roll) as YahtzeeState;
    s = e.applyMove(s, { kind: 'score', category: 'chance' }) as YahtzeeState; // p1
    s = e.applyMove(s, roll) as YahtzeeState;
    s = e.applyMove(s, { kind: 'score', category: 'chance' }) as YahtzeeState; // p2 has its own card
    s = e.applyMove(s, roll) as YahtzeeState;
    expect(e.applyMove(s, { kind: 'score', category: 'chance' })).toBeNull(); // p1 again
    expect(e.applyMove(s, { kind: 'score', category: 'ones' })).not.toBeNull();
  });

  it('rejects bad hold indexes and unknown categories', () => {
    const s = e.applyMove(e.initialState(), roll) as YahtzeeState;
    expect(e.applyMove(s, { kind: 'hold', index: 5 })).toBeNull();
    expect(e.applyMove(s, { kind: 'hold', index: -1 })).toBeNull();
    // @ts-expect-error deliberately invalid
    expect(e.applyMove(s, { kind: 'score', category: 'bogus' })).toBeNull();
  });
});

describe('yahtzee totals and bonuses', () => {
  it('upper bonus of 35 at 63+ (three of each face)', () => {
    const card = e.initialState().cards[1];
    const faces = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const;
    faces.forEach((k, i) => {
      card.scores[k] = 3 * (i + 1);
    });
    expect(upperBonus(card)).toBe(35);
    expect(totalScore(card)).toBe(63 + 35);
    card.scores.sixes = 12; // 57 total
    expect(upperBonus(card)).toBe(0);
  });

  it('extra Yahtzee scores +100 and joker scoring in other boxes', () => {
    let s = withDice([6, 6, 6, 6, 6]);
    s = { ...s, cards: { ...s.cards, 1: { ...s.cards[1], scores: { ...s.cards[1].scores, yahtzee: 50 } } } };
    expect(potentialScore(s, 'fullHouse')).toBe(25);
    expect(potentialScore(s, 'largeStraight')).toBe(40);
    const after = e.applyMove(s, { kind: 'score', category: 'largeStraight' });
    expect(after?.cards[1].scores.largeStraight).toBe(40);
    expect(after?.cards[1].bonuses).toBe(1);
    expect(after && totalScore(after.cards[1])).toBe(50 + 40 + 100);
  });

  it('no bonus if the Yahtzee box is empty or zeroed', () => {
    const s = withDice([6, 6, 6, 6, 6]);
    expect(e.applyMove(s, { kind: 'score', category: 'sixes' })?.cards[1].bonuses).toBe(0);
    const zeroed = {
      ...s,
      cards: { ...s.cards, 1: { ...s.cards[1], scores: { ...s.cards[1].scores, yahtzee: 0 } } },
    };
    expect(e.applyMove(zeroed, { kind: 'score', category: 'sixes' })?.cards[1].bonuses).toBe(0);
    expect(potentialScore(zeroed, 'fullHouse')).toBe(0);
  });
});

describe('yahtzee full game', () => {
  it('ends after 26 scores (13 each); highest total wins; no moves after', () => {
    let s = e.initialState();
    let turns = 0;
    while (e.getStatus(s).state === 'playing') {
      s = e.applyMove(s, roll) as YahtzeeState;
      const cat = CATEGORIES.find((k) => s.cards[s.current].scores[k] === null);
      s = e.applyMove(s, { kind: 'score', category: cat as (typeof CATEGORIES)[number] }) as YahtzeeState;
      turns++;
      expect(turns).toBeLessThanOrEqual(26);
    }
    expect(turns).toBe(26);
    const a = totalScore(s.cards[1]);
    const b = totalScore(s.cards[2]);
    const st = e.getStatus(s);
    if (a === b) expect(st.state).toBe('draw');
    else expect(st).toEqual({ state: 'won', winner: a > b ? 1 : 2 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, roll)).toBeNull();
  });
});

import { desiredHold, getBestMove } from './ai';

describe('yahtzee AI', () => {
  it('keeps pairs/triples of the most common face and re-rolls the rest', () => {
    expect(desiredHold([3, 3, 5, 2, 6])).toEqual([true, true, false, false, false]);
    expect(desiredHold([2, 6, 6, 6, 1])).toEqual([false, true, true, true, false]);
  });

  it('keeps made hands: Yahtzee, full house, large straight', () => {
    expect(desiredHold([4, 4, 4, 4, 4])).toEqual([true, true, true, true, true]);
    expect(desiredHold([2, 2, 5, 5, 5])).toEqual([true, true, true, true, true]);
    expect(desiredHold([2, 3, 4, 5, 6])).toEqual([true, true, true, true, true]);
  });

  it('chases a straight when four in a row show, keeping one of each', () => {
    expect(desiredHold([1, 2, 3, 4, 4])).toEqual([true, true, true, true, false]);
  });

  it('plays complete legal turns against itself and finishes the game', () => {
    let s = e.initialState();
    let guard = 0;
    while (e.getStatus(s).state === 'playing' && guard++ < 2000) {
      const m = getBestMove(s);
      const n = e.applyMove(s, m);
      expect(n, JSON.stringify(m)).not.toBeNull();
      s = n as YahtzeeState;
    }
    expect(e.getStatus(s).state).not.toBe('playing');
    // a sensible strategy should clearly beat the "fill boxes in order" baseline of about 100 points
    expect(totalScore(s.cards[1]) + totalScore(s.cards[2])).toBeGreaterThan(250);
  });
});
