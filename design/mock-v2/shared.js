/* Mock-only behaviour shared by all four pages: menu popover, rules dialog, table colours, home filters/search, and a tiny playable chess board. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- menu popover ---- */
  var menu = $('.menu');
  if (menu) {
    document.addEventListener('pointerdown', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.open = false; });
  }

  /* ---- table colour ---- */
  var key = 'tt-mock-table-' + document.body.dataset.design;
  var saved = null; try { saved = localStorage.getItem(key); } catch (e) {}
  if (saved) document.body.dataset.table = saved;
  $$('.swatch').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.dataset.table === document.body.dataset.table));
    b.addEventListener('click', function () {
      document.body.dataset.table = b.dataset.table;
      try { localStorage.setItem(key, b.dataset.table); } catch (e) {}
      $$('.swatch').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });

  /* ---- rules dialog ---- */
  var dlg = $('dialog.rules');
  if (dlg) {
    $$('[data-open-rules]').forEach(function (b) { b.addEventListener('click', function () { dlg.showModal(); }); });
    $$('[data-close-rules]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.addEventListener('keydown', function (e) { if (e.key === '?' && !dlg.open) dlg.showModal(); });
  }

  /* ---- home: filters + search ---- */
  var grid = $('#grid');
  if (grid) {
    var cards = $$('.icd-card', grid), cat = 'all', q = '';
    var apply = function () {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = (cat === 'all' || c.dataset.category === cat) && (!q || c.textContent.toLowerCase().indexOf(q) > -1);
        c.hidden = !ok; if (ok) shown++;
      });
      var empty = $('#empty'); if (empty) empty.hidden = shown > 0;
    };
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        cat = b.dataset.filter;
        $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      });
    });
    var s = $('#search'); if (s) s.addEventListener('input', function () { q = s.value.trim().toLowerCase(); apply(); });
  }

  /* ---- chess (game pages) ---- */
  var boardEl = $('#board');
  if (boardEl) {
    var G = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    var fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R';
    var cells = [];
    fen.split('/').forEach(function (row) { row.split('').forEach(function (ch) { if (/\d/.test(ch)) for (var i = 0; i < +ch; i++) cells.push(''); else cells.push(ch); }); });
    var turn = 'w', sel = -1, moves = [['e4', 'e5'], ['Nf3', 'Nc6']], pending = null, undone = [];
    var files = 'abcdefgh';
    var name = function (i) { return files[i % 8] + (8 - Math.floor(i / 8)); };
    var isWhite = function (c) { return c && c === c.toUpperCase(); };

    var draw = function () {
      boardEl.innerHTML = '';
      cells.forEach(function (c, i) {
        var sq = document.createElement('button');
        sq.type = 'button';
        sq.className = 'sq ' + (((i % 8) + Math.floor(i / 8)) % 2 ? 'dk' : 'lt') + (i === sel ? ' sel' : '');
        sq.setAttribute('aria-label', name(i) + (c ? ', ' + (isWhite(c) ? 'white' : 'black') + ' piece' : ''));
        if (c) { var p = document.createElement('span'); p.className = 'pc ' + (isWhite(c) ? 'w' : 'b'); p.textContent = G[c] + '︎'; sq.appendChild(p); }
        if ((i % 8) === 0) { var r = document.createElement('i'); r.className = 'co r'; r.textContent = 8 - Math.floor(i / 8); sq.appendChild(r); }
        if (Math.floor(i / 8) === 7) { var f = document.createElement('i'); f.className = 'co f'; f.textContent = files[i % 8]; sq.appendChild(f); }
        sq.addEventListener('click', function () { click(i); });
        boardEl.appendChild(sq);
      });
      var list = $('#moves'); if (list) {
        list.innerHTML = moves.map(function (m, n) { return '<li><b>' + (n + 1) + '</b><span>' + m[0] + '</span><span>' + (m[1] || '') + '</span></li>'; }).join('');
        list.scrollTop = list.scrollHeight;
      }
      var cnt = $('#movecount'); if (cnt) cnt.textContent = moves.length;
      var ur = $('#undo'), rd = $('#redo'); if (ur) ur.disabled = moves.length === 0 && !pending; if (rd) rd.disabled = !undone.length;
    };
    var setTurn = function (t) {
      turn = t;
      document.body.dataset.turn = t;
      var who = $('#who'); if (who) who.textContent = t === 'w' ? 'White to move' : 'Black to move';
      $$('.player').forEach(function (p) { p.classList.toggle('active', p.dataset.side === t); });
    };
    var click = function (i) {
      var c = cells[i];
      if (sel < 0) { if (c && isWhite(c) === (turn === 'w')) { sel = i; draw(); } return; }
      if (i === sel) { sel = -1; draw(); return; }
      if (c && isWhite(c) === (turn === 'w')) { sel = i; draw(); return; }
      var mv = cells[sel], txt = (/p/i.test(mv) ? '' : mv.toUpperCase()) + (c ? 'x' : '') + name(i);
      cells[i] = mv; cells[sel] = ''; sel = -1;
      if (turn === 'w') { moves.push([txt, '']); } else { moves[moves.length - 1][1] = txt; }
      setTurn(turn === 'w' ? 'b' : 'w'); undone = []; draw();
    };
    var restart = $('#restart'); if (restart) restart.addEventListener('click', function () {
      cells = []; fen.split('/').forEach(function (row) { row.split('').forEach(function (ch) { if (/\d/.test(ch)) for (var i = 0; i < +ch; i++) cells.push(''); else cells.push(ch); }); });
      moves = [['e4', 'e5'], ['Nf3', 'Nc6']]; sel = -1; undone = []; setTurn('w'); draw();
    });
    setTurn('w'); draw();
  }
})();
