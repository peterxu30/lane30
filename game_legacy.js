// 9/1/2025 TODO 
// - flip orientation of pins - DONE
// - fix window sizing issue (need to fit everything to screen) - DONE
// - allow ball to move left right before release, do not let ball be controlled post release
// - need way of ending/starting new game after tenth frame
// - need to test scoreboard on closed tenth frame
// - need a flashy title graphic - "Lane 30 by PKING"
// - about section with blurb + "Vibe coded by ChatGPT, fixed by PKING."
// - hook mode - where you can control the ball as it moves
// - auto reset the ball after it leaves the lane instead of requiring user to click
// - clean up code: create a Game object that contains all the elements plus metadat (e.g. initialized)


// Create three classes: Game, Engine, Render

// Game contains all game objects and computes game logic
//   - contains lane, pins, ball, frames
// Engine takes in lane, pins, ball objects and handles physics
// Game handles scoring
// Render takes in lane, pins, ball objects and handles drawing

// Game - owns all game objects, handles scoring logic, resetting between frames, initialization
//   - Engine - handles physics, updating pin hit status, ball movement status
//     - takes in lane, pins, ball objects and updates their positions
//     - update and resolveCollisions
// Render.render(Game)
//  - draw lanes
//  - draw pins
//  - draw ball
//  - update scoreboard

