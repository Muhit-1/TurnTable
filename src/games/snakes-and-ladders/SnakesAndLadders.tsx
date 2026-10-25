import type { CSSProperties } from 'react';
import { BoardFrame, Die, GameShell, possessive, Scoreboard, TurnBanner } from '../../shared/components';
import { useMatch } from '../../shared/useMatch';
import { FINAL, LADDERS, SNAKES, snakesEngine } from './engine';

const DESCRIBE = {
  move: '.',
  ladder: ' and climbs a ladder!',
  snake: ' and slides down a snake!',
  blocked: ' — needs an exact roll, stays put.',
};

export default function SnakesAndLadders() {
  const m = useMatch(snakesEngine, { persistId: 'snakes-and-ladders' });
  const { game } = m;
  const { state, status, player } = game;
  const names = m.names('Player 1', 'Player 2');
  const last = state.last;

  return (
    <GameShell id="snakes-and-ladders" title="Snakes and Ladders">
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {last && `${names[last.player]} rolled a ${last.roll}${DESCRIBE[last.kind]} `}
        {status.state === 'playing' && `${possessive(names[player])} turn.`}
        {status.state === 'won' && `${names[status.winner]} reaches ${FINAL} and wins!`}
      </TurnBanner>

      <BoardFrame>
        <div className="board-paper grid grid-cols-10 overflow-hidden">
          {Array.from({ length: 100 }, (_, i) => {
            // render rows top to bottom: find which square sits at this grid cell
            const row = Math.floor(i / 10);
            const col = i % 10;
            const rowFromBottom = 9 - row;
            const within = rowFromBottom % 2 === 0 ? col : 9 - col;
            const n = rowFromBottom * 10 + within + 1;
            const here = ([1, 2] as const).filter((p) => state.positions[p] === n);
            return (
              <div
                key={n}
                className={`relative w-12 h-12 border text-[10px] p-0.5 ${LADDERS[n] ? 'bg-emerald-200/70' : SNAKES[n] ? 'bg-rose-200/70' : (row + col) % 2 ? 'bg-amber-50/60' : 'bg-white/40'}`}
              >
                <span className="text-neutral-500">{n}</span>
                {LADDERS[n] && <span className="block text-emerald-700">↑{LADDERS[n]}</span>}
                {SNAKES[n] && <span className="block text-rose-700">↓{SNAKES[n]}</span>}
                <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                  {here.map((p) => (
                    <i
                      key={`${p}-${n}`}
                      className={`gem piece-pop ${p === 1 ? '' : 'sapphire'}`}
                      style={{ '--size': '0.95rem' } as CSSProperties}
                      title={`Player ${p}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </BoardFrame>
      {last && <Die value={last.roll} size="3.2rem" rollKey={state.seed} />}
      <div className="text-sm">
        <span className="text-rose-600">
          ● {names[1]}: square {state.positions[1] || 'start'}
        </span>{' '}
        ·{' '}
        <span className="text-sky-600">
          ● {names[2]}: square {state.positions[2] || 'start'}
        </span>
      </div>

      <button
        type="button"
        className="px-6 py-3 rounded border bg-neutral-900 text-white disabled:opacity-40"
        disabled={status.state !== 'playing'}
        onClick={() => game.play('roll')}
      >
        🎲 Roll the die
      </button>
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
