import { describe, it, expect } from 'vitest';
import { GameStates, GameMode } from './game-states.js';

describe('GameStates', () => {
  it('should export GameStates object', () => {
    expect(GameStates).toBeDefined();
    expect(typeof GameStates).toBe('object');
  });

  it('should have all required state symbols', () => {
    expect(GameStates.INITIALIZED).toBeDefined();
    expect(GameStates.NOT_RUNNING).toBeDefined();
    expect(GameStates.RUNNING).toBeDefined();
    expect(GameStates.FRAME_DONE).toBeDefined();
    expect(GameStates.OVER).toBeDefined();
    // RESTART is marked as NOT USED in game-states.js
  });

  it('should have symbols as values', () => {
    expect(typeof GameStates.INITIALIZED).toBe('symbol');
    expect(typeof GameStates.NOT_RUNNING).toBe('symbol');
    expect(typeof GameStates.RUNNING).toBe('symbol');
    expect(typeof GameStates.FRAME_DONE).toBe('symbol');
    expect(typeof GameStates.OVER).toBe('symbol');
    // RESTART is marked as NOT USED in game-states.js
  });

  it('should have unique symbols', () => {
    const states = Object.values(GameStates);
    const uniqueStates = new Set(states);
    expect(uniqueStates.size).toBe(states.length);
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(GameStates)).toBe(true);
  });

  it('should have description property on symbols', () => {
    expect(GameStates.INITIALIZED.description).toBe('initialized');
    expect(GameStates.NOT_RUNNING.description).toBe('not_started');
    expect(GameStates.RUNNING.description).toBe('running');
    expect(GameStates.FRAME_DONE.description).toBe('frame_done');
    expect(GameStates.OVER.description).toBe('over');
    // RESTART is marked as NOT USED in game-states.js
  });
});

describe('GameMode', () => {
  it('should export GameMode object', () => {
    expect(GameMode).toBeDefined();
    expect(typeof GameMode).toBe('object');
  });

  it('should have NORMAL and MIGA symbols', () => {
    expect(GameMode.NORMAL).toBeDefined();
    expect(GameMode.MIGA).toBeDefined();
  });

  it('should have symbols as values', () => {
    expect(typeof GameMode.NORMAL).toBe('symbol');
    expect(typeof GameMode.MIGA).toBe('symbol');
  });

  it('should have unique symbols', () => {
    const modes = Object.values(GameMode);
    const uniqueModes = new Set(modes);
    expect(uniqueModes.size).toBe(modes.length);
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(GameMode)).toBe(true);
  });

  it('should have description property on symbols', () => {
    expect(GameMode.NORMAL.description).toBe('normal');
    expect(GameMode.MIGA.description).toBe('miga');
  });
});

