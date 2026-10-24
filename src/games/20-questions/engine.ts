import type { GameEngine, Outcome } from '../../shared/engine';

export const MAX_QUESTIONS = 20;

/**
 * Player 1 is the guesser, player 2 the answerer. Every question and every guess uses up one of the 20 turns.
 * Free-text moves (`ask`, `guess`) are validated in applyMove, so legalMoves lists only the fixed moves.
 */
export type TqMove =
  | { kind: 'ask'; text: string; tag?: string }
  | { kind: 'guess'; text: string; tag?: string }
  | { kind: 'answer'; yes: boolean }
  | { kind: 'giveup' };

export interface Entry {
  type: 'question' | 'guess';
  text: string;
  /** machine-readable id (an attribute for the computer's questions, an item name for its guesses) */
  tag?: string;
  /** null while waiting for the answerer */
  answer: boolean | null;
}

export interface TqState {
  /** the answerer's secret, when it was typed in; null means the answerer is judged on the honour system */
  secret: string | null;
  log: Entry[];
  phase: 'ask' | 'answer';
  max: number;
  winner: 1 | 2 | null;
  ended: 'solved' | 'out-of-questions' | 'gave-up' | null;
}

/** Lowercase, drop punctuation and a leading article so "The Moon!" matches "moon". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(a|an|the) /, '');
}

export const used = (s: TqState) => s.log.length;
export const remaining = (s: TqState) => s.max - used(s);

export function createTwentyQuestions(
  secret: string | null = null,
  max = MAX_QUESTIONS,
): GameEngine<TqState, TqMove> {
  const clean = secret && normalise(secret) ? secret : null;
  return {
    initialState: () => ({ secret: clean, log: [], phase: 'ask', max, winner: null, ended: null }),
    currentPlayer: (s) => (s.phase === 'ask' ? 1 : 2),
    legalMoves(s) {
      if (s.winner !== null) return [];
      if (s.phase === 'answer')
        return [
          { kind: 'answer', yes: true },
          { kind: 'answer', yes: false },
        ];
      return [{ kind: 'giveup' }];
    },
    applyMove(s, move) {
      if (s.winner !== null || !move) return null;
      if (move.kind === 'giveup') {
        return s.phase === 'ask' ? { ...s, winner: 2, ended: 'gave-up' } : null;
      }
      if (move.kind === 'ask' || move.kind === 'guess') {
        if (s.phase !== 'ask' || remaining(s) <= 0) return null;
        const text = typeof move.text === 'string' ? move.text.trim() : '';
        if (!text || text.length > 200) return null;
        const type = move.kind === 'ask' ? 'question' : 'guess';
        if (type === 'guess' && s.secret !== null) {
          // the secret is known, so a guess is judged automatically
          const right = normalise(text) === normalise(s.secret);
          const log = [...s.log, { type, text, tag: move.tag, answer: right } as Entry];
          if (right) return { ...s, log, winner: 1, ended: 'solved' };
          return log.length >= s.max ? { ...s, log, winner: 2, ended: 'out-of-questions' } : { ...s, log };
        }
        return { ...s, log: [...s.log, { type, text, tag: move.tag, answer: null }], phase: 'answer' };
      }
      if (move.kind === 'answer') {
        if (s.phase !== 'answer' || typeof move.yes !== 'boolean') return null;
        const log = s.log.slice();
        const entry = { ...log[log.length - 1], answer: move.yes };
        log[log.length - 1] = entry;
        const next: TqState = { ...s, log, phase: 'ask' };
        if (entry.type === 'guess' && move.yes) return { ...next, winner: 1, ended: 'solved' };
        if (log.length >= s.max) return { ...next, winner: 2, ended: 'out-of-questions' };
        return next;
      }
      return null;
    },
    getStatus(s): Outcome {
      return s.winner === null ? { state: 'playing' } : { state: 'won', winner: s.winner };
    },
  };
}

export const twentyQuestionsEngine = createTwentyQuestions();
