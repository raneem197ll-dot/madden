"""Build-time: capture snapshots of each in-game landmark model (3 views) into src/assets/renders."""
import io, sys
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173/'
OUT = 'src/assets/renders'
IDS = ['quba', 'hejaz', 'qiblatain', 'uhud']
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    for lid in IDS:
        for view in range(3):
            page = b.new_page(viewport={'width': 720, 'height': 480}, device_scale_factor=1)
            page.goto(f'{BASE}#shot-{lid}-{view}')
            page.wait_for_timeout(5500)
            png = page.screenshot()
            img = Image.open(io.BytesIO(png)).convert('RGB')
            img.save(f'{OUT}/{lid}-{view}.webp', 'WEBP', quality=74, method=6)
            print('saved', lid, view)
            page.close()
    b.close()
