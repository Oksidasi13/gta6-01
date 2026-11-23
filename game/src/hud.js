// Vice Shores — the HUD: health, cash, wanted stars, ammo, clock, the mission
// objective and the toast messages, all drawn on the canvas so every screenshot
// shows the whole game state at a glance.
import { PLAYER_MAX_HP, MINIMAP_WIDTH, MINIMAP_HEIGHT } from './config.js';
import { currentObjective, currentMarker } from './missions.js';
import { drawMinimap } from './minimap.js';

function drawBar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(angle) * rad;
    const py = y + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23e' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function formatClock(hours) {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours % 1) * 60);
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

/** Draw the whole HUD over the world view. */
export function drawHUD(ctx, state, viewWidth, viewHeight) {
  const player = state.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Top-left: health and cash.
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  ctx.fillRect(14, 12, 250, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('VICE SHORES', 24, 30);
  drawBar(ctx, 24, 38, 150, 10, player.hp / PLAYER_MAX_HP, player.hp > 30 ? '#37c978' : '#e5484d', 'rgba(0,0,0,0.5)');
  ctx.fillStyle = '#7dff9e';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`$${player.cash}`, 186, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.max(0, Math.ceil(player.hp))}`, 24, 64);
  // Top-right: wanted stars and the clock.
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  ctx.fillRect(viewWidth - 250, 12, 236, 40);
  for (let i = 0; i < 5; i += 1) {
    drawStar(ctx, viewWidth - 226 + i * 26, 32, 10, i < state.wanted);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatClock(state.timeOfDay), viewWidth - 26, 37);
  ctx.textAlign = 'left';
  // Minimap under the stars.
  drawMinimap(ctx, state, viewWidth - MINIMAP_WIDTH - 14, 60, MINIMAP_WIDTH, MINIMAP_HEIGHT);
  // Bottom-left: the mission objective.
  const objective = currentObjective(state);
  ctx.font = 'bold 14px system-ui, sans-serif';
  const objWidth = ctx.measureText(objective).width + 28;
  ctx.fillStyle = 'rgba(10,12,20,0.65)';
  ctx.fillRect(14, viewHeight - 52, Math.min(objWidth, viewWidth - 28), 38);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('◆ ' + objective, 26, viewHeight - 28);
  // Bottom-right: ammo or speed on the first line, the hint on the second.
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  ctx.fillRect(viewWidth - 214, viewHeight - 56, 200, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  if (player.inCar) {
    const kmh = Math.round(Math.abs(player.inCar.speed) * 0.36);
    ctx.fillText(`${kmh} km/h`, viewWidth - 200, viewHeight - 36);
    ctx.fillStyle = '#ffd23e';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('E — exit car', viewWidth - 200, viewHeight - 20);
  } else {
    const ammoText = player.reloading > 0 ? 'RELOADING…' : `AMMO ${player.ammo} / 12`;
    ctx.fillText(ammoText, viewWidth - 200, viewHeight - 36);
    ctx.fillStyle = '#ffd23e';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('E — enter car · Space — punch', viewWidth - 200, viewHeight - 20);
  }
  // Toast message, centre-top.
  if (state.message && state.time < state.message.until) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    const tw = ctx.measureText(state.message.text).width + 32;
    ctx.fillStyle = 'rgba(10,12,20,0.72)';
    ctx.fillRect((viewWidth - tw) / 2, 96, tw, 36);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(state.message.text, viewWidth / 2, 120);
    ctx.textAlign = 'left';
  }
  // Mission marker distance, under the objective.
  const marker = currentMarker(state);
  if (marker) {
    const dist = Math.round(Math.hypot(player.x - marker.x, player.y - marker.y));
    ctx.fillStyle = '#ffd23e';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`◈ ${dist}m to objective`, 26, viewHeight - 60);
  }
  ctx.restore();
}
