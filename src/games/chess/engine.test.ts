import { describe, expect, it } from 'vitest';
import {
  type ChessMove,
  type ChessState,
  chessEngine as e,
  endReason,
  fromFen,
  inCheck,
  legalMoves,
  makeMove,
  parseSquare,
  perft,
  START_FEN,
  squareName,
  toFen,
  toSan,
} from './engine';

const mv = (from: string, to: string, promotion?: number): ChessMove => ({
  from: parseSquare(from),
  to: parseSquare(to),
  promotion,
});
const play = (s: ChessState, ...moves: [string, string, number?][]) => {
  let cur = s;
  for (const [a, b, p] of moves) {
    const n = e.applyMove(cur, mv(a, b, p));
    if (!n) throw new Error(`illegal ${a}${b}`);
    cur = n;
  }
  return cur;
};

describe('fen round trip and squares', () => {
  it('parses and prints the starting position', () => {
    const s = fromFen(START_FEN);
    expect(toFen(s)).toBe(START_FEN);
    expect(s.cells.filter(Boolean)).toHaveLength(32);
    expect(squareName(parseSquare('e4'))).toBe('e4');
    expect(parseSquare('a8')).toBe(0);
    expect(parseSquare('h1')).toBe(63);
  });

  it('round-trips awkward positions', () => {
    for (const fen of [
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    ])
      expect(toFen(fromFen(fen))).toBe(fen);
  });
});

