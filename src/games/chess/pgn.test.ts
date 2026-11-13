import { describe, expect, it } from 'vitest';
import { pgnResult, toPgn } from './pgn';

const names = { 1: 'Ana', 2: 'Ben' };
const day = new Date(2026, 0, 5);

describe('PGN export', () => {
  it('maps the outcome to a result token', () => {
    expect(pgnResult({ state: 'playing' })).toBe('*');
    expect(pgnResult({ state: 'draw' })).toBe('1/2-1/2');
    expect(pgnResult({ state: 'won', winner: 1 })).toBe('1-0');
    expect(pgnResult({ state: 'won', winner: 2 })).toBe('0-1');
  });

  it('writes the seven standard tags, numbered moves and the result', () => {
    const pgn = toPgn(['f3', 'e5', 'g4', 'Qh4#'], { state: 'won', winner: 2 }, names, day);
    expect(pgn).toContain('[White "Ana"]');
    expect(pgn).toContain('[Black "Ben"]');
    expect(pgn).toContain('[Date "2026.01.05"]');
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn.trimEnd().endsWith('1. f3 e5 2. g4 Qh4# 0-1')).toBe(true);
  });

  it('an unfinished game ends with *, and an empty one is still valid', () => {
    expect(toPgn(['e4'], { state: 'playing' }, names, day).trimEnd().endsWith('1. e4 *')).toBe(true);
    expect(toPgn([], { state: 'playing' }, names, day).trimEnd().endsWith('*')).toBe(true);
  });

  it('wraps long games and escapes quotes in names', () => {
    const many = Array.from({ length: 80 }, (_, i) => (i % 2 ? 'Nf6' : 'Nf3'));
    const pgn = toPgn(many, { state: 'draw' }, { 1: 'The "Rook"', 2: 'Ben' }, day);
    expect(pgn).toContain('[White "The \\"Rook\\""]');
    for (const line of pgn.split('\n')) expect(line.length).toBeLessThan(80);
  });
});
