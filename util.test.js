import { describe, it, expect } from 'vitest';
import * as util from './util.js';

describe('util', () => {
  describe('frameIsStrike', () => {
    it('should return true when roll1 is 10', () => {
      const frame = { roll1: 10, roll2: null };
      expect(util.frameIsStrike(frame)).toBe(true);
    });

    it('should return false when roll1 is not 10', () => {
      const frame = { roll1: 9, roll2: 1 };
      expect(util.frameIsStrike(frame)).toBe(false);
    });

    it('should return false when roll1 is 0', () => {
      const frame = { roll1: 0, roll2: 5 };
      expect(util.frameIsStrike(frame)).toBe(false);
    });
  });

  describe('frameIsSpare', () => {
    it('should return true when roll1 + roll2 equals 10 and not a strike', () => {
      const frame = { roll1: 7, roll2: 3 };
      expect(util.frameIsSpare(frame)).toBe(true);
    });

    it('should return false when it is a strike', () => {
      const frame = { roll1: 10, roll2: null };
      expect(util.frameIsSpare(frame)).toBe(false);
    });

    it('should return false when roll1 + roll2 does not equal 10', () => {
      const frame = { roll1: 5, roll2: 3 };
      expect(util.frameIsSpare(frame)).toBe(false);
    });

    it('should handle null roll2 as 0', () => {
      const frame = { roll1: 5, roll2: null };
      expect(util.frameIsSpare(frame)).toBe(false);
    });

    it('should handle null roll1 as 0', () => {
      const frame = { roll1: null, roll2: 5 };
      expect(util.frameIsSpare(frame)).toBe(false);
    });
  });

  describe('frameTenFirstRollIsStrike', () => {
    it('should return true when roll1 is 10', () => {
      const frame = { roll1: 10, roll2: null, roll3: null };
      expect(util.frameTenFirstRollIsStrike(frame)).toBe(true);
    });

    it('should return false when roll1 is not 10', () => {
      const frame = { roll1: 9, roll2: 1, roll3: null };
      expect(util.frameTenFirstRollIsStrike(frame)).toBe(false);
    });
  });

  describe('frameTenSecondRollIsStrike', () => {
    it('should return true when roll2 is 10', () => {
      const frame = { roll1: 5, roll2: 10, roll3: null };
      expect(util.frameTenSecondRollIsStrike(frame)).toBe(true);
    });

    it('should return false when roll2 is not 10', () => {
      const frame = { roll1: 5, roll2: 4, roll3: null };
      expect(util.frameTenSecondRollIsStrike(frame)).toBe(false);
    });

    it('should return false when roll2 is null', () => {
      const frame = { roll1: 5, roll2: null, roll3: null };
      expect(util.frameTenSecondRollIsStrike(frame)).toBe(false);
    });
  });

  describe('frameTenThirdRollIsStrike', () => {
    it('should return true when roll3 is 10', () => {
      const frame = { roll1: 10, roll2: 0, roll3: 10 };
      expect(util.frameTenThirdRollIsStrike(frame)).toBe(true);
    });

    it('should return false when roll3 is not 10', () => {
      const frame = { roll1: 10, roll2: 0, roll3: 5 };
      expect(util.frameTenThirdRollIsStrike(frame)).toBe(false);
    });

    it('should return false when roll3 is null', () => {
      const frame = { roll1: 10, roll2: 0, roll3: null };
      expect(util.frameTenThirdRollIsStrike(frame)).toBe(false);
    });
  });

  describe('frameTenSecondRollIsSpare', () => {
    it('should return true when roll1 + roll2 equals 10 and roll1 is not 10', () => {
      const frame = { roll1: 7, roll2: 3, roll3: null };
      expect(util.frameTenSecondRollIsSpare(frame)).toBe(true);
    });

    it('should return false when it is a strike on first roll', () => {
      const frame = { roll1: 10, roll2: 0, roll3: null };
      expect(util.frameTenSecondRollIsSpare(frame)).toBe(false);
    });

    it('should return false when roll1 + roll2 does not equal 10', () => {
      const frame = { roll1: 5, roll2: 3, roll3: null };
      expect(util.frameTenSecondRollIsSpare(frame)).toBe(false);
    });

    it('should handle null values as 0', () => {
      const frame = { roll1: 5, roll2: null, roll3: null };
      expect(util.frameTenSecondRollIsSpare(frame)).toBe(false);
    });
  });
});

