// FRONTIER — música ambiente e efeitos sonoros, sintetizados no momento (sem ficheiros de áudio).
// Substitui a música do projecto original. Ideia: um "calminha" de fundo, que não cansa ao fim
// de uma hora — acordes longos e suaves (pad) em ré maior, e de vez em quando uma nota solta,
// como um sino de vidro ao longe, tudo com muito eco e pouco volume.
// O navegador só deixa tocar som depois de um toque ou clique: chama sound.unlock() nesse momento.

const CHORDS = [               // progressão lenta: Ré maj9, Si m7, Sol maj7, Lá sus2 (Hz)
  [146.83, 220.00, 277.18, 329.63],
  [123.47, 185.00, 220.00, 293.66],
  [98.00, 196.00, 246.94, 293.66],
  [110.00, 164.81, 246.94, 329.63],
];
const BELLS = [587.33, 659.25, 739.99, 880.00, 987.77, 1174.66]; // pentatónica de ré, aguda
const CHORD_SEC = 9;           // cada acorde dura cerca de 9 s

class SoundSystem {
  constructor() { this.ctx = null; this.musicOn = false; this.muted = false; this.timer = null; this.next = 0; this.step = 0; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this._impulse(5.5);
    const wet = ctx.createGain(); wet.gain.value = 0.55; this.reverb.connect(wet).connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = 0;   // sobe devagar quando a música começa
    this.music.connect(this.master); this.music.connect(this.reverb);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.5;
    this.sfx.connect(this.master); this.sfx.connect(this.reverb);
  }

  // Eco longo e escuro, feito de ruído a decair.
  _impulse(sec) {
    const ctx = this.ctx, len = Math.floor(sec * ctx.sampleRate), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, 2.6); }
    }
    return buf;
  }

  // Uma voz do pad: duas ondas ligeiramente desafinadas, filtro baixo, entrada e saída muito lentas.
  _padVoice(freq, t, dur, gain) {
    const ctx = this.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.3;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = (Math.random() - 0.5) * 0.6;
    for (const [type, det] of [['sine', -4], ['triangle', 5]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.1);
    }
    f.connect(g);
    if (pan) g.connect(pan).connect(this.music); else g.connect(this.music);
  }

  // Nota de sino de vidro: ataque rápido, cauda longa, muito baixa.
  _bell(freq, t, gain = 0.035, bus = this.music) {
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    for (const [mult, lvl] of [[1, 1], [2.01, 0.25]]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq * mult; og.gain.value = lvl;
      o.connect(og).connect(g); o.start(t); o.stop(t + 3.3);
    }
    g.connect(bus);
  }

  _schedule() {
    const ctx = this.ctx;
    while (this.next < ctx.currentTime + 1.5) {
      const t = this.next, chord = CHORDS[this.step % CHORDS.length];
      chord.forEach(fr => this._padVoice(fr, t, CHORD_SEC * 1.35, 0.028));
      // 1 a 3 notas soltas por acorde, em momentos ao acaso
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) if (Math.random() < 0.8) this._bell(BELLS[Math.floor(Math.random() * BELLS.length)], t + 1.5 + Math.random() * (CHORD_SEC - 2));
      this.next += CHORD_SEC; this.step++;
    }
  }

  startMusic() {
    this.unlock(); if (!this.ctx || this.musicOn) return;
    this.musicOn = true; this.next = this.ctx.currentTime + 0.1;
    const g = this.music.gain; g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime); g.linearRampToValueAtTime(1, this.ctx.currentTime + 4);
    this._schedule(); this.timer = setInterval(() => this._schedule(), 500);
  }

  stopMusic() {
    if (!this.ctx || !this.musicOn) return;
    this.musicOn = false; clearInterval(this.timer); this.timer = null;
    const g = this.music.gain; g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime); g.linearRampToValueAtTime(0, this.ctx.currentTime + 2.5);
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.9; }

  // Efeitos curtos e suaves.
  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (name === 'place') { this._bell(392.0, t, 0.06, this.sfx); this._bell(587.33, t + 0.06, 0.04, this.sfx); }
    else if (name === 'card') this._bell(880, t, 0.03, this.sfx);
    else if (name === 'error') this._bell(220, t, 0.05, this.sfx);
  }
}

export const sound = new SoundSystem();
