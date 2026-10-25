import type { PlayerId } from '../../shared/engine';
import { type Level, maybeRandom } from '../../shared/level';
import { type Cell, type HexState, hexEngine, neighbours, SIZE } from './engine';

/** Fewest empty cells `p` still needs to fill to connect its sides (0-1 BFS; own stones are free, opponent blocks). */
export function distance(cells: Cell[], p: PlayerId): number {
  const opp: PlayerId = p === 1 ? 2 : 1;
  const dist = new Array<number>(SIZE * SIZE).fill(Number.POSITIVE_INFINITY);
  const deque: number[] = [];
  const cost = (i: number) => (cells[i] === p ? 0 : 1);
  for (let k = 0; k < SIZE; k++) {
    const i = p === 1 ? k : k * SIZE;
    if (cells[i] === opp) continue;
    dist[i] = cost(i);
    deque.push(i);
  }
  // Dijkstra with tiny weights; the board is small enough for a simple relaxation queue.
  while (deque.length) {
    deque.sort((a, b) => dist[a] - dist[b]);
    const cur = deque.shift() as number;
    for (const nb of neighbours(cur)) {
      if (cells[nb] === opp) continue;
      const d = dist[cur] + cost(nb);
      if (d < dist[nb]) {
        dist[nb] = d;
        deque.push(nb);
      }
    }
  }
  let best = Number.POSITIVE_INFINITY;
  for (let k = 0; k < SIZE; k++) {
    const i = p === 1 ? (SIZE - 1) * SIZE + k : k * SIZE + (SIZE - 1);
    best = Math.min(best, dist[i]);
  }
  return best;
}

/** Greedy: place the stone that most improves (opponent distance - own distance), preferring the centre. */
export function getBestMove(s: HexState): number {
  const me = s.current;
  const opp: PlayerId = me === 1 ? 2 : 1;
  const mid = (SIZE - 1) / 2;
  let best = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== null) continue;
    const next = s.cells.slice();
    next[i] = me;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const score =
      distance(next, opp) - distance(next, me) * 1.2 - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function chooseMove(s: HexState, level: Level, random: () => number = Math.random): number {
  return maybeRandom(level, getBestMove(s), hexEngine.legalMoves(s), random);
}
