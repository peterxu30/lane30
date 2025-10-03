/**
 * ActivePointerManager is responsible for managing one active pointer state.
 */
export class ActivePointerManager {
  constructor() {
    this.activePointer = null;
  }

  addPointer(pointer) {
    if (this.activePointer == null) {
      this.activePointer = pointer;
      return true;
      
    }
    return false;
  }

  isActivePointer(pointer) {
    if (this.activePointer == null || pointer == null) {
      return false;
    }

    return pointer.pointerId === this.activePointer.pointerId;
  }

  hasActivePointer() {
    return this.activePointer != null;
  }

  getActivePointer() {
    return this.activePointer;
  }

  clearActivePointer() {
    this.activePointer = null;
  }
}