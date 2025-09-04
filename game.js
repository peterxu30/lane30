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

// P1
// - hook mode - where you can control the ball as it moves
// - auto reset the ball after it leaves the lane instead of requiring user to click


class Game {
  static ballSpeed = -7.7;
  static ballRadius = 25;

  constructor() {
    // HTML Components
    this.canvas = document.getElementById('lane');

    // Core components
    this.engine = new Engine();
    this.render = new Render();

    // Game objects
    this.initialized = false;
    this.pins = null;

    this.frames = Array(10).fill(null).map(() => ({
      roll1: null,
      roll2: null,
      total: 0,
      cumulative: 0
    }));

    this.currentFrame = 0;
    this.rollInFrame = 0;

    this.lane = {
      x: 0,
      y: 0,
      width: 360,
      height: 705,
      gutter: 40
    };

    this.ball = {
      x: this.lane.x + this.lane.width / 2,
      y: this.lane.y + this.lane.height - 60,
      startingX: this.lane.x + this.lane.width / 2,
      startingY: this.lane.y + this.lane.height - 60,
      r: Game.ballRadius,
      vx: 0,
      vy: Game.ballSpeed,
      mass: 5,
      rolling: false
    };
    this.mouseX = null;
  }

  // Game methods
  buildPins() {
    const rows = 4;
    const spaceX = 90;
    const spaceY = 50;
    const baseY = this.lane.y - 20;
    const centerX = this.lane.x + this.lane.width / 2;
    const pins = [];
    let id = 0;
    for (let r = 0; r < rows; r++) {
      const cols = r + 1;
      const rowWidth = (cols - 1) * spaceX;
      for (let c = 0; c < cols; c++) {
        const x = centerX - rowWidth / 2 + c * spaceX;
        const y = baseY + (rows - r) * spaceY;
        pins.push({
          id: ++id,
          x, y,
          r: 14.5,
          vx: 0, vy: 0,
          mass: 2,
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
      self.engine.update(self.mouseX, self.ball, self.pins, self.lane);
      self.render.draw(self, self.ball, self.pins, self.lane);
      window.requestAnimationFrame(runHelper); // recursive call
    }
    window.requestAnimationFrame(runHelper);
  }
}

class Engine {
  // Engine methods
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

  update(mouseX, ball, pins, lane) {
    // Ball movement
    if (ball.rolling) {
      if (mouseX != null) {
        const minX = lane.x + ball.r;
        const maxX = lane.x + lane.width - ball.r;
        const targetX = Math.max(minX, Math.min(maxX, mouseX));
        ball.x += (targetX - ball.x) * 0.18;
      }
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

    // Move pins
    pins.forEach(p => {
      if (!p.active) return;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;

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
}

class Render {
  constructor() {
    // Render objects
    this.canvas = document.getElementById('lane');
    this.ctx = this.canvas.getContext('2d');
    this.scoreboard = document.getElementById('scoreboard_div');
    this.title = document.getElementById('title');
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

  initialize(game) {
    if (!game.initialized) {
      if (window.innerWidth < 440) {
        this.ctx.canvas.width  = window.innerWidth;
      } else {
        this.ctx.canvas.width  = 440;
      }

      const titleScoreboardHeight = this.getTotalHeight(this.scoreboard) + this.getTotalHeight(this.title);
      this.ctx.canvas.height = window.innerHeight - titleScoreboardHeight;
      if (this.ctx.canvas.height > 840) {
        this.ctx.canvas.height = 840;
      }

      game.lane.x = (this.ctx.canvas.width - game.lane.width)/2;
      game.lane.height = this.ctx.canvas.height;
      game.ball.startingX = game.lane.x + game.lane.width / 2;
      game.ball.startingY = game.lane.y + game.lane.height - 60;
      game.resetBall();
      game.pins = game.buildPins();
      game.initialized = true;
    }
  }

  drawLane(lane) {
    // wood
    this.ctx.fillStyle = '#c49a6c';
    this.ctx.fillRect(lane.x, lane.y, lane.width, lane.height);

    // gutters
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(lane.x - lane.gutter, lane.y, lane.gutter, lane.height);
    this.ctx.fillRect(lane.x + lane.width, lane.y, lane.gutter, lane.height);

    const boardWidth = lane.width / 39;
    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    this.ctx.lineWidth = 1;
    for (let i = 1; i < 39; i++) {
      const x = lane.x + i * boardWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, lane.y);
      this.ctx.lineTo(x, lane.y + lane.height);
      this.ctx.stroke();
    }

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
    this.ctx.fillStyle = '#4760ff';
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPins(pins) {
    pins.forEach(p => {
      if (!p.active) return;
      this.ctx.fillStyle = p.hit ? 'red' : 'white';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = 'red';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });
  }

  updateScoreboard(frames) {
    const rollRow = document.getElementById('rolls');
    const totalRow = document.getElementById('totals');

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