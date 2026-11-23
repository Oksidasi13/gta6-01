// Vice Shores — traffic: AI cars cruising the roads, parked cars,
// pedestrians on the sidewalks who flee from trouble, plus the
// market thugs (mission 4) and ammo / armour pickups.

import { WORLD, TRAFFIC } from './config.js';
import { mulberry32, rand, pick, clamp } from './random.js';
import { createCar, updateAICar, randomCarColor, randomCarName } from './cars.js';

const PED_SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8'];
const PED_PANTS = ['#2c3e50', '#5d4037', '#37474f', '#4a235a', '#1b4f72'];

export function createTraffic(city, seed = 20240) {
  const rng = mulberry32(seed);
  const aiCars = [];
  for (let i = 0; i < TRAFFIC.aiCars; i++) {
    const vertical = rng() < 0.5;
    let x;
    let y;
    let angle;
    if (vertical) {
      const rx = pick(rng, city.roadsX);
      x = rx + (rng() < 0.5 ? -14 : 14); // drive on the right side of the road
      y = rand(rng, 80, WORLD.h - 80);
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const ry = pick(rng, city.roadsY);
      y = ry + (rng() < 0.5 ? -14 : 14);
      x = rand(rng, 80, WORLD.w - 80);
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    const car = createCar(x, y, angle, randomCarColor(rng), {
      kind: 'civilian', id: 100 + i, name: randomCarName(rng),
      ai: { vertical, speed: rand(rng, 120, 180), turnAt: null },
    });
    car.speed = car.ai.speed;
    aiCars.push(car);
  }

  const parked = [];
  for (let i = 0; i < TRAFFIC.parkedCars; i++) {
    const vertical = rng() < 0.5;
    let x;
    let y;
    let angle;
    if (vertical) {
      const rx = pick(rng, city.roadsX);
      x = rx + (rng() < 0.5 ? -26 : 26);
      y = rand(rng, 300, 2100);
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const ry = pick(rng, city.roadsY);
      y = ry + (rng() < 0.5 ? -26 : 26);
      x = rand(rng, 300, 2900);
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    parked.push(createCar(x, y, angle, randomCarColor(rng), {
      kind: 'civilian', parked: true, id: 200 + i, name: randomCarName(rng),
    }));
  }

  const peds = [];
  for (let i = 0; i < TRAFFIC.pedCount; i++) {
    peds.push(spawnPed(city, rng, 300 + i));
  }
  return { aiCars, parked, peds };
}

export function spawnPed(city, rng, id) {
  // Pedestrians walk on sidewalks: just off a road band.
  const vertical = rng() < 0.5;
  let x;
  let y;
  if (vertical) {
    const rx = pick(rng, city.roadsX);
    x = rx + (rng() < 0.5 ? -44 : 44);
    y = rand(rng, 120, 2150);
  } else {
    const ry = pick(rng, city.roadsY);
    y = ry + (rng() < 0.5 ? -44 : 44);
    x = rand(rng, 120, 3050);
  }
  return {
    x, y,
    angle: rand(rng, 0, Math.PI * 2),
    speed: rand(rng, 40, 70),
    shirt: pick(rng, PED_SHIRTS),
    pants: pick(rng, PED_PANTS),
    walkPhase: rand(rng, 0, Math.PI * 2), // two-frame walk bob
    state: 'walk', // 'walk' | 'flee' | 'down'
    downTimer: 0,
    fleeTimer: 0,
    thug: false,
    hp: 0,
    id,
  };
}

// Market thugs for mission 4: tough peds that stand their ground and
// swing at the player up close. Two punches (or a few bullets) drop one.
export function spawnThugs(marketX, marketY) {
  const spots = [
    [marketX - 60, marketY - 40], [marketX + 70, marketY - 50],
    [marketX - 40, marketY + 60], [marketX + 50, marketY + 70],
  ];
  return spots.map(([x, y], i) => ({
    x, y,
    angle: 0,
    speed: 90,
    shirt: '#8e1616',
    pants: '#1a1a1a',
    walkPhase: 0,
    state: 'walk',
    downTimer: 0,
    fleeTimer: 0,
    thug: true,
    hp: 68, // two punches at 34 damage
    punchCooldown: 0,
    id: 700 + i,
  }));
}

// AI cars: drive along their road; at intersections sometimes turn onto
// the crossing road; turn around at the city edge instead of leaving.
export function updateTraffic(traffic, dt, city) {
  for (const car of traffic.aiCars) {
    const ai = car.ai;
    // Approaching an intersection? Maybe turn.
    const cross = ai.vertical ? city.roadsY : city.roadsX;
    const pos = ai.vertical ? car.y : car.x;
    for (const c of cross) {
      if (Math.abs(pos - c) < 6 && ai.turnAt !== c) {
        ai.turnAt = c;
        if (Math.random() < 0.35) {
          // Turn onto the crossing road.
          ai.vertical = !ai.vertical;
          const dir = Math.random() < 0.5 ? 1 : -1;
          car.angle = ai.vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
          if (ai.vertical) car.x = c + (dir > 0 ? -14 : 14);
          else car.y = c + (dir > 0 ? -14 : 14);
        }
        break;
      }
    }
    // Turn around at the city edge.
    if (ai.vertical) {
      if (car.y < 60 && Math.sin(car.angle) < 0) car.angle = Math.PI / 2;
      if (car.y > WORLD.h - 60 && Math.sin(car.angle) > 0) car.angle = -Math.PI / 2;
    } else {
      if (car.x < 60 && Math.cos(car.angle) < 0) car.angle = 0;
      if (car.x > WORLD.w - 60 && Math.cos(car.angle) > 0) car.angle = Math.PI;
    }
    car.speed = ai.speed;
    updateAICar(car, dt, city);
  }
}

// Pedestrians: stroll the sidewalks; flee from a threat point (the player
// punching, shooting, or driving close at speed). A downed ped gets up
// after a few seconds. Thugs chase the player instead of fleeing.
export function updatePeds(traffic, dt, city, threat, player) {
  for (const ped of traffic.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.state = 'walk';
      continue;
    }
    if (ped.thug && player) {
      // Thugs close in and swing when they reach the player.
      const d = Math.hypot(player.x - ped.x, player.y - ped.y);
      if (d < 420) {
        ped.angle = Math.atan2(player.y - ped.y, player.x - ped.x);
        if (d > 26) {
          ped.x += Math.cos(ped.angle) * ped.speed * dt;
          ped.y += Math.sin(ped.angle) * ped.speed * dt;
          ped.walkPhase += dt * 9;
        }
        ped.punchCooldown -= dt;
        if (d < 30 && ped.punchCooldown <= 0) {
          ped.punchCooldown = 1.1;
          ped.swung = true; // world.js turns this into player damage
        }
        continue;
      }
    }
    if (threat) {
      const d = Math.hypot(ped.x - threat.x, ped.y - threat.y);
      if (d < TRAFFIC.fleeRadius && !ped.thug) {
        ped.state = 'flee';
        ped.fleeTimer = 1.2;
        ped.angle = Math.atan2(ped.y - threat.y, ped.x - threat.x);
      }
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      ped.x += Math.cos(ped.angle) * TRAFFIC.fleeSpeed * dt;
      ped.y += Math.sin(ped.angle) * TRAFFIC.fleeSpeed * dt;
      ped.walkPhase += dt * 12;
      if (ped.fleeTimer <= 0) ped.state = 'walk';
    } else {
      // Stroll: keep walking, bounce off the world edge, drift angle a little.
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      ped.walkPhase += dt * 7;
      if (ped.x < 40 || ped.x > WORLD.w - 40 || ped.y < 40 || ped.y > 2150) {
        ped.angle += Math.PI;
      }
    }
    ped.x = clamp(ped.x, 30, WORLD.w - 30);
    ped.y = clamp(ped.y, 30, 2160);
  }
}

// Knock a ped down (punch / bullet / car hit). Thugs need two punches:
// the first only staggers them (hp drops), the second puts them down.
// Returns 'down' | 'hit' | false.
export function knockPedDown(ped, seconds = 4, damage = 34) {
  if (ped.state === 'down') return false;
  if (ped.thug) {
    ped.hp -= damage;
    if (ped.hp > 0) return 'hit';
  }
  ped.state = 'down';
  ped.downTimer = seconds;
  return 'down';
}

// Ammo / armour pickups on the map. Collected by walking or driving over.
export function createPickups() {
  return [
    { x: 560, y: 560, kind: 'ammo', taken: false, respawn: 0 },
    { x: 2360, y: 1640, kind: 'ammo', taken: false, respawn: 0 },
    { x: 920, y: 2000, kind: 'armour', taken: false, respawn: 0 },
  ];
}
