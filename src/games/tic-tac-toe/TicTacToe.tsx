import { useEffect, useRef, useState } from 'react';
import {
  GameControls,
  GameShell,
  type Mode,
  ModeToggle,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import type { PlayerId } from '../../shared/engine';
import { useGame } from '../../shared/useGame';
import { getBestMove } from './ai';
import { tttEngine } from './engine';

const CPU: PlayerId = 2;
const AI_DELAY_MS = 400;

export default function TicTacToe() {
  const game = useGame(tttEngine);
  const [mode, setMode] = useState<Mode>('pvp');
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0 });
  const { state, status, player, play, reset } = game;
  const isCpuTurn = mode === 'vs-cpu' && player === CPU && status.state === 'playing';
  const names: Record<PlayerId, string> = {
    1: mode === 'vs-cpu' ? 'You (X)' : 'Player 1 (X)',
    2: mode === 'vs-cpu' ? 'Computer (O)' : 'Player 2 (O)',
  };

  useEffect(() => {
    if (!isCpuTurn) return;
    const timer = setTimeout(() => play(getBestMove(state)), AI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCpuTurn, state, play]);

  // Count each finished position once; redo restores the same state object, so it is not re-counted.
  const scoredCells = useRef<unknown>(null);
  const winner = status.state === 'won' ? status.winner : null;
  useEffect(() => {
    if (!winner || scoredCells.current === state.cells) return;
    scoredCells.current = state.cells;
    setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
  }, [winner, state.cells]);

  const handleModeChange = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setScores({ 1: 0, 2: 0 });
    reset();
  };

  const winLine = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="tic-tac-toe" title="Tic-Tac-Toe">
      <ModeToggle mode={mode} onChange={handleModeChange} />
      <Scoreboard names={names} scores={scores} />
      <TurnBanner>
        {status.state === 'playing' && (isCpuTurn ? 'Computer is thinking…' : `${names[player]}'s turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <div className="grid grid-cols-3 gap-2">
        {state.cells.map((cell, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
            key={i}
            type="button"
            aria-label={`Cell ${i + 1}${cell ? `, ${cell === 1 ? 'X' : 'O'}` : ''}`}
            disabled={isCpuTurn || !game.legalMoves.includes(i)}
            onClick={() => play(i)}
            className={`w-24 h-24 text-5xl font-bold rounded border bg-white disabled:cursor-not-allowed ${
              winLine?.includes(i) ? 'ring-4 ring-amber-400' : ''
            }`}
          >
            {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
          </button>
        ))}
      </div>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={() => game.undo(mode === 'vs-cpu' ? 2 : 1)}
        onRedo={() => game.redo()}
        onRestart={reset}
      />
    </GameShell>
  );
}
