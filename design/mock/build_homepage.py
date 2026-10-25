#!/usr/bin/env python3
"""Builds homepage.html. The 8 existing animated card previews are taken VERBATIM from design/homepage-prototype.html;
the 18 cards that only had a "soon" glow get new previews built from the same primitives and keyframes."""
import re, pathlib
here = pathlib.Path(__file__).parent
proto = (here.parent / 'homepage-prototype.html').read_text()
cards = re.findall(r'(    <div class="icd-card".*?\n    </div>\n)', proto, re.S)
assert len(cards) == 26, len(cards)

def cell(inner='', cls='cell', style=''):
    return f'<div class="{cls}"{f" style=\"{style}\"" if style else ""}>{inner}</div>'
def stone(c, d, extra=''):
    return f'<span class="stone {c}{(" " + extra) if extra else ""}" style="animation-delay:{d}s"></span>'

def grid(cols, rows, cells, cls):
    return f'<div class="mg mg-grid {cls}" aria-hidden="true">' + ''.join(cells) + '</div>'

PREVIEWS = {}
# Checkers: 4x4 board, discs pop in
chk = []
placed = {1: ('b', 0), 3: ('b', 0.6), 4: ('b', 1.2), 9: ('a', 1.8), 11: ('a', 2.4), 14: ('a', 3.0)}
for i in range(16):
    r, c = divmod(i, 4)
    dk = (r + c) % 2 == 1
    chk.append(cell(stone(*placed[i]) if i in placed else '', 'cell dk' if dk else 'cell'))
PREVIEWS['Checkers'] = grid(4, 4, chk, 'mg-checks')
# Reversi
rv = []
rp = {5: ('a', 0), 6: ('b', .5), 9: ('b', 1), 10: ('a', 1.5), 4: ('a', 2.1), 7: ('b', 2.7)}
for i in range(16):
    rv.append(cell(stone(*rp[i]) if i in rp else ''))
PREVIEWS['Reversi'] = grid(4, 4, rv, 'mg-reversi')
# Go (5x5 intersections)
gp = {6: ('a', 0), 8: ('b', .6), 12: ('a', 1.2), 16: ('b', 1.8), 18: ('a', 2.4), 7: ('b', 3)}
PREVIEWS['Go'] = grid(5, 5, [cell(stone(*gp[i]) if i in gp else '') for i in range(25)], 'mg-go')
# Dots & Boxes
def line(x, y, w, h, d):
    return f'<span class="win-line" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;animation-delay:{d}s"></span>'
dots = '<div class="mg mg-dots" aria-hidden="true">' + '<span class="dot"></span>' * 16
dots += line(11, 10, 24, 3, 0) + line(34, 10, 24, 3, .5) + line(11, 33, 24, 3, 1.0) + line(11, 10, 3, 24, 1.5) + line(34, 10, 3, 24, 2.0)
dots += '<span class="box" style="left:14px;top:13px;width:21px;height:21px"></span></div>'
PREVIEWS['Dots & Boxes'] = dots
# Nim stays; Nine Men's Morris: a mill of three on a 5x5 intersection board
mp = {2: ('a', 0), 7: ('a', .6), 12: ('a', 1.2), 10: ('b', 1.8), 14: ('b', 2.4), 22: ('b', 3.0)}
PREVIEWS["Nine Men's Morris"] = grid(5, 5, [cell(stone(*mp[i]) if i in mp else '') for i in range(25)], 'mg-go')
# Quarto
qs = {0: ('a', 0, 'sq'), 1: ('b', .5, 'tall'), 4: ('b', 1.0, 'sq'), 5: ('a', 1.5, 'tall'), 8: ('a', 2.0, ''), 2: ('b', 2.5, '')}
PREVIEWS['Quarto'] = grid(3, 3, [cell(stone(*qs[i]) if i in qs else '') for i in range(9)], 'mg-quarto')
# Mancala
mc = [cell(stone('a' if i % 2 else 'b', i * .4)) for i in range(6)]
PREVIEWS['Mancala'] = grid(3, 2, mc, 'mg-pits')
# Backgammon: points with stacked stones
pts = []
for i in range(12):
    up = i < 6
    stones = ''
    for k in range(2 if i % 2 == 0 else 1):
        pos = f'top:{4 + k * 12}px' if up else f'bottom:{4 + k * 12}px'
        stones += f'<span class="stone {"a" if i % 3 else "b"}" style="{pos};animation-delay:{(i * .35 + k * .2):.2f}s"></span>'
    pts.append(f'<div class="cell {"up" if up else "dn"}">{stones}</div>')
PREVIEWS['Backgammon'] = '<div class="mg mg-grid mg-points" aria-hidden="true">' + ''.join(pts) + '</div>'
# Snakes & Ladders
sl = [cell(stone('', 0.5 * (i - 3)) if i in (3, 5, 10) else '') for i in range(16)]
PREVIEWS['Snakes & Ladders'] = '<div class="mg mg-grid mg-snakes" aria-hidden="true">' + ''.join(sl) + '<span class="ladder"></span></div>'
# Yahtzee
die = lambda: '<span class="die"><i></i><i></i><i></i></span>'
PREVIEWS['Yahtzee'] = f'<div class="mg mg-dice" aria-hidden="true">{die()}{die()}{die()}</div>'
# Hangman
PREVIEWS['Hangman'] = ('<div class="mg mg-text" aria-hidden="true"><span class="mark" style="animation-delay:0s">H</span><span class="blank"></span>'
                       '<span class="mark" style="animation-delay:.8s">N</span><span class="blank"></span><span class="mark" style="animation-delay:1.6s">M</span></div>')
