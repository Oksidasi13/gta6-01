// Vice Shores — HUD: dense, professional, GTA-style. All canvas-drawn.
// Top-left mission panel, top-right money/stars/clock/rank, left dispatch
// panel while wanted, right weapon slots + crew cards, bottom-left
// minimap + health/armour, bottom-right speed + car + radio,
// bottom-centre dialogue box.

import { COLORS, MARKERS, RADIO, ABILITIES, GARAGE_REPAIR_COST, rankFor } from './config.js';
import { missionPanel, currentMission } from './missions.js';
import { dispatchUnits } from './police.js';

function fmtMoney(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

function fmtClock(clockMin) {
  const hh = Math.floor(clockMin / 60) % 24;
  const mm = Math.floor(clockMin) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function drawHUD(ctx, world, w, h) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // ---------- Top-left: mission panel ----------
  const mp = missionPanel(world.missions);
  panel(ctx, 12, 12, 340, 108);
  if (mp) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillText(`MISSION ${mp.index + 1} · ${mp.name.toUpperCase()}`, 24, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '400 13px Arial, sans-serif';
    ctx.fillText(`STAGE ${mp.stage}/${mp.stageTotal}`, 24, 54);
    ctx.font = '400 14px Arial, sans-serif';
    ctx.fillText(mp.text, 24, 76, 316);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '400 13px Arial, sans-serif';
    ctx.fillText(`NEXT: ${mp.next}`, 24, 98, 316);
  } else {
    ctx.fillStyle = '#ffd23f';
    ctx.font = '700 16px Arial, sans-serif';
    ctx.fillText('STORY COMPLETE', 24, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '400 14px Arial, sans-serif';
    ctx.fillText(`You banked $${world.missions.earned}. Vice Shores is yours.`, 24, 66, 316);
  }

  // ---------- Top-right: money, stars, clock, rank ----------
  const rank = rankFor(p.rp);
  panel(ctx, w - 332, 12, 320, 108);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7CFC00';
  ctx.font = '900 30px Arial, sans-serif';
  ctx.fillText(fmtMoney(p.money), w - 24, 44);
  ctx.textAlign = 'left';
  // Stars.
  ctx.font = '24px Arial, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < world.wanted.stars ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', w - 320 + i * 30, 74);
  }
  // Clock.
  ctx.fillStyle = '#fff';
  ctx.font = '700 18px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(fmtClock(world.clockMin), w - 24, 74);
  ctx.textAlign = 'left';
  // Rank bar.
  ctx.fillStyle = '#fff';
  ctx.font = '700 13px Arial, sans-serif';
  const nextAt = rank.next ? rank.next.at : null;
  const rankLabel = nextAt
    ? `${rank.current.name}  ${p.rp.toLocaleString('en-US')} / ${nextAt.toLocaleString('en-US')} RP`
    : `${rank.current.name}  ${p.rp.toLocaleString('en-US')} RP — MAX`;
  ctx.fillStyle = '#ffd23f';
  ctx.font = '700 13px Arial, sans-serif';
  ctx.fillText(rankLabel, w - 320, 98);
  ctx.fillStyle = '#222';
  ctx.fillRect(w - 320, 104, 296, 6);
  const frac = nextAt ? (p.rp - rank.current.at) / (nextAt - rank.current.at) : 1;
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(w - 320, 104, 296 * Math.max(0, Math.min(1, frac)), 6);

  // ---------- Left edge: dispatch panel (while wanted) ----------
  if (world.wanted.stars > 0) {
    const units = dispatchUnits(world.police, world.heli, p);
    const ph = 30 + units.length * 20;
    panel(ctx, 12, 140, 240, ph);
    ctx.fillStyle = '#ff5e57';
    ctx.font = '700 13px Arial, sans-serif';
    ctx.fillText(`KPD RESPONSE — ${units.length} UNIT${units.length === 1 ? '' : 'S'}`, 22, 162);
    ctx.font = '400 13px Arial, sans-serif';
    units.forEach((u, i) => {
      ctx.fillStyle = '#fff';
      ctx.fillText(`${u.name}  ${u.role}`, 22, 184 + i * 20);
      ctx.textAlign = 'right';
      ctx.fillText(`${u.dist} m`, 240, 184 + i * 20);
      ctx.textAlign = 'left';
    });
  }

  // ---------- Right edge: weapon slots + crew cards ----------
  const wx = w - 212;
  let wy = 140;
  const c = world.combat;
  const slots = [
    { key: '1', name: 'FISTS', ammo: '∞', selected: c.weapon === 'fists', locked: false },
    { key: '2', name: 'PISTOL', ammo: c.reloadTimer > 0 ? 'RELOADING…' : `${c.mag} / ${c.reserve}`, selected: c.weapon === 'pistol', locked: false },
    { key: '3', name: 'SMG', ammo: c.smgUnlocked ? (c.reloadTimer > 0 && c.weapon === 'smg' ? 'RELOADING…' : `${c.smgMag} / ${c.smgReserve}`) : 'LOCKED', selected: c.weapon === 'smg', locked: !c.smgUnlocked },
  ];
  for (const s of slots) {
    ctx.fillStyle = s.selected ? 'rgba(255, 210, 63, 0.28)' : COLORS.hudBg;
    ctx.fillRect(wx, wy, 200, 30);
    ctx.strokeStyle = s.selected ? '#ffd23f' : 'rgba(255,255,255,0.14)';
    ctx.strokeRect(wx + 0.5, wy + 0.5, 199, 29);
    ctx.fillStyle = s.locked ? 'rgba(255,255,255,0.4)' : '#fff';
    ctx.font = '700 14px Arial, sans-serif';
    ctx.fillText(`[${s.key}] ${s.name}`, wx + 10, wy + 20);
    ctx.textAlign = 'right';
    ctx.fillText(s.ammo, wx + 190, wy + 20);
    ctx.textAlign = 'left';
    wy += 34;
  }
  wy += 8;
  const abilities = [
    { key: 'Z', def: ABILITIES.swapPlates, state: world.abilities.swapPlates },
    { key: 'X', def: ABILITIES.quickFix, state: world.abilities.quickFix },
    { key: 'C', def: ABILITIES.eyesOut, state: world.abilities.eyesOut },
  ];
  for (const a of abilities) {
    const ready = a.state.cd <= 0;
    const active = a.def === ABILITIES.eyesOut && a.state.active > 0;
    ctx.fillStyle = active ? 'rgba(45, 125, 255, 0.35)' : COLORS.hudBg;
    ctx.fillRect(wx, wy, 200, 30);
    ctx.strokeStyle = active ? '#2d7dff' : 'rgba(255,255,255,0.14)';
    ctx.strokeRect(wx + 0.5, wy + 0.5, 199, 29);
    ctx.fillStyle = ready || active ? '#fff' : 'rgba(255,255,255,0.45)';
    ctx.font = '700 13px Arial, sans-serif';
    ctx.fillText(`[${a.key}] ${a.def.name}`, wx + 10, wy + 19);
    ctx.textAlign = 'right';
    ctx.font = '400 12px Arial, sans-serif';
    ctx.fillText(
      active ? `ACTIVE ${Math.ceil(a.state.active)}s` : ready ? a.def.desc.toUpperCase() : `${Math.ceil(a.state.cd)}s`,
      wx + 190, wy + 19,
    );
    ctx.textAlign = 'left';
    wy += 34;
  }

  // ---------- Bottom-left: health + armour bars (under the minimap) ----------
  const barX = 12;
  const barW = 190;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(barX, h - 48, barW, 36);
  ctx.fillStyle = '#222';
  ctx.fillRect(barX + 8, h - 42, barW - 16, 10);
  ctx.fillStyle = p.health > 50 ? '#37d67a' : p.health > 25 ? '#ffb020' : '#ff3b30';
  ctx.fillRect(barX + 8, h - 42, (barW - 16) * Math.max(0, p.health / 100), 10);
  ctx.fillStyle = '#222';
  ctx.fillRect(barX + 8, h - 28, barW - 16, 10);
  ctx.fillStyle = '#2d7dff';
  ctx.fillRect(barX + 8, h - 28, (barW - 16) * Math.max(0, p.armour / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.font = '700 10px Arial, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.health)}`, barX + 10, h - 34);
  ctx.fillText(`ARMOUR ${Math.ceil(p.armour)}`, barX + 10, h - 20);

  // ---------- Bottom-right: speed, car, damage, radio ----------
  if (!p.onFoot && p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.36);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = '900 44px Arial, sans-serif';
    ctx.fillText(`${kmh}`, w - 80, h - 66);
    ctx.font = '400 16px Arial, sans-serif';
    ctx.fillText('km/h', w - 24, h - 66);
    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(p.car.name, w - 24, h - 40);
    ctx.fillStyle = '#fff';
    ctx.font = '400 13px Arial, sans-serif';
    const dmg = 100 - Math.round(p.car.health);
    ctx.fillText(`DAMAGE ${dmg}%`, w - 24, h - 22);
    ctx.textAlign = 'left';
  }
  const st = RADIO[world.radio.station];
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '400 13px Arial, sans-serif';
  const radioY = !p.onFoot && p.car ? h - 118 : h - 22;
  ctx.fillText(`RADIO ${st.freq} — ${st.name} · ${st.tracks[world.radio.track]}`, w - 24, radioY);
  ctx.textAlign = 'left';

  // ---------- Bottom-centre: dialogue box ----------
  const dlg = world.dialogue.timer > 0
    ? world.dialogue
    : (() => { const m = currentMission(world.missions); return m ? m.dialogue : null; })();
  if (dlg) {
    const bw = 560;
    const bx = (w - bw) / 2;
    const by = h - 108;
    panel(ctx, bx, by, bw, 52);
    ctx.fillStyle = '#ffd23f';
    ctx.font = '700 13px Arial, sans-serif';
    ctx.fillText(dlg.name, bx + 14, by + 20);
    ctx.fillStyle = '#fff';
    ctx.font = '400 14px Arial, sans-serif';
    ctx.fillText(dlg.text, bx + 14, by + 40, bw - 28);
  }

  // ---------- Garage prompt ----------
  if (!p.onFoot && p.car && p.car.health < 100 && p.money >= GARAGE_REPAIR_COST
    && Math.hypot(p.x - MARKERS.garage.x, p.y - MARKERS.garage.y) < 110) {
    ctx.font = '700 16px Arial, sans-serif';
    const msg = `GARAGE — press E to repair $${GARAGE_REPAIR_COST}`;
    const tw = ctx.measureText(msg).width;
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(w / 2 - tw / 2 - 12, h - 158, tw + 24, 30);
    ctx.fillStyle = '#7CFC00';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h - 137);
    ctx.textAlign = 'left';
  }

  // ---------- Transient message (steal / payout / busted) centre-top ----------
  if (world.messageTimer > 0 && world.message) {
    ctx.font = '700 20px Arial, sans-serif';
    const tw = ctx.measureText(world.message).width;
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(w / 2 - tw / 2 - 14, 128, tw + 28, 36);
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, w / 2, 153);
    ctx.textAlign = 'left';
  }

  // ---------- Crosshair while on foot ----------
  if (p.onFoot) {
    const mx = world.input.mouse.x;
    const my = world.input.mouse.y;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 13, my);
    ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my);
    ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13);
    ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }
}
