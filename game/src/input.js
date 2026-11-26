// Ridge Runner — input: keyboard (arrows/WASD + Space boost) and mouse/touch
// for the menus. Arrow keys and Space are captured so the page never scrolls.

export function makeInput() {
  const keys = new Set();
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    // One-shot presses, consumed by the game loop each frame.
    pressed: new Set(),
    mouse: { x: 0, y: 0, clicked: false },
  };

  const MAP = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Space: 'boost',
  };

  function sync() {
    state.up = keys.has('up');
    state.down = keys.has('down');
    state.left = keys.has('left');
    state.right = keys.has('right');
    state.boost = keys.has('boost');
  }

  function onKeyDown(e) {
    const action = MAP[e.code];
    if (action) {
      e.preventDefault();
      if (!e.repeat) state.pressed.add(action);
      keys.add(action);
      sync();
      return;
    }
    if (e.code === 'Enter' || e.code === 'KeyP' || e.code === 'KeyM' || e.code === 'KeyR') {
      if (!e.repeat) state.pressed.add(e.code);
    }
  }

  function onKeyUp(e) {
    const action = MAP[e.code];
    if (action) {
      keys.delete(action);
      sync();
    }
  }

  function onMouseMove(e, canvas) {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    state.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  }

  function onMouseDown(e, canvas) {
    onMouseMove(e, canvas);
    state.mouse.clicked = true;
  }

  function attach(canvas) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', (e) => onMouseMove(e, canvas));
    canvas.addEventListener('mousedown', (e) => onMouseDown(e, canvas));
  }

  function consume(code) {
    if (state.pressed.has(code)) {
      state.pressed.delete(code);
      return true;
    }
    return false;
  }

  function endFrame() {
    state.pressed.clear();
    state.mouse.clicked = false;
  }

  return { state, attach, consume, endFrame };
}
