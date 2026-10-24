import { describe, expect, it } from 'vitest';
import {
  areaScore,
  createGo,
  type GoMove,
  type GoState,
  groupAt,
  keyOf,
  margin,
  neighbours,
  place,
  type Stone,
} from './engine';

/** Builds a state from a diagram: x = black, o = white, . = empty. */
function board(rows: string[], current: 1 | 2 = 1, komi = 0): GoState {
  const size = rows.length;
  const cells = rows
    .join('')
    .split('')
    .map((ch): Stone => (ch === 'x' ? 1 : ch === 'o' ? 2 : 0));
  if (cells.length !== size * size) throw new Error('diagram must be square');
  return {
    size,
    komi,
    cells,
    current,
    captures: { 1: 0, 2: 0 },
    passes: 0,
    seen: [keyOf(cells)],
    last: -1,
    over: false,
  };
}
const at = (size: number, r: number, c: number) => r * size + c;
const e5 = createGo(5, 0);
const e9 = createGo(9);
const put = (e: ReturnType<typeof createGo>, s: GoState, r: number, c: number) =>
  e.applyMove(s, { kind: 'place', point: at(s.size, r, c) });
const must = (s: GoState | null): GoState => {
  if (!s) throw new Error('expected a legal move');
  return s;
};
const pass: GoMove = { kind: 'pass' };

describe('geometry', () => {
  it('counts neighbours on corners, edges and the interior', () => {
    expect(neighbours(0, 9)).toHaveLength(2);
    expect(neighbours(4, 9)).toHaveLength(3);
    expect(neighbours(40, 9)).toHaveLength(4);
    expect(neighbours(80, 9)).toHaveLength(2);
  });

  it('finds groups and their liberties', () => {
    const s = board(['xx...', 'x....', '.....', '.....', '.....']);
    const g = groupAt(s.cells, 5, 0);
    expect(g.stones.sort((a, b) => a - b)).toEqual([0, 1, 5]);
    expect(g.liberties.sort((a, b) => a - b)).toEqual([2, 6, 10]);
  });
});

describe('setup', () => {
  it('starts empty with Black to move and every point plus pass legal', () => {
    const s = e9.initialState();
    expect(s.current).toBe(1);
    expect(e9.legalMoves(s)).toHaveLength(82);
    expect(s.cells.every((c) => c === 0)).toBe(true);
  });

  it('supports several board sizes', () => {
    for (const n of [5, 9, 13, 19]) expect(createGo(n).initialState().cells).toHaveLength(n * n);
  });
});

