#!/usr/bin/env python3
"""Builds the round-2 mock: a homepage plus a game page for 7 different games, all in the Baize theme."""
import json, re, subprocess, pathlib
here = pathlib.Path(__file__).parent
root = here.parent.parent
cards = json.loads(subprocess.check_output(['node', '-e', "const s=require('fs').readFileSync(process.argv[1],'utf8').replace(/^[\\s\\S]*?CARD_HTML: string\\[\\] =/, '');console.log(JSON.stringify(eval(s)))", str(root / 'src/home/cardHtml.ts')]))
reg = (root / 'src/games/registry.ts').read_text()
cats = re.findall(r"id: '([^']+)',\n\s+title: ('[^']*'|\"[^\"]*\"),\n\s+category: '([^']+)'", reg)
assert len(cards) == len(cats) == 26

ICON = {
 'menu': '<path d="M4 6h16M4 12h16M4 18h16"/>', 'help': '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
 'undo': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 'redo': '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
 'restart': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', 'volume': '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M16 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12"/>',
 'home': '<path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10"/>', 'close': '<path d="M18 6 6 18M6 6l12 12"/>', 'play': '<path d="M7 4v16l13-8z" fill="currentColor"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'back': '<path d="m12 19-7-7 7-7M19 12H5"/>',
 'dice': '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3"/>',
}
def ic(n): return f'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{ICON[n]}</svg>'

TABLES = [('baize', '#0f3b2e', 'Baize green'), ('claret', '#4a1620', 'Claret'), ('navy', '#14243f', 'Midnight blue'), ('slate', '#26303a', 'Slate')]
SW = ''.join(f'<button type="button" class="swatch" data-table="{k}" title="{n}" aria-label="{n}" style="--c:{h}"></button>' for k, h, n in TABLES)

def top(back):
    b = f'<a class="ib round" href="home.html" aria-label="Back to all games" title="Back to all games">{ic("back")}</a>' if back else ''
    return f'''<div class="top"><div class="brand">{b}<a class="logo" href="home.html">TurnTable</a></div><div class="tools">
  <details class="menu"><summary class="ib" aria-label="Menu" title="Menu">{ic('menu')}</summary><div class="menu-pop"><p class="lbl">Table colour</p><div class="swatches">{SW}</div>
  <button type="button" class="row">{ic('volume')} Sound on</button><a class="row" href="home.html">{ic('home')} All games</a></div></details>
  {'<button type="button" class="ib round" aria-label="How to play" title="How to play (?)" data-open-rules>' + ic('help') + '</button>' if back else ''}</div></div>'''

# id: (title, names, tokens, plaques(top,bottom), rules[objective,setup,turns,winning], right-panel kind)
GAMES = {
 'chess': ('Chess', ['White', 'Black'], ['w', 'b'], ('Black', 'White'), ["Checkmate the opponent's king: trap it under attack with no legal escape.", 'Each side starts with 16 pieces on an 8×8 board; white moves first.', 'Players alternate moves. Select a piece, then a square it can reach.', 'Checkmate wins. Stalemate ends the game level.'], 'moves'),
 'tic-tac-toe': ('Tic-Tac-Toe', ['Crosses', 'Rings'], ['x', 'o'], ('Rings', 'Crosses'), ['Get three of your marks in a row: across, down or diagonal.', 'A 3×3 grid; one player draws crosses, the other rings.', 'Crosses go first. Players alternate, placing a mark in any empty cell.', 'First to line up three wins. If all nine cells fill, it is a draw.'], 'stats'),
 'connect-4': ('Connect Four', ['Ruby', 'Ivory'], ['ruby', 'ivory'], ('Ivory', 'Ruby'), ['Be the first to connect four of your discs in a row.', 'A 7-column, 6-row grid stands upright; each player has their own colour.', 'Players alternate dropping one disc into a column. It falls to the lowest open slot.', 'Four in a row, across, down or diagonally, wins. A full grid is a draw.'], 'moves'),
 'checkers': ('Checkers', ['Ruby', 'Ivory'], ['ruby', 'ivory'], ('Ivory', 'Ruby'), ['Capture all of your opponent’s pieces, or leave them with no legal move.', 'Twelve pieces each on the dark squares of an 8×8 board.', 'Move one piece diagonally forward. Jump an adjacent opponent piece to capture it.', 'Take every enemy piece or block them in.'], 'moves'),
 'reversi': ('Reversi', ['Black', 'White'], ['b', 'w'], ('White', 'Black'), ['Finish with more discs of your colour than your opponent.', 'Four discs sit in the centre; black moves first.', 'Place a disc so it traps a line of enemy discs between two of yours. Trapped discs flip.', 'When neither side can move, the player with more discs wins.'], 'stats'),
 'go': ('Go', ['Black', 'White'], ['b', 'w'], ('White', 'Black'), ['Surround more of the board than your opponent.', 'An empty 9×9 board; black plays first.', 'Place one stone on any empty point. Stones with no free neighbours are captured.', 'When both players pass, the player with more territory plus captures wins.'], 'stats'),
 'yahtzee': ('Yahtzee', ['Player 1', 'Player 2'], ['p1', 'p2'], ('Player 2', 'Player 1'), ['Score the most points over 13 rounds by making combinations with five dice.', 'Each player has a scorecard with 13 boxes.', 'Roll up to three times a turn. Tap dice to keep them, then pick a box to score.', 'The highest total after the last box is filled wins.'], 'sheet'),
 'memory': ('Memory', ['Player 1', 'Player 2'], ['p1', 'p2'], ('Player 2', 'Player 1'), ['Find the most matching pairs of cards.', 'Sixteen cards lie face down in a 4×4 grid.', 'Flip two cards. A match stays up and you go again; a miss flips back and the turn passes.', 'When every pair is found, the player with more pairs wins.'], 'stats'),
}

