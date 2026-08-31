// 아주 작은 WebAudio 효과음 모음 (오디오 파일 없이 합성).
type Kind = "dig" | "break" | "pickup" | "moss" | "hurt" | "jump" | "win" | "lose";

export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

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
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private blip(
    ctx: AudioContext,
    type: OscillatorType,
    from: number,
    to: number,
    dur: number,
    gain: number
  ) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(ctx: AudioContext, dur: number, gain: number) {
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t);
  }

  play(kind: Kind) {
    const ctx = this.ensure();
    if (!ctx) return;
    switch (kind) {
      case "dig":
        this.noise(ctx, 0.07, 0.06);
        break;
      case "break":
        this.noise(ctx, 0.18, 0.12);
        this.blip(ctx, "triangle", 180, 90, 0.14, 0.05);
        break;
      case "pickup":
        this.blip(ctx, "square", 660, 1320, 0.12, 0.05);
        break;
      case "moss":
        this.blip(ctx, "sine", 520, 1560, 0.28, 0.06);
        break;
      case "hurt":
        this.blip(ctx, "sawtooth", 320, 70, 0.25, 0.08);
        break;
      case "jump":
        this.blip(ctx, "square", 420, 700, 0.09, 0.035);
        break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) => {
          setTimeout(() => {
            const c = this.ensure();
            if (c) this.blip(c, "triangle", f, f * 1.01, 0.3, 0.07);
          }, i * 130);
        });
        break;
      case "lose":
        [392, 330, 262, 196].forEach((f, i) => {
          setTimeout(() => {
            const c = this.ensure();
            if (c) this.blip(c, "sawtooth", f, f * 0.98, 0.32, 0.06);
          }, i * 160);
        });
        break;
    }
  }
}
