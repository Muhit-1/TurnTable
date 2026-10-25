import { useEffect, useMemo, useState } from 'react';
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
import { chooseMove } from './ai';
import { type Dictionary, dictionaryFromText } from './dictionary';
import { checkPlay, createScrabble, LETTER_VALUES, type Placement, PREMIUMS, SIZE } from './engine';

const PREMIUM_STYLE: Record<string, string> = {
  TW: 'bg-red-700 text-white',
  DW: 'bg-pink-300 text-neutral-900',
  TL: 'bg-blue-700 text-white',
  DL: 'bg-sky-200 text-neutral-900',
};

export default function Scrabble() {
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    // The word list is large (2.7 MB), so it is a plain text file fetched on demand (cached by the service worker)
    // rather than JavaScript the browser has to parse.
    import('./words.txt?url')
      .then((m) => fetch(m.default))
      .then((r) => r.text())
      .then((text) => live && setDict(dictionaryFromText(text)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  if (!dict) {
    return (
      <GameShell id="scrabble" title="Scrabble-style word building">
        <p className="text-sm text-neutral-600" role="status">
          {failed
            ? 'Could not load the word list. Check your connection and reload.'
            : 'Loading the dictionary…'}
        </p>
        <BoardFrame>
          <div className="board-paper max-w-full overflow-hidden" aria-hidden="true">
            <div
              className="grid gap-px bg-amber-900/40 p-px"
              style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
            >
              {PREMIUMS.map((prem, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed board squares
                  key={i}
                  className={`w-8 h-8 text-[10px] flex items-center justify-center ${prem ? PREMIUM_STYLE[prem] : 'bg-green-100'}`}
                >
                  {prem}
                </div>
              ))}
            </div>
          </div>
        </BoardFrame>
      </GameShell>
    );
  }
  return <Match dict={dict} />;
}

interface Pending extends Placement {
  rackIndex: number;
}

function Match({ dict }: { dict: Dictionary }) {
  const engine = useMemo(() => createScrabble(dict), [dict]);
  const [level, levelPicker] = useLevel('scrabble');
  const pickMove = useMemo(
    () => (s: Parameters<typeof chooseMove>[0]) => chooseMove(s, dict, level),
    [dict, level],
  );
  const m = useMatch(engine, { pickMove, delayMs: 700, persistId: 'scrabble' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const pvp = m.mode === 'pvp';
  const over = status.state !== 'playing';
  const viewer: PlayerId = pvp ? player : 1;
  const canAct = !over && !isCpuTurn && viewer === player;

  const [pending, setPending] = useState<Pending[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [exchanging, setExchanging] = useState<number[] | null>(null);
  const [blankFor, setBlankFor] = useState<number | null>(null);
  const [order, setOrder] = useState(0); // bumps to re-shuffle the displayed rack

  // clear any half-made play when the board or the player to move changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on turn change only
  useEffect(() => {
    setPending([]);
    setSelected(null);
    setExchanging(null);
    setBlankFor(null);
  }, [state.board, player]);

  const rack = state.racks[viewer];
  const usedIdx = new Set(pending.map((p) => p.rackIndex));
  const display = useMemo(() => {
    const idx = rack.map((_, i) => i);
    if (order > 0) idx.sort((a, b) => ((a * 7 + order * 13) % 11) - ((b * 7 + order * 13) % 11) || a - b);
    return idx;
  }, [rack, order]);

  const placements: Placement[] = pending.map(({ rackIndex: _r, ...p }) => p);
  const check = pending.length ? checkPlay(state.board, dict, placements) : null;

  const placeAt = (row: number, col: number) => {
    if (
      !canAct ||
      selected === null ||
      state.board[row * SIZE + col] ||
      pending.some((p) => p.row === row && p.col === col)
    )
      return;
    const tile = rack[selected];
    if (tile === '?') {
      setBlankFor(selected);
      setPending((p) => [...p, { row, col, letter: '', blank: true, rackIndex: selected }]);
    } else setPending((p) => [...p, { row, col, letter: tile, blank: false, rackIndex: selected }]);
    setSelected(null);
  };

  const submit = () => {
    if (!check?.ok) return;
    if (play({ kind: 'play', placements })) setPending([]);
  };

  const last = state.last;

  return (
    <GameShell id="scrabble" title="Scrabble-style word building">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <div className="text-sm font-medium">
        Points — {names[1]}: {state.scores[1]} · {names[2]}: {state.scores[2]} · Tiles in bag:{' '}
        {state.bag.length}
      </div>
      <TurnBanner>
        {last &&
          last.kind === 'play' &&
          `${names[last.player]} played ${last.words.join(', ')} for ${last.score}. `}
        {last && last.kind === 'pass' && `${names[last.player]} passed. `}
        {last && last.kind === 'exchange' && `${names[last.player]} exchanged tiles. `}
        {!over && (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' &&
          `Game over — ${names[status.winner]} wins ${state.scores[status.winner]}–${state.scores[status.winner === 1 ? 2 : 1]}!`}
        {status.state === 'draw' && "Game over — it's a draw!"}
      </TurnBanner>

      <BoardFrame>
        <div className="board-paper max-w-full overflow-auto">
          <div
            className="grid gap-px bg-amber-900/40 p-px"
            style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
          >
            {state.board.map((tile, i) => {
              const row = Math.floor(i / SIZE);
              const col = i % SIZE;
              const pend = pending.find((p) => p.row === row && p.col === col);
              const prem = PREMIUMS[i];
              const shown = tile ?? (pend ? { letter: pend.letter || '?', blank: pend.blank } : null);
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  aria-label={`Row ${row + 1}, column ${col + 1}${shown ? `, ${shown.letter}` : prem ? `, ${prem}` : ''}`}
                  disabled={!canAct || (!!tile && !pend)}
                  onClick={() => (pend ? setPending((p) => p.filter((x) => x !== pend)) : placeAt(row, col))}
                  className={`w-8 h-8 text-[10px] relative flex items-center justify-center ${
                    shown
                      ? pend
                        ? 'tile-wood piece-pop font-bold text-base ring-2 ring-yellow-500'
                        : 'tile-wood font-bold text-base'
                      : prem
                        ? PREMIUM_STYLE[prem]
                        : 'bg-green-100'
                  }`}
                >
                  {shown ? (
                    <>
                      <span className={shown.blank ? 'text-blue-700' : ''}>{shown.letter}</span>
                      {!shown.blank && shown.letter !== '?' && (
                        <sub className="absolute bottom-0 right-0.5 text-[8px]">
                          {LETTER_VALUES[shown.letter]}
                        </sub>
                      )}
                    </>
                  ) : i === 7 * SIZE + 7 ? (
                    '★'
                  ) : (
                    prem
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </BoardFrame>

      <PassGate player={viewer} name={names[viewer]} enabled={pvp && !over}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm font-medium">{possessive(names[viewer])} rack</div>
          <div className="flex gap-1">
            {display.map((i) => {
              const letter = rack[i];
              const used = usedIdx.has(i);
              const marked = exchanging?.includes(i);
              return (
                <button
                  key={`${i}-${letter}`}
                  type="button"
                  aria-label={`Tile ${letter === '?' ? 'blank' : letter}`}
                  disabled={!canAct || used}
                  onClick={() => {
                    if (exchanging)
                      setExchanging((x) => (x?.includes(i) ? x.filter((y) => y !== i) : [...(x ?? []), i]));
                    else setSelected(selected === i ? null : i);
                  }}
                  className={`tile-wood w-10 h-10 text-lg relative ${used ? 'opacity-20' : ''} ${selected === i ? 'ring-4 ring-yellow-400' : ''} ${marked ? 'ring-4 ring-red-400' : ''}`}
                >
                  {letter === '?' ? '' : letter}
                  <sub className="absolute bottom-0 right-1 text-[9px]">{LETTER_VALUES[letter]}</sub>
                </button>
              );
            })}
          </div>

          {blankFor !== null && canAct && (
            <fieldset className="flex flex-wrap justify-center gap-1 max-w-md">
              <legend className="sr-only">Choose a letter for the blank</legend>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => (
                <button
                  key={L}
                  type="button"
                  className="w-7 h-7 rounded border bg-white text-sm"
                  onClick={() => {
                    setPending((p) => p.map((x) => (x.rackIndex === blankFor ? { ...x, letter: L } : x)));
                    setBlankFor(null);
                  }}
                >
                  {L}
                </button>
              ))}
            </fieldset>
          )}

          {check && (
            <div className={`text-sm ${check.ok ? 'text-emerald-700' : 'text-rose-700'}`} role="status">
              {pending.some((p) => !p.letter)
                ? 'Choose a letter for the blank.'
                : check.ok
                  ? `${check.words.map((w) => `${w.word} (${w.score})`).join(', ')}${check.bingo ? ' + 50 bingo' : ''} = ${check.total} points`
                  : check.error}
            </div>
          )}

          {canAct && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded border bg-neutral-900 text-white disabled:opacity-40"
                disabled={!check?.ok || pending.some((p) => !p.letter)}
                onClick={submit}
              >
                Play word
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded border bg-white disabled:opacity-40"
                disabled={!pending.length}
                onClick={() => setPending([])}
              >
                Recall tiles
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded border bg-white"
                onClick={() => setOrder((o) => o + 1)}
              >
                Shuffle
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded border bg-white"
                onClick={() => play({ kind: 'pass' })}
              >
                Pass
              </button>
              {exchanging === null ? (
                <button
                  type="button"
                  className="px-3 py-2 rounded border bg-white disabled:opacity-40"
                  disabled={state.bag.length < 7 || pending.length > 0}
                  onClick={() => setExchanging([])}
                >
                  Exchange…
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="px-3 py-2 rounded border bg-amber-200 disabled:opacity-40"
                    disabled={exchanging.length === 0}
                    onClick={() => play({ kind: 'exchange', letters: exchanging.map((i) => rack[i]) })}
                  >
                    Swap {exchanging.length} tile{exchanging.length === 1 ? '' : 's'}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded border bg-white"
                    onClick={() => setExchanging(null)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
          {canAct && selected !== null && (
            <p className="text-xs text-neutral-500">Now click an empty square to place the tile.</p>
          )}
        </div>
      </PassGate>

      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
