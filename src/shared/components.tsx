import {
  Children,
  type CSSProperties,
  isValidElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import '../styles/fonts.css';
import '../styles/preserved-game.css';
import '../styles/tavern.css';
import '../styles/shell.css';
import type { PlayerId } from './engine';
import {
  IconEqual,
  IconHelp,
  IconHome,
  IconMenu,
  IconRedo,
  IconRestart,
  IconTrophy,
  IconUndo,
  IconVolume,
  IconVolumeOff,
} from './icons';
import { notify } from './notify';
import { RulesDialog } from './RulesPanel';
import { rememberRecent } from './recent';
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
      <button type="button" className="gp-btn" disabled={!canUndo} onClick={onUndo} aria-label="Undo">
        <IconUndo /> Undo
      </button>
      <button type="button" className="gp-btn" disabled={!canRedo} onClick={onRedo}>
        <IconRedo /> Redo
      </button>
      <button type="button" className="gp-btn" onClick={onRestart}>
        <IconRestart /> Restart
      </button>
    </div>
  );
}

function TopTools({ onRules }: { onRules: () => void }) {
  const [table, setTable] = useState(loadTable);
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    applyTable(table);
  }, [table]);
  // close the menu on an outside click or Escape
  useEffect(() => {
    const close = (e: Event) => {
      const m = menu.current;
      if (
        m?.open &&
        (e.type === 'keydown' ? (e as KeyboardEvent).key === 'Escape' : !m.contains(e.target as Node))
      )
        m.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  return (
    <div className="table-tools">
      <details className="menu" ref={menu}>
        <summary className="icon-pill" aria-label="Menu" title="Menu">
          <IconMenu />
        </summary>
        <div className="menu-pop">
          <p className="menu-label">Table colour</p>
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
            className="menu-row"
            aria-pressed={!muted}
            aria-keyshortcuts="m"
            onClick={() => {
              setMuted(!muted);
              if (muted) sfx.tick();
            }}
          >
            {muted ? <IconVolumeOff /> : <IconVolume />} {muted ? 'Sound off' : 'Sound on'}
          </button>
          <a className="menu-row" href="../../">
            <IconHome /> All games
          </a>
        </div>
      </details>
      <button
        type="button"
        className="icon-pill round"
        aria-keyshortcuts="?"
        aria-label="How to play"
        title="How to play (?)"
        onClick={onRules}
      >
        <IconHelp />
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
              {award.result === 'won' ? <IconTrophy /> : <IconEqual />}
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

/**
 * Scales `el` (zoom) so the board fills the room it has, never causing the page to scroll.
 * `slot` is the grid cell that holds it; its size does not depend on the board.
 */
function useFit(slot: RefObject<HTMLElement | null>, el: RefObject<HTMLElement | null>, single: boolean) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: `single` changes which elements exist, so the observers must be set up again
  useEffect(() => {
    const box = slot.current;
    const target = el.current;
    if (!box || !target) return;
    let raf = 0;
    const fit = () => {
      raf = 0;
      target.style.zoom = '1';
      const natural = target.firstElementChild?.getBoundingClientRect();
      if (!natural || natural.width === 0 || natural.height === 0) return;
      const room = box.getBoundingClientRect();
      const cs = getComputedStyle(box);
      const w = room.width - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight);
      const h = room.height - Number.parseFloat(cs.paddingTop) - Number.parseFloat(cs.paddingBottom);
      // Leave a margin around the board and never let it grow past a comfortable size.
      const fill = Math.min(w / natural.width, h / natural.height) * 0.92;
      const cap = 780 / Math.max(natural.width, natural.height);
      target.style.zoom = String(Math.max(0.3, Math.min(fill, cap)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(fit);
    };
    fit();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    ro?.observe(box);
    const mo = new MutationObserver(schedule);
    mo.observe(target, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      ro?.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [slot, el, single]);
}

export function GameShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const fit = useRef<HTMLDivElement>(null);
  // The first BoardFrame is the board. What comes before it goes in the left panel, what comes after in the right one.
  const items = Children.toArray(children);
  const at = items.findIndex((c) => isValidElement(c) && c.type === BoardFrame);
  const before = at < 0 ? [] : items.slice(0, at);
  const board = at < 0 ? null : items[at];
  const rest = at < 0 ? items : items.slice(at + 1);
  const controls = rest.filter((c) => isValidElement(c) && c.type === GameControls);
  const after = rest.filter((c) => !controls.includes(c));
  useFit(slot, fit, at < 0);
  useEffect(() => {
    document.body.classList.add('theme-tavern');
    rememberRecent(id);
    return () => document.body.classList.remove('theme-tavern');
  }, [id]);
  // Keyboard: arrows move around the board, ? opens the rules, m mutes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (stage.current) arrowFocus(e, stage.current);
      if (e.key === '?') setRulesOpen((o) => !o);
      else if (e.key === 'm') setMuted(!isMuted());
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
        <a className="gp-wordmark" href="../../" title="All games">
          TurnTable
        </a>
        <TopTools onRules={() => setRulesOpen(true)} />
      </nav>
      {/* A click on any button gets a soft tick; moves play their own (louder) note first and win the debounce. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: delegated sound only, the buttons inside handle keys */}
      <main
        id="board"
        tabIndex={-1}
        ref={stage}
        className={`ts-stage${at < 0 ? ' single' : ''}`}
        aria-label={`${title} board and controls`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) sfx.tick();
        }}
      >
        {at < 0 ? (
          <div className="ts-panel">{items}</div>
        ) : (
          <>
            <div className="ts-left">
              <div className="ts-panel left">
                <h1 className="card-title">{title}</h1>
                {before}
              </div>
              {controls.length > 0 && <div className="ts-panel controls">{controls}</div>}
            </div>
            <div className="ts-center" ref={slot}>
              <div className="ts-fit" ref={fit}>
                {board}
              </div>
            </div>
            <div className={`ts-panel right${after.length ? '' : ' empty'}`}>{after}</div>
          </>
        )}
      </main>
      <RulesDialog gameId={id} open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Overlays />
    </div>
  );
}

/** A collapsible list of the moves played so far (newest last). Pass already-formatted lines. */
export function ActivityLog({ lines, title = 'Moves' }: { lines: string[]; title?: string }) {
  if (lines.length === 0) return null;
  return (
    <details className="activity" open>
      <summary>
        {title} ({lines.length})
      </summary>
      <ol>
        {lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a move list is positional
          <li key={i}>{l}</li>
        ))}
      </ol>
    </details>
  );
}

/** "You" → "Your", "Player 1" → "Player 1's". */
export const possessive = (name: string) => (name === 'You' ? 'Your' : `${name}'s`);
