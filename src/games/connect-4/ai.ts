import { type Level, maybeRandom } from '../../shared/level';
import { checkWin, dropDisc, getValidColumns, otherPlayer } from './logic';
import { type Board, type Cell, COLS, type Player, ROWS } from './types';

const CENTER_COL = Math.floor(COLS / 2);
const WIN_SCORE = 1_000_000;
const DEFAULT_DEPTH = 5;

function evaluateWindow(window: Cell[], player: Player): number {
  const opponent = otherPlayer(player);
  const countPlayer = window.filter((c) => c === player).length;
  const countOpponent = window.filter((c) => c === opponent).length;
  const countEmpty = window.filter((c) => c === null).length;

  if (countPlayer === 4) return 100;
  if (countPlayer === 3 && countEmpty === 1) return 5;
  if (countPlayer === 2 && countEmpty === 2) return 2;
  if (countOpponent === 3 && countEmpty === 1) return -4;
  return 0;
}

function scorePosition(board: Board, player: Player): number {
  let score = 0;

  const centerCount = board.reduce((acc, row) => acc + (row[CENTER_COL] === player ? 1 : 0), 0);
  score += centerCount * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], player);
    }
  }

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      score += evaluateWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], player);
    }
  }

  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        player,
      );
    }
  }

  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow(
        [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]],
        player,
      );
    }
  }

  return score;
}

function orderedColumns(board: Board): number[] {
  return getValidColumns(board).sort((a, b) => Math.abs(a - CENTER_COL) - Math.abs(b - CENTER_COL));
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player,
  humanPlayer: Player,
): number {
  const validCols = orderedColumns(board);

  if (validCols.length === 0) return 0; // draw
  if (depth === 0) return scorePosition(board, aiPlayer);

  const mover = maximizing ? aiPlayer : humanPlayer;
  let value = maximizing ? -Infinity : Infinity;

  for (const col of validCols) {
    const result = dropDisc(board, col, mover);
    if (!result) continue;

    if (checkWin(result.board, result.row, col, mover)) {
      value = maximizing ? WIN_SCORE + depth : -WIN_SCORE - depth;
    } else {
      const childScore = minimax(result.board, depth - 1, alpha, beta, !maximizing, aiPlayer, humanPlayer);
      value = maximizing ? Math.max(value, childScore) : Math.min(value, childScore);
    }

    if (maximizing) {
      alpha = Math.max(alpha, value);
    } else {
      beta = Math.min(beta, value);
    }
    if (alpha >= beta) break;
  }

  return value;
}

/** Picks a column for the computer opponent using minimax with alpha-beta pruning. */
export function getBestMove(board: Board, aiPlayer: Player, depth = DEFAULT_DEPTH): number {
  const humanPlayer = otherPlayer(aiPlayer);
  const validCols = orderedColumns(board);

  let bestCol = validCols[0];
  let bestScore = -Infinity;

  for (const col of validCols) {
    const result = dropDisc(board, col, aiPlayer);
    if (!result) continue;

    const score = checkWin(result.board, result.row, col, aiPlayer)
      ? WIN_SCORE
      : minimax(result.board, depth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}

const DEPTH: Record<Level, number> = { easy: 2, medium: 4, hard: 6 };

/** Search depth grows with the level; weaker levels also sometimes play a random column. */
export function chooseMove(
  board: Board,
  aiPlayer: Player,
  level: Level,
  random: () => number = Math.random,
): number {
  return maybeRandom(level, getBestMove(board, aiPlayer, DEPTH[level]), getValidColumns(board), random);
}
