import type { GameEngine } from '../../shared/engine';
import { checkWin, createEmptyBoard, dropDisc, getValidColumns, isBoardFull, otherPlayer } from './logic';
import type { Board, GameStatus, Line, Player } from './types';

export interface C4State {
  board: Board;
  current: Player;
  status: GameStatus;
}

export const connect4Engine: GameEngine<C4State, number, Line> = {
  initialState: () => ({ board: createEmptyBoard(), current: 1, status: { state: 'playing' } }),
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (s.status.state === 'playing' ? getValidColumns(s.board) : []),
  applyMove(s, col) {
    if (s.status.state !== 'playing') return null;
    const result = dropDisc(s.board, col, s.current);
    if (!result) return null;
    const line = checkWin(result.board, result.row, col, s.current);
    const status: GameStatus = line
      ? { state: 'won', winner: s.current, line }
      : isBoardFull(result.board)
        ? { state: 'draw' }
        : { state: 'playing' };
    return { board: result.board, current: line ? s.current : otherPlayer(s.current), status };
  },
  getStatus: (s) => s.status,
};