describe('placing and capturing', () => {
  it('alternates colours and rejects occupied and off-board points', () => {
    let s = must(put(e5, e5.initialState(), 2, 2));
    expect(s.cells[at(5, 2, 2)]).toBe(1);
    expect(s.current).toBe(2);
    expect(put(e5, s, 2, 2)).toBeNull();
    expect(e5.applyMove(s, { kind: 'place', point: 25 })).toBeNull();
    expect(e5.applyMove(s, { kind: 'place', point: -1 })).toBeNull();
    s = must(put(e5, s, 0, 0));
    expect(s.current).toBe(1);
  });

  it('captures a single stone surrounded on all sides', () => {
    // the white stone on (1,1) has one liberty left, at (1,2)
    const s = board(['.x...', 'xo...', '.x...', '.....', '.....'], 1);
    const n = must(put(e5, s, 1, 2));
    expect(n.cells[at(5, 1, 1)]).toBe(0);
    expect(n.captures[1]).toBe(1);
    expect(n.captures[2]).toBe(0);
  });

  it('captures a corner stone', () => {
    const s = board(['o....', 'x....', '.....', '.....', '.....'], 1);
    const n = must(put(e5, s, 0, 1));
    expect(n.cells[0]).toBe(0);
    expect(n.captures[1]).toBe(1);
  });

  it('captures a whole group at once and counts every stone', () => {
    // the white group (0,2),(1,1),(1,2) has two liberties: (0,3) and (1,3)
    const s = board(['xxo..', 'xoo..', 'xxxo.', '.....', '.....'], 1);
    expect(groupAt(s.cells, 5, at(5, 1, 1)).liberties.sort((a, b) => a - b)).toEqual([
      at(5, 0, 3),
      at(5, 1, 3),
    ]);
    let n = must(put(e5, s, 0, 3));
    expect(n.captures[1]).toBe(0);
    n = must(put(e5, n, 4, 4)); // white plays elsewhere
    n = must(put(e5, n, 1, 3));
    expect([n.cells[at(5, 0, 2)], n.cells[at(5, 1, 1)], n.cells[at(5, 1, 2)]]).toEqual([0, 0, 0]);
    expect(n.captures[1]).toBe(3);
    expect(n.cells[at(5, 2, 3)]).toBe(2); // the separate white stone survives
  });

  it('captures several separate groups with one stone', () => {
    // black at (1,1) captures the white stones on (0,1) and (1,0) at once
    const s = board(['xox..', 'o.o..', 'xo...', '.....', '.....'], 1);
    // (0,1): neighbours (0,0)x,(0,2)x,(1,1).  (1,0): (0,0)x,(2,0)x,(1,1).
    const n = must(put(e5, s, 1, 1));
    expect(n.cells[at(5, 0, 1)]).toBe(0);
    expect(n.cells[at(5, 1, 0)]).toBe(0);
    expect(n.captures[1]).toBe(2);
  });
});

describe('suicide', () => {
  it('rejects a move that leaves its own stone with no liberties', () => {
    const s = board(['.o...', 'o....', '.....', '.....', '.....'], 1);
    expect(put(e5, s, 0, 0)).toBeNull();
    expect(place(s.cells, 5, 0, 1)).toBeNull();
  });

  it('rejects filling the last liberty of a larger own group', () => {
    const s = board(['x.o..', 'xo...', 'o....', '.....', '.....'], 1);
    expect(groupAt(s.cells, 5, 0).liberties).toEqual([1]);
    expect(put(e5, s, 0, 1)).toBeNull();
  });

  it('allows a move into a point with no empty neighbours when it captures', () => {
    // black stone (1,1) is surrounded on three sides; white's move at (1,2) has no empty neighbour
    // of its own except the point it captures, so it only lives because it captures
    const s = board(['.o...', 'ox...', '.o...', '.....', '.....'], 2);
    expect(groupAt(s.cells, 5, at(5, 1, 1)).liberties).toEqual([at(5, 1, 2)]);
    const n = must(put(e5, s, 1, 2));
    expect(n.cells[at(5, 1, 1)]).toBe(0);
    expect(n.captures[2]).toBe(1);
  });

  it('an eye is suicide for the attacker unless the move captures', () => {
    const s = board(['x.x..', 'xxx..', 'ooo..', '.....', '.....'], 2);
    // (0,1) is an eye of the black group; white cannot play into it unless it captures
    expect(put(e5, s, 0, 1)).toBeNull();
  });
});

describe('ko and superko', () => {
  // white's stone on (1,1) is in atari; black captures by playing (1,2) and then sits in atari itself
  const ko = () => board(['.xo..', 'xo.o.', '.xo..', '.....', '.....'], 1);

  it('forbids an immediate recapture', () => {
    const taken = must(put(e5, ko(), 1, 2));
    expect(taken.cells[at(5, 1, 1)]).toBe(0);
    expect(taken.captures[1]).toBe(1);
    // retaking at (1,1) would capture the black stone and recreate the position before black's move
    expect(put(e5, taken, 1, 1)).toBeNull();
  });

  it('allows the recapture after play elsewhere has changed the position', () => {
    let s = must(put(e5, ko(), 1, 2));
    s = must(put(e5, s, 4, 4)); // white plays elsewhere (a ko threat)
    s = must(put(e5, s, 4, 0)); // black answers
    const retake = put(e5, s, 1, 1);
    expect(retake).not.toBeNull();
    expect(retake?.cells[at(5, 1, 2)]).toBe(0);
  });

  it('ko-forbidden points are not listed as legal moves', () => {
    const taken = must(put(e5, ko(), 1, 2));
    expect(e5.legalMoves(taken).some((m) => m.kind === 'place' && m.point === at(5, 1, 1))).toBe(false);
  });
});

