import { Game } from './game.js';
import { GameMode } from './game-states.js';

(() => {
  const game = new Game(GameMode.MIGA);
  game.run();
})();
