import { ticTacToe } from './ticTacToe.js';
import { rockPaperScissors } from './rockPaperScissors.js';
import { connectFour } from './connectFour.js';
import { memoryMatch } from './memoryMatch.js';
import { quickTap } from './quickTap.js';

export const ENGINES = {
  tic_tac_toe: ticTacToe,
  rock_paper_scissors: rockPaperScissors,
  connect_four: connectFour,
  memory_match: memoryMatch,
  quick_tap: quickTap,
};

export const getEngine = (id) => ENGINES[id] || null;
