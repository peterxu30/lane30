import { Game } from './game.js';
import { Leaderboard } from './leaderboard.js';

(() => {
  const game = new Game();
  const leaderboard = new Leaderboard();

  game.onGameOver = (score, mode) => {
    leaderboard.showSubmit(score, mode, () => game.startNewGame());
  };

  game.run();
})();
