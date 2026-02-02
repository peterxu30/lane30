import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from './engine.js';
import { GameMode } from './game-states.js';

describe('Engine', () => {
  let engine;
  let ball;
  let pins;
  let lane;

  beforeEach(() => {
    engine = new Engine(GameMode.NORMAL);
    ball = {
      x: 175,
      y: 600,
      r: 25,
      vx: 0,
      vy: -8.5,
      mass: 7.5,
      rolling: false
    };
    pins = [
      { id: 1, x: 175, y: 50, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }
    ];
    lane = {
      x: 0,
      y: 0,
      width: 350,
      height: 683,
      gutterWidth: 20
    };
  });

  describe('update', () => {
    it('should not move ball when rolling is false', () => {
      ball.rolling = false;
      const initialY = ball.y;
      engine.update(ball, pins, lane, 16.67);
      expect(ball.y).toBe(initialY);
    });

    it('should move ball when rolling is true', () => {
      ball.rolling = true;
      const initialY = ball.y;
      engine.update(ball, pins, lane, 16.67);
      expect(ball.y).toBeLessThan(initialY);
    });

    it('should apply tick modifier ratio to ball movement', () => {
      ball.rolling = true;
      const initialY = ball.y;
      engine.update(ball, pins, lane, 33.34); // 2x interval
      const moved2x = initialY - ball.y;
      
      ball.y = initialY;
      engine.update(ball, pins, lane, 16.67); // 1x interval
      const moved1x = initialY - ball.y;
      
      expect(moved2x).toBeCloseTo(moved1x * 2, 1);
    });

    it('should move pins based on velocity', () => {
      pins[0].vx = 5;
      pins[0].vy = 3;
      const initialX = pins[0].x;
      const initialY = pins[0].y;
      
      engine.update(ball, pins, lane, 16.67);
      
      expect(pins[0].x).toBeGreaterThan(initialX);
      expect(pins[0].y).toBeGreaterThan(initialY);
    });

    it('should apply deceleration to pins', () => {
      pins[0].vx = 10;
      pins[0].vy = 10;
      const initialVx = pins[0].vx;
      const initialVy = pins[0].vy;
      
      engine.update(ball, pins, lane, 16.67);
      
      expect(Math.abs(pins[0].vx)).toBeLessThan(Math.abs(initialVx));
      expect(Math.abs(pins[0].vy)).toBeLessThan(Math.abs(initialVy));
    });

    it('should round pin velocities', () => {
      pins[0].vx = 0.123456789;
      pins[0].vy = 0.987654321;
      
      engine.update(ball, pins, lane, 16.67);
      
      // Should be rounded to 3 decimal places (1000)
      const vxStr = pins[0].vx.toString();
      const vyStr = pins[0].vy.toString();
      expect(vxStr.split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
      expect(vyStr.split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
    });

    it('should deactivate pins outside lane boundaries', () => {
      pins[0].x = -10; // left of lane
      engine.update(ball, pins, lane, 16.67);
      expect(pins[0].active).toBe(false);
      expect(pins[0].vx).toBe(0);
      expect(pins[0].vy).toBe(0);
    });

    it('should deactivate pins to the right of lane + gutters', () => {
      pins[0].x = lane.x + lane.width + 2 * lane.gutterWidth + 1;
      engine.update(ball, pins, lane, 16.67);
      expect(pins[0].active).toBe(false);
    });

    it('should deactivate pins above lane', () => {
      pins[0].y = lane.y - 1;
      engine.update(ball, pins, lane, 16.67);
      expect(pins[0].active).toBe(false);
    });

    it('should deactivate pins below lane', () => {
      pins[0].y = lane.y + lane.height + 1;
      engine.update(ball, pins, lane, 16.67);
      expect(pins[0].active).toBe(false);
    });

    it('should not process inactive pins', () => {
      pins[0].active = false;
      pins[0].x = 175;
      pins[0].y = 50;
      const initialX = pins[0].x;
      const initialY = pins[0].y;
      
      engine.update(ball, pins, lane, 16.67);
      
      expect(pins[0].x).toBe(initialX);
      expect(pins[0].y).toBe(initialY);
    });

    it('should not apply horizontal movement from migaMode in NORMAL mode', () => {
      // In NORMAL mode, pins should not have horizontal movement from migaMode
      pins[0].vx = 0;
      pins[0].vy = 0;
      const initialVx = pins[0].vx;
      
      engine.update(ball, pins, lane, 16.67);
      
      // vx should remain 0 (no migaMode horizontal movement)
      expect(pins[0].vx).toBe(initialVx);
    });
  });

  describe('resolveCollision', () => {
    it('should set hit flag on ball when ball collides with pin', () => {
      ball.x = 175;
      ball.y = 60;
      pins[0].x = 175;
      pins[0].y = 50;
      
      engine.update(ball, pins, lane, 16.67);
      
      expect(pins[0].hit).toBe(true);
    });

    it('should adjust positions when objects overlap', () => {
      const ball2 = { x: 100, y: 100, r: 10, vx: 0, vy: 0, mass: 5 };
      const pin2 = { x: 105, y: 100, r: 10, vx: 0, vy: 0, mass: 1 };
      
      engine.resolveCollision(ball2, pin2, 1.0);
      
      // Positions should be adjusted to resolve overlap
      const dist = Math.hypot(pin2.x - ball2.x, pin2.y - ball2.y);
      expect(dist).toBeGreaterThanOrEqual(20); // r1 + r2 = 20
    });

    it('should not resolve collision when objects are separating', () => {
      const obj1 = { x: 100, y: 100, r: 10, vx: -5, vy: 0, mass: 1 };
      const obj2 = { x: 120, y: 100, r: 10, vx: 5, vy: 0, mass: 1 };
      
      engine.resolveCollision(obj1, obj2, 1.0);
      
      // Velocities should not change when separating
      expect(obj1.vx).toBe(-5);
      expect(obj2.vx).toBe(5);
    });

    it('should handle zero distance (objects at same position)', () => {
      const obj1 = { x: 100, y: 100, r: 10, vx: 0, vy: 0, mass: 1 };
      const obj2 = { x: 100, y: 100, r: 10, vx: 0, vy: 0, mass: 1 };
      
      // Should not throw error
      expect(() => {
        engine.resolveCollision(obj1, obj2, 1.0);
      }).not.toThrow();
    });

    it('should apply tick modifier ratio in collision resolution', () => {
      // Position objects so they overlap (distance < sum of radii)
      // Distance between centers should be less than r1 + r2 = 20
      // Position them at distance 15 to ensure overlap of 5
      // Velocities must be approaching (velAlongNormal < 0) for velocity changes to occur
      const obj1 = { x: 100, y: 100, r: 10, vx: 5, vy: 0, mass: 1 };
      const obj2 = { x: 115, y: 100, r: 10, vx: -5, vy: 0, mass: 1 }; // Distance = 15 < 20 (overlapping)
      
      // Store initial values
      const initialVx1 = obj1.vx;
      const initialVx2 = obj2.vx;
      const initialX1 = obj1.x;
      const initialX2 = obj2.x;
      
      // Test with 2x modifier
      engine.resolveCollision(obj1, obj2, 2.0);
      
      // Velocities should change (they're colliding and approaching)
      expect(obj1.vx).not.toBe(initialVx1);
      expect(obj2.vx).not.toBe(initialVx2);
      
      // Positions should be adjusted (overlap resolved)
      expect(obj1.x).not.toBe(initialX1);
      expect(obj2.x).not.toBe(initialX2);
      
      // Store positions after 2x modifier
      const posAfter2x1 = obj1.x;
      const posAfter2x2 = obj2.x;
      
      // Reset objects and test with 1x modifier
      obj1.x = 100;
      obj2.x = 115;
      obj1.vx = 5;
      obj2.vx = -5;
      
      engine.resolveCollision(obj1, obj2, 1.0);
      
      // Position changes with 1x should be different from 2x (modifier affects overlap resolution)
      // Note: positions will be different due to modifier ratio affecting overlap resolution
      expect(obj1.x).not.toBe(posAfter2x1);
      expect(obj2.x).not.toBe(posAfter2x2);
    });
  });

  describe('pin-pin collisions', () => {
    it('should resolve collisions between two pins', () => {
      pins.push({ id: 2, x: 180, y: 50, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false });
      
      engine.update(ball, pins, lane, 16.67);
      
      // Pins should have adjusted positions
      const dist = Math.hypot(pins[1].x - pins[0].x, pins[1].y - pins[0].y);
      expect(dist).toBeGreaterThanOrEqual(29); // 2 * pinRadius
    });

    it('should not collide inactive pins', () => {
      pins.push({ id: 2, x: 180, y: 50, r: 14.5, vx: 0, vy: 0, mass: 1, active: false, hit: false });
      const initialX = pins[1].x;
      
      engine.update(ball, pins, lane, 16.67);
      
      expect(pins[1].x).toBe(initialX);
    });
  });

  describe('constructor', () => {
    it('should initialize with NORMAL mode deceleration', () => {
      const normalEngine = new Engine(GameMode.NORMAL);
      expect(normalEngine.deceleration).toBe(0.01);
    });
  });

  describe('MIGA mode', () => {
    let migaEngine;
    let migaPins;
    let migaLane;

    beforeEach(() => {
      migaEngine = new Engine(GameMode.MIGA);
      migaLane = {
        x: 0,
        y: 0,
        width: 350,
        height: 683,
        gutterWidth: 20
      };
      // Create pins for all 4 rows to test row detection
      migaPins = [
        { id: 1, x: 175, y: 50, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 1
        { id: 2, x: 130, y: 100, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 2
        { id: 3, x: 220, y: 100, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 2
        { id: 4, x: 85, y: 150, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 3
        { id: 5, x: 175, y: 150, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 3
        { id: 6, x: 265, y: 150, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 3
        { id: 7, x: 40, y: 200, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 4
        { id: 8, x: 130, y: 200, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 4
        { id: 9, x: 220, y: 200, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false }, // row 4
        { id: 10, x: 310, y: 200, r: 14.5, vx: 0, vy: 0, mass: 1, active: true, hit: false } // row 4
      ];
    });

    describe('constructor', () => {
      it('should initialize with MIGA mode deceleration', () => {
        expect(migaEngine.deceleration).toBe(0.025);
      });

      it('should initialize rowDirection array', () => {
        expect(migaEngine.rowDirection).toHaveLength(4);
      });

      it('should initialize all rows to RIGHT direction', () => {
        // All rows should start with the same direction (RIGHT)
        const firstDirection = migaEngine.rowDirection[0];
        const allSame = migaEngine.rowDirection.every(dir => dir === firstDirection);
        expect(allSame).toBe(true);
      });
    });

    describe('getPinRow', () => {
      it('should return 1 for pin in first row', () => {
        expect(migaEngine.getPinRow(migaPins[0])).toBe(1);
      });

      it('should return 2 for pins in second row', () => {
        expect(migaEngine.getPinRow(migaPins[1])).toBe(2);
        expect(migaEngine.getPinRow(migaPins[2])).toBe(2);
      });

      it('should return 3 for pins in third row', () => {
        expect(migaEngine.getPinRow(migaPins[3])).toBe(3);
        expect(migaEngine.getPinRow(migaPins[4])).toBe(3);
        expect(migaEngine.getPinRow(migaPins[5])).toBe(3);
      });

      it('should return 4 for pins in fourth row', () => {
        expect(migaEngine.getPinRow(migaPins[6])).toBe(4);
        expect(migaEngine.getPinRow(migaPins[7])).toBe(4);
        expect(migaEngine.getPinRow(migaPins[8])).toBe(4);
        expect(migaEngine.getPinRow(migaPins[9])).toBe(4);
      });

      it('should return -1 for invalid pin', () => {
        const invalidPin = { id: 99 };
        expect(migaEngine.getPinRow(invalidPin)).toBe(-1);
      });
    });

    describe('migaMode', () => {
      it('should not affect inactive pins', () => {
        migaPins[0].active = false;
        migaPins[0].vx = 0;
        
        migaEngine.migaMode(migaPins, migaLane);
        
        expect(migaPins[0].vx).toBe(0);
      });

      it('should not affect hit pins', () => {
        migaPins[0].hit = true;
        migaPins[0].vx = 0;
        
        migaEngine.migaMode(migaPins, migaLane);
        
        expect(migaPins[0].vx).toBe(0);
      });

      it('should set vx to 1.4 when direction is RIGHT', () => {
        migaEngine.rowDirection[0] = migaEngine.rowDirection[0]; // Keep RIGHT
        migaPins[0].vx = 0;
        
        migaEngine.migaMode(migaPins, migaLane);
        
        expect(migaPins[0].vx).toBe(1.4);
      });

      it('should set vx to -1.4 when direction is LEFT', () => {
        // Trigger a boundary hit to change direction to LEFT
        const rightBoundary = migaLane.x + migaLane.width + migaLane.gutterWidth;
        migaPins[0].x = rightBoundary - 10; // Near right boundary
        migaEngine.migaMode(migaPins, migaLane);
        
        // Now direction should be LEFT, test again
        migaPins[0].x = 175; // Move back to center
        migaEngine.migaMode(migaPins, migaLane);
        
        expect(migaPins[0].vx).toBe(-1.4);
      });

      it('should change direction to LEFT when pin hits right boundary', () => {
        const rightBoundary = migaLane.x + migaLane.width + migaLane.gutterWidth;
        migaPins[0].x = rightBoundary - 10; // Within 10px of right boundary
        
        migaEngine.migaMode(migaPins, migaLane);
        
        // Direction should now be LEFT, verify by checking vx
        expect(migaPins[0].vx).toBe(-1.4);
      });

      it('should change direction to RIGHT when pin hits left boundary', () => {
        // First set direction to LEFT by hitting right boundary
        const rightBoundary = migaLane.x + migaLane.width + migaLane.gutterWidth;
        migaPins[0].x = rightBoundary - 10;
        migaEngine.migaMode(migaPins, migaLane);
        expect(migaPins[0].vx).toBe(-1.4); // Verify it's LEFT
        
        // Now hit left boundary to change back to RIGHT
        const leftBoundary = migaLane.x + migaLane.gutterWidth;
        migaPins[0].x = leftBoundary + 10; // Within 10px of left boundary
        
        migaEngine.migaMode(migaPins, migaLane);
        
        // Direction should now be RIGHT
        expect(migaPins[0].vx).toBe(1.4);
      });
    });

    describe('update with MIGA mode', () => {
      it('should apply migaMode to active unhit pins', () => {
        const ball = { x: 175, y: 600, r: 25, vx: 0, vy: 0, mass: 7.5, rolling: false };
        migaPins[0].vx = 0;
        migaPins[0].vy = 0;
        
        migaEngine.update(ball, migaPins, migaLane, 16.67);
        
        // Pin should have horizontal velocity from migaMode (1.4) but deceleration is applied after
        // migaMode sets vx to 1.4, then deceleration (0.025) is applied, then rounded to 3 decimal places
        // The value should be positive (moving right) and approximately 1.36-1.37 after deceleration and rounding
        expect(migaPins[0].vx).toBeGreaterThan(1.3);
        expect(migaPins[0].vx).toBeLessThan(1.4);
        expect(migaPins[0].vx).toBeGreaterThan(0); // Moving right
      });

      it('should not apply migaMode to hit pins', () => {
        const ball = { x: 175, y: 600, r: 25, vx: 0, vy: 0, mass: 7.5, rolling: false };
        migaPins[0].hit = true;
        migaPins[0].vx = 0;
        
        migaEngine.update(ball, migaPins, migaLane, 16.67);
        
        // Hit pins should not get migaMode velocity
        expect(migaPins[0].vx).toBe(0);
      });

      it('should use higher deceleration in MIGA mode', () => {
        const ball = { x: 175, y: 600, r: 25, vx: 0, vy: 0, mass: 7.5, rolling: false };
        migaPins[0].vx = 10;
        migaPins[0].vy = 10;
        const initialVx = migaPins[0].vx;
        
        migaEngine.update(ball, migaPins, migaLane, 16.67);
        
        // MIGA mode has higher deceleration (0.025 vs 0.01)
        // So velocity should decrease more
        const normalEngine = new Engine(GameMode.NORMAL);
        const normalPin = { id: 1, x: 175, y: 50, r: 14.5, vx: 10, vy: 10, mass: 1, active: true, hit: false };
        normalEngine.update(ball, [normalPin], migaLane, 16.67);
        
        // MIGA pin should have lower velocity after deceleration
        expect(Math.abs(migaPins[0].vx)).toBeLessThan(Math.abs(normalPin.vx));
      });
    });
  });
});

