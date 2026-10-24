import { describe, expect, it } from 'vitest';
import { candidates, getBestMove } from './ai';
import {
  createTwentyQuestions,
  MAX_QUESTIONS,
  normalise,
  remaining,
  type TqMove,
  type TqState,
} from './engine';
import { ATTRIBUTES, ITEMS } from './items';

const ask = (text: string, tag?: string): TqMove => ({ kind: 'ask', text, tag });
const guess = (text: string): TqMove => ({ kind: 'guess', text });
const yes: TqMove = { kind: 'answer', yes: true };
const no: TqMove = { kind: 'answer', yes: false };
const run = (e: ReturnType<typeof createTwentyQuestions>, s: TqState, ...moves: TqMove[]) => {
  let cur = s;
  for (const m of moves) {
    const n = e.applyMove(cur, m);
    if (!n) throw new Error(`illegal ${JSON.stringify(m)}`);
    cur = n;
  }
  return cur;
};

describe('normalise', () => {
  it('ignores case, punctuation, leading articles and extra spaces', () => {
    expect(normalise('The Moon!')).toBe('moon');
    expect(normalise('  an  Ice   Cream ')).toBe('ice cream');
    expect(normalise('A dog')).toBe('dog');
    expect(normalise('another')).toBe('another'); // "a" only stripped as a whole word
  });
});

describe('twenty questions flow', () => {
  const e = createTwentyQuestions('dog');

  it('starts with the guesser to move and 20 turns', () => {
    const s = e.initialState();
    expect(e.currentPlayer(s)).toBe(1);
    expect(remaining(s)).toBe(MAX_QUESTIONS);
    expect(s.phase).toBe('ask');
  });

  it('a question waits for an answer, then returns to the guesser and uses a turn', () => {
    let s = run(e, e.initialState(), ask('Is it big?'));
    expect(s.phase).toBe('answer');
    expect(e.currentPlayer(s)).toBe(2);
    expect(e.applyMove(s, ask('Another?'))).toBeNull(); // must answer first
    s = run(e, s, no);
    expect(s.phase).toBe('ask');
    expect(remaining(s)).toBe(19);
    expect(s.log[0]).toMatchObject({ type: 'question', answer: false });
  });

  it('rejects empty and overlong text, answers out of turn, and unknown moves', () => {
    const s = e.initialState();
    expect(e.applyMove(s, ask('   '))).toBeNull();
    expect(e.applyMove(s, ask('x'.repeat(201)))).toBeNull();
    expect(e.applyMove(s, yes)).toBeNull();
    expect(e.applyMove(s, { kind: 'answer', yes: 'maybe' as unknown as boolean })).toBeNull();
    // @ts-expect-error deliberately invalid
    expect(e.applyMove(s, { kind: 'peek' })).toBeNull();
  });

  it('a correct guess wins automatically when the secret is known', () => {
    const s = run(e, e.initialState(), guess('Is it a dog?'.replace('Is it a ', '').replace('?', '')));
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(s.ended).toBe('solved');
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, ask('More?'))).toBeNull();
  });

  it('a wrong guess costs a turn but the game goes on', () => {
    const s = run(e, e.initialState(), guess('cat'));
    expect(remaining(s)).toBe(19);
    expect(s.winner).toBeNull();
    expect(s.phase).toBe('ask');
  });

  it('the answerer wins when all 20 turns are spent', () => {
    let s = e.initialState();
    for (let i = 0; i < MAX_QUESTIONS - 1; i++) s = run(e, s, ask(`question ${i}`), no);
    expect(e.getStatus(s).state).toBe('playing');
    s = run(e, s, ask('last question'), no);
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 2 });
    expect(s.ended).toBe('out-of-questions');
  });

  it('a wrong guess on the last turn also ends the game', () => {
    let s = e.initialState();
    for (let i = 0; i < MAX_QUESTIONS - 1; i++) s = run(e, s, ask(`q${i}`), no);
    s = run(e, s, guess('cat'));
    expect(s.winner).toBe(2);
  });

  it('the guesser can give up, which hands the win to the answerer', () => {
    const s = run(e, e.initialState(), { kind: 'giveup' });
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 2 });
    expect(s.ended).toBe('gave-up');
  });

  it('without a secret, guesses are judged by the answerer (honour system)', () => {
    const honour = createTwentyQuestions(null);
    let s = run(honour, honour.initialState(), guess('moon'));
    expect(s.phase).toBe('answer');
    expect(s.winner).toBeNull();
    expect(run(honour, s, yes).winner).toBe(1);
    s = run(honour, s, no);
    expect(s.winner).toBeNull();
    expect(remaining(s)).toBe(19);
  });
});

