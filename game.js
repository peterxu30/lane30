// 9/1/2025 TODO 
// P0
// - flip orientation of pins - DONE
// - fix window sizing issue (need to fit everything to screen) - DONE
// - allow ball to move left right before release, do not let ball be controlled post release
// - need way of ending/starting new game after tenth frame
// - need to fix scoreboard on closed tenth frame
// - need a flashy title graphic - "Lane 30 by PKING"
// - about section with blurb + "Vibe coded by ChatGPT, fixed by PKING."
// - clean up abstractions
// - ball trajectory should be affected by pin collisions

// P1
// - hook mode - where you can control the ball as it moves
// - auto reset the ball after it leaves the lane instead of requiring user to click


class Game {
  // Game constants represent the bowling lane separate from the UI. 
  // Because physics is computed in pixels, scaling the game to different screen sizes will affect physics.
  // Instead, we will keep the game dimensions constant and scale the UI in the Render class.

  // Lane constants
  static laneWidth = 350
  static laneHeight = 683
  static gutterWidth = 20

  // Ball constants
  static ballSpeed = -7.9;
  static ballRadius = 25;
  static ballMass = 5;

  // Pin constants
  static pinRadius = 14;
  static pinMass = 2;
  static numPinRows = 4;
  static pinSpacingX = 90; // horizontal spacing between pins
  static pinSpacingY = 50; // vertical spacing between rows

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
    this.frames = Array(10).fill(null).map(() => ({
      roll1: null,
      roll2: null,
      total: 0,
      cumulative: 0
    }));
    
    this.lane = {
      x: 0,
      y: 0,
      width: Game.laneWidth,
      height: Game.laneHeight,
      gutterWidth: Game.gutterWidth,
    };

    this.ball = {
      x: this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth), // start in middle of lane horizontally
      y: this.lane.y + this.lane.height - 60, // start at beginning of lane vertically
      startingX: this.#getLaneCenterX(this.lane.x, this.lane.width, this.lane.gutterWidth), // reset X position
      startingY: this.lane.y + this.lane.height - 60, // reset Y position
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
  }

  #getLaneCenterX(laneStartingX, laneWidth, gutterWidth) {
    return laneStartingX + (laneWidth + 2 * gutterWidth) / 2;
  }

  // Game methods
  buildPins() {
    const baseY = this.lane.y - 20;
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
          this.rollInFrame = 0;
        }
      } else if (this.rollInFrame === 2) {
        frame.roll3 = pinsHit === 10 ? 'X' : pinsHit;
        this.currentFrame++;
        this.rollInFrame = 0;
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
      const nextNext = this.frames[frameIndex + 2];
      bonus += nextNext ? (nextNext.roll1 === 'X' ? 10 : nextNext.roll1 || 0) : 0;
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
    if (!this.ball.rolling) {
      // TODO(peter.xu) Clean this up
      // This logic controls the ball's horizontal position before it is rolled
      // This is ok to leave as is
      const minX = this.lane.x + this.ball.r;
      const maxX = this.lane.x + this.lane.width - this.ball.r;
      const targetX = Math.max(minX, Math.min(maxX, this.mouseX));
      this.ball.x += (targetX - this.ball.x);

      this.ball.rolling = true; // start moving
    } else if (this.ball.y < this.lane.y) {
      let previousRollInFrame = this.rollInFrame;
      let previousFrameIsStrike = this.isStrike(this.pins);
      
      if (previousFrameIsStrike) {
        console.log("IS STRIKE");
      }
      
      this.handleRoll(this.pins);
      if (previousRollInFrame == 0 && !previousFrameIsStrike) {
        this.clearHitPins();
        this.resetBall();
      } else {
        this.resetGame();
      }
    }
  }

  run() {    
    this.initialize();

    self = this;
    function runHelper() {
      self.engine.update(self.ball, self.pins, self.lane);
      self.render.draw(self.ball, self.pins, self.lane, self.frames);
      window.requestAnimationFrame(runHelper); // recursive call
    }
    window.requestAnimationFrame(runHelper);
  }
}

