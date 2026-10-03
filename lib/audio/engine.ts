/**
 * PHOSPHOR ACE audio engine — 100% Web Audio, zero asset files.
 *
 * Three layers:
 *   1. SFX bus  — chiptune zaps / booms / pickups, rendered from square + noise.
 *   2. Music bus— a driving 4-on-the-floor arcade loop sequenced live.
 *   3. Ambience — surf + engine rumble, gain-scaled by game state.
 *
 * The whole graph is built lazily on the first user gesture (autoplay policy).
 *
 * An OKANFXLABS AI Design Labs production.
 */

export type SfxName =
  | "shoot"
  | "shootBig"
  | "hit"
  | "hitArmor"
  | "explode"
  | "explodeBig"
  | "pickup"
  | "powerUp"
  | "lifeLost"
  | "bomb"
  | "siren"
  | "bossHit"
  | "select"
  | "confirm"
  | "back"
  | "deny"
  | "wave"
  | "gameOver"
  | "record"
  | "tick";

const NOTES: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

export function note(s: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(s);
  if (!m) return 440;
  const base = NOTES[m[1] as string] ?? 0;
  const oct = parseInt(m[2] as string, 10);
  return 440 * Math.pow(2, (base - 9) / 12 + (oct - 4));
}

interface Layer {
  gain: GainNode;
  bus: GainNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private started = false;
  private musicTimer: number | null = null;
  private step = 0;
  private intensity = 0;
  private targetIntensity = 0;
  private musicOn = true;
  private sfxOn = true;
  private ambNodes: AudioNode[] = [];
  private lastShoot = 0;
  private lastTick = 0;
  /** boss-mode filter sweep. */
  private musicFilter: BiquadFilterNode | null = null;
  private musicPattern = 0;

  get ready(): boolean {
    return this.started && this.ctx !== null;
  }

