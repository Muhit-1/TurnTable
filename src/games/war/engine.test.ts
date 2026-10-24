import { describe, expect, it } from 'vitest';
import type { Card } from '../../shared/deck';
import { createWar, MAX_FLIPS, type WarState } from './engine';

const c = (rank: number): Card => ({ rank, suit: 'spades' });
const total = (s: WarState) => s.piles[1].length + s.piles[2].length;
const base = (p1: Card[], p2: Card[]): WarState => ({
  piles: { 1: p1, 2: p2 },
  flips: 0,
  last: null,
  seed: 5,
  winner: null,
});
const e = createWar(1);

describe('war engine', () => {
  it('deals 26 cards each from a 52-card deck', () => {
    const s = e.initialState();
    expect(s.piles[1]).toHaveLength(26);
    expect(s.piles[2]).toHaveLength(26);
    const all = [...s.piles[1], ...s.piles[2]].map((x) => `${x.rank}${x.suit}`);
    expect(new Set(all).size).toBe(52);
  });

  it('same seed gives the same deal; different seeds differ', () => {
    expect(createWar(7).initialState()).toEqual(createWar(7).initialState());
    expect(createWar(7).initialState().piles[1]).not.toEqual(createWar(8).initialState().piles[1]);
  });

  it('higher card wins both cards', () => {
    const s = e.applyMove(base([c(10), c(2)], [c(5), c(3)]), 'flip');
    expect(s?.last).toMatchObject({ winner: 1, wars: 0, won: 2 });
    expect(s?.piles[1]).toHaveLength(3);
    expect(s?.piles[2]).toHaveLength(1);
  });

  it('a tie triggers war: 3 face-down + 1 face-up, winner takes everything', () => {
    const p1 = [c(7), c(2), c(2), c(2), c(13), c(4)];
    const p2 = [c(7), c(3), c(3), c(3), c(9), c(5)];
    const s = e.applyMove(base(p1, p2), 'flip');
    expect(s?.last).toMatchObject({ winner: 1, wars: 1, won: 10 });
    expect(s?.piles[1]).toHaveLength(1 + 10);
    expect(s?.piles[2]).toHaveLength(1);
  });

  it('wars can repeat', () => {
    const p1 = [c(7), c(2), c(2), c(2), c(9), c(2), c(2), c(2), c(13), c(4)];
    const p2 = [c(7), c(3), c(3), c(3), c(9), c(3), c(3), c(3), c(5), c(5)];
    const s = e.applyMove(base(p1, p2), 'flip');
    expect(s?.last).toMatchObject({ winner: 1, wars: 2, won: 18 });
  });

  it('a player who cannot finish a war loses; all cards are conserved', () => {
    const s0 = base([c(7)], [c(7), c(2), c(3), c(4), c(5)]);
    const s = e.applyMove(s0, 'flip');
    expect(s?.winner).toBe(2);
    expect(s && total(s)).toBe(6);
  });

  it('conserves cards through a long random game and always ends', () => {
    let s = e.initialState();
    let n = 0;
    while (e.getStatus(s).state === 'playing') {
      const next = e.applyMove(s, 'flip');
      if (!next) throw new Error('unexpected null');
      s = next;
      expect(total(s)).toBe(52);
      n++;
      expect(n).toBeLessThanOrEqual(MAX_FLIPS);
    }
    const st = e.getStatus(s);
    expect(['won', 'draw']).toContain(st.state);
    expect(e.applyMove(s, 'flip')).toBeNull();
  });

  it('rejects unknown moves', () => {
    // @ts-expect-error deliberately invalid
    expect(e.applyMove(e.initialState(), 'fold')).toBeNull();
  });
});
