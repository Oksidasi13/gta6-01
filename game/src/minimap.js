// Vice Shores — live minimap: the whole city shrunk into the corner.
// Bottom-left, with a border. Health/armour bars sit under it (drawn by hud.js).

import { COLORS } from './config.js';
import { missionTarget } from './missions.js';

export const MAP_W = 190;
export const MAP_H = 143; // keeps the 3200x2400 aspect
export const MAP_X = 12;
export const MAP_Y_OFFSET = 60; // space left under the map for the HP/armour bars

export function drawMinimap(ctx, world, w, h) {
  const x0 = MAP_X;
  const y0 = h - MAP_H - MAP_Y_OFFSET;
  const sx = MAP_W / world.city.w;
  const sy = MAP_H / world.city.h;
  const X = (x) => x0 + x * sx;
  const Y = (y) => y0 + y * sy;

  ctx.fillStyle = 'rgba(10, 14, 20, 0.78)';
  ctx.fillRect(x0 - 4, y0 - 4, MAP_W + 8, MAP_H + 8);
  // Grass.
  ctx.fillStyle = '#3f7d3c';
  ctx.fillRect(x0, y0, MAP_W, MAP_H);
  // Water + beach.
  ctx.fillStyle = '#2f7fc9';
  ctx.fillRect(x0, Y(world.city.waterY), MAP_W, y0 + MAP_H - Y(world.city.waterY));
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x0, Y(world.city.beachY), MAP_W, Y(world.city.waterY) - Y(world.city.beachY));
  // Parks.
  ctx.fillStyle = '#2f7a2c';
  for (const park of world.city.parks) {
    ctx.fillRect(X(park.x), Y(park.y), Math.max(2, park.w * sx), Math.max(2, park.h * sy));
  }
  // Roads.
  ctx.fillStyle = '#c8ccd2';
  for (const rx of world.city.roadsX) ctx.fillRect(X(rx) - 1, y0, 2, MAP_H);
  for (const ry of world.city.roadsY) ctx.fillRect(x0, Y(ry) - 1, MAP_W, 2);
  // Garage marker.
  ctx.fillStyle = '#7CFC00';
  ctx.fillRect(X(world.city.garage.x + 35) - 2, Y(world.city.garage.y + 40) - 2, 4, 4);
  // Traffic as grey dots.
  ctx.fillStyle = '#9aa0a6';
  for (const car of [...world.traffic.aiCars, ...world.traffic.parked]) {
    ctx.fillRect(X(car.x) - 1, Y(car.y) - 1, 2, 2);
  }
  // Police as red dots — always while wanted, or for 20s after Eyes Out.
  const showPolice = world.wanted.stars > 0 || world.abilities.eyesOut.active > 0;
  if (showPolice) {
    ctx.fillStyle = '#ff3b30';
    for (const car of world.police.cars) {
      ctx.beginPath();
      ctx.arc(X(car.x), Y(car.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.police.roadblock) {
      for (const car of world.police.roadblock.cars) {
        ctx.fillRect(X(car.x) - 2, Y(car.y) - 2, 4, 4);
      }
    }
  }
  // Rival (yellow) and target (purple) while their missions run.
  if (world.rival) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(X(world.rival.car.x), Y(world.rival.car.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.target && !world.target.car.wrecked) {
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(X(world.target.car.x), Y(world.target.car.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Helicopter as a yellow ring.
  if (world.heli.active) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(world.heli.x), Y(world.heli.y), 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Mission marker: pulsing yellow diamond.
  const target = missionTarget(world.missions);
  if (target) {
    const pulse = 3 + Math.sin(world.time * 5) * 1.2;
    ctx.save();
    ctx.translate(X(target.x), Y(target.y));
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    ctx.restore();
  }
  // Player: white arrow.
  const p = world.player;
  ctx.save();
  ctx.translate(X(p.x), Y(p.y));
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, MAP_W + 8, MAP_H + 8);
}
