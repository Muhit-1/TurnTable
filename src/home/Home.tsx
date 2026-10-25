import { useState } from 'react';
import { CATEGORY_LABELS, type Category, games, getGame } from '../games/registry';
import { recentGames } from '../shared/recent';
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
  return (
    <div className="page">
      <div className="head">
        <h1 className="wordmark">TurnTable</h1>
        <p className="tagline">{games.length} two-player games, one shared screen.</p>
      </div>

      <div className="hub-tools">
        <input
          className="hub-search"
          type="search"
          placeholder="Search games"
          aria-label="Search games"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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

      <nav className="filters" aria-label="Filter games by category">
        {(['all', ...filters] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : SHORT[f]} <span className="count">{count(f)}</span>
          </button>
        ))}
      </nav>

      <div className="grid">
        {games.map((g, i) => {
          const visible =
            (filter === 'all' || g.category === filter) &&
            (!q || `${cardName(i)} ${g.title}`.toLowerCase().includes(q));
          const cls = 'icd-card';
          // The inner markup (previews, panel, number) is generated from the approved mock.
          const inner = { __html: CARD_HTML[i] ?? '' };
          return g.ready ? (
            <a
              key={g.id}
              className={cls}
              href={`allgames/${g.id}/`}
              hidden={!visible}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: static, build-time markup
              dangerouslySetInnerHTML={inner}
            />
          ) : (
            <div
              key={g.id}
              className={cls}
              hidden={!visible}
              aria-disabled="true"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: static, build-time markup
              dangerouslySetInnerHTML={inner}
            />
          );
        })}
      </div>
      {!games.some(
        (g, i) =>
          (filter === 'all' || g.category === filter) &&
          (!q || `${cardName(i)} ${g.title}`.toLowerCase().includes(q)),
      ) && (
        <p className="empty" role="status">
          No games match "{query}".
        </p>
      )}
    </div>
  );
}
