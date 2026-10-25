import { useCallback, useMemo } from 'react';
import {
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
import { areaScore, createGo, type GoMove, type GoState, margin } from './engine';
import { pickGoMove } from './workerClient';

const SIZES = [9, 13, 19] as const;
const STAR: Record<number, number[]> = { 9: [2, 4, 6], 13: [3, 6, 9], 19: [3, 9, 15] };

export default function Go() {
  const [size, setSize] = usePersistentState<number>('go:size', 9);
  const engine = useMemo(() => createGo(size), [size]);
  // Remount when the board size changes so history and scores start fresh.
  return <Match key={size} engine={engine} size={size} onSize={setSize} />;
}

function Match({
  engine,
  size,
  onSize,
}: {
  engine: ReturnType<typeof createGo>;
  size: number;
  onSize: (n: number) => void;
}) {
  const [level, levelPicker] = useLevel('go');
  const pickMove = useCallback((s: GoState): Promise<GoMove> => pickGoMove(s, level), [level]);
  const m = useMatch(engine, { pickMove, delayMs: 300, persistId: `go:${size}` });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Black', 'White');
  const locked = isCpuTurn || status.state !== 'playing';
  const over = status.state !== 'playing';

  const area = useMemo(() => areaScore(state.cells, size), [state.cells, size]);
  const lead = margin(state);
  const territory = useMemo(
    () =>
      new Map<number, 1 | 2>([
        ...area.blackTerritory.map((p) => [p, 1] as const),
        ...area.whiteTerritory.map((p) => [p, 2] as const),
      ]),
    [area],
  );

  const V = (size + 1) * 10; // viewBox units; each point is 10 apart with a one-point margin
  const pos = (i: number) => (i + 1) * 10;
  const stars = STAR[size] ?? [];
  const lastPassed = state.last === -2;

  return (
    <GameShell id="go" title="Go">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        Board
        {SIZES.map((n) => (
          <button
            key={n}
            type="button"
            className={`px-3 py-1 rounded border ${n === size ? 'bg-neutral-900 text-white' : 'bg-white'}`}
            onClick={() => onSize(n)}
          >
            {n}×{n}
          </button>
        ))}
      </div>
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Captured — {names[1]}: {state.captures[1]} · {names[2]}: {state.captures[2]}
      </div>
      <TurnBanner>
        {lastPassed && !over && `${names[player === 1 ? 2 : 1]} passed. `}
        {!over && (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `Game over — ${names[status.winner]} wins by ${Math.abs(lead)} points!`}
        {status.state === 'draw' && 'Game over — a draw.'}
      </TurnBanner>

      <div className="relative w-[min(94vw,560px)] aspect-square bg-amber-300 rounded border-2 border-amber-900">
        <svg
          viewBox={`0 0 ${V} ${V}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: size }, (_, i) => (
            <g key={`line-${pos(i)}`}>
              <line
                x1={pos(0)}
                y1={pos(i)}
                x2={pos(size - 1)}
                y2={pos(i)}
                stroke="#44210a"
                strokeWidth="0.35"
              />
              <line
                x1={pos(i)}
                y1={pos(0)}
                x2={pos(i)}
                y2={pos(size - 1)}
                stroke="#44210a"
                strokeWidth="0.35"
              />
            </g>
          ))}
          {stars.flatMap((r) =>
            stars.map((c) => (
              <circle key={`star-${r}-${c}`} cx={pos(c)} cy={pos(r)} r="0.9" fill="#44210a" />
            )),
          )}
          {over &&
            [...territory].map(([p, owner]) => (
              <rect
                key={`t-${p}`}
                x={pos(p % size) - 1.6}
                y={pos(Math.floor(p / size)) - 1.6}
                width="3.2"
                height="3.2"
                fill={owner === 1 ? '#171717' : '#fafafa'}
                stroke="#44210a"
                strokeWidth="0.2"
              />
            ))}
          {state.cells.map((stone, p) => {
            const row = Math.floor(p / size);
            const col = p % size;
            return stone ? (
              <circle
                key={`stone-${row}-${col}`}
                cx={pos(col)}
                cy={pos(row)}
                r={size === 19 ? 4.4 : 4.6}
                fill={stone === 1 ? '#171717' : '#fafafa'}
                stroke="#262626"
                strokeWidth="0.3"
              />
            ) : null;
          })}
          {state.last >= 0 && (
            <circle
              cx={pos(state.last % size)}
              cy={pos(Math.floor(state.last / size))}
              r="2"
              fill="none"
              stroke={state.cells[state.last] === 1 ? '#fafafa' : '#171717'}
              strokeWidth="0.6"
            />
          )}
        </svg>
        {state.cells.map((stone, p) => {
          const r = Math.floor(p / size);
          const c = p % size;
          const name = `Row ${r + 1}, column ${c + 1}`;
          return (
            <button
              key={`pt-${r}-${c}`}
              type="button"
              disabled={locked || stone !== 0}
              aria-label={`${name}${stone ? `, ${stone === 1 ? 'black' : 'white'} stone` : ''}`}
              onClick={() => play({ kind: 'place', point: p })}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent enabled:hover:bg-black/15 enabled:cursor-pointer"
              style={{
                left: `${(pos(c) / V) * 100}%`,
                top: `${(pos(r) / V) * 100}%`,
                width: `${(10 / V) * 100}%`,
                height: `${(10 / V) * 100}%`,
              }}
            />
          );
        })}
      </div>

      <div className="text-xs text-neutral-600 text-center max-w-sm">
        Area now — {names[1]}: {area.black} · {names[2]}: {area.white} + {state.komi} komi. Dead stones must
        be captured before both players pass.
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded border bg-white disabled:opacity-40"
          disabled={locked}
          onClick={() => play({ kind: 'pass' })}
        >
          Pass
        </button>
      </div>
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
