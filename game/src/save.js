// Vice Shores — save and load. One small JSON object in localStorage: cash, the
// mission, the player's place and health, the clock and the best cash earned.
import { SAVE_KEY } from './config.js';

/** Write the current run to localStorage. */
export function saveGame(state) {
  try {
    const data = {
      cash: state.player.cash,
      missionIndex: state.missionIndex,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      hp: Math.round(state.player.hp),
      ammo: state.player.ammo,
      timeOfDay: state.timeOfDay,
      best: Math.max(state.best || 0, state.player.cash),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

/** Read the save back, or null when there is none. */
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.x !== 'number') return null;
    return data;
  } catch (error) {
    return null;
  }
}

/** Apply a loaded save to a fresh world state. */
export function applySave(state, data) {
  state.player.cash = data.cash;
  state.player.x = data.x;
  state.player.y = data.y;
  state.player.hp = data.hp;
  state.player.ammo = data.ammo;
  state.timeOfDay = data.timeOfDay || 10;
  state.best = data.best || 0;
  state.missionIndex = Math.min(data.missionIndex || 0, 2);
  state.missionStage = 0;
  state.wanted = 0;
  state.cops = [];
}
