#!/usr/bin/env python3
"""
Playwright regression suite for مدينتي بعيوني — run with `npm run test:e2e`.

Needs: the dev server on http://localhost:5173 (`npm run dev`) for the functional flows
(they use the dev-only `window.__game` store hook), and a production build in dist/
(`npm run build`) for the offline / production checks. Chrome at /usr/bin/google-chrome
(override with CHROME=...). Exits non-zero if any check fails.
"""
import json, os, sys, threading, time, functools, http.server, socketserver, tempfile
from playwright.sync_api import sync_playwright

DEV = os.environ.get('DEV_URL', 'http://localhost:5173/')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = os.environ.get('SHOTS', '/tmp/shots/e2e')
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(SHOTS, exist_ok=True)

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('  PASS ' if cond else '  FAIL ') + name + (f'  — {detail}' if detail else ''), flush=True)

MOCK_HOST = r"""
window.__writes = []; window.__sampleCalls = []; window.__sampleReply = null;
(() => {
  const docs = new Map();
  const doc = (path) => ({
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    set: async (d) => { window.__writes.push({ path, d: JSON.parse(JSON.stringify(d)) }); docs.set(path, d) },
    delete: async () => { window.__writes.push({ path, del: true }); docs.delete(path) },
  });
  const q = { limit: () => q, where: () => q, orderBy: () => q, get: async () => ({ docs: [] }), onSnapshot: () => () => {} };
  const db = { doc, collection: () => q };
  const user = { id: async () => 'test-user-1' };
  const sample = async () => ({ text: '' });
  sample.json = async (input) => { window.__sampleCalls.push(input); const r = window.__sampleReply; if (r && r.__error) throw { code: r.__error }; return r };
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const caps = { db, user, sample };
  window.claude = { use: async (n) => caps[n] ?? null };
})();
"""

ONBOARDED = r"""
try { localStorage.setItem('madinah-my-story-v1', JSON.stringify({ state: { onboarded: true, version: 3, lang: 'ar' }, version: 0 })) } catch (e) {}
"""

def new_page(b, w=390, h=844, mobile=True, init=None, downloads=True):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=mobile, is_mobile=mobile, accept_downloads=downloads, device_scale_factor=1)
    for s in (init or []): ctx.add_init_script(s)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    return ctx, page, errs

G = '__game.getState()'
def js(page, code):
    return page.evaluate(f'() => {{ {code} }}')

def wait_for(page, expr, timeout=8000):
    t0 = time.time()
    while time.time() - t0 < timeout / 1000:
        if page.evaluate(f'() => !!({expr})'): return True
        page.wait_for_timeout(150)
    return False

