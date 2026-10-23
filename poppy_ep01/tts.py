# Korean TTS for each line (sherpa-onnx + mimic3 ko_KO-kss_low, offline)
import sherpa_onnx, wave, numpy as np, sys
d = "/tmp/claude-0/tts/vits-mimic3-ko_KO-kss_low/"
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=d+"ko_KO-kss_low.onnx", tokens=d+"tokens.txt", data_dir=d+"espeak-ng-data"),
    num_threads=4)))
LINES = {
    "n1": ("산책길에, 내 이름이 적힌 택배가 있었다.", 0.95),
    "p1": ("내가... 뭘 시켰나?", 0.9),
    "b1": ("열지 마.", 0.8),
    "p2": ("누구야?", 0.9),
    "b2": ("나야. 뽀삐.", 0.8),
    "b3": ("내가 나가면... 네가 들어와야 해.", 0.85),
    "p3": ("잠깐... 그럼 지금 밖에 있는 나는 누구지?", 0.95),
    "n2": ("열어볼까? 도망갈까? 더 좋은 방법이 있다면 댓글로 알려줘.", 1.0),
}
for k, (text, speed) in LINES.items():
    a = tts.generate(text, sid=0, speed=speed)
    s = (np.clip(np.array(a.samples), -1, 1) * 32767).astype("<i2")
    w = wave.open(f"audio/raw_{k}.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate); w.writeframes(s.tobytes()); w.close()
    print(k, round(len(s) / a.sample_rate, 2))
