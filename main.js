import { Game } from './game.js';
import { Leaderboard } from './leaderboard.js';

(() => {
  const game = new Game();
  const leaderboard = new Leaderboard();

  game.onEnterLeaderboard = async (score, mode) => {
    await leaderboard._ready;
    if (leaderboard.available) {
      leaderboard.showSubmit(score, mode, () => game.startNewGame());
    } else {
      game.startNewGame();
    }
  };

  game.run();
})();
