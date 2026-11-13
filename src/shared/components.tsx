import {
  Children,
  type CSSProperties,
  createContext,
  isValidElement,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PlayerId } from './engine';
import { IconEqual, IconRedo, IconRestart, IconTrophy, IconUndo } from './icons';
import { useMatchInfo } from './matchInfo';
import { notify } from './notify';
import { PenDefs } from './PenDefs';
import { applyPaper, loadPaper } from './paper';
import { MAX_NAME_LENGTH, setPlayerName, usePlayerNames } from './playerNames';
import { RulesDialog } from './RulesPanel';
import { rememberRecent } from './recent';
import { isMuted, setMuted, sfx } from './sound';
import { Tally } from './Tally';
import { TopBar } from './TopBar';

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

/** Which marker each game gives its two players. Every marker has a shape as well as a colour. */
const TOKENS: Record<string, [string, string]> = {
  chess: ['w', 'b'],
  'tic-tac-toe': ['x', 'o'],
  'connect-4': ['ruby', 'ivory'],
  checkers: ['ruby', 'ivory'],
  reversi: ['b', 'w'],
  go: ['b', 'w'],
  gomoku: ['b', 'w'],
  hex: ['ruby', 'ivory'],
  'dots-and-boxes': ['ruby', 'ivory'],
  ludo: ['ruby', 'ivory'],
  'snakes-and-ladders': ['ruby', 'ivory'],
  backgammon: ['w', 'b'],
  'nine-mens-morris': ['w', 'b'],
};
const GameContext = createContext('');

export function Scoreboard({
  names,
  scores,
}: {
  names: Record<PlayerId, string>;
  scores: Record<PlayerId, number>;
}) {
  const tokens = TOKENS[useContext(GameContext)] ?? ['p1', 'p2'];
  const info = useMatchInfo();
  const chosen = usePlayerNames();
  const [editing, setEditing] = useState<PlayerId | null>(null);
  return (
    <div className="players">
      {([1, 2] as const).map((p) => (
        <div
          key={p}
          className={`player${info && !info.over && info.player === p ? ' active' : ''}`}
          data-tok={tokens[p - 1]}
        >
          <i className={`tok ${tokens[p - 1]}`} aria-hidden="true" />
          <span className="pn">
            {editing === p ? (
              <input
                className="pname pname-input"
                aria-label={`Name for player ${p}`}
                defaultValue={chosen[p]}
                placeholder={names[p]}
                maxLength={MAX_NAME_LENGTH}
                // biome-ignore lint/a11y/noAutofocus: the field appears because the player asked to type a name
                autoFocus
                onBlur={(e) => {
                  setPlayerName(p, e.target.value);
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  else if (e.key === 'Escape') setEditing(null);
                }}
              />
            ) : info?.editable ? (
              <button
                type="button"
                className="pname pname-edit"
                title="Change this name"
                aria-label={`${names[p]}. Change this name`}
                onClick={() => setEditing(p)}
              >
                {names[p]}
              </button>
            ) : (
              <span className="pname">{names[p]}</span>
            )}
            {/* a ring drawn round the name of the player to move */}
            <svg className="pen-ring" viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden="true">
              <path
                pathLength="100"
                d="M14 26 C10 8 48 3 74 5 C102 7 116 16 110 30 C104 44 62 48 34 45 C14 43 6 34 16 20"
              />
            </svg>
          </span>
          <Tally n={scores[p]} />
        </div>
      ))}
    </div>
  );
}

export function TurnBanner({ children }: { children: ReactNode }) {
  return (
    <p className="who" role="status" aria-live="polite">
      {children}
    </p>
  );
}