describe('item database', () => {
  it('has unique names, known attributes only, and no two items with identical attributes', () => {
    const seen = new Map<string, string>();
    for (const item of ITEMS) {
      for (const a of item.attrs) expect(ATTRIBUTES, `${item.name}: ${a}`).toHaveProperty(a);
      expect(new Set(item.attrs).size).toBe(item.attrs.length);
      const key = [...item.attrs].sort().join(',');
      expect(seen.get(key), `${item.name} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, item.name);
    }
    expect(new Set(ITEMS.map((i) => i.name)).size).toBe(ITEMS.length);
    expect(ITEMS.length).toBeGreaterThanOrEqual(50);
  });

  it('every attribute is used by at least one item and splits the list', () => {
    for (const a of Object.keys(ATTRIBUTES)) {
      const n = ITEMS.filter((i) => i.attrs.includes(a as never)).length;
      expect(n, a).toBeGreaterThan(0);
      expect(n, a).toBeLessThan(ITEMS.length);
    }
  });
});

describe('twenty questions computer guesser', () => {
  /** Plays the computer against a truthful answerer who is thinking of `item`. */
  function play(itemName: string): { turns: number; solved: boolean } {
    const item = ITEMS.find((i) => i.name === itemName);
    if (!item) throw new Error('unknown item');
    const e = createTwentyQuestions(null);
    let s = e.initialState();
    let turns = 0;
    while (s.winner === null && turns < 40) {
      const m = getBestMove(s);
      if (m.kind === 'giveup') return { turns, solved: false };
      s = run(e, s, m);
      turns++;
      const tag = m.kind === 'ask' || m.kind === 'guess' ? m.tag : undefined;
      const truth = m.kind === 'guess' ? tag === itemName : item.attrs.includes(tag as never);
      s = run(e, s, { kind: 'answer', yes: truth });
    }
    return { turns, solved: s.ended === 'solved' };
  }

  it('identifies every item in the database within 20 turns', () => {
    for (const item of ITEMS) {
      const r = play(item.name);
      expect(r.solved, item.name).toBe(true);
      expect(r.turns, item.name).toBeLessThanOrEqual(MAX_QUESTIONS);
    }
  });

  it('usually needs only a handful of questions', () => {
    const avg = ITEMS.reduce((a, i) => a + play(i.name).turns, 0) / ITEMS.length;
    expect(avg).toBeLessThan(10);
  });

  it('narrows the candidates after each answer and never asks the same question twice', () => {
    const e = createTwentyQuestions(null);
    let s = e.initialState();
    const before = candidates(s).length;
    const m = getBestMove(s);
    s = run(e, s, m, { kind: 'answer', yes: true });
    expect(candidates(s).length).toBeLessThan(before);
    const asked = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const next = getBestMove(s);
      if (next.kind !== 'ask') break;
      expect(asked.has(next.tag as string)).toBe(false);
      asked.add(next.tag as string);
      s = run(e, s, next, { kind: 'answer', yes: false });
    }
  });

  it('gives up when the answers fit no known item', () => {
    const e = createTwentyQuestions(null);
    let s = e.initialState();
    // "an animal" that is "a place" cannot exist in the database
    s = run(e, s, ask('Is it an animal?', 'animal'), yes, ask('Is it a place?', 'place'), yes);
    expect(candidates(s)).toEqual([]);
    expect(getBestMove(s)).toEqual({ kind: 'giveup' });
  });

  it('guesses straight away when one candidate remains', () => {
    const e = createTwentyQuestions(null);
    let s = e.initialState();
    s = run(e, s, ask('Does it bark?', 'barks'), yes);
    expect(candidates(s).map((i) => i.name)).toEqual(['dog']);
    expect(getBestMove(s)).toMatchObject({ kind: 'guess', tag: 'dog' });
  });
});
