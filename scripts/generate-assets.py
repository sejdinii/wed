"""Generate placeholder brand assets: a gold 'kapar coin' mark on deep green.

Run from the repo root:  python3 scripts/generate-assets.py

Pure-Python PNG writer (no dependencies). These are intentional placeholders —
replace with final brand assets before store submission. Colors mirror
src/design/tokens.ts (brand.green700 / gold500 / gold600).
"""
import struct, zlib, os

GREEN = (30, 77, 54)      # #1E4D36 primary
GOLD = (198, 161, 91)     # #C6A15B accent
GOLD_DEEP = (168, 127, 47)


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: str, size: int, pixel_fn):
    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filter: none
        for x in range(size):
            r, g, b, a = pixel_fn(x, y, size)
            rows += bytes((r, g, b, a))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr)
           + png_chunk(b"IDAT", zlib.compress(bytes(rows), 9))
           + png_chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({len(png)} bytes)")


def coin(x, y, size, bg):
    """Gold coin with a darker gold inner ring, anti-aliased edges."""
    cx = cy = size / 2
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    outer = size * 0.30
    ring_out = size * 0.20
    ring_in = size * 0.165
    aa = size * 0.004

    def mix(c1, c2, t):
        return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))

    def smooth(edge, dist):
        t = (edge - dist) / aa
        return max(0.0, min(1.0, t))

    t_outer = smooth(outer, d)
    col = mix(bg[:3], GOLD, t_outer)
    alpha = bg[3]
    if bg[3] == 0:
        alpha = round(255 * t_outer)
    t_ring = smooth(ring_out, d) * (1 - smooth(ring_in, d))
    col = mix(col, GOLD_DEEP, t_ring)
    return (*col, alpha)


os.makedirs("assets", exist_ok=True)
write_png("assets/icon.png", 1024, lambda x, y, s: coin(x, y, s, (*GREEN, 255)))
write_png("assets/adaptive-icon.png", 1024, lambda x, y, s: coin(x, y, s, (0, 0, 0, 0)))
write_png("assets/splash-icon.png", 512, lambda x, y, s: coin(x, y, s, (0, 0, 0, 0)))
