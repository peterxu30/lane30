import { GameStates, GameMode } from './game-states.js';
import { Engine } from './engine.js';
import { Render, RenderStates } from './render.js';
import { Ticker } from './ticker.js';
import * as util from './util.js';

// Lane constants
const laneWidth = 350;
const laneHeight = 683;
const gutterWidth = 20;

// Ball constants
const ballSpeed = -8.5;
const ballRadius = 25;
const ballMass = 7.5;
const ballStartingYBuffer = 65; // distance from bottom of lane to ball starting position

// Pin constants
const pinRadius = 14.5;
const pinMass = 1;
const numPinRows = 4;
const pinSpacingX = 90; // horizontal spacing between pins
const pinSpacingY = 50; // vertical spacing between rows
const pinBaseYBuffer = 20; // distance from top of lane to first row of pins

/**
 * Game represents the entire bowling game. It contains the core game loop, state, and logic.
 * The game is composed of three main components:
 * 1. Engine - handles all physics calculations and game state updates
 * 2. Render - handles all drawing and UI scaling
 * 3. Game - handles all game logic, scoring, and user input
 * 
 * The game is designed to be responsive and scale to fit the available screen space while maintaining aspect ratio.
 * Game physics is handled independently of screen size for consistency.
 */
class Game {
  constructor(gameMode) {
    // HTML Components
    this.title = document.getElementById('title');
    this.scoreboard = document.getElementById('scoreboard');
    this.canvas = document.getElementById('lane');

    // Game mode
    this.gameMode = gameMode;

    // Core components
    this.engine = new Engine(this.gameMode);
    this.render = new Render(this.gameMode, this.title, this.scoreboard, this.canvas);
    this.ticker = new Ticker(60); // responsible for maintaining a fixed refresh rate

    // Game objects
    this.currentFrame = 0;
    this.rollInFrame = 0;
    this.frames = this.buildFrames();
    
    this.lane = {
      x: 0, // This is not just the x of the lane itself but the x of (gutter, lane, gutter)
      y: 0,
      width: laneWidth,
      height: laneHeight,
      gutterWidth: gutterWidth,
    };

    const startingY = this.lane.y + this.lane.height - ballStartingYBuffer;
    this.ball = {
      x: this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth), // start in middle of lane horizontally
      y: startingY, // start at beginning of lane vertically
      startingX: this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth), // reset X position
      startingY: startingY, // reset Y position
      r: ballRadius,
      vx: 0,
      vy: ballSpeed,
      mass: ballMass,
      rolling: false
    };

    this.pins = this.buildPins();

    // initial game state
    this.gameState = GameStates.INITIALIZED;
    this.renderState = RenderStates.INITIALIZED;
  }

  #getLaneCenterX(laneStartingX, laneWidth, gutterWidth) {
    return laneStartingX + (laneWidth + 2 * gutterWidth) / 2;
  }

  buildFrames() {
    return Array(10).fill(null).map(() => ({
      roll1: null,
      roll2: null,
      roll3: null, // only for 10th frame
      total: 0,
      cumulative: 0
    }));
  }

  // Game methods
  buildPins() {
    const baseY = this.lane.y - pinBaseYBuffer;
    const centerX = this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth);
    const pins = [];
    let id = 0;
    for (let r = 0; r < numPinRows; r++) {
      const cols = r + 1;
      const rowWidth = (cols - 1) * pinSpacingX;
      for (let c = 0; c < cols; c++) {
        const x = centerX - rowWidth / 2 + c * pinSpacingX;
        const y = baseY + (numPinRows - r) * pinSpacingY;
        pins.push({
          id: ++id,
          x, y,
          r: pinRadius,
          vx: 0, vy: 0,
          mass: pinMass,
          active: true,
          hit: false
        });
      }
    }
    return pins;
  }

  resetLane() {
    this.pins = this.buildPins();
    this.resetBall();
  }

  resetBall() {
    this.ball.x = this.ball.startingX;
    this.ball.y = this.ball.startingY;
    this.ball.vx = 0;
    this.ball.vy = ballSpeed;
    this.ball.rolling = false;
  }

  resetGame() {
    this.resetLane();
    this.frames = this.buildFrames();
    this.currentFrame = 0;
    this.rollInFrame = 0;
    this.gameState = GameStates.RUNNING;
  }

  clearHitPins() {
    this.pins.forEach(p => { if (p.hit) p.active = false; });
  }

  clearNotMovingHitPins() {
    this.pins.forEach(p => { if (p.hit && p.vx === 0 && p.vy === 0) p.active = false; });
  }

  // handleRoll calculates points and advances the roll and frame. Returns a boolean for whether to reset pins or not.
  handleRoll() {
    let pinsHit = this.pins.filter(p => p.hit && !p.scored).length;
    this.pins.forEach(p => { (p.hit) ? p.scored = true : p.scored = false; });

    let frame = this.frames[this.currentFrame];

    if (this.currentFrame >= 10) {
      return true;
    }

    let shouldResetPins = false; 

    // 10th frame special logic
    if (this.currentFrame === 9) {
      if (this.rollInFrame === 0) {
        // first throw
        frame.roll1 = pinsHit;
        this.rollInFrame = 1;

        shouldResetPins = util.frameTenFirstRollIsStrike(frame);
      } else if (this.rollInFrame === 1) {
        // second throw
        if (!util.frameIsStrike(frame) && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = 10 - frame.roll1; // spare
        } else {
          frame.roll2 = pinsHit;
        }

        if (util.frameIsStrike(frame) || util.frameIsSpare(frame)) {
          // one more
          this.rollInFrame = 2;
        } else {
          // frame is over
          this.currentFrame++;
          this.rollInFrame = 5; // filler value
        }

        shouldResetPins =  util.frameTenSecondRollIsStrike(frame) || util.frameTenSecondRollIsSpare(frame);
      } else if (this.rollInFrame === 2) {
        frame.roll3 = pinsHit;
        this.currentFrame++;
        this.rollInFrame = 5; // filler value
        shouldResetPins =  true;
      }
    } else {
      // Frames 1-9
      if (this.rollInFrame === 0) {
        frame.roll1 = pinsHit;
        if (util.frameIsStrike(frame)) {
          this.currentFrame++;
          shouldResetPins =  true;
        } else {
          this.rollInFrame = 1;
          shouldResetPins =  false;
        }
      } else {
        if (!util.frameIsStrike(frame) && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = 10 - frame.roll1; // spare
        } else {
          frame.roll2 = pinsHit;
        }
        this.currentFrame++;
        this.rollInFrame = 0;
        shouldResetPins =  true;
      }
    }

    this.calculateCumulative();
    return shouldResetPins;
  }

  calculateCumulative() {
    let cumulative = 0;
    for (let i = 0; i < 10; i++) {
      const f = this.frames[i];
      if (f.roll1 == null) break;

      let frameScore = 0;

      if (i < 9) {
        if (util.frameIsStrike(f)) {
          frameScore = 10 + this.strikeBonus(i);
        } else if (util.frameIsSpare(f)) {
          frameScore = 10 + this.spareBonus(i);
        } else {
          frameScore = (f.roll1 || 0) + (f.roll2 || 0);
        }
      } else {
        const r1 = f.roll1 || 0;
        const r2 = f.roll2 || 0;
        const r3 = f.roll3 || 0;
        frameScore = r1 + r2 + r3;
      }

      cumulative += frameScore;
      f.cumulative = cumulative;
    }
  }

  strikeBonus(frameIndex) {
    const nextFrame = this.frames[frameIndex + 1];
    if (!nextFrame) return 0;

    let bonus = 0;
    if (util.frameIsStrike(nextFrame)) {
      bonus += 10;

      if (frameIndex === this.frames.length - 2) {
        bonus += nextFrame.roll2 || 0;
      } else {
        const nextNext = this.frames[frameIndex + 2];
        bonus += nextNext ? (nextNext.roll1 || 0) : 0;
      }
    } else {
      bonus += (nextFrame.roll1 || 0) + (nextFrame.roll2 || 0);
    }
    return bonus;
  }

  spareBonus(frameIndex) {
    const nextFrame = this.frames[frameIndex + 1];
    if (!nextFrame) return 0;
    return nextFrame.roll1 || 0;
  }

  initialize() {
    this.render.setupPointerDownListener(this.pointerDownCallback.bind(this));
    this.render.setupPointerMoveListener(this.pointerMoveCallback.bind(this));
    this.render.setupPointerEndListener(this.pointerEndCallback.bind(this));
    this.render.setupPointerCancelListener();
  }

  pointerDownCallback(pointerX, pointerY) {
    switch (this.gameState) {
      case GameStates.INITIALIZED:
      case GameStates.NOT_RUNNING:
        const x = Math.abs(pointerX - this.ball.x);
        const y = Math.abs(pointerY - this.ball.y);
        const distanceFromBallCenter = Math.hypot(x,y);
        return distanceFromBallCenter <= this.ball.r;
      default:
        return true;
    }
  }

  pointerMoveCallback(pointerX) {
    if (this.gameState == GameStates.RUNNING) {
      return;
    }

    const minX = this.lane.x + this.lane.gutterWidth + this.ball.r;
    const maxX = this.lane.x + + this.lane.gutterWidth + this.lane.width - this.ball.r;
    this.ball.x = Math.max(minX, Math.min(maxX, pointerX));
  }

  pointerEndCallback() {
    this.handleGameState(true);
  }

  handleGameState(isUserInput) {
    let previousGameState = this.gameState; // logging

    switch (this.gameState) {
      case GameStates.INITIALIZED:
        // INITIALIZED has the same behavior as NOT_RUNNING
        if (!isUserInput) {
          break;
        }
      case GameStates.NOT_RUNNING:
        this.renderState = RenderStates.RUNNING;

        if (!isUserInput) {
          break;
        }

        this.ball.rolling = true; // start moving
        this.gameState = GameStates.RUNNING;
        break;
      case GameStates.RUNNING:
        // Check that pins are moving
        const ballOutOfLane = (this.ball.y + this.ball.r < this.lane.y);
        const ballOutOfLaneWithDelay = (this.ball.y + this.ball.r < this.lane.y - 525);

        const noMovingPinsWithinLane = this.pins.every(
          p => {
            if (p.active) {
              return p.vx === 0 && p.vy === 0;
            } else {
              return true;
            }
          }
        );

        const allPinsComplete = this.pins.every(p =>
          !p.active || // pin out of bounds, can't hit anything anymore
          (
            // pin not hit and cannot no longer be hit by either ball or other pins
            !p.hit &&
            p.active &&
            ballOutOfLane &&
            noMovingPinsWithinLane
          )
        );
        
        if (ballOutOfLaneWithDelay || allPinsComplete) {
          this.renderState = RenderStates.BALL_RETURN;
        }

        if (ballOutOfLane && isUserInput) {
          this.gameState = GameStates.FRAME_DONE;
        }
        break;
      case GameStates.FRAME_DONE:
        // FRAME_DONE means that the pins have stopped moving and the ball has rolled off the screen.
        // In this game state: scores are calculated and the lane is reset/cleared.
        // If first roll of frame and no strike: reset ball and remove hit pins, leave remaining pins on lane
        // If first roll of frame and strike: reset ball and reset pins to full set
        // If second roll of frame: reset ball and reset pins to full set
        this.renderState = RenderStates.RUNNING;
        
        if (isUserInput) {
          break;
        }
        
        let shouldResetPins = this.handleRoll();
        this.gameState = GameStates.NOT_RUNNING;
        if (this.isGameOver()) {
          // No more frames left in game
          this.gameState = GameStates.OVER;
        } else {
          if (shouldResetPins) {
            // No more rolls left in frame
            // Reset lane for next frame
            this.resetLane(); // unclear that this also resets ball
          } else {
            // Still has rolls left in frame
            this.clearHitPins();
            this.resetBall();
          }
        }

        break;
      case GameStates.OVER:
        // OVER means the last roll of the tenth frame has happened.
        // Reset the game and wait for player to start again.
        this.renderState = RenderStates.OVER;

        if (!isUserInput) {
          break;
        }

        this.resetGame();
        this.gameState = GameStates.NOT_RUNNING;
        break;
    }

    if (previousGameState != this.gameState) {
      console.log(`Switching from ${previousGameState.description} to ${this.gameState.description}. isUserInput: ${isUserInput}`);
    }
  }

  isGameOver() {
    return this.currentFrame >= 10;
  }

  run() {    
    this.initialize();

    self = this;
    function runHelper(timestamp) {
      self.engine.update(self.ball, self.pins, self.lane, self.ticker.tickInterval(timestamp));
      self.render.draw(self.ball, self.pins, self.lane, self.frames, self.renderState);
      self.clearNotMovingHitPins();
      self.handleGameState(false)
      window.requestAnimationFrame(runHelper); // recursive call
    }
    window.requestAnimationFrame(runHelper);
  }
}

export { Game };