// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { LEVELS } from './ai';
import { createGo } from './engine';
import { pickGoMove } from './workerClient';

describe('pickGoMove without a Worker (jsdom has none)', () => {
  it('falls back to searching on the main thread and returns a legal move', async () => {
    expect(typeof Worker).toBe('undefined');
    const saved = { ...LEVELS.easy };
    LEVELS.easy = { timeMs: 100, blunder: 0 };
    try {
      const e = createGo(5, 0.5);
      const s = e.initialState();
      const move = await pickGoMove(s, 'easy');
      expect(e.applyMove(s, move)).not.toBeNull();
    } finally {
      LEVELS.easy = saved;
    }
  });
});
