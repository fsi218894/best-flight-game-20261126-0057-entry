// Ridge Runner — screenshot states: ?shot=start|play|land|end puts the game
// in a fixed, deterministic scene so the screenshots are real renders of
// the game's own code, taken in a browser, never edited or composited.

import { SCREENS, startMission } from './game.js';

// Parse the ?shot= query param, if any.
export function shotParam() {
  const q = new URLSearchParams(window.location.search);
  return q.get('shot');
}

// Place the game in the requested scene. Called once at startup.
export function applyShot(g, shot) {
  if (!shot) return false;
  if (shot === 'start') {
    // Title screen over the first mission's world.
    startMission(g, 0);
    g.screen = SCREENS.TITLE;
    g.plane.x = 120;
    g.plane.y = 300;
    return true;
  }
  if (shot === 'play') {
    // Mid-flight: through the second ring, HUD lit, terrain below.
    startMission(g, 0);
    g.screen = SCREENS.PLAYING;
    g.plane.x = 2400;
    g.plane.y = 300;
    g.plane.speed = 240;
    g.plane.throttle = 0.7;
    g.plane.pitch = 0.08;
    g.plane.fuel = 72;
    g.score = 200;
    g.ringsHit = 2;
    g.world.rings[0].passed = true;
    g.world.rings[1].passed = true;
    g.cameraX = g.plane.x - 320;
    g.time = 12.4;
    return true;
  }
  if (shot === 'land') {
    // Final approach: low over the runway, gear down in spirit.
    startMission(g, 1);
    g.screen = SCREENS.PLAYING;
    g.plane.x = 11900;
    g.plane.y = 560;
    g.plane.speed = 170;
    g.plane.throttle = 0.35;
    g.plane.pitch = -0.04;
    g.plane.fuel = 41;
    g.score = 150;
    g.hasParcel = true;
    g.world.rings[0].passed = true;
    g.cameraX = g.plane.x - 320;
    g.time = 48.2;
    return true;
  }
  if (shot === 'end') {
    // Mission complete screen with a score breakdown.
    startMission(g, 0);
    g.screen = SCREENS.COMPLETE;
    g.score = 1240;
    g.ringsHit = 8;
    g.cansHit = 2;
    g.time = 96.3;
    g.endReason = 'All rings cleared in 96.3s — time bonus +204.';
    return true;
  }
  return false;
}
