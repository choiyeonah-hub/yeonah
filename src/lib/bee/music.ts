// WebAudio 로 만드는 효과음 + 「왕벌의 비행」(림스키코르사코프, 퍼블릭 도메인) 연주.
// 오디오 파일 없이 오실레이터만으로 반음계 질주를 흉내 낸다.

type SfxKind =
  | "sip"
  | "deposit"
  | "feed"
  | "recruit"
  | "hit"
  | "defeat"
  | "quest"
  | "crown"
  | "door";

const NOTE_LEN = 0.086; // 16분음표 (≒ 174bpm)

function asc(from: number, to: number) {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}
function desc(from: number, to: number) {
  const out: number[] = [];
  for (let n = from; n >= to; n--) out.push(n);
  return out;
}

// 반음계로 오르내리는 특유의 질주. (E5 에서 시작해 아래로 쏟아졌다가 다시 올라온다)
const MELODY: number[] = [
  ...desc(76, 64),
  64, 63, 64, 63, 62, 63, 62, 61, 62, 61, 60, 61,
  ...desc(60, 52),
  ...asc(52, 64),
  64, 65, 64, 65, 66, 65, 66, 67, 66, 67, 68, 67,
  ...asc(68, 76),
];

const BASS: number[] = [45, 45, 40, 40, 45, 45, 40, 40]; // A2 / E2 번갈아

function midiToHz(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class BeeAudio {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wingOsc: OscillatorNode | null = null;
  private wingGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private flying = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
    if (muted) this.setWing(0);
  }

  /** 날갯짓 소리: 속도(0~1)에 따라 붕- 하는 저음이 커진다. */
  setWing(intensity: number) {
    const ctx = this.muted ? this.ctx : this.ensure();
    if (!ctx || !this.master) return;
    if (!this.wingOsc) {
      const osc = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 92;
      filt.type = "lowpass";
      filt.frequency.value = 420;
      gain.gain.value = 0;
      osc.connect(filt).connect(gain).connect(this.master);
      osc.start();
      this.wingOsc = osc;
      this.wingGain = gain;
    }
    const target = this.muted ? 0 : Math.min(0.05, Math.max(0, intensity) * 0.05);
    this.wingGain?.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    this.wingOsc?.frequency.setTargetAtTime(88 + intensity * 46, ctx.currentTime, 0.1);
  }

  private tone(
    ctx: AudioContext,
    at: number,
    type: OscillatorType,
    freq: number,
    dur: number,
    gain: number,
    cutoff = 3200
  ) {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(cutoff, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(filt).connect(g).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  private noise(ctx: AudioContext, dur: number, gain: number, cutoff: number) {
    if (!this.master) return;
    const t = ctx.currentTime;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
  }

  sfx(kind: SfxKind) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (kind) {
      case "sip":
        this.tone(ctx, t, "sine", 620, 0.16, 0.09);
        this.tone(ctx, t + 0.07, "sine", 930, 0.16, 0.07);
        break;
      case "deposit":
        this.tone(ctx, t, "triangle", 440, 0.18, 0.09);
        this.tone(ctx, t + 0.08, "triangle", 660, 0.2, 0.08);
        break;
      case "feed":
        this.tone(ctx, t, "sine", 780, 0.14, 0.07);
        this.tone(ctx, t + 0.06, "sine", 1040, 0.18, 0.06);
        break;
      case "recruit":
        this.tone(ctx, t, "square", 520, 0.1, 0.05, 1800);
        break;
      case "hit":
        this.noise(ctx, 0.2, 0.13, 1400);
        this.tone(ctx, t, "sawtooth", 200, 0.22, 0.09, 1200);
        break;
      case "defeat":
        this.noise(ctx, 0.3, 0.14, 900);
        [392, 330, 262].forEach((f, i) => this.tone(ctx, t + i * 0.07, "triangle", f, 0.2, 0.07));
        break;
      case "door":
        this.noise(ctx, 0.5, 0.1, 700);
        [196, 262, 330].forEach((f, i) => this.tone(ctx, t + i * 0.12, "sine", f, 0.5, 0.06));
        break;
      case "quest":
        [523, 659, 784].forEach((f, i) => this.tone(ctx, t + i * 0.1, "triangle", f, 0.28, 0.08));
        break;
      case "crown":
        [523, 659, 784, 1046, 1319].forEach((f, i) =>
          this.tone(ctx, t + i * 0.12, "triangle", f, 0.5, 0.09)
        );
        break;
    }
  }

  get isFlightPlaying() {
    return this.flying;
  }

  /** 「왕벌의 비행」 시작 (엔딩용). 16분음표를 미리 예약해 두고 계속 이어 붙인다. */
  startFlight() {
    const ctx = this.ensure();
    if (!ctx || this.flying) return;
    this.flying = true;
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.15;
    const pump = () => {
      const c = this.ctx;
      if (!c || !this.flying) return;
      while (this.nextNoteTime < c.currentTime + 0.6) {
        const i = this.step % MELODY.length;
        const note = MELODY[i];
        this.tone(c, this.nextNoteTime, "sawtooth", midiToHz(note), NOTE_LEN * 1.5, 0.11, 2600);
        this.tone(c, this.nextNoteTime, "square", midiToHz(note + 12), NOTE_LEN * 0.9, 0.025, 4000);
        if (i % 4 === 0) {
          const b = BASS[Math.floor(i / 4) % BASS.length];
          this.tone(c, this.nextNoteTime, "triangle", midiToHz(b), NOTE_LEN * 3, 0.1, 900);
        }
        this.nextNoteTime += NOTE_LEN;
        this.step++;
      }
    };
    pump();
    this.timer = setInterval(pump, 180);
  }

  stopFlight() {
    this.flying = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stopFlight();
    this.setWing(0);
    try {
      this.wingOsc?.stop();
    } catch {
      // 이미 멈춘 경우는 무시
    }
    this.wingOsc = null;
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
