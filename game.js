// TODO 
// P0
// - flip orientation of pins - DONE
// - fix window sizing issue (need to fit everything to screen) - DONE
// - allow ball to move left right before release, do not let ball be controlled post release - DONE
// - control the ball via drag instead of click
// - need way of ending/starting new game after tenth frame - WIP
// - add text to tap to rerack/ball return - DONE
// - score should automatically update
// - need to fix score calculation for 10th frame - DONE
// - need to fix scoreboard on closed tenth frame - DONE
// - need a flashy title graphic - "Lane 30 by PKING"
// - pop on text explaining how to play + description, thank yous etc. - DONE
// - clean up abstractions
// - ball trajectory should be affected by pin collisions
// - disable screen dragging on mobile - DONE
// - stop pin movement after a while
// - reset lane when all hit active pins velocity is 
// - The game is actually really difficult on mobile. Maybe increase ball mass, size, or speed? Maybe make pins bigger?
// - restrict game refresh rate to 60hz

// P1
// - hook mode - where you can control the ball as it moves
// - auto reset the ball after it leaves the lane instead of requiring user to click
// - about section with blurb + "Vibe coded by ChatGPT, fixed by PKING."

import { GameStates, RenderStates, GameStateToRenderState } from './constants.js';
import { Engine } from './engine.js';
import { Render } from './render.js';

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
  // Game constants represent the bowling lane separate from the UI. 
  // Because physics is computed in pixels, scaling the game to different screen sizes will affect physics.
  // Instead, we will keep the game dimensions constant and scale the UI in the Render class.

  // Lane constants
  static laneWidth = 350;
  static laneHeight = 683;
  static gutterWidth = 20;

  // Ball constants
  static ballSpeed = -8.4;
  static ballRadius = 25;
  static ballMass = 6.5;
  static ballStartingYBuffer = 60; // distance from bottom of lane to ball starting position

  // Pin constants
  static pinRadius = 14;
  static pinMass = 2;
  static numPinRows = 4;
  static pinSpacingX = 90; // horizontal spacing between pins
  static pinSpacingY = 50; // vertical spacing between rows
  static pinBaseYBuffer = 20; // distance from top of lane to first row of pins

  constructor() {
    // HTML Components
    this.title = document.getElementById('title');
    this.scoreboard = document.getElementById('scoreboard');
    this.canvas = document.getElementById('lane');

    // Core components
    this.engine = new Engine();
    this.render = new Render(this.title, this.scoreboard, this.canvas);

    // Game objects
    this.initialized = false;

    this.currentFrame = 0;
    this.rollInFrame = 0;
    this.frames = this.buildFrames();
    
    this.lane = {
      x: 0,
      y: 0,
      width: Game.laneWidth,
      height: Game.laneHeight,
      gutterWidth: Game.gutterWidth,
    };

    const startingY = this.lane.y + this.lane.height - Game.ballStartingYBuffer;
    this.ball = {
      x: this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth), // start in middle of lane horizontally
      y: startingY, // start at beginning of lane vertically
      startingX: this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth), // reset X position
      startingY: startingY, // reset Y position
      r: Game.ballRadius,
      vx: 0,
      vy: Game.ballSpeed,
      mass: Game.ballMass,
      rolling: false
    };

    this.pins = this.buildPins();
    
    // initialize mouseX to middle of lane
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = rect.right - rect.left / 2;

    // testing
    this.gameState = GameStates.NOT_STARTED;
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
    const baseY = this.lane.y - Game.pinBaseYBuffer;
    const centerX = this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth);
    const pins = [];
    let id = 0;
    for (let r = 0; r < Game.numPinRows; r++) {
      const cols = r + 1;
      const rowWidth = (cols - 1) * Game.pinSpacingX;
      for (let c = 0; c < cols; c++) {
        const x = centerX - rowWidth / 2 + c * Game.pinSpacingX;
        const y = baseY + (Game.numPinRows - r) * Game.pinSpacingY;
        pins.push({
          id: ++id,
          x, y,
          r: Game.pinRadius,
          vx: 0, vy: 0,
          mass: Game.pinMass,
          active: true,
          hit: false
        });
      }
    }
    return pins;
  }

  resetGame() {
    this.pins = this.buildPins();
    this.resetBall();
  }

  resetBall() {
    this.ball.x = this.ball.startingX;
    this.ball.y = this.ball.startingY;
    this.ball.vx = 0;
    this.ball.vy = Game.ballSpeed;
    this.ball.rolling = false;
  }

  isStrike() {
    const pinsHit = this.pins.filter(p => p.hit && !p.scored).length;
    return pinsHit === 10 && this.rollInFrame === 0;
  }

  clearHitPins() {
    this.pins.forEach(p => { if (p.hit) p.active = false; });
  }

  handleRoll() {
    const pinsHit = this.pins.filter(p => p.hit && !p.scored).length;
    this.pins.forEach(p => { (p.hit) ? p.scored = true : p.scored = false; });

    const frame = this.frames[this.currentFrame];

    // TODO(peter.xu) Is this hacky?
    if (this.currentFrame >= 10) {
      return;
    }

    // 10th frame special logic
    if (this.currentFrame === 9) {
      if (this.rollInFrame === 0) {
        frame.roll1 = pinsHit === 10 ? 'X' : pinsHit;
        this.rollInFrame = 1;
      } else if (this.rollInFrame === 1) {
        if (frame.roll1 !== 'X' && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = '/';
        } else {
          frame.roll2 = pinsHit === 10 ? 'X' : pinsHit;
        }

        if (frame.roll1 === 'X' || frame.roll2 === '/') {
          this.rollInFrame = 2;
        } else {
          this.currentFrame++;
          this.rollInFrame = 5; // wrong, using filler value 
        }
      } else if (this.rollInFrame === 2) {
        frame.roll3 = pinsHit === 10 ? 'X' : pinsHit;
        this.currentFrame++; // TODO(peter.xu) This is wrong. Game over logic
        this.rollInFrame = 5; // wrong, using filler value
      }
    } else {
      // Frames 1-9
      if (this.rollInFrame === 0) {
        frame.roll1 = pinsHit === 10 ? 'X' : pinsHit;
        if (pinsHit === 10) {
          frame.roll2 = '';
          this.currentFrame++;
        } else {
          this.rollInFrame = 1;
        }
      } else {
        if (frame.roll1 !== 'X' && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = '/';
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
        if (f.roll1 === 'X') {
          frameScore = 10 + this.strikeBonus(i);
        } else if (f.roll2 === '/') {
          frameScore = 10 + this.spareBonus(i);
        } else {
          frameScore = (f.roll1 || 0) + (f.roll2 || 0);
        }
      } else {
        const r1 = f.roll1 === 'X' ? 10 : f.roll1;
        let r2 = 0;
        if (f.roll2 === '/') r2 = 10 - r1;
        else r2 = f.roll2 === 'X' ? 10 : f.roll2 || 0;
        const r3 = f.roll3 === 'X' ? 10 : f.roll3 || 0;
        frameScore = r1 + r2 + (f.roll3 != null ? r3 : 0);
      }

      cumulative += frameScore;
      f.cumulative = cumulative;
    }
  }

  strikeBonus(frameIndex) {
    const nextFrame = this.frames[frameIndex + 1];
    if (!nextFrame) return 0;

    let bonus = 0;      
    if (nextFrame.roll1 === 'X') { 
      bonus += 10;

      if (frameIndex === this.frames.length - 2) {
        bonus += nextFrame.roll2 === 'X' ? 10 : nextFrame.roll2 || 0;
      } else {
        const nextNext = this.frames[frameIndex + 2];
        bonus += nextNext ? (nextNext.roll1 === 'X' ? 10 : nextNext.roll1 || 0) : 0;
      }
    } else {
      bonus += (nextFrame.roll1 || 0) + (nextFrame.roll2 === '/' ? (10 - nextFrame.roll1) : nextFrame.roll2 || 0);
    }
    return bonus;
  }

  spareBonus(frameIndex) {
    const nextFrame = this.frames[frameIndex + 1];
    if (!nextFrame) return 0;
    return nextFrame.roll1 === 'X' ? 10 : nextFrame.roll1 || 0;
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
        console.log('isGameOver ' + this.isGameOver() + ' ' + this.gameState.toString());
        if (this.isGameOver()) {
          if (this.gameState === GameStates.RUNNING) {
            console.log("Setting game state from running to restart");
            this.gameState = GameStates.RESTART;
          } else if (this.gameState === GameStates.RESTART) {
            console.log('GAME OVER');

            // this should be encapsulated into a resetGame method
            this.frames = this.buildFrames();
            this.currentFrame = 0;
            this.rollInFrame = 0;
            this.resetGame();
            this.gameState = GameStates.RUNNING;
          }
        } else {
          this.resetGame(); // really should be renamed rerack
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

  // var stop = false;
  // var frameCount = 0;
  // var $results = $("#results");
  // var fps, fpsInterval, startTime, now, then, elapsed;

  // startAnimating(60);

  // function startAnimating(fps) {
  //     fpsInterval = 1000 / fps;
  //     then = window.performance.now();
  //     startTime = then;
  //     console.log(startTime);
  //     animate();
  // }


  // function animate(newtime) {

  //     // // stop
  //     // if (stop) {
  //     //     return;
  //     // }

  //     // request another frame

  //     requestAnimationFrame(animate);

  //     // calc elapsed time since last loop

  //     now = newtime;
  //     elapsed = now - then;

  //     // if enough time has elapsed, draw the next frame

  //     if (elapsed > fpsInterval) {

  //         // Get ready for next frame by setting then=now, but...
  //         // Also, adjust for fpsInterval not being multiple of 16.67
  //         then = now - (elapsed % fpsInterval);

  //         // draw stuff here


  //         // TESTING...Report #seconds since start and achieved fps.
  //         var sinceStart = now - startTime;
  //         var currentFps = Math.round(1000 / (sinceStart / ++frameCount) * 100) / 100;
  //         $results.text("Elapsed time= " + Math.round(sinceStart / 1000 * 100) / 100 + " secs @ " + currentFps + " fps.");

  //     }
  // }

  run() {    
    this.initialize();

    self = this;
    function runHelper() {
      self.engine.update(self.ball, self.pins, self.lane);
      self.render.draw(self.ball, self.pins, self.lane, self.frames, self.gameState);
      window.requestAnimationFrame(runHelper); // recursive call
    }
    window.requestAnimationFrame(runHelper);
  }
}

export { Game };