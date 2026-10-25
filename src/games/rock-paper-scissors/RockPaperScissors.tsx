import { useMemo } from 'react';
import { GameControls, GameShell, ModeToggle, Scoreboard, TurnBanner } from '../../shared/components';
import { usePersistentState } from '../../shared/storage';
import { useMatch } from '../../shared/useMatch';
import { createRps, THROWS, type Throw } from './engine';

const EMOJI: Record<Throw, string> = { rock: '✊', paper: '✋', scissors: '✌️' };
const pickMove = (): Throw => THROWS[Math.floor(Math.random() * THROWS.length)];

export default function RockPaperScissors() {
  const [bestOf, setBestOf] = usePersistentState('rock-paper-scissors:bestOf', 3);
  const engine = useMemo(() => createRps(bestOf), [bestOf]);
  return <Match key={bestOf} engine={engine} bestOf={bestOf} onBestOf={setBestOf} />;
}

function Match({
  engine,
  bestOf,
  onBestOf,
}: {
  engine: ReturnType<typeof createRps>;
  bestOf: number;
  onBestOf: (n: number) => void;
}) {
  // In vs-computer mode the computer (player 2) throws immediately after the human.
  const m = useMatch(engine, { pickMove, delayMs: 300, persistId: `rock-paper-scissors:${bestOf}` });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const last = state.rounds[state.rounds.length - 1];
  const waitingForPassDevice = m.mode === 'pvp' && state.p1Pick !== null;

  return (
    <GameShell id="rock-paper-scissors" title="Rock Paper Scissors">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      <div className="flex gap-2 items-center text-sm">
        Best of
        {[3, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`px-3 py-1 rounded border ${n === bestOf ? 'bg-neutral-900 text-white' : 'bg-white'}`}
            onClick={() => onBestOf(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <Scoreboard names={names} scores={state.wins} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is throwing…'
            : `${names[player]}: pick your throw${waitingForPassDevice ? ' (Player 1 has locked in)' : ''}`)}
        {status.state === 'won' && `${names[status.winner]} wins the match!`}
      </TurnBanner>

      <div className="flex gap-3">
        {THROWS.map((t) => (
          <button
            key={t}
            type="button"
            aria-label={t}
            disabled={status.state !== 'playing' || isCpuTurn}
            onClick={() => play(t)}
            className="w-24 h-24 text-5xl rounded border bg-white hover:bg-neutral-50 disabled:opacity-40"
          >
            {EMOJI[t]}
          </button>
        ))}
      </div>

      {last && (
        <div className="text-center" role="status">
          <div className="text-4xl">
            {EMOJI[last.p1]} vs {EMOJI[last.p2]}
          </div>
          <div className="text-sm text-neutral-600">
            {last.winner ? `${names[last.winner]} wins the round` : 'Tie — replay'}
          </div>
        </div>
      )}

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
