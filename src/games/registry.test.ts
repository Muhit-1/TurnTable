import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { games } from './registry';

describe('registry', () => {
  it('lists 26 unique games with complete rules and a video link', () => {
    expect(games).toHaveLength(26);
    expect(new Set(games.map((g) => g.id)).size).toBe(26);
    for (const g of games) {
      expect(g.objective, g.id).not.toBe('');
      expect(g.howToPlay, g.id).not.toBe('');
      expect(g.videoUrl, g.id).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    }
  });

  it.each(games.filter((g) => g.ready))(
    'ready game "$id" has its entry page, main.tsx and engine tests',
    (g) => {
      expect(existsSync(`allgames/${g.id}/index.html`)).toBe(true);
      expect(readFileSync(`allgames/${g.id}/index.html`, 'utf8')).toContain(`/src/games/${g.id}/main.tsx`);
      expect(existsSync(`src/games/${g.id}/main.tsx`)).toBe(true);
      const hasTests = ['engine.test.ts', 'logic.test.ts'].some((f) => existsSync(`src/games/${g.id}/${f}`));
      expect(hasTests).toBe(true);
    },
  );
});

describe('homepage entries', () => {
  it('every game has a short name, a one-line description and a drawing, and nothing else is listed', async () => {
    const { BLURBS } = await import('../home/blurbs');
    const { hasGlyph, glyphSvg } = await import('../home/glyphs');
    expect(Object.keys(BLURBS).sort()).toEqual(games.map((g) => g.id).sort());
    for (const g of games) {
      expect(BLURBS[g.id].name.length, g.id).toBeGreaterThan(1);
      expect(BLURBS[g.id].line.length, g.id).toBeGreaterThan(10);
      expect(hasGlyph(g.id), `no drawing for ${g.id}`).toBe(true);
      expect(glyphSvg(g.id)).toContain('<svg');
    }
  });
});
