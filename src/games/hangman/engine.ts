import type { GameEngine, Outcome } from '../../shared/engine';

export const MAX_WRONG = 6;

export interface HangmanState {
  /** normalised secret: lowercase letters plus spaces/hyphens/apostrophes */
  secret: string;
  guesses: string[];
  wrong: number;
  maxWrong: number;
}

/** Lowercases and validates a secret word/phrase. Returns null if it has no letters or contains other characters. */
export function normaliseSecret(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!/^[a-z][a-z '-]*$/.test(s) || !/[a-z]/.test(s)) return null;
  return s;
}

export const isLetter = (ch: string) => ch >= 'a' && ch <= 'z' && ch.length === 1;

/** Secret with unguessed letters replaced by `_`; non-letters are always shown. */
export function masked(s: HangmanState, revealAll = false): string[] {
  return [...s.secret].map((ch) => (!isLetter(ch) || revealAll || s.guesses.includes(ch) ? ch : '_'));
}

const solved = (s: HangmanState) => [...s.secret].every((ch) => !isLetter(ch) || s.guesses.includes(ch));

/** Player 1 is the guesser, player 2 is the person who chose the word. */
export function createHangman(secret: string, maxWrong = MAX_WRONG): GameEngine<HangmanState, string> {
  const normalised = normaliseSecret(secret);
  if (!normalised) throw new Error('Secret must contain only letters, spaces, hyphens or apostrophes');
  return {
    initialState: () => ({ secret: normalised, guesses: [], wrong: 0, maxWrong }),
    currentPlayer: () => 1,
    legalMoves(s) {
      if (solved(s) || s.wrong >= s.maxWrong) return [];
      return 'abcdefghijklmnopqrstuvwxyz'.split('').filter((l) => !s.guesses.includes(l));
    },
    applyMove(s, letter) {
      const l = typeof letter === 'string' ? letter.toLowerCase() : '';
      if (!isLetter(l) || s.guesses.includes(l) || solved(s) || s.wrong >= s.maxWrong) return null;
      return {
        ...s,
        guesses: [...s.guesses, l],
        wrong: s.secret.includes(l) ? s.wrong : s.wrong + 1,
      };
    },
    getStatus(s): Outcome {
      if (solved(s)) return { state: 'won', winner: 1 };
      if (s.wrong >= s.maxWrong) return { state: 'won', winner: 2 };
      return { state: 'playing' };
    },
  };
}