# Cards
def card(sym, d, cls=''):
    return f'<span class="stone {cls}" style="animation-delay:{d}s">{sym}</span>'
PREVIEWS['War'] = f'<div class="mg mg-cards" aria-hidden="true">{card("K", 0)}{card("7", .7, "red")}{card("A", 1.4)}</div>'
PREVIEWS['Go Fish'] = f'<div class="mg mg-cards" aria-hidden="true">{card("♥", 0, "red")}{card("♥", .6, "red")}{card("♠", 1.2)}{card("♥", 1.8, "red")}</div>'
PREVIEWS['Crazy Eights'] = ('<div class="mg mg-cards" aria-hidden="true"><span class="stone" style="animation-delay:0s;background:#e0243f;color:#fff">7</span>'
                            '<span class="stone" style="animation-delay:.7s;background:#2f9e44;color:#fff">+2</span><span class="stone" style="animation-delay:1.4s;background:#ffb703;color:#2b2016">⊘</span>'
                            '<span class="stone" style="animation-delay:2.1s;background:#2f5fbf;color:#fff">4</span></div>')
PREVIEWS['Memory'] = f'<div class="mg mg-cards" aria-hidden="true">{card("🍎", 0)}{card("🍌", .8)}{card("🍎", 1.6)}</div>'
PREVIEWS['Rock Paper Scissors'] = ('<div class="mg mg-text" aria-hidden="true" style="font-size:26px"><span class="mark" style="animation-delay:0s">✊</span>'
                                   '<span class="mark" style="animation-delay:.8s">✋</span><span class="mark" style="animation-delay:1.6s">✌</span></div>')
PREVIEWS['Scrabble Duel'] = ('<div class="mg mg-text" aria-hidden="true">' + ''.join(f'<span class="tile" style="animation-delay:{i * .5}s">{ch}</span>' for i, ch in enumerate('WORD')) + '</div>')
PREVIEWS['Twenty Questions'] = '<div class="mg mg-text" aria-hidden="true" style="font-size:40px"><span class="mark" style="animation-delay:0s;font-size:44px">?</span><span class="mark" style="animation-delay:.9s;font-size:30px">?</span><span class="mark" style="animation-delay:1.8s;font-size:22px">?</span></div>'

TITLE_FIX = {
    'Crazy Eights': ('Uno-style Matching', 'Match colour or number — wild cards twist the game.'),
    'Scrabble Duel': ('Scrabble-style Word Building', 'Build words on a shared board for the top score.'),
}

out = []
for html in cards:
    name = re.search(r'<span class="icd-panel-name">(.*?)</span>', html).group(1).replace('&amp;', '&')
    if 'mg-soon' in html:
        assert name in PREVIEWS, name
        html = re.sub(r'<div class="mg mg-soon".*?</div></div>', lambda m: PREVIEWS[name], html, count=1, flags=re.S)
        assert 'mg-soon' not in html, name
    if name in TITLE_FIX:
        t, d = TITLE_FIX[name]
        html = html.replace(f'<span class="icd-panel-name">{name}</span>', f'<span class="icd-panel-name">{t}</span>')
        html = re.sub(r'(<p class="icd-desc">)(.*?)(</p>)', lambda m: m.group(1) + d + m.group(3), html, count=1)
    if name == 'Connect Four':
        html = html.replace('class="icd-card"', 'class="icd-card" data-href="game-board.html"', 1)
    out.append(html)

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TurnTable — homepage mock</title>
<link rel="stylesheet" href="fonts/fonts.css">
<link rel="stylesheet" href="preserved-hub.css">
<link rel="stylesheet" href="mock.css">
</head>
<body class="theme-hub">
<div class="page">
  <div class="head">
    <h1 class="wordmark">TurnTable</h1>
    <p class="tagline">26 two-player games, one shared screen.</p>
  </div>

  <nav class="filters" id="filters" aria-label="Filter games by category">
    <button data-filter="all" aria-pressed="true">All <span class="count">26</span></button>
    <button data-filter="strategy" aria-pressed="false">Strategy <span class="count">13</span></button>
    <button data-filter="dice" aria-pressed="false">Dice <span class="count">4</span></button>
    <button data-filter="hidden" aria-pressed="false">Hidden <span class="count">2</span></button>
    <button data-filter="cards" aria-pressed="false">Cards <span class="count">4</span></button>
    <button data-filter="party" aria-pressed="false">Party <span class="count">3</span></button>
  </nav>

  <div class="grid" id="grid">
{''.join(out)}
  </div>
</div>

<a class="pill-link" href="design-guide.html">Design guide &nbsp;→</a>

<script>
(function () {{
  var buttons = document.querySelectorAll('#filters button');
  var cards = document.querySelectorAll('#grid .icd-card');
  buttons.forEach(function (btn) {{
    btn.addEventListener('click', function () {{
      var filter = btn.getAttribute('data-filter');
      buttons.forEach(function (b) {{ b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); }});
      cards.forEach(function (card) {{
        card.hidden = filter !== 'all' && card.getAttribute('data-category') !== filter;
      }});
    }});
  }});
  // mock only: the Connect Four card opens the game-page mock
  document.querySelectorAll('.icd-card[data-href]').forEach(function (card) {{
    var go = function () {{ location.href = card.getAttribute('data-href'); }};
    card.style.cursor = 'pointer';
    card.addEventListener('click', go);
    card.addEventListener('keydown', function (e) {{ if (e.key === 'Enter') go(); }});
  }});
}})();
</script>
</body>
</html>
'''
(here / 'homepage.html').write_text(page)
print('wrote homepage.html with', len(out), 'cards')
