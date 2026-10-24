import { describe, expect, it } from 'vitest';
import { createHangman, masked, normaliseSecret } from './engine';
import { WORDS } from './words';

describe('hangman secret handling', () => {
  it('normalises case and whitespace; rejects digits, empty and symbols', () => {
    expect(normaliseSecret('  Ice   Cream ')).toBe('ice cream');
    expect(normaliseSecret("rock-n-roll's")).toBe("rock-n-roll's");
    expect(normaliseSecret('')).toBeNull();
    expect(normaliseSecret('   ')).toBeNull();
    expect(normaliseSecret('abc123')).toBeNull();
    expect(normaliseSecret('-')).toBeNull();
    expect(normaliseSecret('hi!')).toBeNull();
  });

  it('the built-in word list is all valid', () => {
    for (const w of WORDS) expect(normaliseSecret(w), w).toBe(w);
  });

  it('createHangman throws on an invalid secret', () => {
    expect(() => createHangman('1234')).toThrow();
  });
});

describe('hangman engine', () => {
  const e = createHangman('Apple pie');

  it('masks unguessed letters and shows spaces', () => {
    expect(masked(e.initialState()).join('')).toBe('_____ ___');
  });

  it('a correct guess reveals every occurrence and costs nothing', () => {
    const s = e.applyMove(e.initialState(), 'p');
    expect(s?.wrong).toBe(0);
    expect(masked(s as NonNullable<typeof s>).join('')).toBe('_pp__ p__');
  });

  it('a wrong guess adds a wrong count; guesses are case-insensitive', () => {
    const s = e.applyMove(e.initialState(), 'Z');
    expect(s?.wrong).toBe(1);
    expect(s?.guesses).toEqual(['z']);
  });

  it('rejects repeats, non-letters and multi-character input', () => {
    const s = e.applyMove(e.initialState(), 'a');
    expect(s && e.applyMove(s, 'a')).toBeNull();
    expect(e.applyMove(e.initialState(), '1')).toBeNull();
    expect(e.applyMove(e.initialState(), 'ab')).toBeNull();
    expect(e.applyMove(e.initialState(), ' ')).toBeNull();
  });

  it('guesser wins by revealing every letter', () => {
    let s = e.initialState();
    for (const l of 'applei') s = e.applyMove(s, l) ?? s;
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, 'z')).toBeNull();
  });

  it('setter wins after the sixth wrong guess', () => {
    let s = e.initialState();
    for (const l of 'zxqjkv') s = e.applyMove(s, l) ?? s;
    expect(s.wrong).toBe(6);
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 2 });
    expect(e.applyMove(s, 'a')).toBeNull();
  });

  it('wrong count 5 is still playing', () => {
    let s = e.initialState();
    for (const l of 'zxqjk') s = e.applyMove(s, l) ?? s;
    expect(e.getStatus(s).state).toBe('playing');
  });

  it('legal moves exclude guessed letters', () => {
    const s = e.applyMove(e.initialState(), 'a');
    expect(s && e.legalMoves(s)).toHaveLength(25);
    expect(s && e.legalMoves(s)).not.toContain('a');
  });
});
