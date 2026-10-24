import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { generatePlays, getBestMove } from './ai';
import { Dictionary, dictionaryFromText } from './dictionary';
import {
  BINGO_BONUS,
  CENTER,
  checkPlay,
  createScrabble,
  fullBag,
  LETTER_COUNTS,
  LETTER_VALUES,
  type Placement,
  PREMIUMS,
  rackValue,
  SCORELESS_LIMIT,
  type ScrabbleState,
  SIZE,
  type Tile,
} from './engine';

const small = new Dictionary([
  'cat',
  'cats',
  'act',
  'at',
  'hello',
  'he',
  'oh',
  'ox',
  'ax',
  'ah',
  'tax',
  'hex',
  'quiz',
  'qi',
  'za',
  'zax',
]);
const e = createScrabble(small, 7);

const word = (
  text: string,
  row: number,
  col: number,
  horizontal = true,
  blanks: number[] = [],
): Placement[] =>
  [...text.toUpperCase()].map((letter, i) => ({
    row: horizontal ? row : row + i,
    col: horizontal ? col + i : col,
    letter,
    blank: blanks.includes(i),
  }));
const emptyBoard = (): (Tile | null)[] => Array(SIZE * SIZE).fill(null);
const withTiles = (board: (Tile | null)[], placements: Placement[]) => {
  const b = board.slice();
  for (const p of placements) b[p.row * SIZE + p.col] = { letter: p.letter, blank: p.blank };
  return b;
};
const stateWith = (over: Partial<ScrabbleState>): ScrabbleState => ({ ...e.initialState(), ...over });

describe('tiles and board', () => {
  it('has the standard 100 tiles and values', () => {
    expect(fullBag()).toHaveLength(100);
    expect(Object.values(LETTER_COUNTS).reduce((a, b) => a + b, 0)).toBe(100);
    expect(LETTER_VALUES.Q).toBe(10);
    expect(LETTER_VALUES['?']).toBe(0);
    expect(fullBag().reduce((a, l) => a + LETTER_VALUES[l], 0)).toBe(187);
  });

  it('has the standard premium squares and is symmetric', () => {
    const count = (p: string) => PREMIUMS.filter((x) => x === p).length;
    expect([count('TW'), count('DW'), count('TL'), count('DL')]).toEqual([8, 17, 12, 24]);
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        expect(PREMIUMS[r * SIZE + c]).toBe(PREMIUMS[c * SIZE + r]);
        expect(PREMIUMS[r * SIZE + c]).toBe(PREMIUMS[(SIZE - 1 - r) * SIZE + c]);
      }
    expect(PREMIUMS[CENTER]).toBe('DW');
  });

  it('deals two racks of 7 and keeps 100 tiles in total', () => {
    const s = e.initialState();
    expect(s.racks[1]).toHaveLength(7);
    expect(s.racks[2]).toHaveLength(7);
    expect(s.bag).toHaveLength(86);
  });
});

describe('scoring', () => {
  it('first word on the centre doubles (DW) and counts letter values', () => {
    const r = checkPlay(emptyBoard(), small, word('cat', 7, 6));
    expect(r).toMatchObject({ ok: true, total: 10 }); // (3+1+1) x 2
  });

  it('letter premiums apply to new tiles only, then the word multiplier', () => {
    const r = checkPlay(emptyBoard(), small, word('hello', 7, 3)); // H on a DL at (7,3), O on the DW centre
    expect(r).toMatchObject({ ok: true, total: 24 }); // (8+1+1+1+1) x 2
  });

  it('a blank scores zero', () => {
    const r = checkPlay(emptyBoard(), small, word('hello', 7, 3, true, [2])); // blank L
    expect(r).toMatchObject({ ok: true, total: 22 });
  });

  it('crossing words are scored too, and old tiles give no premium', () => {
    const board = withTiles(emptyBoard(), word('cat', 7, 6));
    // "ax" down from A at (7,7)? A is old; place X at (8,7): main word AX vertical
    const r = checkPlay(board, small, [{ row: 8, col: 7, letter: 'X', blank: false }]);
    expect(r.ok && r.words.map((w) => w.word)).toEqual(['AX']);
    expect(r).toMatchObject({ ok: true, total: 9 }); // A 1 (old, no DW) + X 8 on a plain square
  });

  it('a play can form several words at once: the main word plus every crossing word', () => {
    const dict = new Dictionary(['cat', 'ah', 'ta', 'ha']);
    const board = withTiles(emptyBoard(), word('cat', 7, 6)); // C(7,6) A(7,7) T(7,8)
    // "HA" on row 8 under the A and the T forms HA (across), AH and TA (down)
    const r = checkPlay(board, dict, word('ha', 8, 7));
    expect(r.ok && r.words.map((w) => w.word).sort()).toEqual(['AH', 'HA', 'TA']);
    // HA: H4 + A1 on a DL = 6; AH: A1 + H4 = 5; TA: T1 + A on a DL = 3
    expect(r).toMatchObject({ ok: true, total: 14 });
  });

  it('using all seven tiles earns the bingo bonus', () => {
    const big = new Dictionary(['quizzes', 'cat']);
    const r = checkPlay(emptyBoard(), big, word('quizzes', 7, 1));
    expect(r.ok && r.bingo).toBe(true);
    expect(r.ok && r.total).toBeGreaterThan(BINGO_BONUS);
  });
});

