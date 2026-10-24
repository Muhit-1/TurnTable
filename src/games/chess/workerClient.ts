import { chooseMove, type Level } from './ai';
import type { WorkerResponse } from './ai.worker';
import type { ChessMove, ChessState } from './engine';

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (move: ChessMove | null) => void>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      waiting.get(e.data.id)?.(e.data.move);
      waiting.delete(e.data.id);
    };
    worker.onerror = () => {
      // fall back to searching on the main thread for anything still waiting
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * Asks for the computer's move. Uses a Web Worker when the browser has one and otherwise
 * (or if the worker fails to start) searches on the main thread.
 */
export function pickChessMove(state: ChessState, level: Level): Promise<ChessMove | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(chooseMove(state, level));
  return new Promise((resolve) => {
    const id = nextId++;
    const timeout = setTimeout(() => {
      // the worker never answered: do it here
      waiting.delete(id);
      resolve(chooseMove(state, level));
    }, 15000);
    waiting.set(id, (move) => {
      clearTimeout(timeout);
      resolve(move);
    });
    w.postMessage({ id, state, level });
  });
}
