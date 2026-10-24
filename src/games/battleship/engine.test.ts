import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  type BattleshipMove,
  type BattleshipState,
  createBattleship,
  FLEET,
  isSunk,
  randomFleet,
  type Ship,
  SIZE,
  shipCells,
  sunkShips,
} from './engine';

const e = createBattleship(11);
const fire = (cell: number): BattleshipMove => ({ kind: 'fire', cell });
const run = (s: BattleshipState, ...moves: BattleshipMove[]) => {
  let cur = s;
  for (const m of moves) {
    const n = e.applyMove(cur, m);
    if (!n) throw new Error(`illegal ${JSON.stringify(m)}`);
    cur = n;
  }
  return cur;
};
const at = (r: number, c: number) => r * SIZE + c;
/** Both fleets placed by hand: ship k of each player lies along row 2k (horizontal, from column 0). */
const placed = (): BattleshipState => {
  const moves: BattleshipMove[] = [];
  for (let p = 0; p < 2; p++)
    for (let k = 0; k < FLEET.length; k++)
      moves.push({ kind: 'place', row: 2 * k, col: 0, horizontal: true });
  return run(e.initialState(), ...moves);
};

describe('battleship placement', () => {
  it('starts in the placement phase with player 1 and no ships', () => {
    const s = e.initialState();
    expect(s.phase).toBe('place');
    expect(s.current).toBe(1);
    expect(s.fleets[1]).toEqual([]);
  });

  it('computes ship cells and rejects ships that do not fit', () => {
    expect(shipCells(0, 0, 5, true)).toEqual([0, 1, 2, 3, 4]);
    expect(shipCells(0, 0, 3, false)).toEqual([0, 10, 20]);
    expect(shipCells(0, 6, 5, true)).toBeNull();
    expect(shipCells(7, 0, 4, false)).toBeNull();
    expect(shipCells(-1, 0, 2, true)).toBeNull();
    expect(shipCells(0, 0, 5, true)).not.toBeNull();
    expect(shipCells(0, 5, 5, true)).toEqual([5, 6, 7, 8, 9]);
  });

  it('places ships in fleet order, hands over to player 2, then starts firing with player 1', () => {
    let s = e.initialState();
    s = run(s, { kind: 'place', row: 0, col: 0, horizontal: true });
    expect(s.fleets[1][0]).toMatchObject({ name: 'Carrier', size: 5 });
    expect(s.current).toBe(1);
    for (let k = 1; k < 5; k++) s = run(s, { kind: 'place', row: 2 * k, col: 0, horizontal: true });
    expect(s.current).toBe(2);
    expect(s.phase).toBe('place');
    for (let k = 0; k < 5; k++) s = run(s, { kind: 'place', row: 2 * k, col: 0, horizontal: true });
    expect(s.phase).toBe('fire');
    expect(s.current).toBe(1);
  });

  it('rejects overlapping, off-board placements and firing during setup', () => {
    const s = run(e.initialState(), { kind: 'place', row: 0, col: 0, horizontal: true });
    expect(e.applyMove(s, { kind: 'place', row: 0, col: 2, horizontal: false })).toBeNull(); // overlaps the carrier
    expect(e.applyMove(s, { kind: 'place', row: 9, col: 9, horizontal: true })).toBeNull();
    expect(e.applyMove(s, fire(0))).toBeNull();
  });

  it('randomize places a valid, non-overlapping full fleet and hands over', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const [fleet] = randomFleet([], seed);
      expect(fleet.map((x) => x.size)).toEqual([5, 4, 3, 3, 2]);
      const cells = fleet.flatMap((x) => x.cells);
      expect(new Set(cells).size).toBe(17);
      for (const ship of fleet) {
        const rows = new Set(ship.cells.map((c) => Math.floor(c / SIZE)));
        const cols = new Set(ship.cells.map((c) => c % SIZE));
        expect(rows.size === 1 || cols.size === 1).toBe(true);
        expect(ship.cells.every((c) => c >= 0 && c < 100)).toBe(true);
      }
    }
    const s = run(e.initialState(), { kind: 'randomize' });
    expect(s.fleets[1]).toHaveLength(5);
    expect(s.current).toBe(2);
  });

  it('randomize keeps ships already placed', () => {
    const s = run(
      e.initialState(),
      { kind: 'place', row: 0, col: 0, horizontal: true },
      { kind: 'randomize' },
    );
    expect(s.fleets[1][0].cells).toEqual([0, 1, 2, 3, 4]);
    expect(s.fleets[1]).toHaveLength(5);
    expect(new Set(s.fleets[1].flatMap((x) => x.cells)).size).toBe(17);
  });
});

