/**
 * GameStates represents the possible states of the bowling game.
 */
export const GameStates = Object.freeze({
  NOT_STARTED: Symbol("not_started"),
  RUNNING:   Symbol("running"),
  OVER:  Symbol("over"),
  RESTART: Symbol("restart")
});

/**
 * RenderStates represents the possible states of the render.
 */
export const RenderStates = Object.freeze({
  NOT_STARTED: Symbol("not_started"),
  RUNNING: Symbol("running"),
  OVER: Symbol("over")
});

/**
 * GameStateToRenderState maps the game state to the render state.
 */
export const GameStateToRenderState = {
  [GameStates.NOT_STARTED]: RenderStates.NOT_STARTED,
  [GameStates.RUNNING]: RenderStates.RUNNING,
  [GameStates.OVER]: RenderStates.OVER,
  [GameStates.RESTART]: RenderStates.OVER
};

