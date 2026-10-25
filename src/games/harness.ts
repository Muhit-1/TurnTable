/**
 * A uniform way for tests to drive every game: its engine, an optional computer move at each level, and a
 * way to play a complete game. Registry tests fail if a game in the registry has no entry here.
 */
import { readFileSync } from 'node:fs';
import type { GameEngine } from '../shared/engine';
import type { Level } from '../shared/level';
import { nextFloat } from '../shared/rng';
import { chooseMove as chooseTqMove } from './20-questions/ai';
import { createTwentyQuestions, type TqMove, type TqState } from './20-questions/engine';
import { chooseMove as chooseBackgammon } from './backgammon/ai';
import { backgammonEngine } from './backgammon/engine';
import { getBestMove as chooseBattleship } from './battleship/ai';
import { battleshipEngine } from './battleship/engine';
import { chooseMove as chooseCheckers } from './checkers/ai';
import { checkersEngine } from './checkers/engine';
import { chessEngine } from './chess/engine';
import { chooseMove as chooseC4 } from './connect-4/ai';
import { connect4Engine } from './connect-4/engine';
import { chooseMove as chooseDots } from './dots-and-boxes/ai';
import { dotsEngine } from './dots-and-boxes/engine';
import { createGo, type GoMove } from './go/engine';
import { chooseMove as chooseGoFish } from './go-fish/ai';
import { goFishEngine } from './go-fish/engine';
import { chooseMove as chooseGomoku } from './gomoku/ai';
import { gomokuEngine } from './gomoku/engine';
import { createHangman } from './hangman/engine';
import { chooseMove as chooseHex } from './hex/ai';
import { hexEngine } from './hex/engine';
import { chooseMove as chooseLudo } from './ludo/ai';
import { ludoEngine } from './ludo/engine';
import { chooseMove as chooseMancala } from './mancala/ai';
import { mancalaEngine } from './mancala/engine';
import { chooseMove as chooseMemory } from './memory/ai';
import { createMemory } from './memory/engine';
import { chooseMove as chooseNim } from './nim/ai';
import { nimEngine } from './nim/engine';
import { chooseMove as chooseMorris } from './nine-mens-morris/ai';
import { morrisEngine } from './nine-mens-morris/engine';
import { chooseMove as chooseQuarto } from './quarto/ai';
import { quartoEngine } from './quarto/engine';
import { chooseMove as chooseReversi } from './reversi/ai';
import { reversiEngine } from './reversi/engine';
import { rpsEngine } from './rock-paper-scissors/engine';
import { chooseMove as chooseScrabble } from './scrabble/ai';
import { dictionaryFromText } from './scrabble/dictionary';
import { createScrabble } from './scrabble/engine';
import { snakesEngine } from './snakes-and-ladders/engine';
import { chooseMove as chooseTtt } from './tic-tac-toe/ai';
import { tttEngine } from './tic-tac-toe/engine';
import { chooseMove as chooseUno } from './uno/ai';
import { unoEngine } from './uno/engine';
import { warEngine } from './war/engine';
import { chooseMove as chooseYahtzee } from './yahtzee/ai';
import { yahtzeeEngine } from './yahtzee/engine';

// biome-ignore lint/suspicious/noExplicitAny: the harness erases each game's state and move types
type AnyEngine = GameEngine<any, any>;

export interface Harness {
  id: string;
  engine: () => AnyEngine;
  /** the computer's move in `state` at a level (absent for games with no computer opponent) */
  // biome-ignore lint/suspicious/noExplicitAny: see above
  choose?: (state: any, level: Level, random: () => number) => unknown;
  /** plays a complete game and returns the final state and the last move that was made */
  // biome-ignore lint/suspicious/noExplicitAny: see above
  playthrough: (random: () => number) => { final: any; lastMove: unknown };
  /** states to sample moves from; defaults to random play from the start */
  // biome-ignore lint/suspicious/noExplicitAny: see above
  sample?: (random: () => number, plies: number) => any;
}

export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    let f: number;
    [f, s] = nextFloat(s);
    return f;
  };
}

/** Random legal play, with the computer moving on even turns when there is one, until the game ends. */
function randomGame(engine: AnyEngine, choose: Harness['choose'], random: () => number, cap = 30000) {
  let s = engine.initialState();
  let last: unknown = null;
  for (let i = 0; i < cap && engine.getStatus(s).state === 'playing'; i++) {
    const moves = engine.legalMoves(s);
    if (moves.length === 0) break;
    const move =
      choose && i % 2 === 0 ? choose(s, 'easy', random) : moves[Math.floor(random() * moves.length)];
    const next = engine.applyMove(s, move);
    if (!next) throw new Error(`illegal move ${JSON.stringify(move)}`);
    s = next;
    last = move;
  }
  return { final: s, lastMove: last };
}

function scripted(engine: AnyEngine, moves: unknown[]) {
  let s = engine.initialState();
  for (const m of moves) {
    const next = engine.applyMove(s, m);
    if (!next) throw new Error(`scripted move rejected: ${JSON.stringify(m)}`);
    s = next;
  }
  return { final: s, lastMove: moves[moves.length - 1] };
}

