# TurnTable

26 two-player games in the browser: chess, checkers, Go, Connect Four, Backgammon, Yahtzee, Battleship and more.
Play hot-seat on one screen, or against the computer (easy / medium / hard) in most games.

- Warm "tavern table" look: wooden board frames, gem pieces, 8 table colours to choose from.
- Large boards on big screens, fully responsive down to a phone.
- Soft sound effects (a gentle "tong" per move, a chime for a win) with a mute button.
- Undo / redo, and every game resumes where you left it.
- Light and dark themes, keyboard play (arrow keys), screen-reader labels, colour-blind-safe pieces.
- Installable and works offline (service worker precaches every game).
- No accounts, no server: everything runs and saves locally in your browser.

React 19 · TypeScript · Vite · Tailwind 4 · Vitest · Biome. Rules for every game: [`game-rules.txt`](game-rules.txt). Roadmap: [`PLAN.md`](PLAN.md).

## Run

```bash
npm install
npm run dev         # dev server, open http://localhost:5173/
npm test            # vitest
npm run lint        # biome (use `npm run format` to auto-fix)
npm run typecheck
npm run build       # typecheck + production build into dist/
```

## Layout

```
index.html                 homepage entry (src/home)
allgames/<id>/index.html   one HTML entry per game (loads src/games/<id>/main.tsx)
src/games/registry.ts      single source of truth: id, title, category, rules text, video, ready flag
src/games/<id>/            types.ts · logic.ts · engine.ts · ai.ts? · <Game>.tsx · main.tsx · *.test.ts
src/shared/                GameEngine interface, useGame hook (undo/redo), shared UI, RulesPanel
design/                    prototypes and the design mock + guide (open design/mock/design-guide.html)
```

`vite.config.ts` builds the homepage plus every registry entry with `ready: true`; there is nothing to register by hand.

## Adding a game

1. Add/confirm its entry in `src/games/registry.ts` (rules text is already there for all 26).
2. Create `src/games/<id>/`:
   - `logic.ts`: pure rules, **no React/DOM imports**, immutable state in → new state out.
   - `engine.ts`: implement `GameEngine` from `src/shared/engine.ts` (`initialState`, `currentPlayer`,
     `legalMoves`, `applyMove` returning `null` for illegal moves, `getStatus`).
   - `<Game>.tsx`: use `useMatch(engine, { pickMove })` (pvp / vs-computer, scores, undo) and the shared components (`GameShell`, `TurnBanner`, `GameControls`, ...).
   - `engine.test.ts` covering legal/illegal moves, win, draw, no moves after game over.
3. `scripts/scaffold-entry.sh <id> <ComponentName> "<Title>"` creates `allgames/<id>/index.html` and `src/games/<id>/main.tsx`.
4. Add the game to `src/games/harness.ts` (engine, optional `choose(state, level)` for the computer, and a complete-game playthrough) — `npm test` fails until every registered game has an entry.
5. Set `ready: true` in the registry. Run `npm run lint && npm run typecheck && npm test && npm run build`.

Saving and difficulty: pass `persistId: '<id>'` to `useMatch` to save/resume the match (position, mode, scores), and use `useLevel('<id>')` for a remembered easy/medium/hard picker. Variants (board size, rules) belong in the `persistId` so each has its own save.

Games that don't fit the strict two-player alternating-turn engine (dice, hidden info, cards) can extend it
in Phase 2; keep their rules in `logic.ts` and unit-tested all the same.

## Design

The look is documented in [`design/mock/design-guide.html`](design/mock/design-guide.html) (colours, type, components, motion, board look).
The homepage card hover and preview animations are deliberately fixed: `src/home/preserved-hub.css` and `src/styles/preserved-game.css` are
verbatim copies of the original prototypes, and `node design/mock/check-motion.mjs` fails if they drift. Re-theme through
`src/styles/tavern.css` (colours, fonts, new components) instead of editing them.

Sounds are generated with the Web Audio API in `src/shared/sound.ts`; no audio files are shipped.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml` (lint, typecheck, tests, build) and publishes `dist/` to GitHub Pages.
Turn it on once in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The site URL used for canonical links and the sitemap defaults to `https://muhit-1.github.io/TurnTable/`; override it with the `SITE_URL` environment variable when building.
`scripts/sitePlugin.ts` generates the meta tags, sitemap, robots.txt and the offline service worker from the game registry.

## Contributing

1. Branch from `main`, make a change, then run `npm run lint && npm run typecheck && npm test && npm run build`.
2. Keep game rules in pure `logic.ts` files with unit tests; keep UI in the game's `.tsx`.

## Licence

Source code: ISC (see `package.json`). Bundled fonts (Fraunces, Karla, JetBrains Mono, Fredoka) are under the SIL Open Font License 1.1.
