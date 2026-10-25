import { type CSSProperties, useMemo } from 'react';
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
        <div className="board-paper grid grid-cols-3 gap-1 p-3">
          {state.cells.map((cell, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
              key={i}
              type="button"
              aria-label={`Cell ${i + 1}${cell ? `, ${cell === 1 ? 'X' : 'O'}` : ''}`}
              disabled={isCpuTurn || !game.legalMoves.includes(i)}
              onClick={() => play(i)}
              className={`w-24 h-24 flex items-center justify-center rounded-lg border border-amber-900/20 bg-amber-50/40 enabled:hover:bg-amber-100/80 disabled:cursor-not-allowed ${
                winLine?.includes(i) ? 'win-glow ring-4 ring-amber-400' : ''
              }`}
            >
              {cell !== null && (
                <i
                  key={cell}
                  aria-hidden="true"
                  className={`gem piece-pop ${cell === 1 ? '' : 'sapphire'}`}
                  style={{ '--size': '3.6rem' } as CSSProperties}
                />
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
