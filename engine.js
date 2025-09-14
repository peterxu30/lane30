// time interval of 60hz
const theoreticalTickInterval = 1000 / 60; 

/**
 * Engine handles all physics calculations and game state updates.
 * It manages ball movement, pin physics, and collision detection.
 * It is designed to theoretically run at 60hz and adjusts for variation in refresh rate.
 */
export class Engine {

  update(ball, pins, lane, actualTickInterval) {
    const tickModifierRatio = actualTickInterval / theoreticalTickInterval;

    // Ball movement
    if (ball.rolling) {
      // disable mouse control for now
      // if (mouseX != null) {
      //   const minX = lane.x + ball.r;
      //   const maxX = lane.x + lane.width - ball.r;
      //   const targetX = Math.max(minX, Math.min(maxX, mouseX));
      //   ball.x += (targetX - ball.x) * 0.18;
      // }
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

    // TODO(peter.xu) Maybe bring horizontal ball movement back
    // if (ball.rolling) {
    //   ball.x += ball.vx;
    //   ball.vx *= 1 - (0.02 * tickModifierRatio);
    // }

    // Move pins
    pins.forEach(p => {
      if (!p.active) return;
      p.x += p.vx * tickModifierRatio;
      p.y += p.vy * tickModifierRatio;

      const tickAcceleration = 1 - (0.01 * tickModifierRatio);
      p.vx *= tickAcceleration;
      p.vy *= tickAcceleration;

      // testing stopping the pins
      // var beforeVx = p.vx;
      // var decimalPlaces = 22;
      // var decimalNumber = Math.pow(10, decimalPlaces);
      // p.vx = -1 * Math.abs(Math.ceil(p.vx * decimalNumber) / decimalNumber);
      // p.vy = -1 * Math.abs(Math.ceil(p.vy * decimalNumber) / decimalNumber);
      // console.log(`Pin ${p.id} vx: ${beforeVx} -> ${p.vx}, vy: ${p.vy}`);

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
      let roundedPinVx = Math.trunc(p.vx*5000) / 5000;
      let roundedPinYx = Math.trunc(p.vy*5000) / 5000;
      p.vx = roundedPinVx;
      p.vy = roundedPinYx;
    })
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
}
