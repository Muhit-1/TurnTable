import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, type Mode, ModeToggle, Scoreboard, TurnBanner } from '../../shared/components';
import type { Level } from '../../shared/level';
import { useLevel } from '../../shared/level';
import { chooseMove } from './ai';
import { createTwentyQuestions, MAX_QUESTIONS, type TqMove, type TqState } from './engine';

type Person = 1 | 2;

export default function TwentyQuestions() {
  const [mode, setMode] = useState<Mode>('pvp');
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState<{ secret: string | null } | null>(null);
  const [scores, setScores] = useState<Record<Person, number>>({ 1: 0, 2: 0 });
  const [level, levelPicker] = useLevel('20-questions');

  // vs computer: the computer guesses and the human answers. pvp: guesser alternates each round.
  const guesser: Person = mode === 'vs-cpu' ? 2 : round % 2 === 0 ? 1 : 2;
  const answerer: Person = guesser === 1 ? 2 : 1;
  const names: Record<Person, string> =
    mode === 'vs-cpu' ? { 1: 'You', 2: 'Computer' } : { 1: 'Player 1', 2: 'Player 2' };

  const changeMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setRound(0);
    setStarted(null);
    setScores({ 1: 0, 2: 0 });
  };

  return (
    <GameShell id="20-questions" title="20 Questions">
      <ModeToggle mode={mode} onChange={changeMode} />
      {mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={scores} />
      {started === null ? (
        <Setup
          mode={mode}
          answerer={names[answerer]}
          guesser={names[guesser]}
          onStart={(secret) => setStarted({ secret })}
        />
      ) : (
        <Round
          key={round}
          secret={started.secret}
          computerGuesses={mode === 'vs-cpu'}
          level={level}
          guesserName={names[guesser]}
          answererName={names[answerer]}
          onFinished={(guesserWon) =>
            setScores((s) => ({
              ...s,
              [guesserWon ? guesser : answerer]: s[guesserWon ? guesser : answerer] + 1,
            }))
          }
          onNext={() => {
            setRound((r) => r + 1);
            setStarted(null);
          }}
        />
      )}
    </GameShell>
  );
}

function Setup({
  mode,
  answerer,
  guesser,
  onStart,
}: {
  mode: Mode;
  answerer: string;
  guesser: string;
  onStart: (s: string | null) => void;
}) {
  const [text, setText] = useState('');
  if (mode === 'vs-cpu') {
    return (
      <div className="flex flex-col items-center gap-3 max-w-sm text-center">
        <p className="text-sm">
          Think of an animal, plant, food, object, vehicle or place — and keep it to yourself. The computer
          will ask yes/no questions; answer honestly!
        </p>
        <button
          type="button"
          className="px-6 py-3 rounded border bg-neutral-900 text-white"
          onClick={() => onStart(null)}
        >
          I’m ready
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col items-center gap-3 max-w-sm text-center"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(text.trim() || null);
      }}
    >
      <p className="text-sm">
        {guesser}, look away. {answerer} thinks of a person, place or thing and types it here (hidden) so
        guesses can be checked. Leave it blank to play on the honour system.
      </p>
      <input
        type="password"
        autoComplete="off"
        aria-label="Secret answer"
        className="border rounded px-3 py-2 w-64"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="px-6 py-2 rounded border bg-neutral-900 text-white">
        Start round
      </button>
    </form>
  );
}

