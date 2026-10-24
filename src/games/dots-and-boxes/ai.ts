import { boxesOfLine, createDots, type DotsState, sidesDrawn } from './engine';

/** How many boxes the opponent could grab greedily right after `line` is drawn. */
function giveAway(s: DotsState, line: number): number {
  const engine = createDots(s.rows, s.cols);
  let cur = engine.applyMove(s, line);
  if (!cur) return Number.POSITIVE_INFINITY;
  const mover = s.current;
  let given = 0;
  // The opponent keeps taking boxes while any box has 3 sides drawn.
  while (cur && cur.current !== mover) {
    const take = cur.boxes.findIndex((b, i) => b === null && sidesDrawn(cur as DotsState, i) === 3);
    if (take < 0) break;
    const missing = engine.legalMoves(cur).find((l) => boxesOfLine(s, l).includes(take));
    if (missing === undefined) break;
    cur = engine.applyMove(cur, missing);
    given++;
    if (!cur || cur.current === mover) break;
  }
  return given;
}

/** Take a box if possible; otherwise avoid the third side of a box; otherwise give away as little as possible. */
export function getBestMove(s: DotsState): number {
  const engine = createDots(s.rows, s.cols);
  const moves = engine.legalMoves(s);

  const capturing = moves.find((l) =>
    boxesOfLine(s, l).some((b) => s.boxes[b] === null && sidesDrawn(s, b) === 3),
  );
  if (capturing !== undefined) return capturing;

  const safe = moves.filter((l) => boxesOfLine(s, l).every((b) => sidesDrawn(s, b) < 2));
  if (safe.length) return safe[(s.lines.filter(Boolean).length * 7) % safe.length];

  let best = moves[0];
  let bestGiven = Number.POSITIVE_INFINITY;
  for (const l of moves) {
    const g = giveAway(s, l);
    if (g < bestGiven) {
      bestGiven = g;
      best = l;
    }
  }
  return best;
}
