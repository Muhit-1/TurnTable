import type { GameEngine, PlayerId } from '../../shared/engine';
import { nextFloat, nextInt, randomSeed } from '../../shared/rng';

export const SIZE = 10;
export const FLEET = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
] as const;

export type Shot = 'hit' | 'miss' | null;
export interface Ship {
  name: string;
  size: number;
  cells: number[];
}

/**
 * Setup: each player places the fleet in order (or randomises it), player 1 then player 2.
 * Then players alternate firing, player 1 first. `shots[p]` is what player p has fired at the opponent's grid.
 */
export type BattleshipMove =
  | { kind: 'place'; row: number; col: number; horizontal: boolean }
  | { kind: 'randomize' }
  | { kind: 'fire'; cell: number };

export interface BattleshipState {
  fleets: Record<PlayerId, Ship[]>;
  shots: Record<PlayerId, Shot[]>;
  phase: 'place' | 'fire';
  current: PlayerId;
  seed: number;
  last: { player: PlayerId; cell: number; result: 'hit' | 'miss' | 'sunk'; ship?: string } | null;
  winner: PlayerId | null;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

export const shipAt = (fleet: Ship[], cell: number) => fleet.find((s) => s.cells.includes(cell));
export const isSunk = (ship: Ship, shots: Shot[]) => ship.cells.every((c) => shots[c] === 'hit');
export const sunkShips = (fleet: Ship[], shots: Shot[]) => fleet.filter((s) => isSunk(s, shots));

/** Cells a ship of `size` would occupy from (row, col), or null if it does not fit on the board. */
export function shipCells(row: number, col: number, size: number, horizontal: boolean): number[] | null {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0) return null;
  const endRow = horizontal ? row : row + size - 1;
  const endCol = horizontal ? col + size - 1 : col;
  if (endRow >= SIZE || endCol >= SIZE) return null;
  return Array.from(
    { length: size },
    (_, i) => (horizontal ? row : row + i) * SIZE + (horizontal ? col + i : col),
  );
}

const occupied = (fleet: Ship[]) => new Set(fleet.flatMap((s) => s.cells));

/** Random placement of every ship not yet on the board. Returns the full fleet and the next seed. */
export function randomFleet(existing: Ship[], seed: number): [Ship[], number] {
  const fleet = existing.slice();
  let s = seed;
  for (let k = fleet.length; k < FLEET.length; k++) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      let r: number;
      let c: number;
      let h: number;
      [r, s] = nextInt(s, SIZE);
      [c, s] = nextInt(s, SIZE);
      [h, s] = nextInt(s, 2);
      const cells = shipCells(r, c, FLEET[k].size, h === 0);
      if (cells && !cells.some((x) => occupied(fleet).has(x))) {
        fleet.push({ ...FLEET[k], cells });
        break;
      }
    }
  }
  return [fleet, s];
}

export function createBattleship(fixedSeed?: number): GameEngine<BattleshipState, BattleshipMove> {
  const finishPlacement = (s: BattleshipState): BattleshipState =>
    s.fleets[s.current].length < FLEET.length
      ? s
      : s.current === 1
        ? { ...s, current: 2 }
        : { ...s, phase: 'fire', current: 1 };

  return {
    initialState: () => ({
      fleets: { 1: [], 2: [] },
      shots: { 1: Array<Shot>(SIZE * SIZE).fill(null), 2: Array<Shot>(SIZE * SIZE).fill(null) },
      phase: 'place',
      current: 1,
      seed: fixedSeed ?? randomSeed(),
      last: null,
      winner: null,
    }),
    currentPlayer: (s) => s.current,
    legalMoves(s) {
      if (s.winner !== null) return [];
      if (s.phase === 'place') {
        const next = FLEET[s.fleets[s.current].length];
        const moves: BattleshipMove[] = [{ kind: 'randomize' }];
        for (const horizontal of [true, false]) {
          for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
              const cells = shipCells(row, col, next.size, horizontal);
              if (cells && !cells.some((c) => occupied(s.fleets[s.current]).has(c)))
                moves.push({ kind: 'place', row, col, horizontal });
            }
          }
        }
        return moves;
      }
      return s.shots[s.current].flatMap((x, cell) => (x === null ? [{ kind: 'fire' as const, cell }] : []));
    },
    applyMove(s, move) {
      if (s.winner !== null || !move) return null;
      if (s.phase === 'place') {
        const fleet = s.fleets[s.current];
        if (move.kind === 'randomize') {
          const [full, seed] = randomFleet(fleet, s.seed);
          return finishPlacement({ ...s, seed, fleets: { ...s.fleets, [s.current]: full } });
        }
        if (move.kind === 'place') {
          const next = FLEET[fleet.length];
          const cells = shipCells(move.row, move.col, next.size, !!move.horizontal);
          if (!cells || cells.some((c) => occupied(fleet).has(c))) return null;
          return finishPlacement({
            ...s,
            fleets: { ...s.fleets, [s.current]: [...fleet, { ...next, cells }] },
          });
        }
        return null;
      }

      if (move.kind !== 'fire') return null;
      const { cell } = move;
      if (!Number.isInteger(cell) || cell < 0 || cell >= SIZE * SIZE || s.shots[s.current][cell] !== null)
        return null;
      const opp = other(s.current);
      const ship = shipAt(s.fleets[opp], cell);
      const shots = s.shots[s.current].slice();
      shots[cell] = ship ? 'hit' : 'miss';
      const [, seed] = nextFloat(s.seed); // advance so computer choices keep varying
      const sunk = ship ? isSunk(ship, shots) : false;
      const allSunk = s.fleets[opp].every((sh) => isSunk(sh, shots));
      return {
        ...s,
        seed,
        shots: { ...s.shots, [s.current]: shots },
        current: allSunk ? s.current : opp,
        last: {
          player: s.current,
          cell,
          result: sunk ? 'sunk' : ship ? 'hit' : 'miss',
          ship: sunk ? ship?.name : undefined,
        },
        winner: allSunk ? s.current : null,
      };
    },
    getStatus: (s) => (s.winner === null ? { state: 'playing' } : { state: 'won', winner: s.winner }),
  };
}

export const battleshipEngine = createBattleship();
