import { getGame } from '../games/registry';

/** Collapsible rules + how-to-play video link for a game, read from the registry. */
export function RulesPanel({ gameId }: { gameId: string }) {
  const g = getGame(gameId);
  if (!g) return null;
  const blocks = [
    ['Objective', g.objective],
    ['Setup', g.setup],
    ['Turns', g.howToPlay],
    ['Winning', g.howToWin],
  ] as const;
  return (
    <details className="panel rules-panel">
      <summary className="kicker">How to play</summary>
      <dl className="gp-rules">
        {blocks.map(([label, body]) => (
          <div key={label} className="gp-rule-block">
            <dt className="gp-rule-label">{label}</dt>
            <dd className="gp-rule-body">{body}</dd>
          </div>
        ))}
      </dl>
      <a className="gp-video-link" href={g.videoUrl} target="_blank" rel="noreferrer">
        ▶ {g.videoTitle}
      </a>
    </details>
  );
}
