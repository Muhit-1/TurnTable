import { useMemo, useState } from 'react';
import {
  BoardFrame,
  Die,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import type { PlayerId } from '../../shared/engine';
import { IconDice } from '../../shared/icons';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { BAR, type BgState, backgammonEngine, CHECKERS, countAt, OFF, pipCount } from './engine';

const TOP = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const BOTTOM = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const SHOWN = 5; // checkers drawn before collapsing into a count

export default function Backgammon() {
  const [level, levelPicker] = useLevel('backgammon');
  const pickMove = useMemo(() => (s: BgState) => chooseMove(s, level), [level]);
  const m = useMatch(backgammonEngine, { pickMove, delayMs: 650, persistId: 'backgammon' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('White (Player 1)', 'Black (Player 2)');
  const [selected, setSelected] = useState<number | typeof BAR | null>(null);
  const humanTurn = status.state === 'playing' && !isCpuTurn;

  const moves = legalMoves.filter((x): x is Extract<typeof x, { kind: 'move' }> => x.kind === 'move');
  const needsRoll = legalMoves.length === 1 && legalMoves[0].kind === 'roll';
  const forcedBar = moves.length > 0 && moves.every((x) => x.from === BAR);
  const from = forcedBar ? BAR : selected;
  const destinations = new Set(moves.filter((x) => x.from === from).map((x) => x.to));
  const sources = new Set(moves.map((x) => x.from));

  const click = (target: number | typeof OFF | typeof BAR) => {
    if (!humanTurn) return;
    if (from !== null && target !== BAR && destinations.has(target)) {
      const cand = moves.filter((x) => x.from === from && x.to === target).sort((a, b) => a.die - b.die)[0];
      play(cand);
      setSelected(null);
      return;
    }
    setSelected(target !== OFF && sources.has(target) ? target : null);
  };

  const renderPoint = (i: number, top: boolean) => {
    const n = state.points[i];
    const owner: PlayerId | null = n > 0 ? 1 : n < 0 ? 2 : null;
    const count = Math.abs(n);
    const isDest = from !== null && destinations.has(i);
    const isSrc = humanTurn && sources.has(i);
    const stack = Array.from({ length: Math.min(count, SHOWN) }, (_, k) => k);
    return (
      <button
        key={i}
        type="button"
        disabled={!humanTurn || (!isDest && !isSrc)}
        aria-label={`Point ${i + 1}, ${count ? `${count} ${owner === 1 ? 'white' : 'black'}` : 'empty'}${isDest ? ', move here' : ''}`}
        onClick={() => click(i)}
        className={`relative w-11 h-36 flex ${top ? 'flex-col' : 'flex-col-reverse'} items-center ${i % 2 ? 'bg-amber-200' : 'bg-orange-300'} ${isDest ? 'ring-4 ring-green-400 ring-inset' : from === i ? 'ring-4 ring-yellow-300 ring-inset' : ''}`}
      >
        {stack.map((k) => (
          <span
            key={k}
            className={`w-9 h-7 rounded-full border-2 text-[10px] flex items-center justify-center ${owner === 1 ? 'bg-white border-neutral-500' : 'bg-neutral-900 border-neutral-950 text-white'}`}
          >
            {k === SHOWN - 1 && count > SHOWN ? count : ''}
          </span>
        ))}
      </button>
    );
  };

  const half = (idx: number[], top: boolean) => (
    <div className="flex">{idx.map((i) => renderPoint(i, top))}</div>
  );

  const barCell = (
    <button
      type="button"
      disabled={!humanTurn || !sources.has(BAR)}
      onClick={() => click(BAR)}
      aria-label={`Bar: ${state.bar[1]} white, ${state.bar[2]} black`}
      className={`w-12 h-[18rem] bg-amber-900 text-white text-xs flex flex-col items-center justify-center gap-2 ${from === BAR ? 'ring-4 ring-yellow-300 ring-inset' : ''}`}
    >
      <span>White {state.bar[1]}</span>
      <span>BAR</span>
      <span>Black {state.bar[2]}</span>
    </button>
  );

  const offTray = (
    <button
      type="button"
      disabled={!humanTurn || !destinations.has(OFF)}
      onClick={() => click(OFF)}
      aria-label="Bear off"
      className={`w-14 h-[18rem] bg-amber-800 text-white text-xs flex flex-col items-center justify-between py-2 ${destinations.has(OFF) ? 'ring-4 ring-green-400 ring-inset' : ''}`}
    >
      <span>Black off: {state.off[2]}</span>
      <span>OFF</span>
      <span>White off: {state.off[1]}</span>
    </button>
  );

  return (
    <GameShell id="backgammon" title="Backgammon">
      <ModeToggle
        mode={m.mode}
        onChange={(x) => {
          setSelected(null);
          m.changeMode(x);
        }}
      />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {state.last &&
          state.last.note === 'no legal move' &&
          `${names[state.last.player]} rolled ${state.last.dice.join(' & ')} but has no legal move. `}
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is playing…'
            : needsRoll
              ? `${possessive(names[player])} turn: roll the dice`
              : `${possessive(names[player])} turn: select a checker, then where to move it`)}
        {status.state === 'won' && `${names[status.winner]} bears off all ${CHECKERS} checkers and wins!`}
      </TurnBanner>

      <BoardFrame>
        <div className="flex border-4 border-amber-900 bg-amber-100">
          <div className="flex flex-col justify-between">
            <div className="flex">{half(TOP.slice(0, 6), true)}</div>
            <div className="flex">{half(BOTTOM.slice(0, 6), false)}</div>
          </div>
          {barCell}
          <div className="flex flex-col justify-between">
            <div className="flex">{half(TOP.slice(6), true)}</div>
            <div className="flex">{half(BOTTOM.slice(6), false)}</div>
          </div>
          {offTray}
        </div>
      </BoardFrame>

      <div className="flex items-center gap-3">
        <div className="flex gap-2 text-3xl" aria-live="polite">
          {state.dice.length ? (
            state.dice.map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: dice are positional and may repeat (doubles)
              <Die key={`${i}-${d}-${JSON.stringify(state.last)}`} value={d} size="2.4rem" />
            ))
          ) : (
            <span className="text-neutral-400 text-base">no dice</span>
          )}
        </div>
        <button
          type="button"
          className="px-5 py-2 rounded border bg-neutral-900 text-white disabled:opacity-40"
          disabled={!humanTurn || !needsRoll}
          onClick={() => play({ kind: 'roll' })}
        >
          <IconDice /> Roll
        </button>
      </div>
      <div className="text-xs text-neutral-600">
        Pip count — {names[1]}: {pipCount(state, 1)} · {names[2]}: {pipCount(state, 2)} · White checkers on
        the board: {state.points.reduce((a, _, i) => a + countAt(state.points, 1, i), 0)}
      </div>
      <button
        type="button"
        className="px-4 py-2 rounded border bg-white"
        onClick={() => {
          setSelected(null);
          game.reset();
        }}
      >
        New game
      </button>
    </GameShell>
  );
}
