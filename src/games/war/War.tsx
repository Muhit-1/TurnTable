import { GameShell, Scoreboard, TurnBanner } from '../../shared/components';
import { type Card, cardLabel, SUIT_SYMBOL } from '../../shared/deck';
import { useMatch } from '../../shared/useMatch';
import { warEngine } from './engine';

function CardView({ card }: { card: Card }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div
      role="img"
      aria-label={`${card.rank} of ${card.suit}`}
      className={`pcard card-flip w-20 h-28 flex flex-col items-center justify-center text-2xl font-bold ${red ? 'text-red-600' : 'text-neutral-900'}`}
    >
      <span>{cardLabel(card).slice(0, -1)}</span>
      <span>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export default function War() {
  const m = useMatch(warEngine, { persistId: 'war' });
  const { game } = m;
  const { state, status } = game;
  const names = m.names('Player 1', 'Player 2');
  const last = state.last;

  return (
    <GameShell id="war" title="War">
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Cards — {names[1]}: {state.piles[1].length} · {names[2]}: {state.piles[2].length} · Flips:{' '}
        {state.flips}
      </div>
      <TurnBanner>
        {status.state === 'playing' &&
          (last
            ? `${names[last.winner]} won ${last.won} cards${last.wars ? ` after ${last.wars} war${last.wars > 1 ? 's' : ''}!` : '.'}`
            : 'Flip the top cards.')}
        {status.state === 'won' && `${names[status.winner]} wins the game!`}
        {status.state === 'draw' && "Stalemate after too many flips — it's a draw."}
      </TurnBanner>

      <div className="flex gap-10 items-center min-h-28">
        {last ? (
          <>
            <CardView key={`a${state.flips}`} card={last.c1} />
            <span className="font-semibold text-amber-900/70">vs</span>
            <CardView key={`b${state.flips}`} card={last.c2} />
          </>
        ) : (
          <span className="text-neutral-500">Two piles of 26 cards, face down.</span>
        )}
      </div>

      <button
        type="button"
        className="px-6 py-3 rounded border bg-neutral-900 text-white disabled:opacity-40"
        disabled={status.state !== 'playing'}
        onClick={() => game.play('flip')}
      >
        Flip
      </button>
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
