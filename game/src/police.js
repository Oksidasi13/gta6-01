// Vice Shores — the wanted system: crimes raise stars, the police answer, and the
// heat dies down when the player stays out of sight. Cops on foot try to bust the
// player; police cars chase and ram.
import {
  WANTED_MAX, COP_FOOT_SPEED, COP_BUST_RANGE, COP_BUST_SECONDS,
  WANTED_DECAY_SECONDS,
} from './config.js';
import { makePoliceCar, driveCarForward } from './cars.js';
import { nearestRoad } from './city.js';

export function makeCop(x, y) {
  return {
    x, y, angle: 0,
    speed: COP_FOOT_SPEED,
    bustTimer: 0,
    color: '#20264d',
  };
}

/** Raise the wanted level by n stars (capped), and reset the decay clock. */
export function addWanted(state, n) {
  if (state.wanted >= WANTED_MAX) return;
  state.wanted = Math.min(WANTED_MAX, state.wanted + n);
  state.wantedTimer = WANTED_DECAY_SECONDS;
  // A fresh crime means the player has just been seen: the heat starts over.
  state.hiddenTimer = 0;
  state.message = { text: `WANTED LEVEL ${state.wanted} — the police are coming`, until: state.time + 2.5 };
}

/** How many police cars the current wanted level calls for. */
export function wantedPoliceCars(wanted) {
  return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
}

/** How many foot cops the current wanted level calls for. */
export function wantedCops(wanted) {
  return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
}

function spawnPointNear(state, rng) {
  // On the road nearest the player, a few hundred pixels away — close enough to
  // be a threat, far enough not to appear on top of them. Behind the player
  // when they are moving, so the chase starts as a pursuit, never a roadblock.
  const road = nearestRoad(state.player.x, state.player.y);
  const moving = state.player.inCar
    ? { x: Math.cos(state.player.angle), y: Math.sin(state.player.angle) }
    : null;
  let dir = rng() < 0.5 ? -1 : 1;
  if (moving) {
    const along = road.axis === 'v' ? moving.y : moving.x;
    dir = along >= 0 ? -1 : 1;
  }
  const along = 420 + rng() * 120;
  let spot;
  if (road.axis === 'v') spot = { x: road.at, y: state.player.y + dir * along };
  else spot = { x: state.player.x + dir * along, y: road.at };
  spot.x = Math.max(60, Math.min(state.city.width - 60, spot.x));
  spot.y = Math.max(60, Math.min(state.city.height - 60, spot.y));
  return spot;
}

/** Keep the police presence matched to the wanted level, and move every cop. */
export function updatePolice(state, dt) {
  const rng = state.rng;
  state.policeSpawnTimer = Math.max(0, (state.policeSpawnTimer || 0) - dt);
  const carsWanted = wantedPoliceCars(state.wanted);
  const copsWanted = wantedCops(state.wanted);
  // Police give up when the player is far away: they stop chasing and leave.
  const GIVE_UP_DIST = 850;
  state.cops = state.cops.filter((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y) < GIVE_UP_DIST);
  state.cars = state.cars.filter((c) => c.kind !== 'police'
    || Math.hypot(c.x - state.player.x, c.y - state.player.y) < GIVE_UP_DIST);
  const policeCars = state.cars.filter((c) => c.kind === 'police');
  const nearestPolice = Math.min(
    ...policeCars.map((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y)),
    ...state.cops.map((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y)),
    Infinity,
  );
  // Hidden while no police is close: the clock that lets the player break
  // contact. Once hidden for a few seconds, no fresh police spawn — the heat
  // is already dying, and the Getaway mission can be finished.
  if (nearestPolice > 600) state.hiddenTimer = (state.hiddenTimer || 0) + dt;
  else state.hiddenTimer = 0;
  // Spawn while the player has just been seen (hiddenTimer near zero) and the
  // numbers are short, at most one every few seconds. Once the player has been
  // out of sight for a moment, no fresh police arrive — the heat is dying.
  if (state.wanted > 0 && state.hiddenTimer < 0.5 && state.policeSpawnTimer <= 0) {
    if (policeCars.length < carsWanted) {
      const spot = spawnPointNear(state, rng);
      state.cars.push(makePoliceCar(spot.x, spot.y));
      state.policeSpawnTimer = 2.5;
    } else if (state.cops.length < copsWanted) {
      const spot = spawnPointNear(state, rng);
      state.cops.push(makeCop(spot.x, spot.y));
      state.policeSpawnTimer = 2.5;
    }
  }
  // Wanted decays while hidden.
  if (state.wanted > 0 && state.hiddenTimer > 0) {
    state.wantedTimer -= dt;
    if (state.wantedTimer <= 0) {
      state.wanted -= 1;
      state.wantedTimer = WANTED_DECAY_SECONDS;
      if (state.wanted === 0) {
        state.cops = [];
        // The interceptors give up and park where they are — stealable, like any car.
        for (const car of state.cars) {
          if (car.kind === 'police') {
            car.kind = 'parked';
            car.driver = 'none';
            car.siren = false;
          }
        }
        state.message = { text: 'You lost them. The heat is off.', until: state.time + 2.5 };
      }
    }
  } else {
    state.wantedTimer = WANTED_DECAY_SECONDS;
  }
  // Foot cops chase the player and try to bust them.
  for (const cop of state.cops) {
    const dx = state.player.x - cop.x;
    const dy = state.player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    cop.angle = Math.atan2(dy, dx);
    if (state.player.inCar) {
      // A cop on foot cannot catch a car: jog after it anyway.
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      cop.bustTimer = 0;
    } else if (dist < COP_BUST_RANGE) {
      cop.bustTimer += dt;
      if (cop.bustTimer >= COP_BUST_SECONDS) {
        state.screen = 'busted';
        state.bustedReason = 'BUSTED — the Vice Shores PD caught you.';
      }
    } else {
      cop.bustTimer = 0;
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
    }
  }
  // Police cars chase and ram the player's car (or the player on foot).
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    const target = state.player.inCar ? state.player.inCar : state.player;
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const dist = Math.hypot(dx, dy);
    const wantedAngle = Math.atan2(dy, dx);
    let diff = wantedAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    driveCarForward(state.city, car, 1, steer, dt);
    if (dist < 56) {
      if (state.player.inCar) {
        state.player.inCar.hp -= 14 * dt;
        state.shake = 0.5;
        if (state.player.inCar.hp <= 0) {
          state.player.inCar.smoke = 1;
          state.message = { text: 'Your car is wrecked!', until: state.time + 2 };
        }
      } else if (state.player.invulnerable <= 0) {
        state.player.hp -= 22 * dt;
        state.player.invulnerable = 0.4;
        state.shake = 0.6;
      }
    }
  }
}
