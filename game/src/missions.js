// Vice Shores — the eight-mission story arc.
// Pure state machine: update(missions, ctx, dt) returns events the world
// acts on (payouts, wanted changes, spawns, dialogue). No DOM here.
// Stage kinds: steal | reach | reachInCar | pickup | deliver | thugs
//              | race | ram. Each stage may set a wanted level on entry.

import { MARKERS, PAYOUTS, MISSION_RP } from './config.js';

export const MISSION_DEFS = [
  {
    name: 'First Wheels',
    payout: PAYOUTS[0], rp: MISSION_RP[0],
    dialogue: { name: 'MIRA KESANG', text: "Grab any wheels you can — the beachfront won't wait." },
    stages: [
      { kind: 'steal', text: 'Steal any car', hint: 'Press E near a car' },
      { kind: 'reachInCar', target: () => ({ ...MARKERS.beachfront }), text: 'Drive it to the beachfront marker', hint: 'Follow the yellow diamond' },
    ],
  },
  {
    name: 'Hot Pursuit',
    payout: PAYOUTS[1], rp: MISSION_RP[1],
    dialogue: { name: 'MIRA KESANG', text: "Two stars already? Drive north and don't stop for anyone." },
    stages: [
      { kind: 'reach', target: () => ({ ...MARKERS.hideout }), wanted: 2, text: 'Reach the hideout up north — 2 stars on you', hint: 'Do not get busted' },
    ],
  },
  {
    name: 'Beachfront Payday',
    payout: PAYOUTS[2], rp: MISSION_RP[2],
    dialogue: { name: 'MIRA KESANG', text: 'The package is at the pier. Three stars on the tail — keep moving.' },
    stages: [
      { kind: 'pickup', target: () => ({ ...MARKERS.pier }), text: 'Pick up the package at the pier', hint: 'Walk over the orange crate' },
      { kind: 'deliver', target: () => ({ ...MARKERS.northTower }), wanted: 3, text: 'Deliver it to the North Tower', hint: '3 stars — keep moving' },
    ],
  },
  {
    name: 'Night Market',
    payout: PAYOUTS[3], rp: MISSION_RP[3],
    unlockSmg: true,
    dialogue: { name: 'MIRA KESANG', text: 'The market crew wants a cut. Clear the aisles and the SMG is yours.' },
    stages: [
      { kind: 'reach', target: () => ({ ...MARKERS.market }), text: 'Get to the Night Market', hint: 'On foot or by car' },
      { kind: 'thugs', target: () => ({ ...MARKERS.market }), text: 'Clear the aisles — drop all 4 thugs', hint: 'Punch or shoot; they swing back' },
    ],
  },
  {
    name: 'Street Race',
    payout: PAYOUTS[4], rp: MISSION_RP[4],
    dialogue: { name: 'MIRA KESANG', text: "The rival's at the start line. Beat him to the pier or walk home." },
    stages: [
      { kind: 'race', target: () => ({ ...MARKERS.pier }), text: 'Beat the rival to the pier', hint: 'Pedal down — he will not wait' },
    ],
  },
  {
    name: 'Pier Intercept',
    payout: PAYOUTS[5], rp: MISSION_RP[5],
    dialogue: { name: 'MIRA KESANG', text: "The target's running for the pier. Ram him — the heli is already up." },
    stages: [
      { kind: 'ram', target: () => ({ ...MARKERS.pier }), wanted: 4, text: 'Wreck the target car before it reaches the pier', hint: 'Ram it or shoot it — the heli is watching' },
    ],
  },
  {
    name: 'Roadblock Breakout',
    payout: PAYOUTS[6], rp: MISSION_RP[6],
    dialogue: { name: 'MIRA KESANG', text: "They've blocked the road north. Go around, go through — just go." },
    stages: [
      { kind: 'reach', target: () => ({ ...MARKERS.northTower }), wanted: 3, text: 'Break through the roadblock and reach the North Tower', hint: '3 stars — go around or through' },
    ],
  },
  {
    name: 'Final Payday',
    payout: PAYOUTS[7], rp: MISSION_RP[7],
    dialogue: { name: 'MIRA KESANG', text: 'Last package, biggest score. Four stars, one heli, no mistakes.' },
    stages: [
      { kind: 'pickup', target: () => ({ ...MARKERS.pier }), text: 'Pick up the final package at the pier', hint: 'Last job — make it count' },
      { kind: 'deliver', target: () => ({ ...MARKERS.beachfront }), wanted: 4, text: 'Deliver it to the beachfront', hint: '4 stars and a helicopter' },
    ],
  },
];

