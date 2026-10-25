"""Extract reusable character / scene / room assets from the reference boards.

The boards are design references (1536x1024 collages). Each crop below is a
region of ONE phone screen on a board, cut out so the app can reuse the same
Alex and Luna imagery everywhere (stable identity assets), instead of using a
board as a background. Crops are upscaled with Lanczos + light unsharp mask.

Coordinates are (left, top, right, bottom) in original board pixels.
Run:  python3 tools/extract_assets.py
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "reference"
OUT = ROOT / "assets"

A = "board-a.jpeg"  # 20-screen board (first attachment)
B = "board-b.jpeg"  # 24-screen board with day-to-night scenes
C = "board-c.jpeg"  # 20-screen board with captions (cleanest)
D = "board-d.jpeg"  # 8-screen Alex board (largest, sharpest Alex imagery)

ASSETS = {
    # ---- Luna (identity) --------------------------------------------------
    "characters/luna-portrait.jpg": (C, (790, 492, 941, 742), 4),   # video call
    "characters/luna-home.jpg":     (C, (712, 58, 923, 224), 3),      # home hero
    "characters/luna-preview.jpg":  (C, (1393, 60, 1528, 238), 4),   # preview
    "characters/luna-couch.jpg":    (B, (398, 497, 570, 690), 3),    # apartment live
    "characters/luna-wide.jpg":     (C, (818, 876, 1054, 944), 3),   # study pip
    "characters/luna-face.jpg":     (C, (800, 500, 942, 660), 3),    # avatar source
    # ---- Alex (identity) --------------------------------------------------
    "characters/alex-home.jpg":     (B, (64, 54, 178, 158), 4),    # Alex home hero
    "characters/alex-study.jpg":    (C, (1022, 558, 1262, 680), 3),  # study together
    "characters/alex-welcome.jpg":  (C, (10, 40, 120, 190), 4),
    "characters/alex-face.jpg":     (B, (262, 470, 352, 570), 4),
    "characters/alex-desk.jpg":     (C, (272, 522, 520, 628), 3),    # at desk w/ laptop
    # ---- Welcome hero (both) ---------------------------------------------
    "characters/duo-welcome.jpg":   (C, (8, 20, 222, 190), 3),
    # ---- Day-to-night scenes (board B, scene 24) ---------------------------
    "scenes/luna-morning-coffee.jpg": (B, (1136, 798, 1207, 958), 4),
    "scenes/alex-studying.jpg":       (B, (1213, 798, 1284, 958), 4),
    "scenes/luna-working.jpg":        (B, (1290, 798, 1366, 958), 4),
    "scenes/luna-evening.jpg":        (B, (1371, 798, 1446, 958), 4),
    "scenes/alex-night.jpg":          (B, (1452, 798, 1527, 958), 4),
    # ---- Shared activity tiles (board C screen 14) -------------------------
    "activities/study.jpg":  (C, (1283, 503, 1400, 563), 4),
    "activities/coffee.jpg": (C, (1408, 503, 1524, 563), 4),
    "activities/movie.jpg":  (C, (1283, 597, 1400, 655), 4),
    "activities/cook.jpg":   (C, (1408, 597, 1524, 655), 4),
    "activities/read.jpg":   (C, (1283, 687, 1400, 752), 4),
    "activities/hangout.jpg": (C, (1408, 687, 1524, 752), 4),
    # ---- Rooms / home styles (board C screen 5 + 10) -----------------------
    "rooms/bedroom-hero.jpg": (C, (949, 92, 1153, 211), 3),
    "rooms/modern.jpg":    (C, (948, 221, 1012, 262), 4),
    "rooms/cozy.jpg":      (C, (1019, 221, 1083, 262), 4),
    "rooms/minimal.jpg":   (C, (1091, 221, 1153, 262), 4),
    "rooms/aesthetic.jpg": (C, (948, 288, 1012, 335), 4),
    "rooms/dark.jpg":      (C, (1019, 288, 1083, 335), 4),
    "rooms/luxe.jpg":      (C, (1091, 288, 1153, 335), 4),
    "rooms/living.jpg":    (C, (279, 677, 330, 734), 5),
    "rooms/bedroom.jpg":   (C, (338, 677, 390, 734), 5),
    "rooms/kitchen.jpg":   (C, (399, 677, 451, 734), 5),
    # ---- Chat photos / memories -------------------------------------------
    "scenes/alex-puppy.jpg":  (C, (545, 702, 738, 744), 3),
    "scenes/luna-cat.jpg":    (B, (588, 658, 748, 716), 3),
    "scenes/puppy.jpg":       (C, (380, 875, 441, 922), 5),
    # ---- Wallpapers (board C screen 17) ------------------------------------
    "wallpapers/nature.jpg": (C, (536, 924, 594, 966), 6),
    "wallpapers/coffee.jpg": (C, (601, 924, 661, 966), 6),
    # ---- Alex HD set from board D (supersedes small crops above) ------------
    "characters/alex-call.jpg":   (D, (432, 640, 658, 915), 3),
    "characters/alex-hero.jpg":   (D, (1205, 128, 1525, 255), 3),
    "characters/alex-portrait.jpg": (D, (812, 148, 1030, 288), 3),
    "characters/alex-select.jpg": (D, (415, 176, 585, 325), 3),
    "characters/luna-select.jpg": (D, (600, 176, 763, 325), 3),
    "characters/duo-hd.jpg":      (D, (12, 82, 375, 300), 3),
    "scenes/alex-desk-hd.jpg":    (D, (792, 676, 1125, 838), 3),
    "scenes/alex-dog.jpg":        (D, (35, 877, 298, 940), 3),
    "activities/alex-study.jpg":  (D, (1162, 645, 1333, 738), 3),
    "activities/alex-coffee.jpg": (D, (1343, 645, 1513, 738), 3),
    "activities/alex-movie.jpg":  (D, (1162, 770, 1333, 855), 3),
    "activities/alex-cook.jpg":   (D, (1343, 770, 1513, 855), 3),
    "activities/alex-read.jpg":   (D, (1162, 888, 1333, 975), 3),
    "activities/alex-hangout.jpg": (D, (1343, 888, 1513, 975), 3),
}

# Gallery tiles: board C screens 2 + 3. Names follow board A (no Indian names).
MALE = ["alex", "noah", "ethan", "ryan", "leo", "kai"]
FEMALE = ["luna", "ava", "ivy", "maya", "zoe", "ella"]
COLS_M = [(240, 306), (313, 378), (385, 450)]
COLS_F = [(475, 541), (548, 614), (622, 689)]
ROWS = [(95, 172), (201, 278)]
for i, n in enumerate(MALE):
    x0, x1 = COLS_M[i % 3]; y0, y1 = ROWS[i // 3]
    ASSETS[f"gallery/{n}.jpg"] = (C, (x0 + 3, y0 + 3, x1 - 3, y1), 4)
for i, n in enumerate(FEMALE):
    x0, x1 = COLS_F[i % 3]; y0, y1 = ROWS[i // 3]
    ASSETS[f"gallery/{n}.jpg"] = (C, (x0 + 3, y0 + 3, x1 - 3, y1), 4)


def main():
    boards = {k: Image.open(REF / k).convert("RGB") for k in (A, B, C, D)}
    for rel, (board, box, scale) in ASSETS.items():
        im = boards[board].crop(box)
        im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
        im = ImageEnhance.Contrast(im).enhance(1.03)
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, quality=86, optimize=True, progressive=True)
    print(f"wrote {len(ASSETS)} assets")


if __name__ == "__main__":
    main()
