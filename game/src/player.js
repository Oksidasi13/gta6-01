// Vice Shores — the player: on-foot movement, health, armour, money, RP.
// Pure logic: takes an input snapshot and the city, mutates the player.

import { WORLD, PLAYER } from './config.js';
import { clamp } from './random.js';
import { pushOutOfBuildings } from './city.js';
import { isDown } from './input.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0, // facing, radians
    moving: false,
    health: PLAYER.health,
    armour: PLAYER.armour,
    money: 0,
    rp: 0, // respect points
    onFoot: true,
    car: null, // the car entity the player is driving, or null
    speed: 0, // current on-foot speed
    punchCooldown: 0,
    lastDamageAt: -Infinity, // game-time seconds of the last hit taken
    down: false, // knocked down (peds only use this; player uses health)
  };
}

// Damage soaks armour first, then health. Returns true if wasted.
export function damagePlayer(p, amount, now) {
  let left = amount;
  if (p.armour > 0) {
    const absorbed = Math.min(p.armour, left);
    p.armour -= absorbed;
    left -= absorbed;
  }
  p.health = Math.max(0, p.health - left);
  p.lastDamageAt = now;
  return p.health <= 0;
}

export function healPlayer(p, amount) {
  p.health = Math.min(PLAYER.health, p.health + amount);
}

export function addArmour(p, amount) {
  p.armour = Math.min(PLAYER.armourMax, p.armour + amount);
}

export function addRP(p, amount) {
  p.rp += amount;
  return p.rp;
}

// On-foot step. Returns nothing; mutates p.
export function updatePlayerOnFoot(p, input, dt, city, now) {
  let dx = 0;
  let dy = 0;
  if (isDown(input, 'KeyW', 'ArrowUp')) dy -= 1;
  if (isDown(input, 'KeyS', 'ArrowDown')) dy += 1;
  if (isDown(input, 'KeyA', 'ArrowLeft')) dx -= 1;
  if (isDown(input, 'KeyD', 'ArrowRight')) dx += 1;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0;
  if (len > 0) {
    const sprint = isDown(input, 'ShiftLeft', 'ShiftRight');
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    p.speed = speed;
    p.angle = Math.atan2(dy, dx);
    p.x += (dx / len) * speed * dt;
    p.y += (dy / len) * speed * dt;
  } else {
    p.speed = 0;
  }
  // World bounds + water edge: the player can walk the sand but not swim.
  p.x = clamp(p.x, 16, WORLD.w - 16);
  p.y = clamp(p.y, 16, city.waterY - 6);
  pushOutOfBuildings(city, p, PLAYER.radius);
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  // Slow health regen out of combat.
  if (p.health > 0 && p.health < PLAYER.health && now - p.lastDamageAt > PLAYER.regenDelay) {
    healPlayer(p, PLAYER.regenPerSec * dt);
  }
}

// Teleport the player (respawn after busted / wasted).
export function respawnPlayer(p, x, y) {
  p.x = x;
  p.y = y;
  p.health = PLAYER.health;
  p.armour = 0;
  p.onFoot = true;
  p.car = null;
  p.speed = 0;
  p.lastDamageAt = -Infinity;
}
