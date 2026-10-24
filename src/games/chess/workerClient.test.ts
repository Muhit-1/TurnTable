// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { chessEngine as e, fromFen, START_FEN } from './engine';
import { pickChessMove } from './workerClient';

describe('pickChessMove without a Worker (jsdom has none)', () => {
  it('falls back to searching on the main thread and returns a legal move', async () => {
    expect(typeof Worker).toBe('undefined');
    const s = fromFen(START_FEN);
    const move = await pickChessMove(s, 'easy');
    expect(move).not.toBeNull();
    expect(e.applyMove(s, move as NonNullable<typeof move>)).not.toBeNull();
  });

  it('returns null when the game is over', async () => {
    expect(await pickChessMove(fromFen('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'), 'hard')).toBeNull();
  });
});
