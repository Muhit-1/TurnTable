import { useEffect, useRef, useState } from 'react';
import {
  GameControls,
  GameShell,
  type Mode,
  ModeToggle,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useGame } from '../../shared/useGame';
import { getBestMove } from './ai';
import { connect4Engine } from './engine';
import type { Line, Player } from './types';

const CPU: Player = 2;
const AI_DELAY_MS = 500;

function isWinningCell(line: Line | undefined, row: number, col: number): boolean {
  return !!line?.some(([r, c]) => r === row && c === col);
}

export default function ConnectFour() {
  const game = useGame(connect4Engine);
  const [mode, setMode] = useState<Mode>('pvp');
  const [scores, setScores] = useState<Record<Player, number>>({ 1: 0, 2: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const { state, status, player, play, reset } = game;
  const isCpuTurn = mode === 'vs-cpu' && player === CPU && status.state === 'playing';
  const names: Record<Player, string> = {
    1: mode === 'vs-cpu' ? 'You' : 'Player 1',
    2: mode === 'vs-cpu' ? 'Computer' : 'Player 2',
  };

  useEffect(() => {
    if (!isCpuTurn) return;
    const timer = setTimeout(() => play(getBestMove(state.board, CPU)), AI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCpuTurn, state.board, play]);

  // Count each finished position once; redo restores the same board object, so it is not re-counted.
  const scoredBoard = useRef<unknown>(null);
  const winner = status.state === 'won' ? status.winner : null;
  useEffect(() => {
    if (!winner || scoredBoard.current === state.board) return;
    scoredBoard.current = state.board;
    setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
  }, [winner, state.board]);

  const handleModeChange = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setScores({ 1: 0, 2: 0 });
    reset();
  };

  const undo = () => game.undo(mode === 'vs-cpu' ? 2 : 1);
  const winLine = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="connect-4" title="Connect Four">
      <ModeToggle mode={mode} onChange={handleModeChange} />
      <Scoreboard names={names} scores={scores} />
      <TurnBanner>
        {status.state === 'playing' && (isCpuTurn ? 'Computer is thinking…' : `${names[player]}'s turn`)}
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
        onUndo={undo}
        onRedo={() => game.redo()}
        onRestart={reset}
      />
    </GameShell>
  );
}
