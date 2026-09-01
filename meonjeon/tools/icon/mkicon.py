# -*- coding: utf-8 -*-
"""손주한통 아이콘 — 수화기를 든 아이.

  그림은 최연아 님이 주신 GrandchildCallIcon 그대로입니다.
  색만 연보라(바탕) · 민트(수화기) · 레몬(소리)으로 맞췄습니다.

  뽑기:  pip install cairosvg  &&  python3 mkicon.py  &&  mv *.png ../../
"""
import cairosvg

LILAC1, LILAC2 = "#D5C3F2", "#F1E7FC"   # 바탕
MINT1,  MINT2  = "#249C7C", "#7FE3C2"   # 수화기
SKIN, HAIR     = "#FBE3BD", "#5B4394"   # 얼굴 · 머리(진보라)
EYE,  CHEEK    = "#3A2A5C", "#E8CE3E"   # 눈·입 · 볼(레몬)
RING           = "#E8CE3E"              # 소리(레몬)

ART = f'''
  <circle cx="256" cy="256" r="180" fill="white" fill-opacity="0.2"/>
  <path d="M180 120C160 120 140 140 140 160V220C140 300 210 370 290 370H350C370 370 390 350 390 330V290C390 275 378 263 363 263L315 263C300 263 288 275 288 290V300C240 290 220 270 210 220H222C237 220 249 208 249 193V145C249 130 237 118 222 118L180 120Z" fill="url(#ph)"/>
  <circle cx="290" cy="180" r="45" fill="{SKIN}"/>
  <path d="M250 175C250 145 270 130 290 130C310 130 330 145 330 175C320 165 305 165 290 170C275 165 260 165 250 175Z" fill="{HAIR}"/>
  <circle cx="275" cy="180" r="5" fill="{EYE}"/>
  <circle cx="305" cy="180" r="5" fill="{EYE}"/>
  <circle cx="268" cy="190" r="6" fill="{CHEEK}" opacity="0.6"/>
  <circle cx="312" cy="190" r="6" fill="{CHEEK}" opacity="0.6"/>
  <path d="M283 193Q290 202 297 193" stroke="{EYE}" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M370 140C390 160 400 185 400 210" stroke="{RING}" stroke-width="12" stroke-linecap="round" fill="none"/>'''

def svg(k, radius):
    """k 는 그림 크기. 마스커블은 가장자리가 잘리니 작게 넣습니다.
       그림의 한가운데가 (270,244) 라 거기를 기준으로 줄입니다."""
    inner = (ART if k == 1 else
             f'<g transform="translate(256 256) scale({k}) translate(-270 -244)">{ART}</g>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512">
      <stop offset="0" stop-color="{LILAC1}"/><stop offset="1" stop-color="{LILAC2}"/>
    </linearGradient>
    <linearGradient id="ph" x1="150" y1="150" x2="360" y2="360">
      <stop offset="0" stop-color="{MINT1}"/><stop offset="1" stop-color="{MINT2}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="{radius}" fill="url(#bg)"/>{inner}</svg>'''

#  이름                     그림크기  모서리  픽셀
JOBS = [("icon-512.png", 1, 115, 512), ("icon-192.png", 1, 115, 192),
        ("icon-512-maskable.png", 0.7, 0, 512), ("apple-touch-icon.png", 1, 0, 180)]

if __name__ == "__main__":
    for name, k, rad, px in JOBS:
        cairosvg.svg2png(bytestring=svg(k, rad).encode(), write_to=name,
                         output_width=px, output_height=px)
        print(name, px)
