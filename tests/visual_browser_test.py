"""Visual regressions in an isolated cloud browser; instrumentation is test-only."""
import unittest
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8000'

def inspect_effects(context):
    """Observe real inputs/RAF without changing gameplay or shipping debug hooks."""
    source = (ROOT / 'game/app.mjs').read_text()
    prefix = """
import { Effects as ObservedEffects } from './effects.mjs?v=pf2-privacy1';
window.__visualEvents = {flap:0, point:0, collide:0, reset:0};
window.__frameCalls = 0;
for (const method of ['flap','point','collide','reset','advance']) {
  const original = ObservedEffects.prototype[method];
  ObservedEffects.prototype[method] = function(...args) {
    if (method in window.__visualEvents && (method !== 'point' || args[0])) window.__visualEvents[method]++;
    const result = original.apply(this, args);
    window.__effects = this;
    if (method === 'advance') window.__flight = args[1];
    return result;
  };
}
"""
    source = prefix + source.replace('function frame(time) {', 'function frame(time) { window.__frameCalls++;')
    context.route('**/game/app.mjs*', lambda route: route.fulfill(status=200, content_type='text/javascript', body=source))

def steer(page, goal=2, frames=900, real_time=False):
    """Play with actual Space inputs. Reads positions but never writes physics."""
    import time
    for _ in range(frames):
        status = page.evaluate("""() => {
          const f = window.__flight;
          const gate = f?.gates.find(g => !g.passed);
          return {state:document.body.dataset.gameState, score:f?.gatesPassed || 0,
            flap:f && !f.dead && f.vy > 0 && f.y > (gate?.center || 360) + 18};
        }""")
        if status['state'] != 'running' or status['score'] >= goal:
            return status
        if status['flap']:
            page.locator('#flightCanvas').press('Space')
        if real_time:
            time.sleep(.017)
        else:
            page.clock.run_for(17)
    raise AssertionError('Run did not reach the expected score')

class VisualBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
    def setUp(self):
        self.context = self.browser.new_context(reduced_motion='no-preference', service_workers='block')
        inspect_effects(self.context)
        self.page = self.context.new_page(); self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
    def tearDown(self):
        self.context.close(); self.assertEqual(self.errors, [])
    def game(self):
        self.page.clock.install(time=datetime(2026,10,11,12,tzinfo=timezone.utc))
        self.page.goto(BASE + '/game.html?mode=daily')
        self.page.wait_for_selector('#gameUI:not([hidden])')
        self.page.clock.pause_at(datetime.fromtimestamp((self.page.evaluate('Date.now()') + 100) / 1000, timezone.utc))
    def start(self):
        self.page.locator('#start').click(); self.page.clock.run_for(1700)
        self.assertEqual(self.page.locator('body').get_attribute('data-game-state'), 'running')
    def test_jump_point_pause_collision_and_quiet_dialog(self):
        self.game(); self.start()
        outcome = steer(self.page, goal=2)
        self.assertEqual(outcome['score'], 2)
        counts = self.page.evaluate('window.__visualEvents')
        self.assertGreater(counts['flap'], 3); self.assertEqual(counts['point'], 2)
        self.assertGreater(self.page.evaluate('__effects.labels.length'), 0)
        self.assertGreater(self.page.evaluate('__effects.gates.length'), 0)
        self.page.locator('#pause').click(); self.page.clock.run_for(17)
        snapshot = self.page.evaluate('JSON.stringify(__effects)')
        image = self.page.locator('#flightCanvas').evaluate('c=>c.toDataURL()')
        self.page.clock.run_for(2000)
        self.assertEqual(self.page.evaluate('JSON.stringify(__effects)'), snapshot)
        self.assertEqual(self.page.locator('#flightCanvas').evaluate('c=>c.toDataURL()'), image)
        self.page.locator('#flightCanvas').press('Space')
        self.assertEqual(self.page.locator('body').get_attribute('data-game-state'), 'countdown')
        self.page.locator('#flightCanvas').press('Space'); self.page.clock.run_for(1000)
        self.assertEqual(self.page.evaluate('__visualEvents.flap'), counts['flap'])
        self.assertEqual(self.page.evaluate('JSON.stringify(__effects)'), snapshot)
        self.page.clock.run_for(2200)
        self.page.clock.run_for(3000)
        self.assertTrue(self.page.locator('#resultDialog').evaluate('d=>d.open'))
        self.assertEqual(self.page.evaluate('__visualEvents.collide'), 1)
        self.assertFalse(self.page.evaluate('__effects.active'))
        self.page.locator('#flightCanvas').dispatch_event('keydown', {'code':'Space'})
        self.assertEqual(self.page.evaluate('__visualEvents.flap'), counts['flap'])
        quiet = self.page.locator('#flightCanvas').evaluate('c=>c.toDataURL()')
        self.page.clock.run_for(2000)
        self.assertEqual(self.page.locator('#flightCanvas').evaluate('c=>c.toDataURL()'), quiet)
    def test_twelve_restarts_clear_effects_and_keep_one_frame_loop(self):
        self.game(); frame_counts = []
        for run in range(12):
            self.page.locator('#start' if run == 0 else '#again').click()
            self.assertEqual(self.page.evaluate('__effects.time'), 0)
            self.assertFalse(self.page.evaluate('__effects.broken'))
            self.assertEqual(self.page.evaluate('[__effects.particles.length,__effects.trail.length,__effects.rings.length,__effects.labels.length,__effects.gates.length]'), [0]*5)
            before = self.page.evaluate('__frameCalls')
            self.page.clock.run_for(6000)
            frame_counts.append(self.page.evaluate('__frameCalls') - before)
            self.assertTrue(self.page.locator('#resultDialog').evaluate('d=>d.open'))
            self.assertFalse(self.page.evaluate('__effects.active'))
        self.assertLessEqual(max(frame_counts) - min(frame_counts), 2)
        self.assertEqual(self.page.evaluate('__visualEvents.collide'), 12)
    def test_reduced_motion_and_runtime_preference_change(self):
        self.game(); self.start(); self.page.locator('#flightCanvas').press('Space')
        self.page.clock.run_for(35)
        self.assertGreater(self.page.evaluate('__effects.rings.length'), 0)
        self.assertGreater(self.page.evaluate('__effects.trail.length'), 0)
        self.page.emulate_media(reduced_motion='reduce'); self.page.clock.run_for(17)
        self.assertEqual(self.page.evaluate('[__effects.rings.length,__effects.trail.length]'), [0,0])
        self.assertLessEqual(self.page.evaluate('__effects.particles.length'), 2)
        outcome = steer(self.page, goal=1)
        self.assertEqual(outcome['score'], 1)
        self.assertEqual(self.page.evaluate('[__effects.rings.length,__effects.trail.length]'), [0,0])
        self.page.clock.run_for(3500)
        self.assertTrue(self.page.locator('#resultDialog').evaluate('d=>d.open'))
    def test_play_normal_and_daily_and_reload_separate_records(self):
        self.game(); self.page.locator("#keepStorage").check(); self.page.locator('[name="mode"][value="normal"]').check(); self.start()
        self.assertEqual(steer(self.page, goal=2)['score'], 2)
        self.page.clock.run_for(4000)
        normal = int(self.page.locator('#resultScore').inner_text())
        self.assertGreaterEqual(normal, 2)
        self.page.locator('#skipScore').click()
        self.page.locator('[name="mode"][value="daily"]').check(); self.start()
        self.assertEqual(steer(self.page, goal=3)['score'], 3)
        self.page.clock.run_for(4000)
        daily = int(self.page.locator('#resultScore').inner_text())
        self.assertGreaterEqual(daily, 3)
        self.page.locator('#skipScore').click(); self.page.reload()
        self.page.wait_for_selector('#gameUI:not([hidden])')
        self.assertEqual(int(self.page.locator('#best').inner_text()), daily)
        self.page.locator('[name="mode"][value="normal"]').check()
        self.assertEqual(int(self.page.locator('#best').inner_text()), normal)
    def test_home_terminal_shortcuts_preserve_typed_navigation(self):
        self.page.goto(BASE + '/')
        self.assertEqual(self.page.locator('a[href*="game.html"]').count(), 0)
        self.assertEqual(self.page.locator('.home-actions').count(), 0)
        chips = self.page.locator('.term-chip').all_text_contents()
        self.assertIn('play', chips); self.assertIn('play --daily', chips); self.assertIn('leaderboard', chips)
        field = self.page.locator('#termIn'); field.fill('help'); field.press('Enter')
        self.page.wait_for_function("document.querySelector('#termOut').textContent.includes('leaderboard')")
        for command in ['play', 'play --daily', 'leaderboard']:
            self.assertIn(command, self.page.locator('#termOut').inner_text())
        field.fill('leaderb'); field.press('Tab'); self.assertEqual(field.input_value(), 'leaderboard')
        field.press('Tab'); self.assertNotEqual(self.page.evaluate('document.activeElement.id'), 'termIn')
    def test_home_and_game_layouts_landscape_and_zoom(self):
        out = Path('/tmp/packet-flight-visual-layouts'); out.mkdir(exist_ok=True)
        for width, height in [(320,568),(390,844),(430,932),(1440,900),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            for name, path in [('home','/'),('game','/game.html')]:
                self.page.goto(BASE + path); self.page.evaluate('document.fonts.ready')
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
                self.page.screenshot(path=str(out / f'{name}-{width}.png'))
                if name == 'home':
                    self.page.locator('#term').scroll_into_view_if_needed()
                    self.page.wait_for_function("getComputedStyle(document.querySelector('#term')).opacity === '1'")
                    self.page.screenshot(path=str(out / f'home-terminal-{width}.png'))
                else:
                    boxes = [self.page.locator(s).bounding_box() for s in ['.flight-toolbar','.flight-hud','.flight-surface','.flight-actions']]
                    self.assertTrue(all(a['y']+a['height'] <= b['y']+.5 for a,b in zip(boxes, boxes[1:])))
                    self.assertEqual(self.page.locator('#flightCanvas').evaluate('c=>getComputedStyle(c).touchAction'), 'manipulation')
            for name, path in [('home','/'),('game','/game.html')]:
                self.page.goto(BASE + path); self.page.evaluate("document.documentElement.style.zoom='2'")
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), self.page.evaluate('document.documentElement.clientWidth'))
                if name == 'home':
                    self.page.locator('#term').scroll_into_view_if_needed()
                    self.page.wait_for_function("getComputedStyle(document.querySelector('#term')).opacity === '1'")
                else:
                    score = self.page.locator('#score').bounding_box()
                    best = self.page.locator('.best-display').bounding_box()
                    self.assertLessEqual(score['x']+score['width'], best['x']+.5, 'Score must not overlap record at 200%')
                self.page.screenshot(path=str(out / f'{name}-zoom-{width}.png'), full_page=name == 'game')
    def test_new_assets_are_cached_and_playable_after_offline_reload(self):
        # Use an uninstrumented context: actual shipped modules and service worker.
        ctx = self.browser.new_context(reduced_motion='no-preference')
        page = ctx.new_page(); errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.clock.install(time=datetime(2026,10,11,12,tzinfo=timezone.utc))
        page.goto(BASE + '/')
        page.evaluate("async()=>{const c=await caches.open('tr1stan-packet-flight-pf-2-shell-1');await c.put('/game/render.mjs',new Response('stale-renderer'));}")
        page.goto(BASE + '/game.html')
        page.locator('#keepStorage').check()
        page.wait_for_function("document.querySelector('#offlineReady').textContent.includes('für Offline-Nutzung gespeichert')")
        self.assertNotIn('tr1stan-packet-flight-pf-2-shell-1', page.evaluate('caches.keys()'))
        paths = page.evaluate("async () => (await (await caches.open('tr1stan-packet-flight-pf-2-shell-4')).keys()).map(r=>new URL(r.url).pathname+new URL(r.url).search)")
        for asset in ['/game/effects.mjs?v=pf2-privacy1','/game/render.mjs?v=pf2-privacy1','/game/app.mjs?v=pf2-online1','/game/game.css?v=pf2-privacy1','/style.css?v=31','/script.js?v=31']:
            self.assertIn(asset, paths)
        ctx.set_offline(True); page.reload(wait_until='load')
        page.wait_for_selector('#gameUI:not([hidden])')
        page.locator('#start').click(); page.clock.run_for(1700)
        self.assertEqual(page.locator('body').get_attribute('data-game-state'), 'running')
        page.locator('#flightCanvas').press('Space'); page.clock.run_for(50)
        self.assertEqual(page.locator('#score').inner_text(), '0')
        page.clock.run_for(4000)
        self.assertTrue(page.locator('#resultDialog').evaluate('d=>d.open'))
        self.assertEqual(errors, []); ctx.close()

    def test_repeated_resize_preserves_paused_canvas_pixels(self):
        self.game(); self.start(); self.page.locator('#pause').click()
        before = self.page.locator('#flightCanvas').evaluate('c=>c.toDataURL()')
        self.page.evaluate("""async () => {
          const {Renderer}=await import('/game/render.mjs?v=pf2-privacy1');
          const renderer=new Renderer(document.querySelector('#flightCanvas'));
          renderer.resize(); renderer.resize();
        }""")
        self.assertEqual(self.page.locator('#flightCanvas').evaluate('c=>c.toDataURL()'), before)

if __name__ == '__main__': unittest.main(verbosity=2)
