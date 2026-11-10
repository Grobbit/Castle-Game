import { WeatherKind } from '../types/castle';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private weather: WeatherKind = 'clear';
  private lastBrushTime = 0;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);
      this.startAmbientLoop();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      const ctx = this.ensureContext();
      if (ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.55, ctx.currentTime, 0.12);
      }
    } else if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.12);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setWeather(weather: WeatherKind): void {
    this.weather = weather;
    if (!this.ctx || !this.ambientFilter || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    if (weather === 'rain') {
      this.ambientFilter.type = 'bandpass';
      this.ambientFilter.frequency.setTargetAtTime(1450, now, 0.4);
      this.ambientFilter.Q.setTargetAtTime(0.55, now, 0.4);
      this.ambientGain.gain.setTargetAtTime(0.16, now, 0.5);
    } else if (weather === 'mist' || weather === 'snow') {
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setTargetAtTime(340, now, 0.4);
      this.ambientGain.gain.setTargetAtTime(0.07, now, 0.5);
    } else {
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setTargetAtTime(520, now, 0.4);
      this.ambientGain.gain.setTargetAtTime(0.08, now, 0.5);
    }
  }

  private startAmbientLoop(): void {
    if (!this.ctx || !this.masterGain) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.03 * white) / 1.03;
      data[i] = lastOut * 2.4;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();

    this.ambientSource = src;
    this.ambientFilter = filter;
    this.ambientGain = gain;
    this.setWeather(this.weather);
  }

  public playStonePlace(pitchFactor = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Warm low masonry thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = (108 + Math.random() * 18) * pitchFactor;
    osc.frequency.setValueAtTime(baseFreq * 1.4, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.58, now + 0.14);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);

    // Subtle stone click transient
    this.playNoiseBurst(0.045, 1900 * pitchFactor, 0.14);
  }

  public playWoodSnap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(290 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playGateChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const notes = [392, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.38);
    });
  }

  public playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.045);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playDemolish(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);

    this.playNoiseBurst(0.18, 650, 0.16);
  }

  public playBrushTick(isWater = false): void {
    const nowMs = performance.now();
    if (nowMs - this.lastBrushTime < 85) return;
    this.lastBrushTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (isWater) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const f = 340 + Math.random() * 240;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.45, now + 0.07);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } else {
      this.playNoiseBurst(0.04, 950 + Math.random() * 280, 0.05);
    }
  }

  private playNoiseBurst(duration: number, centerFreq: number, volume: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const len = Math.max(128, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = centerFreq;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  public dispose(): void {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch {
        // ignore
      }
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundscape = new SoundscapeEngine();
