import { useCallback, useState } from 'react';

const PREFIX = 'turntable:';
/** Bump when saved data changes shape; older saves are then ignored instead of loaded wrongly. */
export const STORAGE_VERSION = 1;

interface Envelope<T> {
  v: number;
  data: T;
}

/** Reads a saved value, or null if there is none, it is corrupt, it is from another version, or storage is blocked. */
export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    return env && env.v === STORAGE_VERSION && 'data' in env ? env.data : null;
  } catch {
    return null;
  }
}

/** Saves a value. Failures (private mode, quota) are ignored: the game simply will not be resumable. */
export function saveJson<T>(key: string, data: T): void {
  try {
    const env: Envelope<T> = { v: STORAGE_VERSION, data };
    localStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    /* storage unavailable */
  }
}

export function removeJson(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

/** Like useState, but remembers the value in localStorage (for settings such as difficulty or board size). */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (v: unknown) => v is T = (v): v is T => typeof v === typeof initial,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = loadJson<unknown>(key);
    return saved !== null && isValid(saved) ? saved : initial;
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      saveJson(key, v);
    },
    [key],
  );
  return [value, set];
}
