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
import { usePersistentState } from '../../shared/storage';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { createGomoku, type GomokuState, isVariant, SIZE, type Variant } from './engine';

export default function Gomoku() {
  const [variant, setVariant] = usePersistentState<Variant>('gomoku:variant', 'freestyle', isVariant);
  // A new match for each rule, so its position and scores are kept apart.
  return <GomokuMatch key={variant} variant={variant} onVariant={setVariant} />;
}

function GomokuMatch({ variant, onVariant }: { variant: Variant; onVariant: (v: Variant) => void }) {
  const [level, levelPicker] = useLevel('gomoku');
  const engine = useMemo(() => createGomoku(variant), [variant]);
  const pickMove = useMemo(() => (s: GomokuState) => chooseMove(s, level), [level]);
  const m = useMatch(engine, {
    pickMove,
    delayMs: 350,
    persistId: variant === 'freestyle' ? 'gomoku' : `gomoku:${variant}`,
  });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Black', 'White');
  const win = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="gomoku" title="Gomoku">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <fieldset className="seg">
        <legend className="sr-only">Winning rule</legend>
        <button type="button" aria-pressed={variant === 'freestyle'} onClick={() => onVariant('freestyle')}>
          5 or more
        </button>
        <button type="button" aria-pressed={variant === 'standard'} onClick={() => onVariant('standard')}>
          Exactly 5
        </button>
      </fieldset>
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <BoardFrame>
        <div
          className="board-go grid rounded p-2 max-w-full overflow-auto"
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
                  className={`block w-6 h-6 piece-pop ${cell === 1 ? 'stone-b' : 'stone-w'} ${
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
