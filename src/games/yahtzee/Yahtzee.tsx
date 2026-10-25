import { useMemo } from 'react';
import { GameShell, ModeToggle, possessive, Scoreboard, TurnBanner } from '../../shared/components';
import { useLevel } from '../../shared/level';
import { useMatch } from '../../shared/useMatch';
import { chooseMove } from './ai';
import {
  CATEGORIES,
  type Category,
  potentialScore,
  ROLLS_PER_TURN,
  totalScore,
  UPPER,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  upperBonus,
  upperTotal,
  type YahtzeeState,
  yahtzeeEngine,
} from './engine';

const LABEL: Record<Category, string> = {
  ones: 'Ones',
  twos: 'Twos',
  threes: 'Threes',
  fours: 'Fours',
  fives: 'Fives',
  sixes: 'Sixes',
  threeKind: '3 of a kind',
  fourKind: '4 of a kind',
  fullHouse: 'Full house (25)',
  smallStraight: 'Small straight (30)',
  largeStraight: 'Large straight (40)',
  yahtzee: 'Yahtzee (50)',
  chance: 'Chance',
};
const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function Yahtzee() {
  const [level, levelPicker] = useLevel('yahtzee');
  const pickMove = useMemo(() => (s: YahtzeeState) => chooseMove(s, level), [level]);
  const m = useMatch(yahtzeeEngine, { pickMove, delayMs: 550, persistId: 'yahtzee' });
  const { game, isCpuTurn } = m;
  const { state, status, player, play } = game;
  const names = m.names('Player 1', 'Player 2');
  const rolled = state.rollsLeft < ROLLS_PER_TURN;
  const humanTurn = status.state === 'playing' && !isCpuTurn;
  const card = (p: 1 | 2) => state.cards[p];

  const row = (k: Category) => (
    <tr key={k} className="border-t">
      <th scope="row" className="text-left font-normal pr-4 py-1">
        {LABEL[k]}
      </th>
      {([1, 2] as const).map((p) => {
        const v = card(p).scores[k];
        const canPick = humanTurn && rolled && p === player && v === null;
        return (
          <td key={p} className="text-center w-24">
            {v !== null ? (
              v
            ) : canPick ? (
              <button
                type="button"
                className="px-2 rounded border bg-amber-100 hover:bg-amber-200"
                onClick={() => play({ kind: 'score', category: k })}
              >
                +{potentialScore(state, k)}
              </button>
            ) : (
              <span className="text-neutral-300">–</span>
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <GameShell id="yahtzee" title="Yahtzee">
      <ModeToggle mode={m.mode} onChange={m.changeMode} />
      {m.mode === 'vs-cpu' && levelPicker}
      <Scoreboard names={names} scores={m.scores} />
      <TurnBanner>
        {status.state === 'playing' &&
          (isCpuTurn
            ? 'Computer is playing…'
            : !rolled
              ? `${possessive(names[player])} turn: roll the dice`
              : state.rollsLeft > 0
                ? `${possessive(names[player])} turn: click dice to keep them, roll again, or pick a box (${state.rollsLeft} roll${state.rollsLeft > 1 ? 's' : ''} left)`
                : `${possessive(names[player])} turn: pick a box to score`)}
        {status.state === 'won' &&
          `${names[status.winner]} wins ${totalScore(card(status.winner))}–${totalScore(card(status.winner === 1 ? 2 : 1))}!`}
        {status.state === 'draw' && "It's a draw!"}
      </TurnBanner>

      <div className="flex gap-2">
        {state.dice.map((d, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed dice slots
            key={i}
            type="button"
            aria-label={d ? `Die ${i + 1}: ${d}${state.held[i] ? ', kept' : ''}` : `Die ${i + 1}: not rolled`}
            aria-pressed={state.held[i]}
            disabled={!humanTurn || !rolled || state.rollsLeft === 0}
            onClick={() => play({ kind: 'hold', index: i })}
            className={`w-16 h-16 text-5xl rounded border-2 bg-white ${state.held[i] ? 'border-amber-500 bg-amber-100' : 'border-neutral-300'}`}
          >
            {FACE[d] || '·'}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="px-6 py-3 rounded border bg-neutral-900 text-white disabled:opacity-40"
        disabled={!humanTurn || state.rollsLeft === 0}
        onClick={() => play({ kind: 'roll' })}
      >
        🎲 Roll ({state.rollsLeft} left)
      </button>

      <table className="text-sm border bg-white rounded">
        <thead>
          <tr>
            <th className="text-left p-1">Scorecard</th>
            <th className={`w-24 ${player === 1 && status.state === 'playing' ? 'bg-amber-100' : ''}`}>
              {names[1]}
            </th>
            <th className={`w-24 ${player === 2 && status.state === 'playing' ? 'bg-amber-100' : ''}`}>
              {names[2]}
            </th>
          </tr>
        </thead>
        <tbody>
          {UPPER.map(row)}
          <tr className="border-t bg-neutral-50">
            <th scope="row" className="text-left font-normal">
              Upper bonus (+{UPPER_BONUS} at {UPPER_BONUS_THRESHOLD})
            </th>
            {([1, 2] as const).map((p) => (
              <td key={p} className="text-center">
                {upperTotal(card(p))}/{UPPER_BONUS_THRESHOLD}
                {upperBonus(card(p)) ? ` +${UPPER_BONUS}` : ''}
              </td>
            ))}
          </tr>
          {CATEGORIES.filter((k) => !UPPER.includes(k)).map(row)}
          <tr className="border-t bg-neutral-50">
            <th scope="row" className="text-left font-normal">
              Extra Yahtzee bonus
            </th>
            {([1, 2] as const).map((p) => (
              <td key={p} className="text-center">
                {card(p).bonuses ? `+${card(p).bonuses * 100}` : 0}
              </td>
            ))}
          </tr>
          <tr className="border-t font-bold">
            <th scope="row" className="text-left">
              Total
            </th>
            {([1, 2] as const).map((p) => (
              <td key={p} className="text-center">
                {totalScore(card(p))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <button type="button" className="px-4 py-2 rounded border bg-white" onClick={game.reset}>
        New game
      </button>
    </GameShell>
  );
}
