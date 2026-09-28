import { useCallback, useEffect, useState } from 'react';
import { getBestMove } from './ai';
import { checkWin, createEmptyBoard, dropDisc, getValidColumns, isBoardFull, otherPlayer } from './logic';
import { Board, GameStatus, Line, Mode, Player } from './types';

const CPU: Player = 2;
const AI_DELAY_MS = 500;

function isWinningCell(line: Line | undefined, row: number, col: number): boolean {
  return !!line?.some(([r, c]) => r === row && c === col);
}

export default function ConnectFour() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [current, setCurrent] = useState<Player>(1);
  const [status, setStatus] = useState<GameStatus>({ state: 'playing' });
  const [mode, setMode] = useState<Mode>('pvp');
  const [scores, setScores] = useState<Record<Player, number>>({ 1: 0, 2: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);

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

  const handleColumnClick = (col: number) => {
    if (status.state !== 'playing') return;
    if (mode === 'vs-cpu' && current === CPU) return;
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
  const isCpuTurn = mode === 'vs-cpu' && current === CPU && status.state === 'playing';
  const validCols = getValidColumns(board);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center gap-6 py-10 px-4">
      <h1 className="text-3xl font-bold">Connect Four</h1>

      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded border ${mode === 'pvp' ? 'bg-neutral-900 text-white' : 'bg-white'}`}
          onClick={() => handleModeChange('pvp')}
        >
          2 Players
        </button>
        <button
          className={`px-4 py-2 rounded border ${mode === 'vs-cpu' ? 'bg-neutral-900 text-white' : 'bg-white'}`}
          onClick={() => handleModeChange('vs-cpu')}
        >
          Vs Computer
        </button>
      </div>

      <div className="flex items-center gap-6 text-sm font-medium">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
          {mode === 'vs-cpu' ? 'You' : 'Player 1'}: {scores[1]}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
          {mode === 'vs-cpu' ? 'Computer' : 'Player 2'}: {scores[2]}
        </span>
      </div>

      <div className="h-6 text-sm text-neutral-600">
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${current === 1 ? (mode === 'vs-cpu' ? 'Your' : "Player 1's") : (mode === 'vs-cpu' ? "Computer's" : "Player 2's")} turn`)}
        {status.state === 'won' && `${status.winner === 1 ? (mode === 'vs-cpu' ? 'You' : 'Player 1') : (mode === 'vs-cpu' ? 'Computer' : 'Player 2')} wins!`}
        {status.state === 'draw' && "It's a draw!"}
      </div>

      <div className="bg-blue-700 p-3 rounded-lg inline-grid grid-cols-7 gap-2">
        {board.map((row, rowIdx) =>
          row.map((cell, col) => {
            const highlighted = isWinningCell(winLine, rowIdx, col);
            const disabled = status.state !== 'playing' || isCpuTurn || !validCols.includes(col);
            return (
              <button
                key={`${rowIdx}-${col}`}
                type="button"
                aria-label={`Drop in column ${col + 1}`}
                disabled={disabled}
                onClick={() => handleColumnClick(col)}
                onMouseEnter={() => setHoverCol(col)}
                onMouseLeave={() => setHoverCol((c) => (c === col ? null : c))}
                className={[
                  'w-12 h-12 rounded-full block transition-colors disabled:cursor-not-allowed',
                  cell === 1 ? 'bg-amber-400' : cell === 2 ? 'bg-emerald-600' : 'bg-white',
                  cell === null && hoverCol === col && !disabled ? 'bg-blue-100' : '',
                  highlighted ? 'ring-4 ring-white' : '',
                ].join(' ')}
              />
            );
          }),
        )}
      </div>

      <button
        type="button"
        className="px-4 py-2 rounded border bg-white hover:bg-neutral-50"
        onClick={resetBoard}
      >
        Restart
      </button>
    </div>
  );
}
