import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Level } from '../shared/level';
import { chooseMove as chooseTq } from './20-questions/ai';
import { createTwentyQuestions, type TqState } from './20-questions/engine';
import { getBestMove as battleshipMove } from './battleship/ai';
import { createBattleship } from './battleship/engine';
import { chooseMove as chooseC4 } from './connect-4/ai';
import { connect4Engine } from './connect-4/engine';
import { seeded } from './harness';
import { chooseMove as chooseMemory } from './memory/ai';
import { createMemory, type MemoryState } from './memory/engine';
import { chooseMove as chooseScrabble } from './scrabble/ai';
import { dictionaryFromText } from './scrabble/dictionary';
import { checkPlay, createScrabble, type ScrabbleState } from './scrabble/engine';
import { chooseMove as chooseTtt } from './tic-tac-toe/ai';
import { tttEngine } from './tic-tac-toe/engine';
import { chooseMove as chooseYahtzee } from './yahtzee/ai';
import { createYahtzee, type YahtzeeState } from './yahtzee/engine';

describe('Tic-Tac-Toe levels', () => {
  /** Plays `games` games with the computer as O against a random X and counts the computer's non-losses. */
  const notLost = (level: Level, games: number, seed: number) => {
    const rnd = seeded(seed);
    let ok = 0;
    for (let g = 0; g < games; g++) {
      let s = tttEngine.initialState();
      while (tttEngine.getStatus(s).state === 'playing') {
        const moves = tttEngine.legalMoves(s);
        const m = s.current === 2 ? chooseTtt(s, level, rnd) : moves[Math.floor(rnd() * moves.length)];
        s = tttEngine.applyMove(s, m) as typeof s;
      }
      const st = tttEngine.getStatus(s);
      if (!(st.state === 'won' && st.winner === 1)) ok++;
    }
    return ok / games;
  };

  it('hard never loses to a random player', () => {
    expect(notLost('hard', 60, 1)).toBe(1);
  }, 60000);

  it('easy loses noticeably more often than hard', () => {
    expect(notLost('easy', 60, 2)).toBeLessThan(notLost('hard', 60, 2));
  }, 60000);
});

describe('Connect 4 levels', () => {
  /** Plays hard against easy with colours swapped each game; returns how many games hard won. */
  it('hard beats easy more often than not', () => {
    const rnd = seeded(7);
    let hardWins = 0;
    const games = 6;
    for (let g = 0; g < games; g++) {
      const hardPlays = g % 2 === 0 ? 1 : 2;
      let s = connect4Engine.initialState();
      while (connect4Engine.getStatus(s).state === 'playing') {
        const level: Level = s.current === hardPlays ? 'hard' : 'easy';
        s = connect4Engine.applyMove(s, chooseC4(s.board, s.current, level, rnd)) as typeof s;
      }
      const st = connect4Engine.getStatus(s);
      if (st.state === 'won' && st.winner === hardPlays) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(5);
  }, 120000);
});

describe('Battleship levels', () => {
  /** Average number of shots a level needs to sink a fleet. */
  const shotsNeeded = (level: Level, seeds: number[]) => {
    let total = 0;
    for (const seed of seeds) {
      const e = createBattleship(seed);
      let s = e.initialState();
      while (e.getStatus(s).state === 'playing') s = e.applyMove(s, battleshipMove(s, level)) as typeof s;
      total += s.shots[s.winner as 1 | 2].filter(Boolean).length;
    }
    return total / seeds.length;
  };

  it('is faster at each step up: easy (blind) > medium (hunts after a hit) > hard (also searches smartly)', () => {
    const seeds = [31, 32, 33, 34, 35, 36, 37, 38];
    const easy = shotsNeeded('easy', seeds);
    const medium = shotsNeeded('medium', seeds);
    const hard = shotsNeeded('hard', seeds);
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThanOrEqual(hard - 3); // hard is at least about as good as medium
    expect(easy).toBeGreaterThan(80); // blind shooting needs nearly the whole board
    expect(hard).toBeLessThan(75);
  });
});

describe('Yahtzee levels', () => {
  const e = createYahtzee(9);
  const averageScore = (level: Level) => {
    let total = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const eng = createYahtzee(seed);
      let s = eng.initialState();
      while (eng.getStatus(s).state === 'playing')
        s = eng.applyMove(s, chooseYahtzee(s, level)) as YahtzeeState;
      total +=
        (s.cards[1].scores.chance ?? 0) +
        Object.values(s.cards[1].scores).reduce((a: number, v) => a + (v ?? 0), 0);
    }
    return total / 6;
  };

  it('easy rolls once per turn, medium twice, hard three times', () => {
    for (const [level, maxRolls] of [
      ['easy', 1],
      ['medium', 2],
      ['hard', 3],
    ] as const) {
      let s = e.initialState();
      let rolls = 0;
      while (s.current === 1) {
        const m = chooseYahtzee(s, level);
        if (m.kind === 'roll') rolls++;
        s = e.applyMove(s, m) as YahtzeeState;
      }
      expect(rolls, level).toBeLessThanOrEqual(maxRolls);
      expect(rolls, level).toBeGreaterThanOrEqual(1);
    }
  });

  it('scores rise with the level', () => {
    const easy = averageScore('easy');
    const hard = averageScore('hard');
    expect(hard).toBeGreaterThan(easy);
  });
});

