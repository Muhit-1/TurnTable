import { useMemo, useState } from 'react';
import { GameControls, GameShell, ModeToggle, Scoreboard, TurnBanner } from '../../shared/components';
import { useMatch } from '../../shared/useMatch';
import { getBestMove } from './ai';
import { createNim, type NimState } from './engine';

const pickMove = (s: NimState) => getBestMove(s);

export default function Nim() {
  const [misere, setMisere] = useState(false);
  const engine = useMemo(() => createNim([3, 5, 7], misere), [misere]);
  // Remount the match when the variant changes so history/scores reset cleanly.
  return <NimMatch key={String(misere)} engine={engine} misere={misere} onVariant={setMisere} />;
}

function NimMatch({
  engine,
  misere,
  onVariant,
}: {
  engine: ReturnType<typeof createNim>;
  misere: boolean;
  onVariant: (m: boolean) => void;
}) {
  const m = useMatch(engine, { pickMove });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const [selected, setSelected] = useState<{ pile: number; count: number } | null>(null);
  const names = m.names('Player 1', 'Player 2');

  const pick = (pile: number, index: number) => {
    if (status.state !== 'playing' || isCpuTurn) return;
    // Clicking token `index` selects it and every token above it in the same pile.
    const count = state.piles[pile] - index;
    setSelected({ pile, count });
  };
  const confirm = () => {
    if (selected && play(selected)) setSelected(null);
  };

  return (
    <GameShell id="nim" title="Nim">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={misere} onChange={(e) => onVariant(e.target.checked)} />
        Misère (taking the last object loses)
      </label>
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${names[player]}: choose objects from one pile`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
      </TurnBanner>

      <div className="flex flex-col gap-3 items-start">
        {state.piles.map((size, pile) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed pile positions
          <div key={pile} className="flex items-center gap-2">
            <span className="w-14 text-sm text-neutral-600">Pile {pile + 1}</span>
            {Array.from({ length: size }, (_, index) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
                key={index}
                type="button"
                aria-label={`Pile ${pile + 1}, take ${size - index}`}
                disabled={status.state !== 'playing' || isCpuTurn}
                onClick={() => pick(pile, index)}
                className={`w-8 h-8 rounded-full border-2 ${
                  selected && selected.pile === pile && index >= size - selected.count
                    ? 'bg-red-400 border-red-700'
                    : 'bg-amber-300 border-amber-600'
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="px-4 py-2 rounded border bg-neutral-900 text-white disabled:opacity-40"
        disabled={!selected || status.state !== 'playing' || isCpuTurn}
        onClick={confirm}
      >
        Take {selected ? selected.count : ''}
      </button>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={() => {
          setSelected(null);
          m.undo();
        }}
        onRedo={() => game.redo()}
        onRestart={() => {
          setSelected(null);
          game.reset();
        }}
      />
    </GameShell>
  );
}
