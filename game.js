import { GameStates } from './constants.js';
import { Engine } from './engine.js';
import { Render } from './render.js';
import { Ticker } from './ticker.js';
import * as util from './util.js';

// Lane constants
const laneWidth = 350;
const laneHeight = 683;
const gutterWidth = 20;

// Ball constants
const ballSpeed = -8.4;
const ballRadius = 25;
const ballMass = 6.5;
const ballStartingYBuffer = 60; // distance from bottom of lane to ball starting position

// Pin constants
const pinRadius = 14;
const pinMass = 2;
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
  constructor() {
    // HTML Components
    this.title = document.getElementById('title');
    this.scoreboard = document.getElementById('scoreboard');
    this.canvas = document.getElementById('lane');

    // Core components
    this.engine = new Engine();
    this.render = new Render(this.title, this.scoreboard, this.canvas);
    this.ticker = new Ticker(60); // responsible for maintaining a fixed refresh rate

    // Game objects
    this.initialized = false;

    this.currentFrame = 0;
    this.rollInFrame = 0;
    this.frames = this.buildFrames();
    
    this.lane = {
      x: 0,
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
    
    // initialize mouseX to middle of lane
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = rect.right - rect.left / 2;

    // initial game state
    this.gameState = GameStates.NOT_STARTED;
  }

  #getLaneCenterX(laneStartingX, laneWidth, gutterWidth) {
    return laneStartingX + (laneWidth + 2 * gutterWidth) / 2;
  }

  // TODO(peter.xu) Add is spare/strike
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

  isStrike() {
    const pinsHit = this.pins.filter(p => p.hit && !p.scored).length;
    return pinsHit === 10 && this.rollInFrame === 0;
  }

  clearHitPins() {
    this.pins.forEach(p => { if (p.hit) p.active = false; });
  }

  // TODO(peter.xu) Refactor this
  handleRoll() {
    const pinsHit = this.pins.filter(p => p.hit && !p.scored).length;
    this.pins.forEach(p => { (p.hit) ? p.scored = true : p.scored = false; });

    const frame = this.frames[this.currentFrame];

    if (this.currentFrame >= 10) {
      return;
    }

    // 10th frame special logic
    if (this.currentFrame === 9) {
      if (this.rollInFrame === 0) {
        frame.roll1 = pinsHit;
        this.rollInFrame = 1;
      } else if (this.rollInFrame === 1) {
        if (!util.frameIsStrike(frame) && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = 10 - frame.roll1; // spare
        } else {
          frame.roll2 = pinsHit;
        }

        if (util.frameIsStrike(frame) || util.frameIsSpare(frame)) {
          this.rollInFrame = 2;
        } else {
          this.currentFrame++;
          this.rollInFrame = 5; // filler value
        }
      } else if (this.rollInFrame === 2) {
        frame.roll3 = pinsHit;
        this.currentFrame++;
        this.rollInFrame = 5; // filler value
      }
    } else {
      // Frames 1-9
      if (this.rollInFrame === 0) {
        frame.roll1 = pinsHit;
        if (util.frameIsStrike(frame)) {
          this.currentFrame++;
        } else {
          this.rollInFrame = 1;
        }
      } else {
        if (!util.frameIsStrike(frame) && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = 10 - frame.roll1; // spare
        } else {
          frame.roll2 = pinsHit;
        }
        this.currentFrame++;
        this.rollInFrame = 0;
      }
    }

    this.calculateCumulative();
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
    if (this.initialized) return;

    this.render.initialize(this.lane.width, this.lane.height, this.lane.gutterWidth);
    this.render.setupMouseMoveListener(this);
    this.render.setupMouseClickListener(this.mouseClickListenerCallback.bind(this));
    this.initialized = true;
  }

  mouseClickListenerCallback() {
    // TODO(peter.xu) This should only start at the first opening of game.
    if (this.gameState === GameStates.NOT_STARTED) {
      this.gameState = GameStates.RUNNING;
      // return;
    }

    if (!this.ball.rolling) {
      // TODO(peter.xu) Clean this up
      // This logic controls the ball's horizontal position before it is rolled
      // Currently bound the ball to always be within the lane. (Cannot throw a gutter ball).
      const minX = this.lane.x + this.lane.gutterWidth + this.ball.r;
      const maxX = this.lane.x + + this.lane.gutterWidth + this.lane.width - this.ball.r;
      const targetX = Math.max(minX, Math.min(maxX, this.mouseX));
      this.ball.x += (targetX - this.ball.x);

      this.ball.rolling = true; // start moving
    } else if (this.ball.y < this.lane.y) {
      // TODO(peter.xu) handle game over logic before handleRoll

      let previousRollInFrame = this.rollInFrame;
      let previousFrameIsStrike = this.isStrike(this.pins);
      
      if (previousFrameIsStrike) {
        console.log("IS STRIKE");
      }
      
      this.handleRoll(this.pins);
      if (previousRollInFrame === 0 && !previousFrameIsStrike) {
        this.clearHitPins();
        this.resetBall();
      } else {
        // TODO(peter.xu) I don't like this here.
        // Should not reset game on click. Should keep scoreboard and display a game over message.
        // Clicking again should start a new game.
        if (this.isGameOver()) {
          if (this.gameState === GameStates.RUNNING) {
            console.log("Setting game state from running to restart");
            this.gameState = GameStates.RESTART;
          } else if (this.gameState === GameStates.RESTART) {
            // this should be encapsulated into a resetGame method
            this.resetGame();
          }
        } else {
          this.resetLane();
        }
      }
    }
  }

  isGameOver() {
    if (this.currentFrame >= 10) {
      console.log("game is over");
    }
    return this.currentFrame >= 10;
  }

  handleGameOver() {
    
  }

  run() {    
    this.initialize();

    self = this;
    function runHelper(timestamp) {
      self.engine.update(self.ball, self.pins, self.lane, self.ticker.tickInterval(timestamp));
      self.render.draw(self.ball, self.pins, self.lane, self.frames, self.gameState);
      window.requestAnimationFrame(runHelper); // recursive call
    }
    window.requestAnimationFrame(runHelper);
  }
}

export { Game };