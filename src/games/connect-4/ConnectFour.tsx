import { useState } from 'react';
import {
  GameControls,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useMatch } from '../../shared/useMatch';
import { getBestMove } from './ai';
import { type C4State, connect4Engine } from './engine';
import type { Line, Player } from './types';

const CPU: Player = 2;
const AI_DELAY_MS = 500;
const pickMove = (state: C4State) => getBestMove(state.board, CPU);

function isWinningCell(line: Line | undefined, row: number, col: number): boolean {
  return !!line?.some(([r, c]) => r === row && c === col);
}

export default function ConnectFour() {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const m = useMatch(connect4Engine, { pickMove, delayMs: AI_DELAY_MS });
  const { game, mode, isCpuTurn } = m;
  const { state, status, player, play, reset } = game;
  const names = m.names('Player 1', 'Player 2');

  const winLine = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="connect-4" title="Connect Four">
      <ModeToggle mode={mode} onChange={m.changeMode} />
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <div className="bg-blue-700 p-3 rounded-lg inline-grid grid-cols-7 gap-2">
        {state.board.map((row, rowIdx) =>
          row.map((cell, col) => {
            const disabled = isCpuTurn || !game.legalMoves.includes(col);
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
                key={`${rowIdx}-${col}`}
                type="button"
                aria-label={`Drop in column ${col + 1}`}
                disabled={disabled}
                onClick={() => play(col)}
                onMouseEnter={() => setHoverCol(col)}
                onMouseLeave={() => setHoverCol((c) => (c === col ? null : c))}
                className={[
                  'w-12 h-12 rounded-full block transition-colors disabled:cursor-not-allowed',
                  cell === 1 ? 'bg-amber-400' : cell === 2 ? 'bg-emerald-600' : 'bg-white',
                  cell === null && hoverCol === col && !disabled ? 'bg-blue-100' : '',
                  isWinningCell(winLine, rowIdx, col) ? 'ring-4 ring-white' : '',
                ].join(' ')}
              />
            );
          }),
        )}
      </div>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={m.undo}
        onRedo={() => game.redo()}
        onRestart={reset}
      />
    </GameShell>
  );
}
