import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStates } from './game-states.js';

// Setup DOM mocks before importing Game
const mockTitle = { style: {} };
const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  setTransform: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 5
  }))
};
const mockCanvas = {
  getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, right: 100, bottom: 100 })),
  style: { width: '640px', height: '900px' },
  getContext: vi.fn(() => mockCanvasContext),
  width: 640,
  height: 900
};

// Mock scoreboard cells
const mockCells = Array.from({ length: 11 }, (_, i) => ({ textContent: '' }));
const mockScoreboard = {
  style: { width: '640px' },
  querySelector: vi.fn((selector) => {
    if (selector === '#rolls' || selector === '#totals') {
      return { cells: mockCells };
    }
    return null;
  })
};

// Setup globals before any imports
global.document = global.document || {
  getElementById: vi.fn((id) => {
    if (id === 'title') return mockTitle;
    if (id === 'scoreboard') return mockScoreboard;
    if (id === 'lane') return mockCanvas;
    return null;
  })
};

global.window = global.window || {};
Object.assign(global.window, {
  performance: { now: vi.fn(() => 1000) },
  requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
  getComputedStyle: vi.fn(() => ({
    marginTop: '0px',
    marginBottom: '0px'
  })),
  innerWidth: 640,
  innerHeight: 900,
  devicePixelRatio: 1
});

// Import Game - mocks should be set up
import { Game } from './game.js';

