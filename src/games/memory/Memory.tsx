import { useEffect, useMemo } from 'react';
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
import { createMemory, type MemoryState, needsResolve } from './engine';

const SYMBOLS = [
  '🍎',
  '🍌',
  '🍇',
  '🍒',
  '🍋',
  '🍉',
  '🥝',
  '🍑',
  '🍓',
  '🥕',
  '🌽',
  '🍄',
  '🥑',
  '🍍',
  '🥥',
  '🌶️',
  '🍐',
  '🫐',
];
const MISMATCH_MS = 1000;

export default function Memory() {
  const [pairs, setPairs] = usePersistentState('memory:pairs', 8);
  const engine = useMemo(() => createMemory(pairs), [pairs]);
  return <Match key={pairs} engine={engine} pairs={pairs} onPairs={setPairs} />;
}

function Match({
  engine,
  pairs,
  onPairs,
}: {
  engine: ReturnType<typeof createMemory>;
  pairs: number;
  onPairs: (n: number) => void;
}) {
  const [level, levelPicker] = useLevel('memory');
  const pickMove = useMemo(() => (s: MemoryState) => chooseMove(s, level), [level]);
  const m = useMatch(engine, { pickMove, delayMs: 650, persistId: `memory:${pairs}` });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const pending = needsResolve(state);

  // The human turns a mismatched pair back down after a short look; the computer does it through pickMove.
  useEffect(() => {
    if (!pending || isCpuTurn) return;
    const t = setTimeout(() => play('resolve'), MISMATCH_MS);
    return () => clearTimeout(t);
  }, [pending, isCpuTurn, play]);

  const cols = pairs <= 6 ? 4 : pairs <= 8 ? 4 : 6;

  return (
    <GameShell id="memory" title="Memory">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <div className="flex gap-2 items-center text-sm">
        Pairs
        {[6, 8, 12].map((n) => (
          <button
            key={n}
            type="button"
            className={`px-3 py-1 rounded border ${n === pairs ? 'bg-neutral-900 text-white' : 'bg-white'}`}
            onClick={() => onPairs(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Pairs found — {names[1]}: {state.pairs[1]} · {names[2]}: {state.pairs[2]}
      </div>
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <BoardFrame>
        <div className="board-felt grid gap-2 p-3" style={{ gridTemplateColumns: `repeat(${cols}, 4.5rem)` }}>
          {state.symbols.map((sym, i) => {
            const up = state.flipped.includes(i);
            const owner = state.matchedBy[i];
            const shown = up || owner !== null;
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
                key={i}
                type="button"
                aria-label={shown ? `Card ${i + 1}, ${SYMBOLS[sym]}` : `Card ${i + 1}, face down`}
                disabled={isCpuTurn || owner !== null || up || status.state !== 'playing'}
                onClick={() => play(i)}
                className={`h-20 text-3xl flex items-center justify-center ${
                  owner === 1 ? 'pcard-gold' : owner === 2 ? 'pcard-teal' : up ? 'pcard' : 'pcard-back'
                }`}
              >
                {shown && (
                  <span key={`${shown}`} className="card-flip">
                    {SYMBOLS[sym]}
                  </span>
                )}
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
