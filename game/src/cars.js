// Vice Shores — cars: the arcade driving model, traffic and parked spawns, and the
// police interceptors. One car object serves the player, traffic and the police; the
// `driver` field says who is steering it.
import {
  CAR_LENGTH, CAR_WIDTH, CAR_TOP_SPEED, CAR_ACCEL, CAR_BRAKE, CAR_STEER,
  TRAFFIC_SPEED, POLICE_CAR_SPEED,
} from './config.js';
import { makeRng, pickFrom, randomInt } from './random.js';
import { ROADS_VERTICAL, ROADS_HORIZONTAL, ROAD_WIDTH } from './config.js';
import { hitBuilding, isOnRoad, nearestRoad } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8b73a', '#7a4fd0', '#e8e8e8', '#2b2b33', '#3aa655', '#d97fb0'];
const POLICE_COLOR = '#20264d';

let nextCarId = 1;

export function makeCar(x, y, angle, color, kind, driver) {
  return {
    id: nextCarId,
    x, y, angle, speed: 0,
    color: color || '#d94f3d',
    kind: kind || 'traffic',
    driver: driver || 'ai',
    hp: 100,
    steering: 0,
    // Traffic AI state.
    lane: 0,
    cruise: TRAFFIC_SPEED,
    turnAt: null,
    stuckTimer: 0,
    smoke: 0,
    siren: false,
  };
}

/** Spawn the traffic cars on the roads, spread across the city. */
export function spawnTrafficCars(city, rng, count) {
  const cars = [];
  for (let n = 0; n < count; n += 1) {
    const vertical = rng() < 0.5;
    let x; let y; let angle;
    if (vertical) {
      const road = pickFrom(rng, ROADS_VERTICAL);
      const dir = rng() < 0.5 ? 1 : -1;
      x = road + dir * 24;
      y = randomInt(rng, 150, city.height - 150);
      angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const road = pickFrom(rng, ROADS_HORIZONTAL);
      const dir = rng() < 0.5 ? 1 : -1;
      x = randomInt(rng, 150, city.width - 150);
      y = road + dir * 24;
      angle = dir > 0 ? 0 : Math.PI;
    }
    const car = makeCar(x, y, angle, pickFrom(rng, CAR_COLORS), 'traffic', 'ai');
    car.cruise = TRAFFIC_SPEED * (0.8 + rng() * 0.4);
    cars.push(car);
  }
  return cars;
}

