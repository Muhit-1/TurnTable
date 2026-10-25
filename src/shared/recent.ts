import { loadJson, saveJson } from './storage';

const KEY = 'recent';
const MAX = 5;

/** Game ids, most recently opened first. */
export function recentGames(): string[] {
  const v = loadJson<unknown>(KEY);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX) : [];
}

export function rememberRecent(id: string): void {
  saveJson(KEY, [id, ...recentGames().filter((x) => x !== id)].slice(0, MAX));
}
