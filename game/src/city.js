// Vice Shores — city generation: roads, blocks, buildings, parks, beach.
// Dusk edition: palms and umbrellas on the sand, a wooden pier, neon signs
// on a few buildings, streetlights and traffic lights at intersections.
// Pure logic: given a seed it always builds the same city.

import {
  WORLD, ROADS_X, ROADS_Y, ROAD_W, BEACH_Y, WATER_Y,
  BUILDING_COUNT, PARK_COUNT, BUILDING_PALETTE, MARKERS,
} from './config.js';
import { mulberry32, rand, randInt, pick, hash2 } from './random.js';

// Block rectangles between the road bands. The last row is the partial
// strip above the beach (y 2032..2168).
function blockRects() {
  const xs = [];
  for (let i = 0; i < ROADS_X.length - 1; i++) {
    xs.push([ROADS_X[i] + ROAD_W / 2 + 8, ROADS_X[i + 1] - ROAD_W / 2 - 8]);
  }
  const ys = [];
  for (let i = 0; i < ROADS_Y.length - 1; i++) {
    ys.push([ROADS_Y[i] + ROAD_W / 2 + 8, ROADS_Y[i + 1] - ROAD_W / 2 - 8]);
  }
  ys.push([ROADS_Y[ROADS_Y.length - 1] + ROAD_W / 2 + 8, BEACH_Y - 32]);
  const cells = [];
  for (const [x0, x1] of xs) {
    for (const [y0, y1] of ys) {
      if (x1 - x0 > 60 && y1 - y0 > 60) cells.push({ x0, y0, x1, y1 });
    }
  }
  return cells;
}

const NEON_COLORS = ['#ff2d78', '#22d3ee', '#a3e635', '#f59e0b', '#c084fc'];

export function createCity(seed = 1337) {
  const rng = mulberry32(seed);
  const cells = blockRects();

  // Pick park cells first (spread out: take every ~12th cell after a shuffle).
  const shuffled = [...cells].sort(() => rng() - 0.5);
  const parks = [];
  for (let i = 0; i < PARK_COUNT && i < shuffled.length; i++) {
    const c = shuffled[i];
    parks.push({
      x: c.x0 + 14, y: c.y0 + 14,
      w: c.x1 - c.x0 - 28, h: c.y1 - c.y0 - 28,
    });
  }
  const parkCells = new Set(shuffled.slice(0, PARK_COUNT));

  const buildings = [];
  const cellsForBuildings = cells.filter((c) => !parkCells.has(c));
  for (const c of cellsForBuildings) {
    const bw = rand(rng, 90, Math.min(190, c.x1 - c.x0 - 20));
    const bh = rand(rng, 80, Math.min(170, c.y1 - c.y0 - 20));
    const bx = rand(rng, c.x0 + 6, c.x1 - 6 - bw);
    const by = rand(rng, c.y0 + 6, c.y1 - 6 - bh);
    buildings.push({
      x: bx, y: by, w: bw, h: bh,
      color: pick(rng, BUILDING_PALETTE),
      height: randInt(rng, 1, 4), // floors, for the shaded side + shadow length
      lit: rng(), // fraction of windows lit warm at dusk
      neon: rng() < 0.14 ? pick(rng, NEON_COLORS) : null,
      ac: randInt(rng, 0, 3), // rooftop AC boxes
    });
  }
  // Top the count up to exactly BUILDING_COUNT with second buildings
  // in the roomiest cells.
  const roomy = [...cellsForBuildings].sort(
    (a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0),
  );
  let i = 0;
  while (buildings.length < BUILDING_COUNT && roomy.length > 0) {
    const c = roomy[i % roomy.length];
    i++;
    const bw = rand(rng, 70, 130);
    const bh = rand(rng, 60, 110);
    const bx = rand(rng, c.x0 + 6, c.x1 - 6 - bw);
    const by = rand(rng, c.y0 + 6, c.y1 - 6 - bh);
    const cand = {
      x: bx, y: by, w: bw, h: bh,
      color: pick(rng, BUILDING_PALETTE), height: randInt(rng, 1, 4),
      lit: rng(), neon: rng() < 0.14 ? pick(rng, NEON_COLORS) : null,
      ac: randInt(rng, 0, 3),
    };
    const overlaps = buildings.some(
      (b) => cand.x < b.x + b.w + 10 && cand.x + cand.w + 10 > b.x
        && cand.y < b.y + b.h + 10 && cand.y + cand.h + 10 > b.y,
    );
    if (!overlaps) buildings.push(cand);
    if (i > 400) break; // safety: never spin forever
  }

  // Beach dressing: palm trees along the sand, umbrellas, a wooden pier
  // reaching into the water at the pier marker (x = 2000).
  const palms = [];
  for (let x = 120; x < WORLD.w - 60; x += 130) {
    if (hash2(x, 7) < 0.55) {
      palms.push({ x: x + hash2(x, 3) * 40, y: BEACH_Y + 18 + hash2(x, 11) * 70, lean: hash2(x, 5) * 0.9 - 0.45 });
    }
  }
  const umbrellas = [];
  for (let k = 0; k < 8; k++) {
    const ux = 300 + k * 340 + hash2(k, 21) * 90;
    umbrellas.push({
      x: ux, y: BEACH_Y + 30 + hash2(k, 22) * 55,
      color: pick(rng, ['#ff5e78', '#22d3ee', '#f59e0b', '#a3e635']),
    });
  }
  const pier = {
    x: MARKERS.pier.x - 26, y: WATER_Y - 30,
    w: 52, h: 190, // planks run south into the water
  };

  // Streetlights at every other intersection (warm pools on the roads).
  const streetlights = [];
  for (let ix = 0; ix < ROADS_X.length; ix++) {
    for (let iy = 0; iy < ROADS_Y.length; iy++) {
      if ((ix + iy) % 2 === 0) {
        streetlights.push({ x: ROADS_X[ix] + 40, y: ROADS_Y[iy] - 40 });
      }
    }
  }

  // Traffic lights at the four major intersections.
  const trafficLights = [];
  for (const [tx, ty] of [[1280, 920], [1280, 1280], [1640, 1280], [920, 1280]]) {
    trafficLights.push({ x: tx + 38, y: ty - 38, offset: (tx + ty) % 12 });
  }

  // The garage: a wide low building near the 2360 x 920 corner.
  const garage = {
    x: MARKERS.garage.x - 70, y: MARKERS.garage.y - 40,
    w: 140, h: 80, color: '#5a6b7a',
  };

  return {
    seed,
    w: WORLD.w,
    h: WORLD.h,
    roadsX: [...ROADS_X],
    roadsY: [...ROADS_Y],
    roadW: ROAD_W,
    beachY: BEACH_Y,
    waterY: WATER_Y,
    buildings: buildings.slice(0, BUILDING_COUNT),
    parks,
    palms,
    umbrellas,
    pier,
    streetlights,
    trafficLights,
    garage,
  };
}

