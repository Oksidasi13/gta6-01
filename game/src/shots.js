// Vice Shores — deterministic screenshot staging.
// Given a shot name (from shots.json) and a seed, arrange a fixed scene
// in the world and let main.js render exactly one frame of it.
// No randomness here that is not seeded: the same shot always looks same.
// The chase shot is the late-game money shot: 4 stars, helicopter
// overhead, roadblock ahead, dense HUD with big money and rank.

import { MARKERS } from './config.js';
import { createCar } from './cars.js';
import { setWanted, updateHelicopter, spawnRoadblock } from './police.js';
import { spawnThugs } from './traffic.js';

export const SHOT_NAMES = ['chase', 'street', 'beach', 'title'];

function centreCamera(world, p) {
  world.camera.x = Math.max(0, Math.min(3200 - 1280, p.x - 640));
  world.camera.y = Math.max(0, Math.min(2400 - 720, p.y - 360));
}

// Player in a car on the vertical road x=1280, heading south at speed,
// two police cars closing in, helicopter overhead, roadblock ahead.
function stageChase(world) {
  const p = world.player;
  // Late-game HUD numbers, like a real playthrough.
  p.money = 18450;
  p.rp = 1675;
  p.health = 82;
  p.armour = 45;
  // Mission 6 (Pier Intercept) so the panel reads "MISSION 6".
  world.missions.index = 5;
  world.missions.stage = 0;
  world.missions.stageStarted = true;
  world.missions.hasPackage = false;
  // Player car — gold, so it reads as the hero car.
  const car = world.traffic.aiCars[0];
  car.x = 1280;
  car.y = 1100;
  car.angle = Math.PI / 2; // south
  car.speed = 360;
  car.owner = 'player';
  car.color = '#e8c33a';
  car.name = 'RUKAN PELO GT';
  car.health = 74;
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  // Two police cars behind.
  world.police.cars = [];
  const cop1 = createCar(1266, 980, Math.PI / 2, '#1f6feb', { kind: 'police', id: 901, callsign: 'CORAL-48', role: 'RAMMING' });
  cop1.speed = 420;
  const cop2 = createCar(1300, 900, Math.PI / 2, '#1f6feb', { kind: 'police', id: 902, callsign: 'REEF-12', role: 'FLANKING' });
  cop2.speed = 430;
  world.police.cars.push(cop1, cop2);
  setWanted(world.wanted, 4);
  // Roadblock across the road ahead (above the dialogue box, in frame).
  spawnRoadblock(world.police, 1280, 1420, 0);
  // Helicopter circling overhead with the searchlight on the player.
  world.heli.orbit = 0.9;
  updateHelicopter(world.heli, world.wanted, p, 0.0);
  // Traffic ahead for depth.
  world.traffic.aiCars[1].x = 1294;
  world.traffic.aiCars[1].y = 1240;
  world.traffic.aiCars[1].angle = Math.PI / 2;
  world.traffic.aiCars[1].speed = 150;
  world.traffic.aiCars[2].x = 1654;
  world.traffic.aiCars[2].y = 1000;
  world.traffic.aiCars[2].angle = Math.PI / 2;
  world.traffic.aiCars[2].speed = 150;
  // Target car ahead (mission 6) — the purple dot on the minimap.
  const target = createCar(1290, 1330, Math.PI / 2, '#8e44ad', { kind: 'target', id: 801, name: 'DUST DEVIL' });
  target.speed = 260;
  world.target = { car: target, waypoints: [], wp: 0, arrived: false };
  // A few exhaust puffs behind the player car for motion.
  world.particles.push(
    { x: 1280, y: 1060, vx: -10, vy: -30, life: 0.6, maxLife: 0.7, size: 8, color: 'rgba(180,180,180,0.45)', grow: 14 },
    { x: 1272, y: 1030, vx: -8, vy: -24, life: 0.4, maxLife: 0.7, size: 10, color: 'rgba(180,180,180,0.45)', grow: 14 },
  );
  // Camera pulled a little south so the roadblock ahead is in frame.
  world.camera.x = Math.max(0, Math.min(3200 - 1280, p.x - 640));
  world.camera.y = Math.max(0, Math.min(2400 - 720, p.y - 360 + 120));
  world.message = '';
  world.messageTimer = 0;
}

