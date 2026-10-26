"""Cloud-only functional/visual checks. Run the static server first; all data is isolated."""
import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8000'
ARTIFACTS = Path('/tmp/packet-flight-review')
ARTIFACTS.mkdir(exist_ok=True)

class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
    def setUp(self):
        self.context = self.browser.new_context(reduced_motion='reduce', service_workers='block')
        self.page = self.context.new_page()
        self.errors = []; self.requests = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('request', lambda request: self.requests.append(request.url))
    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'JavaScript errors/rejections')
    def game(self, path='/game.html'):
        self.page.goto(BASE + path)
        self.page.wait_for_selector('#gameUI:not([hidden])')
        if getattr(self, 'mockOnline', False): self.page.locator('#onlineRun').check()
        self.page.evaluate('document.fonts.ready')
        self.page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    def state(self):
        return self.page.locator('body').get_attribute('data-game-state')
    def clock(self):
        self.page.clock.install(time=datetime(2026, 10, 11, 12, tzinfo=timezone.utc))
    def end_run(self):
        self.page.locator('#start').click()
        self.page.wait_for_function("document.body.dataset.gameState === 'countdown'")
        self.page.clock.run_for(6000)
        self.assertEqual(self.state(), 'gameover')
    def test_terminal_completion_history_and_safe_text(self):
        self.page.goto(BASE + '/')
        field = self.page.locator('#termIn')
        for value in ['help', 'no-such-command', 'ne', 'play --daily']:
            field.fill(value); field.press('Tab')
            self.assertNotEqual(self.page.evaluate('document.activeElement.id'), 'termIn', value)
        field.fill('pla'); field.press('Tab'); self.assertEqual(field.input_value(), 'play')
        field.fill('play --d'); field.press('Tab'); self.assertEqual(field.input_value(), 'play --daily')
        field.press('Shift+Tab'); self.assertNotEqual(self.page.evaluate('document.activeElement.id'), 'termIn')
        field.fill('help'); field.press('Enter')
        self.page.wait_for_function("document.querySelector('#termOut').textContent.includes('play --daily')")
        field.press('ArrowUp'); self.assertEqual(field.input_value(), 'help')
        field.press('ArrowDown'); self.assertEqual(field.input_value(), '')
        field.fill('<img src=x onerror=alert(1)>'); field.press('Enter')
        self.page.wait_for_function("document.querySelector('#termOut').textContent.includes('Unbekannter Befehl')")
        self.assertEqual(self.page.locator('#termOut img').count(), 0)
        field.press('Control+l'); self.assertEqual(self.page.locator('#termOut').inner_text().strip(), '')
        field.fill('about'); field.press('Enter')
        title = self.page.locator('[data-topic="about"] h3').first.text_content()
        self.page.wait_for_function('(title) => document.querySelector("#termOut").textContent.includes(title)', arg=title)
    def test_terminal_navigation_and_skip_focus(self):
        for command, suffix in [('play', '/game.html'), ('play --daily', '/game.html?mode=daily'), ('leaderboard', '/game.html#leaderboard')]:
            self.page.goto(BASE + '/')
            self.page.locator('#termIn').fill(command); self.page.locator('#termIn').press('Enter')
            self.page.wait_for_url(BASE + suffix)
        for path in ['/', '/game.html', '/impressum.html', '/datenschutz.html', '/404.html']:
            self.page.goto(BASE + path)
            self.page.locator('.skip').focus(); self.page.locator('.skip').press('Enter')
            self.assertEqual(self.page.evaluate('document.activeElement.id'), 'content')
        self.page.goto(BASE + '/impressum.html')
        self.page.evaluate('navigator.clipboard.writeText = async text => { window.copied = text; }')
        self.page.locator('.copy').click()
        self.assertEqual(self.page.evaluate('window.copied'), 'chef@tr1stan.de')
    def test_countdown_pause_visibility_resize_restart(self):
        self.clock(); self.game('/game.html?mode=daily')
        self.assertEqual(self.state(), 'ready')
        self.page.locator('#start').click()
        self.page.locator('#start').dispatch_event('click')
        self.assertEqual(self.state(), 'countdown')
        self.page.clock.run_for(1700); self.assertEqual(self.state(), 'running')
        self.page.set_viewport_size({'width': 932, 'height': 430})
        self.assertEqual(self.state(), 'running')
        self.page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))")
        self.assertEqual(self.state(), 'paused')
        self.page.clock.run_for(10000); self.assertEqual(self.state(), 'paused')
        self.page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, get:()=>false}); document.dispatchEvent(new Event('visibilitychange'))")
        self.assertEqual(self.state(), 'paused')
        self.page.locator('#start').click(); self.assertEqual(self.state(), 'countdown')
        self.page.clock.run_for(5000); self.assertEqual(self.state(), 'gameover')
        self.assertTrue(self.page.locator('#enterScore').is_disabled())
        self.page.locator('#again').click(); self.assertEqual(self.state(), 'countdown')
        self.assertEqual(self.page.locator('#score').inner_text(), '0')
        self.page.clock.run_for(5000); self.assertEqual(self.state(), 'gameover')
        self.page.locator('#skipScore').click(); self.assertEqual(self.state(), 'ready')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'start')
        self.assertTrue(all(urlparse(url).hostname in ['127.0.0.1', 'localhost'] for url in self.requests), self.requests)
    def test_daily_utc_rollover_and_no_global_keys(self):
        self.page.clock.install(time=datetime(2026, 10, 11, 23, 59, 59, tzinfo=timezone.utc))
        self.game('/game.html?mode=daily')
        self.page.clock.run_for(1500)
        self.assertIn('2026-10-12', self.page.locator('#dailyInfo').inner_text())
        self.page.locator('#mute').focus(); self.page.keyboard.press('w')
        self.assertEqual(self.state(), 'ready')
        self.page.locator('#flightCanvas').focus(); self.page.keyboard.press('Tab')
        self.assertNotEqual(self.page.evaluate('document.activeElement.id'), 'flightCanvas')
    def test_storage_audio_failure_and_copy_fallback(self):
        self.context.add_init_script("Object.defineProperty(window,'localStorage',{get:()=>({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}})}); window.AudioContext=class {constructor(){throw Error('blocked')}};")
        self.clock(); self.game(); self.end_run()
        self.assertTrue(self.page.locator('#storageNotice').is_visible())
        self.page.evaluate("() => { navigator.clipboard.writeText = () => Promise.reject(Error('denied')); }")
        self.page.locator('#copyScore').click(); self.page.wait_for_selector('#copyFallback:not([hidden])')
        self.assertIn('PACKET//FLIGHT', self.page.locator('#copyFallback').input_value())
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'copyFallback')
    def online(self, score_failure=False, start_failure=False, populated=False):
        self.scores = []; self.starts = []; self.mockOnline = True; self.failed_once = False; self.own_entry = None; self.receipt = None
        self.context.route('**/game/config.mjs*', lambda route: route.fulfill(status=200, content_type='text/javascript', body="export const API_URL='https://packet-flight.test';"))
        def api(route):
            req = route.request; path = urlparse(req.url).path
            headers = {'access-control-allow-origin': BASE, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type, X-Player-ID', 'content-type': 'application/json'}
            if req.method == 'OPTIONS': route.fulfill(status=204, headers=headers); return
            if path == '/api/run/start':
                self.starts.append(req.post_data_json)
                if start_failure: route.fulfill(status=503, headers=headers, body='{"message":"offline"}'); return
                time = self.page.evaluate('Date.now()')
                data = {'token':f'isolated-test-token-{len(self.starts)}','runId':'test','version':'pf-2','mode':'normal','day':'','seed':1,'startedAt':time,'expiresAt':time+1800000}
            elif path == '/api/score':
                self.scores.append(req.post_data_json)
                if self.receipt is None:
                    self.own_entry = {'position':22 if populated else 1,'alias':req.post_data_json['alias'],'score':req.post_data_json['score'],'gates':req.post_data_json['gates'],'fragments':req.post_data_json['fragments'],'bonusPoints':req.post_data_json['bonusPoints'],'rank':'SCRIPT KIDDIE','achievedAt':self.page.evaluate('Date.now()'),'own':True}
                    self.receipt = {'accepted':True,'score':req.post_data_json['score'],'version':'pf-2','mode':'normal','day':'','positionAsOf':self.page.evaluate('Date.now()'),'ownEntry':self.own_entry}
                if score_failure and not self.failed_once:
                    self.failed_once = True; route.fulfill(status=503, headers=headers, body='{"message":"Antwort verloren"}'); return
                data = self.receipt
            else:
                entries = [{'position':i+1,'alias':f'Änne_Router_{i:02}','score':250,'gates':25,'fragments':0,'bonusPoints':0,'rank':'SYSADMIN','achievedAt':1791720000000,'own':False} for i in range(20)] if populated else []
                data = {'version':'pf-2','mode':'alltime','day':'','entries':entries,'ownEntry':self.own_entry}
            route.fulfill(status=200, headers=headers, body=json.dumps(data))
        self.context.route('https://packet-flight.test/**', api)
    def test_enabled_api_stays_unused_until_explicit_online_action(self):
        self.online(); self.clock(); self.game()
        self.page.locator('#onlineRun').uncheck()
        self.assertFalse(any(urlparse(url).hostname == 'packet-flight.test' for url in self.requests))
        self.end_run()
        self.assertEqual(self.starts, []); self.assertEqual(self.scores, [])
        self.assertFalse(any(urlparse(url).hostname == 'packet-flight.test' for url in self.requests))
        self.page.locator('#skipScore').click(); self.page.locator('#refreshBoard').click()
        self.page.wait_for_function("document.querySelector('#boardStatus').textContent.includes('Noch keine')")
        self.assertTrue(any('/api/leaderboard?' in url for url in self.requests))
    def test_board_round_trip_while_loading_finishes_the_last_explicit_selection(self):
        self.online(); self.clock(); self.game()
        held=[]; loads=[]
        def delayed(route):
            if route.request.method != 'GET': route.fallback(); return
            loads.append(route.request.url)
            if len(loads)==1: held.append(route)
            else: route.fallback()
        self.context.route('https://packet-flight.test/api/leaderboard?*', delayed)
        self.page.locator('#refreshBoard').click()
        self.page.locator('#todayBoard').click(); self.page.locator('#alltimeBoard').click()
        self.assertEqual(len(held),1)
        held[0].fulfill(status=200,headers={'access-control-allow-origin':BASE,'content-type':'application/json'},
            body=json.dumps({'version':'pf-2','mode':'alltime','day':'','entries':[],'ownEntry':None}))
        self.page.wait_for_function("document.querySelector('#boardStatus').textContent.includes('Noch keine')",timeout=2000)
        self.assertEqual(len(loads),2)
        self.assertFalse(self.page.locator('#refreshBoard').is_disabled())
    def test_voluntary_submission_validation_cancel_and_identical_retry(self):
        self.online(score_failure=True); self.clock(); self.game(); self.end_run()
        self.assertEqual(len(self.scores), 0)
        self.assertFalse(self.page.locator('#enterScore').is_disabled())
        self.page.locator('#enterScore').click(); self.assertEqual(self.state(), 'entry')
        self.assertEqual(self.page.locator('#alias').input_value(), '')
        self.page.locator('#alias').fill('w w'); self.assertEqual(self.state(), 'entry')
        self.page.locator('#cancelEntry').click(); self.assertEqual(len(self.scores), 0)
        self.page.locator('#enterScore').click(); self.page.locator('#alias').fill('<script>')
        self.page.locator('#publish').click(); self.assertEqual(len(self.scores), 0)
        self.assertEqual(self.page.locator('#alias').get_attribute('aria-invalid'), 'true')
        self.page.locator('#alias').fill('  Änne_42  '); self.page.locator('#publish').click()
        self.page.wait_for_function("document.querySelector('#submitStatus').textContent.includes('Keine automatische')")
        self.assertEqual(len(self.scores), 1)
        self.page.locator('#publish').click(); self.page.wait_for_function("document.body.dataset.gameState === 'gameover'")
        self.assertEqual(len(self.scores), 2); self.assertEqual(self.scores[0], self.scores[1])
        self.assertEqual(self.scores[0]['alias'], 'Änne_42')
        self.assertTrue(self.page.locator('#enterScore').is_disabled())
    def test_expired_form_is_reset_for_new_valid_run_and_reopening(self):
        self.online(); self.clock(); self.game(); self.end_run()
        self.page.locator('#enterScore').click(); self.page.locator('#alias').fill('Expired')
        self.page.clock.set_system_time(datetime(2026, 10, 11, 12, 31, tzinfo=timezone.utc))
        self.page.locator('#publish').click()
        self.assertTrue(self.page.locator('#publish').is_disabled()); self.assertEqual(len(self.scores), 0)
        self.page.locator('#cancelEntry').click(); self.assertTrue(self.page.locator('#enterScore').is_disabled())
        self.page.locator('#again').click(); self.page.wait_for_function("document.body.dataset.gameState === 'countdown'")
        self.page.clock.run_for(6000); self.assertEqual(self.state(), 'gameover')
        self.page.locator('#enterScore').click()
        self.assertFalse(self.page.locator('#publish').is_disabled()); self.assertFalse(self.page.locator('#cancelEntry').is_disabled())
        self.assertEqual(self.page.locator('#alias').input_value(), ''); self.assertFalse(self.page.locator('#alias').evaluate('el=>el.readOnly'))
        self.page.locator('#alias').fill('<script>'); self.page.locator('#publish').click()
        self.assertEqual(self.page.locator('#alias').get_attribute('aria-invalid'), 'true')
        self.page.locator('#cancelEntry').click(); self.page.locator('#enterScore').click()
        self.assertIsNone(self.page.locator('#alias').get_attribute('aria-invalid')); self.assertEqual(self.page.locator('#aliasError').inner_text(), '')
        self.assertEqual(self.page.locator('#alias').input_value(), '')
        self.page.locator('#alias').fill('Fresh'); self.page.locator('#publish').click()
        self.page.wait_for_function("document.body.dataset.gameState === 'gameover'")
        self.assertEqual(len(self.scores), 1); self.assertEqual(self.scores[0]['alias'], 'Fresh')
    def test_manual_immutable_retry_after_expiry_and_new_run_reset(self):
        self.online(score_failure=True); self.clock(); self.game(); self.end_run()
        self.page.locator('#enterScore').click(); self.page.locator('#alias').fill('Änne_42'); self.page.locator('#publish').click()
        self.page.wait_for_function("document.querySelector('#submitStatus').textContent.includes('Keine automatische')")
        self.page.clock.set_system_time(datetime(2026, 10, 11, 12, 31, tzinfo=timezone.utc))
        self.assertEqual(len(self.scores), 1, 'No automatic retry on expiry')
        self.page.locator('#cancelEntry').click(); self.assertFalse(self.page.locator('#enterScore').is_disabled())
        self.page.locator('#enterScore').click(); self.assertTrue(self.page.locator('#alias').evaluate('el=>el.readOnly'))
        self.page.evaluate("document.querySelector('#alias').value='Changed'")
        self.page.locator('#publish').click(); self.page.wait_for_function("document.body.dataset.gameState === 'gameover'")
        self.assertEqual(self.scores[0], self.scores[1]); self.assertEqual(len(self.scores), 2)
        self.assertIn('Platz 1', self.page.locator('#submitStatus').inner_text())
        self.page.locator('#again').click(); self.page.wait_for_function("document.body.dataset.gameState === 'countdown'")
        self.page.clock.run_for(6000); self.page.locator('#enterScore').click()
        self.assertEqual(self.page.locator('#alias').input_value(), ''); self.assertFalse(self.page.locator('#alias').evaluate('el=>el.readOnly'))
        self.assertEqual(self.page.locator('#publish').inner_text(), 'ÖFFENTLICH EINTRAGEN'); self.assertFalse(self.page.locator('#publish').is_disabled())
        self.assertEqual(len(self.scores), 2)
    def test_populated_leaderboard_mobile_rank_time_and_own_position(self):
        self.online(populated=True); self.clock(); self.game(); self.end_run()
        self.page.locator('#enterScore').click(); self.page.locator('#alias').fill('My_Profile'); self.page.locator('#publish').click()
        self.page.wait_for_function("document.body.dataset.gameState === 'gameover'")
        self.assertIn('Platz 22', self.page.locator('#submitStatus').inner_text())
        self.page.locator('#skipScore').click()
        self.page.wait_for_function("document.querySelector('#ownPosition').textContent.includes('Platz 22')")
        self.assertEqual(self.page.locator('#boardEntries li').count(), 20)
        self.assertIn('außerhalb der Top 20', self.page.locator('#ownPosition').inner_text())
        self.assertIn('SCRIPT KIDDIE', self.page.locator('#ownPosition').inner_text())
        for width, height in [(320,568),(390,844),(430,932),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.locator('#leaderboard').scroll_into_view_if_needed()
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
            board = self.page.locator('#leaderboard').bounding_box()
            for box in self.page.locator('.board-line, .board-details, #ownPosition').evaluate_all('els=>els.map(el=>el.getBoundingClientRect().toJSON())'):
                self.assertLessEqual(box['right'], board['x']+board['width']+.5); self.assertGreaterEqual(box['left'], board['x']-.5)
            self.assertIn('SYSADMIN', self.page.locator('#boardEntries li').first.inner_text())
            self.assertIn('11.10.2026', self.page.locator('#boardEntries time').first.inner_text()); self.assertIn('UTC', self.page.locator('#boardEntries time').first.inner_text())
            self.page.locator('#leaderboard').screenshot(path=str(ARTIFACTS/f'leaderboard-{width}x{height}.png'))
        self.page.set_viewport_size({'width':320,'height':568})
        self.page.evaluate("document.documentElement.style.zoom='2'")
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), self.page.evaluate('document.documentElement.clientWidth'))
        self.page.locator('#leaderboard').screenshot(path=str(ARTIFACTS/'leaderboard-zoom-200.png'))
    def test_failed_start_stays_local(self):
        self.online(start_failure=True); self.clock(); self.game(); self.end_run()
        self.assertTrue(self.page.locator('#enterScore').is_disabled())
        self.assertEqual(len(self.scores), 0); self.assertIn('nur lokal', self.page.locator('#publishQuestion').inner_text())
    def test_offline_reload(self):
        # Separate context explicitly enables the real game-only service worker.
        ctx = self.browser.new_context(reduced_motion='reduce')
        page = ctx.new_page(); page.goto(BASE + '/game.html')
        page.wait_for_function('navigator.serviceWorker.controller !== null')
        page.evaluate('navigator.serviceWorker.ready')
        ctx.set_offline(True); page.reload(wait_until='load')
        page.wait_for_selector('#gameUI:not([hidden])')
        self.assertEqual(page.locator('body').get_attribute('data-game-state'), 'ready')
        page.locator('#start').click(); self.assertEqual(page.locator('body').get_attribute('data-game-state'), 'countdown')
        ctx.close()
    def test_visual_layouts_zoom_reduced_motion_and_navigation(self):
        for width, height in [(320,568),(390,844),(430,932),(768,1024),(1440,900),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height}); self.game()
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
            self.assertTrue(self.page.evaluate("[...document.querySelectorAll('[id]')].map(e=>e.id).every((id,i,a)=>a.indexOf(id)===i)"))
            sizes = self.page.locator('button:not([hidden]), .mode-picker label, select').evaluate_all('els=>els.filter(el=>el.getBoundingClientRect().height).map(el=>el.getBoundingClientRect().height)')
            self.assertTrue(all(size >= 43.9 for size in sizes), sizes)
            self.page.screenshot(path=str(ARTIFACTS/f'game-{width}x{height}.png'), full_page=True)
        self.page.set_viewport_size({'width':320,'height':568}); self.clock(); self.game(); self.end_run()
        self.assertLessEqual(self.page.locator('#resultDialog').bounding_box()['height'], 568*.9)
        self.page.screenshot(path=str(ARTIFACTS/'game-over-320.png'), full_page=True)
        self.page.locator('#skipScore').click()
        self.page.evaluate("document.documentElement.style.zoom='2'")
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), self.page.evaluate('document.documentElement.clientWidth'))
        self.page.screenshot(path=str(ARTIFACTS/'game-zoom-200.png'), full_page=True)
        self.page.evaluate("document.documentElement.style.zoom='1'")
        session = self.context.new_cdp_session(self.page)
        session.send('Emulation.setPageScaleFactor', {'pageScaleFactor':2})
        self.assertEqual(self.page.evaluate('visualViewport.scale'), 2)
        self.page.screenshot(path=str(ARTIFACTS/'game-pinch-zoom-200.png'))
        session.send('Emulation.setPageScaleFactor', {'pageScaleFactor':1})
        self.page.goto(BASE + '/'); self.page.evaluate('document.fonts.ready')
        term = self.page.locator('#term').bounding_box()
        for selector in ['#termForm', '.term-send', '.term-chip', '#termOut']:
            for box in self.page.locator(selector).evaluate_all('els=>els.map(el=>el.getBoundingClientRect().toJSON())'):
                self.assertLessEqual(box['right'], term['x'] + term['width'] + .5, selector)
        self.page.screenshot(path=str(ARTIFACTS/'home-mobile.png'), full_page=True)
        self.assertEqual(self.page.locator('a[href*="game.html"]').count(), 0)
        self.page.locator('#termIn').fill('play'); self.page.locator('#termIn').press('Enter'); self.page.wait_for_url(BASE + '/game.html')
        self.page.go_back(); self.page.go_forward()
        self.assertEqual(self.state(), 'ready')
        ctx = self.browser.new_context(java_script_enabled=False)
        page = ctx.new_page(); page.goto(BASE + '/')
        self.assertTrue(page.locator('#store').is_visible()); ctx.close()

if __name__ == '__main__': unittest.main(verbosity=2)
