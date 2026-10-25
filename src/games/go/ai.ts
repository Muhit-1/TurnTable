import type { PlayerId } from '../../shared/engine';
import type { Level } from '../../shared/level';
import { createGo, type GoMove, type GoState, neighbours } from './engine';

export type { Level };
export interface SearchOptions {
  timeMs: number;
  /** stop after this many playouts even if time remains (used for repeatable tests) */
  maxPlayouts?: number;
  /** chance (0-1) of playing a random sensible move instead of the searched one */
  blunder?: number;
}
export const LEVELS: Record<Level, SearchOptions> = {
  easy: { timeMs: 300, blunder: 0.2 },
  medium: { timeMs: 1500 },
  hard: { timeMs: 4000 },
};

const PASS = -1;

// --- a fast mutable board for playouts ---------------------------------------------------------

const neighbourCache = new Map<number, number[][]>();
const nbTable = (n: number) => {
  let t = neighbourCache.get(n);
  if (!t) {
    t = Array.from({ length: n * n }, (_, p) => neighbours(p, n));
    neighbourCache.set(n, t);
  }
  return t;
};

class FastBoard {
  readonly n: number;
  readonly cells: Int8Array;
  readonly nb: number[][];
  /** the point a simple ko forbids right now, or -1 */
  ko = -1;
  private mark: Int32Array;
  private stamp = 0;
  private stack: number[] = [];

  constructor(n: number, cells?: Int8Array) {
    this.n = n;
    this.nb = nbTable(n);
    this.cells = cells ? cells.slice() : new Int8Array(n * n);
    this.mark = new Int32Array(n * n);
  }

  clone(): FastBoard {
    const b = new FastBoard(this.n, this.cells);
    b.ko = this.ko;
    return b;
  }

  /** Does the group containing `p` have at least one empty neighbour? */
  private hasLiberty(p: number): boolean {
    const color = this.cells[p];
    const stamp = ++this.stamp;
    const stack = this.stack;
    stack.length = 0;
    stack.push(p);
    this.mark[p] = stamp;
    while (stack.length) {
      const q = stack.pop() as number;
      for (const r of this.nb[q]) {
        const c = this.cells[r];
        if (c === 0) return true;
        if (c === color && this.mark[r] !== stamp) {
          this.mark[r] = stamp;
          stack.push(r);
        }
      }
    }
    return false;
  }

  private removeGroup(p: number): number {
    const color = this.cells[p];
    const stones = [p];
    this.cells[p] = 0;
    for (let i = 0; i < stones.length; i++) {
      for (const r of this.nb[stones[i]]) {
        if (this.cells[r] === color) {
          this.cells[r] = 0;
          stones.push(r);
        }
      }
    }
    return stones.length;
  }

  /** Plays a stone. Returns false (leaving the board unchanged) if illegal: occupied, simple ko, or suicide. */
  play(p: number, color: number): boolean {
    if (this.cells[p] !== 0 || p === this.ko) return false;
    const enemy = 3 - color;
    this.cells[p] = color;
    let captured = 0;
    let lastCaptured = -1;
    for (const q of this.nb[p]) {
      if (this.cells[q] === enemy && !this.hasLiberty(q)) {
        lastCaptured = q;
        captured += this.removeGroup(q);
      }
    }
    if (!this.hasLiberty(p)) {
      this.cells[p] = 0;
      return false;
    }
    this.ko = -1;
    if (captured === 1) {
      let friends = 0;
      let empties = 0;
      for (const q of this.nb[p]) {
        if (this.cells[q] === color) friends++;
        else if (this.cells[q] === 0) empties++;
      }
      if (friends === 0 && empties === 1) this.ko = lastCaptured;
    }
    return true;
  }

  /** A point surrounded by own stones that the owner should not fill (keeps groups alive in playouts). */
  isEye(p: number, color: number): boolean {
    for (const q of this.nb[p]) if (this.cells[q] !== color) return false;
    const n = this.n;
    const r = Math.floor(p / n);
    const c = p % n;
    let offBoard = 0;
    let enemyDiagonals = 0;
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) offBoard++;
      else if (this.cells[rr * n + cc] === 3 - color) enemyDiagonals++;
    }
    return offBoard > 0 ? enemyDiagonals === 0 : enemyDiagonals <= 1;
  }

  /** Black's area margin over White (before komi). */
  areaMargin(): number {
    let black = 0;
    let white = 0;
    const stamp = ++this.stamp;
    const stack = this.stack;
    for (let p = 0; p < this.cells.length; p++) {
      const c = this.cells[p];
      if (c === 1) black++;
      else if (c === 2) white++;
      else if (this.mark[p] !== stamp) {
        let size = 0;
        let touchesBlack = false;
        let touchesWhite = false;
        stack.length = 0;
        stack.push(p);
        this.mark[p] = stamp;
        while (stack.length) {
          const q = stack.pop() as number;
          size++;
          for (const r of this.nb[q]) {
            const rc = this.cells[r];
            if (rc === 0) {
              if (this.mark[r] !== stamp) {
                this.mark[r] = stamp;
                stack.push(r);
              }
            } else if (rc === 1) touchesBlack = true;
            else touchesWhite = true;
          }
        }
        if (touchesBlack && !touchesWhite) black += size;
        else if (touchesWhite && !touchesBlack) white += size;
      }
    }
    return black - white;
  }
}

// --- search ------------------------------------------------------------------------------------

