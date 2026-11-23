// Vice Shores — the player: on-foot movement, getting in and out of cars, the punch
// and the pistol. The player is either on foot or driving exactly one car.
import {
  PLAYER_WALK_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, PLAYER_MAX_HP,
  PISTOL_AMMO_MAX, PISTOL_RELOAD_SECONDS, PUNCH_DAMAGE, PUNCH_RANGE,
} from './config.js';
import { resolveBuildingCollision, isInWater } from './city.js';
import { driveCarForward } from './cars.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    hp: PLAYER_MAX_HP,
    cash: 0,
    ammo: PISTOL_AMMO_MAX,
    reloading: 0,
    inCar: null,
    speed: 0,
    sprinting: false,
    punchTimer: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    invulnerable: 0,
  };
}

/** Move on foot: WASD/arrows, Shift to sprint, blocked by buildings and water. */
export function updatePlayerOnFoot(city, player, input, dt) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  player.sprinting = input.sprint && (mx !== 0 || my !== 0);
  const speed = player.sprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    player.x += (mx / len) * speed * dt;
    player.y += (my / len) * speed * dt;
    player.angle = Math.atan2(my, mx);
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  resolveBuildingCollision(city, player, PLAYER_RADIUS);
  if (isInWater(city, player.x, player.y)) {
    player.y -= 40 * dt * 10;
    player.hp -= 4 * dt;
  }
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.reloading > 0) {
    player.reloading -= dt;
    if (player.reloading <= 0) player.ammo = PISTOL_AMMO_MAX;
  }
  if (player.invulnerable > 0) player.invulnerable -= dt;
}

/** Drive the player's car: W/S throttle, A/D steering, Space handbrake. */
export function updatePlayerDriving(city, player, car, input, dt) {
  let throttle = 0;
  if (input.up) throttle = 1;
  if (input.down) throttle = -1;
  let steer = 0;
  if (input.left) steer = -1;
  if (input.right) steer = 1;
  if (input.handbrake) {
    car.speed *= Math.max(0, 1 - 4 * dt);
    steer *= 1.6;
  }
  driveCarForward(city, car, throttle, steer, dt);
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = Math.abs(car.speed);
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
}

/** The nearest stealable car within reach, or null. */
export function nearestStealableCar(cars, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of cars) {
    if (car.kind !== 'parked' && car.kind !== 'traffic') continue;
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      best = car;
      bestDist = d;
    }
  }
  return best;
}

/** Get in: the car becomes the player's, its driver is thrown out (traffic) or gone. */
export function enterCar(player, car) {
  car.driver = 'player';
  car.kind = 'player';
  player.inCar = car;
  player.x = car.x;
  player.y = car.y;
}

/** Get out: the player steps out beside the car; it stays parked where it stops. */
export function exitCar(player, car) {
  const side = { x: -Math.sin(car.angle), y: Math.cos(car.angle) };
  player.x = car.x + side.x * 34;
  player.y = car.y + side.y * 34;
  player.inCar = null;
  car.driver = 'none';
  car.kind = 'parked';
  car.speed = 0;
}

/** Throw a punch: short arc in front of the player. Returns the punch hitbox. */
export function startPunch(player) {
  if (player.punchCooldown > 0 || player.inCar) return null;
  player.punchTimer = 0.22;
  player.punchCooldown = 0.45;
  return {
    x: player.x + Math.cos(player.angle) * (PLAYER_RADIUS + PUNCH_RANGE / 2),
    y: player.y + Math.sin(player.angle) * (PLAYER_RADIUS + PUNCH_RANGE / 2),
    r: PUNCH_RANGE,
    damage: PUNCH_DAMAGE,
  };
}

/** Fire the pistol toward (tx, ty). Returns a bullet or null (empty / reloading). */
export function startShot(player, tx, ty) {
  if (player.inCar || player.shootCooldown > 0 || player.reloading > 0) return null;
  if (player.ammo <= 0) {
    player.reloading = PISTOL_RELOAD_SECONDS;
    return null;
  }
  player.ammo -= 1;
  player.shootCooldown = 0.22;
  const angle = Math.atan2(ty - player.y, tx - player.x);
  player.angle = angle;
  return {
    x: player.x + Math.cos(angle) * 22,
    y: player.y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * 760,
    vy: Math.sin(angle) * 760,
    life: 0.9,
    from: 'player',
    damage: 34,
  };
}

/** Heal a little when calm; called once a second by the world. */
export function calmHeal(player) {
  if (player.hp > 0 && player.hp < PLAYER_MAX_HP) player.hp = Math.min(PLAYER_MAX_HP, player.hp + 2);
}
