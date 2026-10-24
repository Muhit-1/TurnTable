/// <reference lib="webworker" />
import { chooseMove, type Level } from './ai';
import type { ChessMove, ChessState } from './engine';

export interface WorkerRequest {
  id: number;
  state: ChessState;
  level: Level;
}
export interface WorkerResponse {
  id: number;
  move: ChessMove | null;
}

// Runs the search off the main thread so the page stays responsive while the computer thinks.
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, state, level } = event.data;
  const response: WorkerResponse = { id, move: chooseMove(state, level) };
  self.postMessage(response);
};
