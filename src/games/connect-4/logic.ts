import { Board, Cell, COLS, Line, Player, ROWS } from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function getValidColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) cols.push(c);
  }
  return cols;
}

export function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== null);
}

/** Drops a disc into the lowest open row of `col`. Returns the resulting board and the row it landed in, or null if the column is full. */
export function dropDisc(board: Board, col: number, player: Player): { board: Board; row: number } | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      const next = board.map((r) => r.slice());
      next[row][col] = player;
      return { board: next, row };
    }
  }
  return null;
}

const DIRECTIONS: [number, number][] = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal, top-left to bottom-right
  [1, -1], // diagonal, top-right to bottom-left
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

/** Checks whether the disc just placed at (row, col) completes a line of 4. Returns the winning line's coordinates, or null. */
export function checkWin(board: Board, row: number, col: number, player: Player): Line | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: Line = [[row, col]];

    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) {
      line.push([r, c]);
      r -= dr;
      c -= dc;
    }

    if (line.length >= 4) return line;
  }
  return null;
}

export function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1;
}
