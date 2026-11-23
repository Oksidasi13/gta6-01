// Vice Shores — the story: three missions with a beginning, a middle and a payout.
// Each mission has stages; the world checks the objective every step and advances
// the story when the player delivers. After the third, the city is the player's.
import { MISSION_PAYOUTS } from './config.js';
import { makeGoldCar } from './cars.js';

export const MISSIONS = [
  {
    name: 'The Courier',
    intro: 'Mara needs a package moved from the Marina Docks to the north side. No questions. Go get it.',
    stages: [
      { text: 'Pick up the package at the Marina Docks', marker: 'docks' },
      { text: 'Deliver the package to the drop-off', marker: 'delivery' },
    ],
  },
  {
    name: 'Getaway',
    intro: 'A gold coupe is waiting on Coral Street. Take it — and lose the heat before you reach the Safehouse.',
    stages: [
      { text: 'Steal the gold coupe on Coral Street', marker: 'goldCarSpot' },
      { text: 'Lose the cops, then reach the Safehouse', marker: 'safehouse' },
    ],
  },
  {
    name: 'Payback',
    intro: 'The crew that set you up is holed up in the old Hideout. Three guards. Make it count.',
    stages: [
      { text: 'Reach the Hideout', marker: 'hideout' },
      { text: 'Take out the three guards', marker: 'hideout' },
      { text: 'Grab the stash and get clear', marker: 'hideout' },
    ],
  },
];

/** Start (or restart) a mission: reset its stage and put its marker on the map. */
export function startMission(state, index) {
  state.missionIndex = index;
  state.missionStage = 0;
  state.missionDone = false;
  const mission = MISSIONS[index];
  state.message = { text: `${mission.name} — ${mission.intro}`, until: state.time + 5 };
  if (index === 1) {
    // The gold coupe appears for the Getaway.
    const spot = state.city.goldCarSpot;
    const gold = makeGoldCar(spot.x, spot.y);
    state.cars.push(gold);
    state.goldCar = gold;
  }
  if (index === 2) {
    spawnGuards(state);
  }
}

function spawnGuards(state) {
  const h = state.city.hideout;
  state.guards = [
    { x: h.x - 60, y: h.y - 40, hp: 100, angle: 0, shootTimer: 1, alive: true },
    { x: h.x + 70, y: h.y + 30, hp: 100, angle: 0, shootTimer: 1.6, alive: true },
    { x: h.x + 10, y: h.y - 90, hp: 100, angle: 0, shootTimer: 0.8, alive: true },
  ];
}

/** Where the current objective marker sits, or null when between missions. */
export function currentMarker(state) {
  if (state.missionIndex >= MISSIONS.length) return null;
  const mission = MISSIONS[state.missionIndex];
  const stage = mission.stages[state.missionStage];
  if (!stage) return null;
  if (stage.marker === 'goldCarSpot' && state.goldCar) {
    return { x: state.goldCar.x, y: state.goldCar.y, label: stage.text };
  }
  const place = state.city[stage.marker];
  if (!place) return null;
  return { x: place.x, y: place.y, label: stage.text };
}

/** The objective line the HUD shows. */
export function currentObjective(state) {
  if (state.missionIndex >= MISSIONS.length) {
    return 'Free roam — the city is yours. Earn cash, dodge the law.';
  }
  const mission = MISSIONS[state.missionIndex];
  const stage = mission.stages[state.missionStage];
  return `${mission.name}: ${stage.text}`;
}

function advanceStage(state) {
  const mission = MISSIONS[state.missionIndex];
  state.missionStage += 1;
  if (state.missionStage >= mission.stages.length) {
    const payout = MISSION_PAYOUTS[state.missionIndex];
    state.player.cash += payout;
    state.message = { text: `${mission.name} complete — +$${payout}`, until: state.time + 4 };
    state.sfx.missionComplete();
    state.missionIndex += 1;
    if (state.missionIndex >= MISSIONS.length) {
      state.storyComplete = true;
      state.message = { text: 'STORY COMPLETE — Vice Shores is yours.', until: state.time + 6 };
    } else {
      startMission(state, state.missionIndex);
    }
  } else {
    const next = mission.stages[state.missionStage];
    state.message = { text: next.text, until: state.time + 3 };
  }
}

/** Check the current objective against the player's position and actions. */
export function updateMissions(state, dt) {
  if (state.missionIndex >= MISSIONS.length) return;
  const mission = MISSIONS[state.missionIndex];
  const stage = mission.stages[state.missionStage];
  if (!stage) return;
  const player = state.player;
  const marker = currentMarker(state);
  if (state.missionIndex === 0) {
    if (marker && Math.hypot(player.x - marker.x, player.y - marker.y) < 70) advanceStage(state);
  } else if (state.missionIndex === 1) {
    if (state.missionStage === 0) {
      if (player.inCar && player.inCar.gold) {
        advanceStage(state);
        state.wanted = Math.max(state.wanted, 2);
        state.wantedTimer = 9;
      }
    } else if (marker && state.wanted === 0 && Math.hypot(player.x - marker.x, player.y - marker.y) < 80) {
      advanceStage(state);
    }
  } else if (state.missionIndex === 2) {
    if (state.missionStage === 0) {
      if (marker && Math.hypot(player.x - marker.x, player.y - marker.y) < 120) advanceStage(state);
    } else if (state.missionStage === 1) {
      const alive = state.guards.filter((g) => g.alive).length;
      if (alive === 0) advanceStage(state);
    } else if (state.missionStage === 2) {
      if (marker && Math.hypot(player.x - marker.x, player.y - marker.y) < 90) advanceStage(state);
    }
  }
}