describe('play validation', () => {
  it('first play must cover the centre; later plays must connect', () => {
    expect(checkPlay(emptyBoard(), small, word('cat', 0, 0))).toMatchObject({ ok: false });
    const board = withTiles(emptyBoard(), word('cat', 7, 6));
    expect(checkPlay(board, small, word('hello', 0, 0))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/connect/),
    });
  });

  it('rejects unknown words, gaps, mixed lines, taken squares, off-board and empty plays', () => {
    expect(checkPlay(emptyBoard(), small, word('xyz', 7, 6))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/dictionary/),
    });
    const board = withTiles(emptyBoard(), word('cat', 7, 6));
    expect(
      checkPlay(board, small, [
        { row: 8, col: 6, letter: 'A', blank: false },
        { row: 10, col: 6, letter: 'T', blank: false },
      ]),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/gap/) });
    expect(
      checkPlay(board, small, [
        { row: 8, col: 6, letter: 'A', blank: false },
        { row: 9, col: 7, letter: 'T', blank: false },
      ]),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/single row/) });
    expect(checkPlay(board, small, [{ row: 7, col: 6, letter: 'A', blank: false }])).toMatchObject({
      ok: false,
    });
    expect(checkPlay(emptyBoard(), small, [{ row: 7, col: 15, letter: 'A', blank: false }])).toMatchObject({
      ok: false,
    });
    expect(checkPlay(emptyBoard(), small, [])).toMatchObject({ ok: false });
  });

  it('a single tile that forms no word is rejected', () => {
    expect(checkPlay(emptyBoard(), small, [{ row: 7, col: 7, letter: 'A', blank: false }])).toMatchObject({
      ok: false,
    });
  });

  it('extending an existing word is allowed (CAT -> CATS)', () => {
    const board = withTiles(emptyBoard(), word('cat', 7, 6));
    expect(checkPlay(board, small, [{ row: 7, col: 9, letter: 'S', blank: false }])).toMatchObject({
      ok: true,
    });
  });

  it('plays through existing tiles with the gap filled by them', () => {
    const board = withTiles(emptyBoard(), word('cat', 7, 6));
    // vertical word through the A at (7,7): "ZAX" with Z above and X below
    const r = checkPlay(board, small, [
      { row: 6, col: 7, letter: 'Z', blank: false },
      { row: 8, col: 7, letter: 'X', blank: false },
    ]);
    expect(r.ok && r.words.map((w) => w.word)).toEqual(['ZAX']);
  });
});

describe('moves, racks and the bag', () => {
  const rigged = (rack: string[]): ScrabbleState =>
    stateWith({ racks: { 1: rack, 2: ['E', 'E', 'E', 'E', 'E', 'E', 'E'] } });

  it('playing removes the tiles, draws replacements and passes the turn', () => {
    const s = rigged(['C', 'A', 'T', 'X', 'X', 'X', 'X']);
    const n = e.applyMove(s, { kind: 'play', placements: word('cat', 7, 6) }) as ScrabbleState;
    expect(n.scores[1]).toBe(10);
    expect(n.racks[1]).toHaveLength(7);
    expect(n.bag).toHaveLength(s.bag.length - 3);
    expect(n.current).toBe(2);
    expect(n.board[CENTER]?.letter).toBe('A');
    expect(n.last).toMatchObject({ kind: 'play', words: ['CAT'], score: 10 });
  });

  it('a blank tile is used from the rack as ? and scores zero', () => {
    const s = rigged(['C', 'A', '?', 'X', 'X', 'X', 'X']);
    const n = e.applyMove(s, { kind: 'play', placements: word('cat', 7, 6, true, [2]) }) as ScrabbleState;
    expect(n.scores[1]).toBe(8); // (3+1+0) x 2
    expect(n.racks[1].includes('?')).toBe(false);
  });

  it('rejects plays using tiles the rack does not hold, and invalid plays', () => {
    const s = rigged(['C', 'A', 'X', 'X', 'X', 'X', 'X']);
    expect(e.applyMove(s, { kind: 'play', placements: word('cat', 7, 6) })).toBeNull(); // no T
    expect(e.applyMove(s, { kind: 'play', placements: word('xyz', 7, 6) })).toBeNull();
    // an ordinary letter cannot stand in for a missing blank
    expect(e.applyMove(s, { kind: 'play', placements: word('cat', 7, 6, true, [2]) })).toBeNull();
  });

  it('passing and exchanging are scoreless; exchange needs 7 tiles in the bag and keeps the rack size', () => {
    const s = e.initialState();
    const passed = e.applyMove(s, { kind: 'pass' }) as ScrabbleState;
    expect(passed.scoreless).toBe(1);
    expect(passed.current).toBe(2);
    const ex = e.applyMove(s, { kind: 'exchange', letters: s.racks[1].slice(0, 3) }) as ScrabbleState;
    expect(ex.racks[1]).toHaveLength(7);
    expect(ex.bag).toHaveLength(s.bag.length);
    expect(ex.scoreless).toBe(1);
    expect(e.applyMove(s, { kind: 'exchange', letters: ['Q', 'Q', 'Q'] })).toBeNull(); // not in the rack (very likely)
    const low = stateWith({ bag: ['A', 'B', 'C'] });
    expect(e.applyMove(low, { kind: 'exchange', letters: low.racks[1].slice(0, 1) })).toBeNull();
  });

  it('six scoreless turns end the game, each side losing its rack value', () => {
    let s = e.initialState();
    const racks = { 1: s.racks[1].slice(), 2: s.racks[2].slice() };
    for (let i = 0; i < SCORELESS_LIMIT; i++) s = e.applyMove(s, { kind: 'pass' }) as ScrabbleState;
    expect(s.over).toBe(true);
    expect(s.scores).toEqual({ 1: -rackValue(racks[1]), 2: -rackValue(racks[2]) });
    expect(e.applyMove(s, { kind: 'pass' })).toBeNull();
    expect(e.legalMoves(s)).toEqual([]);
  });

  it('going out with an empty bag ends the game with the rack bonus', () => {
    const s = stateWith({
      bag: [],
      racks: { 1: ['C', 'A', 'T'], 2: ['Q', 'Z', 'X'] },
    });
    const n = e.applyMove(s, { kind: 'play', placements: word('cat', 7, 6) }) as ScrabbleState;
    expect(n.over).toBe(true);
    // 10 for the play, plus the opponent's rack (10 + 10 + 8) added, and the same taken from them
    expect(n.scores).toEqual({ 1: 10 + 28, 2: -28 });
    expect(e.getStatus(n)).toEqual({ state: 'won', winner: 1 });
  });

  it('a tie is a draw', () => {
    expect(e.getStatus(stateWith({ over: true, scores: { 1: 5, 2: 5 } }))).toEqual({ state: 'draw' });
  });
});

