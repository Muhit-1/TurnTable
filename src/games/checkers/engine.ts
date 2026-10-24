import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

export const SIZE = 8;
/** 80 plies (40 moves each) without a capture or a man moving is a draw. */
export const QUIET_LIMIT = 80;

export interface Piece {
  owner: PlayerId;
  king: boolean;
}
export type Cell = Piece | null;

/**
 * A move is the full list of squares the piece visits: [from, to] for a step,
 * [from, land1, land2, ...] for a capture sequence. Squares are row * 8 + col, row 0 at the top.
 * Player 1 starts at the bottom and moves up; player 2 starts at the top and moves down.
 */
export type CheckersMove = number[];

export interface CheckersState {
  cells: Cell[];
  current: PlayerId;
  quiet: number;
}

const rc = (i: number): [number, number] => [Math.floor(i / SIZE), i % SIZE];
const sq = (r: number, c: number) => r * SIZE + c;
const inside = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
export const isDark = (r: number, c: number) => (r + c) % 2 === 1;
const kingRow = (p: PlayerId) => (p === 1 ? 0 : SIZE - 1);
const forward = (p: PlayerId) => (p === 1 ? -1 : 1);

function dirsFor(piece: Piece): [number, number][] {
  if (piece.king) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  }
  const f = forward(piece.owner);
  return [
    [f, -1],
    [f, 1],
  ];
}

/** Capture sequences for the piece at `from`, on a board where earlier captures are already removed. */
function jumpsFrom(cells: Cell[], from: number, piece: Piece, path: number[], out: CheckersMove[]): void {
  const [r, c] = rc(from);
  let extended = false;
  for (const [dr, dc] of dirsFor(piece)) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!inside(lr, lc)) continue;
    const mid = cells[sq(mr, mc)];
    if (!mid || mid.owner === piece.owner || cells[sq(lr, lc)] !== null) continue;
    extended = true;
    const next = cells.slice();
    next[from] = null;
    next[sq(mr, mc)] = null;
    const land = sq(lr, lc);
    const becomesKing = !piece.king && lr === kingRow(piece.owner);
    next[land] = { owner: piece.owner, king: piece.king || becomesKing };
    if (becomesKing)
      out.push([...path, land]); // reaching the king row ends the move
    else jumpsFrom(next, land, piece, [...path, land], out);
  }
  if (!extended && path.length > 1) out.push(path);
}

export function movesFor(cells: Cell[], player: PlayerId): CheckersMove[] {
  const jumps: CheckersMove[] = [];
  const steps: CheckersMove[] = [];
  for (let i = 0; i < cells.length; i++) {
    const piece = cells[i];
    if (!piece || piece.owner !== player) continue;
    jumpsFrom(cells, i, piece, [i], jumps);
    const [r, c] = rc(i);
    for (const [dr, dc] of dirsFor(piece)) {
      if (inside(r + dr, c + dc) && cells[sq(r + dr, c + dc)] === null) steps.push([i, sq(r + dr, c + dc)]);
    }
  }
  return jumps.length ? jumps : steps; // capturing is mandatory
}

export const isCapture = (m: CheckersMove) => Math.abs(rc(m[0])[0] - rc(m[1])[0]) === 2;

export function applyToCells(cells: Cell[], move: CheckersMove): Cell[] {
  const next = cells.slice();
  const piece = next[move[0]] as Piece;
  next[move[0]] = null;
  for (let k = 1; k < move.length; k++) {
    const [r1, c1] = rc(move[k - 1]);
    const [r2, c2] = rc(move[k]);
    if (Math.abs(r2 - r1) === 2) next[sq((r1 + r2) / 2, (c1 + c2) / 2)] = null;
  }
  const last = move[move.length - 1];
  const promoted = !piece.king && rc(last)[0] === kingRow(piece.owner);
  next[last] = { owner: piece.owner, king: piece.king || promoted };
  return next;
}

export const checkersEngine: GameEngine<CheckersState, CheckersMove> = {
  initialState() {
    const cells = Array<Cell>(SIZE * SIZE).fill(null);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!isDark(r, c)) continue;
        if (r < 3) cells[sq(r, c)] = { owner: 2, king: false };
        else if (r > 4) cells[sq(r, c)] = { owner: 1, king: false };
      }
    }
    return { cells, current: 1, quiet: 0 };
  },
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (checkersEngine.getStatus(s).state === 'playing' ? movesFor(s.cells, s.current) : []),
  applyMove(s, move) {
    if (checkersEngine.getStatus(s).state !== 'playing' || !Array.isArray(move)) return null;
    const key = move.join(',');
    const legal = movesFor(s.cells, s.current).find((m) => m.join(',') === key);
    if (!legal) return null;
    const mover = s.cells[legal[0]] as Piece;
    const quiet = isCapture(legal) || !mover.king ? 0 : s.quiet + 1;
    return { cells: applyToCells(s.cells, legal), current: s.current === 1 ? 2 : 1, quiet };
  },
  getStatus(s): Outcome {
    if (movesFor(s.cells, s.current).length === 0) return { state: 'won', winner: s.current === 1 ? 2 : 1 };
    if (s.quiet >= QUIET_LIMIT) return { state: 'draw' };
    return { state: 'playing' };
  },
};

export function countPieces(cells: Cell[]): Record<PlayerId, { men: number; kings: number }> {
  const t = { 1: { men: 0, kings: 0 }, 2: { men: 0, kings: 0 } };
  for (const c of cells) if (c) t[c.owner][c.king ? 'kings' : 'men']++;
  return t;
}