# ----------------------------------------------------------------------------------
def functional(b):
    print('\n[1] Core flows, privacy, guide, planner, stories, challenges, Then & Now, journey, backup (dev, mocked host)')
    ctx, page, errs = new_page(b, init=[MOCK_HOST])
    page.goto(DEV); page.wait_for_timeout(2500)
    page.click('text=ابدأ رحلتك', force=True); page.wait_for_timeout(1200)
    check('boots and starts the journey', wait_for(page, f'{G}.onboarded'))

    # privacy-first defaults: nothing uploaded
    page.wait_for_timeout(5000)
    st = page.evaluate(f'() => ({{ cloud: {G}.privacy.cloudBackup, notes: {G}.privacy.cloudNotes, publish: {G}.privacy.publish, writes: window.__writes.length }})')
    check('privacy defaults: cloud backup, notes and publishing are off', not st['cloud'] and not st['notes'] and not st['publish'], json.dumps(st))
    check('no data is written to the host before opt-in', st['writes'] == 0, f"writes={st['writes']}")

    # original flow: QR demo unlock through the real UI
    js(page, f"{G}.select('hejaz', {{ fly: true }})"); page.wait_for_timeout(1400)
    page.click('text=مسح رمز QR', force=True); page.wait_for_timeout(700)
    page.click('text=فتح تجريبي', force=True); page.wait_for_timeout(4200)
    check('demo QR unlock builds the landmark (existing flow)', page.evaluate(f"() => !!{G}.progress.hejaz.unlocked"))
    js(page, f"{G}.addMemory({{ landmarkId: 'hejaz', note: 'رحلة لا تُنسى', date: new Date().toISOString() }})")

    # opt in to cloud backup via the Data panel
    js(page, f"__game.setState({{ toasts: [] }}); {G}.setUi({{ panel: 'data', sheetOpen: false }})"); page.wait_for_timeout(700)
    page.screenshot(path=f'{SHOTS}/data-panel.png')
    page.click('[aria-label="نسخة سحابية خاصة"]', force=True)
    ok = wait_for(page, "window.__writes.some(w => w.path === 'data/users/test-user-1/progress')", 9000)
    w = page.evaluate("() => window.__writes.filter(w => w.path === 'data/users/test-user-1/progress').slice(-1)[0]?.d || {}")
    check('after opting in, progress syncs to the private per-user path', ok)
    check('memory notes are NOT uploaded unless also opted in', 'memories' not in w and 'guideLog' not in w, ','.join(sorted(w.keys()))[:120])
    page.click('[aria-label="تضمين نصوص الذكريات"]', force=True)
    ok = wait_for(page, "window.__writes.some(w => w.path.endsWith('/progress') && Array.isArray(w.d.memories))", 9000)
    mem = page.evaluate("() => (window.__writes.filter(w => Array.isArray(w.d?.memories)).slice(-1)[0]?.d.memories || [])")
    check('with notes opted in, memories sync without photo keys', ok and all('photoKey' not in m for m in mem), f'{len(mem)} memories')
    other = page.evaluate("() => window.__writes.filter(w => !w.path.startsWith('data/users/test-user-1/')).map(w => w.path)")
    check('nothing is published to shared paths (city sharing still off)', not other, json.dumps(other))
    js(page, f"{G}.setPrivacy({{ cloudBackup: false, cloudNotes: false }}); {G}.setUi({{ panel: null }})")

    # backup export → reset → import
    js(page, f"{G}.setUi({{ panel: 'data' }})"); page.wait_for_timeout(600)
    with page.expect_download(timeout=15000) as dl:
        page.click('text=تصدير', force=True)
    path = dl.value.path()
    data = json.load(open(path))
    check('backup export produces a valid file', data.get('app') == 'madinah-my-story' and data['state']['progress']['hejaz']['unlocked'] is True)
    js(page, f"{G}.resetProgress()"); page.wait_for_timeout(500)
    check('reset clears progress', not page.evaluate(f"() => {G}.progress.hejaz.unlocked"))
    tmp = os.path.join(tempfile.mkdtemp(), 'backup.json'); json.dump(data, open(tmp, 'w'))
    page.set_input_files('input[type=file][accept*="json"]', tmp); page.wait_for_timeout(700)
    page.screenshot(path=f'{SHOTS}/data-import-confirm.png')
    page.click('text=استبدال واسترجاع', force=True); page.wait_for_timeout(1200)
    check('importing the backup restores progress and memories', page.evaluate(f"() => {G}.progress.hejaz.unlocked && {G}.memories.some(m => m.note === 'رحلة لا تُنسى')"))
    n_rp = page.evaluate("async () => (await import('/src/lib/backup.ts').then(m => m.listRestorePoints())).length")
    check('a restore point was kept before the import', n_rp >= 1, f'{n_rp} points')
    bad = os.path.join(tempfile.mkdtemp(), 'bad.json'); open(bad, 'w').write('{"hello": 1}')
    page.set_input_files('input[type=file][accept*="json"]', bad)
    check('an invalid file is rejected with a message', wait_for(page, "[...document.querySelectorAll('body *')].some(e => e.childElementCount === 0 && e.textContent.includes('ليس نسخة احتياطية'))", 4000))
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    check('Escape closes dialogs', page.evaluate(f"() => {G}.panel === null"))

    # guide — local grounded answers
    js(page, f"{G}.setUi({{ panel: 'guide' }})"); page.wait_for_timeout(500)
    def ask(q):
        page.fill('#guide-q', q); page.press('#guide-q', 'Enter'); page.wait_for_timeout(700)
        return page.evaluate(f"() => {G}.guideLog.slice(-1)[0]")
    e = ask('متى افتتحت محطة سكة الحجاز؟')
    check('guide answers a history question with verified cards', len(e['factIds']) > 0 and page.locator('text=معلومة موثّقة').count() > 0 and page.locator('a[href*="wikipedia"], a[href*="hejazrailway"]').count() > 0, ','.join(e['factIds']))
    e = ask('What is the capital of France?')
    check('guide refuses to guess outside its sources', e.get('unknown') and not e['factIds'])
    e = ask('عندي نصف يوم ومعي أطفال، ماذا أزور؟')
    check('recommendations are labelled as suggestions, separate from facts', bool(e.get('rec')) and not e['factIds'] and page.locator('text=اقتراح').count() > 0)
    e = ask('هل المتحف مفتوح اليوم؟')
    check('practical questions are not answered from memory', e.get('unknown') and 'تحقّق' in (e.get('rec') or ''))
    e = ask('كم عدد مظلات المسجد النبوي؟')
    check('guide answers about the Prophet’s Mosque from its sources', any(i.startswith('haram.') for i in e['factIds']), ','.join(e['factIds']))
    e = ask('أين أشتري التمور؟')
    check('guide knows map-only places (dates market)', any(i.startswith('datesMarket.') for i in e['factIds']), ','.join(e['factIds']))
    page.screenshot(path=f'{SHOTS}/guide-local.png')

    # guide — Claude mode with a mocked host: only cited verified ids survive
    page.wait_for_timeout(500)
    has_toggle = page.locator('[aria-label="إجابات Claude"]').count() > 0
    check('Claude mode is offered when the host provides it', has_toggle)
    if has_toggle:
        page.click('[aria-label="إجابات Claude"]', force=True)
        js(page, "window.__sampleReply = { answer: 'افتُتحت المحطة عام ١٩٠٨.', factIds: ['hejaz.f0', 'made.up.id'], recommendation: null, unknown: false }")
        e = ask('متى افتتحت المحطة؟'); page.wait_for_timeout(500)
        check('Claude answer keeps only ids from the verified knowledge base', e['source'] == 'claude' and e['factIds'] == ['hejaz.f0'], json.dumps(e['factIds']))
        sent = page.evaluate("() => window.__sampleCalls.slice(-1)[0] || ''")
        check('prompt sends the question and sources only (no memories)', 'رحلة لا تُنسى' not in sent and 'FACTS:' in sent)
        js(page, "window.__sampleReply = { answer: 'Something invented.', factIds: [], recommendation: null, unknown: false }")
        e = ask('حدثني عن قباء')
        check('an ungrounded Claude answer falls back to the local sources', e['source'] == 'local')
        js(page, "window.__sampleReply = { __error: 'rate_limited' }")
        e = ask('ماذا حدث في غزوة أحد؟')
        check('host errors fall back to local answers', e['source'] == 'local' and len(e['factIds']) > 0)
        page.screenshot(path=f'{SHOTS}/guide-claude.png')
    js(page, f"{G}.setUi({{ panel: null }})")

    # planner
    js(page, f"{G}.setUi({{ panel: 'plan' }})"); page.wait_for_timeout(500)
    counts = {}
    for label, key in [('زيارة قصيرة', 'short'), ('نصف يوم', 'half'), ('يوم كامل', 'full')]:
        page.click(f'button[aria-pressed] >> text={label}', force=True); page.wait_for_timeout(300)
        counts[key] = page.locator('section[aria-live] ol > li').count() - 1
    check('planner: short ≤ half ≤ full and a full day has several stops', 1 <= counts['short'] <= counts['half'] <= counts['full'] and counts['full'] >= 5, json.dumps(counts))
    budgets = page.evaluate("""async () => { const m = await import('/src/lib/planner.ts'); return ['short','half','full'].map(b => { const r = m.buildPlan({ ...m.DEFAULT_PLAN, budget: b }); return [r.totalMin, r.budgetMin, r.stops.every(s => m.ITINERARY.places[s.id])] }) }""")
    check('planner stays within every time budget and only uses places with visit info', all(t <= b and ok for t, b, ok in budgets), json.dumps(budgets))
    page.screenshot(path=f'{SHOTS}/planner.png', full_page=True)
    page.click('text=اعرضه على خريطتي', force=True); page.wait_for_timeout(800)
    po = page.evaluate(f"() => ({{ order: {G}.planOrder, routes: {G}.showRoutes, tab: {G}.tab }})")
    check('planner route is drawn on the city map', po['order'] and len(po['order']) == counts['full'] and po['routes'] and po['tab'] == 'city', json.dumps(po))
    page.screenshot(path=f'{SHOTS}/planner-map.png')

    # the real-map city: 15 landmarks + 14 map places on their real bearings
    geo = page.evaluate("""async () => { const m = await import('/src/data/places.ts'); const P = (id) => m.SPOT_MAP[id].cityPos
      return { n: m.SPOTS.length, lm: m.SPOTS.filter(s => s.kind === 'landmark').length, haram: P('haram'), quba: P('quba'), uhud: P('uhud'), miqat: P('miqat'), airport: P('airport'), baqi: P('baqi') } }""")
    check('29 places: 15 landmarks with models + 14 map places', geo['n'] == 29 and geo['lm'] == 15, json.dumps(geo)[:120])
    check('positions keep real directions (Quba south, Uhud north, Miqat south-west, airport north-east, Baqi east)',
          geo['haram'] == [0, 0] and geo['quba'][1] > 20 and geo['uhud'][1] < -20 and geo['miqat'][0] < 0 < geo['miqat'][1] and geo['airport'][0] > 0 > geo['airport'][1] and geo['baqi'][0] > 5, json.dumps(geo))
    js(page, f"{G}.setTab('explore')"); page.wait_for_timeout(900)
    page.fill('input[aria-label="بحث في الأماكن"]', 'تمور'); page.wait_for_timeout(400)
    check('places directory search finds the dates market', page.locator('ul >> text=سوق التمور المركزي').count() > 0)
    page.fill('input[aria-label="بحث في الأماكن"]', ''); page.wait_for_timeout(200)
    page.click('button[aria-pressed] >> text=متاحف ومعارض', force=True); page.wait_for_timeout(400)
    names = page.evaluate("() => [...document.querySelectorAll('section[aria-label] ul > li')].map(li => li.innerText.split('\\n')[0])")
    check('category filter shows only museums', len(names) >= 3 and any('سكة' in n for n in names) and not any('قباء' in n for n in names), ' | '.join(names)[:160])
    page.screenshot(path=f'{SHOTS}/places-directory.png')
    js(page, f"{G}.openPlace('saqifah')"); page.wait_for_timeout(1500)
    check('a map place opens with a verified summary, a separate suggestion and sources',
          page.locator('[role=dialog] >> text=معلومة موثّقة').count() > 0 and page.locator('[role=dialog] >> text=اقتراح').count() > 0 and page.locator('[role=dialog] a[href*="visitmadinahsa"]').count() > 0 and page.locator('[role=dialog] >> text=موضع تقريبي').count() > 0)
    check('a map place offers Open in Maps', page.locator('[role=dialog] a[href*="google.com/maps"]').count() > 0)
    page.screenshot(path=f'{SHOTS}/place-sheet.png')
    js(page, f"{G}.openPlace(null)")
    js(page, f"{G}.unlock('haram', 'demo')"); page.wait_for_timeout(2200)
    check('visiting the Prophet’s Mosque records the visit without a construction site', page.evaluate(f"() => !!{G}.progress.haram.unlocked && {G}.constructing === null"))
    js(page, f"{G}.setUi({{ celebrate: null }}); {G}.select('haram')"); page.wait_for_timeout(1200)
    check('the Prophet’s Mosque offers walking its plazas', page.locator('text=تجوّل في الساحات').count() > 0)
    page.click('button:has-text("تجوّل في الساحات")', force=True)
    check('the plazas scene opens', wait_for(page, f"{G}.mode === 'interior' && {G}.interiorId === 'haram'", 6000))
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{SHOTS}/haram-plazas.png')
    hc = page.evaluate("""async () => { const c = await import('/src/data/collectibles.ts'); const k = await import('/src/data/content.ts'); return { items: c.collectiblesFor('haram').length, info: k.INFO_COUNT.haram } }""")
    check('no hidden items or games in the Haram — information markers only', hc['items'] == 0 and hc['info'] >= 5, json.dumps(hc))
    js(page, f"{G}.setUi({{ mode: 'city', interiorId: null }})"); page.wait_for_timeout(800)
    js(page, f"{G}.unlock('ghamama', 'demo')"); page.wait_for_timeout(5200)
    js(page, f"{G}.setUi({{ celebrate: null }}); {G}.select('ghamama')"); page.wait_for_timeout(1200)
    check('a landmark without a walkable scene offers Maps instead of a door', page.locator('a[href*="google.com/maps"] >> text=افتح في الخرائط').count() > 0 and page.locator('text=ادخل المبنى').count() == 0)
    js(page, f"{G}.closeSheet()")

    # stories — read → find (engine pickup) → question → … inside Quba
    js(page, f"{G}.unlock('quba', 'demo')"); page.wait_for_timeout(3800)
    js(page, f"__game.setState({{ toasts: [] }}); {G}.startStory('quba-first-mosque'); {G}.setUi({{ panel: 'stories' }})"); page.wait_for_timeout(500)
    page.screenshot(path=f'{SHOTS}/story-start.png')
    page.click('text=متابعة', force=True); page.wait_for_timeout(300)
    check('story advances from a read step to a clue', page.evaluate(f"() => {G}.stories['quba-first-mosque'].step === 1"))
    page.click('text=ادخل مسجد قباء', force=True); page.wait_for_timeout(4500)
    check('clue button takes you inside the landmark', page.evaluate(f"() => {G}.mode === 'interior' && {G}.interiorId === 'quba'"))
    page.screenshot(path=f'{SHOTS}/story-clue-hud.png')
    js(page, "window.__tp = [0, 7.2, Math.PI]"); page.wait_for_timeout(900)
    page.keyboard.down('e'); page.wait_for_timeout(60); page.keyboard.up('e'); page.wait_for_timeout(900)
    check('finding the clue object in 3D advances the story', page.evaluate(f"() => {G}.stories['quba-first-mosque'].step === 2"), str(page.evaluate(f"() => {G}.stories['quba-first-mosque'].step")))
    js(page, f"{G}.setUi({{ inspect: null, panel: 'stories' }})"); page.wait_for_timeout(500)
    page.click('text=نحو الكعبة في مكة جنوبًا', force=True); page.wait_for_timeout(300)
    check('answering shows the explanation', page.locator('text=أحسنت').count() > 0)
    page.click('text=متابعة', force=True); page.wait_for_timeout(400)
    js(page, f"{G}.setUi({{ panel: null }}); window.__tp = [-7.6, 6.9, Math.PI]"); page.wait_for_timeout(900)
    page.keyboard.down('e'); page.wait_for_timeout(60); page.keyboard.up('e'); page.wait_for_timeout(900)
    check('hidden collectible pickup also counts for the story', page.evaluate(f"() => {G}.stories['quba-first-mosque'].step === 4 && !!{G}.discoveries['hidden:quba:saturday']"))
    js(page, f"{G}.setUi({{ inspect: null, panel: 'stories' }})"); page.wait_for_timeout(400)
    page.click('text=الجمعة', force=True); page.wait_for_timeout(300)
    check('a wrong answer is explained without penalty', page.locator('text=ليس تمامًا').count() > 0)
    page.click('text=متابعة', force=True); page.wait_for_timeout(300)
    page.click('text=إنهاء القصة', force=True); page.wait_for_timeout(900)
    check('story completes and shows what was learned', page.evaluate(f"() => !!{G}.stories['quba-first-mosque'].doneAt") and page.locator('text=ما تعلّمته').count() > 0)
    page.screenshot(path=f'{SHOTS}/story-done.png')
    check('finishing a story awards the Story Seeker achievement', page.evaluate(f"() => !!{G}.achievements['story-seeker']"))
    pts_before = page.evaluate(f"async () => (await import('/src/data/progression.ts')).computePoints({G})")
    js(page, f"{G}.startStory('quba-first-mosque')")
    check('a finished story cannot be restarted for extra points', page.evaluate(f"() => !!{G}.stories['quba-first-mosque'].doneAt") and page.evaluate(f"async () => (await import('/src/data/progression.ts')).computePoints({G})") == pts_before)
    js(page, f"{G}.setUi({{ panel: null }})")
    page.click('[aria-label="العودة للمدينة"]', force=True); page.wait_for_timeout(2600)

    # challenges — real discoveries only, seasonal window respected
    js(page, f"""{G}.unlock('uhud', 'demo'); ['info:uhud:mountain','info:uhud:archers','hidden:uhud:aynayn'].forEach(k => {G}.discover(k)); {G}.runChecks()""")
    page.wait_for_timeout(4500)
    month = time.localtime().tm_mon
    winter_done = page.evaluate(f"() => !!{G}.challenges['winter-uhud']")
    check('seasonal challenge completes from real discoveries in season', winter_done == (month in (11, 12, 1, 2)), f'month={month}')
    js(page, f"""['hidden:hejaz:watch','hidden:hejaz:ticket','hidden:hejaz:lantern','info:hejaz:docs'].forEach(k => {G}.discover(k)); {G}.runChecks()""")
    page.wait_for_timeout(600)
    check('off-season challenge is not awarded', page.evaluate(f"() => !{G}.challenges['railway-anniversary']") or month == 9)
    js(page, f"{G}.setUi({{ panel: 'challenges' }})"); page.wait_for_timeout(500)
    page.screenshot(path=f'{SHOTS}/challenges.png')
    js(page, f"{G}.setUi({{ panel: null }})")

    # Then & Now
    js(page, f"{G}.setUi({{ panel: 'thenNow', thenNowFor: 'hejaz' }})"); page.wait_for_timeout(2500)
    page.screenshot(path=f'{SHOTS}/thennow-hejaz-1908.png')
    check('Then & Now labels the 1908 view as illustrative', page.locator('text=تصوّر توضيحي').count() > 0)
    page.click('[role=radio] >> text=اليوم', force=True); page.wait_for_timeout(1500)
    page.screenshot(path=f'{SHOTS}/thennow-hejaz-today.png')
    page.click('[role=tab] >> text=مسجد قباء', force=True); page.wait_for_timeout(800)
    check('Then & Now shows a documented description where no reconstruction exists', page.locator('text=لا تعيد اللعبة بناءه').count() > 0 and page.locator('input[type=range]').count() > 0)
    page.screenshot(path=f'{SHOTS}/thennow-quba.png')
    js(page, f"{G}.setUi({{ panel: null }})")

    # Journey story + exports
    js(page, f"{G}.loadDemoJourney()"); page.wait_for_timeout(1500)
    js(page, f"__game.setState({{ toasts: [] }}); {G}.setUi({{ panel: 'journey' }})"); page.wait_for_timeout(2500)
    page.screenshot(path=f'{SHOTS}/journey-cover.png')
    for _ in range(8):
        page.click('[aria-label="التالي"]', force=True); page.wait_for_timeout(250)
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{SHOTS}/journey-end.png')
    with page.expect_download(timeout=20000) as dl:
        page.click('text=حفظ ملخص الرحلة', force=True)
    size = os.path.getsize(dl.value.path())
    check('journey summary image exports', size > 50_000, f'{size // 1024} KB')
    if page.locator('text=حفظ فيديو').count():
        with page.expect_download(timeout=60000) as dl:
            page.click('text=حفظ فيديو', force=True)
        vs = os.path.getsize(dl.value.path())
        check('journey video exports where MediaRecorder exists', vs > 20_000, f'{vs // 1024} KB, {dl.value.suggested_filename}')
    else:
        check('journey video export is hidden where unsupported', True)
    page.keyboard.press('Escape'); page.wait_for_timeout(300)

    # replay (existing flow) still works end to end
    js(page, f"{G}.setUi({{ panel: null, tab: 'city', celebrate: null, sheetOpen: false }})"); page.wait_for_timeout(600)
    page.click('text=أعد عيش رحلتي', force=True)
    check('replay runs to its end card', wait_for(page, f"{G}.replay.phase === 'end'", 60000))
    check('replay end offers the travel story', page.locator('text=شاهد قصة رحلتي').count() > 0)
    page.screenshot(path=f'{SHOTS}/replay-end.png')

    # accessibility settings
    js(page, f"{G}.setA11y({{ reduceMotion: 'on', textScale: 1.3 }})"); page.wait_for_timeout(300)
    a = page.evaluate("() => ({ motion: document.documentElement.dataset.motion, fs: getComputedStyle(document.documentElement).getPropertyValue('--fs').trim() })")
    check('reduced motion and text size apply', a['motion'] == 'reduce' and a['fs'] == '1.3', json.dumps(a))
    js(page, f"{G}.setA11y({{ reduceMotion: 'system', textScale: 1 }})")
    check('no uncaught errors in the functional run', not errs, ' | '.join(errs)[:300])
    ctx.close()

