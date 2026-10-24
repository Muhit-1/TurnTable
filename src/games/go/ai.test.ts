import { describe, expect, it } from 'vitest';
import { chooseMove, LEVELS, searchGo } from './ai';
import { createGo, type GoMove, type GoState, keyOf, type Stone } from './engine';

function board(rows: string[], current: 1 | 2 = 1, komi = 0.5, passes = 0): GoState {
  const size = rows.length;
  const cells = rows
    .join('')
    .split('')
    .map((ch): Stone => (ch === 'x' ? 1 : ch === 'o' ? 2 : 0));
  return {
    size,
    komi,
    cells,
    current,
    captures: { 1: 0, 2: 0 },
    passes,
    seen: [keyOf(cells)],
    last: -1,
    over: false,
  };
}
const at = (size: number, r: number, c: number) => r * size + c;
/** Deterministic pseudo-random numbers so these tests are repeatable. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('go search', () => {
  it('captures a stone in atari when that wins material', () => {
    // black to move; the white stone on (1,1) has one liberty, (1,2)
    const s = board(['.x...', 'xo...', '.x...', '.....', '.....'], 1);
    const r = searchGo(s, { timeMs: 5000, maxPlayouts: 4000 }, seeded(1));
    expect(r.ranked[0]).toBe(at(5, 1, 2));
    expect(r.playouts).toBe(4000);
  });

  it('saves its own stone by extending out of atari rather than ignoring it', () => {
    // white to move; its stone on (1,1) is in atari at (1,2). Extending to (1,2) is the move that keeps it alive
    const s = board(['.x...', 'xo...', '.x...', '.....', '.....'], 2);
    const r = searchGo(s, { timeMs: 5000, maxPlayouts: 4000 }, seeded(2));
    expect(r.ranked[0]).toBe(at(5, 1, 2));
  });

  it('never fills one of its own eyes while it has alternatives', () => {
    // black owns the whole left side with an eye at (1,1)... build a living shape and check the move list
    const s = board(['xxxxx', 'x.x.x', 'xxxxx', 'ooooo', 'o....'], 1);
    const r = searchGo(s, { timeMs: 5000, maxPlayouts: 1500 }, seeded(3));
    expect(r.ranked).not.toContain(at(5, 1, 1));
    expect(r.ranked).not.toContain(at(5, 1, 3));
  });

  it('is repeatable for the same seed', () => {
    const s = board(['.....', '.....', '..x..', '.....', '.....'], 2);
    const a = searchGo(s, { timeMs: 5000, maxPlayouts: 800 }, seeded(7)).ranked.slice(0, 3);
    const b = searchGo(s, { timeMs: 5000, maxPlayouts: 800 }, seeded(7)).ranked.slice(0, 3);
    expect(a).toEqual(b);
  });

  it('respects its time limit', () => {
    const t0 = Date.now();
    searchGo(createGo(9).initialState(), { timeMs: 300 });
    expect(Date.now() - t0).toBeLessThan(1500);
  });

  it('considers passing when the opponent has just passed and everything is settled', () => {
    // black owns the whole board; after White passes, black is winning and may end the game
    const s = board(['xxxxx', 'xxxxx', 'xxxxx', 'xxxxx', 'xxxx.'], 1, 0.5, 1);
    const r = searchGo(s, { timeMs: 5000, maxPlayouts: 600 }, seeded(4));
    expect(r.ranked).toContain(-1);
  });
});

/** Runs `fn` with small, repeatable search budgets (a fixed number of playouts instead of seconds). */
function withSmallBudgets<T>(playouts: number, fn: () => T): T {
  const saved = JSON.parse(JSON.stringify(LEVELS));
  for (const level of Object.keys(LEVELS) as (keyof typeof LEVELS)[])
    LEVELS[level] = { ...LEVELS[level], timeMs: 60000, maxPlayouts: playouts };
  try {
    return fn();
  } finally {
    for (const level of Object.keys(saved) as (keyof typeof LEVELS)[]) LEVELS[level] = saved[level];
  }
}

describe('choosing a move in the real game', () => {
  it('returns a legal move at every level (including from the opening)', () => {
    const e = createGo(9);
    withSmallBudgets(300, () => {
      for (const level of ['easy', 'medium', 'hard'] as const) {
        const s = e.initialState();
        const m = chooseMove(s, level, seeded(5));
        expect(e.applyMove(s, m), level).not.toBeNull();
      }
    });
    expect(Object.keys(LEVELS)).toEqual(['easy', 'medium', 'hard']);
    expect(LEVELS.hard.timeMs).toBeGreaterThan(LEVELS.medium.timeMs);
    expect(LEVELS.medium.timeMs).toBeGreaterThan(LEVELS.easy.timeMs);
  });

  it('passes when there is no legal point left', () => {
    // a full board has no legal placement (every point is occupied)
    const s = board(['xxxxx', 'xxxxx', 'xxxxx', 'xxxxx', 'xxxxo'], 1);
    expect(chooseMove(s, 'easy', seeded(1))).toEqual({ kind: 'pass' });
  });

  it('never picks a move the real engine would reject (superko-aware fallback)', () => {
    const e = createGo(5, 0.5);
    const ko = board(['.xo..', 'xo.o.', '.xo..', '.....', '.....'], 1);
    const taken = e.applyMove(ko, { kind: 'place', point: at(5, 1, 2) }) as GoState;
    withSmallBudgets(300, () => {
      const m = chooseMove(taken, 'medium', seeded(6));
      expect(e.applyMove(taken, m)).not.toBeNull();
    });
  });
});

describe('whole games on a small board', () => {
  const randomPlayer = (e: ReturnType<typeof createGo>, s: GoState, rnd: () => number): GoMove => {
    const places = e.legalMoves(s).filter((m) => m.kind === 'place');
    // stop when the position is hopeless to avoid endless shuffling: pass with some probability late in the game
    if (!places.length || rnd() < 0.05) return { kind: 'pass' };
    return places[Math.floor(rnd() * places.length)];
  };

  function playGame(aiColor: 1 | 2, seed: number): { winner: number | null; plies: number } {
    const e = createGo(5, 0.5);
    const rnd = seeded(seed);
    let s = e.initialState();
    let plies = 0;
    while (!s.over && plies++ < 200) {
      const m = s.current === aiColor ? chooseMove(s, 'medium', rnd) : randomPlayer(e, s, rnd);
      const next = e.applyMove(s, m);
      expect(next, `ply ${plies}`).not.toBeNull();
      s = next as GoState;
    }
    const st = e.getStatus(s);
    return { winner: st.state === 'won' ? st.winner : null, plies };
  }

  it('beats a random player as both colours, with only legal moves', () => {
    const results = withSmallBudgets(500, () => [playGame(1, 11), playGame(2, 12)]);
    for (const r of results) expect(r.plies).toBeLessThan(200);
    expect(results.map((r) => r.winner)).toEqual([1, 2]); // the AI won as Black, then as White
  }, 120000);
});
