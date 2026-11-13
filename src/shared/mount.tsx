import { Component, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { clearSaved } from './storage';

interface Props {
  /** The game whose saved match is cleared by "Start a new game" (a broken save must not crash the page forever). */
  gameId?: string;
  children: ReactNode;
}

/** Catches a crash anywhere on the page and offers a way out instead of a blank screen. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { gameId } = this.props;
    return (
      <div className="boot crash" role="alert">
        <h1>This page stopped working</h1>
        <p>
          {gameId
            ? 'Start a new game to carry on. Your scores in other games are not affected.'
            : 'Reload the page to carry on.'}
        </p>
        <p className="crash-actions">
          <button
            type="button"
            className="act strong"
            onClick={() => {
              if (gameId) clearSaved(gameId);
              location.reload();
            }}
          >
            {gameId ? 'Start a new game' : 'Reload'}
          </button>
          {gameId && (
            <a className="act" href="../../">
              All games
            </a>
          )}
        </p>
      </div>
    );
  }
}

/** Mounts a page into #root. Every entry file uses this, so every page gets the same safety net. */
export function mount(page: ReactNode, gameId?: string): void {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <ErrorBoundary gameId={gameId}>{page}</ErrorBoundary>
    </StrictMode>,
  );
}
