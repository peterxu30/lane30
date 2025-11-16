import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ticker } from './ticker.js';

// Setup global window mock before importing
global.window = global.window || {};
global.window.performance = global.window.performance || {};

describe('Ticker', () => {
  let ticker;

  beforeEach(() => {
    // Mock window.performance.now()
    global.window.performance.now = vi.fn(() => 1000);
    ticker = new Ticker(60);
  });

  describe('constructor', () => {
    it('should initialize with default refresh rate of 60Hz', () => {
      const defaultTicker = new Ticker();
      expect(defaultTicker.refreshRateHz).toBe(60);
      expect(defaultTicker.refreshInterval).toBe(1000 / 60);
    });

    it('should initialize with custom refresh rate', () => {
      const customTicker = new Ticker(30);
      expect(customTicker.refreshRateHz).toBe(30);
      expect(customTicker.refreshInterval).toBe(1000 / 30);
    });

    it('should initialize then and now with current time', () => {
      expect(ticker.then).toBe(1000);
      expect(ticker.now).toBe(1000);
    });
  });

  describe('tickInterval', () => {
    it('should return elapsed time since last tick', () => {
      global.window.performance.now = vi.fn()
        .mockReturnValueOnce(1000)  // constructor
        .mockReturnValueOnce(1166.67); // first tick

      const tick = new Ticker(60);
      const elapsed = tick.tickInterval(1166.67);
      
      expect(elapsed).toBeCloseTo(166.67, 1);
    });

    it('should update then to current timestamp', () => {
      global.window.performance.now = vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1200);

      const tick = new Ticker(60);
      tick.tickInterval(1200);
      
      expect(tick.then).toBe(1200);
    });

    it('should handle multiple ticks correctly', () => {
      global.window.performance.now = vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1166.67)
        .mockReturnValueOnce(1333.34);

      const tick = new Ticker(60);
      const elapsed1 = tick.tickInterval(1166.67);
      const elapsed2 = tick.tickInterval(1333.34);
      
      expect(elapsed1).toBeCloseTo(166.67, 1);
      expect(elapsed2).toBeCloseTo(166.67, 1);
    });

    it('should return 0 on first call after construction', () => {
      // First tick immediately after construction should return 0
      // because then and now are the same
      const elapsed = ticker.tickInterval(1000);
      expect(elapsed).toBe(0);
    });
  });
});

