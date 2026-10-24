import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

/**
 * Squares are row * 8 + col with row 0 = rank 8 (top of the board, as in FEN) and col 0 = the a-file.
 * Pieces are numbers: type 1-6 (pawn, knight, bishop, rook, queen, king), +8 for black.
 * Player 1 is White (moves up the board, toward row 0), player 2 is Black.
 *
 * Draw rules are applied automatically: stalemate, insufficient material, fivefold-style simplification
 * (threefold repetition) and the fifty-move rule (100 plies without a pawn move or capture).
 */
export const EMPTY = 0;
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const typeOf = (code: number) => code & 7;
export const colorOf = (code: number): PlayerId => (code & 8 ? 2 : 1);
export const make = (color: PlayerId, type: number) => type | (color === 2 ? 8 : 0);

export const WK = 1;
export const WQ = 2;
export const BK = 4;
export const BQ = 8;

export interface ChessMove {
  from: number;
  to: number;
  /** piece type to promote to (2-5) */
  promotion?: number;
}

export interface ChessState {
  cells: number[];
  current: PlayerId;
  castling: number;
  /** en passant target square, or -1 */
  ep: number;
  halfmove: number;
  fullmove: number;
  /** position keys since the last pawn move or capture, including the current position */
  history: string[];
  /** the move that led here, for highlighting (null at the start) */
  lastMove: ChessMove | null;
  /** algebraic notation of every move played so far */
  san: string[];
}

export const sq = (row: number, col: number) => row * 8 + col;
export const rowOf = (s: number) => s >> 3;
export const colOf = (s: number) => s & 7;
export const squareName = (s: number) => `${'abcdefgh'[colOf(s)]}${8 - rowOf(s)}`;
export const parseSquare = (name: string) => sq(8 - Number(name[1]), 'abcdefgh'.indexOf(name[0]));

// --- precomputed geometry ---------------------------------------------------------------------

const offsets = (pairs: [number, number][]): number[][] =>
  Array.from({ length: 64 }, (_, s) =>
    pairs.flatMap(([dr, dc]) => {
      const r = rowOf(s) + dr;
      const c = colOf(s) + dc;
      return r >= 0 && r < 8 && c >= 0 && c < 8 ? [sq(r, c)] : [];
    }),
  );

const KNIGHT_TO = offsets([
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
]);
const KING_TO = offsets([
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]);

const ray = (s: number, dr: number, dc: number): number[] => {
  const out: number[] = [];
  for (let r = rowOf(s) + dr, c = colOf(s) + dc; r >= 0 && r < 8 && c >= 0 && c < 8; r += dr, c += dc)
    out.push(sq(r, c));
  return out;
};
const DIAG: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const STRAIGHT: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const BISHOP_RAYS = Array.from({ length: 64 }, (_, s) => DIAG.map(([dr, dc]) => ray(s, dr, dc)));
const ROOK_RAYS = Array.from({ length: 64 }, (_, s) => STRAIGHT.map(([dr, dc]) => ray(s, dr, dc)));

// --- attacks ----------------------------------------------------------------------------------

/** Is `square` attacked by any piece of `by`? */
export function isAttacked(cells: number[], square: number, by: PlayerId): boolean {
  const own = (t: number) => make(by, t);
  // pawns: a white pawn attacks up the board (toward row 0), so it sits one row below the target
  const pr = rowOf(square) + (by === 1 ? 1 : -1);
  if (pr >= 0 && pr < 8) {
    const c = colOf(square);
    if (c > 0 && cells[sq(pr, c - 1)] === own(PAWN)) return true;
    if (c < 7 && cells[sq(pr, c + 1)] === own(PAWN)) return true;
  }
  for (const t of KNIGHT_TO[square]) if (cells[t] === own(KNIGHT)) return true;
  for (const t of KING_TO[square]) if (cells[t] === own(KING)) return true;
  for (const r of BISHOP_RAYS[square]) {
    for (const t of r) {
      const p = cells[t];
      if (p === EMPTY) continue;
      if (p === own(BISHOP) || p === own(QUEEN)) return true;
      break;
    }
  }
  for (const r of ROOK_RAYS[square]) {
    for (const t of r) {
      const p = cells[t];
      if (p === EMPTY) continue;
      if (p === own(ROOK) || p === own(QUEEN)) return true;
      break;
    }
  }
  return false;
}

