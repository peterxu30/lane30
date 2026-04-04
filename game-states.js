/**
 * GameStates represents the possible states of the bowling game.
 *
 * The states are defined as follows:
 * - INITIALIZED: The initial state when the game loads or restarts after the leaderboard.
 * - NOT_RUNNING: The state the game returns to between rolls, waiting for the player to finish aiming the ball and roll.
 * - RUNNING: The ball is rolling and/or pins are moving.
 * - FRAME_DONE: The ball has rolled off screen and the pins are finished moving. Scores are calculated. The lane is reset/cleared.
 * - OVER: The tenth frame has just been completed. Game over text is displayed. Waiting for player tap.
 * - LEADERBOARD: Leaderboard modal is open. Waiting for player to submit score or skip.
 * The state machine of the game is as follows:
 *
 * INITIALIZED --(tap)--> RUNNING --(automatic/tap)--> FRAME_DONE --(automatic)--> OVER
 *      ^                    ^                               |                       |
 *      |                    |                               |                    (tap)
 *      |    NOT_RUNNING --(tap)                             |                       |
 *      |         ^                                          |                       v
 *      |         |-----------------(automatic/tap)----------|                 LEADERBOARD
 *      |                                                    |                       |
 *      |-----------------(play again/skip)------------------------------------------|
 */
export const GameStates = Object.freeze({
  INITIALIZED: Symbol("initialized"), // game loads or restarts after leaderboard; same behaviour as NOT_RUNNING but allows mode-switch tap
  NOT_RUNNING: Symbol("not_started"), // waiting for ball to be rolled, this is the state the game returns to between rolls and at the start of subsequent games
  RUNNING:   Symbol("running"), // ball is moving and on screen
  FRAME_DONE: Symbol("frame_done"), // ball of screen, pins finished moving
  OVER:  Symbol("over"), // game is over, ten frames have been bowled
  LEADERBOARD: Symbol("leaderboard"), // waiting for player to interact with leaderboard modal
});


export const GameMode = Object.freeze({
  NORMAL: Symbol("normal"),
  MIGA: Symbol("miga"),
});