function simple<S, M>(
  id: string,
  engine: GameEngine<S, M>,
  choose?: (s: S, level: Level, random: () => number) => M,
): Harness {
  return {
    id,
    engine: () => engine as AnyEngine,
    choose: choose as Harness['choose'],
    playthrough: (random) => randomGame(engine as AnyEngine, choose as Harness['choose'], random),
  };
}

/** Square index for a name like 'e4' (row 0 is rank 8). */
const sq = (name: string) => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);

const goEngine = createGo(5, 0.5);
const hangman = createHangman('apple');
const twenty = createTwentyQuestions('dog');
let scrabbleDict: ReturnType<typeof dictionaryFromText> | null = null;
const dict = () => {
  scrabbleDict ??= dictionaryFromText(readFileSync('src/games/scrabble/words.txt', 'utf8'));
  return scrabbleDict;
};

export const HARNESSES: Harness[] = [
  simple('tic-tac-toe', tttEngine, chooseTtt),
  simple('connect-4', connect4Engine, (s, level, r) => chooseC4(s.board, s.current, level, r)),
  simple('checkers', checkersEngine, chooseCheckers),
  simple('reversi', reversiEngine, chooseReversi),
  simple('gomoku', gomokuEngine, chooseGomoku),
  simple('dots-and-boxes', dotsEngine, chooseDots),
  simple('nim', nimEngine, chooseNim),
  simple('nine-mens-morris', morrisEngine, chooseMorris),
  simple('quarto', quartoEngine, chooseQuarto),
  simple('hex', hexEngine, chooseHex),
  simple('mancala', mancalaEngine, chooseMancala),
  simple('backgammon', backgammonEngine, chooseBackgammon),
  simple('ludo', ludoEngine, chooseLudo),
  simple('snakes-and-ladders', snakesEngine),
  simple('yahtzee', yahtzeeEngine, (s, level) => chooseYahtzee(s, level)),
  simple('battleship', battleshipEngine, (s, level) => chooseBattleship(s, level)),
  simple('war', warEngine),
  simple('go-fish', goFishEngine, chooseGoFish),
  simple('uno', unoEngine, chooseUno),
  simple('rock-paper-scissors', rpsEngine),
  {
    id: 'memory',
    engine: () => createMemory(6, 3) as AnyEngine,
    choose: (s, level) => chooseMemory(s, level),
    playthrough: (random) =>
      randomGame(createMemory(6, 3) as AnyEngine, (s, level) => chooseMemory(s, level), random),
  },
  {
    id: 'hangman',
    engine: () => hangman as AnyEngine,
    playthrough: () => scripted(hangman as AnyEngine, ['a', 'p', 'l', 'e']),
  },
  {
    id: '20-questions',
    engine: () => twenty as AnyEngine,
    choose: (s: TqState, level, random) => chooseTqMove(s, level, random),
    playthrough: () => {
      const moves: TqMove[] = [
        { kind: 'ask', text: 'Is it an animal?', tag: 'animal' },
        { kind: 'answer', yes: true },
        { kind: 'ask', text: 'Is it a fish?' },
        { kind: 'answer', yes: false },
        { kind: 'guess', text: 'dog' },
      ];
      return scripted(twenty as AnyEngine, moves);
    },
    // a position after one answered question, so it is the guesser's turn again
    sample: () => {
      const asked = twenty.applyMove(twenty.initialState(), {
        kind: 'ask',
        text: 'Is it an animal?',
        tag: 'animal',
      });
      return (asked && twenty.applyMove(asked, { kind: 'answer', yes: true })) ?? twenty.initialState();
    },
  },
  {
    id: 'scrabble',
    engine: () => createScrabble(dict(), 5) as AnyEngine,
    choose: (s, level, random) => chooseScrabble(s, dict(), level, random),
    playthrough: (random) => {
      const engine = createScrabble(dict(), 5);
      let s = engine.initialState();
      let last: unknown = null;
      for (let i = 0; i < 150 && engine.getStatus(s).state === 'playing'; i++) {
        const move = chooseScrabble(s, dict(), i % 2 ? 'medium' : 'hard', random);
        const next = engine.applyMove(s, move);
        if (!next) throw new Error('illegal scrabble move');
        s = next;
        last = move;
      }
      return { final: s, lastMove: last };
    },
    sample: (random, plies) => {
      const engine = createScrabble(dict(), 5);
      let s = engine.initialState();
      for (let i = 0; i < plies; i++) s = engine.applyMove(s, chooseScrabble(s, dict(), 'hard', random)) ?? s;
      return s;
    },
  },
  {
    id: 'chess',
    engine: () => chessEngine as AnyEngine,
    playthrough: () => {
      // fool's mate
      const mv = (a: string, b: string) => ({ from: sq(a), to: sq(b) });
      return scripted(chessEngine as AnyEngine, [
        mv('f2', 'f3'),
        mv('e7', 'e5'),
        mv('g2', 'g4'),
        mv('d8', 'h4'),
      ]);
    },
  },
  {
    id: 'go',
    engine: () => goEngine as AnyEngine,
    playthrough: () => {
      const place = (r: number, c: number): GoMove => ({ kind: 'place', point: r * 5 + c });
      // black takes the left, white the right, then both pass
      return scripted(goEngine as AnyEngine, [
        place(2, 1),
        place(2, 3),
        place(1, 1),
        place(1, 3),
        { kind: 'pass' },
        { kind: 'pass' },
      ]);
    },
  },
];
