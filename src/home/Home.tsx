import { useEffect, useState } from 'react';
import { CATEGORY_LABELS, type Category, games, getGame } from '../games/registry';
import { PenDefs } from '../shared/PenDefs';
import { applyPaper, loadPaper } from '../shared/paper';
import { MAX_NAME_LENGTH, setPlayerName, usePlayerNames } from '../shared/playerNames';
import { recentGames } from '../shared/recent';
import { TopBar } from '../shared/TopBar';
import { BLURBS } from './blurbs';
import { glyphSvg } from './glyphs';

type Filter = 'all' | Category;

const SHORT: Record<Category, string> = {
  strategy: 'Strategy',
  dice: 'Dice',
  hidden: 'Hidden',
  card: 'Cards',
  party: 'Party',
};
const filters = Object.keys(CATEGORY_LABELS) as Category[];

export default function Home() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [recent] = useState(recentGames);
  const names = usePlayerNames();
  const q = query.trim().toLowerCase();

  useEffect(() => {
    applyPaper(loadPaper());
  }, []);

  const count = (c: Filter) => (c === 'all' ? games.length : games.filter((g) => g.category === c).length);
  const shown = games.filter(
    (g) =>
      (filter === 'all' || g.category === filter) &&
      (!q || `${BLURBS[g.id]?.name ?? ''} ${g.title}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <PenDefs />
      <TopBar back={false} />
      <main className="home-page">
        <section className="home-head" aria-labelledby="title">
          <h1 className="home-title" id="title">
            <b>Turn</b>
            <i>Table</i>
            <svg viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength="100" d="M4 14 C70 4 130 24 200 12 S330 6 396 16 C340 22 300 20 262 25" />
            </svg>
          </h1>
          <div>
            <p className="home-lede">
              {games.length} games for two people and one screen. <mark>Pick one, then take turns.</mark>
            </p>
            <div className="home-names">
              {([1, 2] as const).map((p) => (
                <label key={p} className={`n${p}`}>
                  Player {p}
                  <input
                    type="text"
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    placeholder={p === 1 ? 'write your name' : 'and theirs'}
                    defaultValue={names[p]}
                    onChange={(e) => setPlayerName(p, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <div className="home-tabs">
          <fieldset className="home-tabset">
            <legend className="sr-only">Kind of game</legend>
            {(['all', ...filters] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className="home-tab"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : SHORT[f]} <small>{count(f)}</small>
              </button>
            ))}
          </fieldset>
          <input
            className="home-find"
            type="search"
            placeholder="Find a game…"
            aria-label="Find a game"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {recent.length > 0 && !q && (
          <p className="home-recent">
            Last played
            {recent.map((id) => {
              const g = getGame(id);
              return g ? (
                <a key={id} href={`allgames/${id}/`}>
                  {BLURBS[id]?.name ?? g.title}
                </a>
              ) : null;
            })}
          </p>
        )}

        <section className="home-list" aria-label="Games">
          {shown.map((g) => {
            const blurb = BLURBS[g.id];
            const body = (
              <>
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: fixed drawings built in glyphs.ts, never from user input */}
                <span className="home-drawing" dangerouslySetInnerHTML={{ __html: glyphSvg(g.id) }} />
                <span className="home-what">
                  <b>{blurb?.name ?? g.title}</b>
                  <span>
                    {blurb?.line}
                    {blurb?.computer && <em> Or play the computer.</em>}
                  </span>
                </span>
              </>
            );
            return g.ready ? (
              <a key={g.id} className="home-entry" href={`allgames/${g.id}/`}>
                {body}
              </a>
            ) : (
              <div key={g.id} className="home-entry home-soon" aria-disabled="true">
                {body}
              </div>
            );
          })}
          {shown.length === 0 && (
            <p className="home-none" role="status">
              Nothing here is called “{query}”. Rub it out to see all {games.length} games.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
