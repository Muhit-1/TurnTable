import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  canPlay,
  createUno,
  HAND_SIZE,
  isWild,
  playableIndexes,
  topCard,
  type UnoCard,
  type UnoState,
  unoDeck,
} from './engine';

const e = createUno(3);
const card = (color: UnoCard['color'], value: UnoCard['value']): UnoCard => ({ color, value });
const state = (over: Partial<UnoState>): UnoState => ({
  hands: { 1: [], 2: [] },
  drawPile: [card('red', 1), card('red', 2), card('red', 3), card('red', 4), card('red', 5), card('red', 6)],
  discard: [card('red', 5)],
  color: 'red',
  current: 1,
  drawn: null,
  seed: 1,
  winner: null,
  last: '',
  ...over,
});
const count = (s: UnoState) => s.hands[1].length + s.hands[2].length + s.drawPile.length + s.discard.length;

describe('uno deck and setup', () => {
  it('has the standard 108 cards', () => {
    const d = unoDeck();
    expect(d).toHaveLength(108);
    expect(d.filter((c) => c.value === 0)).toHaveLength(4);
    expect(d.filter((c) => c.value === 7)).toHaveLength(8);
    expect(d.filter((c) => c.value === 'skip')).toHaveLength(8);
    expect(d.filter((c) => c.value === 'draw2')).toHaveLength(8);
    expect(d.filter((c) => c.value === 'wild')).toHaveLength(4);
    expect(d.filter((c) => c.value === 'wild4')).toHaveLength(4);
    expect(d.filter(isWild).every((c) => c.color === null)).toBe(true);
  });

  it('deals 7 each, starts on a number card with its colour, and keeps 108 cards', () => {
    const s = e.initialState();
    expect(s.hands[1]).toHaveLength(HAND_SIZE);
    expect(s.hands[2]).toHaveLength(HAND_SIZE);
    expect(typeof topCard(s).value).toBe('number');
    expect(s.color).toBe(topCard(s).color);
    expect(count(s)).toBe(108);
  });
});

describe('uno playing cards', () => {
  it('matches by colour, by value, and wilds always play', () => {
    const s = state({});
    expect(canPlay(card('red', 9), s)).toBe(true);
    expect(canPlay(card('blue', 5), s)).toBe(true);
    expect(canPlay(card('blue', 9), s)).toBe(false);
    expect(canPlay(card(null, 'wild'), s)).toBe(true);
    expect(canPlay(card(null, 'wild4'), s)).toBe(true);
  });

  it('a played card becomes the top of the discard pile and passes the turn', () => {
    const s = state({ hands: { 1: [card('red', 9), card('blue', 2)], 2: [card('green', 1)] } });
    const n = e.applyMove(s, { kind: 'play', index: 0 }) as UnoState;
    expect(topCard(n)).toEqual(card('red', 9));
    expect(n.hands[1]).toHaveLength(1);
    expect(n.current).toBe(2);
    expect(n.color).toBe('red');
  });

  it('rejects unplayable cards, bad indexes, colours on non-wilds and missing colours on wilds', () => {
    const s = state({ hands: { 1: [card('blue', 9), card('red', 9), card(null, 'wild')], 2: [] } });
    expect(e.applyMove(s, { kind: 'play', index: 0 })).toBeNull();
    expect(e.applyMove(s, { kind: 'play', index: 7 })).toBeNull();
    expect(e.applyMove(s, { kind: 'play', index: 1, color: 'blue' })).toBeNull();
    expect(e.applyMove(s, { kind: 'play', index: 2 })).toBeNull();
    expect(e.applyMove(s, { kind: 'draw' })).toBeNull(); // has playable cards
  });

  it('a wild sets the colour; the next card must match it', () => {
    const s = state({
      hands: { 1: [card(null, 'wild'), card('red', 1)], 2: [card('blue', 3), card('red', 8)] },
    });
    const n = e.applyMove(s, { kind: 'play', index: 0, color: 'blue' }) as UnoState;
    expect(n.color).toBe('blue');
    expect(n.current).toBe(2);
    expect(playableIndexes(n)).toEqual([0]); // blue 3 plays, red 8 does not
  });
});

describe('uno action cards (two-player rules)', () => {
  it('skip and reverse give the same player another turn', () => {
    for (const value of ['skip', 'reverse'] as const) {
      const s = state({ hands: { 1: [card('red', value), card('red', 1)], 2: [card('blue', 1)] } });
      const n = e.applyMove(s, { kind: 'play', index: 0 }) as UnoState;
      expect(n.current).toBe(1);
    }
  });

  it('draw two makes the opponent draw 2 and lose their turn', () => {
    const s = state({ hands: { 1: [card('red', 'draw2'), card('red', 1)], 2: [card('blue', 1)] } });
    const n = e.applyMove(s, { kind: 'play', index: 0 }) as UnoState;
    expect(n.hands[2]).toHaveLength(3);
    expect(n.current).toBe(1);
    expect(count(n)).toBe(count(s));
  });

  it('wild draw four sets the colour and makes the opponent draw 4', () => {
    const s = state({ hands: { 1: [card(null, 'wild4'), card('red', 1)], 2: [card('blue', 1)] } });
    const n = e.applyMove(s, { kind: 'play', index: 0, color: 'green' }) as UnoState;
    expect(n.hands[2]).toHaveLength(5);
    expect(n.color).toBe('green');
    expect(n.current).toBe(1);
  });
});

