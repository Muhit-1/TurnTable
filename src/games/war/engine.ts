import { type Card, shuffledDeck } from '../../shared/deck';
import type { GameEngine, PlayerId } from '../../shared/engine';
import { randomSeed, shuffle } from '../../shared/rng';

/** The only move is flipping the next card. */
export type WarMove = 'flip';

/** Games of War can in theory last forever; after this many flips the player with more cards wins. */
export const MAX_FLIPS = 2000;
const FACE_DOWN_PER_WAR = 3;

export interface Flip {
  c1: Card;
  c2: Card;
  /** how many wars were fought in a row for this flip (0 = plain comparison) */
  wars: number;
  /** cards on the table that the winner collected */
  won: number;
  winner: PlayerId;
}

export interface WarState {
  /** draw piles; index 0 is the top card */
  piles: Record<PlayerId, Card[]>;
  flips: number;
  last: Flip | null;
  seed: number;
  /** set when someone has run out of cards, or the flip cap was reached */
  winner: PlayerId | null;
}

export function createWar(fixedSeed?: number): GameEngine<WarState, WarMove> {
  return {
    initialState() {
      const [deck, seed] = shuffledDeck(fixedSeed ?? randomSeed());
      return {
        piles: { 1: deck.slice(0, 26), 2: deck.slice(26) },
        flips: 0,
        last: null,
        seed,
        winner: null,
      };
    },
    currentPlayer: () => 1,
    legalMoves: (s) => (s.winner === null ? ['flip'] : []),
    applyMove(s, move) {
      if (move !== 'flip' || s.winner !== null) return null;
      const p1 = s.piles[1].slice();
      const p2 = s.piles[2].slice();
      const table: Card[] = [];
      let wars = 0;
      let c1 = p1.shift() as Card;
      let c2 = p2.shift() as Card;
      table.push(c1, c2);

      let loser: PlayerId | null = null;
      while (c1.rank === c2.rank) {
        wars++;
        // Each side puts up to 3 cards face-down but must keep one to flip face-up.
        const down1 = Math.min(FACE_DOWN_PER_WAR, Math.max(p1.length - 1, 0));
        const down2 = Math.min(FACE_DOWN_PER_WAR, Math.max(p2.length - 1, 0));
        if (p1.length === 0 || p2.length === 0) {
          // A player who cannot continue the war loses it (and the game).
          loser = p1.length === 0 ? 1 : 2;
          break;
        }
        table.push(...p1.splice(0, down1), ...p2.splice(0, down2));
        c1 = p1.shift() as Card;
        c2 = p2.shift() as Card;
        table.push(c1, c2);
      }

      let winner: PlayerId;
      let seed = s.seed;
      if (loser !== null) {
        winner = loser === 1 ? 2 : 1;
        // Give the whole table to the winner so no cards vanish.
      } else {
        winner = c1.rank > c2.rank ? 1 : 2;
      }
      let collected: Card[];
      [collected, seed] = shuffle(table, seed);
      const pile = winner === 1 ? p1 : p2;
      pile.push(...collected);

      const piles: Record<PlayerId, Card[]> = { 1: p1, 2: p2 };
      const flips = s.flips + 1;
      let result: PlayerId | null = null;
      if (p1.length === 0) result = 2;
      else if (p2.length === 0) result = 1;
      else if (flips >= MAX_FLIPS) result = p1.length === p2.length ? null : p1.length > p2.length ? 1 : 2;

      return {
        piles,
        flips,
        seed,
        last: { c1, c2, wars, won: table.length, winner },
        winner: result,
      };
    },
    getStatus(s) {
      if (s.winner !== null) return { state: 'won', winner: s.winner };
      if (s.flips >= MAX_FLIPS) return { state: 'draw' };
      return { state: 'playing' };
    },
  };
}

export const warEngine = createWar();