export const kingSquare = (cells: number[], color: PlayerId) => cells.indexOf(make(color, KING));
export const inCheck = (s: ChessState, color: PlayerId = s.current) => {
  const k = kingSquare(s.cells, color);
  return k >= 0 && isAttacked(s.cells, k, color === 1 ? 2 : 1);
};

// --- move generation --------------------------------------------------------------------------

const PROMOTIONS = [QUEEN, ROOK, BISHOP, KNIGHT];

function pseudoMoves(s: ChessState): ChessMove[] {
  const { cells, current: me } = s;
  const opp: PlayerId = me === 1 ? 2 : 1;
  const moves: ChessMove[] = [];
  const add = (from: number, to: number) => moves.push({ from, to });

  for (let from = 0; from < 64; from++) {
    const piece = cells[from];
    if (piece === EMPTY || colorOf(piece) !== me) continue;
    const t = typeOf(piece);
    if (t === PAWN) {
      const dir = me === 1 ? -1 : 1;
      const startRow = me === 1 ? 6 : 1;
      const lastRow = me === 1 ? 0 : 7;
      const r = rowOf(from);
      const c = colOf(from);
      const push = (to: number) => {
        if (rowOf(to) === lastRow) for (const promotion of PROMOTIONS) moves.push({ from, to, promotion });
        else add(from, to);
      };
      const one = sq(r + dir, c);
      if (cells[one] === EMPTY) {
        push(one);
        if (r === startRow && cells[sq(r + 2 * dir, c)] === EMPTY) add(from, sq(r + 2 * dir, c));
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc;
        if (cc < 0 || cc > 7) continue;
        const to = sq(r + dir, cc);
        if (cells[to] !== EMPTY && colorOf(cells[to]) === opp) push(to);
        else if (to === s.ep) add(from, to);
      }
    } else if (t === KNIGHT || t === KING) {
      for (const to of t === KNIGHT ? KNIGHT_TO[from] : KING_TO[from]) {
        if (cells[to] === EMPTY || colorOf(cells[to]) === opp) add(from, to);
      }
      if (t === KING) addCastling(s, from, moves);
    } else {
      const rays =
        t === BISHOP
          ? BISHOP_RAYS[from]
          : t === ROOK
            ? ROOK_RAYS[from]
            : [...BISHOP_RAYS[from], ...ROOK_RAYS[from]];
      for (const r of rays) {
        for (const to of r) {
          if (cells[to] === EMPTY) add(from, to);
          else {
            if (colorOf(cells[to]) === opp) add(from, to);
            break;
          }
        }
      }
    }
  }
  return moves;
}

function addCastling(s: ChessState, from: number, moves: ChessMove[]) {
  const me = s.current;
  const opp: PlayerId = me === 1 ? 2 : 1;
  const home = me === 1 ? 60 : 4;
  if (from !== home) return;
  const { cells } = s;
  const kingSide = me === 1 ? WK : BK;
  const queenSide = me === 1 ? WQ : BQ;
  const safe = (...squares: number[]) => squares.every((x) => !isAttacked(cells, x, opp));
  if (
    s.castling & kingSide &&
    cells[home + 1] === EMPTY &&
    cells[home + 2] === EMPTY &&
    cells[home + 3] === make(me, ROOK)
  ) {
    if (safe(home, home + 1, home + 2)) moves.push({ from, to: home + 2 });
  }
  if (
    s.castling & queenSide &&
    cells[home - 1] === EMPTY &&
    cells[home - 2] === EMPTY &&
    cells[home - 3] === EMPTY &&
    cells[home - 4] === make(me, ROOK)
  ) {
    if (safe(home, home - 1, home - 2)) moves.push({ from, to: home - 2 });
  }
}

