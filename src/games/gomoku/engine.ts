import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

export const SIZE = 15;
export type Cell = PlayerId | null;
export type Line = number[]; // cell indices of the winning run

export interface GomokuState {
  cells: Cell[]; // SIZE*SIZE, row-major
  current: PlayerId;
  last: number | null;
  status: Outcome<Line>;
}

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** Winning run (5 or more, "freestyle" rule) through `index`, or null. */
export function winningRun(cells: Cell[], index: number): Line | null {
  const p = cells[index];
  if (!p) return null;
  const r0 = Math.floor(index / SIZE);
  const c0 = index % SIZE;
  for (const [dr, dc] of DIRS) {
    const run = [index];
    for (const sign of [1, -1]) {
      let r = r0 + dr * sign;
      let c = c0 + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === p) {
        run.push(r * SIZE + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (run.length >= 5) return run;
  }
  return null;
}

export const gomokuEngine: GameEngine<GomokuState, number, Line> = {
  initialState: () => ({
    cells: Array<Cell>(SIZE * SIZE).fill(null),
    current: 1,
    last: null,
    status: { state: 'playing' },
  }),
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (s.status.state === 'playing' ? s.cells.flatMap((c, i) => (c === null ? [i] : [])) : []),
  applyMove(s, i) {
    if (
      s.status.state !== 'playing' ||
      !Number.isInteger(i) ||
      i < 0 ||
      i >= SIZE * SIZE ||
      s.cells[i] !== null
    ) {
      return null;
    }
    const cells = s.cells.slice();
    cells[i] = s.current;
    const line = winningRun(cells, i);
    const status: Outcome<Line> = line
      ? { state: 'won', winner: s.current, line }
      : cells.every((c) => c !== null)
        ? { state: 'draw' }
        : { state: 'playing' };
    return { cells, current: s.current === 1 ? 2 : 1, last: i, status };
  },
  getStatus: (s) => s.status,
};
