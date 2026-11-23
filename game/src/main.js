// Vice Shores — game loop and screen state machine.
// Screens: title -> playing <-> paused, busted, wasted, complete.
// With ?shot=<name>&seed=<n> in the URL, renders exactly one staged frame
// (for screenshots) and sets window.__shotReady.

import { createWorld, updateWorld } from './world.js';
import { createInput, attachInput, endFrame, wasPressed } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame } from './save.js';
import { renderWorld, drawTitleScreen, drawOverlay } from './render.js';
import { drawHUD } from './hud.js';
import { drawMinimap } from './minimap.js';
import { stageShot } from './shots.js';
import { MARKERS } from './config.js';

const VIEW_W = 1280;
const VIEW_H = 720;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const save = loadSave();
const audio = createAudio();
audio.setMuted(save.muted);

const input = createInput();
attachInput(input, canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || '1');

const world = createWorld(shotSeed || 1337);
world.player.money = save.money;
world.player.rp = save.rp;
world.combat.smgUnlocked = save.smgUnlocked;
world.missions.index = Math.min(save.missionIndex, 7);
world.input = input;

let screen = 'title'; // 'title' | 'playing' | 'paused' | 'busted' | 'wasted' | 'complete'
let lastTime = performance.now();
let saveTimer = 0;

function persist() {
  save.money = world.player.money;
  save.missionIndex = world.missions.done ? 8 : world.missions.index;
  save.bestScore = Math.max(save.bestScore, world.player.money + world.missions.earned);
  save.muted = audio.muted;
  save.rp = world.player.rp;
  save.smgUnlocked = world.combat.smgUnlocked;
  saveGame(save);
}

function drainEvents() {
  for (const e of world.events) {
    if (e.type === 'busted') {
      screen = 'busted';
      audio.busted();
      persist();
    } else if (e.type === 'wasted') {
      screen = 'wasted';
      persist();
    } else if (e.type === 'storyComplete') {
      screen = 'complete';
      audio.chime();
      persist();
    } else if (e.type === 'payout') {
      audio.chime();
      persist();
    } else if (e.type === 'shot') {
      audio.gunshot();
    } else if (e.type === 'crime' && e.kind === 'punch') {
      audio.punch();
    } else if (e.type === 'radio') {
      audio.station();
    } else if (e.type === 'ability' || e.type === 'garage' || e.type === 'pickup') {
      audio.pickup();
    } else if (e.type === 'unlockSmg') {
      audio.chime();
    } else if (e.type === 'ramHit' || e.type === 'crash') {
      audio.punch();
    }
  }
  world.events.length = 0;
}

function renderPlaying() {
  // renderWorld draws in world coordinates: translate by the camera so
  // the view window lands on the 1280x720 canvas, then HUD in screen space.
  ctx.save();
  ctx.translate(-world.camera.x, -world.camera.y);
  renderWorld(ctx, world);
  ctx.restore();
  drawMinimap(ctx, world, VIEW_W, VIEW_H);
  drawHUD(ctx, world, VIEW_W, VIEW_H);
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Mute toggle works on every screen.
  if (wasPressed(input, 'KeyM')) {
    const muted = audio.toggleMute();
    save.muted = muted;
    saveGame(save);
  }

  if (screen === 'title') {
    drawTitleScreen(ctx, VIEW_W, VIEW_H, now / 1000, save.bestScore);
    if (wasPressed(input, 'Enter')) {
      audio.unlock();
      screen = 'playing';
    }
  } else if (screen === 'playing') {
    if (wasPressed(input, 'Escape') || wasPressed(input, 'KeyP')) {
      screen = 'paused';
    } else {
      updateWorld(world, input, dt);
      drainEvents();
      // Engine + siren follow the world.
      audio.engine(world.player.car ? Math.abs(world.player.car.speed) / 560 : 0, !world.player.onFoot);
      audio.siren(dt, world.wanted.stars);
      saveTimer += dt;
      if (saveTimer > 10) {
        saveTimer = 0;
        persist();
      }
    }
    renderPlaying();
    if (screen === 'paused') {
      drawOverlay(ctx, VIEW_W, VIEW_H, 'PAUSED', ['Take a breather. The city waits.']);
    }
  } else if (screen === 'paused') {
    renderPlaying();
    drawOverlay(ctx, VIEW_W, VIEW_H, 'PAUSED', ['Take a breather. The city waits.']);
    if (wasPressed(input, 'Escape') || wasPressed(input, 'KeyP') || wasPressed(input, 'Enter')) {
      screen = 'playing';
    }
  } else if (screen === 'busted') {
    renderPlaying();
    drawOverlay(ctx, VIEW_W, VIEW_H, 'BUSTED', [
      'The cops caught you on foot.',
      'Fine paid. Mission progress lost. Wanted cleared.',
    ], '#ff5e57');
    if (wasPressed(input, 'Enter')) screen = 'playing';
  } else if (screen === 'wasted') {
    renderPlaying();
    drawOverlay(ctx, VIEW_W, VIEW_H, 'WASTED', [
      'You ran out of health.',
      'You wake up at the hideout, patched up.',
    ], '#ff5e57');
    if (wasPressed(input, 'Enter')) {
      world.player.health = 100;
      world.player.x = MARKERS.hideout.x;
      world.player.y = MARKERS.hideout.y;
      world.player.onFoot = true;
      world.player.car = null;
      world.wanted.stars = 0;
      world.wanted.quietTimer = 0;
      screen = 'playing';
    }
  } else if (screen === 'complete') {
    renderPlaying();
    drawOverlay(ctx, VIEW_W, VIEW_H, 'STORY COMPLETE', [
      `You ran all eight missions and banked $${world.missions.earned}.`,
      `Total cash: $${world.player.money} · Respect: ${world.player.rp} RP. Vice Shores is yours.`,
    ], '#ffd23f');
    if (wasPressed(input, 'Enter')) screen = 'playing';
  }

  endFrame(input);
  requestAnimationFrame(frame);
}

if (shotName) {
  // Screenshot mode: stage the scene, render one frame, stop.
  try {
    stageShot(world, shotName);
    // Park the crosshair near the player so on-foot shots read naturally.
    input.mouse.x = 700;
    input.mouse.y = 300;
    if (shotName === 'title') {
      drawTitleScreen(ctx, VIEW_W, VIEW_H, 12.5, save.bestScore);
    } else {
      renderPlaying();
    }
  } catch (err) {
    document.title = `SHOT ERROR: ${err.message}`;
    throw err;
  }
  window.__shotReady = true;
} else {
  // Expose a handle for debugging / playtesting.
  window.__viceShores = { world, input, audio };
  requestAnimationFrame(frame);
}
