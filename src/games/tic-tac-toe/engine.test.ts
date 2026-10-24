import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { findWinner, tttEngine } from './engine';

const play = (moves: number[]) => {
  let s = tttEngine.initialState();
  for (const m of moves) {
    const n = tttEngine.applyMove(s, m);
    if (!n) throw new Error(`illegal move ${m}`);
    s = n;
  }
  return s;
};

describe('tic-tac-toe engine', () => {
  it('starts with 9 legal moves and X to play', () => {
    const s = tttEngine.initialState();
    expect(tttEngine.legalMoves(s)).toHaveLength(9);
    expect(tttEngine.currentPlayer(s)).toBe(1);
  });

  it('rejects occupied and out-of-range cells', () => {
    const s = play([4]);
    expect(tttEngine.applyMove(s, 4)).toBeNull();
    expect(tttEngine.applyMove(s, 9)).toBeNull();
    expect(tttEngine.applyMove(s, -1)).toBeNull();
  });

  it('detects a win and stops further moves', () => {
    const s = play([0, 3, 1, 4, 2]);
    expect(tttEngine.getStatus(s)).toMatchObject({ state: 'won', winner: 1, line: [0, 1, 2] });
    expect(tttEngine.applyMove(s, 8)).toBeNull();
  });

  it('detects a draw', () => {
    const s = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(findWinner(s.cells)).toBeNull();
    expect(tttEngine.getStatus(s).state).toBe('draw');
  });

  it('does not mutate previous states', () => {
    const s0 = tttEngine.initialState();
    tttEngine.applyMove(s0, 0);
    expect(s0.cells.every((c) => c === null)).toBe(true);
  });
});

describe('tic-tac-toe AI', () => {
  it('takes an immediate win', () => {
    const s = play([0, 3, 1, 4]); // X to move, 2 wins
    expect(getBestMove(s)).toBe(2);
  });

  it('blocks an immediate loss', () => {
    const s = play([0, 4, 1]); // O to move, must block at 2
    expect(getBestMove(s)).toBe(2);
  });

  it('never loses against any sequence of X moves', () => {
    const explore = (s: ReturnType<typeof play>): void => {
      const st = tttEngine.getStatus(s);
      if (st.state !== 'playing') {
        expect(st.state === 'won' ? st.winner : 2).toBe(2); // X (1) must never win
        return;
      }
      if (s.current === 2) {
        const n = tttEngine.applyMove(s, getBestMove(s));
        if (n) explore(n);
      } else {
        for (const m of tttEngine.legalMoves(s)) {
          const n = tttEngine.applyMove(s, m);
          if (n) explore(n);
        }
      }
    };
    explore(tttEngine.initialState());
  });
});
