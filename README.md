[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Oksidasi13/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Oksidasi13/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Vice Shores

An open-world crime game in the spirit of GTA 6, built for the [make.fun](https://make.fun/bounty/gta6-01) gta6-01 bounty. Everything is original — the city, the characters, the story, the art and the sound are all our own, with nothing from Rockstar Games.

## The game

Vice Shores is a sun-soaked coastal city, free to explore on foot and by car. Steal cars, dodge the Vice Shores PD, and finish Mara's three missions: **The Courier**, **Getaway** and **Payback**.

- A city: a road grid, buildings, parks, the beachfront and the Marina Docks, with a camera that follows you.
- On foot and by car: walk, sprint, enter and exit cars (E), drive with arcade handling, skid marks and a wrecked-car state.
- Traffic: AI cars driving the roads and pedestrians strolling the sidewalks — who flee when shots ring out.
- Cars to steal: parked cars and driven cars, both yours for the taking (and the wanted level that follows).
- Wanted level (1–5 stars) and police: foot cops who try to bust you and interceptors that chase and ram. Lose them and the heat dies down.
- Missions and story: three missions with objectives, a marker on the map and the minimap, payouts in cash, and a story-complete ending.
- Combat: a punch and a pistol (click to shoot, R to reload), guards who shoot back, health and ammo on the HUD.
- HUD: health, cash, wanted stars, a live clock, the mission objective and a minimap showing roads, the player, the marker and the police.
- Start screen, pause menu, save/load (localStorage) and busted/wasted screens.
- Sound: WebAudio only — an engine hum, a two-tone siren, gunshots and jingles. No audio files.

## Controls

WASD / arrows — move & drive · Mouse — aim · Click — shoot · E — enter / exit car · Space — punch · R — reload · Shift — sprint · Esc — pause · M — mute

## Run

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network: every file the game loads lives under `game/`.

## Files

- `game/src/city.js` — the city: roads, buildings, parks, beach, collisions
- `game/src/player.js` — on-foot movement, entering cars, punch and pistol
- `game/src/cars.js` — driving physics, traffic and parked spawns, police cars
- `game/src/traffic.js` — pedestrians and the street around them
- `game/src/police.js` — the wanted system and the cops who answer it
- `game/src/missions.js` — the three-mission story
- `game/src/combat.js` — bullets, guards, particles
- `game/src/hud.js`, `game/src/minimap.js` — the HUD and the live minimap
- `game/src/audio.js` — WebAudio sound, generated, no files
- `game/src/save.js` — save/load in localStorage
- `game/src/render.js` — drawing the city, the cars, the people and the screens
- `game/src/world.js` — the world state and the step that moves it
- `game/src/shots.js` — the deterministic screenshot scenes
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
