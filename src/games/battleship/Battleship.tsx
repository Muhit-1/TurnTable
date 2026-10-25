import { type ReactNode, useMemo, useState } from 'react';
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
import { getBestMove } from './ai';
import {
  type BattleshipState,
  battleshipEngine,
  FLEET,
  isSunk,
  SIZE,
  shipAt,
  shipCells,
  sunkShips,
} from './engine';

const COLS = 'ABCDEFGHIJ';

function Grid({ title, cell }: { title: string; cell: (i: number) => ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-center mb-1">{title}</div>
      <BoardFrame frame={['#35506b', '#1f3347']}>
        <div
          className="grid gap-px rounded-lg bg-sky-900 p-px overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, i) => (
            <div key={`${COLS[i % SIZE]}${Math.floor(i / SIZE) + 1}`}>{cell(i)}</div>
          ))}
        </div>
      </BoardFrame>
    </div>
  );
}

const coord = (i: number) => `${COLS[i % SIZE]}${Math.floor(i / SIZE) + 1}`;

export default function Battleship() {
  const [level, levelPicker] = useLevel('battleship');
  const pickMove = useMemo(() => (s: BattleshipState) => getBestMove(s, level), [level]);
  const m = useMatch(battleshipEngine, { pickMove, delayMs: 700, persistId: 'battleship' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const pvp = m.mode === 'pvp';
  const over = status.state !== 'playing';
  const viewer: PlayerId = pvp ? player : 1;
  const opp: PlayerId = viewer === 1 ? 2 : 1;
  const [horizontal, setHorizontal] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const canAct = !over && !isCpuTurn && viewer === player;

  const placing = state.phase === 'place';
  const nextShip = placing ? FLEET[state.fleets[viewer].length] : null;
  const preview = new Set(
    canAct && placing && hover !== null && nextShip
      ? (shipCells(Math.floor(hover / SIZE), hover % SIZE, nextShip.size, horizontal) ?? [])
      : [],
  );

  const ownCell = (i: number) => {
    const ship = shipAt(state.fleets[viewer], i);
    const shot = state.shots[opp][i];
    const sunk = ship ? isSunk(ship, state.shots[opp]) : false;
    const base = sunk ? 'bg-red-900' : ship ? 'bg-slate-500' : 'bg-sky-200';
    const clickable = canAct && placing;
    return (
      <button
        type="button"
        aria-label={`Your grid ${coord(i)}${ship ? ', ship' : ''}${shot ? `, enemy ${shot}` : ''}`}
        disabled={!clickable}
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(null)}
        onClick={() => play({ kind: 'place', row: Math.floor(i / SIZE), col: i % SIZE, horizontal })}
        className={`w-8 h-8 flex items-center justify-center text-sm ${preview.has(i) ? 'bg-emerald-300' : base}`}
      >
        {shot && (
          <span key={shot} className="piece-pop">
            {shot === 'hit' ? '💥' : '•'}
          </span>
        )}
      </button>
    );
  };

  const enemyCell = (i: number) => {
    const shot = state.shots[viewer][i];
    const revealed = over ? shipAt(state.fleets[opp], i) : undefined;
    return (
      <button
        type="button"
        aria-label={`Enemy waters ${coord(i)}${shot ? `, ${shot}` : ''}`}
        disabled={!(canAct && !placing) || shot !== null}
        onClick={() => play({ kind: 'fire', cell: i })}
        className={`w-8 h-8 flex items-center justify-center text-sm ${shot === 'hit' ? 'bg-red-300' : shot === 'miss' ? 'bg-sky-300' : revealed ? 'bg-slate-400' : 'bg-sky-100 enabled:hover:bg-sky-300'}`}
      >
        {shot && (
          <span key={shot} className="piece-pop">
            {shot === 'hit' ? '💥' : '•'}
          </span>
        )}
      </button>
    );
  };

  const sunkOnEnemy = sunkShips(state.fleets[opp], state.shots[viewer]);
  const last = state.last;

  return (
    <GameShell id="battleship" title="Battleship">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {last &&
          `${names[last.player]} fired at ${coord(last.cell)}: ${last.result === 'sunk' ? `hit — sunk the ${last.ship}!` : last.result}. `}
        {!over &&
          (isCpuTurn
            ? 'Computer is thinking…'
            : placing
              ? `${possessive(names[player])} turn: place the ${nextShip?.name} (${nextShip?.size} cells)`
              : `${possessive(names[player])} turn: fire at a square`)}
        {status.state === 'won' && `${names[status.winner]} sinks the whole fleet and wins!`}
      </TurnBanner>

      <PassGate player={viewer} name={names[viewer]} enabled={pvp && !over}>
        <div className="flex flex-col items-center gap-3">
          {placing && canAct && (
            <div className="flex gap-2 items-center">
              <button
                type="button"
                className="px-3 py-1 rounded border bg-white"
                onClick={() => setHorizontal((h) => !h)}
              >
                Direction: {horizontal ? 'horizontal →' : 'vertical ↓'}
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded border bg-white"
                onClick={() => play({ kind: 'randomize' })}
              >
                Place the rest randomly
              </button>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <Grid title={`${possessive(names[viewer])} fleet`} cell={ownCell} />
            {!placing && <Grid title="Enemy waters" cell={enemyCell} />}
          </div>
          {!placing && (
            <div className="text-xs text-neutral-600">
              Enemy ships sunk: {sunkOnEnemy.length ? sunkOnEnemy.map((s) => s.name).join(', ') : 'none yet'}{' '}
              ({sunkOnEnemy.length}/{FLEET.length})
            </div>
          )}
        </div>
      </PassGate>

      {over && !pvp && (
        <div className="text-xs text-neutral-600">
          The enemy fleet is shown in grey on the right-hand grid.
        </div>
      )}
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
