// Vice Shores — tuning constants and world layout, DUSK edition.
// Golden hour: warm light, long shadows, headlights on, city at 19:12.

export const WORLD = { w: 3200, h: 2400 };

// Road centre-lines. Roads are straight bands ROAD_W wide; blocks sit between them.
export const ROADS_X = [200, 560, 920, 1280, 1640, 2000, 2360, 2720, 3000];
export const ROADS_Y = [200, 560, 920, 1280, 1640, 2000];
export const ROAD_W = 64;

export const BEACH_Y = 2200; // sand band: BEACH_Y .. WATER_Y
export const WATER_Y = 2320; // water: WATER_Y .. WORLD.h

export const BUILDING_COUNT = 52;
export const PARK_COUNT = 4;

export const PLAYER = {
  walkSpeed: 175,
  sprintSpeed: 305,
  radius: 14,
  health: 100,
  armour: 0,
  armourMax: 100,
  regenPerSec: 2.5,
  regenDelay: 5, // seconds after last damage before regen starts
  punchRange: 46,
  punchDamage: 34,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 430, // px/s^2 forward
  brake: 760,
  reverseAccel: 300,
  maxSpeed: 560, // px/s
  reverseMax: 190,
  steerRate: 2.7, // rad/s at full lock, scaled by speed
  drag: 0.55, // 1/s
  handbrakeDrag: 2.6,
  radius: 20, // collision circle
  length: 46,
  width: 24,
};

export const TRAFFIC = {
  aiCars: 14,
  parkedCars: 10,
  aiSpeed: 150,
  pedCount: 24,
  pedSpeed: 55,
  fleeSpeed: 130,
  fleeRadius: 220,
};

export const WANTED = {
  maxStars: 5,
  decayPerStar: 7, // seconds of quiet per star before it drops one
  policeDespawnDist: 850,
  policeSpawnDist: 620,
  policeTopSpeed: 520,
  bustedFine: 100,
  heliStars: 4, // helicopter shows up at 4+ stars
  roadblockStars: 3,
};

export const GUN = {
  magSize: 12,
  reserveStart: 60,
  reserveMax: 120,
  bulletSpeed: 900,
  bulletDamage: 34,
  bulletRange: 520,
  reloadTime: 1.1,
  fireCooldown: 0.16,
};

export const SMG = {
  magSize: 30,
  reserveStart: 60,
  reserveMax: 240,
  bulletSpeed: 1000,
  bulletDamage: 16,
  bulletRange: 460,
  reloadTime: 1.4,
  fireCooldown: 0.07,
};

export const PAYOUTS = [400, 700, 1200, 900, 1000, 1400, 1600, 2000];
export const MISSION_RP = [150, 200, 300, 250, 300, 400, 450, 600];
export const TOTAL_PAYOUT = 9200;

// Mission markers (fixed, so the story is learnable).
export const MARKERS = {
  beachfront: { x: 1280, y: 2260, label: 'Beachfront' },
  hideout: { x: 920, y: 200, label: 'Hideout' },
  pier: { x: 2000, y: 2260, label: 'Pier' },
  northTower: { x: 1640, y: 200, label: 'North Tower' },
  market: { x: 1640, y: 1280, label: 'Night Market' },
  garage: { x: 2360, y: 920, label: 'Garage' },
  playerStart: { x: 1280, y: 1280 },
  raceStart: { x: 920, y: 200, label: 'Start Line' },
};

// Respect ranks: RP thresholds.
export const RANKS = [
  { name: 'WHEELMAN', at: 0 },
  { name: 'STREET BOSS', at: 600 },
  { name: 'FIXER', at: 1400 },
  { name: 'KINGPIN', at: 2400 },
];

export function rankFor(rp) {
  let cur = RANKS[0];
  let next = null;
  for (const r of RANKS) {
    if (rp >= r.at) cur = r;
    else { next = r; break; }
  }
  return { current: cur, next };
}

// Crew abilities (keys Z / X / C), cooldowns in seconds.
export const ABILITIES = {
  swapPlates: { key: 'KeyZ', name: 'SWAP PLATES', desc: '-1 STAR', cooldown: 45 },
  quickFix: { key: 'KeyX', name: 'QUICK FIX', desc: 'FIX CAR', cooldown: 30 },
  eyesOut: { key: 'KeyC', name: 'EYES OUT', desc: 'SPOT 20S', cooldown: 60, duration: 20 },
};

export const GARAGE_REPAIR_COST = 150;

// Radio stations (text + tones only, no audio files).
export const RADIO = [
  { freq: '98.4', name: 'Island Pop', tracks: ['Sunset Static — Paloma Reyes', 'Gold Coast — The Breakers'] },
  { freq: '101.1', name: 'Vice FM', tracks: ['Neon Hearts — Mira Kesang', 'Midnight Run — DJ Coral'] },
  { freq: '87.9', name: 'Night Drive', tracks: ['Low Tide — Salt Air', 'Palm Static — The Dunes'] },
];

// Dusk palette.
export const COLORS = {
  grass: '#6b7f3e', // dusk-lit grass
  grassDark: '#5d7038',
  road: '#33373d',
  roadLine: '#e8d44d',
  sidewalk: '#8a8f96',
  sand: '#d9b978',
  water: '#274b73', // dusk water, darker
  waterDeep: '#1d3a5c',
  park: '#3a6b32',
  player: '#ffd23f',
  police: '#1f6feb',
  hudBg: 'rgba(10, 14, 20, 0.72)',
  vignette: 'rgba(30, 12, 4, 0.55)',
  headlight: 'rgba(255, 236, 170, 0.20)',
};

export const BUILDING_PALETTE = [
  '#8a4a3a', '#9c7a52', '#5d6a78', '#4a5a6a', '#6b5844',
  '#7d8894', '#54684f', '#6e5a78', '#8a6f45', '#42525f',
];

// Named cars for the HUD ("current car" readout).
export const CAR_NAMES = [
  'RUKAN PELO GT', 'CORAL SUNSET', 'PALM RUNNER', 'DUST DEVIL',
  'NEON STALLION', 'SALT FLAT', 'TIDE HUNTER', 'VICE ROYALE',
];

// Police dispatch callsigns.
export const UNIT_NAMES = ['KITE-1', 'CORAL-48', 'REEF-12', 'PALM-7', 'SURF-3', 'DUSK-9'];
