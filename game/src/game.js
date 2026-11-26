// Ridge Runner — the game itself: state machine, missions, scoring,
// collisions, particles and the win/lose rules. Rendering lives in render.js.

import { MISSIONS, SCORES, VIEW, PHYSICS } from './config.js';
import { buildWorld, nextRing } from './terrain.js';
import { makePlane, stepPlane } from './plane.js';

export const SCREENS = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LANDED: 'landed',
  CRASHED: 'crashed',
  COMPLETE: 'complete',
};

export function makeGame() {
  return {
    screen: SCREENS.TITLE,
    missionIndex: 0,
    mission: MISSIONS[0],
    world: null,
    plane: makePlane(),
    cameraX: 0,
    score: 0,
    time: 0,
    ringsHit: 0,
    cansHit: 0,
    hasParcel: false,
    nearMissAt: -10,
    particles: [],
    shake: 0,
    message: '',
    messageAt: -10,
    stats: { best: 0 },
    endReason: '',
  };
}

export function startMission(g, index) {
  g.missionIndex = index;
  g.mission = MISSIONS[index];
  g.world = buildWorld(g.mission);
  g.plane = makePlane();
  g.plane.fuel = g.mission.fuel;
  g.plane.x = 120;
  g.plane.y = 300;
  g.cameraX = 0;
  g.score = 0;
  g.time = 0;
  g.ringsHit = 0;
  g.cansHit = 0;
  g.hasParcel = false;
  g.particles = [];
  g.shake = 0;
  g.screen = SCREENS.PLAYING;
  g.endReason = '';
  say(g, `${g.mission.name} — ${g.mission.goal}`);
}

function say(g, text) {
  g.message = text;
  g.messageAt = g.time;
}

