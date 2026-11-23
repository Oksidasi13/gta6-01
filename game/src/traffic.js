// Vice Shores — pedestrians and the traffic around them. Pedestrians stroll the
// sidewalks; a gunshot, a speeding car or a body on the ground sends them running.
// Traffic cars are updated here too, so the world has one place that moves the street.
import { PED_COUNT, PED_WALK_SPEED, PED_FLEE_SPEED, SIDEWALK } from './config.js';
import { ROADS_VERTICAL, ROADS_HORIZONTAL, ROAD_WIDTH } from './config.js';
import { makeRng, pickFrom, randomInt } from './random.js';
import { nearestRoad } from './city.js';
import { updateTrafficCar, collideCars } from './cars.js';

export function makePedestrian(x, y, angle) {
  return {
    x, y, angle,
    speed: PED_WALK_SPEED * (0.8 + Math.random() * 0.4),
    state: 'walk',
    fleeX: 0, fleeY: 0,
    scaredTimer: 0,
    downTimer: 0,
    color: pickFrom(Math.random, ['#e8b73a', '#7a4fd0', '#3d7dd9', '#d94f3d', '#3aa655', '#e8e8e8']),
  };
}

/** Scatter pedestrians on sidewalks across the city. */
export function spawnPedestrians(city, rng, count) {
  const peds = [];
  for (let n = 0; n < count; n += 1) {
    const vertical = rng() < 0.5;
    let x; let y; let angle;
    if (vertical) {
      const road = pickFrom(rng, ROADS_VERTICAL);
      x = road + (rng() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + SIDEWALK);
      y = randomInt(rng, 150, city.height - 150);
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const road = pickFrom(rng, ROADS_HORIZONTAL);
      x = randomInt(rng, 150, city.width - 150);
      y = road + (rng() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + SIDEWALK);
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    peds.push(makePedestrian(x, y, angle));
  }
  return peds;
}

/** Scare every pedestrian near (x, y): they run away from it, along the sidewalk. */
export function scarePedestrians(peds, x, y, radius) {
  for (const ped of peds) {
    if (ped.downTimer > 0) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee';
      ped.scaredTimer = 3;
      // Flee along the nearest road's direction, away from the threat — running
      // across the road into traffic would only get them hit.
      const road = nearestRoad(ped.x, ped.y);
      if (road.axis === 'v') {
        ped.fleeX = 0;
        ped.fleeY = ped.y > y ? 1 : -1;
      } else {
        ped.fleeX = ped.x > x ? 1 : -1;
        ped.fleeY = 0;
      }
      // Keep them on the sidewalk: nudge them back toward it if they drift.
      const side = road.axis === 'v'
        ? Math.sign(ped.x - road.at) || 1
        : Math.sign(ped.y - road.at) || 1;
      if (road.axis === 'v') ped.x = road.at + side * (ROAD_WIDTH / 2 + SIDEWALK);
      else ped.y = road.at + side * (ROAD_WIDTH / 2 + SIDEWALK);
    }
  }
}

/** One pedestrian's step: stroll, flee, or lie down after being hit. */
export function updatePedestrian(city, ped, dt) {
  if (ped.downTimer > 0) {
    ped.downTimer -= dt;
    return;
  }
  if (ped.state === 'flee') {
    ped.scaredTimer -= dt;
    ped.x += ped.fleeX * PED_FLEE_SPEED * dt;
    ped.y += ped.fleeY * PED_FLEE_SPEED * dt;
    ped.angle = Math.atan2(ped.fleeY, ped.fleeX);
    if (ped.scaredTimer <= 0) ped.state = 'walk';
  } else {
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    // At an intersection, sometimes turn onto the crossing sidewalk.
    const road = nearestRoad(ped.x, ped.y);
    if (road.dist < 70 && Math.random() < 0.004) {
      ped.angle = road.axis === 'v'
        ? (Math.random() < 0.5 ? 0 : Math.PI)
        : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  ped.x = Math.max(20, Math.min(city.width - 20, ped.x));
  ped.y = Math.max(20, Math.min(city.height - 20, ped.y));
}

/** Move every traffic car and pedestrian one step; cars bump each other. */
export function updateStreet(city, cars, peds, dt) {
  for (const car of cars) {
    if (car.kind === 'traffic' && car.driver === 'ai') updateTrafficCar(city, car, cars, dt);
  }
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      if (cars[i].kind !== 'parked' && cars[j].kind !== 'parked') collideCars(cars[i], cars[j]);
    }
  }
  for (const ped of peds) updatePedestrian(city, ped, dt);
}
