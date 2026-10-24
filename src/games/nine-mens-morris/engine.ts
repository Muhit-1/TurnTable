import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

/**
 * 24 points: index = ring * 8 + pos, ring 0 = outer, 1 = middle, 2 = inner;
 * pos goes clockwise from the top-left corner: 0 TL, 1 T, 2 TR, 3 R, 4 BR, 5 B, 6 BL, 7 L.
 */
export const POINTS = 24;
export const PIECES_EACH = 9;
/** 100 plies of moving with no mill formed is a draw (the rules have no limit, but games must end). */
export const QUIET_LIMIT = 100;

export type Cell = PlayerId | null;
export type MorrisMove =
  | { kind: 'place'; to: number }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'remove'; at: number };

export interface MorrisState {
  points: Cell[];
  /** pieces still to be placed */
  hand: Record<PlayerId, number>;
  current: PlayerId;
  /** the current player just formed a mill and must remove an opponent piece */
  mustRemove: boolean;
  quiet: number;
  status: Outcome;
}

const ring = (r: number, p: number) => r * 8 + p;

export const MILLS: number[][] = [
  ...[0, 1, 2].flatMap((r) => [
    [ring(r, 0), ring(r, 1), ring(r, 2)],
    [ring(r, 2), ring(r, 3), ring(r, 4)],
    [ring(r, 4), ring(r, 5), ring(r, 6)],
    [ring(r, 6), ring(r, 7), ring(r, 0)],
  ]),
  ...[1, 3, 5, 7].map((p) => [ring(0, p), ring(1, p), ring(2, p)]),
];

export const ADJACENT: number[][] = Array.from({ length: POINTS }, (_, i) => {
  const r = Math.floor(i / 8);
  const p = i % 8;
  const out = [ring(r, (p + 1) % 8), ring(r, (p + 7) % 8)];
  if (p % 2 === 1) {
    if (r > 0) out.push(ring(r - 1, p));
    if (r < 2) out.push(ring(r + 1, p));
  }
  return out;
});

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
const piecesOnBoard = (points: Cell[], p: PlayerId) => points.filter((x) => x === p).length;
const totalPieces = (s: Pick<MorrisState, 'points' | 'hand'>, p: PlayerId) =>
  piecesOnBoard(s.points, p) + s.hand[p];

export const inMill = (points: Cell[], i: number): boolean =>
  MILLS.some((m) => m.includes(i) && m.every((k) => points[k] === points[i]));

/** Pieces the current player may remove: not in a mill, unless every opponent piece is in a mill. */
export function removable(points: Cell[], opponent: PlayerId): number[] {
  const all = points.flatMap((c, i) => (c === opponent ? [i] : []));
  const free = all.filter((i) => !inMill(points, i));
  return free.length ? free : all;
}

/** Slides (or flies, with exactly 3 pieces left and none in hand) available to `p`. */
export function movesFor(
  s: Pick<MorrisState, 'points' | 'hand'>,
  p: PlayerId,
): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  const flying = totalPieces(s, p) === 3;
  for (let from = 0; from < POINTS; from++) {
    if (s.points[from] !== p) continue;
    const targets = flying ? Array.from({ length: POINTS }, (_, i) => i) : ADJACENT[from];
    for (const to of targets) if (s.points[to] === null) out.push({ from, to });
  }
  return out;
}

function finishTurn(s: MorrisState, quiet: number): MorrisState {
  const next = other(s.current);
  const base: MorrisState = { ...s, current: next, mustRemove: false, quiet, status: { state: 'playing' } };
  if (totalPieces(base, next) < 3)
    return { ...base, current: s.current, status: { state: 'won', winner: s.current } };
  if (base.hand[next] === 0 && movesFor(base, next).length === 0) {
    return { ...base, status: { state: 'won', winner: s.current } };
  }
  if (quiet >= QUIET_LIMIT) return { ...base, status: { state: 'draw' } };
  return base;
}

export const morrisEngine: GameEngine<MorrisState, MorrisMove> = {
  initialState: () => ({
    points: Array<Cell>(POINTS).fill(null),
    hand: { 1: PIECES_EACH, 2: PIECES_EACH },
    current: 1,
    mustRemove: false,
    quiet: 0,
    status: { state: 'playing' },
  }),
  currentPlayer: (s) => s.current,
  legalMoves(s) {
    if (s.status.state !== 'playing') return [];
    if (s.mustRemove)
      return removable(s.points, other(s.current)).map((at) => ({ kind: 'remove' as const, at }));
    if (s.hand[s.current] > 0) {
      return s.points.flatMap((c, to) => (c === null ? [{ kind: 'place' as const, to }] : []));
    }
    return movesFor(s, s.current).map((m) => ({ kind: 'move' as const, ...m }));
  },
  applyMove(s, move) {
    if (s.status.state !== 'playing' || !move) return null;
    const legal = morrisEngine.legalMoves(s);
    const ok = legal.some((m) => JSON.stringify(m) === JSON.stringify(move));
    if (!ok) return null;

    if (move.kind === 'remove') {
      const points = s.points.slice();
      points[move.at] = null;
      return finishTurn({ ...s, points }, 0);
    }
    const points = s.points.slice();
    const hand = { ...s.hand };
    let quiet = s.quiet + 1;
    let to: number;
    if (move.kind === 'place') {
      to = move.to;
      points[to] = s.current;
      hand[s.current]--;
    } else {
      to = move.to;
      points[move.from] = null;
      points[to] = s.current;
    }
    const next = { ...s, points, hand };
    if (inMill(points, to)) {
      quiet = 0;
      if (removable(points, other(s.current)).length > 0) return { ...next, mustRemove: true, quiet };
    }
    return finishTurn(next, quiet);
  },
  getStatus: (s) => s.status,
};
