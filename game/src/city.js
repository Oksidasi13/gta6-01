// Vice Shores — the city itself: road grid, buildings, parks, beach and docks, plus
// every collision and road query the other systems need. The city is generated once
// from a seed, so every session plays the same streets.
import {
  WORLD_WIDTH, WORLD_HEIGHT, ROAD_WIDTH, ROADS_VERTICAL, ROADS_HORIZONTAL,
  BEACH_TOP, WATER_TOP,
} from './config.js';
import { makeRng, pickFrom, randomInt } from './random.js';

const BUILDING_COLORS = ['#f2d8a7', '#eeb27a', '#e88f6a', '#7fc4b2', '#f6e7c9', '#d9a05b', '#a8c8a0', '#e8c39e'];
const ROOF_COLORS = ['#c96f4a', '#8a5a44', '#5b7d6a', '#7a6a8a', '#b0523c'];

/** A city block is the land between four roads. Parks and the beach are blocks too. */
function buildBlocks(rng) {
  const blocks = [];
  for (let i = 0; i < ROADS_VERTICAL.length - 1; i += 1) {
    for (let j = 0; j < ROADS_HORIZONTAL.length - 1; j += 1) {
      const x0 = ROADS_VERTICAL[i] + ROAD_WIDTH / 2;
      const x1 = ROADS_VERTICAL[i + 1] - ROAD_WIDTH / 2;
      const y0 = ROADS_HORIZONTAL[j] + ROAD_WIDTH / 2;
      const y1 = ROADS_HORIZONTAL[j + 1] - ROAD_WIDTH / 2;
      blocks.push({ x0, y0, x1, y1, col: i, row: j });
    }
  }
  return blocks;
}

/** Two blocks are parks; the rest hold buildings. */
function chooseParks() {
  return [
    { col: 2, row: 1 },
    { col: 4, row: 3 },
  ];
}

function buildBuildings(rng, blocks, parks) {
  const buildings = [];
  const isPark = (b) => parks.some((p) => p.col === b.col && p.row === b.row);
  for (const block of blocks) {
    if (isPark(block)) continue;
    if (block.y0 >= BEACH_TOP) continue; // the beach strip holds no buildings
    const count = randomInt(rng, 2, 4);
    for (let n = 0; n < count; n += 1) {
      const w = randomInt(rng, 70, 130);
      const h = randomInt(rng, 60, 110);
      const x = randomInt(rng, Math.floor(block.x0 + 8), Math.floor(block.x1 - w - 8));
      const y = randomInt(rng, Math.floor(block.y0 + 8), Math.floor(block.y1 - h - 8));
      const candidate = { x, y, w, h, height: randomInt(rng, 1, 4), color: pickFrom(rng, BUILDING_COLORS), roof: pickFrom(rng, ROOF_COLORS) };
      const overlaps = buildings.some((b) => candidate.x < b.x + b.w + 12 && candidate.x + candidate.w + 12 > b.x
        && candidate.y < b.y + b.h + 12 && candidate.y + candidate.h + 12 > b.y);
      if (!overlaps) buildings.push(candidate);
    }
  }
  return buildings;
}

function buildTrees(rng, blocks, parks) {
  const trees = [];
  for (const block of blocks) {
    const isPark = parks.some((p) => p.col === block.col && p.row === block.row);
    const count = isPark ? randomInt(rng, 14, 22) : randomInt(rng, 0, 3);
    for (let n = 0; n < count; n += 1) {
      trees.push({
        x: randomInt(rng, Math.floor(block.x0 + 10), Math.floor(block.x1 - 10)),
        y: randomInt(rng, Math.floor(block.y0 + 10), Math.floor(block.y1 - 10)),
        r: randomInt(rng, 9, 15),
        park: isPark,
      });
    }
  }
  // Palms along the beachfront.
  for (let x = 120; x < WORLD_WIDTH - 100; x += 90) {
    trees.push({ x: x + randomInt(rng, -20, 20), y: BEACH_TOP + 42 + randomInt(rng, -8, 8), r: 12, park: false, palm: true });
  }
  return trees;
}

/** Build the whole city from a seed. */
export function buildCity(seed) {
  const rng = makeRng(seed);
  const blocks = buildBlocks(rng);
  const parks = chooseParks();
  const buildings = buildBuildings(rng, blocks, parks);
  const trees = buildTrees(rng, blocks, parks);
  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    buildings,
    trees,
    parks: parks.map((p) => {
      const b = blocks.find((block) => block.col === p.col && block.row === p.row);
      return b;
    }),
    // Story places, fixed so missions always find them.
    docks: { x: 420, y: 2050, label: 'Marina Docks' },
    safehouse: { x: 2720, y: 300, label: 'Safehouse' },
    hideout: { x: 320, y: 1560, label: 'Hideout' },
    delivery: { x: 2500, y: 1560, label: 'Drop-off' },
    goldCarSpot: { x: 1500, y: 1020, label: 'Gold coupe' },
    start: { x: 1000, y: 1000 },
  };
}

/** Is this point on a road (within the asphalt)? */
export function isOnRoad(city, x, y) {
  const half = ROAD_WIDTH / 2;
  for (const rx of ROADS_VERTICAL) if (Math.abs(x - rx) <= half) return true;
  for (const ry of ROADS_HORIZONTAL) if (Math.abs(y - ry) <= half) return true;
  return false;
}

/** Is this point in the water? */
export function isInWater(city, x, y) {
  return y >= WATER_TOP && x >= 0 && x <= WORLD_WIDTH;
}

/** Is this point on the sand? */
export function isOnSand(city, x, y) {
  return y >= BEACH_TOP && y < WATER_TOP;
}

/** Does a circle at (x, y) with radius r touch any building? Returns the building or null. */
export function hitBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

/** Push a circle out of buildings and the world edge; returns true when it was pushed. */
export function resolveBuildingCollision(city, body, r) {
  let pushed = false;
  for (const b of city.buildings) {
    const nearestX = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const nearestY = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - nearestX;
    const dy = body.y - nearestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      body.x = nearestX + (dx / d) * r;
      body.y = nearestY + (dy / d) * r;
      pushed = true;
    }
  }
  body.x = Math.max(r, Math.min(city.width - r, body.x));
  body.y = Math.max(r, Math.min(city.height - r, body.y));
  return pushed;
}

/** The nearest road centre and axis ('v' or 'h') to a point. */
export function nearestRoad(x, y) {
  let bestV = ROADS_VERTICAL[0];
  for (const rx of ROADS_VERTICAL) if (Math.abs(x - rx) < Math.abs(x - bestV)) bestV = rx;
  let bestH = ROADS_HORIZONTAL[0];
  for (const ry of ROADS_HORIZONTAL) if (Math.abs(y - ry) < Math.abs(y - bestH)) bestH = ry;
  return Math.abs(x - bestV) <= Math.abs(y - bestH)
    ? { axis: 'v', at: bestV, dist: Math.abs(x - bestV) }
    : { axis: 'h', at: bestH, dist: Math.abs(y - bestH) };
}
