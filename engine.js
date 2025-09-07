/**
 * Engine handles all physics calculations and game state updates.
 * It manages ball movement, pin physics, and collision detection.
 */
export class Engine {
  update(ball, pins, lane) {
    // Ball movement
    if (ball.rolling) {
      // disable mouse control for now
      // if (mouseX != null) {
      //   const minX = lane.x + ball.r;
      //   const maxX = lane.x + lane.width - ball.r;
      //   const targetX = Math.max(minX, Math.min(maxX, mouseX));
      //   ball.x += (targetX - ball.x) * 0.18;
      // }
      ball.y += ball.vy;
    }

    // Ball–pin collisions
    pins.forEach(p => {
      if (p.active) this.resolveCollision(ball, p);
    });

    // Pin–pin collisions
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        if (pins[i].active && pins[j].active) {
          this.resolveCollision(pins[i], pins[j]);
        }
      }
    }

    // TODO(peter.xu) Maybe bring horizontal ball movement back
    // if (ball.rolling) {
    //   ball.x += ball.vx;
    //   ball.vx *= 0.98;
    // }

    // Move pins
    pins.forEach(p => {
      if (!p.active) return;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;

      // testing stopping the pins
      // var beforeVx = p.vx;
      // var decimalPlaces = 22;
      // var decimalNumber = Math.pow(10, decimalPlaces);
      // p.vx = -1 * Math.abs(Math.ceil(p.vx * decimalNumber) / decimalNumber);
      // p.vy = -1 * Math.abs(Math.ceil(p.vy * decimalNumber) / decimalNumber);
      // console.log(`Pin ${p.id} vx: ${beforeVx} -> ${p.vx}, vy: ${p.vy}`);

      // check gutters/out
      if (
        p.x < lane.x - lane.gutterWidth ||
        p.x > lane.x + lane.width + lane.gutterWidth ||
        p.y < lane.y ||
        p.y > lane.y + lane.height
      ) {
        p.active = false;
      }
    });
  }

  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const overlap = a.r + b.r - dist;
    if (overlap > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * overlap / 2;
      a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2;
      b.y += ny * overlap / 2;
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
      a.vx -= ix * invMassA;
      a.vy -= iy * invMassA;
      b.vx += ix * invMassB;
      b.vy += iy * invMassB;

      if ("hit" in b) {
        b.hit = true;
      }
      if ("hit" in a) {
        a.hit = true;
      }
    }
  }  
}
