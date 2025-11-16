import { describe, it, expect, beforeEach } from 'vitest';
import { ActivePointerManager } from './active-pointer-manager.js';

describe('ActivePointerManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ActivePointerManager();
  });

  describe('constructor', () => {
    it('should initialize with no active pointer', () => {
      expect(manager.activePointer).toBe(null);
    });
  });

  describe('addPointer', () => {
    it('should add a pointer when none exists', () => {
      const pointer = { pointerId: 1 };
      const result = manager.addPointer(pointer);
      
      expect(result).toBe(true);
      expect(manager.activePointer).toBe(pointer);
    });

    it('should not add a pointer when one already exists', () => {
      const pointer1 = { pointerId: 1 };
      const pointer2 = { pointerId: 2 };
      
      manager.addPointer(pointer1);
      const result = manager.addPointer(pointer2);
      
      expect(result).toBe(false);
      expect(manager.activePointer).toBe(pointer1);
    });
  });

  describe('isActivePointer', () => {
    it('should return false when no active pointer exists', () => {
      const pointer = { pointerId: 1 };
      expect(manager.isActivePointer(pointer)).toBe(false);
    });

    it('should return false when pointer is null', () => {
      const pointer = { pointerId: 1 };
      manager.addPointer(pointer);
      expect(manager.isActivePointer(null)).toBe(false);
    });

    it('should return true when pointer matches active pointer', () => {
      const pointer = { pointerId: 1 };
      manager.addPointer(pointer);
      expect(manager.isActivePointer(pointer)).toBe(true);
    });

    it('should return false when pointer does not match active pointer', () => {
      const pointer1 = { pointerId: 1 };
      const pointer2 = { pointerId: 2 };
      manager.addPointer(pointer1);
      expect(manager.isActivePointer(pointer2)).toBe(false);
    });

    it('should compare by pointerId', () => {
      const pointer1 = { pointerId: 1 };
      const pointer2 = { pointerId: 1 };
      manager.addPointer(pointer1);
      // Different object but same pointerId - should match
      expect(manager.isActivePointer(pointer2)).toBe(true);
    });
  });

  describe('hasActivePointer', () => {
    it('should return false when no active pointer', () => {
      expect(manager.hasActivePointer()).toBe(false);
    });

    it('should return true when active pointer exists', () => {
      const pointer = { pointerId: 1 };
      manager.addPointer(pointer);
      expect(manager.hasActivePointer()).toBe(true);
    });

    it('should return false after clearing pointer', () => {
      const pointer = { pointerId: 1 };
      manager.addPointer(pointer);
      manager.clearActivePointer();
      expect(manager.hasActivePointer()).toBe(false);
    });
  });

  describe('getActivePointer', () => {
    it('should return null when no active pointer', () => {
      expect(manager.getActivePointer()).toBe(null);
    });

    it('should return the active pointer', () => {
      const pointer = { pointerId: 1 };
      manager.addPointer(pointer);
      expect(manager.getActivePointer()).toBe(pointer);
    });
  });

  describe('clearActivePointer', () => {
    it('should clear the active pointer', () => {
      const pointer = { pointerId: 1 };
      manager.addPointer(pointer);
      manager.clearActivePointer();
      expect(manager.activePointer).toBe(null);
      expect(manager.hasActivePointer()).toBe(false);
    });

    it('should handle clearing when no active pointer exists', () => {
      manager.clearActivePointer();
      expect(manager.activePointer).toBe(null);
    });
  });
});

