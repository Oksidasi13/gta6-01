// Vice Shores — car entities and arcade driving physics.
// Pure logic: a car is a plain object; stepping it needs only the city.

import { CAR, WORLD, CAR_NAMES } from './config.js';
import { clamp, mulberry32, pick } from './random.js';
import { pushOutOfBuildings } from './city.js';

const CAR_COLORS = [
  '#d94f3d', '#3d7bd9', '#e8c33a', '#7bc043', '#8e44ad',
  '#e8e8e8', '#222831', '#e67e22', '#16a085', '#c0c8d0',
];

export function randomCarColor(rng) {
  return pick(rng, CAR_COLORS);
}

export function randomCarName(rng) {
  return pick(rng, CAR_NAMES);
}

export function createCar(x, y, angle, color, opts = {}) {
  return {
    x, y,
    angle, // heading, radians; 0 = east
    speed: 0, // signed px/s along heading
    color,
    name: opts.name || 'CITY SEDAN',
    kind: opts.kind || 'civilian', // 'civilian' | 'police' | 'player' | 'rival' | 'target'
    owner: opts.owner || 'npc', // 'npc' | 'player' (stolen cars stay 'npc' until taken)
    stolen: false,
    health: 100,
    wrecked: false,
    skidding: false, // handbrake slide (skid marks + smoke)
    callsign: opts.callsign || null,
    role: opts.role || null,
    // AI driving state (traffic / police fill these in)
    ai: opts.ai || null,
    parked: !!opts.parked,
    id: opts.id || 0,
  };
}

// Damage as a 0..100 percentage for the HUD ("current car damage").
export function carDamagePct(car) {
  return Math.round(100 - car.health);
}

export function repairCar(car) {
  car.health = 100;
  car.wrecked = false;
}

export function damageCar(car, amount) {
  car.health = Math.max(0, car.health - amount);
  if (car.health <= 0) car.wrecked = true;
  return car.wrecked;
}

export function makeCarFleet(seed, count, placer) {
  const rng = mulberry32(seed);
  const cars = [];
  for (let i = 0; i < count; i++) {
    cars.push(placer(rng, i));
  }
  return cars;
}

// Arcade step for a player-driven car.
// input: { up, down, left, right, handbrake } booleans.
export function updateDrivenCar(car, input, dt, city) {
  if (car.wrecked) return;
  const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  // Steering only bites while moving, and reverses when reversing.
  const steerFactor = clamp(Math.abs(car.speed) / 120, 0, 1) * Math.sign(car.speed || 1);
  car.angle += steerInput * CAR.steerRate * steerFactor * dt;

  if (input.up) car.speed += CAR.accel * dt;
  if (input.down) {
    if (car.speed > 5) car.speed -= CAR.brake * dt; // brake
    else car.speed -= CAR.reverseAccel * dt; // reverse
  }
  car.speed = clamp(car.speed, -CAR.reverseMax, CAR.maxSpeed);
  // Drag, stronger with the handbrake.
  const drag = input.handbrake ? CAR.handbrakeDrag : CAR.drag;
  car.speed -= car.speed * drag * dt;
  if (Math.abs(car.speed) < 2 && !input.up && !input.down) car.speed = 0;
  car.skidding = !!input.handbrake && Math.abs(car.speed) > 120;

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 20, WORLD.w - 20);
  car.y = clamp(car.y, 20, WORLD.h - 20);
  const hit = pushOutOfBuildings(city, car, CAR.radius);
  if (hit) car.speed *= 0.45; // scrub speed off on a building hit
}

// Simple forward motion for AI cars (traffic/police set angle + speed).
export function updateAICar(car, dt, city) {
  if (car.wrecked) return;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 20, WORLD.w - 20);
  car.y = clamp(car.y, 20, WORLD.h - 20);
  if (pushOutOfBuildings(city, car, CAR.radius)) car.speed *= 0.5;
}

// Drive a car toward a waypoint (used by the rival and the target car):
// steer toward it, ease off near it. Returns true when arrived (< 60px).
export function driveToward(car, tx, ty, topSpeed, dt, city) {
  if (car.wrecked) return false;
  const d = Math.hypot(tx - car.x, ty - car.y);
  if (d < 60) return true;
  const targetAngle = Math.atan2(ty - car.y, tx - car.x);
  const delta = ((targetAngle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  car.angle += clamp(delta, -2.2 * dt, 2.2 * dt);
  const want = Math.min(topSpeed, 140 + d * 0.4);
  car.speed += (want - car.speed) * Math.min(1, 1.4 * dt);
  updateAICar(car, dt, city);
  return Math.hypot(tx - car.x, ty - car.y) < 60;
}

// Distance between two cars (centre to centre).
export function carDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Nearest car to a point, within maxDist. Returns null if none.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const c of cars) {
    if (c.wrecked) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
