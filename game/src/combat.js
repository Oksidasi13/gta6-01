// Vice Shores — combat: fists, pistol and SMG, bullets and damage.
// Pure logic: bullets fly as data; the world passes in targets to hit.
// Weapon slots: 1 fists (infinite), 2 pistol (12-round mag),
// 3 SMG (30-round mag, unlocked after mission 4).

import { GUN, SMG, PLAYER } from './config.js';
import { knockPedDown } from './traffic.js';
import { damageCar } from './cars.js';

export const WEAPONS = {
  fists: { slot: 1, name: 'FISTS', ammo: '∞', mag: Infinity },
  pistol: { slot: 2, name: 'PISTOL', ammo: '12' },
  smg: { slot: 3, name: 'SMG', ammo: '30' },
};

export function createCombat() {
  return {
    bullets: [], // {x, y, angle, travelled, damage}
    weapon: 'fists',
    mag: GUN.magSize,
    reserve: GUN.reserveStart,
    smgMag: SMG.magSize,
    smgReserve: SMG.reserveStart,
    smgUnlocked: false,
    reloadTimer: 0,
    fireCooldown: 0,
    punchTimer: 0,
    muzzleTimer: 0, // seconds of muzzle flash left to draw
    muzzleX: 0,
    muzzleY: 0,
  };
}

export function weaponSpec(combat) {
  return combat.weapon === 'smg' ? SMG : GUN;
}

export function switchWeapon(combat, weapon) {
  if (weapon === 'smg' && !combat.smgUnlocked) return false;
  if (weapon === 'fists' || weapon === 'pistol' || weapon === 'smg') {
    combat.weapon = weapon;
    combat.reloadTimer = 0;
    return true;
  }
  return false;
}

export function canShoot(combat) {
  if (combat.weapon === 'fists') return false;
  const mag = combat.weapon === 'smg' ? combat.smgMag : combat.mag;
  return mag > 0 && combat.reloadTimer <= 0 && combat.fireCooldown <= 0;
}

export function shoot(combat, x, y, angle) {
  if (!canShoot(combat)) return false;
  const spec = weaponSpec(combat);
  combat.bullets.push({
    x: x + Math.cos(angle) * 22,
    y: y + Math.sin(angle) * 22,
    angle,
    travelled: 0,
    damage: spec.bulletDamage,
    range: spec.bulletRange,
    speed: spec.bulletSpeed,
  });
  if (combat.weapon === 'smg') combat.smgMag -= 1;
  else combat.mag -= 1;
  combat.fireCooldown = spec.fireCooldown;
  combat.muzzleTimer = 0.06;
  combat.muzzleX = x + Math.cos(angle) * 26;
  combat.muzzleY = y + Math.sin(angle) * 26;
  return true;
}

export function startReload(combat) {
  if (combat.weapon === 'fists' || combat.reloadTimer > 0) return false;
  const mag = combat.weapon === 'smg' ? combat.smgMag : combat.mag;
  const reserve = combat.weapon === 'smg' ? combat.smgReserve : combat.reserve;
  const size = combat.weapon === 'smg' ? SMG.magSize : GUN.magSize;
  if (mag >= size || reserve <= 0) return false;
  combat.reloadTimer = weaponSpec(combat).reloadTime;
  return true;
}

// Punch: damage + knock down peds in a short arc in front of the player.
// Thugs take two punches. Returns { hits, downs }.
export function punch(combat, px, py, facing, peds) {
  if (combat.punchTimer > 0) return { hits: 0, downs: 0 };
  combat.punchTimer = PLAYER.punchCooldown;
  let hits = 0;
  let downs = 0;
  for (const ped of peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - px, ped.y - py);
    if (d > PLAYER.punchRange) continue;
    const a = Math.atan2(ped.y - py, ped.x - px);
    let diff = Math.abs(a - facing) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < Math.PI / 2.5) {
      const res = knockPedDown(ped, 4, PLAYER.punchDamage);
      hits += 1;
      if (res === 'down') downs += 1;
    }
  }
  return { hits, downs };
}

// Step timers and bullets. targets: { peds, policeCars, cars } — objects
// with x/y and (for peds) a `state`, (for cars) `health`.
// Returns hit events: [{type:'ped'|'car', target, x, y, down}].
export function updateCombat(combat, dt, targets, city) {
  if (combat.fireCooldown > 0) combat.fireCooldown -= dt;
  if (combat.punchTimer > 0) combat.punchTimer -= dt;
  if (combat.muzzleTimer > 0) combat.muzzleTimer -= dt;
  if (combat.reloadTimer > 0) {
    combat.reloadTimer -= dt;
    if (combat.reloadTimer <= 0) {
      if (combat.weapon === 'smg') {
        const need = SMG.magSize - combat.smgMag;
        const take = Math.min(need, combat.smgReserve);
        combat.smgMag += take;
        combat.smgReserve -= take;
      } else {
        const need = GUN.magSize - combat.mag;
        const take = Math.min(need, combat.reserve);
        combat.mag += take;
        combat.reserve -= take;
      }
    }
  }
  const hits = [];
  const kept = [];
  for (const b of combat.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.travelled += b.speed * dt;
    let dead = b.travelled > b.range
      || b.x < 0 || b.x > city.w || b.y < 0 || b.y > city.h;
    if (!dead) {
      // Buildings stop bullets.
      for (const bd of city.buildings) {
        if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) {
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const ped of targets.peds || []) {
        if (ped.state === 'down') continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
          const res = knockPedDown(ped, 5, b.damage);
          hits.push({ type: 'ped', target: ped, x: b.x, y: b.y, down: res === 'down' });
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of [...(targets.policeCars || []), ...(targets.cars || [])]) {
        if (car.wrecked) continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < 22) {
          const wrecked = damageCar(car, b.damage);
          hits.push({ type: 'car', target: car, x: b.x, y: b.y, down: wrecked });
          dead = true;
          break;
        }
      }
    }
    if (!dead) kept.push(b);
  }
  combat.bullets = kept;
  return hits;
}
