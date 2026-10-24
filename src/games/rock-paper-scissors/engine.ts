import type { GameEngine, PlayerId } from '../../shared/engine';

export type Throw = 'rock' | 'paper' | 'scissors';
export const THROWS: Throw[] = ['rock', 'paper', 'scissors'];
const BEATS: Record<Throw, Throw> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

export interface RoundResult {
  p1: Throw;
  p2: Throw;
  /** winner of the round, or null for a tie (tie is replayed and does not count) */
  winner: PlayerId | null;
}

export interface RpsState {
  bestOf: number;
  /** player 1 throws first (hidden), then player 2; the round resolves after both */
  p1Pick: Throw | null;
  wins: Record<PlayerId, number>;
  current: PlayerId;
  rounds: RoundResult[];
}

export function roundWinner(p1: Throw, p2: Throw): PlayerId | null {
  if (p1 === p2) return null;
  return BEATS[p1] === p2 ? 1 : 2;
}

export function createRps(bestOf = 3): GameEngine<RpsState, Throw> {
  const target = Math.floor(bestOf / 2) + 1;
  return {
    initialState: () => ({ bestOf, p1Pick: null, wins: { 1: 0, 2: 0 }, current: 1, rounds: [] }),
    currentPlayer: (s) => s.current,
    legalMoves: (s) => (s.wins[1] >= target || s.wins[2] >= target ? [] : [...THROWS]),
    applyMove(s, t) {
      if (!THROWS.includes(t) || s.wins[1] >= target || s.wins[2] >= target) return null;
      if (s.current === 1) return { ...s, p1Pick: t, current: 2 };
      if (s.p1Pick === null) return null;
      const winner = roundWinner(s.p1Pick, t);
      const wins = winner ? { ...s.wins, [winner]: s.wins[winner] + 1 } : s.wins;
      return {
        ...s,
        p1Pick: null,
        wins,
        current: 1,
        rounds: [...s.rounds, { p1: s.p1Pick, p2: t, winner }],
      };
    },
    getStatus(s) {
      if (s.wins[1] >= target) return { state: 'won', winner: 1 };
      if (s.wins[2] >= target) return { state: 'won', winner: 2 };
      return { state: 'playing' };
    },
  };
}

export const rpsEngine = createRps(3);
