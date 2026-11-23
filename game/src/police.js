// Vice Shores — the wanted system, police, dispatch, roadblocks
// and the police helicopter (4+ stars).
// Pure wanted logic (testable) plus police cars that chase and ram.

import { WANTED, WORLD, UNIT_NAMES } from './config.js';
import { createCar, updateAICar } from './cars.js';
import { clamp, angleDelta, rand } from './random.js';

export function createWanted() {
  return { stars: 0, quietTimer: 0 };
}

export function addCrime(wanted, stars) {
  wanted.stars = clamp(wanted.stars + stars, 0, WANTED.maxStars);
  wanted.quietTimer = 0;
}

export function setWanted(wanted, stars) {
  wanted.stars = clamp(stars, 0, WANTED.maxStars);
  wanted.quietTimer = 0;
}

export function clearWanted(wanted) {
  wanted.stars = 0;
  wanted.quietTimer = 0;
}

// With no crime for decayPerStar seconds per star, drop one star.
export function updateWanted(wanted, dt) {
  if (wanted.stars <= 0) {
    wanted.quietTimer = 0;
    return;
  }
  wanted.quietTimer += dt;
  if (wanted.quietTimer >= WANTED.decayPerStar * wanted.stars) {
    wanted.stars -= 1;
    wanted.quietTimer = 0;
  }
}

export function createPolice() {
  return { cars: [], roadblock: null, unitCounter: 0 };
}

function spawnPoliceCar(police, playerX, playerY, rng) {
  // Spawn behind the player, off-screen, at a random bearing.
  const bearing = rand(rng, 0, Math.PI * 2);
  const d = WANTED.policeSpawnDist + rand(rng, 0, 120);
  const x = clamp(playerX + Math.cos(bearing) * d, 40, WORLD.w - 40);
  const y = clamp(playerY + Math.sin(bearing) * d, 40, WORLD.h - 40);
  const idx = police.unitCounter++;
  const car = createCar(x, y, 0, '#1f6feb', {
    kind: 'police',
    id: 900 + idx,
    callsign: UNIT_NAMES[idx % UNIT_NAMES.length],
    role: idx === 0 ? 'RAMMING' : idx === 1 ? 'FLANKING' : 'PURSUIT',
  });
  car.speed = 0;
  police.cars.push(car);
  return car;
}

// Chase the player, ram on contact, despawn when far away.
// Returns { busted, rammed }: busted when a police car touches the player
// on foot while wanted; rammed when one hits the player's car.
export function updatePolice(police, wanted, player, dt, city, rng) {
  const want = wanted.stars >= 3 ? 2 : wanted.stars >= 1 ? 1 : 0;
  while (police.cars.length < want) {
    spawnPoliceCar(police, player.x, player.y, rng);
  }
  let busted = false;
  let rammed = false;
  for (const car of police.cars) {
    const d = Math.hypot(player.x - car.x, player.y - car.y);
    if (d > WANTED.policeDespawnDist) {
      car.gone = true;
      continue;
    }
    // Steer toward the player, faster than traffic, ramming speed.
    const targetAngle = Math.atan2(player.y - car.y, player.x - car.x);
    car.angle += clamp(angleDelta(car.angle, targetAngle), -2.4 * dt, 2.4 * dt);
    const targetSpeed = Math.min(WANTED.policeTopSpeed, 260 + d * 0.55);
    car.speed += (targetSpeed - car.speed) * Math.min(1, 1.6 * dt);
    updateAICar(car, dt, city);
    // Contact: busted if the player is on foot; a ram if driving.
    const after = Math.hypot(player.x - car.x, player.y - car.y);
    if (after < 34) {
      if (player.onFoot) {
        busted = true;
      } else if (player.car) {
        // Ram: shove the player's car and slow both.
        player.car.speed *= 0.55;
        car.speed *= 0.5;
        rammed = true;
      }
    }
  }
  police.cars = police.cars.filter((c) => !c.gone);
  return { busted, rammed };
}

// --- Roadblock: two police cars parked across a road on the player's route.
export function spawnRoadblock(police, x, y, angle) {
  const a = createCar(x - 30, y, angle, '#1f6feb', { kind: 'police', id: 950, callsign: 'REEF-12', role: 'ROADBLOCK' });
  const b = createCar(x + 30, y, angle, '#1f6feb', { kind: 'police', id: 951, callsign: 'DUSK-9', role: 'ROADBLOCK' });
  police.roadblock = { x, y, angle, cars: [a, b] };
  return police.roadblock;
}

export function clearRoadblock(police) {
  police.roadblock = null;
}

// --- Helicopter: circles the player at 4+ stars with a searchlight.
export function createHelicopter() {
  return {
    active: false,
    x: 0, y: 0,
    orbit: 0, // angle around the player
    rotor: 0, // rotor phase for the blur
    lightX: 0, lightY: 0, // searchlight ground point
    sweep: 0,
  };
}

export function updateHelicopter(heli, wanted, player, dt) {
  const want = wanted.stars >= WANTED.heliStars;
  if (!want) {
    heli.active = false;
    return;
  }
  heli.active = true;
  heli.orbit += dt * 0.45;
  heli.rotor += dt * 22;
  const R = 230;
  heli.x = player.x + Math.cos(heli.orbit) * R;
  heli.y = player.y + Math.sin(heli.orbit) * R;
  // Searchlight sweeps around the player, lagging the orbit.
  heli.sweep += dt * 0.7;
  const lx = player.x + Math.cos(heli.sweep) * 90;
  const ly = player.y + Math.sin(heli.sweep) * 90;
  heli.lightX = lx;
  heli.lightY = ly;
}

// --- Dispatch panel data: named units with roles and distances (metres).
export function dispatchUnits(police, heli, player) {
  const units = [];
  for (const car of police.cars) {
    units.push({
      name: car.callsign || 'UNIT',
      role: car.role || 'PURSUIT',
      dist: Math.round(Math.hypot(player.x - car.x, player.y - car.y) / 10),
    });
  }
  if (police.roadblock) {
    for (const car of police.roadblock.cars) {
      units.push({
        name: car.callsign || 'UNIT',
        role: 'ROADBLOCK',
        dist: Math.round(Math.hypot(player.x - car.x, player.y - car.y) / 10),
      });
    }
  }
  if (heli && heli.active) {
    units.push({
      name: 'KITE-1',
      role: 'MARKSMAN',
      dist: Math.round(Math.hypot(player.x - heli.x, player.y - heli.y) / 10),
    });
  }
  return units.slice(0, 6);
}
