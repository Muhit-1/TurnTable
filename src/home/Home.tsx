import { CATEGORY_LABELS, type Category, games } from '../games/registry';

const categories = Object.keys(CATEGORY_LABELS) as Category[];

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-100 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <header>
          <h1 className="text-4xl font-bold">TurnTable</h1>
          <p className="text-neutral-600">{games.length} two-player games, one device.</p>
        </header>
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[cat]}</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {games
                .filter((g) => g.category === cat)
                .map((g) => (
                  <li key={g.id}>
                    {g.ready ? (
                      <a
                        href={`allgames/${g.id}/`}
                        className="block rounded border bg-white p-4 hover:bg-neutral-50 font-medium"
                      >
                        {g.title}
                      </a>
                    ) : (
                      <span className="block rounded border border-dashed p-4 text-neutral-400">
                        {g.title} <small>(soon)</small>
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
