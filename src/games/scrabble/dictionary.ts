/** Sorted word list with fast membership and prefix checks (binary search, no trie needed). */
export class Dictionary {
  readonly words: string[];
  private readonly set: Set<string>;

  /** `words` must be lowercase; they are sorted and de-duplicated here. */
  constructor(words: Iterable<string>) {
    this.set = new Set(words);
    this.words = [...this.set].sort();
  }

  has(word: string): boolean {
    return this.set.has(word.toLowerCase());
  }

  /** True if some word starts with `prefix` (the empty prefix is always true for a non-empty dictionary). */
  hasPrefix(prefix: string): boolean {
    const p = prefix.toLowerCase();
    let lo = 0;
    let hi = this.words.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.words[mid] < p) lo = mid + 1;
      else hi = mid;
    }
    return lo < this.words.length && this.words[lo].startsWith(p);
  }

  get size(): number {
    return this.words.length;
  }
}

export function dictionaryFromText(text: string): Dictionary {
  return new Dictionary(
    text
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean),
  );
}
