import { useCallback, useMemo, useState } from 'react';
import {
  BoardFrame,
  GameControls,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import type { PlayerId } from '../../shared/engine';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import {
  BISHOP,
  type ChessMove,
  type ChessState,
  chessEngine,
  colorOf,
  EMPTY,
  endReason,
  inCheck,
  KNIGHT,
  kingSquare,
  PAWN,
  QUEEN,
  ROOK,
  rowOf,
  squareName,
  typeOf,
} from './engine';
import { pickChessMove } from './workerClient';

// U+FE0E asks for the text (not emoji) form, so the colour styling applies to every piece including the pawn
const GLYPH = ['', '♟', '♞', '♝', '♜', '♛', '♚'].map((g) => (g ? `${g}\uFE0E` : g));
const PIECE_NAME = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
const PROMOTION_CHOICES = [QUEEN, ROOK, BISHOP, KNIGHT];
const START_COUNT = [0, 8, 2, 2, 2, 1, 1];
const VALUE = [0, 1, 3, 3, 5, 9, 0];

function captured(cells: number[], color: PlayerId): number[] {
  const have = [0, 0, 0, 0, 0, 0, 0];
  for (const p of cells) if (p !== EMPTY && colorOf(p) === color) have[typeOf(p)]++;
  const lost: number[] = [];
  for (let t = QUEEN; t >= PAWN; t--) for (let i = have[t]; i < START_COUNT[t]; i++) lost.push(t);
  return lost;
}

export default function Chess() {
  const [level, levelPicker] = useLevel('chess');
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [promoting, setPromoting] = useState<{ from: number; to: number } | null>(null);

  const pickMove = useCallback(
    async (s: ChessState) => (await pickChessMove(s, level)) as ChessMove,
    [level],
  );
  const m = useMatch(chessEngine, { pickMove, delayMs: 250, persistId: 'chess' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('White', 'Black');
  const reason = useMemo(() => endReason(state), [state]);
  const check = inCheck(state);
  const checkedKing = check ? kingSquare(state.cells, state.current) : -1;
  const locked = isCpuTurn || status.state !== 'playing';

  const targets = new Map<number, ChessMove[]>();
  if (selected !== null) {
    for (const mv of legalMoves)
      if (mv.from === selected) targets.set(mv.to, [...(targets.get(mv.to) ?? []), mv]);
  }
  const movable = new Set(legalMoves.map((mv) => mv.from));

  const click = (square: number) => {
    if (locked) return;
    if (selected !== null && targets.has(square)) {
      const options = targets.get(square) as ChessMove[];
      if (options[0].promotion) setPromoting({ from: selected, to: square });
      else {
        play(options[0]);
        setSelected(null);
      }
      return;
    }
    setSelected(movable.has(square) ? square : null);
  };

  const choosePromotion = (type: number) => {
    if (!promoting) return;
    play({ ...promoting, promotion: type });
    setPromoting(null);
    setSelected(null);
  };

  const reset = () => {
    setSelected(null);
    setPromoting(null);
    game.reset();
  };

  const order = Array.from({ length: 64 }, (_, i) => (flipped ? 63 - i : i));
  const lostByWhite = captured(state.cells, 2); // black pieces White has taken
  const lostByBlack = captured(state.cells, 1);
  const diff = lostByWhite.reduce((a, t) => a + VALUE[t], 0) - lostByBlack.reduce((a, t) => a + VALUE[t], 0);

  const lastMove = state.lastMove;
  const pairs: string[] = [];
  for (let i = 0; i < state.san.length; i += 2)
    pairs.push(`${i / 2 + 1}. ${state.san[i]}${state.san[i + 1] ? ` ${state.san[i + 1]}` : ''}`);

  return (
    <GameShell id="chess" title="Chess">
      <ModeToggle
        mode={m.mode}
        onChange={(x) => {
          setSelected(null);
          setPromoting(null);
          m.changeMode(x);
        }}
      />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is thinking…'
            : `${possessive(names[player])} turn${check ? ' — check!' : ''}`)}
        {reason === 'checkmate' && status.state === 'won' && `Checkmate — ${names[status.winner]} wins!`}
        {status.state === 'draw' && `Draw by ${reason}.`}
      </TurnBanner>

      <div className="text-sm h-5" title="Captured pieces">
        {[...lostByBlack].map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: display-only list
          <span key={i} className="text-neutral-900">
            {GLYPH[t]}
          </span>
        ))}
        {diff < 0 && <span className="ml-1 text-xs">+{-diff}</span>}
      </div>
      <BoardFrame>
        <div className="grid grid-cols-8 border-4 border-amber-900 select-none">
          {order.map((i) => {
            const piece = state.cells[i];
            const light = (rowOf(i) + (i & 7)) % 2 === 0;
            const isTarget = targets.has(i);
            const isLast = lastMove && (lastMove.from === i || lastMove.to === i);
            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                aria-label={`${squareName(i)}${piece ? `, ${colorOf(piece) === 1 ? 'white' : 'black'} ${PIECE_NAME[typeOf(piece)]}` : ''}${isTarget ? ', legal move' : ''}`}
                onClick={() => click(i)}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-3xl sm:text-4xl leading-none ${light ? 'bg-amber-100' : 'bg-amber-700'} ${
                  selected === i ? 'ring-4 ring-inset ring-yellow-400' : ''
                } ${isLast ? 'bg-yellow-200' : ''} ${checkedKing === i ? 'bg-red-400' : ''}`}
              >
                {piece !== EMPTY && (
                  <span
                    className={colorOf(piece) === 1 ? 'text-white' : 'text-neutral-900'}
                    style={
                      colorOf(piece) === 1
                        ? { textShadow: '0 0 2px #000, 0 0 2px #000, 0 0 3px #000' }
                        : undefined
                    }
                  >
                    {GLYPH[typeOf(piece)]}
                  </span>
                )}
                {isTarget && (
                  <span
                    className={`absolute rounded-full ${piece !== EMPTY ? 'inset-1 ring-4 ring-green-500/70' : 'w-3 h-3 bg-green-600/60'}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </BoardFrame>
      <div className="text-sm h-5" title="Captured pieces">
        {lostByWhite.map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: display-only list
          <span key={i}>{GLYPH[t]}</span>
        ))}
        {diff > 0 && <span className="ml-1 text-xs">+{diff}</span>}
      </div>

      {promoting && (
        <div className="flex items-center gap-2" role="status">
          Promote to:
          {PROMOTION_CHOICES.map((t) => (
            <button
              key={t}
              type="button"
              aria-label={`Promote to ${PIECE_NAME[t]}`}
              className="w-12 h-12 text-3xl rounded border bg-white"
              onClick={() => choosePromotion(t)}
            >
              {GLYPH[t]}
            </button>
          ))}
        </div>
      )}

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={() => {
          setSelected(null);
          m.undo();
        }}
        onRedo={() => game.redo()}
        onRestart={reset}
      />
      <button
        type="button"
        className="px-3 py-1 rounded border bg-white text-sm"
        onClick={() => setFlipped((f) => !f)}
      >
        Flip board
      </button>

      <details className="text-sm max-w-md w-full" open>
        <summary className="cursor-pointer font-medium">Moves ({state.san.length})</summary>
        <ol className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
          {pairs.length === 0 && <li className="text-neutral-400">No moves yet.</li>}
          {pairs.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </details>
    </GameShell>
  );
}
