import { useCallback, useEffect, useRef, useState } from 'react';
import { getBestMove } from './ai';
import { checkWin, createEmptyBoard, dropDisc, getValidColumns, isBoardFull, otherPlayer } from './logic';
import { Board, GameStatus, Line, Mode, Player } from './types';
import './ConnectFour.css';

const CPU: Player = 2;
const AI_DELAY_MS = 500;

function isWinningCell(line: Line | undefined, row: number, col: number): boolean {
  return !!line?.some(([r, c]) => r === row && c === col);
}

function turnLabel(mode: Mode, current: Player, isCpuTurn: boolean): string {
  if (isCpuTurn) return 'Computer is thinking…';
  if (mode === 'vs-cpu') return current === 1 ? 'Your turn' : "Computer's turn";
  return current === 1 ? 'Amber to drop' : 'Green to drop';
}

function resultLabel(status: GameStatus, mode: Mode): string {
  if (status.state === 'won') {
    if (mode === 'vs-cpu') return status.winner === 1 ? 'You win!' : 'Computer wins!';
    return status.winner === 1 ? 'Amber wins!' : 'Green wins!';
  }
  if (status.state === 'draw') return "It's a draw!";
  return '';
}

export default function ConnectFour() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [current, setCurrent] = useState<Player>(1);
  const [status, setStatus] = useState<GameStatus>({ state: 'playing' });
  const [mode, setMode] = useState<Mode>('pvp');
  const [scores, setScores] = useState<Record<Player, number>>({ 1: 0, 2: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

  const resetBoard = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrent(1);
    setStatus({ state: 'playing' });
    setHoverCol(null);
  }, []);

  const handleModeChange = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setScores({ 1: 0, 2: 0 });
    resetBoard();
  };

  const dropAt = useCallback(
    (col: number, player: Player) => {
      const result = dropDisc(board, col, player);
      if (!result) return;

      const winLine = checkWin(result.board, result.row, col, player);
      setBoard(result.board);

      if (winLine) {
        setStatus({ state: 'won', winner: player, line: winLine });
        setScores((s) => ({ ...s, [player]: s[player] + 1 }));
      } else if (isBoardFull(result.board)) {
        setStatus({ state: 'draw' });
      } else {
        setCurrent(otherPlayer(player));
      }
    },
    [board],
  );

  const isCpuTurn = mode === 'vs-cpu' && current === CPU && status.state === 'playing';

  const handleColumnClick = (col: number) => {
    if (status.state !== 'playing' || isCpuTurn) return;
    dropAt(col, current);
  };

  useEffect(() => {
    if (mode !== 'vs-cpu' || status.state !== 'playing' || current !== CPU) return;
    const timer = setTimeout(() => {
      const col = getBestMove(board, CPU);
      dropAt(col, CPU);
    }, AI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mode, status.state, current, board, dropAt]);

  const winLine = status.state === 'won' ? status.line : undefined;
  const validCols = getValidColumns(board);
  const interactive = status.state === 'playing' && !isCpuTurn;

  return (
    <div className="gp-page">
      <nav className="gp-nav">
        <a className="gp-back" href="../../turntable-homepage.html">
          &larr; All games
        </a>
        <span className="gp-wordmark">TURNTABLE</span>
      </nav>

      <div className="gp-focus">
        <h1 className="gp-title">Connect Four</h1>

        <div className="gp-modes" role="group" aria-label="Game mode">
          <button
            type="button"
            className="gp-mode-btn"
            aria-pressed={mode === 'pvp'}
            onClick={() => handleModeChange('pvp')}
          >
            2 Players
          </button>
          <button
            type="button"
            className="gp-mode-btn"
            aria-pressed={mode === 'vs-cpu'}
            onClick={() => handleModeChange('vs-cpu')}
          >
            Vs Computer
          </button>
        </div>

        <div className="gp-cabinet">
          <div className="gp-cabinet-strip">
            <span className="gp-turn">
              <span
                className="dot"
                style={{ background: current === 1 ? 'var(--accent)' : 'var(--accent-2)' }}
              />
              {status.state === 'playing' ? turnLabel(mode, current, isCpuTurn) : resultLabel(status, mode)}
            </span>
            <span className="gp-score">
              {mode === 'vs-cpu' ? 'You' : 'Amber'} <b>{scores[1]}</b> &nbsp;&ndash;&nbsp; <b>{scores[2]}</b>{' '}
              {mode === 'vs-cpu' ? 'Computer' : 'Green'}
            </span>
          </div>

          <div className="gp-screen">
            <div className="c4-wrap">
              <div className="c4-arrows" aria-hidden="true">
                {Array.from({ length: 7 }, (_, col) => (
                  <span key={col} className={hoverCol === col && interactive ? 'active' : ''}>
                    &#9660;
                  </span>
                ))}
              </div>
              <div className="c4-board">
                {board.map((row, rowIdx) =>
                  row.map((cell, col) => {
                    const highlighted = isWinningCell(winLine, rowIdx, col);
                    const disabled = !interactive || !validCols.includes(col);
                    const classes = [
                      'c4-cell',
                      cell === 1 ? 'p1' : cell === 2 ? 'p2' : '',
                      cell === null && hoverCol === col && !disabled ? 'hover-preview' : '',
                      highlighted ? 'win' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <button
                        key={`${rowIdx}-${col}`}
                        type="button"
                        aria-label={`Drop in column ${col + 1}`}
                        disabled={disabled}
                        onClick={() => handleColumnClick(col)}
                        onMouseEnter={() => setHoverCol(col)}
                        onMouseLeave={() => setHoverCol((c) => (c === col ? null : c))}
                        className={classes}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="gp-actions">
          <button type="button" className="gp-btn" onClick={resetBoard}>
            &#8635; Restart
          </button>
          <button type="button" className="gp-btn" onClick={() => modalRef.current?.showModal()}>
            &#128214; Rules
          </button>
        </div>
      </div>

      <dialog
        className="gp-modal"
        ref={modalRef}
        onClick={(e) => {
          if (e.target === modalRef.current) modalRef.current?.close();
        }}
      >
        <div className="gp-modal-inner">
          <div className="gp-modal-head">
            <h2 className="gp-modal-title">Connect Four</h2>
            <button
              type="button"
              className="gp-modal-close"
              aria-label="Close rules"
              onClick={() => modalRef.current?.close()}
            >
              &times;
            </button>
          </div>

          <div className="gp-rules">
            <div className="gp-rule-block">
              <p className="gp-rule-label">Objective</p>
              <p className="gp-rule-body">
                Be the first to connect 4 of your colored discs in a row — horizontally, vertically, or diagonally.
              </p>
            </div>
            <div className="gp-rule-block">
              <p className="gp-rule-label">Setup</p>
              <p className="gp-rule-body">Stand the 7-column &times; 6-row grid upright; each player takes one disc color.</p>
            </div>
            <div className="gp-rule-block">
              <p className="gp-rule-label">How to play</p>
              <p className="gp-rule-body">
                Players alternate turns dropping one disc into the top of any column; it falls to the lowest open
                slot in that column.
              </p>
            </div>
            <div className="gp-rule-block">
              <p className="gp-rule-label">How to win</p>
              <p className="gp-rule-body">First to get 4 in a row wins; if the grid fills with no 4-in-a-row, it's a draw.</p>
            </div>
          </div>

          <div className="gp-video">
            <p className="gp-video-label">Watch</p>
            <a className="gp-thumb" href="https://www.youtube.com/watch?v=ylZBRUJi3UQ" target="_blank" rel="noopener">
              <span className="gp-play">&#9658;</span>
            </a>
            <p className="gp-video-title">How to play Connect 4</p>
            <p className="gp-video-meta">Triple S Games &middot; how-to-play</p>
            <a
              className="gp-video-link"
              href="https://www.youtube.com/watch?v=ylZBRUJi3UQ"
              target="_blank"
              rel="noopener"
            >
              Watch on YouTube &#8599;
            </a>
          </div>
        </div>
      </dialog>
    </div>
  );
}
