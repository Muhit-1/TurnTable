# Design mock v2: two directions

Open `index.html`. Each direction has a homepage and a Chess game page. Nothing here touches the app.

- **A · Baize**: green felt, chalk, brass. The board sits on a round turntable platter; a brass pointer swings to the seat whose turn it is.
- **B · Box lid**: sunshine, thick ink outlines, hard shadows. A coin flips between White and Black; the board sits in a box lid with a printed tab.

The homepage cards are the app's real cards (`src/home/cardHtml.ts` + `src/home/preserved-hub.css`), so the hover and preview animations are the preserved ones.
Rebuild the pages after editing `build.py`: `python3 design/mock-v2/build.py`. Fonts are OFL (Alfa Slab One, Figtree, Bricolage Grotesque, JetBrains Mono).
