import type { PlayerId } from '../../shared/engine';
import { type Level, maybeRandom } from '../../shared/level';
import { type Cell, type GomokuState, gomokuEngine, SIZE } from './engine';

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** Score for a run of `len` stones with `open` open ends (0-2). */
function patternScore(len: number, open: number): number {
  if (len >= 5) return 100000;
  if (open === 0) return 0;
  if (len === 4) return open === 2 ? 10000 : 1000;
  if (len === 3) return open === 2 ? 1000 : 100;
  if (len === 2) return open === 2 ? 100 : 10;
  return open === 2 ? 10 : 1;
}

/** How valuable placing `p` at (r, c) would be, summed over the four directions. */
function cellValue(cells: Cell[], r0: number, c0: number, p: PlayerId): number {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let len = 1;
    let open = 0;
    for (const sign of [1, -1]) {
      let r = r0 + dr * sign;
      let c = c0 + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === p) {
        len++;
        r += dr * sign;
        c += dc * sign;
      }
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c] === null) open++;
    }
    total += patternScore(len, open);
  }
  return total;
}

/** One-ply heuristic: win now > block loss > best combined attack/defence near existing stones. */
export function getBestMove(s: GomokuState): number {
  const me = s.current;
  const opp: PlayerId = me === 1 ? 2 : 1;
  const stones = s.cells.some((c) => c !== null);
  if (!stones) return Math.floor(SIZE / 2) * SIZE + Math.floor(SIZE / 2);

  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== null) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    // only consider cells within 2 of an existing stone
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && s.cells[rr * SIZE + cc] !== null) {
          near = true;
          break;
        }
      }
    if (!near) continue;
    const centerBias = 7 - Math.max(Math.abs(r - 7), Math.abs(c - 7));
    const score = cellValue(s.cells, r, c, me) * 1.1 + cellValue(s.cells, r, c, opp) + centerBias;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function chooseMove(s: GomokuState, level: Level, random: () => number = Math.random): number {
  return maybeRandom(level, getBestMove(s), gomokuEngine.legalMoves(s), random);
}