interface Node {
  /** the point played to reach this node (PASS for a pass); -2 at the root */
  move: number;
  /** who played `move` */
  color: PlayerId;
  parent: Node | null;
  children: Node[];
  untried: number[] | null;
  visits: number;
  /** playouts won by `color` */
  wins: number;
}

export interface SearchResult {
  /** root moves, most promising first; -1 means pass */
  ranked: number[];
  playouts: number;
}

/** Monte Carlo tree search (UCT) from the position in `state`. */
export function searchGo(
  state: Pick<GoState, 'size' | 'cells' | 'current' | 'passes' | 'komi'>,
  options: SearchOptions,
  random: () => number = Math.random,
): SearchResult {
  const n = state.size;
  const root = new FastBoard(n, Int8Array.from(state.cells));
  const me = state.current;
  const komi = state.komi;
  const cap = n * n * 2;

  const shuffle = (a: number[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const candidates = (b: FastBoard, color: number, allowPass: boolean): number[] => {
    const moves: number[] = [];
    for (let p = 0; p < b.cells.length; p++)
      if (b.cells[p] === 0 && p !== b.ko && !b.isEye(p, color)) moves.push(p);
    shuffle(moves);
    if (allowPass || moves.length === 0) moves.push(PASS); // pass is tried last
    return moves;
  };

  const playout = (b: FastBoard, toMove: number, passedBefore: boolean): number => {
    let color = toMove;
    let passes = passedBefore ? 1 : 0;
    for (let i = 0; i < cap && passes < 2; i++) {
      const moves: number[] = [];
      for (let p = 0; p < b.cells.length; p++)
        if (b.cells[p] === 0 && p !== b.ko && !b.isEye(p, color)) moves.push(p);
      let played = false;
      while (moves.length) {
        const k = Math.floor(random() * moves.length);
        const p = moves[k];
        moves[k] = moves[moves.length - 1];
        moves.pop();
        if (b.play(p, color)) {
          played = true;
          break;
        }
      }
      passes = played ? 0 : passes + 1;
      color = 3 - color;
    }
    return b.areaMargin() - komi;
  };

  const newNode = (move: number, color: PlayerId, parent: Node | null): Node => ({
    move,
    color,
    parent,
    children: [],
    untried: null,
    visits: 0,
    wins: 0,
  });
  const tree = newNode(-2, (3 - me) as PlayerId, null);
  const deadline = Date.now() + options.timeMs;
  const maxPlayouts = options.maxPlayouts ?? Number.POSITIVE_INFINITY;
  let playouts = 0;

  while (playouts < maxPlayouts && (playouts & 31 || Date.now() < deadline)) {
    const b = root.clone();
    let node = tree;
    let toMove: number = me;
    let passes = state.passes; // consecutive passes so far; two end the game

    // selection: follow the best UCB child while every move from the node has been tried
    for (;;) {
      if (passes >= 2) break;
      if (node.untried === null) node.untried = candidates(b, toMove, passes > 0);
      if (node.untried.length > 0 || node.children.length === 0) break;
      const lnN = Math.log(node.visits + 1);
      let best = node.children[0];
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const ch of node.children) {
        const score = ch.wins / (ch.visits || 1) + 0.7 * Math.sqrt(lnN / (ch.visits || 1));
        if (score > bestScore) {
          bestScore = score;
          best = ch;
        }
      }
      node = best;
      if (node.move === PASS) passes++;
      else {
        b.play(node.move, node.color);
        passes = 0;
      }
      toMove = 3 - toMove;
    }

    // expansion: try one new move from this node
    if (passes < 2 && node.untried && node.untried.length > 0) {
      while (node.untried.length > 0) {
        const move = node.untried.pop() as number;
        if (move === PASS) passes++;
        else if (b.play(move, toMove)) passes = 0;
        else continue; // not legal after all (suicide): try the next one
        const child = newNode(move, toMove as PlayerId, node);
        node.children.push(child);
        node = child;
        toMove = 3 - toMove;
        break;
      }
    }

    // simulation and backpropagation
    const margin = passes >= 2 ? b.areaMargin() - komi : playout(b, toMove, passes > 0);
    backprop(node, margin > 0 ? 1 : 2);
    playouts++;
  }

  const ranked = tree.children
    .slice()
    .sort((a, c) => c.visits - a.visits)
    .map((c) => c.move);
  return { ranked, playouts };
}

function backprop(node: Node | null, winner: number) {
  for (let n = node; n; n = n.parent) {
    n.visits++;
    if (n.color === winner) n.wins++;
  }
}

/** Picks the computer's move: searches, then returns the best-ranked move that is legal in the real game. */
export function chooseMove(state: GoState, level: Level, random: () => number = Math.random): GoMove {
  const engine = createGo(state.size, state.komi);
  const opts = LEVELS[level];
  const legal = engine
    .legalMoves(state)
    .filter((m): m is Extract<GoMove, { kind: 'place' }> => m.kind === 'place');
  if (legal.length === 0) return { kind: 'pass' };

  if (opts.blunder && random() < opts.blunder) {
    // a random move that does not fill one of its own eyes
    const board = new FastBoard(state.size, Int8Array.from(state.cells));
    const sensible = legal.filter((m) => !board.isEye(m.point, state.current));
    if (sensible.length) return sensible[Math.floor(random() * sensible.length)];
  }

  const { ranked } = searchGo(state, opts, random);
  for (const point of ranked) {
    const move: GoMove = point === PASS ? { kind: 'pass' } : { kind: 'place', point };
    if (engine.applyMove(state, move)) return move;
  }
  return { kind: 'pass' };
}
