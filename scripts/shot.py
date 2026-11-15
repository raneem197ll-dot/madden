"""Playwright helper: open the game at phone size, run optional JS steps, capture screenshots + console errors."""
import sys, json, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173/'
STEPS = json.loads(sys.argv[2]) if len(sys.argv) > 2 else []
W, H = (int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '390x844').split('x'))

ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, has_touch=True, is_mobile=W < 700)
    page = ctx.new_page()
    logs = []
    page.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    page.goto(URL)
    page.wait_for_timeout(2500)
    for st in STEPS:
        kind = st[0]
        if kind == 'wait': page.wait_for_timeout(st[1])
        elif kind == 'js': page.evaluate(st[1])
        elif kind == 'click': page.click(st[1], timeout=20000, force=True)
        elif kind == 'shot': page.screenshot(path=st[1])
        elif kind == 'tap': page.touchscreen.tap(st[1], st[2])
        elif kind == 'key': page.keyboard.down(st[1]); page.wait_for_timeout(st[2]); page.keyboard.up(st[1])
        elif kind == 'eval':
            print('EVAL', st[1][:60], '=>', page.evaluate(st[1]))
    print('\n'.join(logs[:40]) or 'no console errors')
    b.close()
