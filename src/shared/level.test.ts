import { describe, expect, it } from 'vitest';
import { seeded } from '../games/harness';
import { BLUNDER, depthFor, isLevel, LEVEL_NAMES, maybeRandom } from './level';

describe('levels', () => {
  it('recognises valid level names only', () => {
    for (const l of LEVEL_NAMES) expect(isLevel(l)).toBe(true);
    for (const bad of ['', 'EASY', 'expert', null, 3, undefined]) expect(isLevel(bad)).toBe(false);
  });

  it('blunder chance falls as the level rises and is zero for hard', () => {
    expect(BLUNDER.easy).toBeGreaterThan(BLUNDER.medium);
    expect(BLUNDER.medium).toBeGreaterThan(BLUNDER.hard);
    expect(BLUNDER.hard).toBe(0);
  });

  it('hard always returns the best move', () => {
    const rnd = seeded(1);
    for (let i = 0; i < 200; i++) expect(maybeRandom('hard', 'best', ['a', 'b', 'c'], rnd)).toBe('best');
  });

  it('easy and medium replace the best move about as often as their blunder chance says', () => {
    const rnd = seeded(2);
    const options = ['x'];
    const rate = (level: 'easy' | 'medium') => {
      let n = 0;
      for (let i = 0; i < 4000; i++) if (maybeRandom(level, 'best', options, rnd) !== 'best') n++;
      return n / 4000;
    };
    expect(rate('easy')).toBeGreaterThan(BLUNDER.easy - 0.04);
    expect(rate('easy')).toBeLessThan(BLUNDER.easy + 0.04);
    expect(rate('medium')).toBeGreaterThan(BLUNDER.medium - 0.04);
    expect(rate('medium')).toBeLessThan(BLUNDER.medium + 0.04);
  });

  it('with no options it keeps the best move, and random picks come from the options', () => {
    expect(maybeRandom('easy', 'best', [], () => 0)).toBe('best');
    expect(maybeRandom('easy', 'best', ['only'], () => 0)).toBe('only');
  });

  it('depthFor reads the table for the level', () => {
    expect(depthFor('medium', { easy: 1, medium: 4, hard: 9 })).toBe(4);
  });
});
