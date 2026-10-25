"""Per-screen QA: render one screen in a phone emulator (390x844 @2x) and
place it next to its reference region from the boards.

  python3 tools/screenshot.py welcome            # onboarding screens
  python3 tools/screenshot.py home --demo luna   # seeded companion
Outputs qa/<name>.png (app) and qa/<name>-compare.png (reference | app).
"""
import argparse, subprocess, sys, time, socket
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / "qa"; QA.mkdir(exist_ok=True)
C, B, A = "board-c.jpeg", "board-b.jpeg", "board-a.jpeg"
REF = {  # screen -> (board, box) in board pixels
    "welcome": (C, (3, 5, 229, 406)),
    "gallery-male": (C, (233, 5, 459, 406)),
    "gallery": (C, (465, 5, 693, 406)),
    "gender": (B, (190, 25, 342, 370)),
    "preview": (B, (520, 25, 684, 370)),
    "appearance": (C, (700, 5, 926, 406)),
    "outfits": (B, (858, 25, 1010, 370)),
    "homestyle": (C, (932, 5, 1160, 406)),
    "personality": (C, (1166, 5, 1386, 406)),
    "voice": (B, (1170, 25, 1296, 370)),
    "final": (C, (1391, 5, 1536, 406)),
    "home": (C, (3, 446, 263, 800)),
    "home-alex": (B, (192, 424, 386, 770)),
    "apartment": (C, (265, 446, 523, 800)),
    "chat": (C, (527, 446, 778, 800)),
    "call": (C, (782, 446, 1013, 800)),
    "study": (C, (1017, 446, 1266, 800)),
    "activities": (C, (1271, 446, 1529, 800)),
    "timeline": (C, (2, 828, 224, 1000)),
    "memories": (C, (228, 828, 521, 1000)),
    "wallpaper": (C, (525, 828, 777, 1000)),
    "customize": (C, (806, 828, 1062, 1000)),
    "goals": (C, (1064, 828, 1306, 1000)),
    "settings": (C, (1309, 828, 1536, 1000)),
    "voicenotes": (A, (1368, 430, 1536, 790)),
    "scenes": (B, (1130, 790, 1536, 1010)),
}

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

def bezel(shot: Image.Image) -> Image.Image:
    pad = 18
    W, H = shot.width + pad * 2, shot.height + pad * 2
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=110, fill=(16, 13, 28), outline=(90, 72, 150), width=4)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, shot.width - 1, shot.height - 1), radius=92, fill=255)
    out.paste(shot, (pad, pad), mask)
    return out

def compare(name, app_png, ref_key):
    app = bezel(Image.open(app_png).convert("RGB"))
    H = app.height
    board, box = REF[ref_key]
    ref = Image.open(ROOT / "reference" / board).convert("RGB").crop(box)
    ref = ref.resize((int(ref.width * H / ref.height), H), Image.LANCZOS)
    gap, top = 40, 70
    W = ref.width + app.width + gap * 3
    out = Image.new("RGB", (W, H + top + 30), (242, 240, 248))
    out.paste(ref, (gap, top))
    out.paste(app, (gap * 2 + ref.width, top), app)
    d = ImageDraw.Draw(out)
    try:
        f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 34)
    except Exception:
        f = ImageFont.load_default()
    d.text((gap, 18), "REFERENCE", fill=(60, 50, 90), font=f)
    d.text((gap * 2 + ref.width, 18), f"APP · {name}", fill=(60, 50, 90), font=f)
    dest = QA / f"{name}-compare.png"
    out.save(dest)
    return dest

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("screens", nargs="+")
    ap.add_argument("--demo", default=None)
    ap.add_argument("--ref", default=None, help="reference key override")
    ap.add_argument("--setup", default="", help="JS to run before the shot")
    ap.add_argument("--t", default=None, help="simulated time HH:MM")
    ap.add_argument("--wait", type=int, default=900)
    a = ap.parse_args()
    port = free_port()
    srv = subprocess.Popen([sys.executable, str(ROOT / "tools" / "serve.py"), str(port)])
    time.sleep(0.8)
    try:
        with sync_playwright() as p:
            br = p.chromium.launch()
            for spec in a.screens:
                name, _, route = spec.partition("=")
                route = route or name
                pg = br.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
                errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.on("console", lambda m: m.type == "error" and "TUNNEL" not in m.text and errs.append(m.text))
                q = "&".join(x for x in [f"demo={a.demo}" if a.demo else "", f"t={a.t}" if a.t else ""] if x)
                q = "?" + q if q else ""
                pg.goto(f"http://127.0.0.1:{port}/{q}#{route}")
                pg.wait_for_timeout(a.wait)
                if a.setup:
                    pg.evaluate(a.setup); pg.wait_for_timeout(600)
                out = QA / f"{name}.png"
                pg.screenshot(path=str(out))
                ref_key = a.ref or (name if name in REF else route)
                cmp = compare(name, out, ref_key) if ref_key in REF else None
                print(name, "->", out.name, "|", cmp.name if cmp else "(no reference)", "| errors:", errs or "none")
                pg.close()
            br.close()
    finally:
        srv.terminate()

if __name__ == "__main__":
    main()
