/**
 * GameStates represents the possible states of the bowling game.
 * 
 * The states are defined as follows:
 * - INITIALIZED: The initial state when game is loaded for the first time. This game is only in this state once at the beginning.
 * - NOT_RUNNING: The state the game returns to between rolls, waiting for the player to finish aiming the ball and roll.
 * - RUNNING: The ball is rolling and/or pins are moving.
 * - FRAME_DONE: The ball has rolled off screen and the pins are finished moving. Scores are calculated. The lane is reset/cleared.
 * - OVER: The tenth frame has just been completed. Game over text is displayed.
 * The state machine of the game is as follows:
 * 
 * INITIALIZED --(tap)--> RUNNING --(automatic/tap)--> FRAME_DONE --(automatic)--> OVER
 *                           ^                            |                         |
 *                           |                            |                         |
 * NOT_RUNNING -----(tap)-----                            |                         |
 *    ^   ^                                               |                         |
 *    |   |                                               |                         |
 *    |   ------------------(automatic/tap)---------------|                         |
 *    |                                                                             |
 *    |                                                                             |
 *    ----------------------------(tap)----------------------------------------------
 */
export const GameStates = Object.freeze({
  INITIALIZED: Symbol("initialized"), // game loaded for first time, game is only ever in this state once at the beginning
  NOT_RUNNING: Symbol("not_started"), // waiting for ball to be rolled, this is the state the game returns to between rolls and at the start of subsequent games
  RUNNING:   Symbol("running"), // ball is moving and on screen
  FRAME_DONE: Symbol("frame_done"), // ball of screen, pins finished moving
  OVER:  Symbol("over"), // game is over, ten frames have been bowled 
});


export const GameMode = Object.freeze({
  NORMAL: Symbol("normal"),
  MIGA: Symbol("miga"),
});