// Night Market, mission 4 stage 2: player on foot among the thugs,
// traffic passing the intersection, peds on the sidewalks.
function stageStreet(world) {
  const p = world.player;
  p.money = 8200;
  p.rp = 950;
  p.health = 100;
  p.armour = 0;
  world.missions.index = 3;
  world.missions.stage = 1;
  world.missions.stageStarted = true;
  world.missions.hasPackage = false;
  world.thugs = spawnThugs(MARKERS.market.x, MARKERS.market.y);
  p.x = 1560;
  p.y = 1280;
  p.onFoot = true;
  p.car = null;
  p.angle = Math.PI / 4;
  setWanted(world.wanted, 1);
  world.police.cars = [];
  const cop = createCar(1500, 1080, Math.PI / 2, '#1f6feb', { kind: 'police', id: 901, callsign: 'PALM-7', role: 'PURSUIT' });
  cop.speed = 380;
  world.police.cars.push(cop);
  // Traffic crossing the intersection both ways.
  world.traffic.aiCars[0].x = 1100;
  world.traffic.aiCars[0].y = 1266;
  world.traffic.aiCars[0].angle = 0;
  world.traffic.aiCars[0].speed = 150;
  world.traffic.aiCars[1].x = 1900;
  world.traffic.aiCars[1].y = 1294;
  world.traffic.aiCars[1].angle = Math.PI;
  world.traffic.aiCars[1].speed = 150;
  world.traffic.aiCars[2].x = 1266;
  world.traffic.aiCars[2].y = 1000;
  world.traffic.aiCars[2].angle = Math.PI / 2;
  world.traffic.aiCars[2].speed = 150;
  // Peds near the corner.
  const peds = world.traffic.peds;
  peds[0].x = 1500; peds[0].y = 1200; peds[0].state = 'walk';
  peds[1].x = 1730; peds[1].y = 1210; peds[1].state = 'walk';
  peds[2].x = 1510; peds[2].y = 1360; peds[2].state = 'walk';
  peds[3].x = 1760; peds[3].y = 1360; peds[3].state = 'walk';
  centreCamera(world, p);
  world.message = '';
  world.messageTimer = 0;
}

// Player on the sand at the south beach, water behind, a car parked
// on the sand, the pier and palms in frame, mission 1's marker ahead.
function stageBeach(world) {
  const p = world.player;
  p.money = 400;
  p.rp = 150;
  world.missions.index = 0;
  world.missions.stage = 1;
  world.missions.stageStarted = true;
  world.missions.hasPackage = false;
  p.x = 1230; // stand beside the beachfront marker, not on top of it
  p.y = 2255;
  p.onFoot = true;
  p.car = null;
  p.angle = Math.PI / 2; // facing the water
  setWanted(world.wanted, 0);
  world.police.cars = [];
  const parked = world.traffic.parked[0];
  parked.x = 1200;
  parked.y = 2240;
  parked.angle = 0;
  // A couple of peds strolling the sand.
  world.traffic.peds[0].x = 1400; world.traffic.peds[0].y = 2250; world.traffic.peds[0].state = 'walk';
  world.traffic.peds[1].x = 1120; world.traffic.peds[1].y = 2270; world.traffic.peds[1].state = 'walk';
  centreCamera(world, p);
  world.message = '';
  world.messageTimer = 0;
}

export function stageShot(world, name) {
  world.time = 12.5; // fixed time so pulses/waves are identical each run
  world.clockMin = 19 * 60 + 31; // 19:31, golden hour
  if (name === 'chase') stageChase(world);
  else if (name === 'street') stageStreet(world);
  else if (name === 'beach') stageBeach(world);
  else if (name === 'title') { /* title screen is drawn by main.js */ }
  else throw new Error(`unknown shot: ${name}`);
  return name;
}
