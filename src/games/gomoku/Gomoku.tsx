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
import { type GomokuState, gomokuEngine, SIZE } from './engine';

export default function Gomoku() {
  const [level, levelPicker] = useLevel('gomoku');
  const pickMove = useMemo(() => (s: GomokuState) => chooseMove(s, level), [level]);
  const m = useMatch(gomokuEngine, { pickMove, delayMs: 350, persistId: 'gomoku' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Black', 'White');
  const win = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="gomoku" title="Gomoku">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <BoardFrame>
        <div
          className="grid bg-amber-200 p-2 rounded max-w-full overflow-auto"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
        >
          {state.cells.map((cell, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
              key={i}
              type="button"
              aria-label={`Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}${cell ? `, ${cell === 1 ? 'black' : 'white'}` : ''}`}
              disabled={isCpuTurn || cell !== null || status.state !== 'playing'}
              onClick={() => play(i)}
              className="w-8 h-8 border border-amber-700/40 flex items-center justify-center disabled:cursor-default"
            >
              {cell && (
                <span
                  className={`block w-6 h-6 rounded-full border ${cell === 1 ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-500'} ${
                    win?.includes(i) ? 'ring-2 ring-red-500' : state.last === i ? 'ring-2 ring-blue-400' : ''
                  }`}
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
        onRestart={game.reset}
      />
    </GameShell>
  );
}
