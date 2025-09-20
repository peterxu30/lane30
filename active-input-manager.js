/**
 * ActiveInputManager is responsible for managing one active touch state.
 */
export class ActiveInputManager {
  constructor() {
    this.activeTouch = null;
  }

  addTouch(touch) {
    if (this.activeTouch == null) {
      this.activeTouch = touch;
      return true;
      
    }
    return false;
  }

  isActiveTouch(touch) {
    return touch.identifier === this.activeTouch.identifier;
  }

  hasActiveTouch() {
    return this.activeTouch != null;
  }

  getActiveTouch() {
    return this.activeTouch;
  }

  clearActiveTouch() {
    this.activeTouch = null;
  }
}