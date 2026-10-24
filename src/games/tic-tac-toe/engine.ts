import type { GameEngine, PlayerId } from '../../shared/engine';

export type Cell = PlayerId | null;
export type Line = [number, number, number];

export interface TttState {
  cells: Cell[]; // 9 cells, row-major
  current: PlayerId;
}

const LINES: Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function findWinner(cells: Cell[]): { winner: PlayerId; line: Line } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const v = cells[a];
    if (v && v === cells[b] && v === cells[c]) return { winner: v, line };
  }
  return null;
}

export const tttEngine: GameEngine<TttState, number, Line> = {
  initialState: () => ({ cells: Array<Cell>(9).fill(null), current: 1 }),
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (findWinner(s.cells) ? [] : s.cells.flatMap((c, i) => (c === null ? [i] : []))),
  applyMove(s, i) {
    if (!Number.isInteger(i) || i < 0 || i > 8 || s.cells[i] !== null || findWinner(s.cells)) return null;
    const cells = s.cells.slice();
    cells[i] = s.current;
    return { cells, current: s.current === 1 ? 2 : 1 };
  },
  getStatus(s) {
    const w = findWinner(s.cells);
    if (w) return { state: 'won', winner: w.winner, line: w.line };
    return s.cells.every((c) => c !== null) ? { state: 'draw' } : { state: 'playing' };
  },
};
