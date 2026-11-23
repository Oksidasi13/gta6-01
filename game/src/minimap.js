// Vice Shores — the minimap: the whole city shrunk into the HUD's corner, with the
// roads, the player, the mission marker, the police and the traffic on it.
import { ROADS_VERTICAL, ROADS_HORIZONTAL } from './config.js';
import { currentMarker } from './missions.js';

/** Draw the minimap at (x, y) with size (w, h). */
export function drawMinimap(ctx, state, x, y, w, h) {
  const city = state.city;
  const sx = w / city.width;
  const sy = h / city.height;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,20,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  // Water and sand at the bottom.
  ctx.fillStyle = '#1d6f9e';
  ctx.fillRect(x, y + (2320 * sy), w, h - 2320 * sy);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x, y + (2200 * sy), w, 120 * sy);
  // Roads.
  ctx.fillStyle = '#5a5f6b';
  for (const rx of ROADS_VERTICAL) ctx.fillRect(x + rx * sx - 2, y, 4, h);
  for (const ry of ROADS_HORIZONTAL) ctx.fillRect(x, y + ry * sy - 2, w, 4);
  // Parks.
  ctx.fillStyle = '#3f7a4a';
  for (const park of city.parks) {
    ctx.fillRect(x + park.x0 * sx, y + park.y0 * sy, (park.x1 - park.x0) * sx, (park.y1 - park.y0) * sy);
  }
  // Traffic and parked cars.
  ctx.fillStyle = '#c9c9c9';
  for (const car of state.cars) {
    if (car.kind === 'police') continue;
    ctx.fillRect(x + car.x * sx - 1, y + car.y * sy - 1, 2, 2);
  }
  // Police: red-blue dots.
  ctx.fillStyle = '#ff4d4d';
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    ctx.fillRect(x + car.x * sx - 2, y + car.y * sy - 2, 4, 4);
  }
  for (const cop of state.cops) {
    ctx.fillRect(x + cop.x * sx - 2, y + cop.y * sy - 2, 4, 4);
  }
  // Mission marker: pulsing yellow diamond.
  const marker = currentMarker(state);
  if (marker) {
    const pulse = 3 + Math.sin(state.time * 5) * 1.5;
    ctx.fillStyle = '#ffd23e';
    const mx = x + marker.x * sx;
    const my = y + marker.y * sy;
    ctx.beginPath();
    ctx.moveTo(mx, my - pulse - 3);
    ctx.lineTo(mx + pulse + 3, my);
    ctx.lineTo(mx, my + pulse + 3);
    ctx.lineTo(mx - pulse - 3, my);
    ctx.closePath();
    ctx.fill();
  }
  // The player: a white arrow.
  const px = x + state.player.x * sx;
  const py = y + state.player.y * sy;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(state.player.angle) * 8, py + Math.sin(state.player.angle) * 8);
  ctx.stroke();
  ctx.restore();
}