/** Spawn parked cars along road edges, ready to steal. */
export function spawnParkedCars(city, rng, count) {
  const cars = [];
  for (let n = 0; n < count; n += 1) {
    const vertical = rng() < 0.5;
    let x; let y; let angle;
    if (vertical) {
      const road = pickFrom(rng, ROADS_VERTICAL);
      x = road + (rng() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 - 14);
      y = randomInt(rng, 250, city.height - 250);
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const road = pickFrom(rng, ROADS_HORIZONTAL);
      x = randomInt(rng, 250, city.width - 250);
      y = road + (rng() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 - 14);
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    const car = makeCar(x, y, angle, pickFrom(rng, CAR_COLORS), 'parked', 'none');
    cars.push(car);
  }
  return cars;
}

/** A police interceptor, spawned at a road near (x, y). */
export function makePoliceCar(x, y) {
  const car = makeCar(x, y, 0, POLICE_COLOR, 'police', 'ai');
  car.cruise = POLICE_CAR_SPEED;
  car.siren = true;
  return car;
}

/** The gold coupe for the Getaway mission. */
export function makeGoldCar(x, y) {
  const car = makeCar(x, y, 0, '#e8b73a', 'parked', 'none');
  car.gold = true;
  return car;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Drive one car forward one step: throttle, steering, drag, building collision. */
export function driveCarForward(city, car, throttle, steer, dt) {
  const top = car.kind === 'police' ? POLICE_CAR_SPEED : CAR_TOP_SPEED;
  if (throttle > 0) car.speed += CAR_ACCEL * throttle * dt;
  else if (throttle < 0) car.speed += CAR_BRAKE * throttle * dt;
  else {
    const drag = 140 * dt;
    car.speed = Math.abs(car.speed) <= drag ? 0 : car.speed - Math.sign(car.speed) * drag;
  }
  car.speed = Math.max(-top * 0.45, Math.min(top, car.speed));
  const moving = Math.abs(car.speed) > 4;
  if (moving) {
    const steerAmount = CAR_STEER * steer * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
    car.angle += steerAmount * dt;
  }
  const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
  const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
  const radius = CAR_LENGTH / 2 - 4;
  const before = { x: car.x, y: car.y };
  car.x = nextX;
  car.y = nextY;
  if (hitBuilding(city, car.x, car.y, radius)) {
    // Slide along the wall: keep the axis that did not hit.
    car.x = before.x;
    car.y = nextY;
    if (hitBuilding(city, car.x, car.y, radius)) {
      car.x = nextX;
      car.y = before.y;
      if (hitBuilding(city, car.x, car.y, radius)) {
        car.x = before.x;
        car.y = before.y;
      }
    }
    if (Math.abs(car.speed) > 200) car.hp -= 6;
    car.speed *= 0.45;
  }
  car.x = Math.max(30, Math.min(city.width - 30, car.x));
  car.y = Math.max(30, Math.min(city.height - 30, car.y));
  if (car.hp <= 0) {
    car.speed *= 0.9;
    car.smoke = 1;
  }
}

/** Traffic AI: follow the road, turn at intersections, slow for the car ahead. */
export function updateTrafficCar(city, car, allCars, dt) {
  const road = nearestRoad(car.x, car.y);
  const ahead = car.cruise;
  // Steer back toward the lane centre.
  let steer = 0;
  const laneOffset = 24;
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const right = { x: -forward.y, y: forward.x };
  let targetX = car.x;
  let targetY = car.y;
  if (road.axis === 'v') {
    const dir = Math.sin(car.angle) > 0 ? 1 : -1;
    targetX = road.at + dir * laneOffset;
    targetY = car.y + Math.sin(car.angle) * 100;
  } else {
    const dir = Math.cos(car.angle) > 0 ? 1 : -1;
    targetX = car.x + Math.cos(car.angle) * 100;
    targetY = road.at + dir * laneOffset;
  }
  const toTarget = { x: targetX - car.x, y: targetY - car.y };
  const cross = forward.x * toTarget.y - forward.y * toTarget.x;
  steer = Math.max(-1, Math.min(1, cross / 40));
  // Slow down for a car close ahead.
  let throttle = 1;
  for (const other of allCars) {
    if (other === car || other.speed === undefined) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * forward.x + dy * forward.y;
    const across = Math.abs(dx * right.x + dy * right.y);
    if (along > 0 && along < 90 && across < 40) {
      throttle = 0;
      car.stuckTimer += dt;
      break;
    }
  }
  if (throttle === 1) car.stuckTimer = 0;
  // At an intersection, sometimes turn onto the crossing road.
  if (car.turnAt === null && Math.abs(car.x - road.at) < 60 && Math.abs(car.y - road.at) < 60) {
    car.turnAt = { x: road.at, y: road.at };
  }
  driveCarForward(city, car, throttle, steer, dt);
  // Random turn: when crossing an intersection centre, pick a new heading.
  if (road.axis === 'v') {
    for (const ry of ROADS_HORIZONTAL) {
      if (Math.abs(car.y - ry) < 8 && car.lastTurnRoad !== ry) {
        car.lastTurnRoad = ry;
        if (Math.random() < 0.25) {
          car.angle = Math.random() < 0.5 ? 0 : Math.PI;
        }
      }
    }
  } else {
    for (const rx of ROADS_VERTICAL) {
      if (Math.abs(car.x - rx) < 8 && car.lastTurnRoad !== rx) {
        car.lastTurnRoad = rx;
        if (Math.random() < 0.25) {
          car.angle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        }
      }
    }
  }
}

/** Police AI: chase the target, ramming it. Returns true when it touches the target. */
export function updatePoliceCar(city, car, target, dt) {
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const wantedAngle = Math.atan2(dy, dx);
  const diff = angleDifference(wantedAngle, car.angle);
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  driveCarForward(city, car, 1, steer, dt);
  const dist = Math.hypot(dx, dy);
  return dist < 58;
}

/** Two cars bumping: push apart and trade a little speed. */
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = CAR_LENGTH * 0.8;
  if (dist === 0 || dist >= min) return false;
  const push = (min - dist) / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const swap = a.speed;
  a.speed = b.speed * 0.6;
  b.speed = swap * 0.6;
  return true;
}
