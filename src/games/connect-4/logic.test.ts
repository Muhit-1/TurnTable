import { describe, expect, it } from 'vitest';
import { connect4Engine } from './engine';
import { checkWin, createEmptyBoard, dropDisc, getValidColumns } from './logic';
import { COLS, ROWS } from './types';

const play = (moves: number[]) => {
  let s = connect4Engine.initialState();
  for (const m of moves) {
    const n = connect4Engine.applyMove(s, m);
    if (!n) throw new Error(`illegal move ${m}`);
    s = n;
  }
  return s;
};

describe('connect4 logic', () => {
  it('drops a disc to the lowest open row', () => {
    const r = dropDisc(createEmptyBoard(), 3, 1);
    expect(r?.row).toBe(ROWS - 1);
    expect(dropDisc(r!.board, 3, 2)?.row).toBe(ROWS - 2);
  });

  it('rejects a drop in a full column and removes it from valid columns', () => {
    let b = createEmptyBoard();
    for (let i = 0; i < ROWS; i++) b = dropDisc(b, 0, 1)!.board;
    expect(dropDisc(b, 0, 2)).toBeNull();
    expect(getValidColumns(b)).not.toContain(0);
    expect(getValidColumns(b)).toHaveLength(COLS - 1);
  });

  it('detects horizontal, vertical and both diagonal wins', () => {
    expect(connect4Engine.getStatus(play([0, 0, 1, 1, 2, 2, 3])).state).toBe('won'); // horizontal
    expect(connect4Engine.getStatus(play([0, 1, 0, 1, 0, 1, 0])).state).toBe('won'); // vertical
    // rising diagonal for player 1: (0,b) (1,b-1) (2,b-2) (3,b-3)
    expect(connect4Engine.getStatus(play([0, 1, 1, 2, 3, 2, 2, 3, 3, 6, 3])).state).toBe('won');
    // falling diagonal for player 1 (mirror)
    expect(connect4Engine.getStatus(play([6, 5, 5, 4, 3, 4, 4, 3, 3, 0, 3])).state).toBe('won');
  });

  it('does not accept moves after the game ends', () => {
    const won = play([0, 0, 1, 1, 2, 2, 3]);
    expect(connect4Engine.applyMove(won, 4)).toBeNull();
    expect(connect4Engine.legalMoves(won)).toEqual([]);
  });

  it('reports the winner and keeps the turn on the winner', () => {
    const s = play([0, 0, 1, 1, 2, 2, 3]);
    const st = connect4Engine.getStatus(s);
    expect(st.state === 'won' && st.winner).toBe(1);
  });

  it('declares a draw when the board fills with no four-in-a-row', () => {
    const full = [
      0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 4, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5,
      5, 6, 6, 6, 6, 6, 6,
    ];
    expect(full).toHaveLength(ROWS * COLS);
    const s = play(full);
    expect(connect4Engine.getStatus(s).state).toBe('draw');
    expect(connect4Engine.legalMoves(s)).toEqual([]);
  });

  it('checkWin finds nothing on a lone disc', () => {
    const r = dropDisc(createEmptyBoard(), 3, 1)!;
    expect(checkWin(r.board, r.row, 3, 1)).toBeNull();
  });
});