  get contextState(): AudioContextState | null {
    return this.ctx ? this.ctx.state : null;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  async init(): Promise<void> {
    if (this.started) {
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
        : undefined;
    if (!Ctor) return;
    this.ctx = new Ctor();
    const ctx = this.ctx;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 7;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.18;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.75;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.34;
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 0.0;

    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 2400;
    this.musicFilter.Q.value = 0.7;

    this.musicBus.connect(this.musicFilter);
    this.musicFilter.connect(this.sfxBus);
    this.sfxBus.connect(this.comp);
    this.ambBus.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);

    // 1s of white noise, reused everywhere.
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    this.started = true;
    this.startAmbience();
    if (this.musicOn) this.startMusic();
  }

  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === "running") await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
  }

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(on ? 0.34 : 0.0, t, 0.08);
    if (on) this.startMusic();
    else this.stopMusic();
  }

  get musicEnabled(): boolean {
    return this.musicOn;
  }

  setSfxEnabled(on: boolean): void {
    this.sfxOn = on;
    if (!this.ctx || !this.sfxBus) return;
    this.sfxBus.gain.setTargetAtTime(on ? 0.75 : 0.0, this.ctx.currentTime, 0.05);
  }

  get sfxEnabled(): boolean {
    return this.sfxOn;
  }

  /* ------------------------------------------------------------- primitives */

  private env(
    node: AudioNode,
    gain: number,
    attack: number,
    decay: number,
    when = 0,
  ): GainNode | null {
    if (!this.ctx) return null;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    node.connect(g);
    g.connect(this.sfxBus as GainNode);
    return g;
  }

  private tone(
    type: OscillatorType,
    freq: number,
    gain: number,
    attack: number,
    decay: number,
    slideTo?: number,
    when = 0,
  ): void {
    if (!this.ctx || !this.sfxOn) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    const t = this.ctx.currentTime + when;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + attack + decay);
    }
    this.env(o, gain, attack, decay, when);
    o.start(t);
    o.stop(t + attack + decay + 0.03);
  }

  private noise(
    gain: number,
    attack: number,
    decay: number,
    filter: BiquadFilterType,
    freq: number,
    q = 1,
    sweepTo?: number,
    when = 0,
  ): void {
    if (!this.ctx || !this.sfxOn || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    const t = this.ctx.currentTime + when;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo !== undefined) {
      f.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + attack + decay);
    }
    f.Q.value = q;
    src.connect(f);
    this.env(f, gain, attack, decay, when);
    const off = Math.random() * 0.4;
    src.start(t, off);
    src.stop(t + attack + decay + 0.05);
  }

  /* ------------------------------------------------------------------- SFX */

  play(name: SfxName, variation = 0): void {
    if (!this.ctx || !this.sfxOn) return;
    switch (name) {
      case "shoot": {
        const now = this.ctx.currentTime;
        if (now - this.lastShoot < 0.035) return; // voice-limit
        this.lastShoot = now;
        const f = 1180 + variation * 40;
        this.tone("square", f, 0.11, 0.002, 0.07, 320);
        this.tone("triangle", f * 2, 0.05, 0.001, 0.05, 700);
        break;
      }
      case "shootBig":
        this.tone("square", 760, 0.14, 0.003, 0.11, 180);
        this.tone("sawtooth", 380, 0.07, 0.002, 0.1, 110);
        this.noise(0.05, 0.001, 0.06, "highpass", 2400);
        break;
      case "hit":
        this.tone("square", 420, 0.06, 0.001, 0.045, 220);
        this.noise(0.05, 0.001, 0.04, "bandpass", 2600, 3);
        break;
      case "hitArmor":
        this.tone("square", 220, 0.05, 0.001, 0.05, 180);
        this.noise(0.07, 0.001, 0.05, "bandpass", 5200, 6);
        break;
      case "explode":
        this.noise(0.24, 0.004, 0.34, "lowpass", 1500, 1, 120);
        this.tone("triangle", 180, 0.16, 0.004, 0.3, 42);
        break;
      case "explodeBig":
        this.noise(0.36, 0.006, 0.72, "lowpass", 2100, 1, 80);
        this.tone("triangle", 130, 0.26, 0.006, 0.68, 28);
        this.tone("sine", 66, 0.3, 0.01, 0.9, 22);
        this.noise(0.12, 0.02, 0.5, "highpass", 3600);
        break;
      case "pickup":
        this.tone("square", 660, 0.1, 0.002, 0.06);
        this.tone("square", 880, 0.1, 0.002, 0.07, undefined, 0.05);
        this.tone("square", 1320, 0.09, 0.002, 0.1, undefined, 0.1);
        break;
      case "powerUp":
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone("square", f, 0.1, 0.002, 0.11, undefined, i * 0.055),
        );
        break;
      case "lifeLost":
        this.tone("sawtooth", 520, 0.18, 0.004, 0.7, 70);
        this.noise(0.14, 0.004, 0.5, "lowpass", 1200, 1, 200);
        break;
      case "bomb":
        this.noise(0.4, 0.01, 1.15, "lowpass", 3400, 0.8, 60);
        this.tone("sine", 90, 0.34, 0.02, 1.2, 20);
        this.tone("sawtooth", 240, 0.16, 0.01, 0.8, 40);
        this.tone("square", 1400, 0.08, 0.004, 0.4, 180);
        break;
      case "siren": {
        for (let i = 0; i < 3; i++) {
          this.tone("sawtooth", 480, 0.16, 0.09, 0.42, 980, i * 0.56);
          this.tone("sawtooth", 980, 0.12, 0.09, 0.42, 480, i * 0.56 + 0.24);
        }
        break;
      }
      case "bossHit":
        this.tone("square", 300, 0.05, 0.001, 0.04, 250);
        this.noise(0.045, 0.001, 0.05, "bandpass", 3600, 4);
        break;
      case "select":
        this.tone("square", 880, 0.07, 0.001, 0.05);
        break;
      case "confirm":
        this.tone("square", 660, 0.09, 0.002, 0.07);
        this.tone("square", 990, 0.09, 0.002, 0.14, undefined, 0.06);
        break;
      case "back":
        this.tone("square", 520, 0.08, 0.002, 0.06);
        this.tone("square", 330, 0.08, 0.002, 0.1, undefined, 0.05);
        break;
      case "deny":
        this.tone("square", 180, 0.12, 0.002, 0.14, 120);
        break;
      case "wave":
        [659, 880, 1046].forEach((f, i) =>
          this.tone("square", f, 0.09, 0.003, 0.16, undefined, i * 0.09),
        );
        break;
      case "gameOver":
        [523, 440, 392, 330, 262, 196].forEach((f, i) =>
          this.tone("square", f, 0.14, 0.006, 0.34, undefined, i * 0.22),
        );
        this.tone("triangle", 131, 0.16, 0.02, 1.4, 55, 0.2);
        break;
      case "record":
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone("square", f, 0.11, 0.003, 0.2, undefined, i * 0.1),
        );
        break;
      case "tick": {
        const now = this.ctx.currentTime;
        if (now - this.lastTick < 0.03) return;
        this.lastTick = now;
        this.tone("square", 1400, 0.03, 0.001, 0.02);
        break;
      }
    }
  }

  /* -------------------------------------------------------------- ambience */

  private startAmbience(): void {
    if (!this.ctx || !this.noiseBuf || !this.ambBus) return;
    // Surf: band-passed noise with a slow LFO on the cutoff = breaking waves.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 480;
    bp.Q.value = 0.6;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.ambBus);
    src.start();
    lfo.start();

    // Engine rumble: sub sine + filtered noise.
    const sub = this.ctx.createOscillator();
    sub.type = "sawtooth";
    sub.frequency.value = 52;
    const subF = this.ctx.createBiquadFilter();
    subF.type = "lowpass";
    subF.frequency.value = 180;
    const subG = this.ctx.createGain();
    subG.gain.value = 0.22;
    sub.connect(subF);
    subF.connect(subG);
    subG.connect(this.ambBus);
    sub.start();

    this.ambNodes = [src, lfo, sub];
  }

  /** 0 = menu (calm), 1 = combat. */
  setAmbience(level: number): void {
    if (!this.ctx || !this.ambBus) return;
    this.ambBus.gain.setTargetAtTime(
      Math.max(0, Math.min(1, level)) * 0.3,
      this.ctx.currentTime,
      0.4,
    );
  }

  /* ----------------------------------------------------------------- music */

  private startMusic(): void {
    if (this.musicTimer !== null || !this.ctx) return;
    const bpm = 148;
    const stepDur = 60 / bpm / 4; // 16th notes
    this.step = 0;
    this.musicTimer = window.setInterval(() => {
      this.tickMusic(stepDur);
    }, stepDur * 1000);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** 0 = menu groove, 1 = combat, 2 = boss. */
  setIntensity(v: number): void {
    this.targetIntensity = Math.max(0, Math.min(2, v));
  }

  private tickMusic(stepDur: number): void {
    if (!this.ctx || !this.musicOn) return;
    this.intensity += (this.targetIntensity - this.intensity) * 0.06;
    const s = this.step;
    const i = this.intensity;
    const ctx = this.ctx;
    if (ctx.state !== "running") return;

    // Filter opens up with intensity.
    if (this.musicFilter) {
      this.musicFilter.frequency.setTargetAtTime(
        1400 + i * 2600,
        ctx.currentTime,
        0.3,
      );
    }

    const roots = [55, 58.27, 49, 61.74]; // A1, Bb1, G1, B1
    const root = roots[Math.floor(s / 32) % roots.length] as number;
    const boss = i > 1.5;
    const menu = i < 0.35;

    // ---- kick
    if (s % 4 === 0 || (!menu && s % 8 === 6)) {
      this.kick(0.22 + i * 0.08);
    }
    // ---- snare / clap
    if (!menu && s % 8 === 4) {
      this.snare(0.11 + i * 0.05);
    }
    // ---- hats
    if (i > 0.3 && s % 2 === 1) {
      this.hat(s % 4 === 3 ? 0.035 : 0.02);
    }
    // ---- bass line (16ths)
    if (!menu || s % 8 === 0) {
      const scale = boss
        ? [0, 3, 6, 7, 10]
        : [0, 0, 7, 0, 5, 0, 3, 0];
      const st = scale[(s / 2) % scale.length | 0] as number;
      const f = root * Math.pow(2, st / 12) * 2;
      this.bass(f, stepDur * 1.7, 0.1 + i * 0.05);
    }
    // ---- lead arp
    if (!menu) {
      const arp = boss
        ? [12, 15, 19, 15, 24, 19, 15, 12]
        : [12, 15, 19, 22, 19, 15, 12, 10];
      const n = arp[s % arp.length] as number;
      if (s % 2 === 0) {
        this.lead(root * 4 * Math.pow(2, n / 12), stepDur * 1.4, 0.055 + i * 0.02);
      }
    }
    // ---- pad every bar
    if (s % 16 === 0) {
      this.pad(root * 4, stepDur * 14, 0.045 + i * 0.02);
    }
    this.musicPattern = (this.musicPattern + 1) % 4;
    this.step = (this.step + 1) % 128;
  }

  private kick(gain: number): void {
    if (!this.ctx || !this.noiseBuf || !this.musicBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.26);
  }

  private snare(gain: number): void {
    if (!this.ctx || !this.noiseBuf || !this.musicBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.18);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(gain * 0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g2);
    g2.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.14);
  }

  private hat(gain: number): void {
    if (!this.ctx || !this.noiseBuf || !this.musicBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.07);
  }

  private bass(freq: number, dur: number, gain: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(freq, t);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(420 + this.intensity * 500, t);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private lead(freq: number, dur: number, gain: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.02);
    // Detuned double for width.
    const o2 = ctx.createOscillator();
    o2.type = "square";
    o2.frequency.setValueAtTime(freq * 1.006, t);
    o2.connect(g);
    o2.start(t);
    o2.stop(t + dur + 0.02);
  }

  private pad(freq: number, dur: number, gain: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.musicBus);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200 + this.intensity * 1800;
    f.connect(g);
    for (const mul of [1, 1.5, 2.0, 3.0]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq * mul, t);
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  dispose(): void {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.started = false;
  }
}

export const audio: AudioEngine = new AudioEngine();
