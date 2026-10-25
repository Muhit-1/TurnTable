import { useMemo } from 'react';
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
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { HOME, LAST_TRACK, type LudoState, ludoEngine, movableTokens, trackSquare } from './engine';

const GRID = 14;

/** Perimeter of a 14x14 grid, clockwise from the top-left corner: 4 sides x 13 squares = 52 track squares. */
function gridCell(k: number): [number, number] {
  if (k < 13) return [0, k];
  if (k < 26) return [k - 13, 13];
  if (k < 39) return [13, 13 - (k - 26)];
  return [13 - (k - 39), 0];
}

const COLOR: Record<PlayerId, string> = { 1: 'bg-rose-500 border-rose-800', 2: 'bg-sky-500 border-sky-800' };

function describe(p: number): string {
  if (p === -1) return 'in yard';
  if (p === HOME) return 'home';
  if (p > LAST_TRACK) return `home column ${p - LAST_TRACK}/5`;
  return `${p} steps`;
}

export default function Ludo() {
  const [level, levelPicker] = useLevel('ludo');
  const pickMove = useMemo(() => (s: LudoState) => chooseMove(s, level), [level]);
  const m = useMatch(ludoEngine, { pickMove, delayMs: 650, persistId: 'ludo' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Red (Player 1)', 'Blue (Player 2)');
  const humanTurn = status.state === 'playing' && !isCpuTurn;
  const movable = state.dice === null ? [] : movableTokens(state, player, state.dice);

  const onTrack = new Map<number, { p: PlayerId; t: number }[]>();
  for (const p of [1, 2] as const) {
    state.tokens[p].forEach((prog, t) => {
      const sq = trackSquare(p, prog);
      if (sq !== null) onTrack.set(sq, [...(onTrack.get(sq) ?? []), { p, t }]);
    });
  }

  return (
    <GameShell id="ludo" title="Ludo">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {state.last && `${names[state.last.player]} rolled ${state.last.roll}: ${state.last.note}. `}
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is playing…'
            : state.dice === null
              ? `${possessive(names[player])} turn: roll`
              : `${possessive(names[player])} turn: pick a token to move`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
      </TurnBanner>

      <BoardFrame>
        <div
          className="grid gap-0.5 bg-amber-100 p-1 rounded border"
          style={{ gridTemplateColumns: `repeat(${GRID}, 1.9rem)` }}
        >
          {Array.from({ length: 52 }, (_, k) => {
            const [r, c] = gridCell(k);
            const here = onTrack.get(k) ?? [];
            return (
              <div
                key={`sq-${r}-${c}`}
                className={`h-[1.9rem] border text-[9px] relative flex items-center justify-center ${k === 0 ? 'bg-rose-200' : k === 26 ? 'bg-sky-200' : 'bg-white'}`}
                style={{ gridRow: r + 1, gridColumn: c + 1 }}
                title={`Square ${k}`}
              >
                {here.length === 0 && (
                  <span className="text-neutral-300">{k === 0 ? 'R' : k === 26 ? 'B' : ''}</span>
                )}
                {here.map(({ p, t }) => (
                  <span
                    key={`${p}${t}`}
                    className={`w-5 h-5 -ml-1 first:ml-0 rounded-full border-2 text-[10px] text-white font-bold flex items-center justify-center ${COLOR[p]}`}
                  >
                    {t + 1}
                  </span>
                ))}
              </div>
            );
          })}
          <div
            className="flex flex-col items-center justify-center gap-2 text-center"
            style={{ gridRow: '2 / 14', gridColumn: '2 / 14' }}
          >
            <div className="text-5xl" aria-live="polite">
              {state.dice ?? state.last?.roll ?? '🎲'}
            </div>
            <button
              type="button"
              className="px-5 py-2 rounded border bg-neutral-900 text-white disabled:opacity-40"
              disabled={!humanTurn || state.dice !== null}
              onClick={() => play({ kind: 'roll' })}
            >
              Roll
            </button>
          </div>
        </div>
      </BoardFrame>

      <div className="flex flex-col gap-3">
        {([1, 2] as const).map((p) => (
          <div key={p} className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium w-28 ${p === 1 ? 'text-rose-700' : 'text-sky-700'}`}>
              {names[p]}
            </span>
            {state.tokens[p].map((prog, t) => {
              const canMove = humanTurn && p === player && movable.includes(t);
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: four fixed tokens
                  key={t}
                  type="button"
                  disabled={!canMove}
                  aria-label={`${names[p]} token ${t + 1}, ${describe(prog)}${canMove ? ', can move' : ''}`}
                  onClick={() => play({ kind: 'move', token: t })}
                  className={`px-2 py-1 rounded border text-xs ${COLOR[p]} text-white ${canMove ? 'ring-4 ring-yellow-300' : 'opacity-70'}`}
                >
                  #{t + 1} {describe(prog)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