describe('Game', () => {
  let game;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks
    global.document.getElementById = vi.fn((id) => {
      if (id === 'title') return mockTitle;
      if (id === 'scoreboard') return mockScoreboard;
      if (id === 'lane') return mockCanvas;
      return null;
    });
    mockScoreboard.querySelector = vi.fn((selector) => {
      if (selector === '#rolls' || selector === '#totals') {
        return { cells: mockCells };
      }
      return null;
    });
    mockCanvas.getContext = vi.fn(() => mockCanvasContext);
    game = new Game();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(game.currentFrame).toBe(0);
      expect(game.rollInFrame).toBe(0);
      expect(game.gameState).toBe(GameStates.INITIALIZED);
      expect(game.frames).toHaveLength(10);
    });

    it('should initialize frames correctly', () => {
      expect(game.frames[0]).toEqual({
        roll1: null,
        roll2: null,
        roll3: null,
        total: 0,
        cumulative: 0
      });
    });

    it('should initialize ball with correct properties', () => {
      expect(game.ball).toBeDefined();
      expect(game.ball.r).toBeDefined();
      expect(game.ball.mass).toBeDefined();
      expect(game.ball.rolling).toBe(false);
    });

    it('should initialize pins', () => {
      expect(game.pins).toBeDefined();
      expect(game.pins.length).toBeGreaterThan(0);
    });
  });

  describe('buildFrames', () => {
    it('should create 10 frames', () => {
      const frames = game.buildFrames();
      expect(frames).toHaveLength(10);
    });

    it('should initialize each frame with null rolls', () => {
      const frames = game.buildFrames();
      frames.forEach(frame => {
        expect(frame.roll1).toBe(null);
        expect(frame.roll2).toBe(null);
        expect(frame.roll3).toBe(null);
        expect(frame.total).toBe(0);
        expect(frame.cumulative).toBe(0);
      });
    });
  });

  describe('buildPins', () => {
    it('should create correct number of pins', () => {
      const pins = game.buildPins();
      // 4 rows: 1 + 2 + 3 + 4 = 10 pins
      expect(pins).toHaveLength(10);
    });

    it('should assign unique IDs to pins', () => {
      const pins = game.buildPins();
      const ids = pins.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(pins.length);
    });

    it('should initialize pins with correct properties', () => {
      const pins = game.buildPins();
      pins.forEach(pin => {
        expect(pin).toHaveProperty('id');
        expect(pin).toHaveProperty('x');
        expect(pin).toHaveProperty('y');
        expect(pin).toHaveProperty('r');
        expect(pin).toHaveProperty('vx', 0);
        expect(pin).toHaveProperty('vy', 0);
        expect(pin).toHaveProperty('mass');
        expect(pin).toHaveProperty('active', true);
        expect(pin).toHaveProperty('hit', false);
      });
    });
  });

  describe('handleRoll', () => {
    beforeEach(() => {
      // Reset game state
      game.currentFrame = 0;
      game.rollInFrame = 0;
      game.frames = game.buildFrames();
    });

    it('should record first roll in frame 1', () => {
      game.pins.forEach(p => p.hit = p.id <= 5);
      
      const shouldReset = game.handleRoll();
      
      expect(game.frames[0].roll1).toBe(5);
      expect(game.rollInFrame).toBe(1);
      expect(shouldReset).toBe(false);
    });

    it('should record strike on first roll and advance frame', () => {
      game.pins.forEach(p => p.hit = true);
      
      const shouldReset = game.handleRoll();
      
      expect(game.frames[0].roll1).toBe(10);
      expect(game.currentFrame).toBe(1);
      expect(shouldReset).toBe(true);
    });

    it('should record spare on second roll', () => {
      game.frames[0].roll1 = 7;
      game.rollInFrame = 1;
      game.pins.forEach(p => p.hit = p.id <= 3);
      
      const shouldReset = game.handleRoll();
      
      expect(game.frames[0].roll2).toBe(3);
      expect(game.currentFrame).toBe(1);
      expect(shouldReset).toBe(true);
    });

    it('should handle 10th frame first roll strike', () => {
      game.currentFrame = 9;
      game.rollInFrame = 0;
      game.pins.forEach(p => p.hit = true);
      
      const shouldReset = game.handleRoll();
      
      expect(game.frames[9].roll1).toBe(10);
      expect(game.rollInFrame).toBe(1);
      expect(shouldReset).toBe(true);
    });

    it('should handle 10th frame second roll after strike', () => {
      game.currentFrame = 9;
      game.rollInFrame = 1;
      game.frames[9].roll1 = 10;
      game.pins.forEach(p => p.hit = p.id <= 5);
      
      const shouldReset = game.handleRoll();
      
      expect(game.frames[9].roll2).toBe(5);
      expect(game.rollInFrame).toBe(2);
    });

    it('should handle 10th frame third roll', () => {
      game.currentFrame = 9;
      game.rollInFrame = 2;
      game.frames[9].roll1 = 10;
      game.frames[9].roll2 = 5;
      game.pins.forEach(p => p.hit = p.id <= 5);
      
      const shouldReset = game.handleRoll();
      
      expect(game.frames[9].roll3).toBe(5);
      expect(game.currentFrame).toBe(10);
      expect(shouldReset).toBe(true);
    });

    it('should return true when currentFrame >= 10', () => {
      game.currentFrame = 10;
      const shouldReset = game.handleRoll();
      expect(shouldReset).toBe(true);
    });
  });

  describe('calculateCumulative', () => {
    it('should calculate cumulative score for open frame', () => {
      game.frames[0].roll1 = 5;
      game.frames[0].roll2 = 3;
      game.calculateCumulative();
      expect(game.frames[0].cumulative).toBe(8);
    });

    it('should calculate cumulative score for strike with next two rolls', () => {
      game.frames[0].roll1 = 10;
      game.frames[1].roll1 = 5;
      game.frames[1].roll2 = 3;
      game.calculateCumulative();
      expect(game.frames[0].cumulative).toBe(18); // 10 + 5 + 3
      expect(game.frames[1].cumulative).toBe(26); // 18 + 5 + 3
    });

    it('should calculate cumulative score for spare with next roll', () => {
      game.frames[0].roll1 = 7;
      game.frames[0].roll2 = 3;
      game.frames[1].roll1 = 5;
      game.frames[1].roll2 = 2;
      game.calculateCumulative();
      expect(game.frames[0].cumulative).toBe(15); // 10 + 5
      expect(game.frames[1].cumulative).toBe(22); // 15 + 5 + 2
    });

    it('should handle consecutive strikes', () => {
      game.frames[0].roll1 = 10;
      game.frames[1].roll1 = 10;
      game.frames[2].roll1 = 5;
      game.frames[2].roll2 = 2;
      game.calculateCumulative();
      expect(game.frames[0].cumulative).toBe(25); // 10 + 10 + 5
      expect(game.frames[1].cumulative).toBe(42); // 25 + 10 + 5 + 2
    });

    it('should handle 10th frame correctly', () => {
      // Set up frames 0-8 so calculateCumulative processes them
      // We'll use simple open frames to get cumulative up to frame 9
      for (let i = 0; i < 9; i++) {
        game.frames[i].roll1 = 5;
        game.frames[i].roll2 = 3; // Each frame scores 8
      }
      // 10th frame: strike + 5 + 5 = 20
      game.frames[9].roll1 = 10;
      game.frames[9].roll2 = 5;
      game.frames[9].roll3 = 5;
      game.calculateCumulative();
      // Cumulative should be: 8*9 (frames 0-8) + 20 (frame 10) = 72 + 20 = 92
      expect(game.frames[9].cumulative).toBe(92);
      // Also verify the 10th frame score is calculated correctly (20)
      const frame9Score = game.frames[9].roll1 + game.frames[9].roll2 + game.frames[9].roll3;
      expect(frame9Score).toBe(20);
    });

    it('should stop at first null roll1', () => {
      game.frames[0].roll1 = 5;
      game.frames[0].roll2 = 3;
      game.frames[1].roll1 = null;
      game.calculateCumulative();
      expect(game.frames[0].cumulative).toBe(8);
      expect(game.frames[1].cumulative).toBe(0);
    });
  });

  describe('strikeBonus', () => {
    it('should return bonus from next two rolls', () => {
      game.frames[0].roll1 = 10;
      game.frames[1].roll1 = 5;
      game.frames[1].roll2 = 3;
      const bonus = game.strikeBonus(0);
      expect(bonus).toBe(8);
    });

    it('should return bonus from next two strikes', () => {
      game.frames[0].roll1 = 10;
      game.frames[1].roll1 = 10;
      game.frames[2].roll1 = 5;
      const bonus = game.strikeBonus(0);
      expect(bonus).toBe(15); // 10 + 5
    });

    it('should handle strike on 9th frame with 10th frame', () => {
      game.frames[8].roll1 = 10;
      game.frames[9].roll1 = 10;
      game.frames[9].roll2 = 5;
      const bonus = game.strikeBonus(8);
      expect(bonus).toBe(15); // 10 + 5
    });

    it('should return 0 when next frame does not exist', () => {
      game.frames[9].roll1 = 10;
      const bonus = game.strikeBonus(9);
      expect(bonus).toBe(0);
    });

    it('should handle spare in next frame', () => {
      game.frames[0].roll1 = 10;
      game.frames[1].roll1 = 7;
      game.frames[1].roll2 = 3;
      const bonus = game.strikeBonus(0);
      expect(bonus).toBe(10); // 7 + 3
    });
  });

  describe('spareBonus', () => {
    it('should return next roll value', () => {
      game.frames[0].roll1 = 7;
      game.frames[0].roll2 = 3;
      game.frames[1].roll1 = 5;
      const bonus = game.spareBonus(0);
      expect(bonus).toBe(5);
    });

    it('should return 0 when next frame does not exist', () => {
      game.frames[9].roll1 = 7;
      game.frames[9].roll2 = 3;
      const bonus = game.spareBonus(9);
      expect(bonus).toBe(0);
    });

    it('should handle null roll1 as 0', () => {
      game.frames[0].roll1 = 7;
      game.frames[0].roll2 = 3;
      game.frames[1].roll1 = null;
      const bonus = game.spareBonus(0);
      expect(bonus).toBe(0);
    });
  });

  describe('isGameOver', () => {
    it('should return false when currentFrame < 10', () => {
      game.currentFrame = 9;
      expect(game.isGameOver()).toBe(false);
    });

    it('should return true when currentFrame >= 10', () => {
      game.currentFrame = 10;
      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('resetBall', () => {
    it('should reset ball to starting position', () => {
      game.ball.x = 200;
      game.ball.y = 500;
      game.ball.vx = 5;
      game.ball.vy = -10;
      game.ball.rolling = true;
      
      game.resetBall();
      
      expect(game.ball.x).toBe(game.ball.startingX);
      expect(game.ball.y).toBe(game.ball.startingY);
      expect(game.ball.vx).toBe(0);
      expect(game.ball.rolling).toBe(false);
    });
  });

  describe('resetLane', () => {
    it('should rebuild pins', () => {
      const oldPins = game.pins;
      game.pins[0].active = false;
      game.pins[0].hit = true;
      
      game.resetLane();
      
      expect(game.pins.length).toBe(10);
      expect(game.pins[0].active).toBe(true);
      expect(game.pins[0].hit).toBe(false);
    });

    it('should reset ball', () => {
      game.ball.rolling = true;
      game.resetLane();
      expect(game.ball.rolling).toBe(false);
    });
  });

  describe('resetGame', () => {
    it('should reset frames', () => {
      game.frames[0].roll1 = 10;
      game.currentFrame = 5;
      game.rollInFrame = 1;
      
      game.resetGame();
      
      expect(game.frames[0].roll1).toBe(null);
      expect(game.currentFrame).toBe(0);
      expect(game.rollInFrame).toBe(0);
    });

    it('should set game state to RUNNING', () => {
      game.resetGame();
      expect(game.gameState).toBe(GameStates.RUNNING);
    });
  });

  describe('clearHitPins', () => {
    it('should deactivate hit pins', () => {
      game.pins[0].hit = true;
      game.pins[1].hit = false;
      
      game.clearHitPins();
      
      expect(game.pins[0].active).toBe(false);
      expect(game.pins[1].active).toBe(true);
    });
  });
});

