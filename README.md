# Vice Shores

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Oksidasi13/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Oksidasi13/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

**Vice Shores** is a 2D top-down open-world crime game set at dusk in a sun-soaked bay city, built for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01). Walk and drive a 3200×2400 city of grid roads, 52 buildings, parks, a beach with palms and a wooden pier. Steal cars, outrun the KPD through eight story missions worth $9,200, earn respect from Wheelman to Kingpin, and survive the police helicopter that comes for you at four stars. Traffic, pedestrians, named dispatch units, roadblocks, fists / pistol / SMG, crew abilities, a garage, three radio stations and a live minimap — all vanilla JavaScript ES modules, no libraries, no network, no external assets.

## How to run

Open `game/index.html` in a desktop browser, or serve it locally:

```sh
node serve.ts 8080
# then open http://localhost:8080/
```

## How to play

- **WASD / arrows** — walk (Shift to sprint), **E** — steal / exit a car
- **W/S/A/D** — drive, **Space** — handbrake (punch on foot)
- **Mouse** — aim, **click** — shoot, **R** — reload, **1/2/3** — fists / pistol / SMG
- **Z/X/C** — crew abilities: Swap Plates, Quick Fix, Eyes Out
- **Q** — radio station, **Esc/P** — pause, **M** — mute

Eight missions take you from stealing your first car on the beachfront to a final $2,000 payday under a helicopter searchlight. Progress, money and respect persist in `localStorage`.

## Screenshots

Deterministic staging: `game/index.html?shot=chase&seed=1` (and `street`, `beach`, `title`) renders one fixed frame. The four shots in `screenshots/` were captured that way in headless Chrome.

## Dossier

`node main.ts` writes a deterministic `dossier.json` (title, systems, file hashes, base64 screenshots) into `out/` (or `$MAKEFUN_OUTPUT_DIR`).
