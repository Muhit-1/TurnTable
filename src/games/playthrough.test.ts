import { describe, expect, it } from 'vitest';
import { LEVEL_NAMES } from '../shared/level';
import { HARNESSES, seeded } from './harness';
import { games } from './registry';

describe('every registered game has a test harness', () => {
  it('covers exactly the games in the registry, each with a complete-game playthrough', () => {
    expect(HARNESSES.map((h) => h.id).sort()).toEqual(games.map((g) => g.id).sort());
    expect(new Set(HARNESSES.map((h) => h.id)).size).toBe(HARNESSES.length);
  });
});

describe.each(HARNESSES.map((h) => [h.id, h] as const))('%s', (_id, h) => {
  it('plays a complete game to a finish: terminal status, no moves left, nothing accepted afterwards', () => {
    const engine = h.engine();
    const { final, lastMove } = h.playthrough(seeded(17));
    const status = engine.getStatus(final);
    expect(status.state, 'game should be finished').not.toBe('playing');
    if (status.state === 'won') expect([1, 2]).toContain(status.winner);
    expect(engine.legalMoves(final)).toEqual([]);
    expect(engine.applyMove(final, lastMove)).toBeNull();
  }, 120000);

  it('has game states that survive JSON (needed for save and resume)', () => {
    const engine = h.engine();
    const s0 = engine.initialState();
    const clone = JSON.parse(JSON.stringify(s0));
    expect(engine.currentPlayer(clone)).toBe(engine.currentPlayer(s0));
    expect(engine.legalMoves(clone)).toEqual(engine.legalMoves(s0));
    expect(engine.getStatus(clone)).toEqual(engine.getStatus(s0));

    // a position partway through a game, and the finished position
    const { final } = h.playthrough(seeded(3));
    const finalClone = JSON.parse(JSON.stringify(final));
    expect(engine.getStatus(finalClone)).toEqual(engine.getStatus(final));

    // continuing from a restored mid-game state behaves like continuing from the original
    const rnd = seeded(5);
    let s = h.sample ? h.sample(rnd, 6) : s0;
    if (!h.sample) {
      for (let i = 0; i < 8 && engine.getStatus(s).state === 'playing'; i++) {
        const moves = engine.legalMoves(s);
        if (!moves.length) break;
        s = engine.applyMove(s, moves[Math.floor(rnd() * moves.length)]) ?? s;
      }
    }
    const restored = JSON.parse(JSON.stringify(s));
    const moves = engine.legalMoves(s);
    expect(engine.legalMoves(restored)).toEqual(moves);
    if (moves.length) {
      const a = engine.applyMove(s, moves[0]);
      const b = engine.applyMove(restored, moves[0]);
      expect(JSON.parse(JSON.stringify(b))).toEqual(JSON.parse(JSON.stringify(a)));
    }
  }, 120000);

  if (h.choose) {
    it('the computer returns a legal move at every difficulty level, in several positions', () => {
      const engine = h.engine();
      const rnd = seeded(23);
      for (const plies of [0, 3, 8, 15]) {
        let s = h.sample ? h.sample(rnd, plies) : engine.initialState();
        if (!h.sample) {
          for (let i = 0; i < plies && engine.getStatus(s).state === 'playing'; i++) {
            const moves = engine.legalMoves(s);
            if (!moves.length) break;
            s = engine.applyMove(s, moves[Math.floor(rnd() * moves.length)]) ?? s;
          }
        }
        if (engine.getStatus(s).state !== 'playing') continue;
        for (const level of LEVEL_NAMES) {
          const move = h.choose?.(s, level, rnd);
          expect(engine.applyMove(s, move), `${level} after ${plies} plies`).not.toBeNull();
        }
      }
    }, 180000);
  }
});
