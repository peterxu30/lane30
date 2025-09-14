import { GameStates } from './constants.js';
import * as util from './util.js';

/**
 * RenderStates represents the possible states of the render.
 */
const RenderStates = Object.freeze({
  INITIALIZED: Symbol("initialized"),
  RUNNING: Symbol("running"),
  OVER: Symbol("over")
});

/**
 * GameStateToRenderState maps the game state to the render state.
 */
const gameStateToRenderState = {
  [GameStates.INITIALIZED]: RenderStates.INITIALIZED,
  [GameStates.RUNNING]: RenderStates.RUNNING, // unused
  [GameStates.OVER]: RenderStates.OVER
  // [GameStates.RESTART]: RenderStates.OVER
};

// Scoreboard HTML elements
const scoreboardRollsId = '#rolls';
const scoreboardTotalsId = '#totals';

// Lane rendering
const numBoards = 39;
const laneFillColor = '#c49a6c';
const gutterFillColor = '#555';
const laneLineColor = 'rgba(0,0,0,0.15)';
const laneLineWidth = 1;

// Ball rendering
const ballFillColor = '#4760ff';

// Pin rendering
const pinFillColor = 'white';
const pinHitFillColor = 'red';
const pinStrokeColor = 'red';
const pinStrokeWidth = 3;

// Copy
const gameOverTitle = "NICE GAME";
const gameOverSubtitle = "Tap to start new game";
const gameNotStartedTitle = "PKING 30th Anniversary Edition";
const gameNotStartedSubtitle = "Drag ball left and right to aim";
const gameNotStartedSecondSubtitle = "Tap to return ball";
const scoreboardStrike = 'X';
const scoreboardSpare = '/';

// Copy font sizes
const gameNotStartedTitleFontSize = 21.7;
const gameNotStartedSubtitleFontSize = 18;
const gameOverTitleFontSize = 49;
const gameOverSubtitleFontSize = 18;

// Copy font style and type
const fontStyle = "bold";
const fontType = "Arial";

/**
 * Render handles all drawing and UI scaling. The game automatically scales to fit
 * the available screen space while maintainging aspect ratio.
 * Game physics is handled independently of screen size for consistency.
 */
export class Render {
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
      this.canvas.width = availableCanvasWidth;
      
