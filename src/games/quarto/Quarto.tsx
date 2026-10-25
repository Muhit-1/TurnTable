import { useMemo } from 'react';
import {
  BoardFrame,
  GameControls,
  GameShell,
  ModeToggle,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { availablePieces, PIECES, type QuartoState, quartoEngine, SIZE, traitOf } from './engine';

const describe = (p: number) =>
  `${traitOf(p, 0) ? 'tall' : 'short'}, ${traitOf(p, 1) ? 'dark' : 'light'}, ${traitOf(p, 2) ? 'square' : 'round'}, ${traitOf(p, 3) ? 'hollow' : 'solid'}`;

function PieceView({ piece, size = 40 }: { piece: number; size?: number }) {
  const tall = traitOf(piece, 0);
  const dark = traitOf(piece, 1);
  const square = traitOf(piece, 2);
  const hollow = traitOf(piece, 3);
  const w = size * 0.75;
  const h = tall ? size : size * 0.6;
  return (
    <span
      role="img"
      aria-label={describe(piece)}
      className={`inline-flex items-center justify-center border-2 ${square ? 'rounded-sm' : 'rounded-full'} ${dark ? 'bg-amber-900 border-amber-950' : 'bg-amber-200 border-amber-500'}`}
      style={{ width: w, height: h }}
    >
      {hollow ? (
        <span className={`block w-1/3 h-1/3 rounded-full ${dark ? 'bg-amber-200' : 'bg-amber-900'}`} />
      ) : null}
    </span>
  );
}

export default function Quarto() {
  const [level, levelPicker] = useLevel('quarto');
  const pickMove = useMemo(() => (s: QuartoState) => chooseMove(s, level), [level]);
  const m = useMatch(quartoEngine, { pickMove, delayMs: 550, persistId: 'quarto' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const win = status.state === 'won' ? status.line : undefined;
  const giving = state.handed === null;
  const locked = isCpuTurn || status.state !== 'playing';
  const pool = availablePieces(state);

  return (
    <GameShell id="quarto" title="Quarto">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is thinking…'
            : giving
              ? `${names[player]}: choose a piece to hand to your opponent`
              : `${names[player]}: place the piece you were given`)}
        {status.state === 'won' && `${names[status.winner]} completes a line and wins!`}
        {status.state === 'draw' && "The board is full — it's a draw!"}
      </TurnBanner>

      <div className="flex items-center gap-2 h-14">
        <span className="text-sm">Piece in hand:</span>
        {state.handed !== null ? (
          <PieceView piece={state.handed} size={52} />
        ) : (
          <span className="text-neutral-400">none</span>
        )}
      </div>

      <BoardFrame>
        <div className="grid grid-cols-4 gap-1 bg-amber-700 p-2 rounded">
          {state.board.map((piece, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed board squares
              key={i}
              type="button"
              aria-label={`Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}${piece !== null ? `, ${describe(piece)}` : ''}`}
              disabled={locked || giving || piece !== null}
              onClick={() => play({ kind: 'place', square: i })}
              className={`w-16 h-16 rounded bg-amber-100 flex items-center justify-center enabled:hover:bg-amber-200 ${win?.includes(i) ? 'ring-4 ring-red-500' : ''}`}
            >
              {piece !== null && <PieceView piece={piece} size={52} />}
            </button>
          ))}
        </div>
      </BoardFrame>

      <div>
        <div className="text-sm text-neutral-600 mb-1">
          Available pieces ({pool.length}/{PIECES}):
        </div>
        <div className="flex flex-wrap gap-2 max-w-sm">
          {pool.map((p) => (
            <button
              key={p}
              type="button"
              aria-label={`Give ${describe(p)}`}
              disabled={locked || !giving}
              onClick={() => play({ kind: 'give', piece: p })}
              className="w-12 h-14 rounded border bg-white flex items-center justify-center enabled:hover:bg-neutral-100"
            >
              <PieceView piece={p} size={40} />
            </button>
          ))}
        </div>
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
