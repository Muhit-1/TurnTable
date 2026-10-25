import { useSyncExternalStore } from 'react';
import { loadJson, saveJson } from './storage';

export type Theme = 'light' | 'dark';
const listeners = new Set<() => void>();

export function currentTheme(): Theme {
  return loadJson<Theme>('theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(t: Theme = currentTheme()): void {
  document.documentElement.dataset.theme = t;
}

export function setTheme(t: Theme): void {
  saveJson('theme', t);
  applyTheme(t);
  for (const l of listeners) l();
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    currentTheme,
    () => 'light' as Theme,
  );
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}