      // 4. Scale canvas height based on aspect ratio of lane
      const numberOfWidthUnits = availableCanvasWidth / totalLaneWidth;
      this.canvas.height = (numberOfWidthUnits * laneHeight);
    } else {
      // 2. Set the renderScale to the smaller ratio
      this.renderScale = heightRatio;

      // 3. Set the canvas dimension to the smaller available dimension
      this.canvas.height = availableCanvasHeight;

      // 4. Scale canvas width based on aspect ratio of lane
      const numberOfHeightUnits = availableCanvasHeight / laneHeight;
      this.canvas.width = (numberOfHeightUnits * (laneWidth + 2 * gutterWidth));
    }

    // scale the canvas to native PPI
    this.scalePPI(this.canvas, window.devicePixelRatio);

    // Resize scoreboard to match canvas width
    this.scoreboard.style.width = `${this.canvas.style.width}px`;

    console.log(`Render initialization complete. 
    available canvas: ${availableCanvasWidth}x${availableCanvasHeight}, 
    scaled canvas: ${this.canvas.width}x${this.canvas.height}, 
    renderScale: ${this.renderScale},
    widthRatio: ${widthRatio}, 
    heightRatio: ${heightRatio},
    devicePixelRatio: ${window.devicePixelRatio}`);
  }

  /**
   * scalePPI upscales or downscales the canvas to match the native PPI of the device.
   * The HTML Canvas assumes a default PPI of 96, which results in blurry visuals on
   * high PPI devices such as mobile phones.
   * 
   * The Canvas has two sizes, one of the drawing surface (canvas.width, canvas.height)
   * and the displayed size on the screen (canvas.style.width, canvas.style.height).
   * When these sizes are the same, the canvas is natively 96 PPI. In order to increase the PPI,
   * the canvas drawing surface size must be increased while keeping the canvas display size the same.
   * 
   * This fits "more canvas" into the same dimensions.
   */
  scalePPI(canvas, scaleFactor) {
    console.log(`setting PPI with scaleFactor ${scaleFactor}`);

    // Set up CSS size.
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    // Get size information.
    var width = parseFloat(canvas.style.width);
    var height = parseFloat(canvas.style.height);

    // Resize the canvas.
    canvas.width = Math.ceil(width * scaleFactor);
    canvas.height = Math.ceil(height * scaleFactor);

    // Redraw the canvas image and scale future draws.
    var ctx = canvas.getContext('2d');
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
  }

  drawLane(lane) {
    // Scale all lane dimensions by renderScale to maintain aspect ratio
    const laneWidth = lane.width * this.renderScale;
    const laneHeight = lane.height * this.renderScale;
    const laneGutterWidth = lane.gutterWidth * this.renderScale;
    const laneX = (parseInt(this.canvas.style.width, 10) - laneWidth)/2;
    const laneY = 0;

    // lane
    this.ctx.fillStyle = laneFillColor;
    this.ctx.fillRect(laneX, laneY, laneWidth, laneHeight);

    // lane boards
    const boardWidth = laneWidth / numBoards;
    this.ctx.strokeStyle = laneLineColor;
    this.ctx.lineWidth = laneLineWidth;
    for (let i = 1; i < numBoards; i++) {
      const x = laneX + i * boardWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, laneY);
      this.ctx.lineTo(x, laneY + laneHeight);
      this.ctx.stroke();
    }

    // gutters
    this.ctx.fillStyle = gutterFillColor;
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

    this.ctx.fillStyle = ballFillColor;
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

      this.ctx.fillStyle = p.hit ? pinHitFillColor : pinFillColor;
      this.ctx.beginPath();
      this.ctx.arc(pinX, pinY, pinR, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = pinStrokeColor;
      this.ctx.lineWidth = pinStrokeWidth;
      this.ctx.stroke();
    });
  }

  updateScoreboard(frames) {
    const rollRow = this.scoreboard.querySelector(scoreboardRollsId);
    const totalRow = this.scoreboard.querySelector(scoreboardTotalsId);
    
    for (let i = 0; i < 10; i++) {
      const f = frames[i];
      if (f == null) continue;

      const baseIndex = i+1;
      
      if (i < 9) {
        let roll1Val = f.roll1 != null ? f.roll1 : '';
        let roll2Val = f.roll2 != null ? f.roll2 : '';
        if (util.frameIsStrike(f)) {
          roll1Val = scoreboardStrike;
        } else if (util.frameIsSpare(f)) {
          roll2Val = scoreboardSpare;
        }

        rollRow.cells[baseIndex].textContent = roll1Val + ' ' + roll2Val;
        totalRow.cells[baseIndex].textContent = f.cumulative || '';
      } else {
        let roll1Val = f.roll1 != null ? f.roll1 : '';
        let roll2Val = f.roll2 != null ? f.roll2 : '';
        let roll3Val = f.roll3 != null ? f.roll3 : '';

        if (util.frameTenFirstRollIsStrike(f)) {
          roll1Val = scoreboardStrike;
        }

        if (util.frameTenSecondRollIsStrike(f)) {
          roll2Val = scoreboardStrike;
        } else if (util.frameTenSecondRollIsSpare(f)) {
          roll2Val = scoreboardSpare;
        }

        if (util.frameTenThirdRollIsStrike(f)) {
          roll3Val = scoreboardStrike;
        }

        rollRow.cells[baseIndex].textContent = roll1Val + ' ' + roll2Val + ' ' + roll3Val;
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

  #getCanvasWidth() {
    return parseInt(this.canvas.style.width, 10);
  }

  #getCanvasHeight() {
    return parseInt(this.canvas.style.height, 10);
  }

  writeGameNotStartedText() {
    this.ctx.textAlign = 'center';

    const adjustedTitleFontSize = gameNotStartedTitleFontSize * this.renderScale;
    const adjustedSubtitleFontSize = gameNotStartedSubtitleFontSize * this.renderScale;

    this.ctx.font = `${fontStyle} ${adjustedTitleFontSize}px ${fontType}`;
    const textX = this.#getCanvasWidth() / 2;
    const textY = this.#getCanvasHeight() / 2.5;
    this.ctx.fillText(gameNotStartedTitle, textX, textY); 

    const textMetrics = this.ctx.measureText(gameNotStartedSubtitle);
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    this.ctx.font = `${fontStyle} ${adjustedSubtitleFontSize}px ${fontType}`;
    const subtextY = textY + textHeight * 1.7;
    this.ctx.fillText(gameNotStartedSubtitle, textX, subtextY); 

    this.ctx.font = `${fontStyle} ${adjustedSubtitleFontSize}px ${fontType}`;
    const subtext2Y = textY + textHeight * 3.4;
    this.ctx.fillText(gameNotStartedSecondSubtitle, textX, subtext2Y); 
  }

  writeGameOverText() {
    this.ctx.textAlign = 'center';

    const adjustedTitleFontSize = gameOverTitleFontSize * this.renderScale;
    const adjustedSubtitleFontSize = gameOverSubtitleFontSize * this.renderScale;

    this.ctx.font = `${fontStyle} ${adjustedTitleFontSize}px ${fontType}`;    
    const textX = this.#getCanvasWidth() / 2;
    const textY = this.#getCanvasHeight() / 2.5;
    this.ctx.fillText(gameOverTitle, textX, textY); 

    const textMetrics = this.ctx.measureText(gameOverSubtitle);
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    this.ctx.font = `${fontStyle} ${adjustedSubtitleFontSize}px ${fontType}`;
    const subtextY = textY + textHeight;
    this.ctx.fillText(gameOverSubtitle, textX, subtextY); 
  }

  writeTextForGameState(gameState) {
    switch (gameStateToRenderState[gameState]) {
      case RenderStates.INITIALIZED:
        this.writeGameNotStartedText();
        break;
      case RenderStates.OVER:
        this.writeGameOverText();
        break;
    }
  }
  
  draw(ball, pins, lane, frames, gameState) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLane(lane);
    this.drawPins(pins);
    this.drawBall(ball);
    this.updateScoreboard(frames);
    this.writeTextForGameState(gameState);
  }
}
