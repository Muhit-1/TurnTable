import { createWorkerRpc } from '../../shared/workerRpc';
import { chooseMove, type Level } from './ai';
import type { ChessMove, ChessState } from './engine';

export interface ChessRequest {
  state: ChessState;
  level: Level;
}

const call = createWorkerRpc<ChessRequest, ChessMove | null>(
  () => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
  ({ state, level }) => chooseMove(state, level),
);

/** The computer's move, searched in a Web Worker when the browser has one (otherwise on the main thread). */
export const pickChessMove = (state: ChessState, level: Level): Promise<ChessMove | null> =>
  call({ state, level });
