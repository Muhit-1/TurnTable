# TurnTable — Project Plan

Browser-based collection of 26 two-player games (hot-seat, one device), plus optional AI opponents.
Stack: React 19 + TypeScript + Vite + Tailwind 4. Rules reference: `game-rules.txt`.

**Strategy:** mechanics first (headless, fully tested, ugly-but-functional UI), then one polish pass over the UI.
Each game is a self-contained module, so Phase 3 can restyle a game without touching its logic.

Legend: `[x]` done · `[ ]` to do

---

## Phase 1 — Foundation & Architecture  (status: 12/12 ✅ complete)

Goal: decide the shape once, so the 26 games are copy-paste-consistent instead of 26 one-offs.

- [x] Fix per-game folder convention: `src/games/<id>/{types.ts, logic.ts, ai.ts?, <Game>.tsx, main.tsx}`
- [x] Pure-logic rule: `logic.ts` has no React/DOM imports (immutable state in, new state out) → testable and reusable
- [x] Shared `GameEngine` interface: `initialState()`, `legalMoves(state)`, `applyMove(state, move)`, `getStatus(state)` → playing / won / draw
- [x] Shared `src/shared/` kit: `useGame` hook (state + undo/redo + reset), turn banner, scoreboard, mode toggle, controls, rules panel (game-over dialog and player-name inputs deferred to Phase 3 UI)
- [x] Registry file `src/games/registry.ts` (id, title, category, ready flag, rules text, video link) — drives homepage, routing, and vite inputs
- [x] Vite: auto-generate multi-page `input` from the registry (no hand-edited entry per game)
- [x] Add Vitest + first tests for Connect 4 logic (win detection, full column, draw)
- [x] Add lint/format (Biome — typescript-eslint doesn't support TypeScript 7 yet) + `npm run typecheck` + `npm test` scripts
- [x] GitHub Actions CI: typecheck, lint, test, build on every push/PR
- [x] Migrate Tic-Tac-Toe from standalone HTML to the React/TS structure
- [x] README: how to run, how to add a new game (checklist), folder layout
- [x] Game-selection homepage reads from the registry (basic, unstyled is fine)

---

## Phase 2 — Game Mechanics (all 26 games)  (status: 7/26 games done)

Goal: every game is fully playable and rule-correct with plain UI. Each game is "done" only when:
rules implemented per `game-rules.txt` · win/draw/end detection · invalid moves rejected · unit tests pass · hot-seat playable end to end · rules + video link reachable from the game page.

### 2A — Classic abstract strategy
- [x] Tic-Tac-Toe (React port, tests, minimax AI, undo)
- [x] Connect 4 (engine, tests, AI, undo/redo)
- [ ] Chess (castling, en passant, promotion, check/checkmate/stalemate, repetition, 50-move)
- [ ] Checkers / Draughts (forced captures, multi-jump, kings)
- [x] Reversi / Othello (flips, forced pass, end detection, alpha-beta AI)
- [x] Gomoku (freestyle 5+, heuristic AI)
- [ ] Go (captures, ko, suicide rule, pass/scoring)
- [ ] Dots and Boxes
- [x] Nim (normal + misère toggle, nim-sum AI)
- [ ] Nine Men's Morris (placing / moving / flying phases, mills)
- [ ] Quarto
- [x] Hex (11x11, shortest-path AI)
- [ ] Mancala / Kalah

### 2B — Dice & movement
- [ ] Backgammon
- [ ] Ludo
- [ ] Snakes and Ladders
- [ ] Yahtzee (seedable RNG so tests are deterministic)

### 2C — Hidden-info / pass-and-look-away
- [ ] Battleship (pass-device screen so players can't peek)
- [ ] Hangman

### 2D — Card-style
- [ ] War
- [ ] Go Fish
- [ ] Uno-style matching
- [ ] Memory / Concentration

### 2E — Party / word
- [x] Rock Paper Scissors (best of 3/5, hidden pass-the-device throw, random CPU)
- [ ] Scrabble-style word building (needs a dictionary file)
- [ ] 20 Questions / word-guessing

### 2F — Cross-cutting mechanics (added: things you didn't list)
- [x] Undo / redo for turn-based board games (`useGame`)
- [ ] Seedable RNG utility shared by dice/card games (reproducible tests + replays)
- [ ] Reusable deck/shuffle utility (War, Go Fish, Uno, Memory)
- [ ] AI opponents where reasonable: Tic-Tac-Toe, Connect 4, Reversi, Checkers, Nim, Gomoku, Mancala, RPS (vs computer mode); difficulty levels easy/medium/hard
- [ ] Run AI in a Web Worker so Chess/Go search never freezes the UI
- [ ] Game-state save/resume in `localStorage` (refresh doesn't lose a game)
- [x] Per-game rules panel + embedded "how to play" video link from `game-rules.txt`
- [ ] Integration smoke test per game: play a scripted full game to a finish

---

## Phase 3 — UI/UX Polish & Release  (status: 0/16)

Goal: make it feel like one product. Because Phase 1–2 isolate logic from rendering, this is mostly restyling components.

### Design system
- [ ] Design tokens (colors, spacing, radius, shadows, fonts) as Tailwind theme variables
- [ ] Dark / light theme + remembered preference
- [ ] Shared components restyled: buttons, dialogs, turn banner, scoreboard, toasts
- [ ] Redesign homepage (category filters, search, game cards, "recently played")

### Per-game graphics
- [ ] Board/piece art for each of the 26 games (SVG preferred, scales cleanly)
- [ ] Animations: disc drops, piece moves, card flips, dice rolls, win-line highlight
- [ ] Sound effects + mute toggle (off by default on first load)

### Quality & accessibility
- [ ] Responsive layouts: phone portrait, tablet, desktop (touch-first controls)
- [ ] Keyboard navigation + visible focus on every game
- [ ] Screen-reader labels, ARIA live region announcing moves/turn changes
- [ ] Color-blind-safe piece colors (shape/pattern, not only color)
- [ ] `prefers-reduced-motion` respected

### Release
- [ ] Performance: code-split per game, lazy-load assets, Lighthouse ≥ 90
- [ ] SEO/meta tags, favicon, social preview image, PWA manifest (installable/offline)
- [ ] Deploy (GitHub Pages / Netlify / Vercel) via CI

---

## Backlog / Maybe later (not scheduled)
- Online multiplayer (WebSocket or WebRTC)
- Stats and win/loss history per player
- Replay / move-list export (PGN for Chess)
- Localization (i18n)
- Tutorial mode with guided first game

---

## Suggested order inside Phase 2
Easy → hard so the shared kit gets proven early:
Tic-Tac-Toe → Connect 4 → Nim → Rock Paper Scissors → Gomoku → Hex → Reversi → Mancala → Dots and Boxes → Hangman → Memory → War → Snakes and Ladders → Yahtzee → Checkers → Quarto → Nine Men's Morris → Ludo → Go Fish → Uno-style → Battleship → Backgammon → Scrabble-style → 20 Questions → Chess → Go
