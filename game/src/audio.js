// Vice Shores — WebAudio tones only. No audio files, no network.
// Every method is a no-op when there is no AudioContext (node tests,
// muted browsers), so importing this module never crashes.

export function createAudio() {
  const audio = {
    muted: false,
    ctx: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenTimer: 0,
    sirenHigh: false,
  };

  function ensureCtx() {
    if (audio.ctx) return audio.ctx;
    try {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      audio.ctx = new AC();
    } catch {
      audio.ctx = null;
    }
    return audio.ctx;
  }

  // Call on the first user gesture (Enter / click) to unlock audio.
  audio.unlock = function unlock() {
    const ctx = ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };

  audio.setMuted = function setMuted(m) {
    audio.muted = !!m;
    if (audio.engineGain) audio.engineGain.gain.value = 0;
    if (audio.sirenGain) audio.sirenGain.gain.value = 0;
  };

  audio.toggleMute = function toggleMute() {
    audio.setMuted(!audio.muted);
    return audio.muted;
  };

  // Continuous engine hum; call every frame with speed 0..1.
  audio.engine = function engine(speedNorm, driving) {
    if (audio.muted || !driving) {
      if (audio.engineGain) audio.engineGain.gain.value = 0;
      return;
    }
    const ctx = ensureCtx();
    if (!ctx) return;
    if (!audio.engineOsc) {
      audio.engineOsc = ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineGain = ctx.createGain();
      audio.engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      audio.engineOsc.connect(filt);
      filt.connect(audio.engineGain);
      audio.engineGain.connect(ctx.destination);
      audio.engineOsc.start();
    }
    audio.engineOsc.frequency.value = 55 + speedNorm * 130;
    audio.engineGain.gain.value = 0.03 + speedNorm * 0.05;
  };

  // Two-tone siren while wanted. Call every frame; dt in seconds.
  audio.siren = function siren(dt, wanted) {
    if (audio.muted || wanted <= 0) {
      if (audio.sirenGain) audio.sirenGain.gain.value = 0;
      return;
    }
    const ctx = ensureCtx();
    if (!ctx) return;
    if (!audio.sirenOsc) {
      audio.sirenOsc = ctx.createOscillator();
      audio.sirenOsc.type = 'square';
      audio.sirenGain = ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(ctx.destination);
      audio.sirenOsc.start();
    }
    audio.sirenTimer += dt;
    if (audio.sirenTimer > 0.42) {
      audio.sirenTimer = 0;
      audio.sirenHigh = !audio.sirenHigh;
      audio.sirenOsc.frequency.value = audio.sirenHigh ? 880 : 660;
    }
    audio.sirenGain.gain.value = 0.018;
  };

  function blip(freq, dur, type = 'sine', vol = 0.08) {
    if (audio.muted) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  // Short filtered noise burst for a gunshot.
  audio.gunshot = function gunshot() {
    if (audio.muted) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.09);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(filt);
    filt.connect(g);
    g.connect(ctx.destination);
    src.start();
  };

  audio.punch = function punch() { blip(140, 0.08, 'square', 0.06); };
  audio.pickup = function pickup() { blip(660, 0.12, 'sine', 0.07); };

  // Radio static blip when the station changes (Q).
  audio.station = function station() {
    blip(1200, 0.05, 'square', 0.03);
    const ctx = audio.ctx;
    if (ctx && !audio.muted) {
      setTimeout(() => blip(900, 0.06, 'square', 0.03), 70);
    }
  };

  // Little two-note chime on mission completion.
  audio.chime = function chime() {
    blip(523, 0.16, 'sine', 0.09);
    const ctx = audio.ctx;
    if (ctx && !audio.muted) {
      setTimeout(() => blip(784, 0.24, 'sine', 0.09), 130);
    }
  };

  audio.busted = function busted() {
    blip(220, 0.3, 'sawtooth', 0.07);
    const ctx = audio.ctx;
    if (ctx && !audio.muted) {
      setTimeout(() => blip(165, 0.4, 'sawtooth', 0.07), 200);
    }
  };

  return audio;
}
