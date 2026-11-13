/** Games won, kept the way people keep score on paper: four strokes and a slash through them for every five. */
const MAX_MARKS = 20;

/** The SVG path for `n` tally marks, and the width it needs. */
export function tallyPath(n: number): { d: string; width: number } {
  let d = '';
  let x = 4;
  for (let i = 0; i < n; i++) {
    if (i % 5 === 4) {
      d += `M${x - 38} 25 L${x - 3} 6 `;
      x += 12;
    } else {
      d += `M${x} ${4 + (i % 2)} L${x + (i % 3) - 1} 27 `;
      x += 9;
    }
  }
  return { d, width: Math.max(x + 2, 12) };
}

export function Tally({ n }: { n: number }) {
  const label = `${n} ${n === 1 ? 'game' : 'games'} won`;
  if (n <= 0) {
    return (
      <span className="tally zero" role="img" aria-label={label}>
        –
      </span>
    );
  }
  if (n > MAX_MARKS) {
    return (
      <span className="tally count" role="img" aria-label={label}>
        {n}
      </span>
    );
  }
  const { d, width } = tallyPath(n);
  return (
    <svg className="tally" viewBox={`0 0 ${width} 31`} role="img" aria-label={label}>
      <path d={d} />
    </svg>
  );
}
