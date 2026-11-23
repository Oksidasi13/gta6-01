// Vice Shores — sound, all generated with WebAudio: no audio files, nothing fetched.
// An engine hum that follows the car's speed, a two-tone siren, gunshots, pickups
// and the mission-complete jingle. Silent until the first key press (browsers demand
// a gesture), and safe to call in a headless shot where there is no audio at all.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenHigh = false;
  }

  /** Create the audio context on the first user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch (error) {
      this.ctx = null;
    }
  }

  /** The engine hum follows the car's speed; silent on foot. */
  setEngine(speed, inCar) {
    if (!this.ctx || !this.engineGain) return;
    const target = this.muted || !inCar ? 0 : 0.03 + Math.min(0.05, Math.abs(speed) / 520 * 0.05);
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    if (this.engineOsc) this.engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 0.16, this.ctx.currentTime, 0.1);
  }

  /** The siren wails while the player is wanted; its tone alternates. */
  setSiren(wanted) {
    if (!this.ctx || !this.sirenGain) return;
    const target = this.muted || wanted === 0 ? 0 : 0.018;
    this.sirenGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
    if (this.sirenOsc && wanted > 0) {
      this.sirenHigh = !this.sirenHigh;
      this.sirenOsc.frequency.setTargetAtTime(this.sirenHigh ? 950 : 700, this.ctx.currentTime, 0.05);
    }
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (error) {
      // Audio is decoration; never let it break the game.
    }
  }

  noiseBurst(dur, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } catch (error) {
      // Audio is decoration; never let it break the game.
    }
  }

  gunshot() { this.noiseBurst(0.12, 0.25); }
  enemyShot() { this.noiseBurst(0.1, 0.1); }
  punch() { this.noiseBurst(0.08, 0.15); }
  pickup() { this.blip(880, 0.12, 'sine', 0.1); }
  missionComplete() {
    this.blip(523, 0.15, 'triangle', 0.12);
    setTimeout(() => this.blip(659, 0.15, 'triangle', 0.12), 140);
    setTimeout(() => this.blip(784, 0.3, 'triangle', 0.12), 280);
  }
  busted() { this.blip(220, 0.5, 'sawtooth', 0.12); }
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
