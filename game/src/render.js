// Vice Shores — canvas renderer, DUSK edition: golden-hour sunset.
// Warm light, long shadows to the east, headlights on, lit windows,
// neon, streetlight pools, palms and pier, helicopter searchlight.
// Draws the world in world-space (clipped to the camera window).

import { COLORS, WORLD } from './config.js';
import { missionTarget, currentStage } from './missions.js';
import { trafficLightPhase } from './city.js';
import { hash2 } from './random.js';

const VIEW_W = 1280;
const VIEW_H = 720;

// Shadows point east (+x) and a little south: the sun is low in the west.
const SHADOW_DX = 1;
const SHADOW_DY = 0.35;

function inView(cam, x, y, margin = 80) {
  return x > cam.x - margin && x < cam.x + VIEW_W + margin
    && y > cam.y - margin && y < cam.y + VIEW_H + margin;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, car, time) {
  // Headlight cone (dusk: lights on) — pale yellow wedge ahead of the car.
  if (!car.wrecked) {
    const hx = Math.cos(car.angle);
    const hy = Math.sin(car.angle);
    const grad = ctx.createLinearGradient(
      car.x + hx * 20, car.y + hy * 20,
      car.x + hx * 150, car.y + hy * 150,
    );
    grad.addColorStop(0, 'rgba(255, 236, 170, 0.30)');
    grad.addColorStop(1, 'rgba(255, 236, 170, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(car.x + hx * 20 - hy * 8, car.y + hy * 20 + hx * 8);
    ctx.lineTo(car.x + hx * 150 - hy * 42, car.y + hy * 150 + hx * 42);
    ctx.lineTo(car.x + hx * 150 + hy * 42, car.y + hy * 150 - hx * 42);
    ctx.lineTo(car.x + hx * 20 + hy * 8, car.y + hy * 20 - hx * 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Long soft shadow to the east.
  ctx.fillStyle = 'rgba(20, 8, 0, 0.30)';
  ctx.beginPath();
  ctx.ellipse(16, 7, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
  roundRect(ctx, -23, -12, 46, 24, 7);
  ctx.fill();
  if (car.kind === 'police') {
    // Black-and-white doors + flashing light bar with a glow halo.
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-6, -12, 12, 24);
    const flash = Math.floor(time * 4) % 2 === 0;
    const c1 = flash ? '#ff2d2d' : '#2d7dff';
    const c2 = flash ? '#2d7dff' : '#ff2d2d';
    const glow = ctx.createRadialGradient(0, -14, 2, 0, -14, 26);
    glow.addColorStop(0, flash ? 'rgba(255,45,45,0.55)' : 'rgba(45,125,255,0.55)');
    glow.addColorStop(1, 'rgba(255,45,45,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -14, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c1;
    ctx.fillRect(-8, -15, 6, 5);
    ctx.fillStyle = c2;
    ctx.fillRect(2, -15, 6, 5);
  }
  // Windshield + roof.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.fillRect(6, -9, 8, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-12, -9, 10, 18);
  // Wheels.
  ctx.fillStyle = '#141414';
  ctx.fillRect(-16, -14, 10, 4);
  ctx.fillRect(-16, 10, 10, 4);
  ctx.fillRect(8, -14, 10, 4);
  ctx.fillRect(8, 10, 10, 4);
  // Taillights: glowing red at the rear.
  ctx.fillStyle = '#ff2d2d';
  ctx.fillRect(-24, -10, 3, 5);
  ctx.fillRect(-24, 5, 3, 5);
  ctx.restore();
}

function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  // Long dusk shadow.
  ctx.fillStyle = 'rgba(20, 8, 0, 0.30)';
  ctx.beginPath();
  ctx.ellipse(7, 4, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = ped.state === 'walk' || ped.state === 'flee'
    ? Math.sin(ped.walkPhase) * 1.5
    : 0;
  if (ped.state === 'down') {
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Pants, then shirt, then head — two-frame walk bob.
    ctx.fillStyle = ped.pants;
    ctx.fillRect(-5, -2 + bob, 10, 8);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(0, -2 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(Math.cos(ped.angle) * 3, -3 + bob + Math.sin(ped.angle) * 3, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPalm(ctx, palm) {
  ctx.save();
  ctx.translate(palm.x, palm.y);
  ctx.strokeStyle = '#7a5a34';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(palm.lean * 14, -16, palm.lean * 22, -26);
  ctx.stroke();
  ctx.strokeStyle = '#2f7a2c';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55 + palm.lean;
    ctx.beginPath();
    ctx.moveTo(palm.lean * 22, -26);
    ctx.quadraticCurveTo(
      palm.lean * 22 + Math.cos(a) * 12, -26 + Math.sin(a) * 12,
      palm.lean * 22 + Math.cos(a) * 22, -26 + Math.sin(a) * 22 + 6,
    );
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(20, 8, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(10, 3, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHelicopter(ctx, heli, time) {
  // Searchlight cone on the ground first (under the heli).
  const dx = heli.lightX - heli.x;
  const dy = heli.lightY - heli.y;
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const spread = 0.28;
  const grad = ctx.createLinearGradient(heli.x, heli.y, heli.lightX, heli.lightY);
  grad.addColorStop(0, 'rgba(255, 244, 200, 0.16)');
  grad.addColorStop(1, 'rgba(255, 244, 200, 0.42)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(heli.x, heli.y);
  ctx.arc(heli.x, heli.y, len + 60, ang - spread, ang + spread);
  ctx.closePath();
  ctx.fill();
  // Ground pool where the light lands.
  const pool = ctx.createRadialGradient(heli.lightX, heli.lightY, 4, heli.lightX, heli.lightY, 85);
  pool.addColorStop(0, 'rgba(255, 244, 200, 0.5)');
  pool.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(heli.lightX, heli.lightY, 85, 0, Math.PI * 2);
  ctx.fill();
  // Heli silhouette, top-down, with spinning rotor blur.
  ctx.save();
  ctx.translate(heli.x, heli.y);
  // Soft glow so the heli reads against the dark road.
  const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  halo.addColorStop(0, 'rgba(255, 244, 200, 0.28)');
  halo.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 8, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(14, 8, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(Math.sin(time * 0.8) * 0.05);
  // Rotor disc + blades.
  ctx.fillStyle = 'rgba(220, 230, 240, 0.10)';
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240, 244, 250, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(heli.rotor) * 36, Math.sin(heli.rotor) * 36);
  ctx.lineTo(-Math.cos(heli.rotor) * 36, -Math.sin(heli.rotor) * 36);
  ctx.moveTo(Math.cos(heli.rotor + Math.PI / 2) * 36, Math.sin(heli.rotor + Math.PI / 2) * 36);
  ctx.lineTo(-Math.cos(heli.rotor + Math.PI / 2) * 36, -Math.sin(heli.rotor + Math.PI / 2) * 36);
  ctx.stroke();
  ctx.fillStyle = '#46586a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#3a4552';
  ctx.fillRect(-34, -3, 20, 6); // tail
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath();
  ctx.arc(7, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Red beacon blink.
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath();
    ctx.arc(-6, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderWorld(ctx, world) {
  const { city, camera } = world;
  const time = world.time;

  // --- Ground: two-tone dusk grass tiles ---
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(camera.x, camera.y, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.grassDark;
  const tile = 160;
  const x0 = Math.floor(camera.x / tile) * tile;
  const y0 = Math.floor(camera.y / tile) * tile;
  for (let x = x0; x < camera.x + VIEW_W; x += tile) {
    for (let y = y0; y < camera.y + VIEW_H; y += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }

  // --- Beach + water (south edge) ---
  if (camera.y + VIEW_H > city.beachY) {
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(camera.x, city.beachY, VIEW_W, city.waterY - city.beachY);
    // Sand texture dots (deterministic from coordinates).
    ctx.fillStyle = 'rgba(120,90,40,0.30)';
    for (let x = Math.floor(camera.x / 47) * 47; x < camera.x + VIEW_W; x += 47) {
      const sy = city.beachY + ((x * 37) % 97) + 8;
      ctx.fillRect(x, sy, 4, 3);
      ctx.fillRect(x + 20, sy + 30, 3, 3);
    }
    // Wooden pier planks + posts.
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
    ctx.fillStyle = '#6e5232';
    for (let y = city.pier.y + 8; y < city.pier.y + city.pier.h; y += 16) {
      ctx.fillRect(city.pier.x, y, city.pier.w, 2);
    }
    ctx.fillStyle = '#5d4526';
    for (let y = city.pier.y + 4; y < city.pier.y + city.pier.h; y += 40) {
      ctx.fillRect(city.pier.x - 4, y, 6, 6);
      ctx.fillRect(city.pier.x + city.pier.w - 2, y, 6, 6);
    }
    // Water with animated sine-wave shoreline lines.
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(camera.x, city.waterY, VIEW_W, WORLD.h - city.waterY);
    ctx.strokeStyle = 'rgba(255, 210, 140, 0.30)';
    ctx.lineWidth = 2;
    for (let y = city.waterY + 14; y < WORLD.h; y += 26) {
      ctx.beginPath();
      for (let x = camera.x; x < camera.x + VIEW_W; x += 32) {
        const yy = y + Math.sin((x + time * 40) / 90) * 3;
        if (x === camera.x) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // Beach umbrellas.
    for (const u of city.umbrellas) {
      if (!inView(camera, u.x, u.y, 40)) continue;
      ctx.fillStyle = 'rgba(20, 8, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(u.x + 8, u.y + 4, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d4526';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(u.x, u.y - 16);
      ctx.stroke();
      ctx.fillStyle = u.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y - 16, 15, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
    // Palm trees.
    for (const palm of city.palms) {
      if (inView(camera, palm.x, palm.y, 40)) drawPalm(ctx, palm);
    }
  }

  // --- Parks ---
  for (const park of city.parks) {
    if (!inView(camera, park.x, park.y) && !inView(camera, park.x + park.w, park.y + park.h)) continue;
    ctx.fillStyle = COLORS.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#2c5a28';
    for (let i = 0; i < 5; i++) {
      const tx = park.x + 20 + ((i * 53) % Math.max(20, park.w - 40));
      const ty = park.y + 18 + ((i * 31) % Math.max(20, park.h - 36));
      ctx.beginPath();
      ctx.arc(tx, ty, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Roads ---
  ctx.fillStyle = COLORS.road;
  for (const rx of city.roadsX) {
    ctx.fillRect(rx - city.roadW / 2, Math.max(0, camera.y - 10), city.roadW, VIEW_H + 20);
  }
  for (const ry of city.roadsY) {
    ctx.fillRect(Math.max(0, camera.x - 10), ry - city.roadW / 2, VIEW_W + 20, city.roadW);
  }
  // Sidewalk borders: lighter strips along each road edge.
  ctx.fillStyle = 'rgba(200, 205, 210, 0.35)';
  for (const rx of city.roadsX) {
    ctx.fillRect(rx - city.roadW / 2 - 4, Math.max(0, camera.y - 10), 3, VIEW_H + 20);
    ctx.fillRect(rx + city.roadW / 2 + 1, Math.max(0, camera.y - 10), 3, VIEW_H + 20);
  }
  for (const ry of city.roadsY) {
    ctx.fillRect(Math.max(0, camera.x - 10), ry - city.roadW / 2 - 4, VIEW_W + 20, 3);
    ctx.fillRect(Math.max(0, camera.x - 10), ry + city.roadW / 2 + 1, VIEW_W + 20, 3);
  }
  // Centre dashes.
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  for (const rx of city.roadsX) {
    ctx.moveTo(rx, Math.max(0, camera.y));
    ctx.lineTo(rx, camera.y + VIEW_H);
  }
  for (const ry of city.roadsY) {
    ctx.moveTo(Math.max(0, camera.x), ry);
    ctx.lineTo(camera.x + VIEW_W, ry);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Zebra crosswalks at every intersection.
  ctx.fillStyle = 'rgba(240, 240, 240, 0.75)';
  for (const rx of city.roadsX) {
    for (const ry of city.roadsY) {
      if (!inView(camera, rx, ry, 60)) continue;
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(rx + i * 9 - 3, ry - 30, 6, 12);
        ctx.fillRect(rx - 30, ry + i * 9 - 3, 12, 6);
      }
    }
  }

  // --- Streetlight pools (warm light on the roads) ---
  for (const sl of city.streetlights) {
    if (!inView(camera, sl.x, sl.y, 90)) continue;
    const pool = ctx.createRadialGradient(sl.x, sl.y, 4, sl.x, sl.y, 85);
    pool.addColorStop(0, 'rgba(255, 200, 110, 0.30)');
    pool.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(sl.x, sl.y, 85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3f46';
    ctx.fillRect(sl.x - 2, sl.y - 2, 4, 4);
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(sl.x, sl.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Traffic lights at major intersections ---
  for (const tl of city.trafficLights) {
    if (!inView(camera, tl.x, tl.y, 40)) continue;
    const phase = trafficLightPhase(tl, time);
    ctx.fillStyle = '#22262b';
    ctx.fillRect(tl.x - 4, tl.y - 14, 8, 28);
    const glowColor = phase === 'green' ? '#37d67a' : phase === 'amber' ? '#ffb020' : '#ff3b30';
    const glow = ctx.createRadialGradient(tl.x, tl.y, 1, tl.x, tl.y, 18);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tl.x, tl.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phase === 'red' ? '#ff3b30' : '#551111';
    ctx.beginPath();
    ctx.arc(tl.x, tl.y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phase === 'amber' ? '#ffb020' : '#554411';
    ctx.beginPath();
    ctx.arc(tl.x, tl.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phase === 'green' ? '#37d67a' : '#113311';
    ctx.beginPath();
    ctx.arc(tl.x, tl.y + 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Garage building ---
  const g = city.garage;
  if (inView(camera, g.x + g.w / 2, g.y + g.h / 2, 120)) {
    ctx.fillStyle = 'rgba(20, 8, 0, 0.3)';
    ctx.fillRect(g.x + 10, g.y + 8, g.w, g.h);
    ctx.fillStyle = g.color;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = '#2c3844';
    ctx.fillRect(g.x + 12, g.y + 14, g.w - 24, g.h - 28);
    ctx.fillStyle = '#ffd23f';
    ctx.font = '700 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GARAGE', g.x + g.w / 2, g.y + 12);
    ctx.textAlign = 'left';
  }

  // --- Buildings (long dusk shadows, lit windows, neon, rooftop AC) ---
  for (const b of city.buildings) {
    if (!inView(camera, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
    const lift = b.height * 3;
    const shLen = 14 + b.height * 9;
    // Long soft shadow to the east.
    ctx.fillStyle = 'rgba(20, 8, 0, 0.30)';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - lift);
    ctx.lineTo(b.x + b.w, b.y - lift);
    ctx.lineTo(b.x + b.w + shLen, b.y + b.h * 0.4);
    ctx.lineTo(b.x + b.w + shLen, b.y + b.h);
    ctx.lineTo(b.x + shLen * 0.4, b.y + b.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y - lift, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(b.x, b.y - lift, b.w, 8);
    // Rooftop edge trim + AC boxes.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y - lift, b.w, b.h);
    ctx.fillStyle = 'rgba(40,45,52,0.8)';
    for (let i = 0; i < b.ac; i++) {
      ctx.fillRect(b.x + 12 + i * 26, b.y - lift + 10, 16, 10);
    }
    // Windows: a grid, many lit warm yellow at dusk.
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const lit = hash2(Math.floor(b.x) + i * 7, Math.floor(b.y) + j * 13) < b.lit;
        ctx.fillStyle = lit ? '#ffd27a' : 'rgba(20,30,45,0.55)';
        ctx.fillRect(b.x + 10 + i * 34, b.y - lift + 14 + j * 34, 14, 18);
      }
    }
    // Neon sign: glowing rectangle with text-like bars.
    if (b.neon) {
      const nx = b.x + 8;
      const ny = b.y - lift - 14;
      const glow = ctx.createRadialGradient(nx + 20, ny + 6, 2, nx + 20, ny + 6, 34);
      glow.addColorStop(0, b.neon);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(nx - 14, ny - 14, 68, 34);
      ctx.fillStyle = b.neon;
      ctx.fillRect(nx, ny, 40, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(nx + 4, ny + 4, 24, 2);
      ctx.fillRect(nx + 4, ny + 8, 14, 2);
    }
  }

  // --- Mission marker: pulsing yellow diamond + beam ---
  const target = missionTarget(world.missions);
  if (target && inView(camera, target.x, target.y, 120)) {
    const pulse = 1 + Math.sin(time * 5) * 0.18;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.fillStyle = 'rgba(255, 210, 63, 0.18)';
    ctx.fillRect(-16, -90, 32, 90);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd23f';
    const s = 16 * pulse;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }

  // --- Pickups (ammo / armour crates) ---
  for (const pk of world.pickups) {
    if (pk.taken || !inView(camera, pk.x, pk.y, 40)) continue;
    const bobY = Math.sin(time * 3 + pk.x) * 2;
    ctx.save();
    ctx.translate(pk.x, pk.y + bobY);
    if (pk.kind === 'ammo') {
      ctx.fillStyle = '#37d67a';
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = '#0c3d20';
      ctx.font = '700 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AMMO', 0, 3);
    } else {
      ctx.fillStyle = '#2d7dff';
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ARMOUR', 0, 3);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // --- Cars: parked, traffic, roadblock, police, rival, target, player car ---
  const carsToDraw = [
    ...world.traffic.parked,
    ...world.traffic.aiCars,
    ...(world.police.roadblock ? world.police.roadblock.cars : []),
    ...world.police.cars,
  ];
  if (world.rival) carsToDraw.push(world.rival.car);
  if (world.target) carsToDraw.push(world.target.car);
  for (const car of carsToDraw) {
    if (inView(camera, car.x, car.y)) drawCar(ctx, car, time);
  }
  const p = world.player;
  if (!p.onFoot && p.car && inView(camera, p.car.x, p.car.y)) drawCar(ctx, p.car, time);

  // --- Pedestrians + thugs ---
  for (const ped of [...world.traffic.peds, ...world.thugs]) {
    if (ped.x > camera.x - 40 && ped.x < camera.x + VIEW_W + 40
      && ped.y > camera.y - 40 && ped.y < camera.y + VIEW_H + 40) {
      drawPed(ctx, ped);
    }
  }

  // --- Player on foot ---
  if (p.onFoot && inView(camera, p.x, p.y)) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(20, 8, 0, 0.30)';
    ctx.beginPath();
    ctx.ellipse(7, 5, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(p.angle) * 8, Math.sin(p.angle) * 8);
    ctx.lineTo(Math.cos(p.angle) * 16, Math.sin(p.angle) * 16);
    ctx.stroke();
    ctx.restore();
  }

  // --- Bullets + muzzle flash ---
  ctx.fillStyle = '#ffe66d';
  for (const b of world.combat.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.combat.muzzleTimer > 0) {
    const flash = ctx.createRadialGradient(
      world.combat.muzzleX, world.combat.muzzleY, 1,
      world.combat.muzzleX, world.combat.muzzleY, 22,
    );
    flash.addColorStop(0, 'rgba(255, 240, 160, 0.95)');
    flash.addColorStop(1, 'rgba(255, 160, 40, 0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(world.combat.muzzleX, world.combat.muzzleY, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Particles (exhaust, skid marks, sand dust) ---
  for (const pt of world.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife) * 0.6;
    ctx.fillStyle = pt.color.replace(/[\d.]+\)$/, `${alpha})`);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Helicopter + searchlight (top layer) ---
  if (world.heli.active) drawHelicopter(ctx, world.heli, time);

  // --- Package pickup sparkle (pickup stages) ---
  const curStage = currentStage(world.missions);
  if (curStage && curStage.kind === 'pickup' && target && inView(camera, target.x, target.y, 60)) {
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.fillStyle = '#ff8c1a';
    ctx.fillRect(-9, -7, 18, 14);
    ctx.strokeStyle = '#7a3c00';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -7, 18, 14);
    ctx.restore();
  }

  // --- Dusk vignette + warm wash over the whole frame ---
  const vx = camera.x + VIEW_W / 2;
  const vy = camera.y + VIEW_H / 2;
  const vig = ctx.createRadialGradient(vx, vy, VIEW_H * 0.35, vx, vy, VIEW_H * 0.85);
  vig.addColorStop(0, 'rgba(255, 140, 60, 0.05)');
  vig.addColorStop(0.7, 'rgba(60, 20, 5, 0.12)');
  vig.addColorStop(1, 'rgba(20, 8, 2, 0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(camera.x, camera.y, VIEW_W, VIEW_H);
}

export function drawTitleScreen(ctx, w, h, time, bestScore) {
  // Sunset gradient sky over a stylised skyline.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ff9a56');
  grad.addColorStop(0.55, '#ff5e78');
  grad.addColorStop(1, '#2b1a4d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Sun — off to the right so it never sits behind the subtitle.
  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(1010, 170, 56 + Math.sin(time * 1.2) * 4, 0, Math.PI * 2);
  ctx.fill();
  // Skyline with lit windows; buildings end at the beach line.
  ctx.fillStyle = '#1c1033';
  const base = 560;
  for (let i = 0; i < 14; i++) {
    const bw = 70 + ((i * 37) % 60);
    const bh = 120 + ((i * 53) % 160);
    ctx.fillRect(i * 96 - 10, base - bh, bw, bh);
    ctx.fillStyle = '#ffd27a';
    for (let wy = base - bh + 14; wy < base - 20; wy += 26) {
      for (let wx = i * 96 + 2; wx < i * 96 + bw - 10; wx += 20) {
        if (hash2(wx, wy) < 0.4) ctx.fillRect(wx, wy, 6, 8);
      }
    }
    ctx.fillStyle = '#1c1033';
  }
  // Water strip + beach.
  ctx.fillStyle = '#2f7fc9';
  ctx.fillRect(0, 600, w, 60);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(0, 585, w, 15);
  // Title.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px Arial, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText('VICE SHORES', w / 2, 200);
  ctx.shadowBlur = 0;
  ctx.font = '700 26px Arial, sans-serif';
  ctx.fillStyle = '#ffe66d';
  ctx.fillText('A tiny open-world crime spree at dusk', w / 2, 245);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 22px Arial, sans-serif';
  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) ctx.fillText('Press ENTER to start', w / 2, 420);
  ctx.font = '400 17px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('WASD walk · Shift sprint · E steal car · Space punch / handbrake · Mouse aim + click shoot · R reload · M mute', w / 2, 470);
  ctx.fillText('1/2/3 weapons · Z/X/C crew abilities · Q radio · 8 missions, $9,200 on the table.', w / 2, 498);
  if (bestScore > 0) {
    ctx.fillStyle = '#ffe66d';
    ctx.fillText(`Best score: $${bestScore}`, w / 2, 540);
  }
}

export function drawOverlay(ctx, w, h, title, lines, accent = '#ffffff') {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '900 64px Arial, sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 22px Arial, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 2 - 10 + i * 34);
  });
  ctx.font = '400 18px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Press ENTER to continue', w / 2, h / 2 + 110);
}