describe('move generation (perft against known node counts)', () => {
  const cases: [string, string, number[]][] = [
    ['starting position', START_FEN, [20, 400, 8902, 197281]],
    [
      'kiwipete (castling, pins, ep)',
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      [48, 2039, 97862],
    ],
    ['endgame with en passant pins', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
    [
      'promotions and checks',
      'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
      [6, 264, 9467],
    ],
    ['mixed tactics', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ];
  for (const [name, fen, counts] of cases) {
    it(name, () => {
      const s = fromFen(fen);
      counts.forEach((n, i) => expect(perft(s, i + 1), `depth ${i + 1}`).toBe(n));
    }, 60000);
  }
});

describe('special moves', () => {
  it('castles on both sides, moving the rook, and loses the rights afterwards', () => {
    const s = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const k = e.applyMove(s, mv('e1', 'g1')) as ChessState;
    expect(k.cells[parseSquare('g1')]).toBe(6);
    expect(k.cells[parseSquare('f1')]).toBe(4);
    expect(k.cells[parseSquare('h1')]).toBe(0);
    expect(k.castling & 3).toBe(0);
    const q = e.applyMove(s, mv('e1', 'c1')) as ChessState;
    expect(q.cells[parseSquare('d1')]).toBe(4);
    expect(q.cells[parseSquare('a1')]).toBe(0);
    expect(toSan(s, mv('e1', 'g1'))).toBe('O-O');
    expect(toSan(s, mv('e1', 'c1'))).toBe('O-O-O');
  });

  it('cannot castle out of, through or into check, or with pieces in the way', () => {
    const base = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const hasCastle = (fen: string) =>
      legalMoves(fromFen(fen)).some((m) => m.from === parseSquare('e1') && Math.abs(m.to - m.from) === 2);
    expect(hasCastle(base)).toBe(true);
    expect(hasCastle('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1')).toBe(false); // black to move
    expect(hasCastle('4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1')).toBe(false); // in check from e8
    expect(hasCastle('5rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1')).toBe(true); // queenside still fine
    const through = legalMoves(fromFen('5rk1/8/8/8/8/8/8/R3K2R w K - 0 1')).filter(
      (m) => m.to === parseSquare('g1') && m.from === parseSquare('e1'),
    );
    expect(through).toEqual([]); // f1 is attacked
    expect(hasCastle('r3k2r/8/8/8/8/8/8/R2QK2R w Q - 0 1')).toBe(false); // d1 occupied
    expect(hasCastle('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1')).toBe(false); // no rights
  });

  it('moving a rook or capturing it removes that castling right', () => {
    const s = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect((e.applyMove(s, mv('a1', 'a2')) as ChessState).castling).toBe(1 | 4 | 8);
    const captured = fromFen('r3k2r/8/8/8/8/8/8/R3K2B b KQkq - 0 1');
    expect(
      (e.applyMove(fromFen('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1'), mv('h8', 'h1')) as ChessState).castling &
        1,
    ).toBe(0);
    expect(captured.castling).toBe(15);
  });

  it('en passant captures the pawn and only on the very next move', () => {
    let s = fromFen('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1');
    s = play(s, ['e2', 'e4']);
    expect(s.ep).toBe(parseSquare('e3'));
    const n = e.applyMove(s, mv('d4', 'e3')) as ChessState;
    expect(n.cells[parseSquare('e4')]).toBe(0); // the pawn that moved two squares is gone
    expect(n.cells[parseSquare('e3')]).toBe(9);
    // after another move the right is gone
    const later = play(s, ['e8', 'e7'], ['e1', 'e2']);
    expect(legalMoves(later).some((m) => m.to === parseSquare('e3') && m.from === parseSquare('d4'))).toBe(
      false,
    );
  });

  it('en passant is illegal when it would expose the king', () => {
    const s = fromFen('8/8/8/KPp4r/8/8/8/7k w - c6 0 1');
    expect(legalMoves(s).some((m) => m.from === parseSquare('b5') && m.to === parseSquare('c6'))).toBe(false);
  });

  it('promotes to each piece type; promotion must be specified and valid', () => {
    const s = fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    const moves = legalMoves(s).filter((m) => m.from === parseSquare('a7'));
    expect(moves.map((m) => m.promotion).sort()).toEqual([2, 3, 4, 5]);
    expect((e.applyMove(s, mv('a7', 'a8', 5)) as ChessState).cells[0]).toBe(5);
    expect((e.applyMove(s, mv('a7', 'a8', 2)) as ChessState).cells[0]).toBe(2);
    expect(e.applyMove(s, mv('a7', 'a8'))).toBeNull();
    expect(e.applyMove(s, mv('a7', 'a8', 6))).toBeNull();
    expect(toSan(s, mv('a7', 'a8', 5))).toBe('a8=Q');
  });

  it('black promotes on rank 1', () => {
    const s = fromFen('7k/8/8/8/8/8/p7/K7 b - - 0 1');
    expect(e.applyMove(s, mv('a2', 'a1', 5)) as ChessState).toBeNull(); // a1 is occupied by the white king
    const free = fromFen('7k/8/8/8/8/8/p7/7K b - - 0 1');
    expect((e.applyMove(free, mv('a2', 'a1', 5)) as ChessState).cells[56]).toBe(13);
  });
});

describe('check, pins and legality', () => {
  it('a pinned piece cannot leave the pin line', () => {
    const s = fromFen('4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1');
    expect(legalMoves(s).filter((m) => m.from === parseSquare('e2'))).toEqual([]);
  });

  it('must escape check; only checking-resolving moves are legal', () => {
    const s = fromFen('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
    expect(inCheck(s)).toBe(true);
    const moves = legalMoves(s)
      .map((m) => squareName(m.to))
      .sort();
    expect(moves).toEqual(['d1', 'e2', 'f1'].sort()); // capture the rook or step to a safe square
  });

  it('rejects moves that leave the king in check, wrong colour, empty squares and nonsense', () => {
    const s = fromFen(START_FEN);
    expect(e.applyMove(s, mv('e7', 'e5'))).toBeNull(); // black piece
    expect(e.applyMove(s, mv('e3', 'e4'))).toBeNull(); // empty square
    expect(e.applyMove(s, mv('e1', 'e2'))).toBeNull(); // blocked
    expect(e.applyMove(s, mv('b1', 'b3'))).toBeNull();
    expect(e.applyMove(s, { from: 99, to: 3 })).toBeNull();
  });
});

describe('game end', () => {
  it("detects fool's mate", () => {
    const s = play(fromFen(START_FEN), ['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']);
    expect(endReason(s)).toBe('checkmate');
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 2 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, mv('a2', 'a3'))).toBeNull();
  });

  it('detects stalemate as a draw', () => {
    const s = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(endReason(s)).toBe('stalemate');
    expect(e.getStatus(s)).toEqual({ state: 'draw' });
  });

  it('detects insufficient material', () => {
    for (const fen of [
      '8/8/8/4k3/8/8/8/4K3 w - - 0 1',
      '8/8/8/4k3/8/8/3N4/4K3 w - - 0 1',
      '8/8/8/4k3/8/8/3B4/4K3 b - - 0 1',
      '8/8/8/2b1k3/8/8/3B4/4K3 w - - 0 1',
    ]) {
      expect(endReason(fromFen(fen)), fen).toBe('insufficient material');
    }
    // same-coloured bishops draw, opposite-coloured bishops do not, and any pawn/rook/queen keeps the game alive
    expect(endReason(fromFen('8/8/8/4k3/8/5b2/3B4/4K3 w - - 0 1'))).toBeNull();
    expect(endReason(fromFen('8/8/8/4k3/8/8/3P4/4K3 w - - 0 1'))).toBeNull();
    expect(endReason(fromFen('8/8/8/4k3/8/8/3NN3/4K3 w - - 0 1'))).toBeNull();
  });

  it('fifty-move rule after 100 plies without a pawn move or capture', () => {
    expect(endReason(fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 99 80'))).toBeNull();
    expect(endReason(fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 100 80'))).toBe('fifty-move rule');
  });

  it('threefold repetition by shuffling knights', () => {
    let s = fromFen('4k1n1/8/8/8/8/8/8/4K1N1 w - - 0 1');
    for (let i = 0; i < 2; i++) s = play(s, ['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']);
    expect(endReason(s)).toBe('threefold repetition');
    expect(e.getStatus(s)).toEqual({ state: 'draw' });
  });

  it('a pawn move resets the repetition history', () => {
    let s = play(fromFen(START_FEN), ['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']);
    expect(s.history.length).toBe(5);
    s = play(s, ['e2', 'e4']);
    expect(s.history.length).toBe(1);
    expect(s.halfmove).toBe(0);
  });
});

describe('notation', () => {
  it('writes standard algebraic notation with disambiguation, captures and check/mate', () => {
    const s = fromFen(START_FEN);
    expect(toSan(s, mv('e2', 'e4'))).toBe('e4');
    expect(toSan(s, mv('g1', 'f3'))).toBe('Nf3');
    const cap = fromFen('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    expect(toSan(cap, mv('e4', 'd5'))).toBe('exd5');
    const two = fromFen('4k3/8/8/8/8/8/8/R4R1K w - - 0 1');
    expect(toSan(two, mv('a1', 'd1'))).toBe('Rad1');
    const rank = fromFen('4k3/R7/8/8/8/8/R7/4K3 w - - 0 1');
    expect(toSan(rank, mv('a7', 'a4'))).toBe('R7a4');
    const mate = play(fromFen(START_FEN), ['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4']);
    expect(toSan(mate, mv('d8', 'h4'))).toBe('Qh4#');
    expect(toSan(fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'), mv('a1', 'a8'))).toBe('Ra8+');
  });
});

describe('immutability and history', () => {
  it('applyMove never mutates the previous state', () => {
    const s = fromFen(START_FEN);
    const copy = JSON.stringify(s);
    e.applyMove(s, mv('e2', 'e4'));
    expect(JSON.stringify(s)).toBe(copy);
  });

  it('makeMove updates clocks: fullmove after black, halfmove resets on pawn moves and captures', () => {
    const s = fromFen(START_FEN);
    const a = makeMove(s, mv('g1', 'f3'));
    expect(a.halfmove).toBe(1);
    expect(a.fullmove).toBe(1);
    const b = makeMove(a, mv('b8', 'c6'));
    expect(b.fullmove).toBe(2);
    expect(makeMove(b, mv('e2', 'e4')).halfmove).toBe(0);
  });
});
