import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

/**
 * Go with Chinese-style area scoring: a player scores their stones plus the empty regions only they touch,
 * and White gets komi. Dead stones must be captured by play before both players pass.
 * Positional superko is enforced: a move may never recreate an earlier whole-board position (this covers ko).
 * Player 1 is Black (moves first), player 2 is White. Points are row * size + col, row 0 at the top.
 */
export const SIZES = [5, 9, 13, 19] as const;
export const DEFAULT_KOMI = 7.5;

export type Stone = 0 | 1 | 2;
export type GoMove = { kind: 'place'; point: number } | { kind: 'pass' };

export interface GoState {
  size: number;
  komi: number;
  cells: Stone[];
  current: PlayerId;
  /** stones each player has captured */
  captures: Record<PlayerId, number>;
  /** consecutive passes; two end the game */
  passes: number;
  /** keys of every position that has occurred (for superko) */
  seen: string[];
  /** last point played, -1 at the start, -2 after a pass */
  last: number;
  over: boolean;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
export const keyOf = (cells: Stone[]) => cells.join('');

export function neighbours(point: number, size: number): number[] {
  const r = Math.floor(point / size);
  const c = point % size;
  const out: number[] = [];
  if (r > 0) out.push(point - size);
  if (r < size - 1) out.push(point + size);
  if (c > 0) out.push(point - 1);
  if (c < size - 1) out.push(point + 1);
  return out;
}

/** The connected group containing `point` and the empty points next to it. */
export function groupAt(
  cells: Stone[],
  size: number,
  point: number,
): { stones: number[]; liberties: number[] } {
  const color = cells[point];
  const stones = [point];
  const seen = new Set<number>([point]);
  const libs = new Set<number>();
  for (let i = 0; i < stones.length; i++) {
    for (const n of neighbours(stones[i], size)) {
      if (cells[n] === 0) libs.add(n);
      else if (cells[n] === color && !seen.has(n)) {
        seen.add(n);
        stones.push(n);
      }
    }
  }
  return { stones, liberties: [...libs] };
}

export interface Placed {
  cells: Stone[];
  captured: number;
}

/** Places a stone and removes captured enemy groups. Returns null if the point is taken or the move is suicide. */
export function place(cells: Stone[], size: number, point: number, color: PlayerId): Placed | null {
  if (!Number.isInteger(point) || point < 0 || point >= size * size || cells[point] !== 0) return null;
  const next = cells.slice();
  next[point] = color;
  let captured = 0;
  const enemy = other(color);
  for (const n of neighbours(point, size)) {
    if (next[n] === enemy) {
      const g = groupAt(next, size, n);
      if (g.liberties.length === 0) {
        for (const s of g.stones) next[s] = 0;
        captured += g.stones.length;
      }
    }
  }
  if (groupAt(next, size, point).liberties.length === 0) return null; // suicide
  return { cells: next, captured };
}

export interface AreaScore {
  black: number;
  white: number;
  blackTerritory: number[];
  whiteTerritory: number[];
}

/** Stones plus surrounded empty regions for each colour (komi not included). */
export function areaScore(cells: Stone[], size: number): AreaScore {
  let black = 0;
  let white = 0;
  const blackTerritory: number[] = [];
  const whiteTerritory: number[] = [];
  const seen = new Set<number>();
  for (let p = 0; p < cells.length; p++) {
    if (cells[p] === 1) black++;
    else if (cells[p] === 2) white++;
    else if (!seen.has(p)) {
      const region = [p];
      seen.add(p);
      const touches = new Set<number>();
      for (let i = 0; i < region.length; i++) {
        for (const n of neighbours(region[i], size)) {
          if (cells[n] === 0) {
            if (!seen.has(n)) {
              seen.add(n);
              region.push(n);
            }
          } else touches.add(cells[n]);
        }
      }
      if (touches.size === 1) {
        if (touches.has(1)) {
          black += region.length;
          blackTerritory.push(...region);
        } else {
          white += region.length;
          whiteTerritory.push(...region);
        }
      }
    }
  }
  return { black, white, blackTerritory, whiteTerritory };
}

/** Black's margin over White after komi (positive = Black ahead). */
export function margin(s: Pick<GoState, 'cells' | 'size' | 'komi'>): number {
  const a = areaScore(s.cells, s.size);
  return a.black - (a.white + s.komi);
}

export function createGo(size = 9, komi = DEFAULT_KOMI): GameEngine<GoState, GoMove> {
  return {
    initialState() {
      const cells = Array<Stone>(size * size).fill(0);
      return {
        size,
        komi,
        cells,
        current: 1,
        captures: { 1: 0, 2: 0 },
        passes: 0,
        seen: [keyOf(cells)],
        last: -1,
        over: false,
      };
    },
    currentPlayer: (s) => s.current,
    legalMoves(s) {
      if (s.over) return [];
      const moves: GoMove[] = [];
      for (let p = 0; p < s.cells.length; p++) {
        if (s.cells[p] === 0 && goEngineAllows(s, p)) moves.push({ kind: 'place', point: p });
      }
      moves.push({ kind: 'pass' });
      return moves;
    },
    applyMove(s, move) {
      if (s.over || !move) return null;
      if (move.kind === 'pass') {
        const passes = s.passes + 1;
        return { ...s, current: other(s.current), passes, last: -2, over: passes >= 2 };
      }
      if (move.kind !== 'place') return null;
      const placed = place(s.cells, s.size, move.point, s.current);
      if (!placed) return null;
      const key = keyOf(placed.cells);
      if (s.seen.includes(key)) return null; // superko: this position has occurred before
      return {
        ...s,
        cells: placed.cells,
        current: other(s.current),
        captures: { ...s.captures, [s.current]: s.captures[s.current] + placed.captured },
        passes: 0,
        seen: [...s.seen, key],
        last: move.point,
      };
    },
    getStatus(s): Outcome {
      if (!s.over) return { state: 'playing' };
      const m = margin(s);
      if (m === 0) return { state: 'draw' };
      return { state: 'won', winner: m > 0 ? 1 : 2 };
    },
  };
}

/** Would placing at `point` be legal (not suicide, not repeating a position)? */
function goEngineAllows(s: GoState, point: number): boolean {
  const placed = place(s.cells, s.size, point, s.current);
  return !!placed && !s.seen.includes(keyOf(placed.cells));
}

export const goEngine = createGo(9);
