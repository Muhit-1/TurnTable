import type { Outcome } from '../../shared/engine';

/** The result token PGN uses: white wins, black wins, a draw, or still being played. */
export function pgnResult(status: Outcome): '1-0' | '0-1' | '1/2-1/2' | '*' {
  if (status.state === 'draw') return '1/2-1/2';
  if (status.state === 'won') return status.winner === 1 ? '1-0' : '0-1';
  return '*';
}

/**
 * The game as PGN text, which other chess programs and sites can open.
 * `san` is the list of moves in standard notation, white's move first.
 */
export function toPgn(
  san: readonly string[],
  status: Outcome,
  names: { 1: string; 2: string },
  date: Date = new Date(),
): string {
  const result = pgnResult(status);
  const pad = (n: number) => String(n).padStart(2, '0');
  const quote = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const tags = [
    ['Event', 'TurnTable game'],
    ['Site', 'TurnTable'],
    ['Date', `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`],
    ['Round', '-'],
    ['White', names[1]],
    ['Black', names[2]],
    ['Result', result],
  ].map(([k, v]) => `[${k} "${quote(v)}"]`);

  const words: string[] = [];
  san.forEach((move, i) => {
    if (i % 2 === 0) words.push(`${i / 2 + 1}.`);
    words.push(move);
  });
  words.push(result);
  // PGN lines are kept under 80 characters.
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && line.length + 1 + w.length > 79) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return `${tags.join('\n')}\n\n${lines.join('\n')}\n`;
}
