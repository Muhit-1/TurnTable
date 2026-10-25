import { useMemo, useState } from 'react';
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
import { type CheckersState, checkersEngine, countPieces, isCapture, isDark, SIZE } from './engine';

export default function Checkers() {
  const [level, levelPicker] = useLevel('checkers');
  const pickMove = useMemo(() => (s: CheckersState) => chooseMove(s, level), [level]);
  const m = useMatch(checkersEngine, { pickMove, delayMs: 450, persistId: 'checkers' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('Red (Player 1)', 'White (Player 2)');
  const [path, setPath] = useState<number[]>([]);
  const counts = countPieces(state.cells);

  const candidates = legalMoves.filter((mv) => path.every((sq, i) => mv[i] === sq));
  const targets = new Set(
    path.length ? candidates.map((mv) => mv[path.length]).filter((x) => x !== undefined) : [],
  );
  const movable = new Set(path.length ? [] : legalMoves.map((mv) => mv[0]));
  const mustCapture = legalMoves.length > 0 && isCapture(legalMoves[0]);
  const locked = isCpuTurn || status.state !== 'playing';

  const click = (sq: number) => {
    if (locked) return;
    if (path.length) {
      if (targets.has(sq)) {
        const next = [...path, sq];
        if (candidates.some((mv) => mv.length === next.length)) {
          play(next);
          setPath([]);
        } else setPath(next);
        return;
      }
    }
    setPath(legalMoves.some((mv) => mv[0] === sq) ? [sq] : []);
  };

  return (
    <GameShell id="checkers" title="Checkers">
      <ModeToggle
        mode={m.mode}
        onChange={(x) => {
          setPath([]);
          m.changeMode(x);
        }}
      />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Pieces — {names[1]}: {counts[1].men + counts[1].kings} ({counts[1].kings} kings) · {names[2]}:{' '}
        {counts[2].men + counts[2].kings} ({counts[2].kings} kings)
      </div>
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is thinking…'
            : `${possessive(names[player])} turn${mustCapture ? ' — you must capture' : ''}`)}
        {status.state === 'won' && `${names[status.winner]} wins!`}
        {status.state === 'draw' && 'Draw — 40 moves without a capture or a man moving.'}
      </TurnBanner>

      <BoardFrame>
        <div className="grid grid-cols-8 overflow-hidden rounded-lg">
          {state.cells.map((cell, i) => {
            const r = Math.floor(i / SIZE);
            const c = i % SIZE;
            const dark = isDark(r, c);
            const selected = path.includes(i);
            const isTarget = targets.has(i);
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed board squares
                key={i}
                type="button"
                disabled={!dark || locked}
                aria-label={`Row ${r + 1}, column ${c + 1}${cell ? `, ${cell.owner === 1 ? 'red' : 'white'} ${cell.king ? 'king' : 'man'}` : ''}${isTarget ? ', move here' : ''}`}
                onClick={() => click(i)}
                className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center ${dark ? 'sq-dark' : 'sq-light'} ${
                  selected
                    ? 'ring-4 ring-inset ring-yellow-300'
                    : isTarget
                      ? 'ring-4 ring-inset ring-green-400'
                      : movable.has(i)
                        ? 'ring-2 ring-inset ring-yellow-200'
                        : ''
                }`}
              >
                {cell && (
                  <span
                    key={`${cell.owner}${cell.king}`}
                    className={`checker piece-pop flex items-center justify-center text-lg ${
                      cell.owner === 1 ? 'red text-yellow-200' : 'cream text-amber-700'
                    }`}
                  >
                    {cell.king ? '♛' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </BoardFrame>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={() => {
          setPath([]);
          m.undo();
        }}
        onRedo={() => game.redo()}
        onRestart={() => {
          setPath([]);
          game.reset();
        }}
      />
    </GameShell>
  );
}
