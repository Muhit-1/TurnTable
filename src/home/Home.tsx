import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CATEGORY_LABELS, type Category, games, getGame } from '../games/registry';
import { IconSearch } from '../shared/icons';
import { recentGames } from '../shared/recent';
import { TopBar } from '../shared/TopBar';
import { applyTable, loadTable } from '../shared/tableTheme';
import { CARD_HTML } from './cardHtml';

type Filter = 'all' | Category;
const cardName = (i: number) =>
  (/icd-panel-name">([^<]*)</.exec(CARD_HTML[i] ?? '')?.[1] ?? '').replace(/&amp;/g, '&').toLowerCase();

const filters = Object.keys(CATEGORY_LABELS) as Category[];
const SHORT: Record<Category, string> = {
  strategy: 'Strategy',
  dice: 'Dice',
  hidden: 'Hidden',
  card: 'Cards',
  party: 'Party',
};

export default function Home() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [recent] = useState(recentGames);
  const q = query.trim().toLowerCase();
  const count = (c: Filter) => (c === 'all' ? games.length : games.filter((g) => g.category === c).length);
  const matches = (g: (typeof games)[number], i: number) =>
    (filter === 'all' || g.category === filter) &&
    (!q || `${cardName(i)} ${g.title}`.toLowerCase().includes(q));

  useEffect(() => {
    applyTable(loadTable());
  }, []);

  // A brass pointer under the active category, like the one on a board's rail.
  const rule = useRef<HTMLDivElement>(null);
  const pills = useRef<HTMLElement>(null);
  const [pointerX, setPointerX] = useState<number | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the active filter changes
  useLayoutEffect(() => {
    const place = () => {
      const on = pills.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
      const box = rule.current?.getBoundingClientRect();
      if (!on || !box) return;
      const r = on.getBoundingClientRect();
      setPointerX(r.left + r.width / 2 - box.left);
    };
    place();
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener('resize', place);
  }, [filter]);

  return (
    <>
      <TopBar back={false} />
      <main className="page">
        <header className="hero">
          <h1 className="word">TurnTable</h1>
          <p className="tag">{games.length} games for two players and one screen. Pick one, pass the seat.</p>
        </header>

        <div className="bar">
          <label className="search">
            <IconSearch />
            <input
              type="search"
              placeholder="Search games"
              aria-label="Search games"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <nav className="pills" aria-label="Filter games by category" ref={pills}>
            {(['all', ...filters] as Filter[]).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : SHORT[f]} <span>{count(f)}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="rule" aria-hidden="true" ref={rule}>
          <i style={{ left: pointerX ?? 0, opacity: pointerX === null ? 0 : 1 }} />
        </div>

        {recent.length > 0 && !q && (
          <div className="recent">
            Recently played
            {recent.map((id) => {
              const g = getGame(id);
              return g ? (
                <a key={id} href={`allgames/${id}/`}>
                  {g.title}
                </a>
              ) : null;
            })}
          </div>
        )}

        <div className="grid">
          {games.map((g, i) => {
            const inner = { __html: CARD_HTML[i] ?? '' };
            return g.ready ? (
              <a
                key={g.id}
                className="icd-card"
                href={`allgames/${g.id}/`}
                hidden={!matches(g, i)}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: static, build-time markup
                dangerouslySetInnerHTML={inner}
              />
            ) : (
              <div
                key={g.id}
                className="icd-card"
                hidden={!matches(g, i)}
                aria-disabled="true"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: static, build-time markup
                dangerouslySetInnerHTML={inner}
              />
            );
          })}
        </div>
        {!games.some(matches) && (
          <p className="empty" role="status">
            No game matches "{query}". Clear the search to see all {games.length}.
          </p>
        )}
      </main>
    </>
  );
}
