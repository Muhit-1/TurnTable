import { type CSSProperties, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import '../styles/fonts.css';
import '../styles/preserved-game.css';
import '../styles/tavern.css';
import '../styles/shell.css';
import { CATEGORY_LABELS, getGame } from '../games/registry';
import type { PlayerId } from './engine';
import { notify } from './notify';
import { RulesDialog } from './RulesPanel';
import { rememberRecent } from './recent';
import { isMuted, setMuted, sfx, subscribeMuted } from './sound';
import { applyTable, loadTable, saveTable, TABLE_THEMES } from './tableTheme';
import { applyTheme, currentTheme, setTheme, useTheme } from './theme';

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

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A die face with pips. `rollKey` changes (e.g. a roll counter) replay the tumble animation. */
export function Die({
  value,
  size = '2.6rem',
  rollKey,
  held,
}: {
  value: number;
  size?: string;
  rollKey?: string | number;
  held?: boolean;
}) {
  const on = new Set(PIPS[value] ?? []);
  return (
    <span
      key={rollKey}
      role="img"
      aria-label={`die showing ${value}`}
      className={`die-face dice-tumble${held ? ' held' : ''}`}
      style={{ '--d': size } as CSSProperties}
    >
      {Array.from({ length: 9 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 3x3 pip grid
        <i key={i} style={{ visibility: on.has(i) ? 'visible' : 'hidden' }} />
      ))}
    </span>
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

function TableTools({ onRules }: { onRules: () => void }) {
  const [table, setTable] = useState(loadTable);
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const [theme, toggleTheme] = useTheme();
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
      <button type="button" className="icon-pill" aria-keyshortcuts="?" onClick={onRules}>
        📖 Rules
      </button>
      <button
        type="button"
        className="icon-pill"
        aria-pressed={theme === 'dark'}
        aria-keyshortcuts="t"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>
      <button
        type="button"
        className="icon-pill"
        aria-pressed={!muted}
        aria-keyshortcuts="m"
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

/** Toast and end-of-game popup, driven by `notify`. Neither blocks the board. */
function Overlays() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [award, setAward] = useState<{ id: number; result: 'won' | 'draw'; text: string } | null>(null);
  useEffect(
    () =>
      notify.subscribe((e) => {
        if (e.kind === 'toast') {
          const id = Date.now();
          setToast({ id, message: e.message });
          window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2400);
        } else {
          // The turn line already holds the result with the right player names ("Player 1 wins!").
          window.setTimeout(() => {
            const id = Date.now();
            const text = document.querySelector('.turn-line')?.textContent?.trim() || 'Game over';
            setAward({ id, result: e.result, text });
            window.setTimeout(() => setAward((a) => (a?.id === id ? null : a)), 3800);
          }, 700);
        }
      }),
    [],
  );
  return (
    <>
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.message}
        </div>
      )}
      {award && (
        <div className="overlay top" key={award.id}>
          <button type="button" className="award-card" onClick={() => setAward(null)} aria-label="Dismiss">
            <span className="medal" aria-hidden="true">
              {award.result === 'won' ? '🏆' : '🤝'}
            </span>
            <span className="kicker">{award.result === 'won' ? 'Game over' : 'Nobody wins'}</span>
            <span className="title">{award.text}</span>
            <span className="hint">Press Restart to play again</span>
            <span className="drain" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Arrow keys move focus to the nearest enabled button in that direction, so any board can be played from the keyboard. */
function arrowFocus(e: KeyboardEvent, root: HTMLElement): void {
  const dir = ARROWS[e.key];
  const from = e.target;
  if (!dir || !(from instanceof HTMLButtonElement) || !root.contains(from)) return;
  const center = (el: Element) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2] as const;
  };
  const [fx, fy] = center(from);
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const el of root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')) {
    if (el === from) continue;
    const [x, y] = center(el);
    const along = (x - fx) * dir[0] + (y - fy) * dir[1];
    const across = Math.abs((x - fx) * dir[1]) + Math.abs((y - fy) * dir[0]);
    if (along <= 1 || across > along * 1.5 + 8) continue;
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    e.preventDefault();
    best.focus();
  }
}

export function GameShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const meta = getGame(id);
  const [rulesOpen, setRulesOpen] = useState(false);
  const stage = useRef<HTMLElement>(null);
  // Fixed-size boards (Gomoku, Ludo, Mancala...) shrink to fit a narrow phone instead of scrolling sideways.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      el.style.zoom = '';
      if (window.innerWidth > 640) return;
      const cs = getComputedStyle(el);
      const room = el.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight);
      const widest = Math.max(
        ...Array.from(el.children, (c) => Math.max(c.scrollWidth, c.getBoundingClientRect().width)),
      );
      if (widest > room + 1) el.style.zoom = String(room / widest);
    };
    fit();
    const t = window.setTimeout(fit, 300);
    window.addEventListener('resize', fit);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', fit);
    };
  }, []);
  useEffect(() => {
    document.body.classList.add('theme-tavern');
    applyTheme();
    rememberRecent(id);
    return () => document.body.classList.remove('theme-tavern');
  }, [id]);
  // Keyboard: arrows move around the board, ? opens the rules, m mutes, t flips the theme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (stage.current) arrowFocus(e, stage.current);
      if (e.key === '?') setRulesOpen((o) => !o);
      else if (e.key === 'm') setMuted(!isMuted());
      else if (e.key === 't') setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="gp-page">
      <a className="skip-link" href="#board">
        Skip to the board
      </a>
      <nav className="gp-nav" aria-label="Game navigation">
        <a className="gp-back" href="../../">
          ← All games
        </a>
        <span className="gp-wordmark">TurnTable</span>
        <TableTools onRules={() => setRulesOpen(true)} />
      </nav>
      <header className="game-head">
        {meta && <p className="gp-eyebrow">{CATEGORY_LABELS[meta.category]}</p>}
        <h1 className="gp-title">{title}</h1>
      </header>
      {/* A click on any button gets a soft tick; moves play their own (louder) note first and win the debounce. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: delegated sound only, the buttons inside handle keys */}
      <main
        id="board"
        tabIndex={-1}
        ref={stage}
        className="ts-stage"
        aria-label={`${title} board and controls`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) sfx.tick();
        }}
      >
        {children}
      </main>
      <p className="key-hint">
        Arrow keys move around the board · Enter or Space plays · ? rules · m sound · t theme
      </p>
      <RulesDialog gameId={id} open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Overlays />
    </div>
  );
}

/** "You" → "Your", "Player 1" → "Player 1's". */
export const possessive = (name: string) => (name === 'You' ? 'Your' : `${name}'s`);
