# 오디오 믹스: 음성(TTS) + 직접 합성한 음악·환경음·효과음 → 트랙별 WAV + 최종 믹스
import wave, numpy as np
from timeline import DURATION, VOICES

SR = 48000
N = int(DURATION * SR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR


def read_wav(path):
    w = wave.open(path); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
    return np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)


def write_wav(path, x):
    x = np.atleast_2d(x)
    if x.shape[0] == 1: x = np.vstack([x, x])
    s = (np.clip(x.T, -1, 1) * 32767).astype("<i2")
    w = wave.open(path, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(s.tobytes()); w.close()


def band(x, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / SR); X = np.fft.rfft(x)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def env(n, a, r):
    e = np.ones(n); ka, kr = int(a * SR), int(r * SR)
    e[:ka] = np.linspace(0, 1, ka); e[n - kr:] = np.minimum(e[n - kr:], np.linspace(1, 0, kr))
    return e


def place(track, clip, t):
    i = int(t * SR); j = min(N, i + len(clip)); track[i:j] += clip[:j - i]


# --- 음성 ---
voice = np.zeros(N)
voice_mask = np.zeros(N)
for key, t, who in VOICES:
    x = read_wav(f"audio/raw_{key}.wav")
    x = x / (np.abs(x).max() + 1e-9) * 0.7
    if who == "box":  # 같은 목소리, 상자 안에서 들리는 먹먹한 처리
        x = band(np.concatenate([x, np.zeros(int(0.15 * SR))]), 120, 1300)
        d = int(0.011 * SR); x[d:] += 0.45 * x[:-d]          # 좁은 공간 울림
        d = int(0.023 * SR); x[d:] += 0.25 * x[:-d]
        x = x / np.abs(x).max() * 0.62
    write_wav(f"audio/voice_{key}.wav", x)
    place(voice, x, t)
    place(voice_mask, np.ones(len(x)), t)

# --- 음악 (직접 합성한 부드러운 패드) ---
def pad(freqs, dur, amp):
    t = np.arange(int(dur * SR)) / SR
    y = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in freqs)
    return y / len(freqs) * amp * env(len(t), 0.8, 0.8)

music = np.zeros(N)
chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]]  # Am F G E
for k in range(4):
    place(music, pad(chords[k], 2.6, 0.10), k * 2.2)
# 오르골 같은 작은 음 (호기심)
for k, f in enumerate([659.3, 523.3, 587.3, 493.9, 659.3, 440.0]):
    tt = np.arange(int(0.9 * SR)) / SR
    place(music, 0.05 * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 5), 0.6 + k * 1.3)
music *= np.clip((9.8 - t_all) / 1.0, 0, 1)            # 8.8~9.8초 잦아들고 정적
# 긴장 드론 (14초~29초): 낮은 A + 살짝 어긋난 음
dr = pad([110, 116.5], 15.0, 0.07) * env(int(15.0 * SR), 2.5, 1.0)
place(music, dr, 14.2)
# 마지막 질문 모티프 (29초~): 해결되지 않는 음
for k, f in enumerate([440, 523.3, 659.3, 587.3, 440, 523.3, 698.5, 659.3]):
    tt = np.arange(int(1.2 * SR)) / SR
    place(music, 0.045 * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3), 29.3 + k * 0.7)
place(music, pad([220, 277.2, 329.6], 5.6, 0.06), 29.2)
# 음성 구간 덕킹 (-8dB)
duck = 1 - 0.6 * np.convolve(voice_mask, np.ones(int(0.15 * SR)) / int(0.15 * SR), "same").clip(0, 1)
music *= duck

# --- 환경음: 바람 + 새소리(초반), 해가 지면 줄어듦 ---
amb = band(rng.standard_normal(N), 80, 600) * 0.03
amb *= np.interp(t_all, [0, 8.5, 9.5, 23, 35], [1, 1, 0.55, 0.45, 0.4])
for t0 in [0.9, 2.4, 5.1, 7.0]:
    tt = np.arange(int(0.12 * SR)) / SR
    chirp = np.sin(2 * np.pi * (3200 + 2500 * tt / 0.12) * tt) * np.hanning(len(tt)) * 0.03
    place(amb, chirp, t0); place(amb, chirp, t0 + 0.16)

# --- 효과음 ---
sfx = np.zeros(N)
def knock():
    tt = np.arange(int(0.18 * SR)) / SR
    y = np.sin(2 * np.pi * 170 * tt) * np.exp(-tt * 38) + band(rng.standard_normal(len(tt)), 300, 1500) * np.exp(-tt * 70) * 0.5
    return y * 0.55
place(sfx, knock(), 6.30); place(sfx, knock() * 0.85, 6.62)
# 상자 끌리는 소리 (8.7초)
n = int(0.35 * SR); place(sfx, band(rng.standard_normal(n), 150, 900) * env(n, 0.03, 0.2) * 0.25, 8.7)
# 컷 전환 휙 (1.35초)
n = int(0.4 * SR); place(sfx, band(rng.standard_normal(n), 600, 4000) * np.hanning(n) * 0.05, 1.25)
# 상자 빛 웅웅거림 (23.4초~)
tt = np.arange(int(11.6 * SR)) / SR
hum = (np.sin(2 * np.pi * 220 * tt) + 0.4 * np.sin(2 * np.pi * 440 * tt + 0.3) + 0.2 * np.sin(2 * np.pi * 663 * tt))
hum *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt)) * env(len(tt), 2.0, 0.6) * 0.022
place(sfx, hum, 23.4)

fade = np.clip((DURATION - t_all) / 0.6, 0, 1)          # 마지막 0.6초 소리만 페이드 (영상은 유지)
tracks = dict(voice=voice, music=music * fade, ambience=amb * fade, sfx=sfx * fade)
for k, x in tracks.items():
    write_wav(f"audio/track_{k}.wav", x)
mix = voice * 1.0 + tracks["music"] + tracks["ambience"] + tracks["sfx"]
mix = mix / np.abs(mix).max() * 0.89
write_wav("audio/mix.wav", mix)
print("voice peak", round(np.abs(voice).max(), 3), "music peak", round(np.abs(music).max(), 3))
