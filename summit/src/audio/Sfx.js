// Tiny chiptune sound effects synthesised with WebAudio. No audio files.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Must be called from a user gesture (browsers block audio until then).
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.35; }

  tone(f0, f1, dur, type = 'square', vol = 0.3, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.3, freq = 2000, delay = 0, freqEnd = freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  arp(notes, step = 0.06, type = 'square', vol = 0.2) {
    notes.forEach((n, i) => this.tone(n, n * 1.01, step * 1.4, type, vol, i * step));
  }

  play(name) {
    switch (name) {
      case 'jump': this.tone(280, 560, 0.09, 'square', 0.16); break;
      case 'walljump': this.tone(340, 720, 0.1, 'square', 0.16); this.noise(0.05, 0.12, 3000); break;
      case 'dash': this.noise(0.18, 0.3, 6000, 0, 400); this.tone(900, 180, 0.16, 'sawtooth', 0.1); break;
      case 'land': this.noise(0.06, 0.18, 900, 0, 200); this.tone(140, 60, 0.06, 'triangle', 0.25); break;
      case 'death': this.tone(660, 70, 0.4, 'square', 0.2); this.noise(0.35, 0.3, 4000, 0, 100); break;
      case 'respawn': this.tone(200, 800, 0.15, 'triangle', 0.18); break;
      case 'crystal': this.arp([1046, 1318, 1568, 2093], 0.04, 'triangle', 0.22); break;
      case 'crystalBack': this.tone(1568, 1568, 0.05, 'triangle', 0.06); break;
      case 'refill': this.tone(1400, 1600, 0.04, 'triangle', 0.08); break;
      case 'berry': this.arp([659, 880, 1046, 1318, 1760], 0.055, 'square', 0.14); break;
      case 'crumble': this.noise(0.25, 0.25, 1200, 0, 150); break;
      case 'hop': this.tone(400, 600, 0.06, 'square', 0.1); break;
      case 'room': this.noise(0.25, 0.08, 500, 0, 2500); break;
      case 'finish': this.arp([523, 659, 784, 1046, 784, 1046, 1318], 0.11, 'square', 0.18); break;
      case 'select': this.arp([784, 1046], 0.06, 'square', 0.15); break;
    }
  }
}

export const sfx = new Sfx();