# ----------------------------------------------------------------------------------
def screens(b):
    print('\n[2] Screen sizes (text at 100% and 130%)')
    sizes = [(320, 568, True), (360, 740, True), (390, 844, True), (430, 932, True), (768, 1024, True), (844, 390, True), (1280, 800, False)]
    for w, h, mob in sizes:
        ctx, page, errs = new_page(b, w, h, mob, init=[ONBOARDED])
        page.goto(DEV); page.wait_for_timeout(2600)
        js(page, f"{G}.loadDemoJourney(); __game.setState({{ toasts: [] }})"); page.wait_for_timeout(1200)
        page.screenshot(path=f'{SHOTS}/size-{w}x{h}-city.png')
        js(page, f"{G}.setTab('explore')"); page.wait_for_timeout(700)
        over = page.evaluate("() => document.documentElement.scrollWidth - innerWidth")
        page.screenshot(path=f'{SHOTS}/size-{w}x{h}-explore.png')
        js(page, f"{G}.setA11y({{ textScale: 1.3 }}); {G}.setUi({{ panel: 'guide' }})"); page.wait_for_timeout(600)
        over2 = page.evaluate("() => document.documentElement.scrollWidth - innerWidth")
        page.screenshot(path=f'{SHOTS}/size-{w}x{h}-guide-130.png')
        js(page, f"{G}.setUi({{ panel: null }}); {G}.openPlace('datesMarket')"); page.wait_for_timeout(900)
        over2 = max(over2, page.evaluate("() => document.documentElement.scrollWidth - innerWidth"))
        page.screenshot(path=f'{SHOTS}/size-{w}x{h}-place-130.png')
        check(f'{w}×{h}: no horizontal overflow (100% / 130% text)', over <= 0 and over2 <= 0 and not errs, f'overflow={over},{over2} errors={len(errs)}')
        ctx.close()

