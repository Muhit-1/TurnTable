import { describe, expect, it } from 'vitest';
import { shuffledDeck, standardDeck } from './deck';
import { nextFloat, nextInt, shuffle } from './rng';

describe('rng', () => {
  it('is deterministic for a given seed and advances the seed', () => {
    const [a, s1] = nextFloat(42);
    const [b] = nextFloat(42);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(s1).not.toBe(42);
    expect(nextFloat(s1)[0]).not.toBe(a);
  });

  it('nextInt stays in range and covers all values', () => {
    let s = 7;
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      let v: number;
      [v, s] = nextInt(s, 6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('shuffle keeps the same items, is reproducible, and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const [a] = shuffle(input, 123);
    const [b] = shuffle(input, 123);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(input);
    expect(a).not.toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('deck', () => {
  it('has 52 unique cards', () => {
    const d = standardDeck();
    expect(d).toHaveLength(52);
    expect(new Set(d.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });

  it('shuffledDeck is a permutation of the standard deck', () => {
    const [d] = shuffledDeck(99);
    expect(d).toHaveLength(52);
    expect(new Set(d.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});
