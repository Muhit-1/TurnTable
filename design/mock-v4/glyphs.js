// One small drawing per game, 64×64. The page styles the classes:
//   .ln line   .sa / .sb  stroke in player 1 / player 2 colour
//   .a / .b    fill in player 1 / player 2 colour   .n neutral fill   .h hole   .tx lettering
(() => {
  const L = (x1, y1, x2, y2, c = 'ln') => `<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const C = (x, y, r, c = 'a') => `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`;
  const R = (x, y, w, h, c = 'n', rx = 0, rot = '') =>
    `<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"${rot ? ` transform="rotate(${rot})"` : ''}/>`;
  const P = (d, c = 'ln') => `<path class="${c}" d="${d}"/>`;
  const T = (x, y, s, size = 14) => `<text class="tx" x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${s}</text>`;
  const X = (x, y, r, c = 'sa') => L(x - r, y - r, x + r, y + r, c) + L(x + r, y - r, x - r, y + r, c);
  const grid = (n, from = 8, to = 56) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const p = from + ((to - from) * i) / (n - 1);
      s += L(p, from, p, to) + L(from, p, to, p);
    }
    return s;
  };
  const checker = (n) => {
    let s = R(8, 8, 48, 48, 'h');
    const w = 48 / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((r + c) % 2) s += R(8 + c * w, 8 + r * w, w, w, 'n');
    return s + R(8, 8, 48, 48, 'ln');
  };
  const hexagon = (x, y, r, c) => {
    const pts = [0, 1, 2, 3, 4, 5].map((k) => {
      const a = (Math.PI / 3) * k + Math.PI / 6;
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
    });
    return `<polygon class="${c}" points="${pts.join(' ')}"/>`;
  };
  const card = (x, y, c, rot = '') => R(x, y, 22, 30, c, 3, rot);

  const G = {
    'tic-tac-toe': () =>
      L(24, 8, 24, 56) + L(40, 8, 40, 56) + L(8, 24, 56, 24) + L(8, 40, 56, 40) + X(16, 16, 5) + C(32, 32, 5.5, 'sb') + X(48, 48, 5) + C(48, 16, 5.5, 'sb'),
    'connect-4': () => {
      let s = R(6, 12, 52, 42, 'n', 6);
      const fill = ['h', 'h', 'h', 'h', 'h', 'a', 'b', 'h', 'a', 'b', 'a', 'b'];
      for (let i = 0; i < 12; i++) s += C(14.5 + (i % 4) * 11.7, 22 + Math.floor(i / 4) * 11, 4.2, fill[i]);
      return s;
    },
    chess: () => checker(4) + P('M22 46 L19 25 L27 33 L32 20 L37 33 L45 25 L42 46 Z', 'a') + L(20, 50, 44, 50, 'sa'),
    checkers: () => checker(4) + C(26, 26, 5, 'a') + C(38, 38, 5, 'b') + C(50, 26, 5, 'a') + C(14, 38, 5, 'b'),
    reversi: () => R(8, 8, 48, 48, 'h') + grid(5) + C(26, 26, 5, 'a') + C(38, 38, 5, 'a') + C(38, 26, 5, 'b') + C(26, 38, 5, 'b'),
    gomoku: () => grid(5) + [0, 1, 2, 3, 4].map((i) => C(8 + i * 12, 56 - i * 12, 4.4, 'a')).join('') + C(20, 20, 4.4, 'b') + C(44, 44, 4.4, 'b'),
    go: () => grid(5) + C(32, 32, 4.6, 'a') + C(32, 20, 4.6, 'b') + C(20, 32, 4.6, 'b') + C(44, 32, 4.6, 'b') + C(32, 44, 4.6, 'sb'),
    'dots-and-boxes': () => {
      let s = R(24, 24, 16, 16, 'a') + L(8, 8, 24, 8, 'sa') + L(24, 8, 24, 24, 'sb') + L(24, 24, 40, 24, 'sa') + L(40, 24, 40, 40, 'sb') + L(24, 40, 40, 40, 'sa') + L(24, 24, 24, 40, 'sb') + L(40, 40, 56, 40, 'sb');
      for (let i = 0; i < 16; i++) s += C(8 + (i % 4) * 16, 8 + Math.floor(i / 4) * 16, 2.4, 'd');
      return s;
    },
    nim: () => [[32], [22, 32, 42], [12, 22, 32, 42, 52]].map((row, r) => row.map((x) => L(x, 10 + r * 17, x, 22 + r * 17, r === 1 ? 'sb' : 'sa')).join('')).join(''),
    'nine-mens-morris': () =>
      R(8, 8, 48, 48, 'ln') + R(18, 18, 28, 28, 'ln') + R(27, 27, 10, 10, 'ln') + L(32, 8, 32, 27) + L(32, 37, 32, 56) + L(8, 32, 27, 32) + L(37, 32, 56, 32) + C(8, 8, 4, 'a') + C(32, 8, 4, 'a') + C(56, 8, 4, 'a') + C(18, 46, 4, 'b') + C(46, 32, 4, 'b'),
    quarto: () => C(20, 20, 9, 'a') + R(35, 11, 18, 18, 'b') + C(20, 44, 9, 'sb') + R(35, 35, 18, 18, 'sa') + C(20, 20, 3, 'h'),
    hex: () => {
      const r = 8;
      const w = r * Math.sqrt(3);
      const cells = [[0, 0, 'a'], [1, 0, 'h'], [2, 0, 'b'], [0, 1, 'h'], [1, 1, 'a'], [2, 1, 'h'], [0, 2, 'b'], [1, 2, 'a'], [2, 2, 'h']];
      return cells.map(([c, row, cls]) => hexagon(15 + c * w + row * (w / 2), 16 + row * r * 1.5, r - 0.6, cls)).join('');
    },
    mancala: () => {
      let s = R(4, 16, 56, 32, 'n', 14) + R(8, 21, 7, 22, 'a', 3.5) + R(49, 21, 7, 22, 'b', 3.5);
      for (let i = 0; i < 8; i++) s += C(21 + (i % 4) * 7.4, 26 + Math.floor(i / 4) * 12, 2.9, 'h');
      return s;
    },
    backgammon: () => {
      let s = R(6, 8, 52, 48, 'h');
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 9.8;
        s += P(`M${x} 8 L${x + 9} 8 L${x + 4.5} 28 Z`, i % 2 ? 'a' : 'b') + P(`M${x} 56 L${x + 9} 56 L${x + 4.5} 36 Z`, i % 2 ? 'b' : 'a');
      }
      return s + R(6, 8, 52, 48, 'ln');
    },
    ludo: () => R(8, 8, 18, 18, 'a', 3) + R(38, 38, 18, 18, 'a', 3) + R(38, 8, 18, 18, 'b', 3) + R(8, 38, 18, 18, 'b', 3) + R(26, 8, 12, 48, 'ln') + R(8, 26, 48, 12, 'ln') + C(32, 32, 4, 'n'),
    'snakes-and-ladders': () =>
      grid(5) + L(16, 52, 26, 14, 'sa') + L(24, 52, 34, 14, 'sa') + L(18, 42, 27, 42, 'sa') + L(21, 32, 30, 32, 'sa') + L(24, 22, 32, 22, 'sa') + P('M50 12 C38 20 58 28 46 36 C38 42 52 46 44 54', 'sb'),
    yahtzee: () => R(8, 20, 26, 26, 'n', 5, '-8 21 33') + R(32, 14, 26, 26, 'a', 5, '10 45 27') + C(15, 28, 2.2, 'd') + C(21, 34, 2.2, 'd') + C(27, 40, 2.2, 'd') + C(40, 22, 2.2, 'd') + C(50, 32, 2.2, 'd'),
    battleship: () => grid(5) + R(10, 26, 34, 10, 'a', 5) + X(20, 44, 4, 'sb') + C(44, 14, 2.6, 'd') + X(50, 50, 4, 'sb'),
    hangman: () => L(10, 56, 40, 56) + L(18, 56, 18, 8) + L(18, 8, 42, 8) + L(42, 8, 42, 16) + C(42, 22, 6, 'sb') + L(42, 28, 42, 42, 'sb') + L(42, 32, 35, 38, 'sb') + L(46, 50, 52, 50, 'sa') + L(54, 50, 60, 50, 'sa'),
    war: () => card(12, 16, 'a', '-10 23 31') + card(30, 18, 'b', '10 41 33'),
    'go-fish': () => card(10, 20, 'n', '-18 21 35') + card(21, 15, 'a', '0 32 30') + card(32, 20, 'n', '18 43 35') + P('M24 30 C28 24 36 24 40 30 C36 36 28 36 24 30 Z M40 30 L45 26 L45 34 Z', 'h'),
    uno: () => card(14, 14, 'b', '-12 25 29') + card(28, 18, 'a', '8 39 33') + `<ellipse class="h" cx="39" cy="33" rx="6" ry="10" transform="rotate(30 39 33)"/>`,
    memory: () => {
      let s = '';
      for (let i = 0; i < 6; i++) s += R(8 + (i % 3) * 17, 12 + Math.floor(i / 3) * 22, 14, 18, i === 1 || i === 5 ? 'h' : 'n', 3);
      return s + C(32, 21, 3.4, 'a') + C(49, 43, 3.4, 'a');
    },
    'rock-paper-scissors': () => C(18, 22, 9, 'a') + R(34, 12, 18, 22, 'n', 2) + L(22, 40, 44, 56, 'sb') + L(44, 40, 22, 56, 'sb') + C(20, 38, 3, 'sb') + C(46, 38, 3, 'sb'),
    scrabble: () => R(6, 24, 17, 17, 'n', 3) + R(24, 24, 17, 17, 'a', 3) + R(42, 24, 17, 17, 'n', 3) + T(14.5, 37, 'W', 12) + T(32.5, 37, 'O', 12) + T(50.5, 37, 'W', 12),
    '20-questions': () => T(32, 42, '?', 38) + [0, 1, 2, 3, 4, 5, 6].map((i) => C(11 + i * 7, 54, 1.8, i < 4 ? 'a' : 'd')).join(''),
  };
  window.glyph = (id) => `<svg class="glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${(G[id] || G['tic-tac-toe'])()}</svg>`;
})();
