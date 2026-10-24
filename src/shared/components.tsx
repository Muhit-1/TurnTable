import type { ReactNode } from 'react';
import type { PlayerId } from './engine';
import { RulesPanel } from './RulesPanel';

export type Mode = 'pvp' | 'vs-cpu';

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const cls = (active: boolean) =>
    `px-4 py-2 rounded border ${active ? 'bg-neutral-900 text-white' : 'bg-white'}`;
  return (
    <div className="flex gap-2">
      <button type="button" className={cls(mode === 'pvp')} onClick={() => onChange('pvp')}>
        2 Players
      </button>
      <button type="button" className={cls(mode === 'vs-cpu')} onClick={() => onChange('vs-cpu')}>
        Vs Computer
      </button>
    </div>
  );
}

export function Scoreboard({
  names,
  scores,
}: {
  names: Record<PlayerId, string>;
  scores: Record<PlayerId, number>;
}) {
  return (
    <div className="flex items-center gap-6 text-sm font-medium">
      <span>
        {names[1]}: {scores[1]}
      </span>
      <span>
        {names[2]}: {scores[2]}
      </span>
    </div>
  );
}

export function TurnBanner({ children }: { children: ReactNode }) {
  return (
    <div className="h-6 text-sm text-neutral-600" role="status" aria-live="polite">
      {children}
    </div>
  );
}

export function GameControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRestart,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRestart: () => void;
}) {
  const btn = 'px-4 py-2 rounded border bg-white hover:bg-neutral-50 disabled:opacity-40';
  return (
    <div className="flex gap-2">
      <button type="button" className={btn} disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <button type="button" className={btn} disabled={!canRedo} onClick={onRedo}>
        Redo
      </button>
      <button type="button" className={btn} onClick={onRestart}>
        Restart
      </button>
    </div>
  );
}

export function GameShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center gap-6 py-10 px-4">
      <a href="../../" className="self-start text-sm text-neutral-600 hover:text-neutral-900">
        ← All games
      </a>
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
      <RulesPanel gameId={id} />
    </div>
  );
}
