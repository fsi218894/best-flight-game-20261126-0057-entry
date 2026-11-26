// Ridge Runner — bootstrap: canvas setup, the game loop, screen switching
// and the menu clicks. One frame is one step of physics plus one render.

import { VIEW, MISSIONS } from './config.js';
import { makeGame, startMission, stepGame, SCREENS } from './game.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { render } from './render.js';
import { shotParam, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = makeInput();
input.attach(canvas);
const audio = makeAudio();
const game = makeGame();

// The title screen shows the first mission's world behind it.
startMission(game, 0);
game.screen = SCREENS.TITLE;

const shot = shotParam();
if (shot) {
  applyShot(game, shot);
  // A screenshot scene never advances on its own: freeze the physics so the
  // capture is the same every run.
  game._frozen = true;
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Global keys.
  if (input.consume('KeyM')) {
    const muted = audio.toggleMute();
    game.message = muted ? 'Sound off' : 'Sound on';
    game.messageAt = game.time;
  }

  if (game.screen === SCREENS.TITLE) {
    // Mission cards: click, or press 1/2/3.
    if (input.state.mouse.clicked && game._menuRects) {
      for (const r of game._menuRects) {
        const m = input.state.mouse;
        if (m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h) {
          audio.resume();
          startMission(game, r.i);
          break;
        }
      }
    }
    if (input.consume('Digit1')) { audio.resume(); startMission(game, 0); }
    if (input.consume('Digit2')) { audio.resume(); startMission(game, 1); }
    if (input.consume('Digit3')) { audio.resume(); startMission(game, 2); }
    if (input.consume('Enter')) { audio.resume(); startMission(game, game.missionIndex); }
  } else if (game.screen === SCREENS.PLAYING) {
    if (input.consume('KeyP')) {
      game.screen = SCREENS.PAUSED;
    } else if (!game._frozen) {
      stepGame(game, input, dt, audio);
    }
  } else if (game.screen === SCREENS.PAUSED) {
    if (input.consume('KeyP') || input.consume('Enter')) game.screen = SCREENS.PLAYING;
  } else {
    // Landed / crashed / complete: R restarts, Enter goes to the menu.
    if (input.consume('KeyR')) {
      audio.resume();
      startMission(game, game.missionIndex);
    }
    if (input.consume('Enter')) {
      startMission(game, game.missionIndex);
      game.screen = SCREENS.TITLE;
    }
  }

  // Clicking anywhere on the title screen also starts the audio context.
  if (input.state.mouse.clicked) audio.resume();

  render(ctx, game, input);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
