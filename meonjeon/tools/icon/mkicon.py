# -*- coding: utf-8 -*-
"""손주한통 아이콘 — 손 한 글자와 소리 두 줄.

  이름의 첫 글자를 그대로 씁니다. 폰 홈 화면에서 다른 앱들과 섞여도
  글자 하나는 40픽셀에서도 읽힙니다 — 수화기 그림은 안 읽혔습니다.
  오른쪽 위 금색 두 줄이 "전화가 나갑니다" 입니다.

  글자는 Noto Serif KR 700 의 '손' 을 윤곽선으로 떠서 넣었습니다
  (son_raw.txt). 폰트를 앱이 안 불러도 아이콘은 그대로 나옵니다.
"""
import math, cairosvg

NAVY_T, NAVY_B = "#24557E", "#153A5C"
CREAM, GOLD    = "#F7F2E6", "#EBB44E"
SON   = open("son_raw.txt").read()
SON_CX, SON_CY, SON_H = 485.5, 370.5, 903      # 글리프의 가운데와 높이

def arc(cx, cy, r, a1, a2):
    x1, y1 = cx + r*math.cos(math.radians(a1)), cy + r*math.sin(math.radians(a1))
    x2, y2 = cx + r*math.cos(math.radians(a2)), cy + r*math.sin(math.radians(a2))
    return f"M {x1:.1f},{y1:.1f} A {r},{r} 0 0 1 {x2:.1f},{y2:.1f}"

def art(k=1.0):
    """512 판 한가운데에 놓이는 그림. k 로 크기만 줄입니다(마스커블용)."""
    s = 262 * k / SON_H
    ax, ay, r1, r2 = 256 + 66*k, 256 - 106*k, 48*k, 86*k
    return (
      f'<g transform="translate({256 - 30*k} {256 + 18*k}) scale({s:.5f} {-s:.5f}) '
      f'translate({-SON_CX} {-SON_CY})"><path d="{SON}" fill="{CREAM}"/></g>'
      f'<g fill="none" stroke="{GOLD}" stroke-linecap="round" transform="translate({ax} {ay})">'
      f'<path d="{arc(0,0,r1,-70,20)}" stroke-width="{18*k:.1f}"/>'
      f'<path d="{arc(0,0,r2,-62,12)}" stroke-width="{16*k:.1f}" opacity=".78"/></g>'
    )

def svg(k, radius):
    return (
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
      f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
      f'<stop offset="0" stop-color="{NAVY_T}"/><stop offset="1" stop-color="{NAVY_B}"/>'
      f'</linearGradient></defs>'
      f'<rect width="512" height="512" rx="{radius}" fill="url(#g)"/>{art(k)}</svg>'
    )

#  이름                     크기줄임  모서리  픽셀
JOBS = [
    ("icon-512.png",           1.00,   115,  512),   # 안드로이드 any
    ("icon-192.png",           1.00,   115,  192),
    ("icon-512-maskable.png",  0.66,     0,  512),   # 가장자리가 잘려도 되게
    ("apple-touch-icon.png",   1.00,     0,  180),   # iOS 가 알아서 둥글립니다
]
if __name__ == "__main__":
    for name, k, rad, px in JOBS:
        cairosvg.svg2png(bytestring=svg(k, rad).encode(), write_to=name,
                         output_width=px, output_height=px)
        print(name, px)