function burst(g, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40,
      life: 0.5 + Math.random() * 0.7,
      age: 0,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function stepParticles(g, dt) {
  for (const p of g.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  g.particles = g.particles.filter((p) => p.age < p.life);
}

// The storm's vertical push at the plane's position, px/s^2.
function gustAt(g) {
  if (!g.mission.storm) return 0;
  const w = g.world;
  let gust = 0;
  for (const c of w.clouds) {
    const dx = Math.abs(g.plane.x - c.x);
    if (dx < 420) {
      const f = 1 - dx / 420;
      gust += c.gust * f * Math.sin(g.time * 1.7 + c.x * 0.01);
    }
  }
  return gust;
}

export function stepGame(g, input, dt, audio) {
  if (g.screen !== SCREENS.PLAYING) {
    stepParticles(g, dt);
    return;
  }
  g.time += dt;
  const p = g.plane;

  // Storm gusts and physics.
  const events = stepPlane(p, input.state, dt, gustAt(g));
  for (const e of events) {
    if (e === 'stall') {
      say(g, 'STALL — add throttle!');
      audio.warn();
    }
    if (e === 'fuel-out') {
      say(g, 'Fuel empty — gliding!');
      audio.warn();
    }
  }
  audio.engine(p.throttle, !p.crashed && !p.landed);

  // Camera follows the plane, keeping it left of centre.
  g.cameraX = Math.max(0, p.x - 320);

  // Terrain collision: scraping the ridge costs damage.
  const gy = g.world.groundAt(p.x);
  if (p.y + 8 >= gy) {
    if (p.landed) return;
    // Landing check: on the runway, slow and gentle, is a landing.
    const rw = g.world.runway;
    const onRunway = p.x > rw.x && p.x < rw.x + rw.w;
    if (onRunway && p.speed < 190 && Math.abs(p.vspeed) < 120 && Math.abs(p.pitch) < 0.3) {
      landPlane(g, audio);
      return;
    }
    crashPlane(g, 'Terrain strike', audio);
    return;
  }

  // Ceiling: the sky has a top.
  if (p.y < 40) {
    p.y = 40;
    p.pitch = Math.min(p.pitch, 0);
  }

  // World end: past the runway with no landing is a long way home.
  if (p.x > g.world.length + 400) {
    if (g.mission.runway) {
      say(g, 'You flew past the runway!');
    }
    crashPlane(g, 'Out of airspace', audio);
    return;
  }

  // Rings: fly through the next one.
  const ring = nextRing(g.world);
  if (ring) {
    const dx = p.x - ring.x;
    const dy = p.y - ring.y;
    const d = Math.hypot(dx, dy);
    if (d < ring.r + 14) {
      ring.passed = true;
      g.ringsHit += 1;
      g.score += SCORES.ring;
      burst(g, ring.x, ring.y, '#ffd76a', 22, 180);
      audio.ring();
      if (g.mission.id === 'courier' && !g.hasParcel) {
        g.hasParcel = true;
        say(g, 'Parcel aboard — land on the runway!');
      } else {
        say(g, `Ring ${g.ringsHit}/${g.mission.rings} — +${SCORES.ring}`);
      }
      if (g.ringsHit >= g.mission.rings && !g.mission.runway) {
        completeMission(g, audio);
        return;
      }
    }
  }

  // Fuel canisters.
  for (const c of g.world.cans) {
    if (c.taken) continue;
    const d = Math.hypot(p.x - c.x, p.y - (c.y + Math.sin(g.time * 2 + c.bob) * 8));
    if (d < 60) {
      c.taken = true;
      g.cansHit += 1;
      p.fuel = Math.min(100, p.fuel + 35);
      g.score += SCORES.canister;
      burst(g, c.x, c.y, '#7ee787', 16, 140);
      audio.pickup();
      say(g, `Fuel +35 — +${SCORES.canister}`);
    }
  }

  // Near-miss bonus: skimming the ridge without touching it.
  const clearance = gy - (p.y + 8);
  if (clearance > 0 && clearance < 26 && g.time - g.nearMissAt > 2) {
    g.nearMissAt = g.time;
    g.score += SCORES.nearMiss;
    say(g, `Ridge hugger +${SCORES.nearMiss}`);
  }

  // Storm mission: collecting all cans then landing ends it.
  if (g.mission.id === 'storm' && g.cansHit >= g.mission.canisters && g.ringsHit >= g.mission.rings) {
    say(g, 'All cans collected — land on the runway!');
  }

  // Out of fuel and too slow to stay up: glide down and hope.
  if (p.fuel <= 0 && p.speed < 50 && p.y > gy - 120) {
    // Let the plane sink; the terrain check above will decide the landing.
  }

  stepParticles(g, dt);
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 2);
}

function landPlane(g, audio) {
  const p = g.plane;
  p.landed = true;
  p.y = g.world.runway.y - 6;
  p.pitch = 0;
  p.speed = Math.max(0, p.speed - 60);
  g.score += SCORES.landing;
  const fuelBonus = Math.round(p.fuel) * 2;
  g.score += fuelBonus;
  audio.land();
  burst(g, p.x, p.y + 6, '#e8e4da', 18, 90);
  if (g.mission.id === 'courier' && !g.hasParcel) {
    g.endReason = 'Landed, but the parcel is still out there.';
    g.screen = SCREENS.LANDED;
  } else {
    g.endReason = `Clean landing! +${SCORES.landing} landing, +${fuelBonus} fuel bonus.`;
    g.screen = SCREENS.COMPLETE;
  }
  g.stats.best = Math.max(g.stats.best, g.score);
}

function crashPlane(g, reason, audio) {
  const p = g.plane;
  p.damage += 1;
  g.shake = 1;
  burst(g, p.x, p.y, '#ff5a4e', 40, 260);
  burst(g, p.x, p.y, '#ffd76a', 24, 200);
  audio.crash();
  if (p.damage >= 3) {
    p.crashed = true;
    g.endReason = reason;
    g.screen = SCREENS.CRASHED;
    g.stats.best = Math.max(g.stats.best, g.score);
  } else {
    // A scrape, not a crash: bounce off with damage and keep flying.
    p.y = g.world.groundAt(p.x) - 60;
    p.pitch = -0.3;
    p.speed *= 0.55;
    say(g, `Scrape! Damage ${p.damage}/3 — ${reason}`);
  }
}

function completeMission(g, audio) {
  const timeBonus = Math.max(0, Math.round((300 - g.time) * SCORES.timeBonusPerSecond / 10));
  g.score += timeBonus;
  g.endReason = `All rings cleared in ${g.time.toFixed(1)}s — time bonus +${timeBonus}.`;
  g.screen = SCREENS.COMPLETE;
  audio.land();
  g.stats.best = Math.max(g.stats.best, g.score);
}

// Mission progress for the HUD: 0..1.
export function missionProgress(g) {
  if (g.mission.id === 'courier') {
    return g.hasParcel ? 0.5 + (g.plane.landed ? 0.5 : 0) : g.ringsHit / Math.max(1, g.mission.rings) * 0.5;
  }
  if (g.mission.id === 'storm') {
    return (g.cansHit / Math.max(1, g.mission.canisters)) * 0.7 + (g.plane.landed ? 0.3 : 0);
  }
  return g.ringsHit / Math.max(1, g.mission.rings);
}
