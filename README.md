# TurnTable

Browser-based collection of 26 two-player games (hot-seat on one device, with a computer opponent where it makes sense).
React 19 · TypeScript · Vite · Tailwind 4. Rules for every game: [`game-rules.txt`](game-rules.txt). Roadmap: [`PLAN.md`](PLAN.md).

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
design/                    static visual prototypes kept as reference for the UI-polish phase
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
