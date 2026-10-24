import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

export const SIZE = 4;
export const PIECES = 16;

/**
 * Piece ids 0-15 are 4 bits: bit0 tall, bit1 dark, bit2 square, bit3 hollow.
 * Two pieces share a trait when the same bit has the same value in both.
 */
export type QuartoMove = { kind: 'give'; piece: number } | { kind: 'place'; square: number };
export type Line = number[];

export interface QuartoState {
  board: (number | null)[]; // piece id per square, or null
  /** piece the current player must place (set after the opponent gave it) */
  handed: number | null;
  /** the player whose turn it is: gives when `handed` is null, places otherwise */
  current: PlayerId;
  status: Outcome<Line>;
}

export const TRAITS = ['tall', 'dark', 'square', 'hollow'] as const;
export const traitOf = (piece: number, bit: number) => (piece >> bit) & 1;

export const LINES: Line[] = [
  ...Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => r * SIZE + c)), // rows
  ...Array.from({ length: SIZE }, (_, c) => Array.from({ length: SIZE }, (_, r) => r * SIZE + c)), // columns
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

/** A line of four that all share at least one trait, or null. */
export function winningLine(board: (number | null)[], line: Line): boolean {
  const ps = line.map((i) => board[i]);
  if (ps.some((p) => p === null)) return false;
  const pieces = ps as number[];
  return [0, 1, 2, 3].some((bit) => pieces.every((p) => traitOf(p, bit) === traitOf(pieces[0], bit)));
}

export const usedPieces = (s: QuartoState) => new Set(s.board.filter((p): p is number => p !== null));
export const availablePieces = (s: QuartoState) =>
  Array.from({ length: PIECES }, (_, i) => i).filter((p) => !usedPieces(s).has(p) && p !== s.handed);

export const quartoEngine: GameEngine<QuartoState, QuartoMove, Line> = {
  initialState: () => ({
    board: Array(SIZE * SIZE).fill(null),
    handed: null,
    current: 1,
    status: { state: 'playing' },
  }),
  currentPlayer: (s) => s.current,
  legalMoves(s) {
    if (s.status.state !== 'playing') return [];
    if (s.handed === null) return availablePieces(s).map((piece) => ({ kind: 'give' as const, piece }));
    return s.board.flatMap((p, square) => (p === null ? [{ kind: 'place' as const, square }] : []));
  },
  applyMove(s, move) {
    if (s.status.state !== 'playing' || !move) return null;
    if (move.kind === 'give') {
      if (s.handed !== null) return null;
      if (!Number.isInteger(move.piece) || !availablePieces(s).includes(move.piece)) return null;
      return { ...s, handed: move.piece, current: s.current === 1 ? 2 : 1 };
    }
    if (move.kind === 'place') {
      if (s.handed === null) return null;
      if (!Number.isInteger(move.square) || move.square < 0 || move.square >= SIZE * SIZE) return null;
      if (s.board[move.square] !== null) return null;
      const board = s.board.slice();
      board[move.square] = s.handed;
      const line = LINES.find((l) => l.includes(move.square) && winningLine(board, l));
      const full = board.every((p) => p !== null);
      const status: Outcome<Line> = line
        ? { state: 'won', winner: s.current, line }
        : full
          ? { state: 'draw' }
          : { state: 'playing' };
      return { board, handed: null, current: s.current, status };
    }
    return null;
  },
  getStatus: (s) => s.status,
};

/** Would placing `piece` anywhere on `board` win? */
export function winningSquares(board: (number | null)[], piece: number): number[] {
  const out: number[] = [];
  for (let sq = 0; sq < board.length; sq++) {
    if (board[sq] !== null) continue;
    const next = board.slice();
    next[sq] = piece;
    if (LINES.some((l) => l.includes(sq) && winningLine(next, l))) out.push(sq);
  }
  return out;
}
