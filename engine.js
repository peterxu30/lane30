import { GameMode } from './game-states.js';
import * as util from './util.js';

// time interval of 60hz
const theoreticalTickInterval = 1000 / 60; 

const Direction = Object.freeze({
  LEFT: Symbol("left"),
  RIGHT: Symbol("right"),
})

/**
 * Engine handles all physics calculations and game state updates.
 * It manages ball movement, pin physics, and collision detection.
 * It is designed to theoretically run at 60hz and adjusts for variation in refresh rate.
 */
export class Engine {

  constructor(gameMode) {
    this.mode = gameMode;
    this.deceleration = this.mode === GameMode.MIGA ? 0.025 : 0.01;

    // for Miga Mode
    this.rowDirection = new Array(4).fill(Direction.RIGHT);
  }

  update(ball, pins, lane, actualTickInterval) {
    const tickModifierRatio = actualTickInterval / theoreticalTickInterval;

    // Ball movement
    if (ball.rolling) {
      ball.y += ball.vy * tickModifierRatio;
    }

    // Ball–pin collisions
    pins.forEach(p => {
      if (p.active) this.resolveCollision(ball, p, tickModifierRatio);
    });

    // Pin–pin collisions
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        if (pins[i].active && pins[j].active) {
          this.resolveCollision(pins[i], pins[j], tickModifierRatio);
        }
      }
    }

    // Miga mode special pin movement
    // TODO(peter.xu) refactor this to run a generic engineModule.
    // The normal variant is a noop and the miga variant does migaMode.
    if (this.mode === GameMode.MIGA) {
      this.migaMode(pins, lane);
    }
    
    // Move pins
    pins.forEach(p => {
      if (!p.active) return;
      p.x += p.vx * tickModifierRatio;
      p.y += p.vy * tickModifierRatio;

      /*
      * 1. If pin is active and unhit, get all active and unhit pins with the same Y value and store them in a map
      * skip any other pins with same Y after
      * 
      * 2. Give all pins in same row p.vx = 1
      * 3. Check if any of the pins have reached the boundary. If so, swap that entire row's vx to -1
      * 
      * how to deal with pin-pin collisions because of movement?
      */

      const tickAcceleration = 1 - (this.deceleration * tickModifierRatio);
      p.vx *= tickAcceleration;
      p.vy *= tickAcceleration;

      // check gutters/out
      if (
        p.x < lane.x ||
        p.x > lane.x + lane.width + 2*lane.gutterWidth ||
        p.y < lane.y ||
        p.y > lane.y + lane.height
      ) {
        p.active = false;
        p.vx = 0;
        p.vy = 0;
      }
    });

    // Round pin speed
    pins.forEach(p => {      
      let roundValue = 3;
      let rounder = 10 ** roundValue;

      let roundedPinVx = Math.trunc(p.vx*rounder) / rounder;
      let roundedPinYx = Math.trunc(p.vy*rounder) / rounder;
      p.vx = roundedPinVx;
      p.vy = roundedPinYx;
    })
  }

  getPinRow(pin) {
    for (let rowNum = 1; rowNum <= 4; rowNum++) {
      let firstPinInRow = ((rowNum * (rowNum - 1))/2) + 1;
      let lastPinInRow = (rowNum * (rowNum+1))/2;

      if (pin.id >= firstPinInRow && pin.id <= lastPinInRow) {
        return rowNum;
      }
    }
    return -1;
  }

  resolveCollision(a, b, tickModifierRatio) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const overlap = a.r + b.r - dist;
    if (overlap > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const changeX = tickModifierRatio * (nx * overlap / 2);
      const changeY = tickModifierRatio * (ny * overlap / 2);
      a.x -= changeX;
      a.y -= changeY;
      b.x += changeX;
      b.y += changeY;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal > 0) return;
      const restitution = -0.23;
      const invMassA = 1 / a.mass;
      const invMassB = 1 / b.mass;
      const j = -(1 + restitution) * velAlongNormal / (invMassA + invMassB);
      const ix = j * nx;
      const iy = j * ny;
      
      a.vx -= tickModifierRatio * (ix * invMassA);
      a.vy -= tickModifierRatio * (iy * invMassA);
      b.vx += tickModifierRatio * (ix * invMassB);
      b.vy += tickModifierRatio * (iy * invMassB);

      if ("hit" in b) {
        b.hit = true;
      }
      if ("hit" in a) {
        a.hit = true;
      }
    }
  }

  migaMode(pins, lane) {
    this.determineMigaModeMovementChange(pins, lane);

    pins.forEach(p => {
      this.setMigaModePinMovement(p, lane);
    });
  }

  determineMigaModeMovementChange(pins, lane) {
    pins.forEach(pin => {
      if (!pin.active || pin.hit) {
        return;
      }

      let pinRow = this.getPinRow(pin);
      if (pinRow === -1) {
        console.log("invalid pin", pin);
      }

      if (pin.x + pin.r > util.laneRightBoundary(lane) - 10) {
        this.rowDirection[pinRow-1] = Direction.LEFT;
      } else if (pin.x - pin.r < util.laneLeftBoundary(lane) + 10) {
        this.rowDirection[pinRow-1] = Direction.RIGHT;
      }
    });
  }
  
  setMigaModePinMovement(pin) {
    if (!pin.active || pin.hit) {
      return;
    }

    let pinRow = this.getPinRow(pin);
    if (pinRow === -1) {
      console.log("invalid pin", pin);
    }

    if (this.rowDirection[pinRow-1] === Direction.LEFT) {
      pin.vx = -1.4;
    } else if (this.rowDirection[pinRow-1] === Direction.RIGHT) {
      pin.vx = 1.4;
    }

    if (pin.hit && pin.vx === 0 && pin.vy === 0) {
      pin.active = false;
    }
  }

  reset() {
    switch (this.gameMode) {
      case GameMode.MIGA:
        this.resetMigaMode();
        return;
    }
  }

  resetMigaMode() {
    this.rowDirection.fill(Direction.RIGHT);
  }
}
