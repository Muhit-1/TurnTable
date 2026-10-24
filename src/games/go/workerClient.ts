import { createWorkerRpc } from '../../shared/workerRpc';
import { chooseMove, type Level } from './ai';
import type { GoMove, GoState } from './engine';

export interface GoRequest {
  state: GoState;
  level: Level;
}

const call = createWorkerRpc<GoRequest, GoMove>(
  () => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
  ({ state, level }) => chooseMove(state, level),
);

/** The computer's move, searched in a Web Worker when the browser has one (otherwise on the main thread). */
export const pickGoMove = (state: GoState, level: Level): Promise<GoMove> => call({ state, level });
