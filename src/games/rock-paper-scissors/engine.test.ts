import { describe, expect, it } from 'vitest';
import { createRps, roundWinner, THROWS } from './engine';

describe('rock paper scissors', () => {
  it('follows the beats table', () => {
    expect(roundWinner('rock', 'scissors')).toBe(1);
    expect(roundWinner('scissors', 'paper')).toBe(1);
    expect(roundWinner('paper', 'rock')).toBe(1);
    expect(roundWinner('scissors', 'rock')).toBe(2);
    expect(roundWinner('paper', 'scissors')).toBe(2);
    expect(roundWinner('rock', 'paper')).toBe(2);
    for (const t of THROWS) expect(roundWinner(t, t)).toBeNull();
  });

  it('hides player 1 pick until player 2 has thrown, then resolves the round', () => {
    const e = createRps(3);
    const s1 = e.applyMove(e.initialState(), 'rock');
    expect(s1?.current).toBe(2);
    expect(s1?.rounds).toHaveLength(0);
    const s2 = s1 && e.applyMove(s1, 'scissors');
    expect(s2?.wins).toEqual({ 1: 1, 2: 0 });
    expect(s2?.current).toBe(1);
    expect(s2?.p1Pick).toBeNull();
  });

  it('replays ties without scoring', () => {
    const e = createRps(3);
    const s = e.applyMove(e.applyMove(e.initialState(), 'paper')!, 'paper')!;
    expect(s.wins).toEqual({ 1: 0, 2: 0 });
    expect(s.rounds[0].winner).toBeNull();
    expect(e.getStatus(s).state).toBe('playing');
  });

  it('best-of-3 ends when someone reaches 2 wins and then rejects moves', () => {
    const e = createRps(3);
    let s = e.initialState();
    for (let i = 0; i < 2; i++) s = e.applyMove(e.applyMove(s, 'rock')!, 'scissors')!;
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(e.applyMove(s, 'rock')).toBeNull();
    expect(e.legalMoves(s)).toEqual([]);
  });

  it('best-of-5 needs 3 wins', () => {
    const e = createRps(5);
    let s = e.initialState();
    for (let i = 0; i < 2; i++) s = e.applyMove(e.applyMove(s, 'paper')!, 'rock')!;
    expect(e.getStatus(s).state).toBe('playing');
    s = e.applyMove(e.applyMove(s, 'paper')!, 'rock')!;
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
  });

  it('rejects invalid throws', () => {
    const e = createRps();
    // @ts-expect-error deliberately invalid
    expect(e.applyMove(e.initialState(), 'lizard')).toBeNull();
  });
});
