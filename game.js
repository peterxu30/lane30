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
  static laneWidth = 360; // 2:1 length to width ratio
  static laneHeight = 720; //705;
  static gutterWidth = 40; // 1/9th of lane width

  // Ball constants
  static ballSpeed = -7.9;
  static ballRadius = 25; // 1:14th of lane width, 1:28th of lane height
  static ballMass = 5;

  // Pin constants
  static pinRadius = 14.4; // 1:25th of lane width, 1:50th of lane height
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
      gutter: Game.gutterWidth,
    };

    this.ball = {
      x: this.lane.x + this.lane.width / 2, // start in middle of lane horizontally
      y: this.lane.y + this.lane.height - 60, // start at beginning of lane vertically
      startingX: this.lane.x + this.lane.width / 2, // reset X position
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

  // Game methods
  buildPins() {
    const baseY = this.lane.y - 20;
    const centerX = this.lane.x + this.lane.width / 2;
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

  setupControls() {
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
    });

    this.canvas.addEventListener('click', () => {
      if (!this.ball.rolling) {
        // TODO(peter.xu) Clean this up
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
    });
  }

  run() {
    this.render.initialize(this);
    
    this.setupControls();

    self = this;
    function runHelper() {
      self.engine.update(self.ball, self.pins, self.lane);
      self.render.draw(self, self.ball, self.pins, self.lane);
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
        p.x < lane.x - lane.gutter ||
        p.x > lane.x + lane.width + lane.gutter ||
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
  initialize(game) { // game should not be passed in at all, lane, ball, pins should be passed in
    if (!game.initialized) {
      // if (window.innerWidth < 440) { // we need this to adjust the width of the scoreboard
      //   this.ctx.canvas.width  = window.innerWidth;
      // } else {
      //   this.ctx.canvas.width  = 440;
      // }

      // const titleScoreboardHeight = this.getTotalHeight(this.scoreboard) + this.getTotalHeight(this.title);
      // this.ctx.canvas.height = window.innerHeight - titleScoreboardHeight;
      // if (this.ctx.canvas.height > 840) {
      //   this.ctx.canvas.height = 840;
      // }

      // Need to know available canvas dimensions
      const availableCanvasWidth = window.innerWidth;
      const availableCanvasHeight = window.innerHeight - this.getTotalHeight(this.scoreboard) - this.getTotalHeight(this.title);

      // Scale the game to the smallest dimension
      // Understand the scaling ratio and apply it to both width and height of all game elements
      // 1. Identify which dimension is smaller and calculate scaling ratio of lane's internal dimension to available dimension
      this.renderScale = Math.min(
        availableCanvasWidth / (game.lane.width + 2 * game.lane.gutter),
        availableCanvasHeight / game.lane.height
      );

      // 2. Set canvas width and height based on scaling ratio
      this.ctx.canvas.width = (game.lane.width + 2 * game.lane.gutter) * this.renderScale;
      this.ctx.canvas.height = game.lane.height * this.renderScale;

      // 2. Apply scaling ratio to both width and height of all game elements - this happens in draw methods


      // Identify Lane X and Height in context of Canvas
      // X = (canvas width - (lane width + 2 * gutterWidth) * scaling ratio) / 2
      // Height = lane height * scaling ratio

      // Compute lane size
      // Lane Width = lane width * scaling ratio
      // Lane Gutter Width = gutter width * scaling ratio
      // Lane Height = lane height * scaling ratio

      // Identify Ball Starting X and Y in context of Canvas - can just multiply existing ball x and y by scaling ratio?
      // Ball Starting X = ball starting x * scaling ratio
      // Ball Starting Y = ball starting y * scaling ratio

      // Compute Ball Radius
      // Ball Radius = ball radius * scaling ratio

      // Identify Pin X and Y in context of Canvas - can just multiply existing pin x and y by scaling ratio?
      // Pin X = pin x * scaling ratio
      // Pin Y = pin y * scaling ratio

      // Compute Pin Radius
      // Pin Radius = pin radius * scaling ratio

      game.lane.x = (this.ctx.canvas.width - game.lane.width)/2; // center lane horizontally
      game.lane.height = this.ctx.canvas.height; // use full canvas height - this is incorrect because it stretches the lane based on screen size
      game.ball.startingX = game.lane.x + game.lane.width / 2; // render logic, do not change the actual game ball
      game.ball.startingY = game.lane.y + game.lane.height - 60; // render logic, do not change the actual game ball
      game.resetBall(); // should only redraw ball, not modify ball object itself
      game.pins = game.buildPins(); // should only redraw pins, not modify pin objects themselves
      game.initialized = true;
    }
  }

  drawLane(lane) {
    // lane
    this.ctx.fillStyle = Render.laneFillColor;
    this.ctx.fillRect(lane.x, lane.y, lane.width, lane.height);

    // lane boards
    const boardWidth = lane.width / Render.numBoards;
    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    this.ctx.lineWidth = 1;
    for (let i = 1; i < Render.numBoards; i++) {
      const x = lane.x + i * boardWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, lane.y);
      this.ctx.lineTo(x, lane.y + lane.height);
      this.ctx.stroke();
    }

    // gutters
    this.ctx.fillStyle = Render.gutterFillColor;
    this.ctx.fillRect(lane.x - lane.gutter, lane.y, lane.gutter, lane.height);
    this.ctx.fillRect(lane.x + lane.width, lane.y, lane.gutter, lane.height);

    // arrows
    const arrowY = lane.y + lane.height * 0.6;
    const spacing = lane.width / 8;
    this.ctx.fillStyle = 'black';

    for (let i = 1; i <= 7; i++) {
      const cy = arrowY + Math.abs(i - 4) * lane.height * 0.03
      const cx = lane.x + i * spacing;
      const size = 12;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx - size / 2, cy + size);
      this.ctx.lineTo(cx + size / 2, cy + size);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // approach dots
    const dotY = lane.y + lane.height * 0.85;
    const centerX = lane.x + lane.width / 2;
    const dotSpacing = lane.width / 14;
    const dotRadius = 3;

    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      const cx = centerX + i * dotSpacing;
      this.ctx.beginPath();
      this.ctx.arc(cx, dotY, dotRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawBall(ball) {
    this.ctx.fillStyle = Render.ballFillColor;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPins(pins) {
    pins.forEach(p => {
      if (!p.active) return;
      this.ctx.fillStyle = p.hit ? Render.pinHitFillColor : Render.pinFillColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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

  draw(game, ball, pins, lane) {
    this.initialize(game);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLane(lane);
    this.drawPins(pins);
    this.drawBall(ball);
    this.updateScoreboard(game.frames);
  }
}

export { Game, Engine, Render };