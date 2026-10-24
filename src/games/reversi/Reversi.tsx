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
import { count, type ReversiState, reversiEngine, SIZE } from './engine';

const pickMove = (s: ReversiState) => getBestMove(s);

export default function Reversi() {
  const m = useMatch(reversiEngine, { pickMove, delayMs: 450 });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('Dark', 'Light');
  const discs = count(state.cells);

  return (
    <GameShell id="reversi" title="Reversi / Othello">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Discs — {names[1]}: {discs[1]} · {names[2]}: {discs[2]}
      </div>
      <TurnBanner>
        {state.skipped && status.state === 'playing' && `${names[state.skipped]} has no move and passes. `}
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' &&
          `${names[status.winner]} wins ${discs[status.winner]}–${discs[status.winner === 1 ? 2 : 1]}!`}
        {status.state === 'draw' && `It's a draw, ${discs[1]}–${discs[2]}!`}
      </TurnBanner>

      <div className="grid grid-cols-8 gap-0.5 bg-green-900 p-1 rounded">
        {state.cells.map((cell, i) => {
          const legal = !isCpuTurn && legalMoves.includes(i);
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
              key={i}
              type="button"
              aria-label={`Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}${cell ? `, ${cell === 1 ? 'dark' : 'light'}` : legal ? ', legal move' : ''}`}
              disabled={!legal}
              onClick={() => play(i)}
              className="w-10 h-10 bg-green-700 flex items-center justify-center disabled:cursor-default"
            >
              {cell ? (
                <span
                  className={`block w-8 h-8 rounded-full ${cell === 1 ? 'bg-neutral-900' : 'bg-white'}`}
                />
              ) : legal ? (
                <span className="block w-2 h-2 rounded-full bg-green-300" />
              ) : null}
            </button>
          );
        })}
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
