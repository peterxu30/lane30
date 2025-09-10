/**
 * Ticker manages the game's refresh rate and timing.
 * It controls when the game should update and render frames.
 */
export class Ticker {
  constructor(refreshRateHz = 60) {
    this.refreshRateHz = refreshRateHz;
    this.refreshInterval = 1000 / this.refreshRateHz; // 1000 ms in 1 second
    this.then = window.performance.now();
    this.now = this.then;
  }

  tick(timestamp) {
    // calc elapsed time since last loop
    this.now = timestamp;
    const elapsed = this.now - this.then;

    // if enough time has elapsed, draw the next frame
    if (elapsed > this.refreshInterval) {
      // Get ready for next frame by setting then=now, but...
      // Also, adjust for fpsInterval not being multiple of 16.67
      this.then = this.now - (elapsed % this.refreshInterval);
      return true;
    }
    return false;
  }
}
