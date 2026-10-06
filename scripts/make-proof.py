"""Crop the three proof panels out of a full-page CDP screenshot and stack them.

  python3 make-proof.py <raw.png> <out.png> [scale]

Band geometry comes from table-scroll-proof-panels.js (which prints each panel's
rect); edit BANDS if the viewport height changes. No absolute paths.
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
scale = int(sys.argv[3]) if len(sys.argv) > 3 else 2
BANDS = [(225, 470), (465, 745), (750, 1035)]

im = Image.open(src).convert('RGB')
W, H = im.size
crops = [im.crop((0, y0, W, min(y1, H))) for y0, y1 in BANDS]
ch = sum(c.height for c in crops) + 8 * (len(crops) - 1)
canvas = Image.new('RGB', (W, ch), (12, 16, 22))
y = 0
for c in crops:
    canvas.paste(c, (0, y))
    y += c.height + 8
canvas = canvas.resize((W * scale, ch * scale), Image.LANCZOS)
canvas.save(out)
print('wrote', out, canvas.size)
