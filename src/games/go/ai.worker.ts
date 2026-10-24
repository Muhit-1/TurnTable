/// <reference lib="webworker" />
import { serveRpc } from '../../shared/workerRpc';
import { chooseMove } from './ai';
import type { GoMove } from './engine';
import type { GoRequest } from './workerClient';

// The search runs here so the page stays responsive while the computer thinks.
serveRpc<GoRequest, GoMove>(self, ({ state, level }) => chooseMove(state, level));
