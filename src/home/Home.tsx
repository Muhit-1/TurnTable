import { useState } from 'react';
import { CATEGORY_LABELS, type Category, games } from '../games/registry';
import { CARD_HTML } from './cardHtml';

type Filter = 'all' | Category;
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
  const count = (c: Filter) => (c === 'all' ? games.length : games.filter((g) => g.category === c).length);
  return (
    <div className="page">
      <div className="head">
        <h1 className="wordmark">TurnTable</h1>
        <p className="tagline">{games.length} two-player games, one shared screen.</p>
      </div>

      <nav className="filters" aria-label="Filter games by category">
        {(['all', ...filters] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : SHORT[f]} <span className="count">{count(f)}</span>
          </button>
        ))}
      </nav>

      <div className="grid">
        {games.map((g, i) => {
          const visible = filter === 'all' || g.category === filter;
          const cls = 'icd-card';
          // The inner markup (previews, panel, number) is generated from the approved mock.
          const inner = { __html: CARD_HTML[i] ?? '' };
          return g.ready ? (
            <a
              key={g.id}
              className={cls}
              href={`allgames/${g.id}/`}
              hidden={!visible}
              aria-label={`Play ${g.title}`}
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
    </div>
  );
}
