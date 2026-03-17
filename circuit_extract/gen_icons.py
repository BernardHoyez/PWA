#!/usr/bin/env python3
"""Génère les icônes PWA (192×192 et 512×512) pour Circuit IGN."""

try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess, sys
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'Pillow', '--break-system-packages', '-q'])
    from PIL import Image, ImageDraw

import os

def make_icon(size, path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)

    # Fond cercle vert forêt
    margin = size // 12
    d.ellipse([margin, margin, size-margin, size-margin], fill=(26, 46, 26, 255))

    # Globe simplifié (cercle clair)
    c = size // 2
    r = int(size * 0.35)
    d.ellipse([c-r, c-r, c+r, c+r], outline=(126, 200, 150, 200), width=max(1, size//48))

    # Tracé de randonnée stylisé
    lw = max(2, size // 32)
    pts_trail = [
        (int(size*0.28), int(size*0.68)),
        (int(size*0.38), int(size*0.42)),
        (int(size*0.50), int(size*0.52)),
        (int(size*0.62), int(size*0.32)),
        (int(size*0.72), int(size*0.38)),
    ]
    for i in range(len(pts_trail)-1):
        d.line([pts_trail[i], pts_trail[i+1]], fill=(232, 240, 233, 230), width=lw)

    # Point départ (vert)
    pr = max(3, size // 28)
    d.ellipse([pts_trail[0][0]-pr, pts_trail[0][1]-pr, pts_trail[0][0]+pr, pts_trail[0][1]+pr],
              fill=(126, 200, 150, 255))
    # Point arrivée (rouge)
    d.ellipse([pts_trail[-1][0]-pr, pts_trail[-1][1]-pr, pts_trail[-1][0]+pr, pts_trail[-1][1]+pr],
              fill=(224, 92, 75, 255))

    img.save(path, 'PNG')
    print(f'  ✓ {path}  ({size}×{size})')

os.makedirs('icons', exist_ok=True)
make_icon(192, 'icons/icon-192.png')
make_icon(512, 'icons/icon-512.png')
print('Icônes générées.')