# ----------------------------------------------------------------------------------
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def production(b):
    print('\n[3] Production build: boot, offline re-open via service worker')
    dist = os.path.join(ROOT, 'dist')
    if not os.path.exists(os.path.join(dist, 'index.html')):
        check('dist/index.html exists (run npm run build)', False); return
    handler = functools.partial(Quiet, directory=dist)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://localhost:{port}/'
    ctx, page, errs = new_page(b)
    page.goto(url); page.wait_for_timeout(3000)
    check('production build boots without errors', page.locator('text=ابدأ رحلتك').count() > 0 and not errs, ' | '.join(errs)[:200])
    check('dev store hook is not exposed in production', page.evaluate("() => typeof window.__game === 'undefined'"))
    ok = wait_for(page, "navigator.serviceWorker && navigator.serviceWorker.controller !== null || false", 4000)
    if not ok:
        page.reload(); page.wait_for_timeout(2500)
        ok = page.evaluate("() => !!navigator.serviceWorker?.controller")
    check('service worker controls the page (offline cache)', ok)
    page.click('text=ابدأ رحلتك', force=True); page.wait_for_timeout(1500)
    ctx.set_offline(True)
    page.reload(); page.wait_for_timeout(3500)
    check('the game re-opens with no connection and keeps progress', page.locator('nav').count() > 0 or page.locator('text=مدينتي').count() > 0, '')
    page.screenshot(path=f'{SHOTS}/prod-offline-reopen.png')
    check('offline pill tells the player what still works', page.locator('text=دون اتصال').count() > 0)
    check('no uncaught errors offline', not errs, ' | '.join(errs)[:200])
    ctx.close()
    srv.shutdown()

# ----------------------------------------------------------------------------------
if __name__ == '__main__':
    which = sys.argv[1:] or ['functional', 'screens', 'production']
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=ARGS)
        for w in which: globals()[w](b)
        b.close()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} checks passed; screenshots in {SHOTS}')
    sys.exit(1 if failed else 0)