/** Applies a move that is already known to be pseudo-legal. Does not update `history`. */
export function makeMove(s: ChessState, m: ChessMove): ChessState {
  const cells = s.cells.slice();
  const piece = cells[m.from];
  const me = colorOf(piece);
  const t = typeOf(piece);
  let captured = cells[m.to];
  if (t === PAWN && m.to === s.ep && captured === EMPTY && colOf(m.from) !== colOf(m.to)) {
    const victim = me === 1 ? m.to + 8 : m.to - 8;
    captured = cells[victim];
    cells[victim] = EMPTY;
  }
  if (t === KING && Math.abs(m.to - m.from) === 2) {
    const kingSide = m.to > m.from;
    const rookFrom = kingSide ? m.from + 3 : m.from - 4;
    const rookTo = kingSide ? m.from + 1 : m.from - 1;
    cells[rookTo] = cells[rookFrom];
    cells[rookFrom] = EMPTY;
  }
  cells[m.to] = m.promotion ? make(me, m.promotion) : piece;
  cells[m.from] = EMPTY;

  let castling = s.castling;
  if (t === KING) castling &= me === 1 ? ~(WK | WQ) : ~(BK | BQ);
  for (const x of [m.from, m.to]) {
    if (x === 63) castling &= ~WK;
    else if (x === 56) castling &= ~WQ;
    else if (x === 7) castling &= ~BK;
    else if (x === 0) castling &= ~BQ;
  }
  return {
    cells,
    current: me === 1 ? 2 : 1,
    castling,
    ep: t === PAWN && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) >> 1 : -1,
    halfmove: t === PAWN || captured !== EMPTY ? 0 : s.halfmove + 1,
    fullmove: s.fullmove + (me === 2 ? 1 : 0),
    history: s.history,
    lastMove: m,
    san: s.san,
  };
}

export function legalMoves(s: ChessState): ChessMove[] {
  const me = s.current;
  const opp: PlayerId = me === 1 ? 2 : 1;
  const out: ChessMove[] = [];
  for (const m of pseudoMoves(s)) {
    const n = makeMove(s, m);
    const k = kingSquare(n.cells, me);
    if (k >= 0 && !isAttacked(n.cells, k, opp)) out.push(m);
  }
  return out;
}

// --- FEN --------------------------------------------------------------------------------------

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FEN_PIECES = 'pnbrqk';

export function positionKey(s: ChessState): string {
  let key = '';
  for (const c of s.cells) key += String.fromCharCode(97 + c);
  // an en passant square only matters when some pawn could actually capture there
  let epOk = '-';
  if (s.ep >= 0) {
    const mine = s.current;
    const dir = mine === 1 ? 1 : -1;
    for (const dc of [-1, 1]) {
      const c = colOf(s.ep) + dc;
      if (c >= 0 && c < 8 && s.cells[sq(rowOf(s.ep) + dir, c)] === make(mine, PAWN)) epOk = String(s.ep);
    }
  }
  return `${key}${s.current}${s.castling}${epOk}`;
}

export function fromFen(fen: string): ChessState {
  const [placement, side, castle, ep, half = '0', full = '1'] = fen.trim().split(/\s+/);
  const cells = Array<number>(64).fill(EMPTY);
  placement.split('/').forEach((rank, r) => {
    let c = 0;
    for (const ch of rank) {
      if (/\d/.test(ch)) c += Number(ch);
      else {
        const type = FEN_PIECES.indexOf(ch.toLowerCase()) + 1;
        cells[sq(r, c++)] = make(ch === ch.toLowerCase() ? 2 : 1, type);
      }
    }
  });
  let castling = 0;
  if (castle.includes('K')) castling |= WK;
  if (castle.includes('Q')) castling |= WQ;
  if (castle.includes('k')) castling |= BK;
  if (castle.includes('q')) castling |= BQ;
  const s: ChessState = {
    cells,
    current: side === 'b' ? 2 : 1,
    castling,
    ep: ep === '-' ? -1 : parseSquare(ep),
    halfmove: Number(half),
    fullmove: Number(full),
    history: [],
    lastMove: null,
    san: [],
  };
  return { ...s, history: [positionKey(s)] };
}

export function toFen(s: ChessState): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = '';
    let gap = 0;
    for (let c = 0; c < 8; c++) {
      const p = s.cells[sq(r, c)];
      if (p === EMPTY) gap++;
      else {
        if (gap) row += gap;
        gap = 0;
        const ch = FEN_PIECES[typeOf(p) - 1];
        row += colorOf(p) === 1 ? ch.toUpperCase() : ch;
      }
    }
    rows.push(row + (gap || ''));
  }
  const castle =
    `${s.castling & WK ? 'K' : ''}${s.castling & WQ ? 'Q' : ''}${s.castling & BK ? 'k' : ''}${s.castling & BQ ? 'q' : ''}` ||
    '-';
  return `${rows.join('/')} ${s.current === 1 ? 'w' : 'b'} ${castle} ${s.ep >= 0 ? squareName(s.ep) : '-'} ${s.halfmove} ${s.fullmove}`;
}