def rules(g):
    t, _, _, _, r, _ = GAMES[g]
    return f'''<dialog class="rules" aria-labelledby="rt"><div class="rules-in"><div class="rules-head"><h2 id="rt">How to play {t}</h2><button type="button" class="ib round sm" aria-label="Close rules" data-close-rules>{ic('close')}</button></div>
<dl><div><dt>Objective</dt><dd>{r[0]}</dd></div><div><dt>Setup</dt><dd>{r[1]}</dd></div><div><dt>Turns</dt><dd>{r[2]}</dd></div><div><dt>Winning</dt><dd>{r[3]}</dd></div></dl>
<a class="vid" href="#">{ic('play')} How to play {t} (video)</a></div></dialog>'''

SHEET = '''<section class="card"><h2>Scorecard</h2><table class="sheet"><thead><tr><th></th><th>P1</th><th>P2</th></tr></thead><tbody>
<tr><th>Ones</th><td>3</td><td>–</td></tr><tr><th>Twos</th><td>6</td><td>4</td></tr><tr><th>Threes</th><td>–</td><td>9</td></tr><tr><th>Fours</th><td class="pick">12</td><td>8</td></tr><tr><th>Fives</th><td>–</td><td>–</td></tr><tr><th>Sixes</th><td>–</td><td>18</td></tr>
<tr><th>3 of a kind</th><td>–</td><td>22</td></tr><tr><th>Full house</th><td>25</td><td>–</td></tr><tr><th>Small straight</th><td>–</td><td>30</td></tr><tr><th>Chance</th><td>–</td><td>–</td></tr></tbody>
<tfoot><tr><th>Total</th><td>46</td><td>91</td></tr></tfoot></table></section>'''

def stage(g):
    t, names, toks, pl, _, _ = GAMES[g]
    studs = '<i class="stud tl"></i><i class="stud tr"></i><i class="stud bl"></i><i class="stud br"></i>'
    plaques = f'<span class="plaque top">{pl[0]}</span><span class="plaque bot">{pl[1]}</span>'
    if g == 'yahtzee':
        return f'''<div class="stage"><div class="rail">{studs}{plaques}<div class="tray" id="board"><div class="dice" id="dice" role="group" aria-label="Dice"></div>
<button type="button" class="btn-brass" id="roll">{ic('dice')}<span>Roll (2 left)</span></button></div></div></div>'''
    return f'<div class="stage"><div class="rail">{studs}{plaques}<div class="board" id="board" role="group" aria-label="{t} board"></div></div></div>'

