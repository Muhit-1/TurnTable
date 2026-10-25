import type { Level } from '../../shared/level';
import { type MemoryMove, type MemoryState, needsResolve } from './engine';

/** How many of the most recent reveals the computer "remembers". */
export const MEMORY_SPAN = 8;

/** Computer plays like a person with a limited memory: matches what it remembers, otherwise explores. */
export function getBestMove(s: MemoryState, span = MEMORY_SPAN): MemoryMove {
  if (needsResolve(s)) return 'resolve';
  const open = s.symbols.map((_, i) => i).filter((i) => s.matchedBy[i] === null && !s.flipped.includes(i));

  // Cards the computer can recall: recent reveals that are still unmatched (deduplicated).
  const remembered = [...new Set(s.reveals.slice(-span))].filter((i) => s.matchedBy[i] === null);
  const seenSet = new Set(remembered);

  if (s.flipped.length === 1) {
    const first = s.flipped[0];
    const partner = remembered.find((i) => i !== first && s.symbols[i] === s.symbols[first]);
    if (partner !== undefined) return partner;
    const unknown = open.filter((i) => !seenSet.has(i));
    return (unknown.length ? unknown : open)[0];
  }

  // First flip of the turn: complete a remembered pair if there is one.
  for (const i of remembered) {
    const partner = remembered.find((j) => j !== i && s.symbols[j] === s.symbols[i]);
    if (partner !== undefined) return i;
  }
  const unknown = open.filter((i) => !seenSet.has(i));
  const pool = unknown.length ? unknown : open;
  // Spread picks around the board using how many cards have been revealed so far.
  return pool[(s.reveals.length * 7) % pool.length];
}

/** How many recent reveals the computer remembers at each level. */
const SPAN: Record<Level, number> = { easy: 2, medium: 5, hard: MEMORY_SPAN };

export function chooseMove(s: MemoryState, level: Level): MemoryMove {
  return getBestMove(s, SPAN[level]);
}