describe('uno drawing', () => {
  it('drawing is only allowed with no playable card; an unplayable draw ends the turn', () => {
    const s = state({
      hands: { 1: [card('blue', 9)], 2: [card('red', 1)] },
      drawPile: [card('green', 2), card('red', 7)],
    });
    expect(e.legalMoves(s)).toEqual([{ kind: 'draw' }]);
    const n = e.applyMove(s, { kind: 'draw' }) as UnoState;
    expect(n.hands[1]).toHaveLength(2);
    expect(n.current).toBe(2);
    expect(n.drawn).toBeNull();
  });

  it('a playable drawn card may be played or kept', () => {
    const s = state({
      hands: { 1: [card('blue', 9)], 2: [card('red', 1)] },
      drawPile: [card('red', 7), card('green', 2)],
    });
    const n = e.applyMove(s, { kind: 'draw' }) as UnoState;
    expect(n.current).toBe(1);
    expect(n.drawn).toBe(1);
    expect(e.applyMove(n, { kind: 'play', index: 0 })).toBeNull(); // only the drawn card may be played
    expect(e.applyMove(n, { kind: 'draw' })).toBeNull();
    const kept = e.applyMove(n, { kind: 'pass' }) as UnoState;
    expect(kept.current).toBe(2);
    expect(kept.hands[1]).toHaveLength(2);
    const played = e.applyMove(n, { kind: 'play', index: 1 }) as UnoState;
    expect(topCard(played)).toEqual(card('red', 7));
    expect(played.current).toBe(2);
  });

  it('passing is not allowed without drawing first', () => {
    expect(e.applyMove(state({ hands: { 1: [card('red', 1)], 2: [] } }), { kind: 'pass' })).toBeNull();
  });

  it('an empty draw pile is replenished from the discards (top card stays)', () => {
    const s = state({
      hands: { 1: [card('blue', 9)], 2: [card('red', 1)] },
      drawPile: [],
      discard: [card('green', 1), card('yellow', 2), card('red', 5)],
    });
    const n = e.applyMove(s, { kind: 'draw' }) as UnoState;
    expect(n.hands[1]).toHaveLength(2);
    expect(topCard(n)).toEqual(card('red', 5));
    expect(count(n)).toBe(count(s));
  });

  it('nothing to draw anywhere passes the turn', () => {
    const s = state({
      hands: { 1: [card('blue', 9)], 2: [card('red', 1)] },
      drawPile: [],
      discard: [card('red', 5)],
    });
    const n = e.applyMove(s, { kind: 'draw' }) as UnoState;
    expect(n.current).toBe(2);
    expect(n.hands[1]).toHaveLength(1);
  });
});

describe('uno winning', () => {
  it('playing the last card wins and stops play', () => {
    const s = state({ hands: { 1: [card('red', 9)], 2: [card('blue', 1)] } });
    const n = e.applyMove(s, { kind: 'play', index: 0 }) as UnoState;
    expect(e.getStatus(n)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(n)).toEqual([]);
    expect(e.applyMove(n, { kind: 'draw' })).toBeNull();
  });

  it('going out with an action card still wins immediately (no penalty draw)', () => {
    const s = state({ hands: { 1: [card('red', 'draw2')], 2: [card('blue', 1)] } });
    const n = e.applyMove(s, { kind: 'play', index: 0 }) as UnoState;
    expect(n.winner).toBe(1);
  });
});

describe('uno AI', () => {
  it('prefers a coloured card over a wild, and picks its strongest colour for a wild', () => {
    const s = state({ hands: { 1: [card(null, 'wild'), card('red', 2)], 2: [card('blue', 1)] } });
    expect(getBestMove(s)).toEqual({ kind: 'play', index: 1 });
    const stuck = state({
      hands: {
        1: [card(null, 'wild'), card('blue', 4), card('blue', 5), card('green', 1)],
        2: [card('blue', 1)],
      },
      discard: [card('yellow', 8)],
      color: 'yellow',
    });
    expect(getBestMove(stuck)).toEqual({ kind: 'play', index: 0, color: 'blue' });
  });

  it('draws when it has to, and plays full games to a win keeping 108 cards', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const eng = createUno(seed);
      let s = eng.initialState();
      let n = 0;
      while (eng.getStatus(s).state === 'playing' && n++ < 3000) {
        const m = getBestMove(s);
        const next = eng.applyMove(s, m);
        expect(next, JSON.stringify(m)).not.toBeNull();
        s = next as UnoState;
        expect(count(s)).toBe(108);
      }
      expect(eng.getStatus(s).state).toBe('won');
    }
  });
});
