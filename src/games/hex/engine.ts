import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

export const SIZE = 11;
export type Cell = PlayerId | null;
export type Line = number[]; // winning chain, cell indices

export interface HexState {
  cells: Cell[]; // SIZE*SIZE, row-major
  current: PlayerId;
  status: Outcome<Line>;
}

/** Player 1 connects top (row 0) to bottom (row SIZE-1); player 2 connects left (col 0) to right (col SIZE-1). */
const NEIGHBOURS: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [1, -1],
];

export function neighbours(i: number, size = SIZE): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  for (const [dr, dc] of NEIGHBOURS) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size) out.push(rr * size + cc);
  }
  return out;
}

/** Shortest chain of `p` stones linking its two sides, or null. */
export function findChain(cells: Cell[], p: PlayerId, size = SIZE): Line | null {
  const starts: number[] = [];
  for (let k = 0; k < size; k++) starts.push(p === 1 ? k : k * size);
  const isGoal = (i: number) => (p === 1 ? Math.floor(i / size) === size - 1 : i % size === size - 1);
  const parent = new Map<number, number>();
  const queue: number[] = [];
  for (const s of starts) {
    if (cells[s] === p) {
      parent.set(s, -1);
      queue.push(s);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q];
    if (isGoal(cur)) {
      const chain: number[] = [];
      for (let n = cur; n !== -1; n = parent.get(n) as number) chain.push(n);
      return chain.reverse();
    }
    for (const nb of neighbours(cur, size)) {
      if (cells[nb] === p && !parent.has(nb)) {
        parent.set(nb, cur);
        queue.push(nb);
      }
    }
  }
  return null;
}

export const hexEngine: GameEngine<HexState, number, Line> = {
  initialState: () => ({
    cells: Array<Cell>(SIZE * SIZE).fill(null),
    current: 1,
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
    const chain = findChain(cells, s.current);
    // Hex has no draws: a full board always contains exactly one winning chain.
    const status: Outcome<Line> = chain
      ? { state: 'won', winner: s.current, line: chain }
      : { state: 'playing' };
    return { cells, current: s.current === 1 ? 2 : 1, status };
  },
  getStatus: (s) => s.status,
};