describe('Memory levels', () => {
  it('a longer memory finishes a game with fewer flips', () => {
    const flips = (level: Level) => {
      const e = createMemory(8, 5);
      let s = e.initialState();
      let n = 0;
      while (e.getStatus(s).state === 'playing' && n < 2000) {
        s = e.applyMove(s, chooseMemory(s, level)) as MemoryState;
        n++;
      }
      return n;
    };
    expect(flips('hard')).toBeLessThan(flips('easy'));
  });
});

describe('20 Questions levels', () => {
  /** Average number of turns the computer needs when the answers are truthful about a chosen secret. */
  it('hard needs fewer turns than easy on average', () => {
    const items = ['dog', 'apple', 'train', 'moon', 'piano', 'shark', 'bread', 'school'];
    const turns = (level: Level) => {
      const rnd = seeded(11);
      let total = 0;
      for (const name of items) {
        const e = createTwentyQuestions(null);
        let s: TqState = e.initialState();
        while (s.winner === null && s.log.length < 20) {
          const move = chooseTq(s, level, rnd);
          if (move.kind !== 'ask' && move.kind !== 'guess') break; // gives up
          s = e.applyMove(s, move) as TqState;
          const truthful = move.kind === 'guess' ? move.tag === name : itemHas(name, move.tag);
          s = e.applyMove(s, { kind: 'answer', yes: truthful }) as TqState;
        }
        total += s.log.length;
      }
      return total / items.length;
    };
    expect(turns('hard')).toBeLessThan(turns('easy'));
  });
});

import { ITEMS } from './20-questions/items';

function itemHas(name: string, tag: string | undefined): boolean {
  return !!ITEMS.find((i) => i.name === name)?.attrs.includes(tag as never);
}

describe('Scrabble levels', () => {
  const dict = dictionaryFromText(readFileSync('src/games/scrabble/words.txt', 'utf8'));
  const eng = createScrabble(dict, 3);

  it('hard plays higher-scoring words than medium, and medium higher than easy, on average', () => {
    const rnd = seeded(5);
    const score = (level: Level, state: ScrabbleState) => {
      const move = chooseScrabble(state, dict, level, rnd);
      if (move.kind !== 'play') return 0;
      const check = checkPlay(state.board, dict, move.placements);
      return check.ok ? check.total : 0;
    };
    let easy = 0;
    let medium = 0;
    let hard = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const state = createScrabble(dict, seed).initialState();
      for (let i = 0; i < 3; i++) {
        easy += score('easy', state);
        medium += score('medium', state);
      }
      hard += 3 * score('hard', state);
    }
    expect(hard).toBeGreaterThanOrEqual(medium);
    expect(medium).toBeGreaterThan(easy);
    expect(eng.initialState().racks[1]).toHaveLength(7);
  }, 120000);
});
