import { remaining, type TqMove, type TqState } from './engine';
import { ATTRIBUTES, type Attribute, ITEMS, type Item } from './items';

/** Items still consistent with every answer so far. */
export function candidates(s: TqState): Item[] {
  return ITEMS.filter((item) =>
    s.log.every((e) => {
      if (e.answer === null || !e.tag) return true;
      if (e.type === 'guess') return e.answer ? item.name === e.tag : item.name !== e.tag;
      const has = item.attrs.includes(e.tag as Attribute);
      return e.answer ? has : !has;
    }),
  );
}

/**
 * Ask the question that splits the remaining candidates most evenly. Guess when only one candidate is left,
 * when no question splits them, or when the turns are nearly gone. Give up if nothing fits.
 */
export function getBestMove(s: TqState): TqMove {
  const left = candidates(s);
  if (left.length === 0) return { kind: 'giveup' };

  const asked = new Set(s.log.filter((e) => e.type === 'question' && e.tag).map((e) => e.tag));
  let bestAttr: Attribute | null = null;
  let bestBalance = -1;
  for (const attr of Object.keys(ATTRIBUTES) as Attribute[]) {
    if (asked.has(attr)) continue;
    const yes = left.filter((i) => i.attrs.includes(attr)).length;
    const balance = Math.min(yes, left.length - yes);
    if (balance > bestBalance) {
      bestBalance = balance;
      bestAttr = attr;
    }
  }

  const mustGuess = left.length === 1 || bestBalance <= 0 || remaining(s) <= 2;
  if (mustGuess || bestAttr === null) {
    return { kind: 'guess', text: `Is it a ${left[0].name}?`, tag: left[0].name };
  }
  return { kind: 'ask', text: ATTRIBUTES[bestAttr], tag: bestAttr };
}
