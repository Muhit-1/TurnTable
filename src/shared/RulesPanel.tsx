import { getGame } from '../games/registry';

/** Collapsible rules + how-to-play video link for a game, read from the registry. */
export function RulesPanel({ gameId }: { gameId: string }) {
  const g = getGame(gameId);
  if (!g) return null;
  return (
    <details className="max-w-md text-sm bg-white border rounded p-3">
      <summary className="cursor-pointer font-medium">How to play</summary>
      <dl className="mt-2 flex flex-col gap-2">
        <div>
          <dt className="font-semibold">Objective</dt>
          <dd>{g.objective}</dd>
        </div>
        <div>
          <dt className="font-semibold">Setup</dt>
          <dd>{g.setup}</dd>
        </div>
        <div>
          <dt className="font-semibold">Turns</dt>
          <dd>{g.howToPlay}</dd>
        </div>
        <div>
          <dt className="font-semibold">Winning</dt>
          <dd>{g.howToWin}</dd>
        </div>
      </dl>
      <a className="underline mt-2 inline-block" href={g.videoUrl} target="_blank" rel="noreferrer">
        ▶ {g.videoTitle}
      </a>
    </details>
  );
}
