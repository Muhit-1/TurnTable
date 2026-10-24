import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

/**
 * Grid of `rows` x `cols` boxes (so rows+1 x cols+1 dots).
 * Lines are numbered: horizontal lines first (row-major, (rows+1) x cols), then vertical lines (rows x (cols+1)).
 */
export interface Dims {
  rows: number;
  cols: number;
}

export interface DotsState extends Dims {
  /** who drew each line, or null */
  lines: (PlayerId | null)[];
  /** who owns each box, or null */
  boxes: (PlayerId | null)[];
  current: PlayerId;
  score: Record<PlayerId, number>;
  /** the player who just completed a box and so moves again */
  extraTurn: boolean;
}

export const hCount = ({ rows, cols }: Dims) => (rows + 1) * cols;
export const vCount = ({ rows, cols }: Dims) => rows * (cols + 1);
export const lineCount = (d: Dims) => hCount(d) + vCount(d);

export const hLine = (d: Dims, r: number, c: number) => r * d.cols + c; // r in 0..rows, c in 0..cols-1
export const vLine = (d: Dims, r: number, c: number) => hCount(d) + r * (d.cols + 1) + c; // r in 0..rows-1, c in 0..cols

/** The four sides of the box at (r, c): top, bottom, left, right. */
export function sidesOf(d: Dims, r: number, c: number): number[] {
  return [hLine(d, r, c), hLine(d, r + 1, c), vLine(d, r, c), vLine(d, r, c + 1)];
}

/** Boxes (row-major indices) that touch a line. */
export function boxesOfLine(d: Dims, line: number): number[] {
  const out: number[] = [];
  if (line < hCount(d)) {
    const r = Math.floor(line / d.cols);
    const c = line % d.cols;
    if (r > 0) out.push((r - 1) * d.cols + c);
    if (r < d.rows) out.push(r * d.cols + c);
  } else {
    const k = line - hCount(d);
    const r = Math.floor(k / (d.cols + 1));
    const c = k % (d.cols + 1);
    if (c > 0) out.push(r * d.cols + (c - 1));
    if (c < d.cols) out.push(r * d.cols + c);
  }
  return out;
}

export const sidesDrawn = (s: DotsState, box: number) =>
  sidesOf(s, Math.floor(box / s.cols), box % s.cols).filter((l) => s.lines[l] !== null).length;

export function createDots(rows = 4, cols = 4): GameEngine<DotsState, number> {
  const dims = { rows, cols };
  const isOver = (s: DotsState) => s.boxes.every((b) => b !== null);
  return {
    initialState: () => ({
      ...dims,
      lines: Array(lineCount(dims)).fill(null),
      boxes: Array(rows * cols).fill(null),
      current: 1,
      score: { 1: 0, 2: 0 },
      extraTurn: false,
    }),
    currentPlayer: (s) => s.current,
    legalMoves: (s) => (isOver(s) ? [] : s.lines.flatMap((l, i) => (l === null ? [i] : []))),
    applyMove(s, line) {
      if (
        isOver(s) ||
        !Number.isInteger(line) ||
        line < 0 ||
        line >= s.lines.length ||
        s.lines[line] !== null
      ) {
        return null;
      }
      const lines = s.lines.slice();
      lines[line] = s.current;
      const boxes = s.boxes.slice();
      let gained = 0;
      const next: DotsState = { ...s, lines, boxes };
      for (const b of boxesOfLine(s, line)) {
        if (boxes[b] === null && sidesDrawn(next, b) === 4) {
          boxes[b] = s.current;
          gained++;
        }
      }
      const score = { ...s.score, [s.current]: s.score[s.current] + gained };
      const done = boxes.every((b) => b !== null);
      const extra = gained > 0 && !done;
      return {
        ...s,
        lines,
        boxes,
        score,
        extraTurn: extra,
        current: gained > 0 ? s.current : s.current === 1 ? 2 : 1,
      };
    },
    getStatus(s): Outcome {
      if (!isOver(s)) return { state: 'playing' };
      if (s.score[1] === s.score[2]) return { state: 'draw' };
      return { state: 'won', winner: s.score[1] > s.score[2] ? 1 : 2 };
    },
  };
}

export const dotsEngine = createDots(4, 4);