/** Number of leaf positions after `depth` plies; the standard test for move generator correctness. */
export function perft(s: ChessState, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(s);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(makeMove(s, m), depth - 1);
  return n;
}

// --- game status ------------------------------------------------------------------------------

export type EndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient material'
  | 'fifty-move rule'
  | 'threefold repetition';

function insufficientMaterial(cells: number[]): boolean {
  const minors: { type: number; color: PlayerId; squareColor: number }[] = [];
  for (let i = 0; i < 64; i++) {
    const p = cells[i];
    if (p === EMPTY || typeOf(p) === KING) continue;
    const t = typeOf(p);
    if (t === PAWN || t === ROOK || t === QUEEN) return false;
    minors.push({ type: t, color: colorOf(p), squareColor: (rowOf(i) + colOf(i)) % 2 });
  }
  if (minors.length <= 1) return true; // K v K, K+B v K, K+N v K
  // only bishops, all on the same colour of square
  return minors.every((m) => m.type === BISHOP && m.squareColor === minors[0].squareColor);
}

export function endReason(s: ChessState): EndReason | null {
  if (legalMoves(s).length === 0) return inCheck(s) ? 'checkmate' : 'stalemate';
  if (insufficientMaterial(s.cells)) return 'insufficient material';
  if (s.halfmove >= 100) return 'fifty-move rule';
  const key = s.history[s.history.length - 1];
  if (s.history.filter((k) => k === key).length >= 3) return 'threefold repetition';
  return null;
}

// --- notation ---------------------------------------------------------------------------------

/** Standard algebraic notation for `m` in position `s` (assumes the move is legal). */
export function toSan(s: ChessState, m: ChessMove): string {
  const piece = s.cells[m.from];
  const t = typeOf(piece);
  const isCapture = s.cells[m.to] !== EMPTY || (t === PAWN && colOf(m.from) !== colOf(m.to));
  let san: string;
  if (t === KING && Math.abs(m.to - m.from) === 2) san = m.to > m.from ? 'O-O' : 'O-O-O';
  else {
    const letter = t === PAWN ? '' : 'PNBRQK'[t - 1];
    let from = '';
    if (t === PAWN) from = isCapture ? 'abcdefgh'[colOf(m.from)] : '';
    else {
      const rivals = legalMoves(s).filter(
        (o) => o.to === m.to && o.from !== m.from && s.cells[o.from] === piece,
      );
      if (rivals.length) {
        const sameFile = rivals.some((o) => colOf(o.from) === colOf(m.from));
        const sameRank = rivals.some((o) => rowOf(o.from) === rowOf(m.from));
        if (!sameFile) from = 'abcdefgh'[colOf(m.from)];
        else if (!sameRank) from = String(8 - rowOf(m.from));
        else from = squareName(m.from);
      }
    }
    san = `${letter}${from}${isCapture ? 'x' : ''}${squareName(m.to)}${m.promotion ? `=${'PNBRQK'[m.promotion - 1]}` : ''}`;
  }
  const after = makeMove(s, m);
  if (inCheck(after)) san += legalMoves(after).length === 0 ? '#' : '+';
  return san;
}

// --- engine -----------------------------------------------------------------------------------

export const chessEngine: GameEngine<ChessState, ChessMove> = {
  initialState: () => fromFen(START_FEN),
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (endReason(s) ? [] : legalMoves(s)),
  applyMove(s, move) {
    if (!move || endReason(s)) return null;
    const m = legalMoves(s).find(
      (x) => x.from === move.from && x.to === move.to && (x.promotion ?? 0) === (move.promotion ?? 0),
    );
    if (!m) return null;
    const next = makeMove(s, m);
    const key = positionKey(next);
    const irreversible = next.halfmove === 0;
    return { ...next, history: irreversible ? [key] : [...s.history, key], san: [...s.san, toSan(s, m)] };
  },
  getStatus(s): Outcome {
    const reason = endReason(s);
    if (!reason) return { state: 'playing' };
    if (reason === 'checkmate') return { state: 'won', winner: s.current === 1 ? 2 : 1 };
    return { state: 'draw' };
  },
};
