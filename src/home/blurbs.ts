/** The one-line description shown beside each game on the homepage, and whether it can be played against the computer. */
export interface Blurb {
  /** the short name shown on the homepage (the registry title can be longer, for example "Checkers / Draughts") */
  name: string;
  line: string;
  computer: boolean;
}

export const BLURBS: Record<string, Blurb> = {
  'tic-tac-toe': { name: 'Tic-Tac-Toe', line: 'Three in a row on a 3×3 grid.', computer: true },
  'connect-4': { name: 'Connect 4', line: 'Drop discs. Line up four.', computer: true },
  chess: { name: 'Chess', line: 'Trap the king. Three computer levels.', computer: true },
  checkers: { name: 'Checkers', line: 'Jump, capture, crown your kings.', computer: true },
  reversi: { name: 'Reversi', line: 'Trap a row of discs and flip them.', computer: true },
  gomoku: { name: 'Gomoku', line: 'Five stones in a row wins.', computer: true },
  go: { name: 'Go', line: 'Surround territory on 9, 13 or 19 lines.', computer: true },
  'dots-and-boxes': { name: 'Dots and Boxes', line: 'Close a box, score it, go again.', computer: true },
  nim: { name: 'Nim', line: 'Take from one heap. Take the last one.', computer: true },
  'nine-mens-morris': { name: "Nine Men's Morris", line: 'Make mills, remove their pieces.', computer: true },
  quarto: { name: 'Quarto', line: 'You choose the piece they must place.', computer: true },
  hex: { name: 'Hex', line: 'Join your two sides. No draws.', computer: true },
  mancala: { name: 'Mancala', line: 'Sow seeds, fill your store.', computer: true },
  backgammon: { name: 'Backgammon', line: 'Race home, with a doubling cube.', computer: true },
  ludo: { name: 'Ludo', line: 'Roll a six, get out, get home.', computer: true },
  'snakes-and-ladders': {
    name: 'Snakes and Ladders',
    line: 'Climb to 100. Mind the snakes.',
    computer: false,
  },
  yahtzee: { name: 'Yahtzee', line: 'Five dice, three rolls, thirteen boxes.', computer: true },
  battleship: { name: 'Battleship', line: 'Hide a fleet. Sink theirs first.', computer: true },
  hangman: { name: 'Hangman', line: 'Guess the word before the drawing is done.', computer: true },
  war: { name: 'War', line: 'Flip a card each. High card takes both.', computer: false },
  'go-fish': { name: 'Go Fish', line: 'Ask for a rank. Collect books of four.', computer: true },
  uno: { name: 'Uno-style', line: 'Match colour or number. Empty your hand.', computer: true },
  memory: { name: 'Memory', line: 'Turn two cards. Keep the pairs.', computer: true },
  'rock-paper-scissors': {
    name: 'Rock Paper Scissors',
    line: 'Best of three, thrown in secret.',
    computer: true,
  },
  scrabble: { name: 'Scrabble-style', line: 'Build words on premium squares.', computer: true },
  '20-questions': { name: '20 Questions', line: 'Yes or no. Twenty tries to guess it.', computer: true },
};