class Engine {
  update(ball, pins, lane) {
    // Ball movement
    if (ball.rolling) {
      // disable mouse control for now
      // if (mouseX != null) {
      //   const minX = lane.x + ball.r;
      //   const maxX = lane.x + lane.width - ball.r;
      //   const targetX = Math.max(minX, Math.min(maxX, mouseX));
      //   ball.x += (targetX - ball.x) * 0.18;
      // }
      ball.y += ball.vy;
    }

    // Ball–pin collisions
    pins.forEach(p => {
      if (p.active) this.resolveCollision(ball, p);
    });

    // Pin–pin collisions
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        if (pins[i].active && pins[j].active) {
          this.resolveCollision(pins[i], pins[j]);
        }
      }
    }

    // TODO(peter.xu) Maybe bring horizontal ball movement back
    // if (ball.rolling) {
    //   ball.x += ball.vx;
    //   ball.vx *= 0.98;
    // }

    // Move pins
    pins.forEach(p => {
      if (!p.active) return;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;

      // testing stopping the pins
      // var beforeVx = p.vx;
      // var decimalPlaces = 22;
      // var decimalNumber = Math.pow(10, decimalPlaces);
      // p.vx = -1 * Math.abs(Math.ceil(p.vx * decimalNumber) / decimalNumber);
      // p.vy = -1 * Math.abs(Math.ceil(p.vy * decimalNumber) / decimalNumber);
      // console.log(`Pin ${p.id} vx: ${beforeVx} -> ${p.vx}, vy: ${p.vy}`);

      // check gutters/out
      if (
        p.x < lane.x - lane.gutterWidth ||
        p.x > lane.x + lane.width + lane.gutterWidth ||
        p.y < lane.y ||
        p.y > lane.y + lane.height
      ) {
        p.active = false;
      }
    });
  }

  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const overlap = a.r + b.r - dist;
    if (overlap > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * overlap / 2;
      a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2;
      b.y += ny * overlap / 2;
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal > 0) return;
      const restitution = -0.23;
      const invMassA = 1 / a.mass;
      const invMassB = 1 / b.mass;
      const j = -(1 + restitution) * velAlongNormal / (invMassA + invMassB);
      const ix = j * nx;
      const iy = j * ny;
      a.vx -= ix * invMassA;
      a.vy -= iy * invMassA;
      b.vx += ix * invMassB;
      b.vy += iy * invMassB;

      if ("hit" in b) {
        b.hit = true;
      }
      if ("hit" in a) {
        a.hit = true;
      }
    }
  }  
}

/**
 * Render handles all drawing and UI scaling. The game automatically scales to fit
 * the available screen space while maintainging aspect ratio.
 * Game physics is handled independently of screen size for consistency.
 */
class Render {
  static numBoards = 39;
  static laneFillColor = '#c49a6c';
  static gutterFillColor = '#555';
  static ballFillColor = '#4760ff';
  static pinFillColor = 'white';
  static pinHitFillColor = 'red';
  static pinStrokeColor = 'red';
  static pinStrokeWidth = 2;
  static scoreboardRollsId = '#rolls';
  static scoreboardTotalsId = '#totals';
  static laneLineColor = 'rgba(0,0,0,0.15)';
  static laneLineWidth = 1;

  constructor(title, scoreboard, canvas) {
    this.title = title;
    this.scoreboard = scoreboard;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.renderScale = 1;
  }

