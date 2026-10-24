/**
 * Contract every turn-based game implements. Pure functions only: no React, no DOM,
 * no mutation. `applyMove` returns a new state, or null when the move is illegal.
 */
export type PlayerId = 1 | 2;

export type Outcome<Line = unknown> =
  | { state: 'playing' }
  | { state: 'won'; winner: PlayerId; line?: Line }
  | { state: 'draw' };

export interface GameEngine<State, Move, Line = unknown> {
  initialState(): State;
  currentPlayer(state: State): PlayerId;
  legalMoves(state: State): Move[];
  /** Returns the next state, or null if the move is illegal or the game is over. */
  applyMove(state: State, move: Move): State | null;
  getStatus(state: State): Outcome<Line>;
}
