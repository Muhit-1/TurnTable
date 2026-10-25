import { useMemo } from 'react';
import {
  GameControls,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { type DotsState, dotsEngine, hLine, vLine } from './engine';

const CELL = 64; // px between dots
const PAD = 16;
const DOT = 10;

export default function DotsAndBoxes() {
  const [level, levelPicker] = useLevel('dots-and-boxes');
  const pickMove = useMemo(() => (s: DotsState) => chooseMove(s, level), [level]);
  const m = useMatch(dotsEngine, { pickMove, delayMs: 450, persistId: 'dots-and-boxes' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const { rows, cols } = state;
  const color = (p: 1 | 2 | null) =>
    p === 1 ? 'bg-rose-500' : p === 2 ? 'bg-sky-500' : 'bg-neutral-200 hover:bg-neutral-400';
  const locked = isCpuTurn || status.state !== 'playing';

  const width = cols * CELL + PAD * 2 + DOT;
  const height = rows * CELL + PAD * 2 + DOT;

  return (
    <GameShell id="dots-and-boxes" title="Dots and Boxes">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Boxes —{' '}
        <span className="text-rose-600">
          {names[1]}: {state.score[1]}
        </span>{' '}
        ·{' '}
        <span className="text-sky-600">
          {names[2]}: {state.score[2]}
        </span>
      </div>
      <TurnBanner>
        {state.extraTurn && status.state === 'playing' && `${names[player]} completed a box: go again. `}
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' &&
          `${names[status.winner]} wins ${state.score[status.winner]}–${state.score[status.winner === 1 ? 2 : 1]}!`}
        {status.state === 'draw' && `It's a draw, ${state.score[1]}–${state.score[2]}!`}
      </TurnBanner>

      <div className="relative bg-white rounded border" style={{ width, height }}>
        {/* boxes */}
        {state.boxes.map((owner, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed positions
            key={i}
            className={`absolute flex items-center justify-center text-lg font-bold ${owner === 1 ? 'bg-rose-100 text-rose-600' : owner === 2 ? 'bg-sky-100 text-sky-600' : ''}`}
            style={{
              left: PAD + DOT / 2 + (i % cols) * CELL + 2,
              top: PAD + DOT / 2 + Math.floor(i / cols) * CELL + 2,
              width: CELL - 4,
              height: CELL - 4,
            }}
          >
            {owner === 1 ? 'P1' : owner === 2 ? 'P2' : ''}
          </div>
        ))}
        {/* horizontal lines */}
        {Array.from({ length: rows + 1 }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const l = hLine(state, r, c);
            return (
              <button
                key={`h${l}`}
                type="button"
                aria-label={`Horizontal line, row ${r + 1}, column ${c + 1}${state.lines[l] ? ', drawn' : ''}`}
                disabled={locked || state.lines[l] !== null}
                onClick={() => play(l)}
                className={`absolute rounded ${color(state.lines[l])}`}
                style={{ left: PAD + DOT + c * CELL, top: PAD + r * CELL, width: CELL - DOT, height: DOT }}
              />
            );
          }),
        )}
        {/* vertical lines */}
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols + 1 }, (_, c) => {
            const l = vLine(state, r, c);
            return (
              <button
                key={`v${l}`}
                type="button"
                aria-label={`Vertical line, row ${r + 1}, column ${c + 1}${state.lines[l] ? ', drawn' : ''}`}
                disabled={locked || state.lines[l] !== null}
                onClick={() => play(l)}
                className={`absolute rounded ${color(state.lines[l])}`}
                style={{ left: PAD + c * CELL, top: PAD + DOT + r * CELL, width: DOT, height: CELL - DOT }}
              />
            );
          }),
        )}
        {/* dots */}
        {Array.from({ length: (rows + 1) * (cols + 1) }, (_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed positions
            key={i}
            className="absolute rounded-full bg-neutral-800 pointer-events-none"
            style={{
              left: PAD + (i % (cols + 1)) * CELL,
              top: PAD + Math.floor(i / (cols + 1)) * CELL,
              width: DOT,
              height: DOT,
            }}
          />
        ))}
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
