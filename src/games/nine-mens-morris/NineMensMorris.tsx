import { useState } from 'react';
import {
  GameControls,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useMatch } from '../../shared/useMatch';
import { getBestMove } from './ai';
import { type MorrisState, morrisEngine } from './engine';

const pickMove = (s: MorrisState) => getBestMove(s, 3);
const RADII = [130, 87, 44];
const CENTER = 150;

function coords(i: number): [number, number] {
  const d = RADII[Math.floor(i / 8)];
  const dir: [number, number][] = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  const [x, y] = dir[i % 8];
  return [CENTER + x * d, CENTER + y * d];
}

export default function NineMensMorris() {
  const m = useMatch(morrisEngine, { pickMove, delayMs: 600 });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('White (Player 1)', 'Black (Player 2)');
  const [from, setFrom] = useState<number | null>(null);
  const locked = isCpuTurn || status.state !== 'playing';

  const placing = !state.mustRemove && state.hand[player] > 0;
  const sliding = !state.mustRemove && !placing;
  const targets = new Set(
    legalMoves.flatMap((mv) => (mv.kind === 'move' && mv.from === from ? [mv.to] : [])),
  );
  const movable = new Set(legalMoves.flatMap((mv) => (mv.kind === 'move' ? [mv.from] : [])));
  const removeTargets = new Set(legalMoves.flatMap((mv) => (mv.kind === 'remove' ? [mv.at] : [])));
  const placeTargets = new Set(legalMoves.flatMap((mv) => (mv.kind === 'place' ? [mv.to] : [])));

  const click = (i: number) => {
    if (locked) return;
    if (state.mustRemove) {
      if (removeTargets.has(i)) play({ kind: 'remove', at: i });
    } else if (placing) {
      if (placeTargets.has(i)) play({ kind: 'place', to: i });
    } else if (from !== null && targets.has(i)) {
      play({ kind: 'move', from, to: i });
      setFrom(null);
    } else setFrom(movable.has(i) ? i : null);
  };

  const flying = sliding && state.points.filter((p) => p === player).length === 3;
  const hint = state.mustRemove
    ? 'Mill! Remove one of your opponent’s pieces'
    : placing
      ? `place a piece (${state.hand[player]} left in hand)`
      : flying
        ? 'you may fly: select a piece, then any empty point'
        : 'select a piece, then an adjacent empty point';

  const lines = [
    ...[0, 1, 2].flatMap((r) =>
      [r * 8, r * 8 + 2, r * 8 + 4, r * 8 + 6].map((a, k, arr) => [a, arr[(k + 1) % 4]]),
    ),
    ...[1, 3, 5, 7].map((p) => [p, 16 + p]),
  ];

  return (
    <GameShell id="nine-mens-morris" title="Nine Men's Morris">
      <ModeToggle
        mode={m.mode}
        onChange={(x) => {
          setFrom(null);
          m.changeMode(x);
        }}
      />
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        In hand — {names[1]}: {state.hand[1]} · {names[2]}: {state.hand[2]}
      </div>
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn: ${hint}`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && 'Draw — 100 plies without a mill.'}
      </TurnBanner>

      <div className="relative w-[min(92vw,420px)] aspect-square bg-amber-100 rounded border">
        <svg
          viewBox="0 0 300 300"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {lines.map(([a, b]) => {
            const [x1, y1] = coords(a);
            const [x2, y2] = coords(b);
            return (
              <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78350f" strokeWidth="3" />
            );
          })}
          {state.points.map((piece, i) => {
            const [x, y] = coords(i);
            const selected = from === i;
            const hot =
              !locked &&
              (removeTargets.has(i) ||
                placeTargets.has(i) ||
                targets.has(i) ||
                (sliding && from === null && movable.has(i)));
            return (
              <circle
                key={`p${x}-${y}`}
                cx={x}
                cy={y}
                r={piece ? 13 : 7}
                fill={piece === 1 ? '#fafafa' : piece === 2 ? '#171717' : '#78350f'}
                stroke={
                  selected
                    ? '#facc15'
                    : removeTargets.has(i) && !locked
                      ? '#dc2626'
                      : hot
                        ? '#22c55e'
                        : '#44403c'
                }
                strokeWidth={selected || hot ? 4 : 2}
              />
            );
          })}
        </svg>
        {state.points.map((piece, i) => {
          const [x, y] = coords(i);
          return (
            <button
              key={`b${x}-${y}`}
              type="button"
              disabled={locked}
              aria-label={`Point ${i + 1}${piece ? `, ${piece === 1 ? 'white' : 'black'} piece` : ', empty'}`}
              onClick={() => click(i)}
              className="absolute w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2 bg-transparent enabled:cursor-pointer"
              style={{ left: `${(x / 300) * 100}%`, top: `${(y / 300) * 100}%` }}
            />
          );
        })}
      </div>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={() => {
          setFrom(null);
          m.undo();
        }}
        onRedo={() => game.redo()}
        onRestart={() => {
          setFrom(null);
          game.reset();
        }}
      />
    </GameShell>
  );
}
