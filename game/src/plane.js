// Ridge Runner — the aircraft: arcade flight physics and the plane itself,
// drawn with canvas paths so it looks built, not clip-art.

import { PHYSICS, PLANE, COLORS, FUEL } from './config.js';

export function makePlane() {
  return {
    x: 120, // world px (camera follows, plane sits left of centre)
    y: 300, // world px (screen y grows down, so smaller = higher)
    speed: 150, // px/s forward
    pitch: 0, // rad, + = nose up
    throttle: 0.55, // 0..1
    boost: false,
    fuel: 100,
    damage: 0,
    stalled: false,
    crashed: false,
    landed: false,
    vspeed: 0, // vertical speed, px/s (+ = sinking)
    bank: 0, // visual roll, rad
  };
}

// One physics step. `input` is {up, down, left, right, boost}.
// `gust` is the storm's vertical push in px/s^2. Returns events.
export function stepPlane(p, input, dt, gust) {
  const events = [];
  if (p.crashed || p.landed) return events;

  // Throttle: right adds power, left pulls it back.
  if (input.right) p.throttle = Math.min(1, p.throttle + 0.9 * dt);
  if (input.left) p.throttle = Math.max(0, p.throttle - 0.9 * dt);

  // Pitch: up climbs, down dives; the nose moves at a fixed rate.
  let target = 0;
  if (input.up) target = PHYSICS.maxPitch;
  if (input.down) target = -PHYSICS.maxPitch;
  const rate = PHYSICS.pitchRate * dt;
  p.pitch += Math.max(-rate, Math.min(rate, target - p.pitch));
  p.bank += ((input.up ? -0.22 : input.down ? 0.22 : 0) - p.bank) * Math.min(1, 6 * dt);

  // Speed: throttle pushes, drag and climbing pull back.
  const boost = input.boost && p.fuel > 0;
  p.boost = boost;
  const thrust = PHYSICS.accel * p.throttle * (boost ? PHYSICS.boostMult : 1);
  const drag = PHYSICS.drag * p.speed + (p.pitch > 0.25 ? PHYSICS.climbDrag * p.speed * p.pitch : 0);
  p.speed += (thrust - drag) * dt;
  p.speed = Math.max(0, Math.min(PHYSICS.maxSpeed * (boost ? PHYSICS.boostMult : 1), p.speed));

  // Stall: too slow and the nose drops, the plane sinks.
  p.stalled = p.speed < PHYSICS.minSpeed;
  if (p.stalled && !p._stallWarned) {
    p._stallWarned = true;
    events.push('stall');
  } else if (!p.stalled) {
    p._stallWarned = false;
  }

  // Vertical speed from pitch and lift; gravity wins when stalled.
  const lift = Math.sin(p.pitch) * p.speed * PHYSICS.lift;
  let vy = -lift + PHYSICS.gravity * (p.stalled ? 2.2 : 0.55);
  vy += gust * dt;
  if (p.stalled) vy += PHYSICS.stallSink * 0.4;
  p.vspeed = vy;
  p.y += vy * dt;
  p.x += p.speed * dt;

  // Fuel: throttle burns it, boost burns it faster.
  p.fuel -= burnFuel(p.throttle, boost) * dt;
  if (p.fuel <= 0) {
    p.fuel = 0;
    p.throttle = 0;
    events.push('fuel-out');
  }
  return events;
}

// Fuel burn in units per second for a throttle setting.
// Idle sips, full throttle drinks, boost gulps — tuned so a full tank
// covers a whole mission at cruise throttle, with canisters as a buffer.
export function burnFuel(throttle, boost) {
  const base = FUEL.burnIdle + throttle * FUEL.burnPerThrottle;
  return base + (boost ? PHYSICS.boostBurn : 0);
}

// Draw the plane at screen position (sx, sy), rotated by pitch.
export function drawPlane(ctx, p, sx, sy) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.pitch * 0.9 + p.bank * 0.4);
  ctx.scale(1, 1);

  // Fuselage: a sleek courier dart with a red cheatline.
  ctx.fillStyle = COLORS.planeBody;
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.quadraticCurveTo(18, -9, -6, -8);
  ctx.quadraticCurveTo(-26, -7, -30, -2);
  ctx.quadraticCurveTo(-26, 4, -8, 6);
  ctx.quadraticCurveTo(16, 8, 34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeWing;
  ctx.fillRect(-8, -1.5, 26, 3); // cheatline

  // Canopy: lit glass.
  ctx.fillStyle = COLORS.planeGlass;
  ctx.beginPath();
  ctx.moveTo(16, -7);
  ctx.quadraticCurveTo(8, -13, -2, -8);
  ctx.lineTo(10, -5);
  ctx.closePath();
  ctx.fill();

  // Main wing and tail, swept back.
  ctx.fillStyle = COLORS.planeWing;
  ctx.beginPath();
  ctx.moveTo(2, -4);
  ctx.lineTo(-14, -26);
  ctx.lineTo(-20, -26);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-24, -4);
  ctx.lineTo(-34, -16);
  ctx.lineTo(-38, -15);
  ctx.lineTo(-28, -2);
  ctx.closePath();
  ctx.fill();

  // Propeller blur at the nose.
  ctx.strokeStyle = 'rgba(230, 230, 220, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(35, 0, 3, 13, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
