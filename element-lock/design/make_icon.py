#!/usr/bin/env python3
"""Draws the 1024px app icon: an element tile ("El", mint) on navy with a small gold mastery star.
Usage: python3 make_icon.py out.png"""
import sys
from PIL import Image, ImageDraw, ImageFont

NAVY, RAISED, MINT, GOLD = (11, 23, 48), (20, 38, 71), (62, 230, 193), (212, 176, 92)
S = 1024
img = Image.new("RGB", (S, S), NAVY)
d = ImageDraw.Draw(img)
d.rounded_rectangle((212, 212, 812, 812), radius=96, fill=MINT)
bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 300)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
d.text((S / 2, 560), "El", font=bold, fill=NAVY, anchor="mm")
d.text((270, 260), "1", font=small, fill=NAVY, anchor="la")
# gold star (mastery) top-right of the tile
import math
cx, cy, r1, r2 = 730, 300, 52, 22
pts = [(cx + (r1 if i % 2 == 0 else r2) * math.sin(i * math.pi / 5), cy - (r1 if i % 2 == 0 else r2) * math.cos(i * math.pi / 5)) for i in range(10)]
d.polygon(pts, fill=GOLD)
img.save(sys.argv[1])
