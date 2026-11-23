// Vice Shores — dossier builder (make.fun gta6-01 entry).
// Node stdlib only. Reads the entry's metadata, the game files and the
// four screenshot JPEGs, and writes one deterministic JSON dossier
// (dossier.json) into MAKEFUN_OUTPUT_DIR (default ./out).
// Two runs produce byte-identical output: fixed key order, sorted file
// lists, no timestamps, no absolute paths.

import { createHash } from 'node:crypto';
import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : join(ROOT, 'out');

const TITLE = 'Vice Shores';
const DESCRIPTION =
  'A 2D top-down open-world crime game set at dusk in a sun-soaked bay city: '
  + 'walk and drive a 3200x2400 city, steal cars, outrun the KPD through '
  + 'eight story missions worth $9,200, earn respect from Wheelman to Kingpin, '
  + 'and survive the helicopter at four stars. Traffic, pedestrians, police '
  + 'dispatch with named units, roadblocks, fists/pistol/SMG, crew abilities, '
  + 'a garage, three radio stations, and a live minimap — all vanilla JS, '
  + 'no libraries, no network, no external assets.';

const SYSTEMS = [
  'open world: 3200x2400 city, grid roads, 52 buildings, parks, beach, pier, palms',
  'dusk atmosphere: golden-hour light, long shadows, headlights, lit windows, neon, streetlights',
  'on foot: walk, sprint, punch, pistol and SMG with mouse aim, reload, health + armour',
  'driving: arcade physics, car stealing, traffic AI, parked cars, handbrake skids',
  'wanted: 1-5 stars, decay 7s per star, police chase and ram, busted and fines',
  'police dispatch: named units with roles and distances, roadblocks at 3+ stars',
  'police helicopter at 4+ stars with a sweeping searchlight',
  'eight story missions with stages, $9,200 total payout, dialogue from the crew',
  'respect ranks: Wheelman, Street Boss, Fixer, Kingpin',
  'crew abilities: Swap Plates, Quick Fix, Eyes Out (cooldowns)',
  'garage repair, ammo and armour pickups, three radio stations',
  'HUD: mission panel, money, stars, clock, rank bar, dispatch panel, weapon slots, crew cards, minimap, speed, car name and damage, dialogue box',
  'screens: title, pause, busted, wasted, story complete; save/load in localStorage',
  'audio: WebAudio tones only (engine, siren, gunshots, chimes), mute toggle',
  'deterministic screenshots: chase, street, beach, title via ?shot=<name>&seed=1',
];

const TEXT_FILES = [
  'README.md',
  'main.ts',
  'serve.ts',
  'shots.json',
  'game/index.html',
  'game/style.css',
  'game/src/audio.js',
  'game/src/cars.js',
  'game/src/city.js',
  'game/src/combat.js',
  'game/src/config.js',
  'game/src/hud.js',
  'game/src/input.js',
  'game/src/main.js',
  'game/src/minimap.js',
  'game/src/missions.js',
  'game/src/player.js',
  'game/src/police.js',
  'game/src/random.js',
  'game/src/render.js',
  'game/src/save.js',
  'game/src/shots.js',
  'game/src/traffic.js',
  'game/src/world.js',
];

const SCREENSHOT_FILES = [
  'screenshots/1-chase.jpg',
  'screenshots/2-street.jpg',
  'screenshots/3-beach.jpg',
  'screenshots/4-title.jpg',
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function listGameFiles() {
  // Walk game/ for completeness, then merge with the known root files.
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) found.push(relative(ROOT, p).split('\\').join('/'));
    }
  }
  await walk(join(ROOT, 'game'));
  const all = new Set([...TEXT_FILES, ...found, 'LICENSE', 'vendor/makefun-game.ts']);
  return [...all].sort();
}

async function main() {
  const files = [];
  for (const rel of await listGameFiles()) {
    const abs = join(ROOT, rel);
    try {
      const buf = await readFile(abs);
      const st = await stat(abs);
      files.push({ path: rel, size: st.size, sha256: sha256(buf) });
    } catch {
      // A listed file that is absent is skipped; the dossier stays honest
      // about what exists.
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));

  const screenshots = [];
  for (const rel of SCREENSHOT_FILES) {
    const abs = join(ROOT, rel);
    const buf = await readFile(abs);
    screenshots.push({
      file: rel,
      size: buf.length,
      sha256: sha256(buf),
      base64: buf.toString('base64'),
    });
  }

  const dossier = {
    title: TITLE,
    description: DESCRIPTION,
    competition: 'gta6-01',
    engine: 'vanilla JavaScript ES modules, no libraries, no network',
    canvas: '1280x720',
    world: '3200x2400',
    missions: 8,
    totalPayoutUsd: 9200,
    systems: SYSTEMS,
    files,
    screenshots,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, 'dossier.json');
  await writeFile(outPath, JSON.stringify(dossier, null, 2) + '\n', 'utf8');
  console.log(`wrote ${outPath} (${files.length} files, ${screenshots.length} screenshots)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