/** The sheet every board is drawn on, taped down a little crooked; tags name the two seats and the one to move is highlighted. */
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
  const info = useMatchInfo();
  return (
    <div className={`board-frame ${className}`} style={style}>
      <i className="tape t1" aria-hidden="true" />
      <i className="tape t2" aria-hidden="true" />
      {info && (
        <>
          <span className={`plaque top${!info.over && info.player === 2 ? ' on' : ''}`}>{info.names[2]}</span>
          <span className={`plaque bot${!info.over && info.player === 1 ? ' on' : ''}`}>{info.names[1]}</span>
        </>
      )}
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
    <div className="controls-row">
      <button type="button" className="act" disabled={!canUndo} onClick={onUndo}>
        <IconUndo /> Undo
      </button>
      <button type="button" className="act" disabled={!canRedo} onClick={onRedo}>
        <IconRedo /> Redo
      </button>
      <button type="button" className="act strong" onClick={onRestart}>
        <IconRestart /> Restart
      </button>
    </div>
  );
}

/** Toast and end-of-game popup, driven by `notify`. Neither blocks the board. */
/** How long the result stays in the middle of the screen before the board resets. */
const AWARD_MS = 3200;

function Overlays() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const shown = useRef(0);
  const closeAward = () => {
    shown.current = 0;
    setAward(null);
    notify.reset();
  };
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
            const text = document.querySelector('.who')?.textContent?.trim() || 'Game over';
            setAward({ id, result: e.result, text });
            shown.current = id;
            window.setTimeout(() => {
              if (shown.current !== id) return;
              shown.current = 0;
              setAward(null);
              notify.reset();
            }, AWARD_MS);
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
        <div className="overlay dim" key={award.id}>
          <button type="button" className="award-card" onClick={closeAward} aria-label="Start a new game">
            <span className="medal" aria-hidden="true">
              {award.result === 'won' ? <IconTrophy /> : <IconEqual />}
            </span>
            <span className="kicker">{award.result === 'won' ? 'Game over' : 'Nobody wins'}</span>
            <span className="title">{award.text}</span>
            <span className="hint">A new game starts in a moment. Tap to start now.</span>
            <span className="drain" aria-hidden="true" style={{ ['--life' as string]: `${AWARD_MS}ms` }} />
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
    const refit = () => {
      raf = 0;
      target.style.zoom = '1';
      const natural = target.firstElementChild?.getBoundingClientRect();
      if (!natural || natural.width === 0 || natural.height === 0) return;
      const room = box.getBoundingClientRect();
      const cs = getComputedStyle(box);
      const w = room.width - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight);
      const h = room.height - Number.parseFloat(cs.paddingTop) - Number.parseFloat(cs.paddingBottom);
      // Leave a margin around the board and never let it grow past a comfortable size.
      const fill = Math.min(w / natural.width, h / natural.height) * 0.97;
      const cap = 1100 / Math.max(natural.width, natural.height);
      target.style.zoom = String(Math.max(0.3, Math.min(fill, cap)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(refit);
    };
    refit();
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
  const info = useMatchInfo();
  useEffect(() => {
    document.body.dataset.turn = info && !info.over ? String(info.player) : '';
  }, [info]);
  useEffect(() => {
    applyPaper(loadPaper());
  }, []);
  useEffect(() => {
    rememberRecent(id);
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
    <GameContext.Provider value={id}>
      <div className="gp-page" data-game={id}>
        <PenDefs />
        <a className="skip-link" href="#board">
          Skip to the board
        </a>
        <TopBar onRules={() => setRulesOpen(true)} />
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
                  <FitTitle>{title}</FitTitle>
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
    </GameContext.Provider>
  );
}

/** A heading that shrinks until it fits on one line. */
function FitTitle({ children }: { children: string }) {
  const el = useRef<HTMLHeadingElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new title needs a new fit
  useLayoutEffect(() => {
    const h = el.current;
    if (!h) return;
    const refit = () => {
      h.style.fontSize = '';
      let size = Number.parseFloat(getComputedStyle(h).fontSize);
      while (h.scrollWidth > h.clientWidth + 1 && size > 12) {
        size -= 1;
        h.style.fontSize = `${size}px`;
      }
    };
    refit();
    document.fonts?.ready.then(refit);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refit);
    ro?.observe(h);
    return () => ro?.disconnect();
  }, [children]);
  return (
    <h1 className="card-title" ref={el}>
      {children}
    </h1>
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
