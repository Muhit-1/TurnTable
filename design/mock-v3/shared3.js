/* Mock-only behaviour: menu, rules dialog, table colour, homepage filters + pointer, and small playable versions of each board. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ---- chrome ---- */
  var menu = $('.menu');
  if (menu) {
    document.addEventListener('pointerdown', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.open = false; });
  }
  var key = 'tt-mock3-table', saved = null; try { saved = localStorage.getItem(key); } catch (e) {}
  if (saved) document.body.dataset.table = saved;
  $$('.swatch').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.dataset.table === document.body.dataset.table));
    b.addEventListener('click', function () {
      document.body.dataset.table = b.dataset.table; try { localStorage.setItem(key, b.dataset.table); } catch (e) {}
      $$('.swatch').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  var dlg = $('dialog.rules');
  if (dlg) {
    $$('[data-open-rules]').forEach(function (b) { b.addEventListener('click', function () { dlg.showModal(); }); });
    $$('[data-close-rules]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.addEventListener('keydown', function (e) { if (e.key === '?' && !dlg.open) dlg.showModal(); });
  }

  /* ---- homepage ---- */
  var grid = $('#grid');
  if (grid) {
    var cards = $$('.icd-card', grid), cat = 'all', q = '', rule = $('.rule i');
    var point = function () {
      var on = $('[data-filter][aria-pressed="true"]'); if (!on || !rule) return;
      var r = on.getBoundingClientRect(), p = rule.parentNode.getBoundingClientRect();
      rule.style.left = (r.left + r.width / 2 - p.left) + 'px';
    };
    var apply = function () {
      var n = 0;
      cards.forEach(function (c) { var ok = (cat === 'all' || c.dataset.category === cat) && (!q || c.textContent.toLowerCase().indexOf(q) > -1); c.hidden = !ok; if (ok) n++; });
      $('#empty').hidden = n > 0;
    };
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { cat = b.dataset.filter; $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); apply(); point(); });
    });
    $('#search').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); apply(); });
    window.addEventListener('resize', point); document.fonts && document.fonts.ready.then(point); point();
    return;
  }

  /* ---- game pages ---- */
  var game = document.body.dataset.game, boardEl = $('#board');
  if (!boardEl) return;
  var turn = 1, over = false, names = JSON.parse(document.body.dataset.names);
  var setTurn = function (t, text) {
    turn = t; document.body.dataset.turn = t;
    $$('.player').forEach(function (p) { p.classList.toggle('active', +p.dataset.side === t); });
    $('#who').textContent = text || (names[t - 1] + ' to move');
  };
  var score = function (i, n) { var b = $('.player[data-side="' + i + '"] b'); if (b) b.textContent = n; };
  var stats = function (rows) { var s = $('#stats'); if (s) s.innerHTML = rows.map(function (r) { return '<div class="stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join(''); };
  var logList = function (rows) { var l = $('#log'); if (!l) return; l.innerHTML = rows.map(function (m, n) { return '<li><b>' + (n + 1) + '</b><span>' + m[0] + '</span><span>' + (m[1] || '') + '</span></li>'; }).join(''); l.scrollTop = l.scrollHeight; var c = $('#count'); if (c) c.textContent = rows.length; };
  var restartFn = function () {};
  $('#restart').addEventListener('click', function () { restartFn(); });

  var G = {};

  /* chess */
  G.chess = function () {
    var S = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    var fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R', cells, sel, moves, files = 'abcdefgh';
    var nm = function (i) { return files[i % 8] + (8 - Math.floor(i / 8)); }, white = function (c) { return c === c.toUpperCase(); };
    var init = function () { cells = []; fen.split('/').forEach(function (r) { r.split('').forEach(function (ch) { if (/\d/.test(ch)) for (var i = 0; i < +ch; i++) cells.push(''); else cells.push(ch); }); }); sel = -1; moves = [['e4', 'e5'], ['Nf3', 'Nc6']]; setTurn(1); draw(); };
    var draw = function () {
      boardEl.innerHTML = ''; boardEl.className = 'board g8';
      cells.forEach(function (c, i) {
        var q = el('button', 'cell sq ' + (((i % 8) + Math.floor(i / 8)) % 2 ? 'dk' : 'lt') + (i === sel ? ' sel' : '')); q.type = 'button';
        q.setAttribute('aria-label', nm(i) + (c ? ', ' + (white(c) ? 'white' : 'black') + ' piece' : ''));
        if (c) q.appendChild(el('span', 'pc ' + (white(c) ? 'w' : 'b'), S[c] + '︎'));
        if (i % 8 === 0) q.appendChild(el('i', 'co r', 8 - Math.floor(i / 8)));
        if (Math.floor(i / 8) === 7) q.appendChild(el('i', 'co f', files[i % 8]));
        q.addEventListener('click', function () { click(i); }); boardEl.appendChild(q);
      });
      logList(moves);
    };
    var click = function (i) {
      var c = cells[i];
      if (sel < 0) { if (c && white(c) === (turn === 1)) { sel = i; draw(); } return; }
      if (i === sel) { sel = -1; draw(); return; }
      if (c && white(c) === (turn === 1)) { sel = i; draw(); return; }
      var mv = cells[sel], t = (/p/i.test(mv) ? '' : mv.toUpperCase()) + (c ? 'x' : '') + nm(i);
      cells[i] = mv; cells[sel] = ''; sel = -1;
      if (turn === 1) moves.push([t, '']); else moves[moves.length - 1][1] = t;
      setTurn(turn === 1 ? 2 : 1); draw();
    };
    restartFn = init; init();
  };

  /* tic-tac-toe */
  G['tic-tac-toe'] = function () {
    var cs, wins = [0, 0, 0], L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    var draw = function (win) {
      boardEl.innerHTML = ''; boardEl.className = 'board chalkboard';
      cs.forEach(function (v, i) {
        var b = el('button', 'cell' + (win && win.indexOf(i) > -1 ? ' win' : '')); b.type = 'button'; b.setAttribute('aria-label', 'Cell ' + (i + 1) + (v ? ', ' + (v === 1 ? 'cross' : 'ring') : ''));
        b.disabled = !!v || over; if (v) b.appendChild(el('span', v === 1 ? 'mx' : 'mo'));
        b.addEventListener('click', function () { play(i); }); boardEl.appendChild(b);
      });
      stats([['Crosses won', wins[0]], ['Rings won', wins[1]], ['Draws', wins[2]]]);
    };
    var play = function (i) {
      cs[i] = turn; var w = null;
      L.forEach(function (l) { if (!w && cs[l[0]] && cs[l[0]] === cs[l[1]] && cs[l[1]] === cs[l[2]]) w = l; });
      if (w) { over = true; wins[turn - 1]++; score(turn, wins[turn - 1]); draw(w); setTurn(turn, names[turn - 1] + ' wins'); return; }
      if (cs.every(Boolean)) { over = true; wins[2]++; draw(); setTurn(turn, 'A draw'); return; }
      setTurn(turn === 1 ? 2 : 1); draw();
    };
    var init = function () { cs = [1, 2, 1, 0, 2, 0, 0, 0, 0]; over = false; setTurn(1); draw(); }; restartFn = init; init();
  };

  /* connect four */
  G['connect-4'] = function () {
    var R = 6, C = 7, b, cols = [];
    var init = function () {
      b = []; for (var r = 0; r < R; r++) b.push(new Array(C).fill(0)); over = false; cols = [];
      [3, 3, 4, 2, 4].forEach(function (c, k) { drop(c, k % 2 + 1, true); }); setTurn(1, 'Ruby to drop'); draw();
    };
    var drop = function (c, p, quiet) { for (var r = R - 1; r >= 0; r--) if (!b[r][c]) { b[r][c] = p; cols.push([c + 1, r]); return r; } return -1; };
    var four = function (p) {
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) [[0,1],[1,0],[1,1],[1,-1]].forEach(function (d) {
        var ok = true; for (var k = 0; k < 4; k++) { var rr = r + d[0] * k, cc = c + d[1] * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C || b[rr][cc] !== p) { ok = false; break; } } if (ok) four.f = true; });
      var f = four.f; four.f = false; return f;
    };
    var draw = function (fresh) {
      boardEl.innerHTML = ''; boardEl.className = 'board c4';
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        (function (r, c) {
          var q = el('button', 'cell'); q.type = 'button'; q.setAttribute('aria-label', 'Drop in column ' + (c + 1)); q.disabled = over;
          if (b[r][c]) { var d = el('i', 'disc ' + (b[r][c] === 1 ? 'ruby' : 'ivory')); if (fresh && fresh[0] === r && fresh[1] === c) d.style.setProperty('--from', -(r + 1) * 105 + '%'); else d.style.animation = 'none'; q.appendChild(d); }
          q.addEventListener('click', function () { play(c); }); boardEl.appendChild(q);
        })(r, c);
      }
      logList(cols.map(function (x, i) { return [(i % 2 ? 'Ivory' : 'Ruby') + ' → col ' + x[0], '']; }).map(function (x) { return [x[0], '']; }));
    };
    var play = function (c) {
      var r = drop(c, turn); if (r < 0) return;
      if (four(turn)) { over = true; draw([r, c]); setTurn(turn, names[turn - 1] + ' wins'); return; }
      draw([r, c]); setTurn(turn === 1 ? 2 : 1, names[turn === 1 ? 1 : 0] + ' to drop');
    };
    restartFn = init; init();
  };

  /* checkers */
  G.checkers = function () {
    var b, sel, cap = [0, 0], moves;
    var init = function () {
      b = []; for (var r = 0; r < 8; r++) { b.push([]); for (var c = 0; c < 8; c++) b[r].push(((r + c) % 2 && r < 3) ? 2 : ((r + c) % 2 && r > 4) ? 1 : 0); }
      b[3][2] = 0; b[4][3] = 1; b[5][4] = 0; sel = null; cap = [0, 0]; moves = [['c6 → d5', 'b3 → c4']]; setTurn(1, 'Ruby to move'); draw();
    };
    var draw = function () {
      boardEl.innerHTML = ''; boardEl.className = 'board g8 checkers';
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) (function (r, c) {
        var dark = (r + c) % 2, q = el('button', 'cell sq ' + (dark ? 'dk' : 'lt') + (sel && sel[0] === r && sel[1] === c ? ' sel' : '')); q.type = 'button'; q.disabled = !dark;
        q.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + (b[r][c] ? ', ' + (b[r][c] === 1 ? 'ruby' : 'ivory') + ' piece' : ''));
        if (b[r][c]) q.appendChild(el('i', 'chk ' + (b[r][c] === 1 ? 'ruby' : 'ivory'))); q.addEventListener('click', function () { click(r, c); }); boardEl.appendChild(q);
      })(r, c);
      logList(moves); stats([]); var s = $('#stats'); if (s) s.innerHTML = '<div class="stat"><span>Ruby took</span><b>' + cap[0] + '</b></div><div class="stat"><span>Ivory took</span><b>' + cap[1] + '</b></div>';
    };
    var sqn = function (r, c) { return 'abcdefgh'[c] + (8 - r); };
    var click = function (r, c) {
      if (b[r][c] === turn) { sel = [r, c]; draw(); return; }
      if (!sel || b[r][c]) return;
      var dr = r - sel[0], dc = c - sel[1], dir = turn === 1 ? -1 : 1, txt = sqn(sel[0], sel[1]) + ' → ' + sqn(r, c);
      if (dr === dir && Math.abs(dc) === 1) { b[r][c] = turn; b[sel[0]][sel[1]] = 0; }
      else if (dr === 2 * dir && Math.abs(dc) === 2 && b[sel[0] + dir][sel[1] + dc / 2] === (turn === 1 ? 2 : 1)) { b[sel[0] + dir][sel[1] + dc / 2] = 0; b[r][c] = turn; b[sel[0]][sel[1]] = 0; cap[turn - 1]++; score(turn, cap[turn - 1]); txt += ' ×'; }
      else return;
      if (turn === 1) moves.push([txt, '']); else moves[moves.length - 1][1] = txt;
      sel = null; setTurn(turn === 1 ? 2 : 1, names[turn === 1 ? 1 : 0] + ' to move'); draw();
    };
    restartFn = init; init();
  };

  /* reversi */
  G.reversi = function () {
    var b, D = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    var flips = function (r, c, p) {
      if (b[r][c]) return []; var out = [];
      D.forEach(function (d) { var line = [], rr = r + d[0], cc = c + d[1]; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr][cc] === 3 - p) { line.push([rr, cc]); rr += d[0]; cc += d[1]; }
        if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr][cc] === p) out = out.concat(line); });
      return out;
    };
    var init = function () { b = []; for (var r = 0; r < 8; r++) b.push(new Array(8).fill(0)); b[3][3] = 2; b[3][4] = 1; b[4][3] = 1; b[4][4] = 2; setTurn(1, 'Black to move'); draw(); };
    var count = function () { var n = [0, 0]; b.forEach(function (row) { row.forEach(function (v) { if (v) n[v - 1]++; }); }); return n; };
    var draw = function () {
      boardEl.innerHTML = ''; boardEl.className = 'board g8 reversi';
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) (function (r, c) {
        var legal = flips(r, c, turn).length > 0, q = el('button', 'cell' + (legal ? ' hint' : '')); q.type = 'button'; q.disabled = !legal;
        q.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + (b[r][c] ? ', ' + (b[r][c] === 1 ? 'black' : 'white') : legal ? ', legal move' : ''));
        if (b[r][c]) q.appendChild(el('i', 'rv ' + (b[r][c] === 1 ? 'b' : 'w'))); q.addEventListener('click', function () { var f = flips(r, c, turn); b[r][c] = turn; f.forEach(function (x) { b[x[0]][x[1]] = turn; }); setTurn(3 - turn, names[2 - turn] + ' to move'); draw(); }); boardEl.appendChild(q);
      })(r, c);
      var n = count(); score(1, n[0]); score(2, n[1]); stats([['Black discs', n[0]], ['White discs', n[1]], ['Empty squares', 64 - n[0] - n[1]]]);
    };
    restartFn = init; init();
  };

  /* go */
  G.go = function () {
    var b, cnt;
    var init = function () { b = {}; cnt = 0; [[2,2,1],[2,6,2],[4,4,1],[3,5,2],[5,3,1],[6,6,2],[4,2,2]].forEach(function (s) { b[s[0] + ',' + s[1]] = s[2]; cnt++; }); setTurn(cnt % 2 ? 2 : 1, 'Black to play'); setTurn(1, 'Black to play'); draw(); };
    var draw = function () {
      boardEl.innerHTML = ''; boardEl.className = 'board go'; boardEl.appendChild(el('div', 'grid-lines'));
      var pts = el('div', 'pts'); boardEl.appendChild(pts);
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) (function (r, c) {
        var v = b[r + ',' + c], q = el('button', 'cell'); q.type = 'button'; q.disabled = !!v; q.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + (v ? ', ' + (v === 1 ? 'black' : 'white') + ' stone' : ''));
        if (v) q.appendChild(el('i', 'st ' + (v === 1 ? 'b' : 'w'))); else if ([2,4,6].indexOf(r) > -1 && [2,4,6].indexOf(c) > -1 && (r !== 4 || c === 4)) q.appendChild(el('i', 'star'));
        q.addEventListener('click', function () { b[r + ',' + c] = turn; setTurn(3 - turn, names[2 - turn] + ' to play'); draw(); }); pts.appendChild(q);
      })(r, c);
      stats([['Board', '9 × 9'], ['Stones placed', Object.keys(b).length], ['Komi', '7.5'], ['Captured', '0 – 0']]);
    };
    restartFn = init; init();
  };

  /* yahtzee */
  G.yahtzee = function () {
    var vals, held, left, PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    var init = function () { vals = [4, 4, 2, 6, 4]; held = [true, true, false, false, true]; left = 2; setTurn(1, 'Player 1: keep dice or roll'); draw(); };
    var draw = function (rolled) {
      var host = $('#dice'); host.innerHTML = '';
      vals.forEach(function (v, i) {
        var d = el('button', 'die' + (held[i] ? ' held' : '') + (rolled && !held[i] ? ' roll' : '')); d.type = 'button'; d.setAttribute('aria-pressed', held[i]); d.setAttribute('aria-label', 'Die ' + (i + 1) + ': ' + v + (held[i] ? ', kept' : ''));
        for (var k = 0; k < 9; k++) d.appendChild(el('i', PIPS[v].indexOf(k) > -1 ? 'on' : ''));
        d.addEventListener('click', function () { if (left) { held[i] = !held[i]; draw(); } }); host.appendChild(d);
      });
      var r = $('#roll'); r.disabled = !left; r.querySelector('span').textContent = 'Roll (' + left + ' left)';
    };
    $('#roll').addEventListener('click', function () { vals = vals.map(function (v, i) { return held[i] ? v : 1 + Math.floor(Math.random() * 6); }); left--; draw(true); });
    restartFn = init; init();
  };

  /* memory */
  G.memory = function () {
    var SH = ['<circle cx="12" cy="12" r="8" fill="#c8423a"/>', '<path d="M12 3 22 20H2z" fill="#d9a441"/>', '<rect x="4" y="4" width="16" height="16" rx="2" fill="#1f7a63"/>', '<path d="m12 2 3 7 7.5.6-5.7 4.9 1.8 7.4L12 18l-6.6 3.9 1.8-7.4L1.5 9.6 9 9z" fill="#d9a441"/>', '<path d="M12 2 22 12 12 22 2 12z" fill="#2f5fbf"/>', '<path d="M8 3h8l5 9-5 9H8l-5-9z" fill="#8a4fd6"/>', '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#c8423a"/>', '<path d="M17 3a9 9 0 1 0 0 18 7 7 0 1 1 0-18z" fill="#1f7a63"/>'];
    var order = [3, 0, 5, 7, 1, 6, 2, 4, 6, 3, 0, 7, 4, 2, 5, 1], st, first, pairs, lock;
    var init = function () { st = order.map(function () { return 0; }); st[1] = st[10] = 2; st[2] = 0; first = -1; pairs = [1, 0]; lock = false; setTurn(2, 'Player 2 to flip'); score(1, 1); score(2, 0); draw(); };
    var draw = function () {
      boardEl.innerHTML = ''; boardEl.className = 'board memory';
      order.forEach(function (s, i) {
        var c = el('button', 'mc' + (st[i] === 1 ? ' up' : st[i] === 2 ? ' done' : '')); c.type = 'button'; c.disabled = st[i] === 2; c.setAttribute('aria-label', 'Card ' + (i + 1) + (st[i] ? ', shape ' + (s + 1) : ', face down'));
        c.innerHTML = '<span class="mc-in"><span class="mc-b"></span><span class="mc-f"><svg viewBox="0 0 24 24" aria-hidden="true">' + SH[s] + '</svg></span></span>';
        c.addEventListener('click', function () { flip(i); }); boardEl.appendChild(c);
      });
      stats([['Pairs found', pairs[0] + pairs[1] + ' of 8'], ['Flips this game', 6]]);
    };
    var flip = function (i) {
      if (lock || st[i]) return; st[i] = 1; boardEl.children[i].classList.add('up');
      if (first < 0) { first = i; return; }
      var a = first; first = -1; lock = true;
      setTimeout(function () {
        if (order[a] === order[i]) { st[a] = st[i] = 2; pairs[turn - 1]++; score(turn, pairs[turn - 1]); setTurn(turn, names[turn - 1] + ' found a pair, flip again'); }
        else { st[a] = st[i] = 0; setTurn(3 - turn, names[2 - turn] + ' to flip'); }
        lock = false; draw();
      }, 800);
    };
    restartFn = init; init();
  };

  (G[game] || function () {})();
})();
