import type { Dictionary } from './dictionary';
import {
  CENTER,
  checkPlay,
  type Placement,
  RACK_SIZE,
  type ScrabbleMove,
  type ScrabbleState,
  SIZE,
  type Tile,
} from './engine';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Candidate {
  placements: Placement[];
}

/**
 * Every playable placement for the current rack (Appel & Jacobson style): for each anchor square next to the
 * tiles on the board, build words left to right using rack tiles, checking prefixes against the dictionary and
 * the perpendicular words as we go. Runs once per orientation (rows, then columns via transposition).
 */
export function generatePlays(s: ScrabbleState, dict: Dictionary): Placement[][] {
  const rack = s.racks[s.current];
  const boardEmpty = s.board.every((t) => t === null);
  const found: Candidate[] = [];

  for (const transposed of [false, true]) {
    // (line, pos) in the view -> real board coordinates
    const real = (line: number, pos: number): [number, number] => (transposed ? [pos, line] : [line, pos]);
    const tileAt = (line: number, pos: number): Tile | null => {
      if (line < 0 || line >= SIZE || pos < 0 || pos >= SIZE) return null;
      const [r, c] = real(line, pos);
      return s.board[r * SIZE + c];
    };

    /** Letters allowed at an empty square so the perpendicular word (if any) stays valid; null means anything. */
    const crossCache = new Map<number, Set<string> | null>();
    const crossSet = (line: number, pos: number): Set<string> | null => {
      const key = line * SIZE + pos;
      if (crossCache.has(key)) return crossCache.get(key) ?? null;
      let above = '';
      for (let l = line - 1; tileAt(l, pos); l--) above = (tileAt(l, pos) as Tile).letter + above;
      let below = '';
      for (let l = line + 1; tileAt(l, pos); l++) below += (tileAt(l, pos) as Tile).letter;
      let result: Set<string> | null = null;
      if (above || below) {
        result = new Set(LETTERS.filter((L) => dict.has(above + L + below)));
      }
      crossCache.set(key, result);
      return result;
    };

    const isAnchor = (line: number, pos: number): boolean => {
      if (tileAt(line, pos)) return false;
      if (boardEmpty) {
        const [r, c] = real(line, pos);
        return r * SIZE + c === CENTER;
      }
      return !!(
        tileAt(line - 1, pos) ||
        tileAt(line + 1, pos) ||
        tileAt(line, pos - 1) ||
        tileAt(line, pos + 1)
      );
    };

    for (let line = 0; line < SIZE; line++) {
      for (let anchor = 0; anchor < SIZE; anchor++) {
        if (!isAnchor(line, anchor)) continue;

        const extendRight = (partial: string, pos: number, left: string[], placed: Placement[]) => {
          const t = tileAt(line, pos);
          if (pos >= SIZE || !t) {
            if (pos > anchor && placed.length > 0 && dict.has(partial))
              found.push({ placements: placed.slice() });
          }
          if (pos >= SIZE) return;
          if (t) {
            if (dict.hasPrefix(partial + t.letter.toLowerCase()))
              extendRight(partial + t.letter.toLowerCase(), pos + 1, left, placed);
            return;
          }
          const allowed = crossSet(line, pos);
          const tried = new Set<string>();
          for (let i = 0; i < left.length; i++) {
            const tile = left[i];
            if (tried.has(tile)) continue;
            tried.add(tile);
            const options = tile === '?' ? LETTERS : [tile];
            for (const L of options) {
              if (allowed && !allowed.has(L)) continue;
              const next = partial + L.toLowerCase();
              if (!dict.hasPrefix(next)) continue;
              const [r, c] = real(line, pos);
              const rest = left.slice();
              rest.splice(i, 1);
              placed.push({ row: r, col: c, letter: L, blank: tile === '?' });
              extendRight(next, pos + 1, rest, placed);
              placed.pop();
            }
          }
        };

        if (tileAt(line, anchor - 1)) {
          // existing tiles directly to the left form the start of the word
          let start = anchor - 1;
          while (tileAt(line, start - 1)) start--;
          let prefix = '';
          for (let p = start; p < anchor; p++) prefix += (tileAt(line, p) as Tile).letter.toLowerCase();
          if (dict.hasPrefix(prefix)) extendRight(prefix, anchor, rack.slice(), []);
        } else {
          // free squares to the left (not themselves anchors) may be filled with rack tiles first
          let limit = 0;
          while (
            limit < RACK_SIZE - 1 &&
            anchor - limit - 1 >= 0 &&
            !tileAt(line, anchor - limit - 1) &&
            !isAnchor(line, anchor - limit - 1)
          )
            limit++;
          // enumerate left parts of length 0..limit by choosing letters left to right
          const leftParts = (
            partial: string,
            left: string[],
            placed: Placement[],
            length: number,
            target: number,
          ) => {
            if (length === target) {
              extendRight(partial, anchor, left, placed);
              return;
            }
            const pos = anchor - target + length;
            const allowed = crossSet(line, pos);
            const tried = new Set<string>();
            for (let i = 0; i < left.length; i++) {
              const tile = left[i];
              if (tried.has(tile)) continue;
              tried.add(tile);
              for (const L of tile === '?' ? LETTERS : [tile]) {
                if (allowed && !allowed.has(L)) continue;
                const next = partial + L.toLowerCase();
                if (!dict.hasPrefix(next)) continue;
                const [r, c] = real(line, pos);
                const rest = left.slice();
                rest.splice(i, 1);
                placed.push({ row: r, col: c, letter: L, blank: tile === '?' });
                leftParts(next, rest, placed, length + 1, target);
                placed.pop();
              }
            }
          };
          for (let target = 0; target <= limit; target++) leftParts('', rack.slice(), [], 0, target);
        }
      }
    }
  }
  return found.map((f) => f.placements);
}

/** Best-scoring play (greedy); exchanges when stuck and the bag allows it, otherwise passes. */
export function getBestMove(s: ScrabbleState, dict: Dictionary): ScrabbleMove {
  let best: Placement[] | null = null;
  let bestScore = -1;
  for (const placements of generatePlays(s, dict)) {
    const check = checkPlay(s.board, dict, placements);
    if (check.ok && check.total > bestScore) {
      bestScore = check.total;
      best = placements;
    }
  }
  if (best) return { kind: 'play', placements: best };
  if (s.bag.length >= RACK_SIZE) {
    // throw back the highest-value tiles except blanks and S, which are worth keeping
    const keep = new Set(['?', 'S']);
    const toss = s.racks[s.current].filter((l) => !keep.has(l));
    return { kind: 'exchange', letters: toss.length ? toss : s.racks[s.current].slice() };
  }
  return { kind: 'pass' };
}

/**
 * Hard plays the highest-scoring word; medium picks randomly among the five best; easy among all valid plays.
 * Falls back to exchanging or passing when there is no play.
 */
export function chooseMove(
  s: ScrabbleState,
  dict: Dictionary,
  level: 'easy' | 'medium' | 'hard',
  random: () => number = Math.random,
): ScrabbleMove {
  if (level === 'hard') return getBestMove(s, dict);
  const scored: { placements: Placement[]; total: number }[] = [];
  for (const placements of generatePlays(s, dict)) {
    const check = checkPlay(s.board, dict, placements);
    if (check.ok) scored.push({ placements, total: check.total });
  }
  if (scored.length === 0) return getBestMove(s, dict);
  scored.sort((a, b) => b.total - a.total);
  const pool = level === 'medium' ? scored.slice(0, 5) : scored;
  return { kind: 'play', placements: pool[Math.floor(random() * pool.length)].placements };
}
