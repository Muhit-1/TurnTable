import { useMemo } from 'react';
import {
  BoardFrame,
  GameControls,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { type TttState, tttEngine } from './engine';

const AI_DELAY_MS = 400;

export default function TicTacToe() {
  const [level, levelPicker] = useLevel('tic-tac-toe');
  const pickMove = useMemo(() => (s: TttState) => chooseMove(s, level), [level]);
  const m = useMatch(tttEngine, { pickMove, delayMs: AI_DELAY_MS, persistId: 'tic-tac-toe' });
  const { game, mode, isCpuTurn } = m;
  const { state, status, player, play, reset } = game;
  const names = m.names('Player 1 (X)', 'Player 2 (O)');

  const winLine = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="tic-tac-toe" title="Tic-Tac-Toe">
      <ModeToggle mode={mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <BoardFrame>
        <div className="board-chalk grid grid-cols-3">
          {state.cells.map((cell, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
              key={i}
              type="button"
              aria-label={`Cell ${i + 1}${cell ? `, ${cell === 1 ? 'X' : 'O'}` : ''}`}
              disabled={isCpuTurn || !game.legalMoves.includes(i)}
              onClick={() => play(i)}
              className={`chalk-cell w-28 h-28 flex items-center justify-center enabled:hover:bg-white/5 disabled:cursor-not-allowed ${
                winLine?.includes(i) ? 'win-glow bg-amber-400/25' : ''
              }`}
            >
              {cell !== null && (
                <i key={cell} aria-hidden="true" className={cell === 1 ? 'mark-x' : 'mark-o'} />
              )}
            </button>
          ))}
        </div>
      </BoardFrame>

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
