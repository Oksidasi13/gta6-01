// Vice Shores — rendering: the sun-soaked city, every car and pedestrian, the
// mission marker, the day tint and the screens (title, pause, busted, wasted).
// Everything is drawn with canvas paths, so the game needs no image files at all.
import { ROAD_WIDTH, ROADS_VERTICAL, ROADS_HORIZONTAL, BEACH_TOP, WATER_TOP, CAR_LENGTH, CAR_WIDTH } from './config.js';
import { currentMarker } from './missions.js';
import { drawHUD } from './hud.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRoads(ctx, city, cam) {
  // Asphalt.
  ctx.fillStyle = '#3a3f4a';
  for (const rx of ROADS_VERTICAL) ctx.fillRect(rx - ROAD_WIDTH / 2, 0, ROAD_WIDTH, city.height);
  for (const ry of ROADS_HORIZONTAL) ctx.fillRect(0, ry - ROAD_WIDTH / 2, city.width, ROAD_WIDTH);
  // Sidewalks.
  ctx.fillStyle = '#b8b0a0';
  for (const rx of ROADS_VERTICAL) {
    ctx.fillRect(rx - ROAD_WIDTH / 2 - 14, 0, 14, city.height);
    ctx.fillRect(rx + ROAD_WIDTH / 2, 0, 14, city.height);
  }
  for (const ry of ROADS_HORIZONTAL) {
    ctx.fillRect(0, ry - ROAD_WIDTH / 2 - 14, city.width, 14);
    ctx.fillRect(0, ry + ROAD_WIDTH / 2, city.width, 14);
  }
  // Centre dashes.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  ctx.beginPath();
  for (const rx of ROADS_VERTICAL) {
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, city.height);
  }
  for (const ry of ROADS_HORIZONTAL) {
    ctx.moveTo(0, ry);
    ctx.lineTo(city.width, ry);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGround(ctx, city, cam) {
  // Grass base.
  ctx.fillStyle = '#8fae6a';
  ctx.fillRect(0, 0, city.width, city.height);
  // Beach sand, then water.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(0, BEACH_TOP, city.width, WATER_TOP - BEACH_TOP);
  ctx.fillStyle = '#1d6f9e';
  ctx.fillRect(0, WATER_TOP, city.width, city.height - WATER_TOP);
  // Waves.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = WATER_TOP + 14 + i * 12;
    ctx.beginPath();
    for (let x = 0; x <= city.width; x += 60) {
      const yy = y + Math.sin(x / 90 + i) * 4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // Parks.
  for (const park of city.parks) {
    ctx.fillStyle = '#5d9b52';
    ctx.fillRect(park.x0, park.y0, park.x1 - park.x0, park.y1 - park.y0);
  }
  // Docks pier.
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(city.docks.x - 120, city.docks.y - 10, 240, 16);
  ctx.fillRect(city.docks.x - 10, city.docks.y - 80, 16, 90);
}

function drawBuildings(ctx, city) {
  for (const b of city.buildings) {
    // Height shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 5, b.y + 5 + b.height * 2, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Windows.
    ctx.fillStyle = 'rgba(30,40,70,0.65)';
    for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 20) {
      for (let wy = b.y + 12; wy < b.y + b.h - 12; wy += 18) {
        ctx.fillRect(wx, wy, 10, 8);
      }
    }
  }
  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = t.palm ? '#7a5a34' : '#5a4632';
    ctx.fillRect(t.x - 2, t.y - 2, 4, 8);
    ctx.fillStyle = t.palm ? '#3f9e4d' : '#2f7a3a';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 4, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCar(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  if (isPlayer) {
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, CAR_LENGTH * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -CAR_LENGTH / 2 + 3, -CAR_WIDTH / 2 + 3, CAR_LENGTH, CAR_WIDTH, 8);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 8);
  ctx.fill();
  // Windshield and roof.
  ctx.fillStyle = 'rgba(20,30,50,0.8)';
  roundRect(ctx, -6, -CAR_WIDTH / 2 + 4, 16, CAR_WIDTH - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 8, -CAR_WIDTH / 2 + 5, 12, CAR_WIDTH - 10, 3);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(CAR_LENGTH / 2 - 3, -CAR_WIDTH / 2 + 3, 3, 5);
  ctx.fillRect(CAR_LENGTH / 2 - 3, CAR_WIDTH / 2 - 8, 3, 5);
  // Police light bar.
  if (car.kind === 'police') {
    const phase = Math.floor(Date.now() / 300) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e5bff';
    ctx.fillRect(-4, -CAR_WIDTH / 2 + 2, 8, 6);
    ctx.fillStyle = phase ? '#2e5bff' : '#ff2e2e';
    ctx.fillRect(-4, CAR_WIDTH / 2 - 8, 8, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    ctx.textAlign = 'left';
  }
  if (car.gold) {
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 2;
    roundRect(ctx, -CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 - 2, CAR_LENGTH + 4, CAR_WIDTH + 4, 9);
    ctx.stroke();
  }
  if (car.smoke > 0) {
    ctx.fillStyle = 'rgba(80,80,80,0.6)';
    ctx.beginPath();
    ctx.arc(-CAR_LENGTH / 2, 0, 8 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, down) {
  ctx.save();
  ctx.translate(x, y);
  if (down) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(2, 2, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMissionMarker(ctx, marker, time) {
  const bob = Math.sin(time * 3) * 6;
  ctx.save();
  ctx.translate(marker.x, marker.y + bob - 30);
  ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(14, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Beam to the ground.
  ctx.strokeStyle = 'rgba(255,210,62,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 46 + bob);
  ctx.lineTo(marker.x, marker.y);
  ctx.stroke();
}

/** The day tint: dawn, noon, dusk and night over the whole view. */
function drawDayTint(ctx, state, viewWidth, viewHeight) {
  const h = state.timeOfDay;
  let overlay = null;
  if (h >= 19 || h < 5.5) overlay = 'rgba(8,10,40,0.38)';
  else if (h >= 17.5) overlay = 'rgba(255,110,40,0.14)';
  else if (h >= 5.5 && h < 7.5) overlay = 'rgba(255,150,90,0.10)';
  if (overlay) {
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
}

/** Draw the world and the HUD for one frame. `showHUD` is false on the title screen. */
export function drawGame(ctx, state, viewWidth, viewHeight, showHUD = true) {
  const cam = state.camera;
  ctx.save();
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, state.city, cam);
  drawRoads(ctx, state.city, cam);
  drawBuildings(ctx, state.city);
  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.4)';
  ctx.lineWidth = 4;
  for (const s of state.skids) {
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 20, s.y - Math.sin(s.angle) * 20);
    ctx.lineTo(s.x + Math.cos(s.angle) * 20, s.y + Math.sin(s.angle) * 20);
    ctx.stroke();
  }
  // Mission marker.
  const marker = currentMarker(state);
  if (marker) drawMissionMarker(ctx, marker, state.time);
  // Cars (parked first, then traffic, police, then the player's car on top).
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    drawCar(ctx, car, false);
  }
  // Pedestrians, cops, guards.
  for (const ped of state.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, ped.downTimer > 0);
  for (const cop of state.cops) drawPerson(ctx, cop.x, cop.y, cop.angle, '#20264d', false);
  for (const guard of state.guards) {
    if (!guard.alive) {
      drawPerson(ctx, guard.x, guard.y, guard.angle, '#8a2020', true);
      continue;
    }
    drawPerson(ctx, guard.x, guard.y, guard.angle, '#8a2020', false);
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 22, guard.y + Math.sin(guard.angle) * 22);
    ctx.stroke();
  }
  // The player: in the car, or on foot with an aim line.
  const player = state.player;
  if (player.inCar) {
    drawCar(ctx, player.inCar, true);
  } else {
    drawPerson(ctx, player.x, player.y, player.angle, '#f2f2f2', false);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(player.angle) * 14, player.y + Math.sin(player.angle) * 14);
    ctx.lineTo(player.x + Math.cos(player.angle) * 34, player.y + Math.sin(player.angle) * 34);
    ctx.stroke();
    if (player.punchTimer > 0) {
      ctx.fillStyle = 'rgba(255,210,62,0.7)';
      ctx.beginPath();
      ctx.arc(player.x + Math.cos(player.angle) * 44, player.y + Math.sin(player.angle) * 44, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Bullets.
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 3;
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Particles.
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawDayTint(ctx, state, viewWidth, viewHeight);
  if (showHUD) drawHUD(ctx, state, viewWidth, viewHeight);
}

function drawOverlay(ctx, viewWidth, viewHeight, alpha) {
  ctx.fillStyle = `rgba(8,10,24,${alpha})`;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

function drawCentredText(ctx, lines, viewWidth, startY) {
  ctx.textAlign = 'center';
  let y = startY;
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, viewWidth / 2, y);
    y += line.gap;
  }
  ctx.textAlign = 'left';
}

/** The title screen over a view of the city. */
export function drawTitleScreen(ctx, state, viewWidth, viewHeight) {
  drawOverlay(ctx, viewWidth, viewHeight, 0.45);
  drawCentredText(ctx, [
    { text: 'VICE SHORES', font: 'bold 64px system-ui, sans-serif', color: '#ffd23e', gap: 76 },
    { text: 'An open-world crime story in the sun', font: '20px system-ui, sans-serif', color: '#ffffff', gap: 44 },
    { text: 'Mara has a job for you. Steal cars, dodge the law, finish all three missions.', font: '15px system-ui, sans-serif', color: '#e8e8e8', gap: 30 },
    { text: 'WASD / arrows — move & drive      Mouse — aim      Click — shoot', font: '15px system-ui, sans-serif', color: '#ffffff', gap: 26 },
    { text: 'E — enter / exit car      Space — punch      R — reload      Shift — sprint', font: '15px system-ui, sans-serif', color: '#ffffff', gap: 26 },
    { text: 'Esc — pause      M — mute      Your progress saves when you pause', font: '15px system-ui, sans-serif', color: '#ffffff', gap: 48 },
    { text: 'PRESS ENTER TO START', font: 'bold 22px system-ui, sans-serif', color: '#ffd23e', gap: 30 },
    { text: state.best > 0 ? `Best cash: $${state.best}      L — continue your saved game` : 'L — continue your saved game', font: '14px system-ui, sans-serif', color: '#c9c9c9', gap: 0 },
  ], viewWidth, 150);
}

/** The pause menu. */
export function drawPauseScreen(ctx, state, viewWidth, viewHeight) {
  drawOverlay(ctx, viewWidth, viewHeight, 0.6);
  drawCentredText(ctx, [
    { text: 'PAUSED', font: 'bold 44px system-ui, sans-serif', color: '#ffffff', gap: 60 },
    { text: 'Esc — resume      S — save game      L — load save', font: '16px system-ui, sans-serif', color: '#e8e8e8', gap: 30 },
    { text: 'T — restart the current mission      Q — quit to title', font: '16px system-ui, sans-serif', color: '#e8e8e8', gap: 30 },
    { text: `Cash $${state.player.cash}   •   Mission ${Math.min(state.missionIndex + 1, 3)} of 3`, font: '15px system-ui, sans-serif', color: '#ffd23e', gap: 0 },
  ], viewWidth, 260);
}

/** Busted / wasted / story-complete end screens. */
export function drawEndScreen(ctx, state, viewWidth, viewHeight) {
  drawOverlay(ctx, viewWidth, viewHeight, 0.65);
  drawCentredText(ctx, [
    { text: state.screen === 'busted' ? 'BUSTED' : 'WASTED', font: 'bold 56px system-ui, sans-serif', color: state.screen === 'busted' ? '#6fb3ff' : '#ff5a5a', gap: 64 },
    { text: state.bustedReason, font: '17px system-ui, sans-serif', color: '#ffffff', gap: 40 },
    { text: `You kept $${state.player.cash}. The city remembers.`, font: '15px system-ui, sans-serif', color: '#e8e8e8', gap: 44 },
    { text: 'PRESS ENTER TO TRY AGAIN', font: 'bold 20px system-ui, sans-serif', color: '#ffd23e', gap: 0 },
  ], viewWidth, 260);
}
