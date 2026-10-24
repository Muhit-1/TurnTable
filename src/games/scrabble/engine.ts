import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';
import { randomSeed, shuffle } from '../../shared/rng';
import type { Dictionary } from './dictionary';

export const SIZE = 15;
export const RACK_SIZE = 7;
export const BINGO_BONUS = 50;
/** Six scoreless turns in a row (passes or exchanges) end the game. */
export const SCORELESS_LIMIT = 6;
export const CENTER = 7 * SIZE + 7;

export const LETTER_COUNTS: Record<string, number> = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
  '?': 2,
};
export const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
  '?': 0,
};

export type Premium = 'TW' | 'DW' | 'TL' | 'DL' | null;
const TW = [
  [0, 0],
  [0, 7],
  [0, 14],
  [7, 0],
  [7, 14],
  [14, 0],
  [14, 7],
  [14, 14],
];
const DW = [
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 4],
  [1, 13],
  [2, 12],
  [3, 11],
  [4, 10],
  [13, 1],
  [12, 2],
  [11, 3],
  [10, 4],
  [13, 13],
  [12, 12],
  [11, 11],
  [10, 10],
  [7, 7],
];
const TL = [
  [1, 5],
  [1, 9],
  [5, 1],
  [5, 5],
  [5, 9],
  [5, 13],
  [9, 1],
  [9, 5],
  [9, 9],
  [9, 13],
  [13, 5],
  [13, 9],
];
const DL = [
  [0, 3],
  [0, 11],
  [2, 6],
  [2, 8],
  [3, 0],
  [3, 7],
  [3, 14],
  [6, 2],
  [6, 6],
  [6, 8],
  [6, 12],
  [7, 3],
  [7, 11],
  [8, 2],
  [8, 6],
  [8, 8],
  [8, 12],
  [11, 0],
  [11, 7],
  [11, 14],
  [12, 6],
  [12, 8],
  [14, 3],
  [14, 11],
];

export const PREMIUMS: Premium[] = (() => {
  const grid = Array<Premium>(SIZE * SIZE).fill(null);
  for (const [r, c] of TW) grid[r * SIZE + c] = 'TW';
  for (const [r, c] of DW) grid[r * SIZE + c] = 'DW';
  for (const [r, c] of TL) grid[r * SIZE + c] = 'TL';
  for (const [r, c] of DL) grid[r * SIZE + c] = 'DL';
  return grid;
})();

export interface Tile {
  letter: string; // A-Z (for a blank, the letter it stands for)
  blank: boolean;
}
export interface Placement {
  row: number;
  col: number;
  letter: string;
  blank: boolean;
}

export type ScrabbleMove =
  | { kind: 'play'; placements: Placement[] }
  | { kind: 'pass' }
  | { kind: 'exchange'; letters: string[] };