(() => {
  // Render objects
  const canvas = document.getElementById('lane');
  const ctx = canvas.getContext('2d');
  const scoreboard = document.getElementById('scoreboard_div');
  const title = document.getElementById('title');

  // Game objects
  const ballSpeed = -7.7;
  let initialized = false;
  let pins = null;
  let frames = Array(10).fill(null).map(() => ({
    roll1: null,
    roll2: null,
    total: 0,
    cumulative: 0
  }));
  let currentFrame = 0;
  let rollInFrame = 0;
  const lane = {
    x: 0,
    y: 0,
    width: 360,
    height: 705,
    gutter: 40
  };
  const ball = {
    x: lane.x + lane.width / 2,
    y: lane.y + lane.height - 60,
    startingX: lane.x + lane.width / 2,
    startingY: lane.y + lane.height - 60,
    r: 25,
    vx: 0,
    vy: ballSpeed,
    mass: 5,
    rolling: false
  };

  // Game methods
  // Pins
  function buildPins() {
    const rows = 4;
    const spaceX = 90;
    const spaceY = 50;
    const baseY = lane.y - 20;
    const centerX = lane.x + lane.width / 2;
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
          hit: false   // NEW: track if pin has been hit
        });
      }
    }
    return pins;
  }
  // Reset
  function resetGame() {
    console.log("resetGame called")
    pins = buildPins();
    resetBall();
    console.log(ball.x + ' ' + ball.y + ' ' + lane.y)
  }
  // document.getElementById('reset').addEventListener('click', resetGame);
  function resetBall() {
    ball.x = ball.startingX;
    ball.y = ball.startingY;
    ball.vx = 0;
    ball.vy = ballSpeed;
    ball.rolling = false; // wait for next click
  }
  // TODO(peter.xu) HACK NEED TO FIX
  function isStrike() {
    const pinsHit = pins.filter(p => p.hit && !p.scored).length;
    return pinsHit === 10 && rollInFrame === 0
  }
  function clearHitPins() {
    pins.forEach(p => { if (p.hit) p.active = false; });
  }
  function handleRoll() {
    const pinsHit = pins.filter(p => p.hit && !p.scored).length;
    pins.forEach(p => { (p.hit) ? p.scored = true : p.scored = false; });

    const frame = frames[currentFrame];

    console.log("currentFrame: " + currentFrame);
    console.log("rollInFrame: " + rollInFrame);
    // console.log("pinsHit: " + pinsHit)

    // 10th frame special logic
    if (currentFrame === 9) {
      if (rollInFrame === 0) {
        frame.roll1 = pinsHit === 10 ? 'X' : pinsHit;
        rollInFrame = 1;
      } else if (rollInFrame === 1) {
        if (frame.roll1 !== 'X' && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = '/';
        } else {
          frame.roll2 = pinsHit === 10 ? 'X' : pinsHit;
        }

        if (frame.roll1 === 'X' || frame.roll2 === '/') {
          rollInFrame = 2; // allow 3rd roll
        } else {
          currentFrame++;
          rollInFrame = 0;
        }
      } else if (rollInFrame === 2) {
        frame.roll3 = pinsHit === 10 ? 'X' : pinsHit;
        currentFrame++;
        rollInFrame = 0;
      }
    } else {
      // Frames 1-9
      if (rollInFrame === 0) {
        frame.roll1 = pinsHit === 10 ? 'X' : pinsHit;
        if (pinsHit === 10) { // strike
          frame.roll2 = '';
          currentFrame++;
        } else {
          rollInFrame = 1;
        } 
      } else {
        if (frame.roll1 !== 'X' && (frame.roll1 + pinsHit === 10)) {
          frame.roll2 = '/';
        } else {
          frame.roll2 = pinsHit;
        }
        currentFrame++;
        rollInFrame = 0;
      }
    }

    calculateCumulative();
    updateScoreboard();
  }
  function calculateCumulative() {
    let cumulative = 0;
    for (let i = 0; i < 10; i++) {
      const f = frames[i];
      if (f.roll1 == null) break;

      let frameScore = 0;

      if (i < 9) {
        if (f.roll1 === 'X') { // strike
          frameScore = 10 + strikeBonus(i);
        } else if (f.roll2 === '/') { // spare
          frameScore = 10 + spareBonus(i);
        } else {
          frameScore = (f.roll1 || 0) + (f.roll2 || 0);
        }
      } else { // 10th frame
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
  function strikeBonus(frameIndex) {
    const nextFrame = frames[frameIndex + 1];
    if (!nextFrame) return 0;
    let bonus = 0;
    if (nextFrame.roll1 === 'X') {
      bonus += 10;
      const nextNext = frames[frameIndex + 2];
      bonus += nextNext ? (nextNext.roll1 === 'X' ? 10 : nextNext.roll1 || 0) : 0;
    } else {
      bonus += (nextFrame.roll1 || 0) + (nextFrame.roll2 === '/' ? (10 - nextFrame.roll1) : nextFrame.roll2 || 0);
    }
    return bonus;
  }
  function spareBonus(frameIndex) {
    const nextFrame = frames[frameIndex + 1];
    if (!nextFrame) return 0;
    return nextFrame.roll1 === 'X' ? 10 : nextFrame.roll1 || 0;
  }
  // Loop
  function tick() {
    initialize();
    update();
    // updateGameState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLane();
    drawPins();
    drawBall();
    requestAnimationFrame(tick); // recursive call
  }

  // Game input
  let mouseX = null;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  });
  canvas.addEventListener('click', () => {
    if (!ball.rolling) {
      ball.rolling = true; // start moving
    } else if (ball.y < lane.y) {
      previousRollInFrame = rollInFrame;
      previousFrameIsStrike = isStrike();
      
      if (previousFrameIsStrike) {
        console.log("IS STRIKE");
      }
      
      handleRoll();
      if (previousRollInFrame == 0 && !previousFrameIsStrike) {
        clearHitPins();
        resetBall();
      } else {
        resetGame();
      }
    }
  });

  // Engine methods
  // Collision
  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const overlap = a.r + b.r - dist;
    if (overlap > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      // separate
      a.x -= nx * overlap / 2;
      a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2;
      b.y += ny * overlap / 2;
      // relative velocity
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

      // mark pin as hit (if b is a pin)
      if ("hit" in b) {
        b.hit = true;
      }
      if ("hit" in a) {
        a.hit = true;
      }
    }
  }
  // Physics
  function update() {
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
      if (p.active) resolveCollision(ball, p);
    });

    // Pin–pin collisions
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        if (pins[i].active && pins[j].active) {
          resolveCollision(pins[i], pins[j]);
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

  // Render methods
  function getTopMargin(element) {
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop);
    return marginTop;
  }
  function getBottomMargin(element) {
    const computedStyle = window.getComputedStyle(element);
    const marginBottom = parseFloat(computedStyle.marginBottom);
    return marginBottom;
  }
  function getTotalHeight(element) {
    return element.offsetHeight + getTopMargin(element) + getBottomMargin(element);
  }
  // Draw
  function initialize() {
    if (!initialized) {
      console.log("window " + window.innerWidth + ' ' + window.innerHeight);
      console.log("canvas " + canvas.width + ' ' + canvas.height);

      if (window.innerWidth < 440) {
        ctx.canvas.width  = window.innerWidth;
      } else {
        ctx.canvas.width  = 440;
      }

      titleScoreboardHeight = getTotalHeight(scoreboard) + getTotalHeight(title);
      ctx.canvas.height = window.innerHeight - titleScoreboardHeight;
      if (ctx.canvas.height > 840) {
        ctx.canvas.height = 840;
      }

      lane.x = (ctx.canvas.width - lane.width)/2;
      lane.height = ctx.canvas.height;
      ball.startingX = lane.x + lane.width / 2;
      ball.startingY = lane.y + lane.height - 60;
      resetBall();
      pins = buildPins();
      initialized = true;
    }
  }
  function drawLane() {
    // wood
    ctx.fillStyle = '#c49a6c';
    ctx.fillRect(lane.x, lane.y, lane.width, lane.height);

    // gutters
    ctx.fillStyle = '#555';
    ctx.fillRect(lane.x - lane.gutter, lane.y, lane.gutter, lane.height);
    ctx.fillRect(lane.x + lane.width, lane.y, lane.gutter, lane.height);

    // boards (39 total → 38 lines)
    const boardWidth = lane.width / 39;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; // faint gray
    ctx.lineWidth = 1;
    for (let i = 1; i < 39; i++) {
      const x = lane.x + i * boardWidth;
      ctx.beginPath();
      ctx.moveTo(x, lane.y);
      ctx.lineTo(x, lane.y + lane.height);
      ctx.stroke();
    }

    // arrows (7 arrows, evenly spaced)
    const arrowY = lane.y + lane.height * 0.6;
    const spacing = lane.width / 8; // leaves equal margins
    ctx.fillStyle = 'black';

    for (let i = 1; i <= 7; i++) {
      const cy = arrowY + Math.abs(i - 4) * lane.height * 0.03
      const cx = lane.x + i * spacing; // center of arrow
      const size = 12; // arrow length
      ctx.beginPath();
      ctx.moveTo(cx, cy);             // tip
      ctx.lineTo(cx - size / 2, cy + size); // left base
      ctx.lineTo(cx + size / 2, cy + size); // right base
      ctx.closePath();
      ctx.fill();
    }

    // approach dots (5 left, 5 right of centerline)
    const dotY = lane.y + lane.height * 0.85; // closer to foul line
    const centerX = lane.x + lane.width / 2;
    const dotSpacing = lane.width / 14; // spread evenly left/right
    const dotRadius = 3;

    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue; // skip exact center
      const cx = centerX + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(cx, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawBall() {
    ctx.fillStyle = '#4760ff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawPins() {
    pins.forEach(p => {
      if (!p.active) return;
      ctx.fillStyle = p.hit ? 'red' : 'white'; // turn red after hit
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }
  function updateScoreboard() {
    const rollRow = document.getElementById('rolls');
    const totalRow = document.getElementById('totals');

    console.log(frames[0])

    for (let i = 0; i < 10; i++) {
      const f = frames[i];
      if (f == null) {
        console.log("updateScoreboard frame is null: " + i)
        continue;
      }

      const baseIndex = i+1;
      
      if (i < 10) {
        frameScoreText = (f.roll1 != null ? f.roll1 : '') + ' ' + (f.roll2 != null ? f.roll2 : '');
        rollRow.cells[baseIndex].textContent = frameScoreText;
        totalRow.cells[baseIndex].textContent = f.cumulative || '';
      } else {
        // 10th frame has 3 rolls
        rollRow.cells[baseIndex].textContent = (f.roll1 != null ? f.roll1 : '') + ' ' + (f.roll2 != null ? f.roll2 : '') + (f.roll3 != null ? f.roll3 : '')
        totalRow.cells[baseIndex].textContent = f.cumulative || '';
      }
    }
  }

  tick();
})();
