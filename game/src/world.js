// Vice Shores — the world: one state object and the step that moves it. Every system
// (player, traffic, police, missions, combat) hangs off this state, and this step
// calls them in one order, so a frame is always the same story told in full.
import { buildCity } from './city.js';
import { makeRng } from './random.js';
import { CAR_LENGTH } from './config.js';
import {
  TRAFFIC_COUNT, PARKED_COUNT, PED_COUNT,
} from './config.js';
import {
  makePlayer, updatePlayerOnFoot, updatePlayerDriving, nearestStealableCar,
  enterCar, exitCar, startPunch, startShot, calmHeal,
} from './player.js';
import { spawnTrafficCars, spawnParkedCars } from './cars.js';
import { spawnPedestrians, scarePedestrians, updateStreet } from './traffic.js';
import { updatePolice, addWanted } from './police.js';
import { startMission, updateMissions } from './missions.js';
import {
  updateBullets, updateGuards, applyPunch, updateParticles, addSmoke,
} from './combat.js';
import { SoundBank } from './audio.js';

/** A fresh world: the city, the player, the street and the first mission. */
export function createWorld(seed) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const state = {
    seed,
    rng,
    city,
    time: 0,
    timeOfDay: 10,
    dayStart: 10,
    screen: 'title',
    bustedReason: '',
    player: makePlayer(city.start.x, city.start.y),
    cars: [
      ...spawnTrafficCars(city, rng, TRAFFIC_COUNT),
      ...spawnParkedCars(city, rng, PARKED_COUNT),
    ],
    peds: spawnPedestrians(city, rng, PED_COUNT),
    cops: [],
    guards: [],
    bullets: [],
    particles: [],
    skids: [],
    wanted: 0,
    wantedTimer: 9,
    hiddenTimer: 0,
    policeSpawnTimer: 0,
    missionIndex: 0,
    missionStage: 0,
    missionDone: false,
    storyComplete: false,
    goldCar: null,
    message: { text: 'Welcome to Vice Shores. Press ENTER to start.', until: 999999 },
    shake: 0,
    best: 0,
    sfx: new SoundBank(),
    healTimer: 0,
    sirenTimer: 0,
    stats: { carsStolen: 0, pedsHit: 0, shotsFired: 0, missionsDone: 0 },
  };
  startMission(state, 0);
  return state;
}

/** One simulation step (dt seconds) while the game is playing. */
export function stepWorld(state, input, dt) {
  state.time += dt;
  state.timeOfDay = (state.dayStart + state.time / 240) % 24;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.4);
  const player = state.player;

  // Getting in and out of cars.
  if (input.consume('KeyE')) {
    if (player.inCar) {
      exitCar(player, player.inCar);
    } else {
      const car = nearestStealableCar(state.cars, player.x, player.y, 70);
      if (car) {
        const hadDriver = car.driver === 'ai';
        enterCar(player, car);
        state.stats.carsStolen += 1;
        addWanted(state, 1);
        state.message = { text: hadDriver ? 'You jacked a car! The owner called the cops.' : 'You stole a parked car!', until: state.time + 2.5 };
        state.sfx.pickup();
      }
    }
  }

  // Punch and shoot (on foot only).
  if (input.consume('Space') && !player.inCar) {
    const punch = startPunch(player);
    if (punch) {
      const hit = applyPunch(state, punch);
      state.sfx.punch();
      if (hit) addWanted(state, 1);
    }
  }
  if (input.mousePressed && !player.inCar && state.screen === 'play') {
    const aim = input.aimWorld(state.camera);
    const bullet = startShot(player, aim.x, aim.y);
    if (bullet) {
      state.bullets.push(bullet);
      state.stats.shotsFired += 1;
      state.sfx.gunshot();
      scarePedestrians(state.peds, player.x, player.y, 320);
      if (state.wanted < 1) addWanted(state, 1);
    }
  }
  if (input.consume('KeyR') && !player.inCar && player.ammo < 12 && player.reloading <= 0) {
    player.reloading = 1.2;
  }
  if (input.consume('KeyM')) {
    const muted = state.sfx.toggleMute();
    state.message = { text: muted ? 'Sound off' : 'Sound on', until: state.time + 1.5 };
  }

  // Move the player.
  if (player.inCar) updatePlayerDriving(state.city, player, player.inCar, input, dt);
  else updatePlayerOnFoot(state.city, player, input, dt);

  // Skid marks when the player's car slides hard.
  if (player.inCar && Math.abs(player.inCar.speed) > 260) {
    const car = player.inCar;
    const steering = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (steering !== 0) {
      state.skids.push({
        x: car.x, y: car.y, angle: car.angle, life: 1,
      });
      if (state.skids.length > 220) state.skids.shift();
    }
  }

  // Cars hitting pedestrians: a crime, and the pedestrian goes down.
  for (const car of state.cars) {
    if (Math.abs(car.speed) < 60) continue;
    for (const ped of state.peds) {
      if (ped.downTimer > 0) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 30) {
        ped.downTimer = 6;
        state.stats.pedsHit += 1;
        scarePedestrians(state.peds, ped.x, ped.y, 300);
        if (car.driver === 'player') addWanted(state, 1);
      }
    }
  }

  // Wrecked cars smoke.
  for (const car of state.cars) {
    if (car.hp <= 0 && Math.random() < dt * 6) addSmoke(state, car.x, car.y);
  }

  updateStreet(state.city, state.cars, state.peds, dt);
  updatePolice(state, dt);
  updateMissions(state, dt);
  updateGuards(state, dt);
  updateBullets(state, dt);
  updateParticles(state, dt);

  // Calm healing, once a second, only while the heat is off.
  state.healTimer += dt;
  if (state.healTimer >= 1) {
    state.healTimer = 0;
    if (state.wanted === 0) calmHeal(player);
  }

  // Siren wail alternates twice a second.
  state.sirenTimer += dt;
  if (state.sirenTimer >= 0.5) {
    state.sirenTimer = 0;
    state.sfx.setSiren(state.wanted);
  }
  state.sfx.setEngine(player.inCar ? player.inCar.speed : 0, !!player.inCar);

  // Death and arrest.
  if (player.hp <= 0 && state.screen === 'play') {
    state.screen = 'wasted';
    state.bustedReason = 'WASTED — Vice Shores keeps your cash. Press ENTER to try again.';
    state.sfx.busted();
  }
  if (player.inCar && player.inCar.hp <= 0 && player.inCar.speed < 20) {
    // A wrecked car strands the player.
    exitCar(player, player.inCar);
    state.message = { text: 'Your car died. Find another ride.', until: state.time + 2.5 };
  }
}

/** The camera: follows the player with a little lookahead, clamped to the city. */
export function computeCamera(state, viewWidth, viewHeight) {
  const look = 60;
  const lx = Math.cos(state.player.angle) * look * (state.player.inCar ? 1 : 0.4);
  const ly = Math.sin(state.player.angle) * look * (state.player.inCar ? 1 : 0.4);
  const cx = Math.max(0, Math.min(state.city.width - viewWidth, state.player.x + lx - viewWidth / 2));
  const cy = Math.max(0, Math.min(state.city.height - viewHeight, state.player.y + ly - viewHeight / 2));
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
  state.camera = { x: cx + shakeX, y: cy + shakeY, w: viewWidth, h: viewHeight };
  return state.camera;
}
