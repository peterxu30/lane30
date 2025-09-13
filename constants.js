/**
 * GameStates represents the possible states of the bowling game.
 */
export const GameStates = Object.freeze({
  NOT_STARTED: Symbol("not_started"),
  RUNNING:   Symbol("running"),
  OVER:  Symbol("over"),
  RESTART: Symbol("restart")
});
