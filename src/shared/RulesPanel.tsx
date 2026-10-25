import { useEffect, useRef } from 'react';
import { getGame } from '../games/registry';

/** How-to-play dialog (the preserved `.gp-modal` look) with the rules and the video link for a game, read from the registry. */
export function RulesDialog({
  gameId,
  open,
  onClose,
}: {
  gameId: string;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const g = getGame(gameId);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  if (!g) return null;
  const blocks = [
    ['Objective', g.objective],
    ['Setup', g.setup],
    ['Turns', g.howToPlay],
    ['Winning', g.howToWin],
  ] as const;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog; the click only dismisses via the backdrop
    <dialog
      ref={ref}
      className="gp-modal"
      aria-labelledby="rules-title"
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop (the dialog element itself) closes it
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="gp-modal-inner">
        <div className="gp-modal-head">
          <h2 className="gp-modal-title" id="rules-title">
            How to play {g.title}
          </h2>
          <button type="button" className="gp-modal-close" aria-label="Close rules" onClick={onClose}>
            ✕
          </button>
        </div>
        <dl className="gp-rules">
          {blocks.map(([label, body]) => (
            <div key={label} className="gp-rule-block">
              <dt className="gp-rule-label">{label}</dt>
              <dd className="gp-rule-body">{body}</dd>
            </div>
          ))}
        </dl>
        <div className="gp-video">
          <a className="gp-video-link" href={g.videoUrl} target="_blank" rel="noreferrer">
            ▶ {g.videoTitle}
          </a>
        </div>
      </div>
    </dialog>
  );
}