describe('with the real dictionary', () => {
  let real: Dictionary;
  beforeAll(() => {
    real = dictionaryFromText(readFileSync('src/games/scrabble/words.txt', 'utf8'));
  });

  it('loads a large sorted list with prefix and membership checks', () => {
    expect(real.size).toBeGreaterThan(200000);
    expect(real.has('quiz')).toBe(true);
    expect(real.has('QUIZ')).toBe(true);
    expect(real.has('qzx')).toBe(false);
    expect(real.hasPrefix('zebr')).toBe(true);
    expect(real.hasPrefix('qzx')).toBe(false);
    expect(real.hasPrefix('')).toBe(true);
    expect(real.has('qi') && real.has('za') && real.has('xu')).toBe(true);
  });

  it('every generated play is valid and the best one is found', () => {
    const eng = createScrabble(real, 11);
    const s = eng.initialState();
    const plays = generatePlays(s, real);
    expect(plays.length).toBeGreaterThan(0);
    for (const p of plays) {
      const check = checkPlay(s.board, real, p);
      expect(check.ok, JSON.stringify(p)).toBe(true);
      const letters = p.map((x) => (x.blank ? '?' : x.letter)).sort();
      const rack = s.racks[1].slice().sort();
      // every tile played comes from the rack
      const left = rack.slice();
      for (const l of letters) {
        const i = left.indexOf(l);
        expect(i).toBeGreaterThanOrEqual(0);
        left.splice(i, 1);
      }
    }
    const best = getBestMove(s, real);
    expect(best.kind).toBe('play');
    expect(eng.applyMove(s, best)).not.toBeNull();
  });

  it('finds a known play on a known board (HELLO exists, so does its extension)', () => {
    const eng = createScrabble(real, 3);
    const rack = ['H', 'E', 'L', 'L', 'O', 'S', 'T'];
    const s = { ...eng.initialState(), racks: { 1: rack, 2: ['E', 'E', 'E', 'E', 'E', 'E', 'E'] } };
    const plays = generatePlays(s, real).map((p) => p.map((x) => x.letter).join(''));
    expect(plays).toContain('HELLO');
    expect(plays).toContain('HOTELS');
  });

  it('plays a full computer-vs-computer game with only legal moves', () => {
    const eng = createScrabble(real, 21);
    let s = eng.initialState();
    let turns = 0;
    const t0 = Date.now();
    while (!s.over && turns++ < 120) {
      const m = getBestMove(s, real);
      const next = eng.applyMove(s, m);
      expect(next, JSON.stringify(m)).not.toBeNull();
      s = next as ScrabbleState;
      const tilesOnBoard = s.board.filter(Boolean).length;
      expect(tilesOnBoard + s.bag.length + s.racks[1].length + s.racks[2].length).toBe(100);
    }
    expect(s.over).toBe(true);
    expect(s.scores[1] + s.scores[2]).not.toBe(0);
    expect(Date.now() - t0).toBeLessThan(60000);
  }, 90000);
});
