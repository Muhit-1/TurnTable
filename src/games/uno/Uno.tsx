import { useMemo, useState } from 'react';
import {
  BoardFrame,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import type { PlayerId } from '../../shared/engine';
import { useLevel } from '../../shared/level';
import { PassGate } from '../../shared/PassGate';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import {
  COLORS,
  type Color,
  isWild,
  playableIndexes,
  topCard,
  type UnoCard,
  type UnoState,
  unoEngine,
} from './engine';

const BG: Record<Color, string> = {
  red: 'bg-red-700 text-white',
  yellow: 'bg-yellow-400 text-neutral-900',
  green: 'bg-green-700 text-white',
  blue: 'bg-blue-700 text-white',
};
const label = (v: UnoCard['value']) =>
  ({ skip: '⊘', reverse: '⇄', draw2: '+2', wild: 'W', wild4: '+4' })[v as string] ?? String(v);
const name = (c: UnoCard) => `${c.color ?? 'wild'} ${c.value}`;

function Face({ card, active, onClick }: { card: UnoCard; active?: boolean; onClick?: () => void }) {
  const cls = `card-deal shadow-lg w-14 h-20 rounded-lg border-2 flex items-center justify-center text-xl font-bold ${card.color ? BG[card.color] : 'bg-neutral-800 text-white'} ${active ? 'ring-4 ring-yellow-200 -translate-y-1' : 'opacity-80'}`;
  return onClick ? (
    <button type="button" aria-label={`Play ${name(card)}`} className={cls} onClick={onClick}>
      {label(card.value)}
    </button>
  ) : (
    <span role="img" aria-label={name(card)} className={cls}>
      {label(card.value)}
    </span>
  );
}

export default function Uno() {
  const [level, levelPicker] = useLevel('uno');
  const pickMove = useMemo(() => (s: UnoState) => chooseMove(s, level), [level]);
  const m = useMatch(unoEngine, { pickMove, delayMs: 900, persistId: 'uno' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const pvp = m.mode === 'pvp';
  const over = status.state !== 'playing';
  const viewer: PlayerId = pvp ? player : 1;
  const opponent: PlayerId = viewer === 1 ? 2 : 1;
  const [wildAt, setWildAt] = useState<number | null>(null);
  const canAct = !over && !isCpuTurn && viewer === player;
  const playable = new Set(canAct ? playableIndexes(state, viewer) : []);
  const mustDraw = canAct && state.drawn === null && playable.size === 0;
  const top = topCard(state);

  const clickCard = (i: number) => {
    if (!canAct || !playable.has(i)) return;
    if (state.drawn !== null && i !== state.drawn) return;
    if (isWild(state.hands[viewer][i])) setWildAt(i);
    else play({ kind: 'play', index: i });
  };

  return (
    <GameShell id="uno" title="Uno-style matching">
      <ModeToggle
        mode={m.mode}
        onChange={(x) => {
          setWildAt(null);
          m.changeMode(x);
        }}
      />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {state.last && `${state.last} `}
        {!over && (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins the round!`}
      </TurnBanner>

      <div className="text-sm">
        {names[opponent]}: {state.hands[opponent].length} card
        {state.hands[opponent].length === 1 ? ' — UNO!' : 's'} · Draw pile: {state.drawPile.length}
      </div>

      <div className="flex items-center gap-4">
        <Face card={top} active />
        <div className="text-sm">
          Active colour: <span className={`inline-block px-2 rounded ${BG[state.color]}`}>{state.color}</span>
        </div>
      </div>

      <BoardFrame>
        <div className="board-paper flex flex-col items-center gap-3 p-5">
          <PassGate player={viewer} name={names[viewer]} enabled={pvp && !over}>
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm font-medium">
                {possessive(names[viewer])} hand ({state.hands[viewer].length})
              </div>
              <div className="flex flex-wrap justify-center gap-1 max-w-lg">
                {state.hands[viewer].map((c, i) => (
                  <Face
                    // biome-ignore lint/suspicious/noArrayIndexKey: hand positions are the move indexes
                    key={i}
                    card={c}
                    active={playable.has(i)}
                    onClick={playable.has(i) ? () => clickCard(i) : undefined}
                  />
                ))}
              </div>
              {wildAt !== null && canAct && (
                <div className="flex gap-2 items-center">
                  Choose a colour:
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`px-3 py-1 rounded ${BG[color]}`}
                      onClick={() => {
                        play({ kind: 'play', index: wildAt, color });
                        setWildAt(null);
                      }}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded border bg-neutral-900 text-white disabled:opacity-40"
                  disabled={!mustDraw}
                  onClick={() => play({ kind: 'draw' })}
                >
                  Draw a card
                </button>
                {canAct && state.drawn !== null && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded border bg-white"
                    onClick={() => play({ kind: 'pass' })}
                  >
                    Keep it (end turn)
                  </button>
                )}
              </div>
              {canAct && !mustDraw && state.drawn === null && playable.size > 0 && (
                <p className="text-xs text-neutral-500">Play a highlighted card.</p>
              )}
            </div>
          </PassGate>
        </div>
      </BoardFrame>
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
