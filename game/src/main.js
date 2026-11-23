// Vice Shores — the entry point: the canvas, the game loop, the screens (title,
// play, pause, busted, wasted) and the deterministic screenshot mode behind
// ?shot=chase|street|beach|title&seed=N.
import { createWorld, stepWorld, computeCamera } from './world.js';
import { drawGame, drawTitleScreen, drawPauseScreen, drawEndScreen } from './render.js';
import { Input } from './input.js';
import { stageShot } from './shots.js';
import { saveGame, loadSave, applySave } from './save.js';
import { startMission } from './missions.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

if (shotName) {
  // Screenshot mode: stage one deterministic scene, draw it, and say so.
  const shotWorld = createWorld(seed);
  const screen = stageShot(shotName, shotWorld);
  shotWorld.screen = screen;
  computeCamera(shotWorld, canvas.width, canvas.height);
  if (screen === 'title') {
    drawGame(ctx, shotWorld, canvas.width, canvas.height, false);
    drawTitleScreen(ctx, shotWorld, canvas.width, canvas.height);
  } else {
    drawGame(ctx, shotWorld, canvas.width, canvas.height);
  }
  window.__ready = true;
} else {
  const world = createWorld((Date.now() % 100000) | 0);
  const input = new Input(canvas);
  world.best = (loadSave() || {}).best || 0;
  let lastTime = performance.now();
  let firstFrame = true;

  function startNewGame() {
    const fresh = createWorld((Date.now() % 100000) | 0);
    fresh.best = world.best;
    Object.keys(world).forEach((key) => { delete world[key]; });
    Object.assign(world, fresh);
    world.screen = 'play';
    announce('Vice Shores — mission 1: The Courier.');
  }

  function continueSavedGame() {
    const data = loadSave();
    if (!data) return false;
    startNewGame();
    applySave(world, data);
    startMission(world, world.missionIndex);
    world.screen = 'play';
    announce('Vice Shores — your saved game continues.');
    return true;
  }

  window.addEventListener('keydown', (event) => {
    world.sfx.unlock();
    if (event.code === 'Enter') {
      if (world.screen === 'title') startNewGame();
      else if (world.screen === 'busted' || world.screen === 'wasted') startNewGame();
      else if (world.screen === 'pause') world.screen = 'play';
    }
    if (event.code === 'KeyL' && (world.screen === 'title' || world.screen === 'pause')) {
      if (!continueSavedGame()) {
        world.message = { text: 'No saved game yet.', until: world.time + 2 };
      }
    }
    if ((event.code === 'Escape' || event.code === 'KeyP') && world.screen === 'play') {
      world.screen = 'pause';
      announce('Paused.');
    } else if ((event.code === 'Escape' || event.code === 'KeyP') && world.screen === 'pause') {
      world.screen = 'play';
    }
    if (world.screen === 'pause') {
      if (event.code === 'KeyS') {
        saveGame(world);
        world.message = { text: 'Game saved.', until: world.time + 2 };
      }
      if (event.code === 'KeyT') {
        startMission(world, world.missionIndex);
        world.screen = 'play';
      }
      if (event.code === 'KeyQ') {
        world.screen = 'title';
      }
    }
  });
  canvas.addEventListener('mousedown', () => world.sfx.unlock());

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    if (world.screen === 'play') {
      stepWorld(world, input, dt);
      input.endFrame();
    }
    computeCamera(world, canvas.width, canvas.height);
    if (world.screen === 'title') {
      drawGame(ctx, world, canvas.width, canvas.height, false);
      drawTitleScreen(ctx, world, canvas.width, canvas.height);
    } else if (world.screen === 'pause') {
      drawGame(ctx, world, canvas.width, canvas.height);
      drawPauseScreen(ctx, world, canvas.width, canvas.height);
    } else if (world.screen === 'busted' || world.screen === 'wasted') {
      drawGame(ctx, world, canvas.width, canvas.height);
      drawEndScreen(ctx, world, canvas.width, canvas.height);
    } else {
      drawGame(ctx, world, canvas.width, canvas.height);
    }
    if (firstFrame) {
      firstFrame = false;
      window.__ready = true;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
