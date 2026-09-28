export type Player = 1 | 2;
export type Cell = Player | null;
export type Board = Cell[][]; // board[row][col], row 0 = top, row ROWS-1 = bottom

export const ROWS = 6;
export const COLS = 7;

export type Line = [number, number][];

export type GameStatus =
  | { state: 'playing' }
  | { state: 'won'; winner: Player; line: Line }
  | { state: 'draw' };

export type Mode = 'pvp' | 'vs-cpu';