export function createMissions() {
  return {
    index: 0, // 0..7, or 8 when the story is done
    stage: 0,
    hasPackage: false,
    earned: 0,
    rpEarned: 0,
    done: false,
    stageStarted: false, // current stage's entry effects applied?
  };
}

export function currentMission(m) {
  if (m.done || m.index >= MISSION_DEFS.length) return null;
  return MISSION_DEFS[m.index];
}

export function currentStage(m) {
  const def = currentMission(m);
  if (!def) return null;
  return def.stages[m.stage];
}

export function missionTarget(m) {
  const def = currentMission(m);
  const stage = currentStage(m);
  if (!def || !stage || !stage.target) return null;
  const t = stage.target();
  return { x: t.x, y: t.y, label: t.label, name: def.name, text: stage.text, hint: stage.hint };
}

// For the HUD mission panel: name, stage x/y, objective, next line.
export function missionPanel(m) {
  const def = currentMission(m);
  if (!def) return null;
  const stage = currentStage(m);
  const next = def.stages[m.stage + 1];
  return {
    index: m.index,
    name: def.name,
    stage: m.stage + 1,
    stageTotal: def.stages.length,
    text: stage ? stage.text : '',
    hint: stage ? stage.hint : '',
    next: next ? next.text : 'Finish the job',
  };
}

function near(ctx, t, radius = 70) {
  if (!t) return false;
  return Math.hypot(ctx.x - t.x, ctx.y - t.y) < radius;
}

// ctx: { x, y, inCar, wanted, busted, thugsDown, thugsTotal,
//        raceWon, raceLost, targetWrecked, targetEscaped, dt }
// Events: payout | setWanted | pickedUp | storyComplete | busted |
//         stageStart {kind, mission, stage} | dialogue | unlockSmg |
//         raceLost | targetEscaped
export function updateMissions(m, ctx, dt) {
  void dt;
  const events = [];
  if (m.done) return events;
  if (ctx.busted) {
    events.push({ type: 'busted' });
    return events;
  }
  const def = currentMission(m);
  const stage = currentStage(m);
  if (!def || !stage) return events;

  // Stage entry effects, once: wanted level + spawn signal + dialogue.
  if (!m.stageStarted) {
    m.stageStarted = true;
    events.push({ type: 'stageStart', kind: stage.kind, mission: m.index, stage: m.stage });
    if (m.stage === 0 && m.index > 0) {
      events.push({ type: 'dialogue', name: def.dialogue.name, text: def.dialogue.text });
    }
    if (stage.wanted) events.push({ type: 'setWanted', stars: stage.wanted });
  }

  const t = stage.target ? stage.target() : null;
  let complete = false;
  if (stage.kind === 'steal') {
    complete = !!ctx.inCar;
  } else if (stage.kind === 'reach') {
    complete = near(ctx, t);
  } else if (stage.kind === 'reachInCar') {
    complete = !!ctx.inCar && near(ctx, t);
  } else if (stage.kind === 'pickup') {
    if (near(ctx, t)) {
      m.hasPackage = true;
      events.push({ type: 'pickedUp' });
      complete = true;
    }
  } else if (stage.kind === 'deliver') {
    complete = m.hasPackage && near(ctx, t);
  } else if (stage.kind === 'thugs') {
    complete = (ctx.thugsTotal || 0) > 0 && (ctx.thugsDown || 0) >= ctx.thugsTotal;
  } else if (stage.kind === 'race') {
    if (ctx.raceWon) complete = true;
    else if (ctx.raceLost) events.push({ type: 'raceLost' });
  } else if (stage.kind === 'ram') {
    if (ctx.targetWrecked) complete = true;
    else if (ctx.targetEscaped) events.push({ type: 'targetEscaped' });
  }

  if (events.some((e) => e.type === 'raceLost' || e.type === 'targetEscaped')) {
    return events; // world resets the race/target; stage stays current
  }
  if (!complete) return events;

  // Advance a stage, or finish the mission.
  m.stage += 1;
  m.stageStarted = false;
  if (m.stage < def.stages.length) return events;
  m.earned += def.payout;
  m.rpEarned += def.rp;
  m.index += 1;
  m.stage = 0;
  m.hasPackage = false;
  events.push({ type: 'payout', amount: def.payout, rp: def.rp });
  if (def.unlockSmg) events.push({ type: 'unlockSmg' });
  if (m.index >= MISSION_DEFS.length) {
    m.done = true;
    events.push({ type: 'storyComplete' });
  }
  return events;
}

// After a bust: the current mission restarts from its opening stage
// (progress inside the mission is lost, completed missions stay done).
export function resetCurrentMission(m) {
  m.stage = 0;
  m.hasPackage = false;
  m.stageStarted = false;
}
