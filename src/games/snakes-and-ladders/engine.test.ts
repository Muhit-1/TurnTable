import { describe, expect, it } from 'vitest';
import { createSnakes, FINAL, LADDERS, SNAKES, type SnakesState, squareToCell } from './engine';

const e = createSnakes(1);

describe('snakes and ladders board', () => {
  it('has no snake/ladder chains, and ladders go up while snakes go down', () => {
    const starts = new Set([...Object.keys(LADDERS), ...Object.keys(SNAKES)].map(Number));
    for (const [a, b] of Object.entries(LADDERS)) {
      expect(b).toBeGreaterThan(Number(a));
      expect(starts.has(b) && b !== FINAL).toBe(false);
    }
    for (const [a, b] of Object.entries(SNAKES)) {
      expect(b).toBeLessThan(Number(a));
      expect(starts.has(b)).toBe(false);
    }
    expect(Object.keys(SNAKES).map(Number)).not.toContain(FINAL);
  });

  it('zig-zag layout puts 1 bottom-left, 10 bottom-right, 11 above 10, 100 top-left', () => {
    expect(squareToCell(1)).toEqual([9, 0]);
    expect(squareToCell(10)).toEqual([9, 9]);
    expect(squareToCell(11)).toEqual([8, 9]);
    expect(squareToCell(20)).toEqual([8, 0]);
    expect(squareToCell(100)).toEqual([0, 0]);
    const cells = new Set(Array.from({ length: 100 }, (_, i) => squareToCell(i + 1).join(',')));
    expect(cells.size).toBe(100);
  });
});

describe('snakes and ladders engine', () => {
  it('same seed gives the same roll; rolls are 1-6', () => {
    const a = e.applyMove(e.initialState(), 'roll');
    const b = createSnakes(1).applyMove(createSnakes(1).initialState(), 'roll');
    expect(a?.last).toEqual(b?.last);
    expect(a?.last?.roll).toBeGreaterThanOrEqual(1);
    expect(a?.last?.roll).toBeLessThanOrEqual(6);
  });

  it('every roll value from every square is valid over a long game', () => {
    let s = e.initialState();
    const seen = new Set<number>();
    for (let i = 0; i < 3000 && s.winner === null; i++) {
      const n = e.applyMove(s, 'roll');
      if (!n) throw new Error('null');
      seen.add(n.last?.roll ?? 0);
      s = n;
      expect(s.positions[1]).toBeLessThanOrEqual(FINAL);
      expect(s.positions[2]).toBeLessThanOrEqual(FINAL);
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(s.winner).not.toBeNull();
  });

  const at = (p1: number, seed = 1): SnakesState => ({
    ...e.initialState(),
    positions: { 1: p1, 2: 0 },
    seed,
  });
  // find a seed that rolls a specific value so positions can be forced without mocking
  const seedFor = (roll: number) => {
    for (let seed = 0; seed < 1000; seed++) {
      const n = e.applyMove(at(0, seed), 'roll');
      if (n?.last?.roll === roll) return seed;
    }
    throw new Error('no seed');
  };

  it('moves forward by the roll and passes the turn', () => {
    const s = e.applyMove(at(10, seedFor(3)), 'roll');
    expect(s?.positions[1]).toBe(13);
    expect(s?.current).toBe(2);
    expect(s?.last?.kind).toBe('move');
  });

  it('climbs a ladder', () => {
    const s = e.applyMove(at(18, seedFor(3)), 'roll'); // lands on 21 -> 42
    expect(s?.last).toMatchObject({ landed: 21, to: 42, kind: 'ladder' });
    expect(s?.positions[1]).toBe(42);
  });

  it('slides down a snake', () => {
    const s = e.applyMove(at(13, seedFor(3)), 'roll'); // lands on 16 -> 6
    expect(s?.last).toMatchObject({ landed: 16, to: 6, kind: 'snake' });
    expect(s?.positions[1]).toBe(6);
  });

  it('needs an exact roll to finish: overshooting stays put', () => {
    const s = e.applyMove(at(98, seedFor(5)), 'roll'); // 103 > 100
    expect(s?.positions[1]).toBe(98);
    expect(s?.last?.kind).toBe('blocked');
    expect(s?.winner).toBeNull();
    expect(s?.current).toBe(2);
  });

  it('wins on an exact landing on 100 and then rejects rolls', () => {
    const s = e.applyMove(at(97, seedFor(3)), 'roll');
    expect(s?.positions[1]).toBe(100);
    expect(s && e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(s && e.applyMove(s, 'roll')).toBeNull();
    expect(s && e.legalMoves(s)).toEqual([]);
  });

  it('a ladder that ends on 100 wins', () => {
    const s = e.applyMove(at(77, seedFor(3)), 'roll'); // 80 -> 100
    expect(s?.winner).toBe(1);
  });

  it('rejects unknown moves', () => {
    // @ts-expect-error deliberately invalid
    expect(e.applyMove(e.initialState(), 'jump')).toBeNull();
  });
});
