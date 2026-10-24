/// <reference lib="webworker" />
import { serveRpc } from '../../shared/workerRpc';
import { chooseMove } from './ai';
import type { ChessRequest } from './workerClient';

// Runs the search off the main thread so the page stays responsive while the computer thinks.
serveRpc<ChessRequest, ReturnType<typeof chooseMove>>(self, ({ state, level }) => chooseMove(state, level));
