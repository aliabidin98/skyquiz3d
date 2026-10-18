class SoundEngine {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineLFO: OscillatorNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.engineOsc) return;

    try {
      // Propeller engine sound setup
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low engine hum

      // Lowpass filter to muffle the harsh saw wave into a realistic aircraft drone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      // LFO for propeller rotation pulsing rhythm
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(14, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(12, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      lfo.start();

      this.engineOsc = osc;
      this.engineLFO = lfo;
      this.engineGain = gain;
      this.isInitialized = true;
    } catch (e) {
      console.warn('Audio engine init error', e);
    }
  }

  public updateEnginePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc || !this.engineLFO) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 50 + speedRatio * 45;
      this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.1);
      this.engineLFO.frequency.setTargetAtTime(12 + speedRatio * 15, now, 0.1);
    } catch {
      // Audio fallback safe
    }
  }

  public playCorrectSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  }

  public playWrongSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.3);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playWhooshSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.4);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // Audio fallback safe
    }
  }

  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.15 },
      { f: 523.25, d: 0.15 },
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.4 },
      { f: 587.33, d: 0.2 },
      { f: 659.25, d: 0.2 },
      { f: 783.99, d: 0.6 },
    ];

    let t = this.ctx.currentTime + 0.05;
    melody.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.05);
      t += note.d + 0.05;
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
    }
  }

  public stopAll() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    if (this.engineLFO) {
      try {
        this.engineLFO.stop();
        this.engineLFO.disconnect();
      } catch {}
      this.engineLFO = null;
    }
  }
}

export const soundEngine = new SoundEngine();
