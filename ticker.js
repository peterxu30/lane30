/**
 * Ticker measures the interval between calls.
 */
export class Ticker {
  constructor(refreshRateHz = 60) {
    this.refreshRateHz = refreshRateHz;
    this.refreshInterval = 1000 / this.refreshRateHz; // 1000 ms in 1 second
    this.then = window.performance.now();
    this.now = this.then;
  }

  tickInterval(timestamp) {
    // calc elapsed time since last loop
    const elapsed = timestamp - this.then;
    this.then = timestamp;
    return elapsed;
  }
}
