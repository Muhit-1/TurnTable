/**
 * Single source of truth for every game. Drives the homepage, the Vite multi-page inputs
 * and the in-game rules panel. Rule text is taken from game-rules.txt.
 *
 * To add a game: set `ready: true` once allgames/<id>/index.html exists.
 */
export type Category = 'strategy' | 'dice' | 'hidden' | 'card' | 'party';

export interface GameMeta {
  id: string;
  title: string;
  category: Category;
  /** true once the game is playable and has an allgames/<id>/index.html entry page */
  ready: boolean;
  objective: string;
  setup: string;
  howToPlay: string;
  howToWin: string;
  videoTitle: string;
  videoUrl: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  strategy: 'Classic abstract strategy',
  dice: 'Dice & movement',
  hidden: 'Hidden-info / pass-and-look-away',
  card: 'Card-style',
  party: 'Party / word',
};

export const games: GameMeta[] = [
  {
    id: 'tic-tac-toe',
    title: 'Tic-Tac-Toe',
    category: 'strategy',
    ready: true,
    objective:
      'Be the first to get 3 of your marks in a row (horizontal, vertical, or diagonal) on a 3x3 grid.',
    setup: 'Draw a 3x3 grid; one player is X, the other O.',
    howToPlay: 'Players alternate turns (X goes first), placing their mark in any empty cell.',
    howToWin: "First to line up 3 marks wins; if all 9 cells fill with no line, it's a draw.",
    videoTitle: 'How to play Tic Tac Toe (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=USEjXNCTvcc',
  },
  {
    id: 'connect-4',
    title: 'Connect 4',
    category: 'strategy',
    ready: true,
    objective:
      'Be the first to connect 4 of your colored discs in a row — horizontally, vertically, or diagonally.',
    setup: 'Stand the 7-column x 6-row grid upright; each player takes one disc color.',
    howToPlay:
      'Players alternate turns dropping one disc into the top of any column; it falls to the lowest open slot in that column.',
    howToWin: "First to get 4 in a row wins; if the grid fills with no 4-in-a-row, it's a draw.",
    videoTitle: 'How to play Connect 4 (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=ylZBRUJi3UQ',
  },
  {
    id: 'chess',
    title: 'Chess',
    category: 'strategy',
    ready: false,
    objective: "Checkmate the opponent's king — trap it under attack with no legal escape.",
    setup:
      '8x8 board; each side has 16 pieces (king, queen, 2 rooks, 2 bishops, 2 knights, 8 pawns) on their two nearest ranks; each queen starts on a matching-color square.',
    howToPlay:
      "Players alternate turns (White first), moving one piece per turn per its own movement rules; landing on an opponent's piece captures it.",
    howToWin:
      'Checkmate wins instantly; stalemate (no legal move, not in check) and a few other conditions (repetition, insufficient material) are draws.',
    videoTitle: 'How to Play Chess: Chess Rules for Beginners (ChessKid)',
    videoUrl: 'https://www.youtube.com/watch?v=YdnvlntAQH8',
  },
  {
    id: 'checkers',
    title: 'Checkers / Draughts',
    category: 'strategy',
    ready: false,
    objective: "Capture all of the opponent's pieces, or block them so they have no legal move.",
    setup:
      '8x8 board (dark squares only used); each player has 12 pieces on the dark squares of their three closest rows.',
    howToPlay:
      'Players alternate turns moving a piece diagonally forward one square; if a capture is available (jumping an adjacent enemy piece into an empty square beyond it) it must be taken, including multi-jumps in one turn; a piece reaching the far row becomes a "king," able to move/capture diagonally in any direction.',
    howToWin: 'Win by capturing all opposing pieces or leaving the opponent with no legal move.',
    videoTitle: 'How to play Checkers (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=GnHQJ-PSBB0',
  },
  {
    id: 'reversi',
    title: 'Reversi / Othello',
    category: 'strategy',
    ready: true,
    objective: 'Have the majority of discs showing your color when the board is full or no moves remain.',
    setup: '8x8 board; start with 4 discs in the center in a diagonal pattern (2 black, 2 white).',
    howToPlay:
      'Players alternate turns (dark first), placing a disc so it "outflanks" one or more opponent discs in a straight line between the new disc and another of your own; all outflanked discs flip to your color; if you have no legal flipping move, you pass.',
    howToWin: 'When neither player can move, whoever has the most discs on the board wins.',
    videoTitle: 'How To Play Reversi (Othello) (Gather Together Games)',
    videoUrl: 'https://www.youtube.com/watch?v=QioKbksiJnA',
  },
  {
    id: 'gomoku',
    title: 'Gomoku (Five in a Row)',
    category: 'strategy',
    ready: true,
    objective: 'Be the first to form an unbroken line of 5 stones — horizontal, vertical, or diagonal.',
    setup: 'A 15x15 (or 19x19) grid of intersections; one player takes black stones, the other white.',
    howToPlay:
      'Players alternate turns (black first), placing one stone on any empty intersection; stones never move once placed.',
    howToWin: 'First to complete a line of 5 stones wins; a full board with no line is a draw.',
    videoTitle: 'How to play Gomoku (5 in a row) (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=-KD743yNDHc',
  },
  {
    id: 'go',
    title: 'Go (Baduk)',
    category: 'strategy',
    ready: false,
    objective: 'Control more territory (empty points surrounded by your stones) than your opponent.',
    setup:
      'Played on a grid of intersections — 19x19 standard, or 9x9/13x13 for beginners; board starts empty; one player uses black stones, the other white.',
    howToPlay:
      'Players alternate turns (black first) placing one stone on an empty intersection; stones don\'t move once placed; a stone or connected group with no empty adjacent points ("liberties") left is captured and removed; a player may pass instead of playing.',
    howToWin:
      "The game ends when both players pass in a row; whoever's territory plus captures score higher wins.",
    videoTitle: 'How to Play Go: Rules Explained | Beginner Tutorial on Go Game, Baduk, Weiqi (Go Magic)',
    videoUrl: 'https://www.youtube.com/watch?v=oZTdT8MQexk',
  },
  {
    id: 'dots-and-boxes',
    title: 'Dots and Boxes',
    category: 'strategy',
    ready: false,
    objective: 'Claim more boxes than your opponent by drawing the fourth (final) side of a box.',
    setup: 'Draw a grid of dots (e.g. 5x5 dots for a 4x4 grid of boxes); decide who goes first.',
    howToPlay:
      'Players alternate turns drawing one line (horizontal or vertical) between two adjacent dots. Completing the fourth side of a box earns you that box (mark it with your initial) and an immediate extra turn — this can chain into multiple boxes in one turn.',
    howToWin: 'When every line is drawn, whoever owns the most boxes wins.',
    videoTitle: 'How To Play Dots and Boxes - Fun and Easy Strategy Game!',
    videoUrl: 'https://www.youtube.com/watch?v=202lIZjFv5I',
  },
  {
    id: 'nim',
    title: 'Nim',
    category: 'strategy',
    ready: true,
    objective: 'Force your opponent into the losing position by controlling who takes the last object.',
    setup:
      'Arrange tokens (coins, matchsticks) into several heaps — a common casual setup is 3 heaps of 3, 5, and 7.',
    howToPlay:
      'Players alternate turns; each turn, remove any number of objects (at least one) from a single heap only.',
    howToWin:
      'In standard ("normal") play, whoever takes the last remaining object wins; in the "misere" variant (equally common casually), whoever is forced to take the last object loses.',
    videoTitle: 'How to Play Nim',
    videoUrl: 'https://www.youtube.com/watch?v=xsq_UEQDTWA',
  },
  {
    id: 'nine-mens-morris',
    title: "Nine Men's Morris",
    category: 'strategy',
    ready: false,
    objective: "Reduce your opponent to fewer than three pieces, or trap them so they can't move.",
    setup:
      'Board of three nested squares joined by lines at the midpoints (24 points); each player has 9 pieces off the board.',
    howToPlay:
      'Phase 1 — take turns placing one piece on an empty point, trying to line up 3 in a row along a board line (a "mill"); completing a mill lets you remove one opponent piece (not one in a mill, unless no others remain). Phase 2 — once all pieces are placed, take turns sliding a piece one step to an adjacent empty point, still forming/reforming mills to capture. A player reduced to exactly 3 pieces may "fly" a piece to any empty point.',
    howToWin: 'Reduce the opponent to 2 pieces, or block all of their legal moves.',
    videoTitle: "How To Play Nine Men's Morris (Gather Together Games)",
    videoUrl: 'https://www.youtube.com/watch?v=lmFDibk7_qc',
  },
  {
    id: 'quarto',
    title: 'Quarto',
    category: 'strategy',
    ready: false,
    objective: 'Be the player who places the piece that completes a line of four sharing a common trait.',
    setup:
      '4x4 board and 16 unique pieces, each a combination of 4 binary traits (tall/short, light/dark, round/square, solid/hollow).',
    howToPlay:
      'Turns work in reverse of usual — you place the piece your opponent handed you onto any empty square, then you choose one of the remaining pieces and hand it to your opponent for their next placement.',
    howToWin:
      "If the piece just placed completes a row, column, or diagonal of 4 pieces that all share at least one trait (e.g. all tall, or all round), the player who placed it wins; if the board fills with no such line, it's a draw.",
    videoTitle: 'How to Play Quarto in 2 minutes (2 player board games tutorial)',
    videoUrl: 'https://www.youtube.com/watch?v=hx18r9yWgiE',
  },
  {
    id: 'hex',
    title: 'Hex',
    category: 'strategy',
    ready: true,
    objective: 'Build an unbroken chain of your pieces connecting your two assigned sides of the board.',
    setup:
      'Rhombus-shaped board of hexagons (commonly 11x11); each player is assigned one pair of opposite sides and a color.',
    howToPlay:
      'Players alternate placing one stone of their color on any empty hexagon (no captures, no movement).',
    howToWin:
      'First player to complete a connected path of their stones linking their two sides wins; Hex can never end in a draw.',
    videoTitle: 'How to play Hex',
    videoUrl: 'https://www.youtube.com/watch?v=kUBZ0GWZvIY',
  },
  {
    id: 'mancala',
    title: 'Mancala / Kalah',
    category: 'strategy',
    ready: false,
    objective: 'Capture more seeds into your store than your opponent.',
    setup:
      'Board with two rows of 6 small pits plus a larger store at each end; each small pit starts with 4 seeds; each player owns the row and store on their right.',
    howToPlay:
      "On your turn, scoop up all seeds from one of your own pits and sow them one-by-one counterclockwise into each following pit, including your own store but skipping your opponent's store. Landing your last seed in your own store earns you another turn; landing it in an empty pit on your own side captures that seed plus all seeds in the opposite pit.",
    howToWin:
      "Once one player's row is completely empty, the other player keeps all remaining seeds on their side; whoever has more seeds in their store wins.",
    videoTitle: 'How to play Mancala (2024 rules)',
    videoUrl: 'https://www.youtube.com/watch?v=URzmg_HuuXc',
  },
  {
    id: 'backgammon',
    title: 'Backgammon',
    category: 'dice',
    ready: false,
    objective: 'Move all 15 of your checkers around the board and bear them off before your opponent does.',
    setup:
      'Board of 24 triangular points grouped into 4 quadrants; each player starts with 15 checkers in the standard opening formation, moving in opposite directions toward their own home board.',
    howToPlay:
      'Players alternate rolling two dice and moving checkers that many pips along the points in their direction (each die is a separate move); you can land on an open point, a point with your own checkers, or a point with a single opposing checker (hitting it, sending it to the bar to re-enter first); rolling doubles lets you play that number four times.',
    howToWin: 'First player to bear all 15 checkers off the board from their home board wins.',
    videoTitle: 'How to play Backgammon (2024 Rules)',
    videoUrl: 'https://www.youtube.com/watch?v=UMHCuZkLsQU',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    category: 'dice',
    ready: false,
    objective:
      'Race all four of your tokens around the board and into your home triangle before your opponent does.',
    setup:
      'Each player picks a color, places all 4 tokens in their starting yard; board is a cross-shaped track played clockwise.',
    howToPlay:
      "Roll a die each turn; you need a 6 to bring a token out of the yard onto the board; move a token forward the number rolled; rolling a 6 gives an extra roll; landing exactly on an opponent's token sends it back to their yard.",
    howToWin:
      'First player to get all 4 tokens completely around the board and into their home triangle wins.',
    videoTitle: 'How to Play Ludo',
    videoUrl: 'https://www.youtube.com/watch?v=xYXj9DwKHr4',
  },
  {
    id: 'snakes-and-ladders',
    title: 'Snakes and Ladders',
    category: 'dice',
    ready: false,
    objective: 'Be the first to move your token from square 1 to the final numbered square (usually 100).',
    setup:
      'Each player takes a token and starts off the board (or on square 1); the board has ladders (climb up) and snakes (slide down) scattered across it.',
    howToPlay:
      "Take turns rolling one die and moving your token forward that many squares; land on a ladder's bottom and climb to its top; land on a snake's head and slide down to its tail; an exact roll is usually needed to land precisely on the final square.",
    howToWin: 'First player whose token reaches the final square wins.',
    videoTitle: 'How to play Snakes and Ladders',
    videoUrl: 'https://www.youtube.com/watch?v=dJ-dMNzSBNI',
  },
  {
    id: 'yahtzee',
    title: 'Yahtzee',
    category: 'dice',
    ready: false,
    objective: 'Score the most total points by rolling dice into scoring combinations over 13 rounds.',
    setup:
      'Each player has 5 dice and a scorecard listing upper-section categories (Ones-Sixes) and lower-section categories (3/4-of-a-Kind, Full House, Straights, Yahtzee, Chance).',
    howToPlay:
      'Each turn, roll all 5 dice up to 3 times, setting aside any dice you want to keep between rolls; after your last roll, choose one unused category to score your dice into (every category is used exactly once per game).',
    howToWin:
      'After all 13 categories are filled (plus a bonus if the upper section totals 63+), whoever has the highest total score wins.',
    videoTitle: 'This is How You Can Play Yahtzee in 3 Minutes (Tabletop Duo)',
    videoUrl: 'https://www.youtube.com/watch?v=eYqR2i9gGe4',
  },
  {
    id: 'battleship',
    title: 'Battleship',
    category: 'hidden',
    ready: false,
    objective: "Sink your opponent's entire fleet before they sink yours.",
    setup:
      'Each player secretly places a fleet of ships (e.g., carrier, battleship, cruiser, submarine, destroyer) on their own grid, hidden from the other player, and keeps a second tracking grid for recording guesses.',
    howToPlay:
      'Players alternate calling out grid coordinates to "fire" at; the opponent reports "hit" or "miss," and each player marks the result on their tracking grid to hunt down remaining ships.',
    howToWin:
      "The first player to hit every square of all the opponent's ships (sinking the whole fleet) wins.",
    videoTitle: 'How to Play Battleship (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=q0qpQ8doUp8',
  },
  {
    id: 'hangman',
    title: 'Hangman',
    category: 'hidden',
    ready: false,
    objective: 'Guess the secret word or phrase letter by letter before the drawing is completed.',
    setup:
      'One player secretly picks a word/phrase and draws a blank dash for each letter, plus the empty gallows.',
    howToPlay:
      'The other player guesses one letter at a time; correct letters get filled into their blanks; each wrong guess adds a part to the hangman drawing (typically allowing 6-10 wrong guesses).',
    howToWin:
      'The guesser wins by completing the word before the drawing is finished; the setter wins if the drawing is completed first.',
    videoTitle: 'How to Play Hangman (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=cGOeiQfjYPk',
  },
  {
    id: 'war',
    title: 'War',
    category: 'card',
    ready: false,
    objective: "Win the entire deck by beating your opponent's cards.",
    setup:
      "Split a standard 52-card deck evenly (26 cards each), dealt face-down as each player's draw pile.",
    howToPlay:
      'Both players flip their top card at the same time; the higher card wins and takes both cards (added to the bottom of the winner\'s pile); on a tie, it\'s "War" — each player places cards face-down then one face-up, and the higher face-up card takes everything played in that War (ties can repeat the War).',
    howToWin: 'The first player to collect all 52 cards (their opponent runs out) wins.',
    videoTitle: 'How to Play War in 2 Minutes | Simple Card Game Guide (Animation Builders)',
    videoUrl: 'https://www.youtube.com/watch?v=Cco8KCjVKZs',
  },
  {
    id: 'go-fish',
    title: 'Go Fish',
    category: 'card',
    ready: false,
    objective: 'Collect the most four-of-a-kind sets ("books") by asking your opponent for cards.',
    setup:
      'Standard 52-card deck; deal 5 cards to each player (2-player game), remaining cards form the face-down draw pile ("the ocean").',
    howToPlay:
      'On your turn, ask your opponent for a specific rank you already hold at least one of; if they have it, they hand over all their cards of that rank and you go again; if not, they say "Go Fish" and you draw a card from the ocean; whenever you complete a four-of-a-kind, lay it down as a book.',
    howToWin: 'When all books are made (deck exhausted), the player with the most books wins.',
    videoTitle: 'How to play Go Fish (Card Game) (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=hRpXLSMdve0',
  },
  {
    id: 'uno',
    title: 'Uno-style matching',
    category: 'card',
    ready: false,
    objective: 'Be the first player to get rid of all your cards.',
    setup:
      'Shuffle a deck of color/number cards (or an adapted standard deck) into a draw pile; deal 7 cards to each player; flip the top card of the remaining pile to start the discard pile.',
    howToPlay:
      "Players alternate turns. On your turn, play a card from your hand that matches the top discard card by color or number/symbol, or play a wild card. If you have no playable card, draw one from the pile (play it if it's now playable, otherwise your turn ends). Action cards (Skip, Draw Two, Wild, Wild Draw Four) affect the next turn — in 2-player, a Reverse or Skip simply gives you another turn. Announce when you're down to your last card.",
    howToWin: 'First player to play their last card wins the round.',
    videoTitle: 'How to Play UNO in 3 Minutes (UNO Card Game Rules) (Tabletop Duo)',
    videoUrl: 'https://www.youtube.com/watch?v=jWbpCIgTYhU',
  },
  {
    id: 'memory',
    title: 'Memory / Concentration',
    category: 'card',
    ready: false,
    objective: 'Collect more matching pairs than your opponent.',
    setup:
      'Shuffle a deck of paired cards (numbers, pictures, or a standard deck) and lay every card face-down in a grid.',
    howToPlay:
      "Players alternate turns. On your turn, flip two cards face-up. If they match, keep the pair and take another turn. If they don't match, flip both back face-down and it becomes the other player's turn.",
    howToWin: 'When every card has been matched, the player holding the most pairs wins.',
    videoTitle: 'How to Play Concentration - a memory matching card game (Riffle Shuffle & Roll)',
    videoUrl: 'https://www.youtube.com/watch?v=wQV5RJKs_qI',
  },
  {
    id: 'rock-paper-scissors',
    title: 'Rock Paper Scissors',
    category: 'party',
    ready: true,
    objective: "Beat your opponent's hand shape on a given throw.",
    setup: 'No materials needed — just two players and their hands.',
    howToPlay:
      'Both players simultaneously count off (e.g. "Rock, Paper, Scissors, Shoot!") and on the last beat reveal one shape at the same time: Rock (fist), Paper (flat hand), or Scissors (two fingers extended).',
    howToWin:
      'Rock beats Scissors, Scissors beats Paper, Paper beats Rock. A matching throw is a tie and is replayed. Usually played as best-of-3 or best-of-5.',
    videoTitle: 'How to play Rock Paper Scissors (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=2dsHuU10udY',
  },
  {
    id: 'scrabble',
    title: 'Scrabble-style word building',
    category: 'party',
    ready: false,
    objective: 'Score the most points by building words on a shared board.',
    setup:
      'Put letter tiles (each with a point value) in a bag; each player draws 7 tiles; start with an empty board with a marked center square.',
    howToPlay:
      'Players alternate turns. On your turn, form a word from your tiles, placing it on the board like a crossword (the first word must cross the center square; every later word must connect to existing letters). Score points based on the tiles used and any bonus squares covered, then draw back up to 7 tiles. You may also pass or exchange tiles instead of playing.',
    howToWin:
      'Play ends when the tile bag is empty and a player uses their last tile, or when neither player can play. Highest total score wins.',
    videoTitle: 'How to Play Scrabble (Triple S Games)',
    videoUrl: 'https://www.youtube.com/watch?v=K1KgvZwwJqo',
  },
  {
    id: '20-questions',
    title: '20 Questions / word-guessing',
    category: 'party',
    ready: false,
    objective: 'Guess the secret person, place, or thing the other player is thinking of.',
    setup:
      'One player (the answerer) secretly picks a person, place, or thing; the other player is the guesser.',
    howToPlay:
      'Players alternate — the guesser asks yes/no questions (up to 20 total) to narrow down the answer; the answerer must respond truthfully with "yes" or "no." The guesser may make a guess at the answer at any point instead of asking a question.',
    howToWin:
      'The guesser wins if they name the correct answer within 20 questions; the answerer wins if the guesser runs out of questions first. Players typically swap roles for the next round.',
    videoTitle: 'How to Play 20 Questions (Howcast)',
    videoUrl: 'https://www.youtube.com/watch?v=FDu3S2lXa_k',
  },
];

export const getGame = (id: string): GameMeta | undefined => games.find((g) => g.id === id);
