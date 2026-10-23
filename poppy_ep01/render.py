# 움직이는 스토리보드 렌더러: 장면 이미지 + 줌/이동 + 색보정 + 상자 빛 + 이름표/자막 → MP4
# 사용: python3 render.py [이미지폴더] [출력파일]
import sys, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from timeline import DURATION, FPS, W, H, LABELS, SEAMS, SHOTS, SUBS

IMG_DIR = sys.argv[1] if len(sys.argv) > 1 else "images"
OUT = sys.argv[2] if len(sys.argv) > 2 else "out/poppy_ep01.mp4"
FONT = "/usr/share/fonts/truetype/nanum/"
SCALE = 1.7  # 줌 여유분: 기준 캔버스 = 출력 해상도 × SCALE


def font(name, size): return ImageFont.truetype(FONT + name, size)


def load_base(name):
    im = Image.open(f"{IMG_DIR}/{name}.png").convert("RGB")
    bw, bh = int(W * SCALE), int(H * SCALE)
    s = max(bw / im.width, bh / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - bw) // 2, (im.height - bh) // 2
    im = im.crop((l, t, l + bw, t + bh))
    if name in LABELS:  # 이름표 글자는 편집 단계에서 합성
        x0, y0, x1, y1 = [v * d for v, d in zip(LABELS[name], (bw, bh, bw, bh))]
        txt = "받는 이: 뽀삐"
        size = int((y1 - y0) * 0.62)
        f = font("NanumBarunpenB.ttf", size)
        while f.getlength(txt) > (x1 - x0) * 0.86: size -= 2; f = font("NanumBarunpenB.ttf", size)
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(((x0 + x1) / 2, (y0 + y1) / 2), txt, font=f, fill=(35, 30, 32, 225), anchor="mm")
        im = Image.alpha_composite(im.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(0.6))).convert("RGB")
    return im


def grade(im, dusk):
    a = np.asarray(im).astype(np.float32) / 255
    a = a * (1 - 0.5 * dusk)
    a[..., 0] *= 1 - 0.12 * dusk; a[..., 2] = a[..., 2] * (1 + 0.25 * dusk) + 0.03 * dusk
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]; r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    a *= (1 - (0.25 + 0.35 * dusk) * np.clip(r - 0.5, 0, 1) ** 1.5)[..., None]
    return np.clip(a, 0, 1)


def glow_map(name, size):
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    for (ax, ay), (bx, by) in SEAMS[name]:
        d.line([(ax * size[0], ay * size[1]), (bx * size[0], by * size[1])], fill=255, width=max(3, size[0] // 300))
    core = np.asarray(m.filter(ImageFilter.GaussianBlur(size[0] / 400)), np.float32) / 255
    halo = np.asarray(m.filter(ImageFilter.GaussianBlur(size[0] / 40)), np.float32) / 255
    g = np.clip(core * 1.2 + halo * 3.0, 0, 1.4)
    return g[..., None] * np.array([1.0, 0.86, 0.6], np.float32)


STYLE = {  # 폰트, 크기, 글자색, 테두리, 기준 y(중앙)
    "main":      ("NanumSquareRoundEB.ttf", 62, (255, 255, 255), (20, 20, 24), 430),
    "main_low":  ("NanumSquareRoundEB.ttf", 60, (255, 255, 255), (20, 20, 24), 1180),
    "box":       ("NanumSquareRoundEB.ttf", 62, (214, 196, 255), (26, 14, 44), 430),
    "sfx":       ("NanumSquareRoundB.ttf", 46, (225, 225, 225), (20, 20, 24), 430),
    "cta":       ("NanumSquareRoundEB.ttf", 74, (255, 236, 160), (40, 22, 8), 250),
    "cta2":      ("NanumSquareRoundEB.ttf", 64, (255, 255, 255), (20, 20, 24), 345),
    "cta_small": ("NanumSquareRoundB.ttf", 40, (235, 235, 235), (20, 20, 24), 425),
}


def text_layer(text, style):
    fname, size, fill, stroke, cy = STYLE[style]
    f = font(fname, size)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    lines = text.split("\n"); lh = int(size * 1.3)
    y = cy - lh * (len(lines) - 1) / 2
    cx = W / 2 - 20  # 오른쪽 버튼 영역을 피해 약간 왼쪽
    if style == "box":
        d.text((cx, y - lh * 0.85), "상자 속 목소리", font=font("NanumSquareRoundB.ttf", 34), fill=(200, 180, 255), anchor="mm", stroke_width=4, stroke_fill=stroke)
    for i, ln in enumerate(lines):
        assert f.getlength(ln) < 860, f"자막이 너무 깁니다: {ln}"
        d.text((cx, y + i * lh), ln, font=f, fill=fill, anchor="mm", stroke_width=max(4, size // 9), stroke_fill=stroke)
    return np.asarray(img, np.float32) / 255


def ease(x): return x * x * (3 - 2 * x)


def main():
    bases, cache = {}, {}
    for s in SHOTS:
        key = (s["src"], s["dusk"])
        if s["src"] not in bases: bases[s["src"]] = load_base(s["src"])
        if key not in cache:
            g = grade(bases[s["src"]], s["dusk"])
            cache[key] = (g, glow_map(s["src"], bases[s["src"]].size) if "glow" in s else None)
    subs = [(a, b, text_layer(t, st)) for a, b, t, st in SUBS]

    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-i", "audio/mix.wav", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT], stdin=subprocess.PIPE)
    nframes = int(DURATION * FPS)
    for fi in range(nframes):
        t = fi / FPS
        s = next(x for x in SHOTS if x["t0"] <= t < x["t1"])
        p = ease((t - s["t0"]) / (s["t1"] - s["t0"]))
        g, gl = cache[(s["src"], s["dusk"])]
        img = g
        if gl is not None:
            k = np.clip((t - s["glow"]) / 1.5, 0, 1) * (0.85 + 0.15 * np.sin(t * 2 * np.pi * 0.7))
            img = np.clip(g + gl * 1.1 * k, 0, 1)
        bh, bw = img.shape[:2]
        z = s["z"][0] + (s["z"][1] - s["z"][0]) * p
        cx = s["c"][0][0] + (s["c"][1][0] - s["c"][0][0]) * p
        cy = s["c"][0][1] + (s["c"][1][1] - s["c"][0][1]) * p
        cw = bw / z; ch = cw * H / W  # z=1이면 전체 이미지
        if "shake" in s and 0 <= t - s["shake"] < 0.3:
            cx += 0.004 * np.sin((t - s["shake"]) * 90) * (1 - (t - s["shake"]) / 0.3)
        x0 = np.clip(cx * bw - cw / 2, 0, bw - cw); y0 = np.clip(cy * bh - ch / 2, 0, bh - ch)
        frame = Image.fromarray((img * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))
        f = np.asarray(frame, np.float32) / 255
        for a, b, lay in subs:
            if a <= t < b:
                alpha = lay[..., 3:] * min(1, (t - a) / 0.12)
                f = f * (1 - alpha) + lay[..., :3] * alpha
        ff.stdin.write((f * 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print("done", OUT)


if __name__ == "__main__":
    main()
