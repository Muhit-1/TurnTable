import { useMemo } from 'react';
import {
  BoardFrame,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { type Card, cardLabel, rankLabel, SUIT_SYMBOL } from '../../shared/deck';
import type { PlayerId } from '../../shared/engine';
import { useLevel } from '../../shared/level';
import { PassGate } from '../../shared/PassGate';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { countRank, type GoFishState, goFishEngine, ranksHeld } from './engine';

function CardFace({ card }: { card: Card }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <span
      role="img"
      aria-label={`${rankLabel(card.rank)} of ${card.suit}`}
      className={`pcard card-deal inline-flex w-10 h-14 items-center justify-center text-sm font-bold ${red ? 'text-red-600' : 'text-neutral-900'}`}
    >
      {cardLabel(card)}
    </span>
  );
}

export default function GoFish() {
  const [level, levelPicker] = useLevel('go-fish');
  const pickMove = useMemo(() => (s: GoFishState) => chooseMove(s, level), [level]);
  const m = useMatch(goFishEngine, { pickMove, delayMs: 900, persistId: 'go-fish' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const pvp = m.mode === 'pvp';
  const over = status.state !== 'playing';
  const viewer: PlayerId = pvp ? player : 1; // whose hand is on screen
  const opponent: PlayerId = viewer === 1 ? 2 : 1;
  const last = state.last;

  const hand = [...state.hands[viewer]].sort((a, b) => a.rank - b.rank);
  const canAsk = !over && !isCpuTurn && viewer === player;

  return (
    <GameShell id="go-fish" title="Go Fish">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Books — {names[1]}: {state.books[1].length} · {names[2]}: {state.books[2].length} · Ocean:{' '}
        {state.ocean.length} cards
      </div>
      <TurnBanner>
        {last &&
          `${names[last.asker]} asked for ${rankLabel(last.rank)}s: ${last.received ? `got ${last.received}` : last.fished ? 'Go Fish!' : 'no luck, ocean empty'}${last.booked.length ? ` — book of ${last.booked.map(rankLabel).join(', ')}s!` : ''}. `}
        {!over && (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn: ask for a rank`)}
        {status.state === 'won' &&
          `${names[status.winner]} wins ${state.books[status.winner].length}–${state.books[status.winner === 1 ? 2 : 1].length}!`}
      </TurnBanner>

      <div className="text-sm">
        {names[opponent]} holds {state.hands[opponent].length} cards.
        {state.books[opponent].length > 0 && ` Books: ${state.books[opponent].map(rankLabel).join(' ')}`}
      </div>

      <BoardFrame>
        <div className="board-paper flex flex-col items-center gap-3 p-5">
          <PassGate player={viewer} name={names[viewer]} enabled={pvp && !over}>
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm font-medium">
                {possessive(names[viewer])} hand
                {state.books[viewer].length > 0 &&
                  ` — books: ${state.books[viewer].map(rankLabel).join(' ')}`}
              </div>
              <div className="flex flex-wrap justify-center gap-1 max-w-md">
                {hand.map((c) => (
                  <CardFace key={`${c.rank}${c.suit}`} card={c} />
                ))}
              </div>
              {canAsk && (
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  <span className="text-sm w-full text-center">Ask {names[opponent]} for:</span>
                  {ranksHeld(state.hands[viewer]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="px-3 py-2 rounded border bg-amber-100 hover:bg-amber-200"
                      onClick={() => play({ kind: 'ask', rank: r })}
                    >
                      {rankLabel(r)}s ({countRank(state.hands[viewer], r)})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PassGate>
        </div>
      </BoardFrame>

      <p className="text-xs text-neutral-500 max-w-sm text-center">
        Suit symbols: {Object.values(SUIT_SYMBOL).join(' ')} — a book is four cards of one rank.
      </p>
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
