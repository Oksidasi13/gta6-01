// Vice Shores — keyboard + mouse input, with a scripted-input helper
// so screenshots and tests can drive the game deterministically.

export function createInput() {
  return {
    keys: Object.create(null), // code -> true while held
    mouse: { x: 0, y: 0, down: false, clicked: false, clickedX: 0, clickedY: 0 },
    // Edge-triggered presses consumed once per frame by the game loop.
    pressed: Object.create(null),
    scripted: false,
  };
}

// Attach live listeners. Safe to call in a browser only; does nothing
// in a non-DOM environment (tests import this module in node).
export function attachInput(input, element) {
  if (typeof window === 'undefined' || !element) return;
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!input.keys[e.code]) input.pressed[e.code] = true;
    input.keys[e.code] = true;
  };
  const up = (e) => { input.keys[e.code] = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { input.keys = Object.create(null); });
  element.addEventListener('mousemove', (e) => {
    const r = element.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
  });
  element.addEventListener('mousedown', (e) => {
    const r = element.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
    input.mouse.down = true;
    input.mouse.clicked = true;
    input.mouse.clickedX = input.mouse.x;
    input.mouse.clickedY = input.mouse.y;
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  input._detach = () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}

export function isDown(input, ...codes) {
  return codes.some((c) => !!input.keys[c]);
}

export function wasPressed(input, code) {
  return !!input.pressed[code];
}

// True when any of the given codes was pressed this frame (weapon slots,
// crew abilities and radio all share this pattern).
export function wasPressedAny(input, codes) {
  return codes.some((c) => !!input.pressed[c]);
}

// Clear edge-triggered state at the end of each frame.
export function endFrame(input) {
  input.pressed = Object.create(null);
  input.mouse.clicked = false;
}

// Scripted input for deterministic screenshots: pretend keys are held.
export function setScriptedKeys(input, codes) {
  input.scripted = true;
  input.keys = Object.create(null);
  for (const c of codes) input.keys[c] = true;
}

export function setScriptedMouse(input, x, y, down = false) {
  input.mouse.x = x;
  input.mouse.y = y;
  input.mouse.down = down;
}
