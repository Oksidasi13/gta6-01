// Vice Shores — localStorage save/load with an in-memory fallback,
// so the game also runs (and tests) where storage is unavailable.
// Now also persists respect (RP) and the SMG unlock.

const KEY = 'vice-shores-save-v1';

export function defaultSave() {
  return { money: 0, missionIndex: 0, bestScore: 0, muted: false, rp: 0, smgUnlocked: false };
}

function store() {
  try {
    if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Storage blocked (private mode, sandbox): fall through to memory.
  }
  if (!globalThis.__viceShoresMemoryStore) {
    globalThis.__viceShoresMemoryStore = Object.create(null);
  }
  const mem = globalThis.__viceShoresMemoryStore;
  return {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
}

export function loadSave() {
  try {
    const raw = store().getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const save = defaultSave();
    if (typeof parsed.money === 'number') save.money = Math.max(0, Math.floor(parsed.money));
    if (typeof parsed.missionIndex === 'number') {
      save.missionIndex = Math.max(0, Math.min(8, Math.floor(parsed.missionIndex)));
    }
    if (typeof parsed.bestScore === 'number') save.bestScore = Math.max(0, Math.floor(parsed.bestScore));
    if (typeof parsed.muted === 'boolean') save.muted = parsed.muted;
    if (typeof parsed.rp === 'number') save.rp = Math.max(0, Math.floor(parsed.rp));
    if (typeof parsed.smgUnlocked === 'boolean') save.smgUnlocked = parsed.smgUnlocked;
    return save;
  } catch {
    return defaultSave();
  }
}

export function saveGame(save) {
  try {
    store().setItem(KEY, JSON.stringify({
      money: save.money | 0,
      missionIndex: save.missionIndex | 0,
      bestScore: save.bestScore | 0,
      muted: !!save.muted,
      rp: save.rp | 0,
      smgUnlocked: !!save.smgUnlocked,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { store().removeItem(KEY); } catch { /* ignore */ }
}