export function isOnRoad(city, x, y) {
  for (const rx of city.roadsX) {
    if (Math.abs(x - rx) <= city.roadW / 2) return true;
  }
  for (const ry of city.roadsY) {
    if (Math.abs(y - ry) <= city.roadW / 2) return true;
  }
  return false;
}

export function isInWater(city, x, y) {
  return y >= city.waterY;
}

export function isOnBeach(city, x, y) {
  return y >= city.beachY && y < city.waterY;
}

export function isOnSand(city, x, y) {
  return isOnBeach(city, x, y);
}

// Traffic-light phase at a game time (seconds): green 6s, amber 1s, red 6s,
// offset per light so intersections disagree like a real city.
export function trafficLightPhase(light, time) {
  const t = (time + light.offset) % 13;
  if (t < 6) return 'green';
  if (t < 7) return 'amber';
  return 'red';
}

// Circle vs building AABBs. Returns the first building hit, or null.
export function buildingHit(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

// Push a circular entity out of any building it overlaps. Returns true
// if a push happened. Mutates e.x / e.y.
export function pushOutOfBuildings(city, e, r) {
  let pushed = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(e.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(e.y, b.y + b.h));
    let dx = e.x - cx;
    let dy = e.y - cy;
    let d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      pushed = true;
      if (d2 < 0.0001) {
        // Centre inside the building: push out along the smallest axis.
        const left = e.x - b.x;
        const right = b.x + b.w - e.x;
        const top = e.y - b.y;
        const bottom = b.y + b.h - e.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) e.x = b.x - r;
        else if (m === right) e.x = b.x + b.w + r;
        else if (m === top) e.y = b.y - r;
        else e.y = b.y + b.h + r;
      } else {
        const d = Math.sqrt(d2);
        e.x = cx + (dx / d) * r;
        e.y = cy + (dy / d) * r;
      }
    }
  }
  return pushed;
}

// A point on the nearest road centre-line, for spawning traffic/peds.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of city.roadsY) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}
