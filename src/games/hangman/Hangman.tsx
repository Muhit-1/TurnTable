import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardFrame,
  GameShell,
  type Mode,
  ModeToggle,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { nextInt, randomSeed } from '../../shared/rng';
import { createHangman, masked, normaliseSecret } from './engine';
import { WORDS } from './words';

type Person = 1 | 2;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function Gallows({ wrong }: { wrong: number }) {
  const part = 'stroke-amber-950 fill-none piece-pop';
  return (
    <svg
      viewBox="0 0 120 140"
      className="board-paper w-40 h-48 p-2"
      role="img"
      aria-label={`${wrong} of 6 wrong guesses`}
    >
      <path d="M10 130 H90 M30 130 V10 H80 V25" className={`${part} stroke-[4]`} />
      {wrong > 0 && <circle cx="80" cy="37" r="12" className={`${part} stroke-[4]`} />}
      {wrong > 1 && <path d="M80 49 V90" className={`${part} stroke-[4]`} />}
      {wrong > 2 && <path d="M80 58 L64 78" className={`${part} stroke-[4]`} />}
      {wrong > 3 && <path d="M80 58 L96 78" className={`${part} stroke-[4]`} />}
      {wrong > 4 && <path d="M80 90 L66 115" className={`${part} stroke-[4]`} />}
      {wrong > 5 && <path d="M80 90 L94 115" className={`${part} stroke-[4]`} />}
    </svg>
  );
}

export default function Hangman() {
  const [mode, setMode] = useState<Mode>('pvp');
  const [round, setRound] = useState(0);
  const [secret, setSecret] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<Person, number>>({ 1: 0, 2: 0 });

  // vs computer: the human always guesses. pvp: the guesser alternates each round.
  const guesser: Person = mode === 'vs-cpu' ? 1 : round % 2 === 0 ? 1 : 2;
  const setter: Person = guesser === 1 ? 2 : 1;
  const names: Record<Person, string> =
    mode === 'vs-cpu' ? { 1: 'You', 2: 'Computer' } : { 1: 'Player 1', 2: 'Player 2' };

  const changeMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setRound(0);
    setSecret(null);
    setScores({ 1: 0, 2: 0 });
  };

  return (
    <GameShell id="hangman" title="Hangman">
      <ModeToggle mode={mode} onChange={changeMode} />
      <Scoreboard names={names} scores={scores} />
      <BoardFrame>
        <div className="board-paper flex flex-col items-center gap-3 p-5">
          {secret === null ? (
            <Setup mode={mode} setterName={names[setter]} guesserName={names[guesser]} onSecret={setSecret} />
          ) : (
            <Round
              key={`${round}-${secret}`}
              secret={secret}
              guesserName={names[guesser]}
              setterName={names[setter]}
              onFinished={(guesserWon) =>
                setScores((s) => ({
                  ...s,
                  [guesserWon ? guesser : setter]: s[guesserWon ? guesser : setter] + 1,
                }))
              }
              onNext={() => {
                setRound((r) => r + 1);
                setSecret(null);
              }}
            />
          )}
        </div>
      </BoardFrame>
    </GameShell>
  );
}

function Setup({
  mode,
  setterName,
  guesserName,
  onSecret,
}: {
  mode: Mode;
  setterName: string;
  guesserName: string;
  onSecret: (s: string) => void;
}) {
  const [text, setText] = useState('');
  const valid = normaliseSecret(text) !== null;

  if (mode === 'vs-cpu') {
    return (
      <button
        type="button"
        className="px-6 py-3 rounded border bg-neutral-900 text-white"
        onClick={() => onSecret(WORDS[nextInt(randomSeed(), WORDS.length)[0]])}
      >
        Start — computer picks a word
      </button>
    );
  }
  return (
    <form
      className="flex flex-col items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSecret(text);
      }}
    >
      <p className="text-sm text-neutral-700">
        {guesserName}, look away. {setterName} types a secret word or phrase:
      </p>
      <input
        type="password"
        autoComplete="off"
        aria-label="Secret word or phrase"
        className="border rounded px-3 py-2 w-64"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text !== '' && !valid && (
        <p className="text-xs text-red-600">Use letters, spaces, hyphens and apostrophes only.</p>
      )}
      <button
        type="submit"
        disabled={!valid}
        className="px-6 py-2 rounded border bg-neutral-900 text-white disabled:opacity-40"
      >
        Start round
      </button>
    </form>
  );
}

function Round({
  secret,
  guesserName,
  setterName,
  onFinished,
  onNext,
}: {
  secret: string;
  guesserName: string;
  setterName: string;
  onFinished: (guesserWon: boolean) => void;
  onNext: () => void;
}) {
  const engine = useMemo(() => createHangman(secret), [secret]);
  const [state, setState] = useState(() => engine.initialState());
  const status = engine.getStatus(state);
  const over = status.state !== 'playing';

  const guess = (l: string) => setState((s) => engine.applyMove(s, l) ?? s);

  // Report the result exactly once, when the round ends.
  const reported = useRef(false);
  const guesserWon = status.state === 'won' && status.winner === 1;
  useEffect(() => {
    if (over && !reported.current) {
      reported.current = true;
      onFinished(guesserWon);
    }
  }, [over, guesserWon, onFinished]);

  // Physical keyboard support; the ref always points at the latest guess handler.
  const guessRef = useRef(guess);
  guessRef.current = guess;
  useEffect(() => {
    if (over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      guessRef.current(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [over]);

  return (
    <>
      <TurnBanner>
        {!over && `${guesserName}: guess a letter (${state.maxWrong - state.wrong} wrong guesses left)`}
        {status.state === 'won' && status.winner === 1 && `${guesserName} solved it!`}
        {status.state === 'won' &&
          status.winner === 2 &&
          `${setterName} wins — the word was “${state.secret}”.`}
      </TurnBanner>
      <Gallows wrong={state.wrong} />
      <div className="flex gap-2 text-3xl font-mono tracking-widest">
        {masked(state, over).map((ch, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional letters
          <span key={i} className={ch === ' ' ? 'w-4' : 'w-8 text-center border-b-2 border-neutral-900'}>
            {ch === ' ' ? '' : ch.toUpperCase()}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1 max-w-md">
        {LETTERS.map((l) => {
          const used = state.guesses.includes(l);
          const hit = used && state.secret.includes(l);
          return (
            <button
              key={l}
              type="button"
              disabled={over || used}
              onClick={() => guess(l)}
              className={`tile-wood w-9 h-9 text-sm uppercase disabled:cursor-default ${hit ? 'hit' : used ? 'miss' : ''}`}
            >
              {l}
            </button>
          );
        })}
      </div>
      {over && (
        <button type="button" className="px-6 py-2 rounded border bg-neutral-900 text-white" onClick={onNext}>
          Next round
        </button>
      )}
    </>
  );
}
