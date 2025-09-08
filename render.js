import { GameStates, RenderStates, GameStateToRenderState } from './constants.js';

/**
 * Render handles all drawing and UI scaling. The game automatically scales to fit
 * the available screen space while maintainging aspect ratio.
 * Game physics is handled independently of screen size for consistency.
 */
export class Render {
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

    this.ctx.canvas.style.width = this.ctx.canvas.width * 3;
    this.ctx.canvas.style.height = this.ctx.canvas.height * 3;

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
      
      if (i < 9) {
        const frameScoreText = (f.roll1 != null ? f.roll1 : '') + ' ' + (f.roll2 != null ? f.roll2 : '');
        rollRow.cells[baseIndex].textContent = frameScoreText;
        totalRow.cells[baseIndex].textContent = f.cumulative || '';
      } else {
        rollRow.cells[baseIndex].textContent = (f.roll1 != null ? f.roll1 : '') + ' ' + (f.roll2 != null ? f.roll2 : '') + ' ' + (f.roll3 != null ? f.roll3 : '')
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

  writeGameNotStartedText() {
    const gameNotStartedTitle = "30th Anniversary Edition";
    const gameNotStartedSubtitle = "Drag ball left and right to aim";
    const gameNotStartedSecondSubtitle = "Tap to return ball";

    this.ctx.textAlign = 'center';

    const defaultTitleFontSize = 27;
    const defaultSubtitleFontSize = 18;

    const adjustedTitleFontSize = defaultTitleFontSize * this.renderScale;
    const adjustedSubtitleFontSize = defaultSubtitleFontSize * this.renderScale;

    this.ctx.font = `bold ${adjustedTitleFontSize}px Arial`;
    const textX = (this.ctx.canvas.width)/2;
    const textY = this.ctx.canvas.height/2.5;
    this.ctx.fillText(gameNotStartedTitle, textX, textY); 

    const textMetrics = this.ctx.measureText(gameNotStartedSubtitle);
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    this.ctx.font = `bold ${adjustedSubtitleFontSize}px Arial`;
    const subtextY = textY + textHeight * 1.7;
    this.ctx.fillText(gameNotStartedSubtitle, textX, subtextY); 

    this.ctx.font = `bold ${adjustedSubtitleFontSize}px Arial`;
    const subtext2Y = textY + textHeight * 3.4;
    this.ctx.fillText(gameNotStartedSecondSubtitle, textX, subtext2Y); 
  }

  static gameOverTitle = "NICE GAME";
  static gameOverSubtitle = "Tap to start new game";
  writeGameOverText() {
    this.ctx.textAlign = 'center';

    const defaultTitleFontSize = 49;
    const defaultSubtitleFontSize = 18;

    const adjustedTitleFontSize = defaultTitleFontSize * this.renderScale;
    const adjustedSubtitleFontSize = defaultSubtitleFontSize * this.renderScale;

    this.ctx.font = `bold ${adjustedTitleFontSize}px Arial`;    
    const textX = (this.ctx.canvas.width)/2;
    const textY = this.ctx.canvas.height/2.5;
    this.ctx.fillText(Render.gameOverTitle, textX, textY); 

    const textMetrics = this.ctx.measureText(Render.gameOverSubtitle);
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    this.ctx.font = `bold ${adjustedSubtitleFontSize}px Arial`;
    const subtextY = textY + textHeight;
    this.ctx.fillText(Render.gameOverSubtitle, textX, subtextY); 
  }

  writeTextForGameState(gameState) {
    switch (GameStateToRenderState[gameState]) {
      case RenderStates.NOT_STARTED:
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
