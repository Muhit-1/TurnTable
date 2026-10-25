import { type CSSProperties, type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import '../styles/fonts.css';
import '../styles/preserved-game.css';
import '../styles/tavern.css';
import '../styles/shell.css';
import { CATEGORY_LABELS, getGame } from '../games/registry';
import type { PlayerId } from './engine';
import { RulesPanel } from './RulesPanel';
import { isMuted, setMuted, sfx, subscribeMuted } from './sound';
import { applyTable, loadTable, saveTable, TABLE_THEMES } from './tableTheme';

export type Mode = 'pvp' | 'vs-cpu';

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <fieldset className="seg">
      <legend className="sr-only">Game mode</legend>
      <button type="button" aria-pressed={mode === 'pvp'} onClick={() => onChange('pvp')}>
        2 Players
      </button>
      <button type="button" aria-pressed={mode === 'vs-cpu'} onClick={() => onChange('vs-cpu')}>
        Vs Computer
      </button>
    </fieldset>
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
    <div className="scoreboard">
      <span className="score-chip">
        <i className="gem" aria-hidden="true" />
        <span className="score-name">{names[1]}</span>
        <b>{scores[1]}</b>
      </span>
      <span className="score-chip">
        <i className="gem sapphire" aria-hidden="true" />
        <span className="score-name">{names[2]}</span>
        <b>{scores[2]}</b>
      </span>
    </div>
  );
}

export function TurnBanner({ children }: { children: ReactNode }) {
  return (
    <div className="turn-line" role="status" aria-live="polite">
      {children}
    </div>
  );
}

/** The wooden frame with brass inlay and corner studs that every board sits in. Pass `frame` colours to tint it per game. */
export function BoardFrame({
  children,
  className = '',
  frame,
}: {
  children: ReactNode;
  className?: string;
  frame?: [string, string];
}) {
  const style = frame ? ({ '--frame-1': frame[0], '--frame-2': frame[1] } as CSSProperties) : undefined;
  return (
    <div className={`board-frame ${className}`} style={style}>
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
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
  return (
    <div className="gp-actions">
      <button type="button" className="gp-btn" disabled={!canUndo} onClick={onUndo}>
        ↶ Undo
      </button>
      <button type="button" className="gp-btn" disabled={!canRedo} onClick={onRedo}>
        ↷ Redo
      </button>
      <button type="button" className="gp-btn" onClick={onRestart}>
        ⟲ Restart
      </button>
    </div>
  );
}

function TableTools() {
  const [table, setTable] = useState(loadTable);
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  useEffect(() => {
    applyTable(table);
  }, [table]);
  return (
    <div className="table-tools">
      <fieldset className="swatches">
        <legend className="sr-only">Table colour</legend>
        {TABLE_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="swatch"
            title={t.name}
            aria-label={t.name}
            aria-pressed={t.id === table}
            style={{ background: t.hex }}
            onClick={() => {
              saveTable(t.id);
              setTable(t.id);
            }}
          />
        ))}
      </fieldset>
      <button
        type="button"
        className="icon-pill"
        aria-pressed={!muted}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        onClick={() => {
          setMuted(!muted);
          if (muted) sfx.tick();
        }}
      >
        {muted ? '🔇 Sound off' : '🔊 Sound on'}
      </button>
    </div>
  );
}

export function GameShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const meta = getGame(id);
  useEffect(() => {
    document.body.classList.add('theme-tavern');
    return () => document.body.classList.remove('theme-tavern');
  }, []);
  return (
    <div className="gp-page">
      <nav className="gp-nav">
        <a className="gp-back" href="../../">
          ← All games
        </a>
        <span className="gp-wordmark">TurnTable</span>
        <TableTools />
      </nav>
      <header className="game-head">
        {meta && <p className="gp-eyebrow">{CATEGORY_LABELS[meta.category]}</p>}
        <h1 className="gp-title">{title}</h1>
      </header>
      {/* A click on any button gets a soft tick; moves play their own (louder) note first and win the debounce. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: delegated sound only, the buttons inside handle keys */}
      <main
        className="ts-stage"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) sfx.tick();
        }}
      >
        {children}
      </main>
      <RulesPanel gameId={id} />
    </div>
  );
}

/** "You" → "Your", "Player 1" → "Player 1's". */
export const possessive = (name: string) => (name === 'You' ? 'Your' : `${name}'s`);
