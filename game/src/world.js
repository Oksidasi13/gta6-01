// Vice Shores — world state and per-frame update orchestration.
// Wires player, cars, traffic, peds, police, heli, combat, missions,
// crew abilities, radio, garage, pickups and particles together.
// Events the screens need are pushed to world.events for main.js to drain.

import { WORLD, MARKERS, WANTED, ABILITIES, GARAGE_REPAIR_COST, RADIO } from './config.js';
import { createCity, isOnSand } from './city.js';
import { mulberry32, clamp } from './random.js';
import { createPlayer, updatePlayerOnFoot, damagePlayer, respawnPlayer, addRP, addArmour } from './player.js';
import { updateDrivenCar, nearestCar, driveToward, damageCar, repairCar, createCar } from './cars.js';
import { createTraffic, updateTraffic, updatePeds, knockPedDown, spawnThugs, createPickups } from './traffic.js';
import {
  createWanted, addCrime, setWanted, clearWanted, updateWanted,
  createPolice, updatePolice, spawnRoadblock, clearRoadblock,
  createHelicopter, updateHelicopter,
} from './police.js';
import { createCombat, shoot, startReload, punch, updateCombat, switchWeapon } from './combat.js';
import { createMissions, updateMissions, resetCurrentMission, currentMission, currentStage } from './missions.js';
import { isDown, wasPressed } from './input.js';

export function createWorld(seed = 1337) {
  const city = createCity(seed);
  const player = createPlayer(MARKERS.playerStart.x, MARKERS.playerStart.y);
  const traffic = createTraffic(city, seed + 7);
  const police = createPolice();
  const wanted = createWanted();
  const combat = createCombat();
  const missions = createMissions();
  return {
    seed,
    city,
    player,
    traffic,
    police,
    wanted,
    combat,
    missions,
    heli: createHelicopter(),
    time: 0,
    clockMin: 19 * 60 + 12, // dusk: the game starts at 19:12
    camera: { x: player.x - 640, y: player.y - 360 },
    events: [], // drained by main.js each frame
    message: '',
    messageTimer: 0,
    ramCooldown: 0,
    crashCooldown: 0,
    prevCarSpeed: 0,
    ramTargetCooldown: 0,
    abilities: {
      swapPlates: { cd: 0 },
      quickFix: { cd: 0 },
      eyesOut: { cd: 0, active: 0 },
    },
    radio: { station: 0, track: 0, trackTimer: 0 },
    dialogue: { name: '', text: '', timer: 0 },
    particles: [],
    pickups: createPickups(),
    rival: null,
    target: null,
    thugs: [],
    exhaustTimer: 0,
    skidTimer: 0,
    dustTimer: 0,
    rng: mulberry32(seed + 99),
  };
}

// Cars the player may enter (traffic + parked only — never police, rival,
// target or roadblock cars).
export function enterableCars(world) {
  return [...world.traffic.aiCars, ...world.traffic.parked];
}

export function allCars(world) {
  const list = [...world.traffic.aiCars, ...world.traffic.parked, ...world.police.cars];
  if (world.police.roadblock) list.push(...world.police.roadblock.cars);
  if (world.rival) list.push(world.rival.car);
  if (world.target) list.push(world.target.car);
  return list;
}

function say(world, text, seconds = 3) {
  world.message = text;
  world.messageTimer = seconds;
}

export function spawnParticle(world, x, y, opts = {}) {
  if (world.particles.length > 400) world.particles.shift();
  world.particles.push({
    x, y,
    vx: opts.vx || 0, vy: opts.vy || 0,
    life: opts.life || 0.7,
    maxLife: opts.life || 0.7,
    size: opts.size || 6,
    color: opts.color || 'rgba(200,200,200,0.5)',
    grow: opts.grow || 0,
  });
}

function updateParticles(world, dt) {
  const kept = [];
  for (const pt of world.particles) {
    pt.life -= dt;
    if (pt.life <= 0) continue;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.size += pt.grow * dt;
    kept.push(pt);
  }
  world.particles = kept;
}

// --- Mission entity spawns (driven by stageStart events) ---
function spawnRival(world) {
  const car = createCar(MARKERS.raceStart.x, MARKERS.raceStart.y, 0, '#e8c33a', {
    kind: 'rival', id: 800, name: 'NEON STALLION',
  });
  world.rival = {
    car,
    waypoints: [{ x: 2000, y: 200 }, { x: MARKERS.pier.x, y: MARKERS.pier.y }],
    wp: 0,
    arrived: false,
  };
}