  getTopMargin(element) {
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop);
    return marginTop;
  }

  getBottomMargin(element) {
    const computedStyle = window.getComputedStyle(element);
    const marginBottom = parseFloat(computedStyle.marginBottom);
    return marginBottom;
  }

  getTotalHeight(element) {
    return element.offsetHeight + this.getTopMargin(element) + this.getBottomMargin(element);
  }

  // TODO(peter.xu) refactor this
  /**
   * initialize resizes the canvas to fit the available screen space and computes the 
   * renderScale, a ratio used to scale all game elements computed from the smallest
   * dimensional ratio of screen/game (i.e. screenWidth/laneWidth vs screenHeight/laneHeight).
   * 
   * The dimension with the smallest ratio scales directly to the maximum available 
   * screen dimension and the other dimension is scaled accordingly.
   * @param {*} laneWidth the intenral game lane width
   * @param {*} laneHeight the internal game lane height
   * @param {*} gutterWidth the internal game gutter width
   */
  initialize(laneWidth, laneHeight, gutterWidth) {
    // Need to know available canvas dimensions
    const availableCanvasWidth = window.innerWidth;
    const availableCanvasHeight = window.innerHeight - this.getTotalHeight(this.scoreboard) - this.getTotalHeight(this.title);

    // Scale the game to the smallest dimension
    // 1. Compute the width and height ratios
    const totalLaneWidth = laneWidth + 2 * gutterWidth;
    const widthRatio = availableCanvasWidth / totalLaneWidth;
    const heightRatio = availableCanvasHeight / laneHeight;

    if (widthRatio < heightRatio) {
      // 2. Set the renderScale to the smaller ratio
      this.renderScale = widthRatio;

      // 3. Set the canvas dimension to the smaller available dimension
      this.ctx.canvas.width = availableCanvasWidth;
      
      // 4. Scale canvas height based on aspect ratio of lane
      const numberOfWidthUnits = availableCanvasWidth / totalLaneWidth;
      this.ctx.canvas.height = (numberOfWidthUnits * laneHeight);      
    } else {
      // 2. Set the renderScale to the smaller ratio
      this.renderScale = heightRatio;

      // 3. Set the canvas dimension to the smaller available dimension
      this.ctx.canvas.height = availableCanvasHeight;

      // 4. Scale canvas width based on aspect ratio of lane
      const numberOfHeightUnits = availableCanvasHeight / laneHeight;
      this.ctx.canvas.width = (numberOfHeightUnits * (laneWidth + 2 * gutterWidth));
    }

    // Resize scoreboard to match canvas width
    this.scoreboard.style.width = `${this.ctx.canvas.width}px`;

    console.log(`Render initialization complete. 
    available canvas: ${availableCanvasWidth}x${availableCanvasHeight}, 
    scaled canvas: ${this.ctx.canvas.width}x${this.ctx.canvas.height}, 
    renderScale: ${this.renderScale},
    widthRatio: ${widthRatio}, 
    heightRatio: ${heightRatio}`);
  }

  drawLane(lane) {
    // Scale all lane dimensions by renderScale to maintain aspect ratio
    const laneWidth = lane.width * this.renderScale;
    const laneHeight = lane.height * this.renderScale;
    const laneGutterWidth = lane.gutterWidth * this.renderScale;
    const laneX = (this.ctx.canvas.width - laneWidth)/2;
    const laneY = 0;

    // lane
    this.ctx.fillStyle = Render.laneFillColor;
    this.ctx.fillRect(laneX, laneY, laneWidth, laneHeight);

    // lane boards
    const boardWidth = laneWidth / Render.numBoards;
    this.ctx.strokeStyle = Render.laneLineColor;
    this.ctx.lineWidth = Render.laneLineWidth;
    for (let i = 1; i < Render.numBoards; i++) {
      const x = laneX + i * boardWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, laneY);
      this.ctx.lineTo(x, laneY + laneHeight);
      this.ctx.stroke();
    }

    // gutters
    this.ctx.fillStyle = Render.gutterFillColor;
    this.ctx.fillRect(laneX - laneGutterWidth, laneY, laneGutterWidth, laneHeight);
    this.ctx.fillRect(laneX + laneWidth, laneY, laneGutterWidth, laneHeight);

    // arrows
    const arrowY = laneY + laneHeight * 0.6;
    const spacing = laneWidth / 8;
    this.ctx.fillStyle = 'black';

    for (let i = 1; i <= 7; i++) {
      const cy = arrowY + Math.abs(i - 4) * laneHeight * 0.03
      const cx = laneX + i * spacing;
      const size = 12 * this.renderScale;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx - size / 2, cy + size);
      this.ctx.lineTo(cx + size / 2, cy + size);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // approach dots
    const dotY = laneY + laneHeight * 0.85;
    const centerX = laneX + laneWidth / 2;
    const dotSpacing = laneWidth / 14;
    const dotRadius = 3 * this.renderScale;

    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      const cx = centerX + i * dotSpacing;
      this.ctx.beginPath();
      this.ctx.arc(cx, dotY, dotRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawBall(ball) {
    const ballX = ball.x * this.renderScale;
    const ballY = ball.y * this.renderScale;
    const ballR = ball.r * this.renderScale;

    this.ctx.fillStyle = Render.ballFillColor;
    this.ctx.beginPath();
    this.ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPins(pins) {
    pins.forEach(p => {
      if (!p.active) return;

      const pinX = p.x * this.renderScale;
      const pinY = p.y * this.renderScale;
      const pinR = p.r * this.renderScale;

      this.ctx.fillStyle = p.hit ? Render.pinHitFillColor : Render.pinFillColor;
      this.ctx.beginPath();
      this.ctx.arc(pinX, pinY, pinR, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = Render.pinStrokeColor;
      this.ctx.lineWidth = Render.pinStrokeWidth;
      this.ctx.stroke();
    });
  }

  updateScoreboard(frames) {
    const rollRow = this.scoreboard.querySelector(Render.scoreboardRollsId);
    const totalRow = this.scoreboard.querySelector(Render.scoreboardTotalsId);

    for (let i = 0; i < 10; i++) {
      const f = frames[i];
      if (f == null) continue;

      const baseIndex = i+1;
      
      if (i < 10) {
        const frameScoreText = (f.roll1 != null ? f.roll1 : '') + ' ' + (f.roll2 != null ? f.roll2 : '');
        rollRow.cells[baseIndex].textContent = frameScoreText;
        totalRow.cells[baseIndex].textContent = f.cumulative || '';
      } else {
        rollRow.cells[baseIndex].textContent = (f.roll1 != null ? f.roll1 : '') + ' ' + (f.roll2 != null ? f.roll2 : '') + (f.roll3 != null ? f.roll3 : '')
        totalRow.cells[baseIndex].textContent = f.cumulative || '';
      }
    }
  }

  setupMouseMoveListener(game) {
    this.canvas.addEventListener('mousemove', e => {
      // reverse scaled based on canvas position
      const rect = this.canvas.getBoundingClientRect();
      game.mouseX = (e.clientX - rect.left) / this.renderScale;
    });
  }

  setupMouseClickListener(callback) {
    this.canvas.addEventListener('click', () => {
      callback();
    });
  }

  draw(ball, pins, lane, frames) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLane(lane);
    this.drawPins(pins);
    this.drawBall(ball);
    this.updateScoreboard(frames);
  }
}

export { Game, Engine, Render };