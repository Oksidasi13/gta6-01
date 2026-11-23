// Vice Shores — input: keyboard and mouse, with edge-triggered keys the world
// consumes once per frame (so one press is one action, never a held-down repeat).
export class Input {
  constructor(canvas) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sprint = false;
    this.handbrake = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mousePressed = false;
    this.pressed = new Set();
    this.canvas = canvas;
    this.attach(canvas);
  }

  attach(canvas) {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      this.setKey(event.code, true);
      this.pressed.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.setKey(event.code, false);
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
      this.mousePressed = true;
    });
    canvas.addEventListener('mouseup', () => {
      this.mousePressed = false;
    });
  }

  setKey(code, down) {
    if (code === 'KeyW' || code === 'ArrowUp') this.up = down;
    if (code === 'KeyS' || code === 'ArrowDown') this.down = down;
    if (code === 'KeyA' || code === 'ArrowLeft') this.left = down;
    if (code === 'KeyD' || code === 'ArrowRight') this.right = down;
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.sprint = down;
    if (code === 'Space') this.handbrake = down;
  }

  /** True once for each press since the last frame; clears the flag. */
  consume(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  /** End-of-frame housekeeping: the mouse click is a one-frame action. */
  endFrame() {
    this.mousePressed = false;
  }

  /** The mouse position in world coordinates, through the camera. */
  aimWorld(camera) {
    if (!camera) return { x: 0, y: 0 };
    return { x: camera.x + this.mouseX, y: camera.y + this.mouseY };
  }
}

/** A scripted input for the deterministic screenshot scenes: no DOM, no events. */
export function makeScriptedInput(overrides) {
  return {
    up: false, down: false, left: false, right: false,
    sprint: false, handbrake: false,
    mouseX: 0, mouseY: 0, mousePressed: false,
    pressed: new Set(),
    consume() { return false; },
    endFrame() {},
    aimWorld(camera) { return { x: camera ? camera.x + 640 : 0, y: camera ? camera.y + 360 : 0 }; },
    ...(overrides || {}),
  };
}
