// Ridge Runner — the world: a procedural ridge with hills, a river, pine
// trees, a little town and a runway, plus the mission's rings and fuel cans.
// The world is built once per mission from its seed, so it never changes
// mid-flight. Distances are in world px; the camera follows the plane.

import { makeNoise, mulberry32, range } from './random.js';
import { VIEW, PLANE } from './config.js';

const WORLD_LENGTH = 14000; // px of flyable world per mission

export function buildWorld(mission) {
  const noise = makeNoise(mission.seed);
  const rand = mulberry32(mission.seed * 7 + 13);
  const ground = [];
  const step = 20;
  for (let x = 0; x <= WORLD_LENGTH; x += step) {
    // A rolling ridge: mostly gentle, with a few steep climbs.
    let h = 130 + noise(x / 900) * 150;
    if (x > 2400 && x < 3400) h = Math.min(h, 70); // river valley
    if (x > 11800) h = 40; // flat approach to the runway
    ground.push({ x, y: VIEW.groundBase - Math.max(30, h) });
  }
  const groundAt = (x) => {
    const i = Math.max(0, Math.min(ground.length - 2, Math.floor(x / step)));
    const a = ground[i];
    const b = ground[i + 1];
    const f = (x - a.x) / step;
    return a.y + (b.y - a.y) * f;
  };

  // Pine trees scattered on the ridge (never on the runway flat).
  const trees = [];
  for (let x = 300; x < 11500; x += range(rand, 90, 260)) {
    if (x > 2400 && x < 3400) continue; // river has no trees
    trees.push({ x, s: range(rand, 0.7, 1.4), lean: range(rand, -0.08, 0.08) });
  }

  // A small town with lit windows, sitting in a hollow.
  const town = [];
  let tx = 5200;
  while (tx < 6400) {
    const w = range(rand, 46, 90);
    const h = range(rand, 40, 110);
    town.push({ x: tx, w, h, lit: rand() > 0.35 });
    tx += w + range(rand, 14, 40);
  }

  // The runway: a flat strip near the end of the world.
  const runway = { x: 12100, w: 1100, y: VIEW.groundBase - 40 };

  // Target rings: spread along the route, at flyable heights.
  const rings = [];
  const ringXs = [];
  for (let i = 0; i < mission.rings; i++) {
    ringXs.push(900 + (i * (WORLD_LENGTH - 2600)) / Math.max(1, mission.rings));
  }
  for (const x of ringXs) {
    const gy = groundAt(x);
    rings.push({
      x,
      y: gy - range(rand, 130, 260),
      r: PLANE.ringRadius,
      passed: false,
    });
  }
  // The courier pickup ring sits low over the town.
  if (mission.id === 'courier' && rings.length) {
    rings[0].x = 5800;
    rings[0].y = groundAt(5800) - 150;
  }

  // Fuel canisters float above the ridge.
  const cans = [];
  for (let i = 0; i < mission.canisters; i++) {
    const x = 1500 + (i * (WORLD_LENGTH - 3200)) / Math.max(1, mission.canisters) + range(rand, -150, 150);
    cans.push({ x, y: groundAt(x) - range(rand, 160, 300), taken: false, bob: rand() * Math.PI * 2 });
  }

  // Storm clouds for the storm mission: gusts push the plane.
  const clouds = [];
  for (let i = 0; i < (mission.storm ? 7 : 3); i++) {
    clouds.push({
      x: range(rand, 400, WORLD_LENGTH - 800),
      y: range(rand, 60, 220),
      s: range(rand, 0.8, 1.6),
      gust: mission.storm ? range(rand, -90, 90) : 0,
    });
  }

  return { ground, groundAt, trees, town, runway, rings, cans, clouds, length: WORLD_LENGTH };
}

// The nearest ring the plane has not passed yet.
export function nextRing(world) {
  return world.rings.find((r) => !r.passed) ?? null;
}
