import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardFrame,
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
import { type C4State, connect4Engine } from './engine';
import { COLS, type Line, type Player } from './types';

const CPU: Player = 2;
const AI_DELAY_MS = 500;

function isWinningCell(line: Line | undefined, row: number, col: number): boolean {
  return !!line?.some(([r, c]) => r === row && c === col);
}

export default function ConnectFour() {
  const [level, levelPicker] = useLevel('connect-4');
  const pickMove = useMemo(() => (s: C4State) => chooseMove(s.board, CPU, level), [level]);
  const m = useMatch(connect4Engine, { pickMove, delayMs: AI_DELAY_MS, persistId: 'connect-4' });
  const { game, mode, isCpuTurn } = m;
  const { state, status, player, play, reset } = game;
  const names = m.names('Player 1', 'Player 2');

  // Only a disc that wasn't there on the previous render falls in (a resumed game doesn't replay every drop).
  const seen = useRef<Set<string> | null>(null);
  const filled = state.board
    .flatMap((row, r) => row.map((c, col) => (c === null ? null : `${r}-${col}`)))
    .filter((k) => k !== null);
  const fresh = seen.current ? new Set(filled.filter((k) => !seen.current?.has(k))) : new Set<string>();
  useEffect(() => {
    seen.current = new Set(filled);
  });

  // Hovering or focusing a column previews a disc in the slot it would land in.
  const [hover, setHover] = useState<number | null>(null);
  const landing =
    hover === null || isCpuTurn || status.state !== 'playing'
      ? -1
      : state.board.map((row) => row[hover]).lastIndexOf(null);

  const winLine = status.state === 'won' ? status.line : undefined;

  return (
    <GameShell id="connect-4" title="Connect Four">
      <ModeToggle mode={mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <BoardFrame frame={['#7a5733', '#4a3220']}>
        <div className="relative">
          <div className="c4-board wood" aria-hidden="true">
            {state.board.map((row, rowIdx) =>
              row.map((cell, col) => {
                const win = isWinningCell(winLine, rowIdx, col);
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid positions
                  <div key={`${rowIdx}-${col}`} className={`c4-slot${win ? ' win' : ''}`}>
                    {cell === null && hover === col && rowIdx === landing && (
                      <i className={`gem ghost ${player === 1 ? '' : 'sapphire'}`} />
                    )}
                    {cell !== null && (
                      <i
                        key={cell}
                        className={`gem ${cell === 1 ? '' : 'sapphire'}${fresh.has(`${rowIdx}-${col}`) ? ' fall' : ''}`}
                        style={
                          {
                            '--drop': ((rowIdx + 1.2) * 1.22).toFixed(2),
                            '--fall': `${(0.32 + rowIdx * 0.07).toFixed(2)}s`,
                          } as CSSProperties
                        }
                      />
                    )}
                  </div>
                );
              }),
            )}
          </div>
          <div className="c4-cols">
            {Array.from({ length: COLS }, (_, col) => {
              const disabled = isCpuTurn || !game.legalMoves.includes(col);
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
                  key={col}
                  type="button"
                  className="c4-col"
                  aria-label={`Drop in column ${col + 1}`}
                  disabled={disabled}
                  onClick={() => play(col)}
                  onMouseEnter={() => setHover(col)}
                  onMouseLeave={() => setHover((h) => (h === col ? null : h))}
                  onFocus={() => setHover(col)}
                  onBlur={() => setHover(null)}
                />
              );
            })}
          </div>
        </div>
      </BoardFrame>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={m.undo}
        onRedo={() => game.redo()}
        onRestart={reset}
      />
    </GameShell>
  );
}
