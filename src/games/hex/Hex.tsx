import { type CSSProperties, useMemo } from 'react';
import {
  BoardFrame,
  GameControls,
  GameShell,
  ModeToggle,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { type HexState, hexEngine, SIZE } from './engine';

export default function Hex() {
  const [level, levelPicker] = useLevel('hex');
  const pickMove = useMemo(() => (s: HexState) => chooseMove(s, level), [level]);
  const m = useMatch(hexEngine, { pickMove, delayMs: 350, persistId: 'hex' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Red (top ↔ bottom)', 'Blue (left ↔ right)');
  const win = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="hex" title="Hex">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' && (isCpuTurn ? 'Computer is thinking…' : `${names[player]}: your turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
      </TurnBanner>

      <BoardFrame>
        <div className="board-paper max-w-full overflow-auto p-3">
          {Array.from({ length: SIZE }, (_, r) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed rows
              key={r}
              className="flex"
              style={{ marginLeft: `${r * 1.1}rem` }}
            >
              {Array.from({ length: SIZE }, (_, c) => {
                const i = r * SIZE + c;
                const cell = state.cells[i];
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Row ${r + 1}, column ${c + 1}${cell ? `, ${cell === 1 ? 'red' : 'blue'}` : ''}`}
                    disabled={isCpuTurn || cell !== null || status.state !== 'playing'}
                    onClick={() => play(i)}
                    className={[
                      'w-[2.2rem] h-8 border border-neutral-500 text-xs',
                      'bg-amber-50/60 hover:bg-amber-100',
                      r === 0 || r === SIZE - 1
                        ? r === 0
                          ? 'border-t-4 border-t-red-500'
                          : 'border-b-4 border-b-red-500'
                        : '',
                      c === 0
                        ? 'border-l-4 border-l-blue-500'
                        : c === SIZE - 1
                          ? 'border-r-4 border-r-blue-500'
                          : '',
                      win?.includes(i) ? 'ring-2 ring-yellow-400 z-10' : '',
                    ].join(' ')}
                  >
                    {cell && (
                      <i
                        key={cell}
                        className={`gem piece-pop ${cell === 1 ? '' : 'sapphire'}`}
                        style={{ '--size': '1.35rem' } as CSSProperties}
                      />
                    )}
                  </button>
                );
              })}
            </div>
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
