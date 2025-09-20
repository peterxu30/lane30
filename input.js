/**
 * Input is responsible for managing touch state.
 * It acts as a touch store.
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.touches = [];
    this.activeTouch = null;
  }

  addTouch(touch) {
    this.touches.push(touch);

    // managing single touch
    if (this.activeTouch == null) {
      this.activeTouch = touch;
      return true;
      
    }
    return false;
  }

  removeTouch(touch) {
    const touchIdentifier = touch.identifier;
    const touchIndex = this.ongoingTouchIndexById(touchIdentifier);
    this.touches.splice(touchIndex, 1);

    // managing single touch
    if (this.activeTouch != null && this.activeTouch.identifier === touch.identifier) {
      this.activeTouch = null;
      return true;
    }
    return false;
  }

  removeTouches(touches) {
    for (const touch of touches) {
      const touchIdentifier = touch.identifier;
      const touchIndex = this.ongoingTouchIndexById(touchIdentifier);
      this.touches.splice(touchIndex, 1);
    }
  }

  ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < this.touches.length; i++) {
      const id = this.touches[i].identifier;
  
      if (id === idToFind) {
        return i;
      }
    }
    return -1; // not found
  }
}