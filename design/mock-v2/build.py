#!/usr/bin/env python3
"""Builds the four mock pages (2 designs x homepage + game board). Card markup is taken from the real app (src/home/cardHtml.ts),
and every page links the app's preserved card CSS, so the card hover and preview animations are the real ones."""
import json, re, pathlib
here = pathlib.Path(__file__).parent
root = here.parent.parent
import subprocess
cards = json.loads(subprocess.check_output(['node', '-e', "const s=require('fs').readFileSync(process.argv[1],'utf8').replace(/^[\\s\\S]*?CARD_HTML: string\\[\\] =/, '');console.log(JSON.stringify(eval(s)))", str(root / 'src/home/cardHtml.ts')]))
assert len(cards) == 26, len(cards)
reg = (root / 'src/games/registry.ts').read_text()
cats = re.findall(r"id: '([^']+)',\n\s+title: ('[^']*'|\"[^\"]*\"),\n\s+category: '([^']+)'", reg)
assert len(cats) == 26

def card_html(i):
    inner = cards[i]
    return f'<a class="icd-card" href="game-{{D}}.html" data-category="{cats[i][2]}">{inner}</a>'

ICON = {
 'menu': '<path d="M4 6h16M4 12h16M4 18h16"/>',
 'help': '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
 'undo': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
 'redo': '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
 'restart': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
 'volume': '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M16 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12"/>',
 'home': '<path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10"/>',
 'close': '<path d="M18 6 6 18M6 6l12 12"/>',
 'play': '<path d="M7 4v16l13-8z" fill="currentColor"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
}
def ic(n, cls=''):
    return f'<svg class="ic {cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{ICON[n]}</svg>'

TABLES = {
 'a': [('baize', '#0f3b2e', 'Baize green'), ('claret', '#4a1620', 'Claret'), ('navy', '#14243f', 'Midnight blue'), ('slate', '#26303a', 'Slate')],
 'b': [('sun', '#ffc83d', 'Sunshine'), ('pink', '#ff9ec0', 'Bubblegum'), ('sky', '#7cc8ff', 'Sky'), ('lime', '#c7f24b', 'Lime')],
}
def tools(d):
    sw = ''.join(f'<button type="button" class="swatch" data-table="{k}" title="{n}" aria-label="{n}" style="--c:{h}"></button>' for k, h, n in TABLES[d])
    return f'''<div class="tools">
      <details class="menu"><summary class="ib" aria-label="Menu" title="Menu">{ic('menu')}</summary>
        <div class="menu-pop"><p class="lbl">Table colour</p><div class="swatches">{sw}</div>
          <button type="button" class="row">{ic('volume')} Sound on</button>
          <a class="row" href="home-{d}.html">{ic('home')} All games</a></div></details>
      <button type="button" class="ib round" aria-label="How to play" title="How to play (?)" data-open-rules>{ic('help')}</button>
    </div>'''

RULES = '''<dialog class="rules" aria-labelledby="rt"><div class="rules-in">
  <div class="rules-head"><h2 id="rt">How to play Chess</h2><button type="button" class="ib round sm" aria-label="Close rules" data-close-rules>__CLOSE__</button></div>
  <dl><div><dt>Objective</dt><dd>Checkmate the opponent's king: trap it under attack with no legal escape.</dd></div>
  <div><dt>Setup</dt><dd>Each side starts with 16 pieces on an 8×8 board; white is at the bottom and moves first.</dd></div>
  <div><dt>Turns</dt><dd>Players alternate moves. Select a piece, then a square it can reach.</dd></div>
  <div><dt>Winning</dt><dd>Checkmate wins. Stalemate or a draw by rule ends the game level.</dd></div></dl>
  <a class="vid" href="#">__PLAY__ How to play Chess (video)</a></div></dialog>'''.replace('__CLOSE__', ic('close')).replace('__PLAY__', ic('play'))

PILLS = [('all', 'All', 26), ('strategy', 'Strategy', 13), ('dice', 'Dice', 4), ('hidden', 'Hidden', 2), ('card', 'Cards', 4), ('party', 'Party', 3)]