def game(g):
    t, names, toks, pl, _, right = GAMES[g]
    players = ''.join(f'<div class="player" data-side="{i + 1}"><i class="tok {toks[i]}"></i><span>{names[i]}</span><b>0</b></div>' for i in range(2))
    left = f'''<section class="card score"><h1>{t}</h1><div class="seg" role="group" aria-label="Game mode"><button type="button" aria-pressed="true">2 Players</button><button type="button" aria-pressed="false">Vs Computer</button></div>{players}<p class="who" id="who" role="status"></p></section>
<section class="card controls"><button type="button" class="act">{ic('undo')} Undo</button><button type="button" class="act" disabled>{ic('redo')} Redo</button><button type="button" class="act strong" id="restart">{ic('restart')} Restart</button></section>'''
    if right == 'moves':
        r = '<section class="card"><h2>Moves <span id="count">0</span></h2><ol class="log" id="log"></ol></section>'
        if g in ('chess', 'checkers'): r += '<section class="card"><h2>Captured</h2><div id="stats"><p class="dim">Nothing taken yet.</p></div></section>'
    elif right == 'sheet': r = SHEET
    else: r = '<section class="card"><h2>This game</h2><div id="stats"></div></section>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TurnTable · {t}</title>
<link rel="stylesheet" href="../mock-v2/fonts/fonts.css"><link rel="stylesheet" href="v3.css"></head>
<body class="game" data-game="{g}" data-table="baize" data-turn="1" data-names='{json.dumps(names)}'>
{top(True)}<main class="layout"><div class="left">{left}</div>{stage(g)}<div class="right">{r}</div></main>{rules(g)}<script src="shared3.js"></script></body></html>'''

PILLS = [('all', 'All', 26), ('strategy', 'Strategy', 13), ('dice', 'Dice', 4), ('hidden', 'Hidden', 2), ('card', 'Cards', 4), ('party', 'Party', 3)]
def home():
    pills = ''.join(f'<button type="button" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{n} <span>{c}</span></button>' for k, n, c in PILLS)
    cs = ''
    for i, (gid, _, cat) in enumerate(cats):
        href = f'game-{gid}.html' if gid in GAMES else '#'
        cs += f'<a class="icd-card" href="{href}" data-category="{cat}">{cards[i]}</a>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TurnTable · homepage</title>
<link rel="stylesheet" href="../mock-v2/fonts/fonts.css"><link rel="stylesheet" href="../../src/home/preserved-hub.css"><link rel="stylesheet" href="v3.css"></head>
<body class="home" data-table="baize">{top(False)}
<main class="page"><header class="hero"><h1 class="word">TurnTable</h1><p class="tag">26 games for two players and one screen. Pick one, pass the seat.</p></header>
<div class="bar"><label class="search">{ic('search')}<input id="search" type="search" placeholder="Search games" aria-label="Search games"></label><nav class="pills" aria-label="Filter games">{pills}</nav></div>
<div class="rule" aria-hidden="true"><i></i></div>
<div class="grid" id="grid">{cs}</div><p id="empty" class="empty" hidden>No game matches that search. Clear it to see all 26.</p></main>
<script src="shared3.js"></script></body></html>'''

(here / 'home.html').write_text(home())
for g in GAMES: (here / f'game-{g}.html').write_text(game(g))
links = ''.join(f'<a href="game-{g}.html">{GAMES[g][0]}</a>' for g in GAMES)
(here / 'index.html').write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TurnTable · Baize, round 2</title>
<style>body{{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0f3b2e;color:#eef1e6;padding:48px 24px}}main{{max-width:760px;margin:0 auto}}h1{{margin:0 0 6px}}p{{color:#b9c4b6;max-width:60ch}}
a{{display:inline-block;margin:6px 8px 0 0;padding:10px 16px;border-radius:999px;border:1.5px solid #d9a441;color:#d9a441;text-decoration:none;font-weight:700}}a.main{{background:#d9a441;color:#2a1b0e}}</style></head>
<body><main><h1>TurnTable · Baize, round 2</h1><p>The big circle is gone, the game pages have a back button, and the same table now holds seven different boards. Every board is playable: click around.</p>
<p><a class="main" href="home.html">Homepage</a></p><p>{links}</p></main></body></html>''')
print('built', len(GAMES) + 2, 'pages')