function resetRival(world) {
  if (!world.rival) return;
  world.rival.car.x = MARKERS.raceStart.x;
  world.rival.car.y = MARKERS.raceStart.y;
  world.rival.car.angle = 0;
  world.rival.car.speed = 0;
  world.rival.wp = 0;
  world.rival.arrived = false;
}

function spawnTarget(world) {
  const car = createCar(920, 2000, 0, '#8e44ad', {
    kind: 'target', id: 801, name: 'DUST DEVIL',
  });
  world.target = {
    car,
    waypoints: [{ x: 2000, y: 2000 }, { x: MARKERS.pier.x, y: MARKERS.pier.y }],
    wp: 0,
    arrived: false,
  };
}

function resetTarget(world) {
  if (!world.target) return;
  world.target.car.x = 920;
  world.target.car.y = 2000;
  world.target.car.angle = 0;
  world.target.car.speed = 0;
  world.target.car.health = 100;
  world.target.car.wrecked = false;
  world.target.wp = 0;
  world.target.arrived = false;
}

export function updateWorld(world, input, dt) {
  const p = world.player;
  world.time += dt;
  world.clockMin += dt * 0.5; // one game minute per two real seconds
  if (world.messageTimer > 0) world.messageTimer -= dt;
  if (world.dialogue.timer > 0) world.dialogue.timer -= dt;
  for (const key of ['swapPlates', 'quickFix', 'eyesOut']) {
    if (world.abilities[key].cd > 0) world.abilities[key].cd -= dt;
  }
  if (world.abilities.eyesOut.active > 0) world.abilities.eyesOut.active -= dt;
  world.radio.trackTimer += dt;
  if (world.radio.trackTimer > 45) {
    world.radio.trackTimer = 0;
    const st = RADIO[world.radio.station];
    world.radio.track = (world.radio.track + 1) % st.tracks.length;
  }

  // --- Weapon switching (1 fists / 2 pistol / 3 SMG) + radio (Q) ---
  if (wasPressed(input, 'Digit1')) switchWeapon(world.combat, 'fists');
  if (wasPressed(input, 'Digit2')) switchWeapon(world.combat, 'pistol');
  if (wasPressed(input, 'Digit3')) switchWeapon(world.combat, 'smg');
  if (wasPressed(input, 'KeyQ')) {
    world.radio.station = (world.radio.station + 1) % RADIO.length;
    world.radio.track = 0;
    world.radio.trackTimer = 0;
    world.events.push({ type: 'radio' });
  }

  // --- Crew abilities (Z / X / C) ---
  if (wasPressed(input, ABILITIES.swapPlates.key)) {
    const ab = world.abilities.swapPlates;
    if (ab.cd <= 0 && world.wanted.stars > 0) {
      world.wanted.stars = Math.max(0, world.wanted.stars - 1);
      world.wanted.quietTimer = 0;
      ab.cd = ABILITIES.swapPlates.cooldown;
      say(world, 'Plates swapped — one star dropped.');
      world.events.push({ type: 'ability', ability: 'swapPlates' });
    }
  }
  if (wasPressed(input, ABILITIES.quickFix.key)) {
    const ab = world.abilities.quickFix;
    if (ab.cd <= 0 && !p.onFoot && p.car && p.car.health < 100) {
      repairCar(p.car);
      ab.cd = ABILITIES.quickFix.cooldown;
      say(world, 'Quick Fix — car patched up.');
      world.events.push({ type: 'ability', ability: 'quickFix' });
    }
  }
  if (wasPressed(input, ABILITIES.eyesOut.key)) {
    const ab = world.abilities.eyesOut;
    if (ab.cd <= 0) {
      ab.active = ABILITIES.eyesOut.duration;
      ab.cd = ABILITIES.eyesOut.cooldown;
      say(world, 'Eyes Out — police on the minimap for 20s.');
      world.events.push({ type: 'ability', ability: 'eyesOut' });
    }
  }

  // --- Player: on foot or driving ---
  if (p.onFoot) {
    updatePlayerOnFoot(p, input, dt, world.city, world.time);
    // Enter a car.
    if (wasPressed(input, 'KeyE')) {
      const car = nearestCar(enterableCars(world), p.x, p.y, 70);
      if (car && !car.wrecked) {
        p.car = car;
        p.onFoot = false;
        if (car.owner !== 'player') {
          car.owner = 'player';
          car.stolen = true;
          addCrime(world.wanted, 1);
          say(world, 'Car stolen! The cops are onto you.');
          world.events.push({ type: 'crime', kind: 'steal' });
        }
      }
    }
    // Punch.
    if (isDown(input, 'Space') && p.punchCooldown <= 0) {
      const res = punch(world.combat, p.x, p.y, p.angle, [...world.traffic.peds, ...world.thugs]);
      p.punchCooldown = 0.45;
      if (res.hits > 0) {
        addCrime(world.wanted, 1);
        say(world, res.downs > 0 ? 'You floored someone!' : 'You landed a hit!');
        world.events.push({ type: 'crime', kind: 'punch' });
      }
    }
    // Pistol / SMG: mouse aim, click to fire.
    const aimAngle = Math.atan2(
      input.mouse.y + world.camera.y - p.y,
      input.mouse.x + world.camera.x - p.x,
    );
    p.angle = aimAngle;
    if (input.mouse.down || input.mouse.clicked) {
      if (shoot(world.combat, p.x, p.y, aimAngle)) {
        world.events.push({ type: 'shot' });
      }
    }
    if (wasPressed(input, 'KeyR')) startReload(world.combat);
  } else if (p.car) {
    // Driving.
    const drive = {
      up: isDown(input, 'KeyW', 'ArrowUp'),
      down: isDown(input, 'KeyS', 'ArrowDown'),
      left: isDown(input, 'KeyA', 'ArrowLeft'),
      right: isDown(input, 'KeyD', 'ArrowRight'),
      handbrake: isDown(input, 'Space'),
    };
    updateDrivenCar(p.car, drive, dt, world.city);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.speed = Math.abs(p.car.speed);
    // Exhaust puffs, skid marks, sand dust.
    if (Math.abs(p.car.speed) > 200) {
      world.exhaustTimer -= dt;
      if (world.exhaustTimer <= 0) {
        world.exhaustTimer = 0.12;
        const bx = p.car.x - Math.cos(p.car.angle) * 24;
        const by = p.car.y - Math.sin(p.car.angle) * 24;
        spawnParticle(world, bx, by, { vx: -Math.cos(p.car.angle) * 30, vy: -Math.sin(p.car.angle) * 30, life: 0.7, size: 5, color: 'rgba(180,180,180,0.45)', grow: 14 });
      }
    }
    if (p.car.skidding) {
      world.skidTimer -= dt;
      if (world.skidTimer <= 0) {
        world.skidTimer = 0.05;
        spawnParticle(world, p.car.x - Math.cos(p.car.angle) * 18, p.car.y - Math.sin(p.car.angle) * 18, { life: 2.2, size: 4, color: 'rgba(20,20,20,0.5)', grow: 0 });
      }
    }
    if (Math.abs(p.car.speed) > 100 && isOnSand(world.city, p.car.x, p.car.y)) {
      world.dustTimer -= dt;
      if (world.dustTimer <= 0) {
        world.dustTimer = 0.1;
        spawnParticle(world, p.car.x, p.car.y, { vx: (world.rng() - 0.5) * 40, vy: (world.rng() - 0.5) * 40, life: 0.8, size: 6, color: 'rgba(217,185,120,0.5)', grow: 18 });
      }
    }
    if (wasPressed(input, 'KeyE')) {
      // Garage repair beats stepping out when parked at the garage.
      const nearGarage = Math.hypot(p.x - MARKERS.garage.x, p.y - MARKERS.garage.y) < 110;
      if (nearGarage && p.car.health < 100 && p.money >= GARAGE_REPAIR_COST) {
        p.money -= GARAGE_REPAIR_COST;
        repairCar(p.car);
        say(world, `Garage — car repaired for $${GARAGE_REPAIR_COST}.`);
        world.events.push({ type: 'garage' });
      } else {
        // Step out beside the car.
        const side = p.car.angle + Math.PI / 2;
        p.x = p.car.x + Math.cos(side) * 34;
        p.y = p.car.y + Math.sin(side) * 34;
        p.car.speed = 0;
        p.car = null;
        p.onFoot = true;
        p.speed = 0;
      }
    }
    if (wasPressed(input, 'KeyR')) startReload(world.combat);
  }

  // --- Traffic + pedestrians (+ thugs) ---
  updateTraffic(world.traffic, dt, world.city);
  const threat = threatPoint(world);
  updatePeds(world.traffic, dt, world.city, threat, p);
  if (world.thugs.length > 0) {
    updatePeds({ peds: world.thugs }, dt, world.city, null, p);
    for (const thug of world.thugs) {
      if (thug.swung) {
        thug.swung = false;
        damagePlayer(p, 6, world.time);
        world.events.push({ type: 'thugHit' });
      }
    }
  }

  // Player's car running over peds: a crime, and the ped goes down.
  if (!p.onFoot && p.car && Math.abs(p.car.speed) > 120) {
    for (const ped of world.traffic.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.x - p.car.x, ped.y - p.car.y) < 26) {
        knockPedDown(ped, 5);
        addCrime(world.wanted, 1);
        say(world, 'You ran someone over!');
        world.events.push({ type: 'crime', kind: 'hitPed' });
      }
    }
  }

  // --- Rival (mission 5) + target car (mission 6) ---
  let raceWon = false;
  let raceLost = false;
  if (world.rival) {
    const r = world.rival;
    if (!r.arrived) {
      const wp = r.waypoints[r.wp];
      if (driveToward(r.car, wp.x, wp.y, 330, dt, world.city)) {
        r.wp += 1;
        if (r.wp >= r.waypoints.length) r.arrived = true;
      }
    }
    raceLost = r.arrived;
    const stage = currentStage(world.missions);
    if (stage && stage.kind === 'race' && Math.hypot(p.x - MARKERS.pier.x, p.y - MARKERS.pier.y) < 70) {
      raceWon = true;
    }
  }
  let targetWrecked = false;
  let targetEscaped = false;
  if (world.target) {
    const t = world.target;
    if (!t.arrived && !t.car.wrecked) {
      const wp = t.waypoints[t.wp];
      if (driveToward(t.car, wp.x, wp.y, 260, dt, world.city)) {
        t.wp += 1;
        if (t.wp >= t.waypoints.length) t.arrived = true;
      }
    }
    targetWrecked = t.car.wrecked;
    targetEscaped = t.arrived;
    // Ramming the target: player car contact at speed damages it.
    if (!p.onFoot && p.car && !t.car.wrecked && world.ramTargetCooldown <= 0) {
      const d = Math.hypot(p.car.x - t.car.x, p.car.y - t.car.y);
      if (d < 42 && Math.abs(p.car.speed) > 150) {
        damageCar(t.car, 30);
        p.car.speed *= 0.6;
        world.ramTargetCooldown = 0.5;
        world.events.push({ type: 'ramHit' });
      }
    }
  }
  if (world.ramTargetCooldown > 0) world.ramTargetCooldown -= dt;

  // --- Combat (bullets) ---
  const hits = updateCombat(world.combat, dt, {
    peds: [...world.traffic.peds, ...world.thugs],
    policeCars: [...world.police.cars, ...(world.police.roadblock ? world.police.roadblock.cars : [])],
    cars: allCars(world),
  }, world.city);
  for (const h of hits) {
    if (h.type === 'ped') {
      addCrime(world.wanted, 1);
      world.events.push({ type: 'crime', kind: 'shoot' });
    } else if (h.type === 'car' && h.target.kind === 'police') {
      addCrime(world.wanted, 1);
      world.events.push({ type: 'crime', kind: 'shootPolice' });
    }
  }

  // --- Wanted decay + police + helicopter ---
  updateWanted(world.wanted, dt);
  const policeResult = updatePolice(world.police, world.wanted, p, dt, world.city, world.rng);
  updateHelicopter(world.heli, world.wanted, p, dt);
  if (world.wanted.stars === 0 && world.police.roadblock) clearRoadblock(world.police);
  if (policeResult.rammed && world.ramCooldown <= 0) {
    // A police ram hurts while driving; enough of them can waste you.
    damagePlayer(p, 9, world.time);
    world.ramCooldown = 1.0;
    world.events.push({ type: 'rammed' });
  }
  if (world.ramCooldown > 0) world.ramCooldown -= dt;
  // Hard building crash at speed also hurts the driver.
  if (!p.onFoot && p.car && world.crashCooldown <= 0 && world.prevCarSpeed > 340
    && Math.abs(p.car.speed) < world.prevCarSpeed * 0.6) {
    damagePlayer(p, Math.min(18, Math.round((world.prevCarSpeed - 320) / 20)), world.time);
    world.crashCooldown = 0.8;
    world.events.push({ type: 'crash' });
  }
  if (world.crashCooldown > 0) world.crashCooldown -= dt;
  world.prevCarSpeed = p.car ? Math.abs(p.car.speed) : 0;

  const busted = policeResult.busted;
  if (busted) {
    const fine = Math.min(WANTED.bustedFine, p.money);
    p.money -= fine;
    resetCurrentMission(world.missions);
    clearWanted(world.wanted);
    respawnPlayer(p, MARKERS.hideout.x, MARKERS.hideout.y);
    world.police.cars = [];
    clearRoadblock(world.police);
    resetRival(world);
    resetTarget(world);
    world.thugs = [];
    world.events.push({ type: 'busted', fine });
    say(world, `Busted! Fine $${fine}. Mission progress lost.`, 4);
    updateParticles(world, dt);
    return; // skip mission progress this frame
  }

  // --- Missions ---
  const thugsDown = world.thugs.filter((t) => t.state === 'down').length;
  const ctx = {
    x: p.x, y: p.y,
    inCar: !p.onFoot,
    wanted: world.wanted.stars,
    busted: false,
    thugsDown,
    thugsTotal: world.thugs.length,
    raceWon,
    raceLost,
    targetWrecked,
    targetEscaped,
    dt,
  };
  const mEvents = updateMissions(world.missions, ctx, dt);
  for (const e of mEvents) {
    if (e.type === 'payout') {
      p.money += e.amount;
      addRP(p, e.rp);
      world.events.push(e);
      say(world, `Mission complete! +$${e.amount}  +${e.rp} RP`, 4);
    } else if (e.type === 'setWanted') {
      setWanted(world.wanted, e.stars);
      world.events.push(e);
    } else if (e.type === 'pickedUp') {
      world.events.push(e);
      say(world, 'Package picked up — deliver it, fast!', 4);
    } else if (e.type === 'storyComplete') {
      world.events.push(e);
    } else if (e.type === 'stageStart') {
      if (e.kind === 'thugs') {
        world.thugs = spawnThugs(MARKERS.market.x, MARKERS.market.y);
      } else if (e.kind === 'race') {
        spawnRival(world);
        say(world, 'Race on — beat the rival to the pier!', 4);
      } else if (e.kind === 'ram') {
        spawnTarget(world);
        say(world, 'Target spotted — wreck him before the pier!', 4);
      } else if (e.kind === 'reach' && e.mission === 6) {
        spawnRoadblock(world.police, 1640, 920, 0);
        say(world, 'Roadblock ahead — break through!', 4);
      }
      world.events.push(e);
    } else if (e.type === 'dialogue') {
      world.dialogue = { name: e.name, text: e.text, timer: 8 };
      world.events.push(e);
    } else if (e.type === 'unlockSmg') {
      world.combat.smgUnlocked = true;
      say(world, 'SMG unlocked — press 3 to equip it.', 4);
      world.events.push(e);
    } else if (e.type === 'raceLost') {
      resetRival(world);
      // Player back to the start line with their car.
      if (!p.onFoot && p.car) {
        p.car.x = MARKERS.raceStart.x + 60;
        p.car.y = MARKERS.raceStart.y;
        p.car.angle = 0;
        p.car.speed = 0;
      } else {
        p.x = MARKERS.raceStart.x + 60;
        p.y = MARKERS.raceStart.y;
      }
      say(world, 'The rival beat you to the pier — race again!', 4);
      world.events.push(e);
    } else if (e.type === 'targetEscaped') {
      resetTarget(world);
      say(world, 'The target reached the pier — he slipped away. Try again!', 4);
      world.events.push(e);
    }
  }

  // --- Pickups (ammo / armour) ---
  for (const pk of world.pickups) {
    if (pk.taken) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) pk.taken = false;
      continue;
    }
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < 34) {
      pk.taken = true;
      pk.respawn = 60;
      if (pk.kind === 'ammo') {
        world.combat.reserve = Math.min(120, world.combat.reserve + 24);
        world.combat.smgReserve = Math.min(240, world.combat.smgReserve + 60);
        say(world, 'Ammo picked up.');
      } else {
        addArmour(p, 50);
        say(world, 'Armour picked up (+50).');
      }
      world.events.push({ type: 'pickup', kind: pk.kind });
    }
  }

  // --- Wasted ---
  if (p.health <= 0) {
    world.events.push({ type: 'wasted' });
  }

  updateParticles(world, dt);

  // --- Camera follows the player ---
  const cam = world.camera;
  cam.x = clamp(p.x - 640, 0, WORLD.w - 1280);
  cam.y = clamp(p.y - 360, 0, WORLD.h - 720);
}

function threatPoint(world) {
  const p = world.player;
  // Peds flee when the player punches, shoots, or bears down on them in a car.
  const punching = p.onFoot && p.punchCooldown > 0.3;
  const shooting = world.combat.bullets.length > 0;
  const speedingCar = !p.onFoot && p.car && Math.abs(p.car.speed) > 200;
  if (punching || shooting || speedingCar) return { x: p.x, y: p.y };
  return null;
}

export function currentObjective(world) {
  const m = currentMission(world.missions);
  if (!m) return 'Story complete!';
  const stage = currentStage(world.missions);
  return stage ? stage.text : m.name;
}