describe('passing and the end of the game', () => {
  it('one pass does not end the game; a stone resets the count; two passes do', () => {
    let s = e9.initialState();
    s = must(e9.applyMove(s, pass));
    expect(s.over).toBe(false);
    expect(s.passes).toBe(1);
    s = must(put(e9, s, 4, 4));
    expect(s.passes).toBe(0);
    s = must(e9.applyMove(s, pass));
    s = must(e9.applyMove(s, pass));
    expect(s.over).toBe(true);
    expect(e9.legalMoves(s)).toEqual([]);
    expect(e9.applyMove(s, pass)).toBeNull();
    expect(put(e9, s, 0, 0)).toBeNull();
  });

  it('a pass hands the turn over', () => {
    const s = must(e9.applyMove(e9.initialState(), pass));
    expect(s.current).toBe(2);
    expect(s.last).toBe(-2);
  });
});

describe('scoring', () => {
  const split = ['.x.o.', '.x.o.', '.x.o.', '.x.o.', '.x.o.'];

  it('counts stones plus territory only they touch; points touching both are neutral', () => {
    const a = areaScore(board(split).cells, 5);
    expect(a.black).toBe(10); // 5 stones + 5 empty points on their side
    expect(a.white).toBe(10);
    expect(a.blackTerritory).toHaveLength(5);
    expect(a.whiteTerritory).toHaveLength(5);
  });

  it('counts an enclosed corner as territory and an unenclosed one as nothing', () => {
    const closed = areaScore(board(['.x...', 'xx...', '.....', '.....', '.....']).cells, 5);
    // the corner is enclosed, but the rest of the board is empty and touches only black too
    expect(closed.blackTerritory).toContain(0);
    const contested = areaScore(board(['.x...', 'xx...', '....o', '.....', '.....']).cells, 5);
    expect(contested.blackTerritory).toEqual([0]);
    expect(contested.black).toBe(3 + 1);
  });

  it('gives komi to White and decides the winner after two passes', () => {
    const base = board(split, 1, 6.5);
    expect(margin(base)).toBe(10 - (10 + 6.5));
    const e = createGo(5, 6.5);
    let s = must(e.applyMove(base, pass));
    s = must(e.applyMove(s, pass));
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 2 });
    expect(e.getStatus({ ...s, komi: 0 })).toEqual({ state: 'draw' });
    const blackAhead = board(['xxx.o', 'xxx.o', 'xxx.o', 'xxx.o', 'xxx.o'], 1, 0);
    expect(e.getStatus({ ...blackAhead, over: true })).toEqual({ state: 'won', winner: 1 });
  });

  it('the game is still in progress until both players pass', () => {
    expect(e9.getStatus(e9.initialState())).toEqual({ state: 'playing' });
  });
});

describe('legal move listing', () => {
  it('excludes occupied points and suicide; always includes pass', () => {
    const s = board(['.o...', 'o....', '.....', '.....', '.....'], 1);
    const moves = e5.legalMoves(s);
    expect(moves.some((m) => m.kind === 'place' && m.point === 0)).toBe(false); // suicide
    expect(moves.some((m) => m.kind === 'place' && m.point === 1)).toBe(false); // occupied
    expect(moves).toContainEqual({ kind: 'pass' });
    expect(moves).toHaveLength(25 - 2 - 1 + 1);
  });
});

describe('immutability', () => {
  it('never mutates the previous state', () => {
    const s = e5.initialState();
    const copy = JSON.stringify(s);
    e5.applyMove(s, { kind: 'place', point: 12 });
    expect(JSON.stringify(s)).toBe(copy);
  });
});
