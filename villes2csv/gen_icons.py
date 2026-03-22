#!/usr/bin/env python3
"""Generate placeholder icons for villes2csv PWA."""
import struct, zlib, math

def png_chunk(chunk_type, data):
    c = chunk_type + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def create_png(size, text, bg=(26,46,74), fg=(80,227,194)):
    w, h = size, size
    # Create raw pixel data
    img = []
    cx, cy = w//2, h//2
    r = int(w * 0.38)
    font_scale = w // 32
    
    for y in range(h):
        row = []
        for x in range(w):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            # Background gradient-ish
            if dist < r:
                # Slightly lighter inner circle
                factor = 1 - (dist/r) * 0.25
                pix = tuple(min(255, int(c * factor)) for c in (36,70,120))
            else:
                pix = bg
            row.append(pix)
        img.append(row)
    
    # Draw simple "V2" text-like marks using block pixels
    # Letter V
    vw = max(2, w//16)
    for i in range(w//8):
        x1 = cx - w//8 + i//2
        x2 = cx + i//2
        y_pos = cy - w//10 + i
        for dx in range(vw):
            for sign in [-1, 1]:
                px = cx + sign * (i * w//32 // 2) - vw//2 + dx
                py = cy - w//8 + i * w//16 // (w//16)
                if 0 <= px < w and 0 <= py < h:
                    img[py][px] = fg

    # Build PNG
    raw = b''
    for row in img:
        raw += b'\x00'  # filter byte
        for pix in row:
            raw += bytes(pix)
    
    compressed = zlib.compress(raw, 6)
    
    chunks  = b'\x89PNG\r\n\x1a\n'
    chunks += png_chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    chunks += png_chunk(b'IDAT', compressed)
    chunks += png_chunk(b'IEND', b'')
    return chunks

import os
os.makedirs('icons', exist_ok=True)

for size in [192, 512]:
    data = create_png(size, 'V2')
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(data)
    print(f'Created icons/icon{size}.png ({size}x{size})')

print('Done.')
