import type { ReactNode } from 'react';
import { usePersistentState } from './storage';

export type Level = 'easy' | 'medium' | 'hard';
export const LEVEL_NAMES: readonly Level[] = ['easy', 'medium', 'hard'];
export const isLevel = (v: unknown): v is Level => v === 'easy' || v === 'medium' || v === 'hard';

/** Chance that a weaker level replaces its chosen move with a random legal one. */
export const BLUNDER: Record<Level, number> = { easy: 0.35, medium: 0.12, hard: 0 };

/** Returns `best`, or (with the level's blunder chance) a random one of `options`. */
export function maybeRandom<M>(
  level: Level,
  best: M,
  options: readonly M[],
  random: () => number = Math.random,
): M {
  if (options.length === 0 || BLUNDER[level] === 0 || random() >= BLUNDER[level]) return best;
  return options[Math.floor(random() * options.length)];
}

/** Search depth to use at each level, for games whose strength comes from lookahead. */
export function depthFor(level: Level, depths: Record<Level, number>): number {
  return depths[level];
}

export function LevelPicker({ level, onChange }: { level: Level; onChange: (l: Level) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      Difficulty
      {LEVEL_NAMES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === level}
          className={`px-3 py-1 rounded border capitalize ${l === level ? 'bg-neutral-900 text-white' : 'bg-white'}`}
          onClick={() => onChange(l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** The remembered difficulty for a game, plus the picker to show when playing the computer. */
export function useLevel(gameId: string): [Level, ReactNode, (l: Level) => void] {
  const [level, setLevel] = usePersistentState<Level>(`${gameId}:level`, 'medium', isLevel);
  return [level, <LevelPicker key="level" level={level} onChange={setLevel} />, setLevel];
}
