import { useMemo } from 'react';
import {
  GameControls,
  GameShell,
  ModeToggle,
  possessive,
  Scoreboard,
  TurnBanner,
} from '../../shared/components';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import { type MancalaState, mancalaEngine, P1_STORE, P2_STORE } from './engine';

export default function Mancala() {
  const [level, levelPicker] = useLevel('mancala');
  const pickMove = useMemo(() => (s: MancalaState) => chooseMove(s, level), [level]);
  const m = useMatch(mancalaEngine, { pickMove, delayMs: 600, persistId: 'mancala' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play, legalMoves } = game;
  const names = m.names('South (Player 1)', 'North (Player 2)');

  const pit = (i: number) => (
    <button
      key={i}
      type="button"
      aria-label={`Pit ${i < 6 ? i + 1 : i - 6}, ${state.slots[i]} seeds, ${i < 6 ? 'South' : 'North'}`}
      disabled={isCpuTurn || !legalMoves.includes(i)}
      onClick={() => play(i)}
      className="w-16 h-16 rounded-full border-2 border-amber-900 bg-amber-100 text-xl font-bold enabled:hover:bg-amber-200 disabled:cursor-default"
    >
      {state.slots[i]}
    </button>
  );

  return (
    <GameShell id="mancala" title="Mancala (Kalah)">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {state.extraTurn && status.state === 'playing' && `${names[player]} lands in the store: go again. `}
        {status.state === 'playing' &&
          (isCpuTurn ? 'Computer is thinking…' : `${possessive(names[player])} turn`)}
        {status.state === 'won' &&
          `${names[status.winner]} wins ${state.slots[status.winner === 1 ? P1_STORE : P2_STORE]}–${state.slots[status.winner === 1 ? P2_STORE : P1_STORE]}!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <div className="flex items-center gap-3 bg-amber-800 p-4 rounded-2xl">
        <div className="w-16 h-36 rounded-full bg-amber-900 text-white flex flex-col items-center justify-center">
          <span className="text-xs">North store</span>
          <span className="text-2xl font-bold">{state.slots[P2_STORE]}</span>
        </div>
        <div className="flex flex-col gap-3">
          {/* North's pits run right-to-left from North's point of view, so show 12..7 left to right */}
          <div className="flex gap-3">{[12, 11, 10, 9, 8, 7].map(pit)}</div>
          <div className="flex gap-3">{[0, 1, 2, 3, 4, 5].map(pit)}</div>
        </div>
        <div className="w-16 h-36 rounded-full bg-amber-900 text-white flex flex-col items-center justify-center">
          <span className="text-xs">South store</span>
          <span className="text-2xl font-bold">{state.slots[P1_STORE]}</span>
        </div>
      </div>

      <GameControls
        canUndo={game.canUndo && !isCpuTurn}
        canRedo={game.canRedo && !isCpuTurn}
        onUndo={m.undo}
        onRedo={() => game.redo()}
        onRestart={game.reset}
      />
    </GameShell>
  );
}
