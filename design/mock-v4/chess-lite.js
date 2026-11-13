// A chess board for the mock: pieces move anywhere (rules are NOT checked), turns alternate, undo and redo work.
// The real engine lives in src/games/chess; this only gives the design something to react to.
window.ChessLite = {
  mount(boardEl, onChange) {
    const START = 'rnbqkbnrpppppppp' + ' '.repeat(32) + 'PPPPPPPPRNBQKBNR';
    const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
    const sqName = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
    const isWhite = (p) => p !== ' ' && p === p.toUpperCase();
    let past = [];
    let future = [];
    let now = { cells: START.split(''), turn: 1, moves: [], last: null };
    let selected = null;

    const draw = () => {
      boardEl.innerHTML = '';
      now.cells.forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        const light = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
        b.className = `sq ${light ? 'l' : 'd'}${selected === i ? ' sel' : ''}${now.last && (now.last[0] === i || now.last[1] === i) ? ' last' : ''}`;
        const who = p === ' ' ? '' : `${isWhite(p) ? 'player 1' : 'player 2'} ${NAME[p.toLowerCase()]}`;
        b.setAttribute('aria-label', `${sqName(i)}${who ? `, ${who}` : ''}`);
        if (p !== ' ') b.innerHTML = `<span class="pc ${isWhite(p) ? 'w' : 'b'}">${GLYPH[p.toLowerCase()]}︎</span>`;
        b.addEventListener('click', () => click(i));
        boardEl.appendChild(b);
      });
      onChange({ turn: now.turn, moves: now.moves, canUndo: past.length > 0, canRedo: future.length > 0 });
    };

    const click = (i) => {
      const p = now.cells[i];
      const mine = p !== ' ' && isWhite(p) === (now.turn === 1);
      if (selected === null || mine) {
        selected = mine && selected !== i ? i : null;
        return draw();
      }
      const cells = now.cells.slice();
      const moving = cells[selected];
      const took = cells[i] !== ' ';
      cells[i] = moving;
      cells[selected] = ' ';
      const letter = moving.toLowerCase() === 'p' ? '' : moving.toUpperCase();
      const text = `${letter}${sqName(selected)}${took ? '×' : '–'}${sqName(i)}`;
      past.push(now);
      future = [];
      now = { cells, turn: now.turn === 1 ? 2 : 1, moves: [...now.moves, text], last: [selected, i] };
      selected = null;
      draw();
    };

    draw();
    return {
      undo() {
        if (!past.length) return;
        future.push(now);
        now = past.pop();
        selected = null;
        draw();
      },
      redo() {
        if (!future.length) return;
        past.push(now);
        now = future.pop();
        selected = null;
        draw();
      },
      restart() {
        past = [];
        future = [];
        now = { cells: START.split(''), turn: 1, moves: [], last: null };
        selected = null;
        draw();
      },
    };
  },
};