describe('battleship firing', () => {
  it('reports hits and misses and alternates turns', () => {
    let s = placed();
    s = run(s, fire(at(0, 0))); // player 1 fires at player 2's carrier
    expect(s.last).toMatchObject({ player: 1, result: 'hit' });
    expect(s.shots[1][0]).toBe('hit');
    expect(s.current).toBe(2);
    s = run(s, fire(at(1, 0))); // row 1 is empty water
    expect(s.last).toMatchObject({ player: 2, result: 'miss' });
    expect(s.shots[2][at(1, 0)]).toBe('miss');
    expect(s.current).toBe(1);
  });

  it('rejects repeat shots, out of range cells, and placing during the fire phase', () => {
    const s = run(placed(), fire(5));
    expect(e.applyMove(run(s, fire(7)), fire(5))).toBeNull();
    expect(e.applyMove(placed(), fire(100))).toBeNull();
    expect(e.applyMove(placed(), fire(-1))).toBeNull();
    expect(e.applyMove(placed(), { kind: 'randomize' })).toBeNull();
  });

  it('announces a sunk ship when its last cell is hit', () => {
    // player 2's destroyer is on row 8, columns 0-1
    let s = placed();
    s = run(s, fire(at(8, 0)), fire(at(1, 0)), fire(at(8, 1)));
    expect(s.last).toMatchObject({ player: 1, result: 'sunk', ship: 'Destroyer' });
    expect(sunkShips(s.fleets[2], s.shots[1]).map((x) => x.name)).toEqual(['Destroyer']);
  });

  it('sinking the whole fleet wins', () => {
    let s = placed();
    const targets = s.fleets[2].flatMap((x) => x.cells);
    let spare = 0;
    for (const t of targets) {
      s = run(s, fire(t));
      if (s.winner !== null) break;
      // player 2 wastes shots in empty water (rows 1,3,5,7,9)
      s = run(s, fire(at(1 + 2 * Math.floor(spare / 10), spare % 10)));
      spare++;
    }
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, fire(99))).toBeNull();
    expect(s.fleets[2].every((x: Ship) => isSunk(x, s.shots[1]))).toBe(true);
  });

  it('a lone hit does not sink a multi-cell ship', () => {
    const s = run(placed(), fire(at(0, 0)));
    expect(sunkShips(s.fleets[2], s.shots[1])).toEqual([]);
  });
});

describe('battleship AI', () => {
  it('places by randomising during setup', () => {
    expect(getBestMove(e.initialState())).toEqual({ kind: 'randomize' });
  });

  it('after a hit it fires at a neighbouring cell', () => {
    let s = placed();
    s = run(s, fire(at(0, 2)), fire(at(1, 9))); // player 1 hits the carrier at (0,2)
    const m = getBestMove(s) as { kind: 'fire'; cell: number };
    expect([at(0, 1), at(0, 3), at(1, 2)]).toContain(m.cell);
  });

  it('extends along a line of two hits', () => {
    let s = placed();
    s = run(s, fire(at(0, 2)), fire(at(1, 9)), fire(at(0, 3)), fire(at(3, 9)));
    const m = getBestMove(s) as { kind: 'fire'; cell: number };
    expect([at(0, 1), at(0, 4)]).toContain(m.cell);
  });

  it('plays complete games against itself in well under 100 shots each', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const eng = createBattleship(seed);
      let s = eng.initialState();
      let n = 0;
      while (eng.getStatus(s).state === 'playing' && n++ < 500) {
        const m = getBestMove(s);
        const next = eng.applyMove(s, m);
        expect(next, JSON.stringify(m)).not.toBeNull();
        s = next as BattleshipState;
      }
      expect(eng.getStatus(s).state).toBe('won');
      const w = s.winner as 1 | 2;
      const shotsFired = s.shots[w].filter(Boolean).length;
      expect(shotsFired).toBeLessThan(100);
    }
  });

  it('is much faster than random: average under 75 shots over several games', () => {
    let total = 0;
    const seeds = [21, 22, 23, 24, 25, 26];
    for (const seed of seeds) {
      const eng = createBattleship(seed);
      let s = eng.initialState();
      while (eng.getStatus(s).state === 'playing') s = eng.applyMove(s, getBestMove(s)) as BattleshipState;
      total += s.shots[s.winner as 1 | 2].filter(Boolean).length;
    }
    expect(total / seeds.length).toBeLessThan(75);
  });
});
