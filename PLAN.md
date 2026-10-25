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

## Phase 2 — Game Mechanics (all 26 games)  (status: 26/26 games + all cross-cutting items ✅ complete)

Goal: every game is fully playable and rule-correct with plain UI. Each game is "done" only when:
rules implemented per `game-rules.txt` · win/draw/end detection · invalid moves rejected · unit tests pass · hot-seat playable end to end · rules + video link reachable from the game page.

### 2A — Classic abstract strategy
- [x] Tic-Tac-Toe (React port, tests, minimax AI, undo)
- [x] Connect 4 (engine, tests, AI, undo/redo)
- [x] Chess (full rules verified with perft on 5 reference positions; SAN move list; alpha-beta AI with 3 difficulty levels running in a Web Worker; draws applied automatically: stalemate, insufficient material, threefold repetition, 50-move)
- [x] Checkers / Draughts (forced captures, multi-jump, kings, 40-move draw, alpha-beta AI)
- [x] Reversi / Othello (flips, forced pass, end detection, alpha-beta AI)
- [x] Gomoku (freestyle 5+, heuristic AI)
- [x] Go (9/13/19 boards, captures, no-suicide, positional superko, area scoring with 7.5 komi, Monte Carlo tree search AI with 3 levels in a Web Worker)
- [x] Dots and Boxes (4x4, extra turns, chain-aware AI)
- [x] Nim (normal + misère toggle, nim-sum AI)
- [x] Nine Men's Morris (placing / moving / flying phases, mills, 100-ply quiet draw, AI)
- [x] Quarto (give/place turns, 10 lines, AI avoids handing over winning pieces)
- [x] Hex (11x11, shortest-path AI)
- [x] Mancala / Kalah (captures, extra turns, alpha-beta AI)

### 2B — Dice & movement
- [x] Backgammon (full rules incl. bar, hitting, bearing off, must-use-both-dice and larger-die rules, doubles; no doubling cube or gammon scoring; heuristic AI)
- [x] Ludo (52-square loop, sixes give extra rolls, 3-six forfeit, captures, exact home roll, AI)
- [x] Snakes and Ladders (classic 100-square board, exact finish, seeded dice)
- [x] Yahtzee (seeded dice, holds, upper bonus, extra-Yahtzee bonus + joker, computer opponent; simplified: no forced-category joker rule)

### 2C — Hidden-info / pass-and-look-away
- [x] Battleship (placement + random fleet, pass-the-device gate, hunt/target AI)
- [x] Hangman (hidden secret entry for 2 players or random word vs computer, alternating roles)

### 2D — Card-style
- [x] War (seeded deal, 3-down wars, 2000-flip stalemate cap)
- [x] Go Fish (books, empty-hand refill, pass-the-device gate, AI)
- [x] Uno-style matching (108-card deck, 2-player skip/reverse, draw-then-play, AI)
- [x] Memory / Concentration (6/8/12 pairs, memory-limited AI)

### 2E — Party / word
- [x] Rock Paper Scissors (best of 3/5, hidden pass-the-device throw, random CPU)
- [x] Scrabble-style word building (270k-word dictionary vendored and lazy-loaded, full scoring with premiums/blanks/bingo, exchange/pass/end rules, move-generator AI)
- [x] 20 Questions / word-guessing (hot-seat with hidden secret, or computer guesses from a 54-item database)

### 2F — Cross-cutting mechanics (added: things you didn't list)
- [x] Undo / redo for turn-based board games (`useGame`)
- [x] Seedable RNG utility shared by dice/card games (`src/shared/rng.ts`)
- [x] Reusable deck/shuffle utility (`src/shared/deck.ts`)
- [x] AI opponents where reasonable (vs-computer mode in every game that has choices; hidden-information games use pass-the-device)
- [x] Difficulty levels easy/medium/hard for every game with a computer opponent that makes real choices (search depth, memory span, shots strategy, roll count, or random-move rate; remembered per game; Rock Paper Scissors, War and Snakes and Ladders have no choices to weaken)
- [x] Run AI in a Web Worker so Chess/Go search never freezes the UI (`src/shared/workerRpc.ts`, with main-thread fallback)
- [x] Game-state save/resume in `localStorage` (position, mode, scores and settings such as board size/variant; the undo history is not saved; Hangman and 20 Questions are not saved so a hidden word is never stored)
- [x] Per-game rules panel + embedded "how to play" video link from `game-rules.txt`
- [x] Integration test per game: `src/games/playthrough.test.ts` plays a complete game for every game in the registry, checks the computer at all 3 levels, and checks states survive JSON; it fails if a registered game has no harness entry

---

## Phase 3 — UI/UX Polish & Release  (status: 5/16)

> Design mock ready for review: `design/mock/homepage.html`, `game-board.html`, `design-guide.html` (open in a browser). Card hovers/animations are preserved verbatim and guarded by `node design/mock/check-motion.mjs`. It is now built into the app (tavern theme, preserved card motion, wooden board frames, bigger boards, sound).

Goal: make it feel like one product. Because Phase 1–2 isolate logic from rendering, this is mostly restyling components.

### Design system
- [x] Design tokens (colors, radius, shadows, fonts) as CSS variables in `src/styles/tavern.css`
- [ ] Dark / light theme + remembered preference
- [ ] Shared components restyled: buttons, turn banner, scoreboard, mode toggle, controls, rules panel and board frame done; dialogs and toasts still to do
- [x] Redesign homepage (category filters, animated game cards) — search and "recently played" still to do

### Per-game graphics
- [ ] Board/piece art: 22 of 26 games done (wooden frames, gem/stone/checker pieces, felt/paper boards, card backs and faces, pip dice); Hangman, 20 Questions, Scrabble and Rock Paper Scissors still have the basic look
- [x] Animations: pieces pop in and discs flip, Connect Four discs drop, cards flip/deal, dice tumble, last-move and win glow (all switched off by `prefers-reduced-motion`)
- [x] Sound effects + mute toggle (soft "tong" per move, win chime; mute remembered)

### Quality & accessibility
- [x] Responsive layouts: every game checked at 390px (no sideways scroll; fixed-size boards shrink to fit) and the shell at 1920px
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
