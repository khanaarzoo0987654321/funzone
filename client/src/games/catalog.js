/** Lightweight client-side metadata for live game screens. */
export const GAMES = {
  tic_tac_toe: { id: 'tic_tac_toe', name: 'Tic Tac Toe', icon: 'grid', color: 'violet' },
  rock_paper_scissors: { id: 'rock_paper_scissors', name: 'Rock Paper Scissors', icon: 'hand', color: 'pink' },
  connect_four: { id: 'connect_four', name: 'Connect Four', icon: 'columns', color: 'cyan' },
  memory_match: { id: 'memory_match', name: 'Memory Match', icon: 'cards', color: 'amber' },
  quick_tap: { id: 'quick_tap', name: 'Quick Tap', icon: 'bolt', color: 'lime' },
};

export const getGame = (id) => GAMES[id] || null;
