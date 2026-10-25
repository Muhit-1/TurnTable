import { beforeEach, describe, expect, it } from 'vitest';
import { recentGames, rememberRecent } from './recent';

describe('recent games', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it('puts the latest game first, drops duplicates and keeps five', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'c']) rememberRecent(id);
    expect(recentGames()).toEqual(['c', 'f', 'e', 'd', 'b']);
  });

  it('ignores corrupt saved data', () => {
    store.set('turntable:recent', '{not json');
    expect(recentGames()).toEqual([]);
  });
});
