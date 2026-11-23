// Vice Shores — combat: bullets, the punch, guards who shoot back, and the
// particles every hit throws off. Bullets are plain data; the world steps them.
import { CAR_LENGTH } from './config.js';
import { hitBuilding } from './city.js';
import { scarePedestrians } from './traffic.js';

/** Move bullets, test hits against buildings, cars, guards, cops and the player. */
export function updateBullets(state, dt) {
  const keep = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (hitBuilding(state.city, b.x, b.y, 2)) {
      addSparks(state, b.x, b.y, 4);
      continue;
    }
    if (b.x < 0 || b.x > state.city.width || b.y < 0 || b.y > state.city.height) continue;
    let consumed = false;
    if (b.from === 'player') {
      for (const guard of state.guards) {
        if (!guard.alive) continue;
        if (Math.hypot(guard.x - b.x, guard.y - b.y) < 18) {
          guard.hp -= b.damage;
          addSparks(state, b.x, b.y, 6);
          if (guard.hp <= 0) {
            guard.alive = false;
            state.player.cash += 50;
            state.message = { text: 'Guard down — +$50', until: state.time + 1.5 };
          }
          consumed = true;
          break;
        }
      }
      if (!consumed) {
        for (const car of state.cars) {
          if (car.driver === 'player') continue;
          const dx = b.x - car.x;
          const dy = b.y - car.y;
          const along = Math.abs(dx * Math.cos(car.angle) + dy * Math.sin(car.angle));
          const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
          if (along < CAR_LENGTH / 2 && across < 18) {
            car.hp -= b.damage;
            addSparks(state, b.x, b.y, 5);
            consumed = true;
            break;
          }
        }
      }
      if (!consumed) {
        for (const ped of state.peds) {
          if (ped.downTimer > 0) continue;
          if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
            ped.downTimer = 6;
            scarePedestrians(state.peds, b.x, b.y, 300);
            consumed = true;
            break;
          }
        }
      }
    } else if (b.from === 'guard') {
      const player = state.player;
      if (!player.inCar && Math.hypot(player.x - b.x, player.y - b.y) < 16 && player.invulnerable <= 0) {
        player.hp -= b.damage;
        player.invulnerable = 0.5;
        state.shake = 0.5;
        consumed = true;
      } else if (player.inCar && Math.hypot(player.inCar.x - b.x, player.inCar.y - b.y) < 30) {
        player.inCar.hp -= b.damage;
        consumed = true;
      }
    }
    if (!consumed) keep.push(b);
  }
  state.bullets = keep;
}

/** Guards aim at the player and fire when close enough. */
export function updateGuards(state, dt) {
  for (const guard of state.guards) {
    if (!guard.alive) continue;
    const dx = state.player.x - guard.x;
    const dy = state.player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    guard.angle = Math.atan2(dy, dx);
    guard.shootTimer -= dt;
    if (dist < 460 && guard.shootTimer <= 0) {
      guard.shootTimer = 1.3;
      const angle = guard.angle + (Math.random() - 0.5) * 0.12;
      state.bullets.push({
        x: guard.x + Math.cos(angle) * 22,
        y: guard.y + Math.sin(angle) * 22,
        vx: Math.cos(angle) * 620,
        vy: Math.sin(angle) * 620,
        life: 1.1,
        from: 'guard',
        damage: 12,
      });
      state.sfx.enemyShot();
    }
  }
}

/** Apply a punch hitbox: guards, pedestrians and cops in the arc take the hit. */
export function applyPunch(state, punch) {
  let hitAnything = false;
  for (const guard of state.guards) {
    if (!guard.alive) continue;
    if (Math.hypot(guard.x - punch.x, guard.y - punch.y) < punch.r + 14) {
      guard.hp -= punch.damage;
      if (guard.hp <= 0) {
        guard.alive = false;
        state.player.cash += 50;
      }
      hitAnything = true;
    }
  }
  for (const ped of state.peds) {
    if (ped.downTimer > 0) continue;
    if (Math.hypot(ped.x - punch.x, ped.y - punch.y) < punch.r + 10) {
      ped.downTimer = 6;
      scarePedestrians(state.peds, punch.x, punch.y, 260);
      hitAnything = true;
    }
  }
  if (hitAnything) addSparks(state, punch.x, punch.y, 8);
  return hitAnything;
}

/** A burst of sparks at (x, y). */
export function addSparks(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.3,
      maxLife: 0.65,
      color: '#ffd76a',
      size: 2 + Math.random() * 2,
    });
  }
}

/** Smoke puff from a wrecked car. */
export function addSmoke(state, x, y) {
  state.particles.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y + (Math.random() - 0.5) * 20,
    vx: (Math.random() - 0.5) * 20,
    vy: -30 - Math.random() * 30,
    life: 1.2,
    maxLife: 1.2,
    color: '#555555',
    size: 7 + Math.random() * 6,
  });
}

/** Step every particle; drop the dead ones. */
export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  // Skid marks fade slowly.
  for (const s of state.skids) s.life -= dt * 0.25;
  state.skids = state.skids.filter((s) => s.life > 0);
}