export interface ScrabbleState {
  board: (Tile | null)[];
  racks: Record<PlayerId, string[]>; // 'A'-'Z' or '?' for a blank
  bag: string[];
  scores: Record<PlayerId, number>;
  current: PlayerId;
  seed: number;
  scoreless: number;
  last: { player: PlayerId; kind: 'play' | 'pass' | 'exchange'; words: string[]; score: number } | null;
  over: boolean;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
export const rackValue = (rack: string[]) => rack.reduce((a, l) => a + LETTER_VALUES[l], 0);

export function fullBag(): string[] {
  return Object.entries(LETTER_COUNTS).flatMap(([l, n]) => Array<string>(n).fill(l));
}

export interface WordScore {
  word: string;
  score: number;
}
export type PlayCheck =
  | { ok: true; words: WordScore[]; total: number; bingo: boolean }
  | { ok: false; error: string };

/** Validates a set of placements against the board and dictionary and scores it. Does not look at the rack. */
export function checkPlay(board: (Tile | null)[], dict: Dictionary, placements: Placement[]): PlayCheck {
  if (!placements.length) return { ok: false, error: 'Place at least one tile.' };
  const seen = new Set<number>();
  for (const p of placements) {
    if (
      !Number.isInteger(p.row) ||
      !Number.isInteger(p.col) ||
      p.row < 0 ||
      p.col < 0 ||
      p.row >= SIZE ||
      p.col >= SIZE
    ) {
      return { ok: false, error: 'A tile is off the board.' };
    }
    const idx = p.row * SIZE + p.col;
    if (board[idx] !== null) return { ok: false, error: 'A square is already taken.' };
    if (seen.has(idx)) return { ok: false, error: 'Two tiles on the same square.' };
    if (!/^[A-Z]$/.test(p.letter)) return { ok: false, error: 'Tiles must be letters A-Z.' };
    seen.add(idx);
  }

  const next = board.slice();
  for (const p of placements) next[p.row * SIZE + p.col] = { letter: p.letter, blank: !!p.blank };
  const get = (r: number, c: number) =>
    r >= 0 && r < SIZE && c >= 0 && c < SIZE ? next[r * SIZE + c] : null;
  const isNew = (r: number, c: number) => seen.has(r * SIZE + c);

  const sameRow = placements.every((p) => p.row === placements[0].row);
  const sameCol = placements.every((p) => p.col === placements[0].col);
  if (!sameRow && !sameCol) return { ok: false, error: 'Tiles must be in a single row or column.' };
  let horizontal = sameRow;
  if (placements.length === 1) {
    const { row, col } = placements[0];
    horizontal = get(row, col - 1) !== null || get(row, col + 1) !== null;
  }
  const dr = horizontal ? 0 : 1;
  const dc = horizontal ? 1 : 0;

  // the line from the first to the last new tile may not have gaps
  const ordered = placements.slice().sort((a, b) => a.row - b.row || a.col - b.col);
  for (
    let r = ordered[0].row, c = ordered[0].col;
    r <= ordered[ordered.length - 1].row && c <= ordered[ordered.length - 1].col;
    r += dr, c += dc
  ) {
    if (get(r, c) === null) return { ok: false, error: 'There is a gap between the tiles.' };
  }

  /** Whole word through (r, c) along (ar, ac), with its score. */
  const wordAt = (r: number, c: number, ar: number, ac: number) => {
    let sr = r;
    let sc = c;
    while (get(sr - ar, sc - ac)) {
      sr -= ar;
      sc -= ac;
    }
    let word = '';
    let sum = 0;
    let mult = 1;
    let touchesOld = false;
    for (let rr = sr, cc = sc; get(rr, cc); rr += ar, cc += ac) {
      const t = get(rr, cc) as Tile;
      word += t.letter;
      let v = t.blank ? 0 : LETTER_VALUES[t.letter];
      if (isNew(rr, cc)) {
        const prem = PREMIUMS[rr * SIZE + cc];
        if (prem === 'DL') v *= 2;
        else if (prem === 'TL') v *= 3;
        else if (prem === 'DW') mult *= 2;
        else if (prem === 'TW') mult *= 3;
      } else touchesOld = true;
      sum += v;
    }
    return { word, score: sum * mult, touchesOld };
  };

  const words: WordScore[] = [];
  let connected = false;
  const main = wordAt(placements[0].row, placements[0].col, dr, dc);
  if (main.word.length >= 2) {
    words.push({ word: main.word, score: main.score });
    if (main.touchesOld) connected = true;
  }
  for (const p of placements) {
    const cross = wordAt(p.row, p.col, dc, dr);
    if (cross.word.length >= 2) {
      words.push({ word: cross.word, score: cross.score });
      if (cross.touchesOld) connected = true;
    }
  }
  if (words.length === 0) return { ok: false, error: 'A play must form a word of at least two letters.' };

  const boardEmpty = board.every((t) => t === null);
  if (boardEmpty) {
    if (!seen.has(CENTER)) return { ok: false, error: 'The first word must cover the centre square.' };
  } else if (!connected) {
    return { ok: false, error: 'The word must connect to tiles already on the board.' };
  }

  for (const w of words)
    if (!dict.has(w.word)) return { ok: false, error: `"${w.word}" is not in the dictionary.` };

  const bingo = placements.length === RACK_SIZE;
  const total = words.reduce((a, w) => a + w.score, 0) + (bingo ? BINGO_BONUS : 0);
  return { ok: true, words, total, bingo };
}

/** Removes `letters` from `rack` (blank tiles are '?'); returns null if the rack cannot supply them. */
function takeFromRack(rack: string[], letters: string[]): string[] | null {
  const left = rack.slice();
  for (const l of letters) {
    const i = left.indexOf(l);
    if (i < 0) return null;
    left.splice(i, 1);
  }
  return left;
}

export function createScrabble(
  dict: Dictionary,
  fixedSeed?: number,
): GameEngine<ScrabbleState, ScrabbleMove> {
  const finish = (s: ScrabbleState): ScrabbleState => {
    const scores = { ...s.scores };
    const out = (p: PlayerId) => s.racks[p].length === 0 && s.bag.length === 0;
    if (out(1) || out(2)) {
      const goer: PlayerId = out(1) ? 1 : 2;
      const bonus = rackValue(s.racks[other(goer)]);
      scores[goer] += bonus;
      scores[other(goer)] -= bonus;
      return { ...s, scores, over: true };
    }
    if (s.scoreless >= SCORELESS_LIMIT) {
      scores[1] -= rackValue(s.racks[1]);
      scores[2] -= rackValue(s.racks[2]);
      return { ...s, scores, over: true };
    }
    return s;
  };

  return {
    initialState() {
      const [bag, seed] = shuffle(fullBag(), fixedSeed ?? randomSeed());
      return {
        board: Array(SIZE * SIZE).fill(null),
        racks: { 1: bag.slice(0, RACK_SIZE), 2: bag.slice(RACK_SIZE, RACK_SIZE * 2) },
        bag: bag.slice(RACK_SIZE * 2),
        scores: { 1: 0, 2: 0 },
        current: 1,
        seed,
        scoreless: 0,
        last: null,
        over: false,
      };
    },
    currentPlayer: (s) => s.current,
    /** Plays are too numerous to list: this returns only the always-available moves. Use checkPlay/generateMoves for plays. */
    legalMoves(s) {
      if (s.over) return [];
      const moves: ScrabbleMove[] = [{ kind: 'pass' }];
      if (s.bag.length >= RACK_SIZE) moves.push({ kind: 'exchange', letters: s.racks[s.current].slice() });
      return moves;
    },
    applyMove(s, move) {
      if (s.over || !move) return null;
      const me = s.current;
      if (move.kind === 'pass') {
        return finish({
          ...s,
          current: other(me),
          scoreless: s.scoreless + 1,
          last: { player: me, kind: 'pass', words: [], score: 0 },
        });
      }
      if (move.kind === 'exchange') {
        if (s.bag.length < RACK_SIZE || move.letters.length === 0) return null;
        const kept = takeFromRack(s.racks[me], move.letters);
        if (!kept) return null;
        const [bag, seed] = shuffle([...s.bag, ...move.letters], s.seed);
        const drawn = bag.slice(0, move.letters.length);
        return finish({
          ...s,
          bag: bag.slice(move.letters.length),
          racks: { ...s.racks, [me]: [...kept, ...drawn] },
          seed,
          current: other(me),
          scoreless: s.scoreless + 1,
          last: { player: me, kind: 'exchange', words: [], score: 0 },
        });
      }
      if (move.kind !== 'play') return null;
      const check = checkPlay(s.board, dict, move.placements);
      if (!check.ok) return null;
      const used = move.placements.map((p) => (p.blank ? '?' : p.letter));
      const kept = takeFromRack(s.racks[me], used);
      if (!kept) return null;
      const board = s.board.slice();
      for (const p of move.placements) board[p.row * SIZE + p.col] = { letter: p.letter, blank: !!p.blank };
      const draw = Math.min(s.bag.length, RACK_SIZE - kept.length);
      return finish({
        ...s,
        board,
        bag: s.bag.slice(draw),
        racks: { ...s.racks, [me]: [...kept, ...s.bag.slice(0, draw)] },
        scores: { ...s.scores, [me]: s.scores[me] + check.total },
        current: other(me),
        scoreless: 0,
        last: { player: me, kind: 'play', words: check.words.map((w) => w.word), score: check.total },
      });
    },
    getStatus(s): Outcome {
      if (!s.over) return { state: 'playing' };
      if (s.scores[1] === s.scores[2]) return { state: 'draw' };
      return { state: 'won', winner: s.scores[1] > s.scores[2] ? 1 : 2 };
    },
  };
}
