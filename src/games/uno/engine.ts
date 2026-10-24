import type { GameEngine, PlayerId } from '../../shared/engine';
import { randomSeed, shuffle } from '../../shared/rng';

export const COLORS = ['red', 'yellow', 'green', 'blue'] as const;
export type Color = (typeof COLORS)[number];
export type Value = number | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  /** wild cards have no colour until played */
  color: Color | null;
  value: Value;
}

export const HAND_SIZE = 7;
export const isWild = (c: UnoCard) => c.value === 'wild' || c.value === 'wild4';

/** The 108-card deck: per colour one 0, two each of 1-9, skip, reverse, draw two; plus 4 wild and 4 wild draw four. */
export function unoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push({ color, value: 0 });
    for (let n = 1; n <= 9; n++) deck.push({ color, value: n }, { color, value: n });
    for (const value of ['skip', 'reverse', 'draw2'] as const) deck.push({ color, value }, { color, value });
  }
  for (let i = 0; i < 4; i++) deck.push({ color: null, value: 'wild' }, { color: null, value: 'wild4' });
  return deck;
}

export type UnoMove =
  | { kind: 'play'; index: number; color?: Color }
  /** draw one card (only when nothing in hand is playable) */
  | { kind: 'draw' }
  /** after drawing a playable card, decline to play it */
  | { kind: 'pass' };

export interface UnoState {
  hands: Record<PlayerId, UnoCard[]>;
  drawPile: UnoCard[];
  /** the top card is the last element */
  discard: UnoCard[];
  /** active colour (differs from the top card's colour after a wild) */
  color: Color;
  current: PlayerId;
  /** index in the current hand of a card just drawn that may still be played */
  drawn: number | null;
  seed: number;
  winner: PlayerId | null;
  last: string;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
export const topCard = (s: Pick<UnoState, 'discard'>) => s.discard[s.discard.length - 1];

export function canPlay(card: UnoCard, s: Pick<UnoState, 'discard' | 'color'>): boolean {
  if (isWild(card)) return true;
  const top = topCard(s);
  return card.color === s.color || card.value === top.value;
}

export const playableIndexes = (s: UnoState, player = s.current) =>
  s.hands[player].flatMap((c, i) => (canPlay(c, s) ? [i] : []));

/** Takes `n` cards from the draw pile, reshuffling the discard pile (minus its top card) if needed. */
function draw(s: UnoState, player: PlayerId, n: number): UnoState {
  let cur = s;
  const got: UnoCard[] = [];
  for (let i = 0; i < n; i++) {
    if (cur.drawPile.length === 0) {
      if (cur.discard.length <= 1) break; // nothing left anywhere
      const top = cur.discard[cur.discard.length - 1];
      const [shuffled, seed] = shuffle(cur.discard.slice(0, -1), cur.seed);
      cur = { ...cur, drawPile: shuffled, discard: [top], seed };
    }
    got.push(cur.drawPile[0]);
    cur = { ...cur, drawPile: cur.drawPile.slice(1) };
  }
  return { ...cur, hands: { ...cur.hands, [player]: [...cur.hands[player], ...got] } };
}

export function createUno(fixedSeed?: number): GameEngine<UnoState, UnoMove> {
  return {
    initialState() {
      let seed = fixedSeed ?? randomSeed();
      let deck: UnoCard[];
      [deck, seed] = shuffle(unoDeck(), seed);
      const hands = { 1: deck.slice(0, HAND_SIZE), 2: deck.slice(HAND_SIZE, HAND_SIZE * 2) };
      let rest = deck.slice(HAND_SIZE * 2);
      // the starting card must be a plain number card
      const start = rest.findIndex((c) => typeof c.value === 'number');
      const first = rest[start];
      rest = [...rest.slice(0, start), ...rest.slice(start + 1)];
      return {
        hands,
        drawPile: rest,
        discard: [first],
        color: first.color as Color,
        current: 1,
        drawn: null,
        seed,
        winner: null,
        last: '',
      };
    },
    currentPlayer: (s) => s.current,
    legalMoves(s) {
      if (s.winner !== null) return [];
      if (s.drawn !== null) {
        const c = s.hands[s.current][s.drawn];
        const plays: UnoMove[] = isWild(c)
          ? COLORS.map((color) => ({ kind: 'play', index: s.drawn as number, color }))
          : canPlay(c, s)
            ? [{ kind: 'play', index: s.drawn, color: undefined }]
            : [];
        return [...plays, { kind: 'pass' }];
      }
      const moves: UnoMove[] = [];
      for (const i of playableIndexes(s)) {
        const c = s.hands[s.current][i];
        if (isWild(c)) for (const color of COLORS) moves.push({ kind: 'play', index: i, color });
        else moves.push({ kind: 'play', index: i });
      }
      if (moves.length === 0) moves.push({ kind: 'draw' });
      return moves;
    },
    applyMove(s, move) {
      if (s.winner !== null || !move) return null;
      const me = s.current;
      const opp = other(me);

      if (move.kind === 'draw') {
        if (s.drawn !== null || playableIndexes(s).length > 0) return null;
        const before = s.hands[me].length;
        const cur = draw(s, me, 1);
        if (cur.hands[me].length === before)
          return { ...cur, current: opp, last: 'No cards left to draw; turn passes.' }; // nothing to draw
        const idx = cur.hands[me].length - 1;
        if (canPlay(cur.hands[me][idx], cur)) return { ...cur, drawn: idx, last: 'Drew a playable card.' };
        return { ...cur, current: opp, drawn: null, last: 'Drew a card and cannot play it.' };
      }

      if (move.kind === 'pass') {
        if (s.drawn === null) return null;
        return { ...s, current: opp, drawn: null, last: 'Kept the drawn card.' };
      }

      if (move.kind === 'play') {
        if (!Number.isInteger(move.index) || move.index < 0 || move.index >= s.hands[me].length) return null;
        if (s.drawn !== null && move.index !== s.drawn) return null;
        const card = s.hands[me][move.index];
        if (!canPlay(card, s)) return null;
        if (isWild(card) && !(move.color && (COLORS as readonly string[]).includes(move.color))) return null;
        if (!isWild(card) && move.color !== undefined) return null;

        const hand = s.hands[me].filter((_, i) => i !== move.index);
        let cur: UnoState = {
          ...s,
          hands: { ...s.hands, [me]: hand },
          discard: [...s.discard, card],
          color: isWild(card) ? (move.color as Color) : (card.color as Color),
          drawn: null,
        };
        if (hand.length === 0) return { ...cur, winner: me, last: 'Played the last card!' };

        // In a two-player game skip and reverse give the same player another turn.
        let next: PlayerId = opp;
        let note = 'Played a card.';
        if (card.value === 'skip' || card.value === 'reverse') {
          next = me;
          note = `${card.value === 'skip' ? 'Skip' : 'Reverse'}: plays again.`;
        } else if (card.value === 'draw2') {
          cur = draw(cur, opp, 2);
          next = me;
          note = 'Draw Two: opponent draws 2 and loses their turn.';
        } else if (card.value === 'wild4') {
          cur = draw(cur, opp, 4);
          next = me;
          note = 'Wild Draw Four: opponent draws 4 and loses their turn.';
        } else if (card.value === 'wild') {
          note = `Wild: colour is now ${move.color}.`;
        }
        return { ...cur, current: next, last: note };
      }
      return null;
    },
    getStatus: (s) => (s.winner === null ? { state: 'playing' } : { state: 'won', winner: s.winner }),
  };
}

export const unoEngine = createUno();
