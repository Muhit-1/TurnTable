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
import { count, type ReversiState, reversiEngine, SIZE } from './engine';

export default function Reversi() {
  const [level, levelPicker] = useLevel('reversi');
  const pickMove = useMemo(() => (s: ReversiState) => chooseMove(s, level), [level]);
  const m = useMatch(reversiEngine, { pickMove, delayMs: 450, persistId: 'reversi' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('Dark', 'Light');
  const discs = count(state.cells);

  return (
    <GameShell id="reversi" title="Reversi / Othello">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
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

      <BoardFrame>
        <div className="board-felt grid grid-cols-8 gap-0.5 p-1">
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
                className="w-10 h-10 bg-white/5 flex items-center justify-center disabled:cursor-default"
              >
                {cell ? (
                  <span
                    key={cell}
                    className={`block w-8 h-8 piece-flip ${cell === 1 ? 'stone-b' : 'stone-w'}`}
                  />
                ) : legal ? (
                  <span className="block w-3 h-3 rounded-full bg-amber-400/90" />
                ) : null}
              </button>
            );
          })}
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
