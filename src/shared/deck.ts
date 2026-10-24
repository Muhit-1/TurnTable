import { shuffle } from './rng';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export interface Card {
  /** 2-10, 11 = J, 12 = Q, 13 = K, 14 = A */
  rank: number;
  suit: Suit;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOL: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

export function standardDeck(): Card[] {
  return SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 2, suit })));
}

export function rankLabel(rank: number): string {
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank] ?? String(rank);
}

export function cardLabel(c: Card): string {
  return `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`;
}

/** Shuffled 52-card deck and the next seed. */
export function shuffledDeck(seed: number): [Card[], number] {
  return shuffle(standardDeck(), seed);
}
