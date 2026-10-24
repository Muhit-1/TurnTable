import { GameControls, GameShell, ModeToggle, Scoreboard, TurnBanner } from '../../shared/components';
import { useMatch } from '../../shared/useMatch';
import { getBestMove } from './ai';
import { type HexState, hexEngine, SIZE } from './engine';

const pickMove = (s: HexState) => getBestMove(s);

export default function Hex() {
  const m = useMatch(hexEngine, { pickMove, delayMs: 350 });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Red (top ↔ bottom)', 'Blue (left ↔ right)');
  const win = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="hex" title="Hex">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' && (isCpuTurn ? 'Computer is thinking…' : `${names[player]}: your turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
      </TurnBanner>

      <div className="max-w-full overflow-auto p-2">
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
                    cell === 1 ? 'bg-red-500' : cell === 2 ? 'bg-blue-500' : 'bg-white hover:bg-neutral-100',
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
                />
              );
            })}
          </div>
        ))}
      </div>

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