def home(d):
    pills = ''.join(f'<button type="button" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{n} <span>{c}</span></button>' for k, n, c in PILLS)
    grid = ''.join(card_html(i).replace('{D}', d) for i in range(26))
    if d == 'a':
        hero = f'''<header class="hero">
      <div class="platter big" aria-hidden="true"><div class="grooves"></div><div class="ticks"></div><div class="arm"><i></i></div></div>
      <h1 class="word">TurnTable</h1>
      <p class="tag">26 games for two players and one screen. Pick one, pass the seat.</p>
    </header>'''
    else:
        hero = f'''<header class="hero">
      <h1 class="word"><span>turn</span><span>table</span></h1>
      <p class="sticker" aria-hidden="true"><b>26</b>games</p>
      <p class="tag">Two players. One screen. Pick a game and hand over the seat.</p>
    </header>'''
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TurnTable · design {d.upper()} · homepage</title>
<link rel="stylesheet" href="fonts/fonts.css"><link rel="stylesheet" href="../../src/home/preserved-hub.css"><link rel="stylesheet" href="{d}.css"></head>
<body class="home" data-design="{d}" data-table="{TABLES[d][0][0]}">
<div class="top"><a class="logo" href="home-{d}.html">TurnTable</a>{tools(d)}</div>
<main class="page">
  {hero}
  <div class="bar">
    <label class="search">{ic('search')}<input id="search" type="search" placeholder="Search games" aria-label="Search games"></label>
    <nav class="pills" aria-label="Filter games">{pills}</nav>
  </div>
  <div class="grid" id="grid">{grid}</div>
  <p id="empty" class="empty" hidden>No game matches that search. Clear it to see all 26.</p>
</main>
{RULES}
<script src="shared.js"></script></body></html>'''

def game(d):
    if d == 'a':
        stage = '''<div class="stage"><div class="platter" aria-hidden="false">
        <div class="grooves" aria-hidden="true"></div><div class="ticks" aria-hidden="true"></div>
        <span class="seat top">Black</span><span class="seat bot">White</span>
        <div class="arm" aria-hidden="true"><i></i></div>
        <div class="board" id="board" role="group" aria-label="Chess board"></div></div></div>'''
        left = '''<section class="card score"><h1>Chess</h1>
        <div class="seg" role="group" aria-label="Game mode"><button type="button" aria-pressed="true">2 Players</button><button type="button" aria-pressed="false">Vs Computer</button></div>
        <div class="player active" data-side="w"><i class="disc w"></i><span>White</span><b>0</b></div>
        <div class="player" data-side="b"><i class="disc b"></i><span>Black</span><b>0</b></div>
        <p class="who" id="who" role="status">White to move</p></section>'''
    else:
        stage = '''<div class="stage"><div class="lid">
        <div class="lid-tab"><b>Chess</b><span>2 players · 20–40 min</span></div>
        <div class="board" id="board" role="group" aria-label="Chess board"></div></div></div>'''
        left = '''<section class="card score"><h1>Chess</h1>
        <div class="seg" role="group" aria-label="Game mode"><button type="button" aria-pressed="true">2 Players</button><button type="button" aria-pressed="false">Vs Computer</button></div>
        <div class="coin" aria-hidden="true"><div class="coin-in"><i class="face w"></i><i class="face b"></i></div></div>
        <div class="player active" data-side="w"><i class="disc w"></i><span>White</span><b>0</b></div>
        <div class="player" data-side="b"><i class="disc b"></i><span>Black</span><b>0</b></div>
        <p class="who" id="who" role="status">White to move</p></section>'''
    controls = f'''<section class="card controls"><button type="button" class="act" id="undo">{ic('undo')} Undo</button><button type="button" class="act" id="redo" disabled>{ic('redo')} Redo</button><button type="button" class="act strong" id="restart">{ic('restart')} Restart</button></section>'''
    right = '''<section class="card moves"><h2>Moves <span id="movecount">2</span></h2><ol id="moves"></ol></section>
      <section class="card note"><h2>Captured</h2><p class="dim">Nothing taken yet.</p></section>'''
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TurnTable · design {d.upper()} · chess</title>
<link rel="stylesheet" href="fonts/fonts.css"><link rel="stylesheet" href="{d}.css"></head>
<body class="game" data-design="{d}" data-table="{TABLES[d][0][0]}" data-turn="w">
<div class="top"><a class="logo" href="home-{d}.html">TurnTable</a>{tools(d)}</div>
<main class="layout">
  <div class="left">{left}{controls}</div>
  {stage}
  <div class="right">{right}</div>
</main>
{RULES}
<script src="shared.js"></script></body></html>'''

for d in 'ab':
    (here / f'home-{d}.html').write_text(home(d))
    (here / f'game-{d}.html').write_text(game(d))
print('built')
