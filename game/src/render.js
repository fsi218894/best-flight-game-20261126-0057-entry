// Ridge Runner — rendering: sky, parallax ridges, terrain, town, runway,
// rings, the plane and the full HUD with lit instruments. Everything is
// drawn on one canvas, so the screenshots show exactly what the pilot sees.

import { COLORS, VIEW, SCORES, MISSIONS } from './config.js';
import { SCREENS, missionProgress } from './game.js';
import { drawPlane } from './plane.js';
import { nextRing } from './terrain.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function drawSky(ctx, camX, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.skyMid);
  g.addColorStop(0.85, COLORS.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Low sun, drifting slowly with the camera.
  const sunX = VIEW.width - 210 - (camX * 0.02) % 200;
  const sunY = 150;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
  glow.addColorStop(0, COLORS.sunCore);
  glow.addColorStop(0.25, COLORS.sun);
  glow.addColorStop(1, 'rgba(255, 217, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 120, sunY - 120, 240, 240);
  ctx.fillStyle = COLORS.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();

  // Clouds: soft ellipses on two parallax layers.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 9; i++) {
    const cx = ((i * 397 + 120 - camX * 0.12) % 1500 + 1500) % 1500 - 110;
    const cy = 60 + (i % 4) * 42 + Math.sin(time * 0.2 + i) * 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 + (i % 3) * 22, 16 + (i % 3) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ridge(ctx, camX, factor, color, baseY, amp, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-4, VIEW.height);
  for (let sx = -4; sx <= VIEW.width + 4; sx += 16) {
    const wx = camX * factor + sx;
    const y = baseY - (Math.sin(wx * 0.004 + seed) * 0.5 + Math.sin(wx * 0.011 + seed * 2) * 0.3 + Math.sin(wx * 0.027 + seed * 3) * 0.2) * amp;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(VIEW.width + 4, VIEW.height);
  ctx.closePath();
  ctx.fill();
}

function drawTerrain(ctx, world, camX) {
  // Far and near ridges for depth.
  ridge(ctx, camX, 0.25, COLORS.mountainFar, 560, 90, 1.7);
  ridge(ctx, camX, 0.5, COLORS.mountainNear, 600, 70, 4.2);

  // The ground itself, filled down to the bottom of the screen.
  const g0 = world.ground[0];
  ctx.fillStyle = COLORS.ground;
  ctx.beginPath();
  ctx.moveTo(-4, VIEW.height);
  for (const pt of world.ground) {
    const sx = pt.x - camX;
    if (sx < -40 || sx > VIEW.width + 40) continue;
    ctx.lineTo(sx, pt.y);
  }
  ctx.lineTo(VIEW.width + 4, VIEW.height);
  ctx.closePath();
  ctx.fill();

  // Grassy crest line.
  ctx.strokeStyle = COLORS.grass;
  ctx.lineWidth = 5;
  ctx.beginPath();
  let started = false;
  for (const pt of world.ground) {
    const sx = pt.x - camX;
    if (sx < -40 || sx > VIEW.width + 40) continue;
    if (!started) {
      ctx.moveTo(sx, pt.y);
      started = true;
    } else ctx.lineTo(sx, pt.y);
  }
  ctx.stroke();

  // The river: a flat blue band in the valley.
  ctx.fillStyle = COLORS.river;
  ctx.fillRect(2400 - camX, VIEW.groundBase - 62, 1000, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(2500 - camX, VIEW.groundBase - 58, 800, 3);

  // Pine trees.
  for (const t of world.trees) {
    const sx = t.x - camX;
    if (sx < -30 || sx > VIEW.width + 30) continue;
    const gy = world.groundAt(t.x);
    const h = 34 * t.s;
    ctx.strokeStyle = COLORS.tree;
    ctx.lineWidth = 4 * t.s;
    ctx.beginPath();
    ctx.moveTo(sx, gy);
    ctx.lineTo(sx + t.lean * 20, gy - h * 0.4);
    ctx.stroke();
    ctx.fillStyle = COLORS.treeTop;
    ctx.beginPath();
    ctx.moveTo(sx + t.lean * 20, gy - h);
    ctx.lineTo(sx - 12 * t.s, gy - h * 0.45);
    ctx.lineTo(sx + 12 * t.s, gy - h * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  // The town: blocks with lit windows.
  for (const b of world.town) {
    const sx = b.x - camX;
    if (sx < -120 || sx > VIEW.width + 120) continue;
    const gy = world.groundAt(b.x + b.w / 2);
    ctx.fillStyle = COLORS.townWall;
    ctx.fillRect(sx, gy - b.h, b.w, b.h);
    ctx.fillStyle = COLORS.townRoof;
    ctx.beginPath();
    ctx.moveTo(sx - 4, gy - b.h);
    ctx.lineTo(sx + b.w / 2, gy - b.h - 16);
    ctx.lineTo(sx + b.w + 4, gy - b.h);
    ctx.closePath();
    ctx.fill();
    if (b.lit) {
      ctx.fillStyle = COLORS.windowLit;
      for (let wy = gy - b.h + 12; wy < gy - 10; wy += 22) {
        for (let wx = sx + 8; wx < sx + b.w - 10; wx += 20) {
          ctx.fillRect(wx, wy, 9, 12);
        }
      }
    }
  }

  // The runway: dark strip, centre line, edge lights.
  const rw = world.runway;
  const rx = rw.x - camX;
  if (rx < VIEW.width + 100 && rx + rw.w > -100) {
    ctx.fillStyle = COLORS.runway;
    ctx.fillRect(rx, rw.y, rw.w, 14);
    ctx.fillStyle = COLORS.runwayLine;
    for (let x = rx + 20; x < rx + rw.w - 20; x += 60) ctx.fillRect(x, rw.y + 5, 34, 4);
    ctx.fillStyle = COLORS.windowLit;
    for (let x = rx + 10; x < rx + rw.w; x += 90) {
      ctx.beginPath();
      ctx.arc(x, rw.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Runway sign.
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('RWY 09', rx + 30, rw.y - 16);
  }
}

function drawRings(ctx, world, camX, time) {
  for (const r of world.rings) {
    const sx = r.x - camX;
    if (sx < -80 || sx > VIEW.width + 80) continue;
    const pulse = 1 + Math.sin(time * 3 + r.x * 0.01) * 0.05;
    ctx.save();
    ctx.translate(sx, r.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = r.passed ? 'rgba(126, 231, 135, 0.5)' : COLORS.ringGlow;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = r.passed ? '#7ee787' : COLORS.ring;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r.r, 0, Math.PI * 2);
    ctx.stroke();
    // Chevrons pointing the way through.
    ctx.fillStyle = r.passed ? '#7ee787' : COLORS.ring;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, 0);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCans(ctx, world, camX, time) {
  for (const c of world.cans) {
    if (c.taken) continue;
    const sx = c.x - camX;
    if (sx < -40 || sx > VIEW.width + 40) continue;
    const y = c.y + Math.sin(time * 2 + c.bob) * 8;
    ctx.save();
    ctx.translate(sx, y);
    ctx.fillStyle = COLORS.canister;
    ctx.beginPath();
    ctx.roundRect(-13, -18, 26, 36, 6);
    ctx.fill();
    ctx.fillStyle = '#12351a';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', 0, 1);
    ctx.restore();
  }
}

function drawParticles(ctx, g, camX) {
  for (const p of g.particles) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- HUD ----

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function drawHud(ctx, g) {
  const p = g.plane;
  const m = g.mission;
  ctx.textBaseline = 'alphabetic';

  // Top-left: the flight instruments, read at a glance.
  panel(ctx, 16, 14, 300, 92);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const altFt = Math.max(0, Math.round((VIEW.groundBase - p.y) * 3));
  const spdKt = Math.round(p.speed * 0.9);
  ctx.fillText(`ALT ${altFt} ft`, 30, 46);
  ctx.fillText(`SPD ${spdKt} kt`, 30, 80);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(`HDG 090°  V/S ${p.vspeed > 0 ? '+' : ''}${Math.round(p.vspeed)}`, 170, 46);
  ctx.fillText(`THR ${Math.round(p.throttle * 100)}%`, 170, 80);

  // Top-right: fuel, score, objective.
  panel(ctx, VIEW.width - 316, 14, 300, 92);
  ctx.textAlign = 'right';
  ctx.fillStyle = p.fuel < 25 ? COLORS.hudWarn : COLORS.hud;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`FUEL ${Math.round(p.fuel)}%`, VIEW.width - 30, 46);
  ctx.fillStyle = COLORS.hud;
  ctx.fillText(`SCORE ${g.score}`, VIEW.width - 30, 80);
  // Fuel bar.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(VIEW.width - 300, 96, 270, 8);
  ctx.fillStyle = p.fuel < 25 ? COLORS.hudWarn : COLORS.hudGood;
  ctx.fillRect(VIEW.width - 300, 96, 270 * (p.fuel / 100), 8);

  // Mission strip, centred.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(`${m.name} — ${m.goal}`, VIEW.width / 2, 34);
  const prog = missionProgress(g);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(VIEW.width / 2 - 110, 44, 220, 7);
  ctx.fillStyle = COLORS.hudGood;
  ctx.fillRect(VIEW.width / 2 - 110, 44, 220 * prog, 7);

  // Damage pips, under the instruments.
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('HULL', 30, 132);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < 3 - p.damage ? COLORS.hudGood : COLORS.hudWarn;
    ctx.beginPath();
    ctx.arc(92 + i * 26, 126, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stall / fuel warnings, flashing.
  if (p.stalled && g.screen === SCREENS.PLAYING && Math.floor(g.time * 4) % 2 === 0) {
    ctx.fillStyle = COLORS.hudWarn;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STALL — ADD THROTTLE', VIEW.width / 2, 150);
  }

  // The attitude indicator: a lit artificial horizon, bottom-left.
  drawAttitude(ctx, 76, VIEW.height - 76, 56, p.pitch, p.bank);

  // Throttle gauge, bottom-right.
  panel(ctx, VIEW.width - 116, VIEW.height - 116, 100, 100);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(VIEW.width - 66, VIEW.height - 66, 34, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = p.boost ? COLORS.hudWarn : COLORS.hudGood;
  ctx.beginPath();
  ctx.arc(VIEW.width - 66, VIEW.height - 66, 34, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * p.throttle));
  ctx.stroke();
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', VIEW.width - 66, VIEW.height - 62);
  if (p.boost) {
    ctx.fillStyle = COLORS.hudWarn;
    ctx.fillText('BOOST', VIEW.width - 66, VIEW.height - 30);
  }

  // Transient message, centre screen.
  if (g.message && g.time - g.messageAt < 2.6) {
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.message, VIEW.width / 2, 190);
  }
}

function drawAttitude(ctx, cx, cy, r, pitch, bank) {
  ctx.save();
  ctx.translate(cx, cy);
  // Bezel.
  ctx.fillStyle = COLORS.hudPanel;
  ctx.beginPath();
  ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  // Sky above the horizon, ground below, rolled with the bank.
  ctx.rotate(bank * 0.6);
  const horizonY = clamp(pitch * r * 1.4, -r, r);
  ctx.fillStyle = '#3f6ea8';
  ctx.fillRect(-r, -r, r * 2, r + horizonY);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-r, horizonY, r * 2, r - horizonY + r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, horizonY);
  ctx.lineTo(r, horizonY);
  ctx.stroke();
  ctx.restore();
  // Fixed wings marker.
  ctx.strokeStyle = COLORS.hud;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r + 8, cy);
  ctx.lineTo(cx - 12, cy);
  ctx.moveTo(cx + 12, cy);
  ctx.lineTo(cx + r - 8, cy);
  ctx.stroke();
  ctx.fillStyle = COLORS.hud;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Screens ----

function overlay(ctx) {
  ctx.fillStyle = 'rgba(8, 14, 28, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, g, input) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('RIDGE RUNNER', VIEW.width / 2, 150);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('A low-level courier flight over the ridge — rings, fuel, landings.', VIEW.width / 2, 192);
  // Mission cards.
  g._menuRects = [];
  MISSIONS.forEach((mm, i) => {
    const x = VIEW.width / 2 - 480 + i * 330;
    const y = 250;
    const w = 300;
    const h = 170;
    const hover = input.state.mouse.x > x && input.state.mouse.x < x + w && input.state.mouse.y > y && input.state.mouse.y < y + h;
    g._menuRects.push({ x, y, w, h, i });
    ctx.fillStyle = hover ? 'rgba(126, 231, 135, 0.22)' : COLORS.hudPanel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = i === g.missionIndex ? COLORS.hudGood : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(mm.name, x + w / 2, y + 44);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = COLORS.hudDim;
    wrapText(ctx, mm.blurb, x + w / 2, y + 76, w - 32, 22);
    ctx.fillStyle = COLORS.hudGood;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(i === 0 ? 'Click or press 1' : i === 1 ? 'Click or press 2' : 'Click or press 3', x + w / 2, y + 142);
  });
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Fly: ↑ climb · ↓ dive · → throttle up · ← throttle down · Space boost · P pause · M mute', VIEW.width / 2, 480);
  ctx.fillText('Land gently on the runway: slow, level, low descent. Rings pay 100, fuel cans 50, landings 500.', VIEW.width / 2, 512);
  if (g.stats.best > 0) {
    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`Best score so far: ${g.stats.best}`, VIEW.width / 2, 560);
  }
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Original game by an AI agent for make.fun — no copied art, names or levels.', VIEW.width / 2, 640);
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, cx, yy);
}

function drawEnd(ctx, g, title, color) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText(title, VIEW.width / 2, 220);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(g.endReason, VIEW.width / 2, 268);
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(`Score ${g.score}   ·   Rings ${g.ringsHit}/${g.mission.rings}   ·   Fuel cans ${g.cansHit}   ·   Time ${g.time.toFixed(1)}s`, VIEW.width / 2, 340);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Press R to fly again, or Enter for the mission menu.', VIEW.width / 2, 400);
}

export function render(ctx, g, input) {
  const camX = g.cameraX;
  ctx.save();
  if (g.shake > 0) {
    ctx.translate((Math.random() - 0.5) * g.shake * 14, (Math.random() - 0.5) * g.shake * 14);
  }
  drawSky(ctx, camX, g.time);
  if (g.world) {
    drawTerrain(ctx, g.world, camX);
    drawRings(ctx, g.world, camX, g.time);
    drawCans(ctx, g.world, camX, g.time);
    drawParticles(ctx, g, camX);
    // The plane sits left of centre; the camera follows it.
    const px = g.plane.x - camX;
    if (!g.plane.crashed) drawPlane(ctx, g.plane, px, g.plane.y);
    // Next-ring guide arrow at the screen edge.
    const ring = nextRing(g.world);
    if (ring && g.screen === SCREENS.PLAYING) {
      const rx = ring.x - camX;
      if (rx > VIEW.width - 40 || rx < 40) {
        const ax = clamp(rx, 60, VIEW.width - 60);
        ctx.fillStyle = COLORS.ring;
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rx > VIEW.width - 40 ? 'RING →' : '← RING', ax, 210);
      }
    }
  }
  ctx.restore();

  if (g.screen === SCREENS.PLAYING || g.screen === SCREENS.PAUSED) drawHud(ctx, g);
  if (g.screen === SCREENS.TITLE) drawTitle(ctx, g, input);
  if (g.screen === SCREENS.PAUSED) {
    overlay(ctx);
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = COLORS.hudDim;
    ctx.fillText('Press P to keep flying.', VIEW.width / 2, VIEW.height / 2 + 40);
  }
  if (g.screen === SCREENS.CRASHED) drawEnd(ctx, g, 'CRASHED', COLORS.hudWarn);
  if (g.screen === SCREENS.LANDED) drawEnd(ctx, g, 'LANDED', COLORS.hudGood);
  if (g.screen === SCREENS.COMPLETE) drawEnd(ctx, g, 'MISSION COMPLETE', COLORS.hudGood);
}
