// Vice Shores — the screenshot scenes behind ?shot=chase|street|beach|title.
// Each one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always stages the same scene.
import { ROADS_HORIZONTAL, ROADS_VERTICAL } from './config.js';
import { nearestRoad } from './city.js';
import { enterCar } from './player.js';
import { makePoliceCar } from './cars.js';
import { startMission } from './missions.js';
import { scarePedestrians } from './traffic.js';
import { stepWorld, computeCamera } from './world.js';
import { makeScriptedInput } from './input.js';

const STEP = 1 / 60;

/** Autopilot: drive along the road toward the mission marker. */
function driveAutopilot(state) {
  const input = makeScriptedInput({ up: true });
  const car = state.player.inCar;
  if (!car) return input;
  const road = nearestRoad(car.x, car.y);
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const right = { x: -forward.y, y: forward.x };
  let targetX = car.x;
  let targetY = car.y;
  if (road.axis === 'v') {
    targetX = road.at + (Math.sin(car.angle) > 0 ? 24 : -24);
    targetY = car.y + Math.sin(car.angle) * 100;
  } else {
    targetX = car.x + Math.cos(car.angle) * 100;
    targetY = road.at + (Math.cos(car.angle) > 0 ? 24 : -24);
  }
  const toTarget = { x: targetX - car.x, y: targetY - car.y };
  const cross = forward.x * toTarget.y - forward.y * toTarget.x;
  input.left = cross < -20;
  input.right = cross > 20;
  return input;
}

/** Walk autopilot: stroll toward the mission marker. */
function walkAutopilot(state, marker) {
  const input = makeScriptedInput();
  if (!marker) return input;
  const dx = marker.x - state.player.x;
  const dy = marker.y - state.player.y;
  input.right = dx > 30;
  input.left = dx < -30;
  input.down = dy > 30;
  input.up = dy < -30;
  return input;
}

/** Put a police car on the road behind the player, already in pursuit. */
function addChaser(state, dx, dy) {
  const car = makePoliceCar(state.player.x + dx, state.player.y + dy);
  car.angle = Math.atan2(-dy, -dx);
  state.cars.push(car);
  return car;
}

function stageChase(state) {
  // Mission 2 in progress: the gold coupe, stolen, wanted level 3, two interceptors.
  state.dayStart = 14;
  state.timeOfDay = 14;
  startMission(state, 1);
  state.missionIndex = 1;
  state.missionStage = 1;
  state.wanted = 3;
  state.wantedTimer = 9;
  state.message = { text: 'Getaway — the gold coupe is yours. Lose them!', until: state.time + 4 };
  const car = state.goldCar;
  car.x = 600;
  car.y = 1024;
  car.angle = 0;
  enterCar(state.player, car);
  addChaser(state, -160, 40);
  addChaser(state, -260, -30);
  for (let i = 0; i < 3 / STEP; i += 1) {
    stepWorld(state, driveAutopilot(state), STEP);
  }
  computeCamera(state, 1280, 720);
  return 'play';
}

function stageStreet(state) {
  // Mission 1 on foot: pistol out, one star, a cop closing in, traffic all around.
  state.dayStart = 11;
  state.timeOfDay = 11;
  state.missionIndex = 0;
  state.missionStage = 0;
  state.wanted = 1;
  state.wantedTimer = 9;
  state.player.x = 980;
  state.player.y = 980;
  state.player.angle = 0.4;
  state.cops.push({ x: 760, y: 940, angle: 0, speed: 205, bustTimer: 0, color: '#20264d' });
  addChaser(state, -420, 120);
  const marker = { x: state.city.docks.x, y: state.city.docks.y };
  for (let i = 0; i < 4 / STEP; i += 1) {
    stepWorld(state, walkAutopilot(state, marker), STEP);
  }
  // The player fires once, so the muzzle flash and the fleeing pedestrians show.
  state.bullets.push({
    x: state.player.x + 30, y: state.player.y + 10,
    vx: 700, vy: 200, life: 0.5, from: 'player', damage: 34,
  });
  scarePedestrians(state.peds, state.player.x, state.player.y, 320);
  computeCamera(state, 1280, 720);
  return 'play';
}

function stageBeach(state) {
  // Dusk on Ocean Drive: the player racing the beachfront, a chaser behind,
  // pedestrians fleeing the sirens.
  state.dayStart = 18.5;
  state.timeOfDay = 18.5;
  state.missionIndex = 1;
  state.missionStage = 1;
  state.wanted = 2;
  state.wantedTimer = 9;
  state.message = { text: 'Dusk on Ocean Drive — outrun the tail.', until: state.time + 4 };
  const car = state.cars.find((c) => c.kind === 'parked');
  car.x = 600;
  car.y = 2224;
  car.angle = 0;
  enterCar(state.player, car);
  addChaser(state, -200, 30);
  scarePedestrians(state.peds, state.player.x, state.player.y, 400);
  for (let i = 0; i < 3 / STEP; i += 1) {
    stepWorld(state, driveAutopilot(state), STEP);
  }
  computeCamera(state, 1280, 720);
  return 'play';
}

function stageTitle(state) {
  state.dayStart = 10;
  state.timeOfDay = 10;
  state.screen = 'title';
  state.player.x = 1600;
  state.player.y = 1200;
  computeCamera(state, 1280, 720);
  return 'title';
}

/**
 * Set `state` to the named scene (chase, street, beach or title) and return the
 * screen to draw over it.
 */
export function stageShot(name, state) {
  if (name === 'chase') return stageChase(state);
  if (name === 'street') return stageStreet(state);
  if (name === 'beach') return stageBeach(state);
  return stageTitle(state);
}
