import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

export const SIZE = 8;
export type Cell = PlayerId | null;

/** Player 1 = dark (moves first), player 2 = light. */
export interface ReversiState {
  cells: Cell[]; // 64, row-major
  current: PlayerId;
  /** player who just had to pass because they had no legal move, if any */
  skipped: PlayerId | null;
  over: boolean;
}

const DIRS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/** Indices that would be flipped if `p` played at `i` (empty array = illegal). */
export function flipsFor(cells: Cell[], i: number, p: PlayerId): number[] {
  if (cells[i] !== null) return [];
  const opp: PlayerId = p === 1 ? 2 : 1;
  const r0 = Math.floor(i / SIZE);
  const c0 = i % SIZE;
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    const run: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === opp) {
      run.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (run.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === p)
      flips.push(...run);
  }
  return flips;
}

export function movesFor(cells: Cell[], p: PlayerId): number[] {
  const out: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (flipsFor(cells, i, p).length) out.push(i);
  return out;
}

export function count(cells: Cell[]): Record<PlayerId, number> {
  const t: Record<PlayerId, number> = { 1: 0, 2: 0 };
  for (const c of cells) if (c) t[c]++;
  return t;
}

export const reversiEngine: GameEngine<ReversiState, number> = {
  initialState() {
    const cells = Array<Cell>(SIZE * SIZE).fill(null);
    // standard start: light on d4/e5, dark on e4/d5
    cells[3 * SIZE + 3] = 2;
    cells[4 * SIZE + 4] = 2;
    cells[3 * SIZE + 4] = 1;
    cells[4 * SIZE + 3] = 1;
    return { cells, current: 1, skipped: null, over: false };
  },
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (s.over ? [] : movesFor(s.cells, s.current)),
  applyMove(s, i) {
    if (s.over || !Number.isInteger(i) || i < 0 || i >= SIZE * SIZE) return null;
    const flips = flipsFor(s.cells, i, s.current);
    if (flips.length === 0) return null;
    const cells = s.cells.slice();
    cells[i] = s.current;
    for (const f of flips) cells[f] = s.current;

    const opp: PlayerId = s.current === 1 ? 2 : 1;
    if (movesFor(cells, opp).length) return { cells, current: opp, skipped: null, over: false };
    // Opponent must pass; if the mover can't continue either, the game is over.
    if (movesFor(cells, s.current).length) return { cells, current: s.current, skipped: opp, over: false };
    return { cells, current: opp, skipped: null, over: true };
  },
  getStatus(s): Outcome {
    if (!s.over) return { state: 'playing' };
    const n = count(s.cells);
    if (n[1] === n[2]) return { state: 'draw' };
    return { state: 'won', winner: n[1] > n[2] ? 1 : 2 };
  },
};