function Round({
  secret,
  computerGuesses,
  level,
  guesserName,
  answererName,
  onFinished,
  onNext,
}: {
  secret: string | null;
  computerGuesses: boolean;
  level: Level;
  guesserName: string;
  answererName: string;
  onFinished: (guesserWon: boolean) => void;
  onNext: () => void;
}) {
  const engine = useMemo(() => createTwentyQuestions(secret), [secret]);
  const [state, setState] = useState<TqState>(() => engine.initialState());
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const over = state.winner !== null;
  const apply = useCallback((m: TqMove) => setState((s) => engine.applyMove(s, m) ?? s), [engine]);

  const reported = useRef(false);
  useEffect(() => {
    if (over && !reported.current) {
      reported.current = true;
      onFinished(state.winner === 1);
    }
  }, [over, state.winner, onFinished]);

  // The computer asks or guesses by itself when it is the guesser.
  useEffect(() => {
    if (!computerGuesses || over || state.phase !== 'ask') return;
    const t = setTimeout(() => apply(chooseMove(state, level)), 900);
    return () => clearTimeout(t);
  }, [computerGuesses, over, state, apply, level]);

  const pending = state.log[state.log.length - 1];
  const left = MAX_QUESTIONS - state.log.length;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <TurnBanner>
        {!over &&
          state.phase === 'ask' &&
          (computerGuesses
            ? 'The computer is thinking…'
            : `${guesserName}: ask a yes/no question or make a guess`)}
        {!over && state.phase === 'answer' && `${answererName}: answer honestly`}
        {state.ended === 'solved' &&
          `${guesserName} got it in ${state.log.length} turn${state.log.length > 1 ? 's' : ''}!`}
        {state.ended === 'out-of-questions' &&
          `${answererName} wins — out of questions${secret ? `. It was “${secret}”.` : '.'}`}
        {state.ended === 'gave-up' &&
          `${guesserName} gives up — ${answererName} wins${secret ? ` (it was “${secret}”)` : ''}.`}
      </TurnBanner>

      <div className="text-sm">
        Turns used: {state.log.length}/{MAX_QUESTIONS} ({left} left)
      </div>
      {secret && !over && !computerGuesses && state.phase === 'answer' && (
        <div className="text-xs text-neutral-600">
          {answererName}'s secret: “{secret}”
        </div>
      )}

      <ol className="w-full text-sm border rounded bg-white divide-y max-h-64 overflow-auto">
        {state.log.length === 0 && <li className="p-2 text-neutral-400">No questions yet.</li>}
        {state.log.map((e, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: log order is the identity
          <li key={i} className="p-2 flex justify-between gap-2">
            <span>
              {i + 1}. {e.type === 'guess' ? '🎯 ' : ''}
              {e.text}
            </span>
            <span
              className={
                e.answer === null ? 'text-neutral-400' : e.answer ? 'text-emerald-700' : 'text-rose-700'
              }
            >
              {e.answer === null ? '…' : e.answer ? 'Yes' : 'No'}
            </span>
          </li>
        ))}
      </ol>

      {!over && state.phase === 'answer' && pending && (
        <div className="flex gap-3">
          <button
            type="button"
            className="px-6 py-2 rounded border bg-emerald-600 text-white"
            onClick={() => apply({ kind: 'answer', yes: true })}
          >
            Yes
          </button>
          <button
            type="button"
            className="px-6 py-2 rounded border bg-rose-600 text-white"
            onClick={() => apply({ kind: 'answer', yes: false })}
          >
            No
          </button>
        </div>
      )}

      {!over && state.phase === 'ask' && !computerGuesses && (
        <div className="flex flex-col gap-2 w-full">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) {
                apply({ kind: 'ask', text: question });
                setQuestion('');
              }
            }}
          >
            <input
              className="border rounded px-3 py-2 flex-1"
              aria-label="Your question"
              placeholder="Is it …?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 rounded border bg-neutral-900 text-white disabled:opacity-40"
              disabled={!question.trim()}
            >
              Ask
            </button>
          </form>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (guess.trim()) {
                apply({ kind: 'guess', text: guess });
                setGuess('');
              }
            }}
          >
            <input
              className="border rounded px-3 py-2 flex-1"
              aria-label="Your guess"
              placeholder="My guess is…"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 rounded border bg-amber-500 disabled:opacity-40"
              disabled={!guess.trim()}
            >
              Guess
            </button>
          </form>
          <button
            type="button"
            className="text-xs underline self-end"
            onClick={() => apply({ kind: 'giveup' })}
          >
            Give up
          </button>
        </div>
      )}

      {over && (
        <button type="button" className="px-6 py-2 rounded border bg-neutral-900 text-white" onClick={onNext}>
          Next round
        </button>
      )}
    </div>
  );
}
