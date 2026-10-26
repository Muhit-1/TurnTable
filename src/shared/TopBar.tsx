import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { IconBack, IconHelp, IconHome, IconMenu, IconVolume, IconVolumeOff } from './icons';
import { isMuted, setMuted, sfx, subscribeMuted } from './sound';
import { applyTable, loadTable, saveTable, TABLE_THEMES } from './tableTheme';

/** Top bar: back button and name on the left, menu (table colour, sound) and rules on the right. */
export function TopBar({ back = true, onRules }: { back?: boolean; onRules?: () => void }) {
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
    <div className="top">
      <div className="brand">
        {back && (
          <a className="ib round" href="../../" aria-label="Back to all games" title="Back to all games">
            <IconBack />
          </a>
        )}
        <a className="logo" href={back ? '../../' : './'}>
          TurnTable
        </a>
      </div>
      <div className="tools">
        <details className="menu" ref={menu}>
          <summary className="ib" aria-label="Menu" title="Menu">
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
            {back && (
              <a className="menu-row" href="../../">
                <IconHome /> All games
              </a>
            )}
          </div>
        </details>
        {onRules && (
          <button
            type="button"
            className="ib round"
            aria-keyshortcuts="?"
            aria-label="How to play"
            title="How to play (?)"
            onClick={onRules}
          >
            <IconHelp />
          </button>
        )}
      </div>
    </div>
  );
}
