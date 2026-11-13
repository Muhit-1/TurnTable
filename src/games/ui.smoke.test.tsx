// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { games } from './registry';

/**
 * Every game page must draw its board and controls without crashing, both fresh and with a saved match.
 * The rules themselves are tested per game (engine.test.ts); this catches a page that breaks while rendering.
 */
const pages = import.meta.glob<{ default: ComponentType }>('./*/*.tsx');
const pageFor = (id: string) =>
  Object.keys(pages).find((p) => p.startsWith(`./${id}/`) && !/(main|\.test)\.tsx$/.test(p));

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('every game page renders', () => {
  for (const g of games) {
    it(g.id, async () => {
      const path = pageFor(g.id);
      expect(path, `no page component found for ${g.id}`).toBeTruthy();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const Page = (await pages[path as string]()).default;

      const first = render(<Page />);
      expect(first.container.querySelector('h1')?.textContent?.trim()).toBeTruthy();
      expect(first.container.querySelectorAll('button').length).toBeGreaterThan(0);
      first.unmount();

      // Second visit: whatever the first one saved must load again.
      const second = render(<Page />);
      expect(second.container.querySelector('main')).toBeTruthy();
      second.unmount();
      expect(errors.mock.calls.map((c) => String(c[0]))).toEqual([]);
    });
  }
});
