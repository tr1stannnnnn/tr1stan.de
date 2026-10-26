"""Actual Chromium storage/worker upgrades and terminal touch/keyboard regressions."""
import json
import subprocess
import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8000'
CHOICE = 'tr1stan.packet-flight.storage-choice-1'
KEY = 'tr1stan.packet-flight.pf-2.storage-1'
LEGACY = 'tr1stan.packet-flight.pf-1.storage-1'

class PrivacyNavigationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
    def setUp(self):
        self.ctx = self.browser.new_context(reduced_motion='reduce')
        self.page = self.ctx.new_page()
        self.errors=[]
        self.page.on('pageerror', lambda e:self.errors.append(str(e)))
    def tearDown(self):
        self.ctx.close(); self.assertEqual(self.errors, [])
    def game(self):
        self.page.goto(BASE + '/game.html'); self.page.wait_for_selector('#gameUI:not([hidden])')
    def ready_cache(self):
        self.page.wait_for_function("document.querySelector('#offlineReady').textContent.includes('für Offline-Nutzung gespeichert')")
    def test_initial_ram_only_does_not_read_existing_records(self):
        self.page.goto(BASE + '/')
        self.page.evaluate("([key,old])=>localStorage.setItem(key,JSON.stringify(old))", [LEGACY,{'normal':42,'highest':42,'daily':{}}])
        self.ctx.add_init_script("""const get=Storage.prototype.getItem, set=Storage.prototype.setItem;
          window.storageReads=[]; window.storageWrites=[];
          Storage.prototype.getItem=function(k){storageReads.push(k);return get.call(this,k)};
          Storage.prototype.setItem=function(k,v){storageWrites.push(k);return set.call(this,k,v)};""")
        self.game(); self.page.locator('#mute').click()
        self.assertEqual(self.page.evaluate('storageReads'),[CHOICE])
        self.assertEqual(self.page.evaluate('storageWrites'),[])
        self.assertEqual(self.page.evaluate('caches.keys()'),[])
        self.assertEqual(self.page.evaluate('navigator.serviceWorker.getRegistrations().then(r=>r.length)'),0)
        self.assertTrue(self.page.locator('#legacyRecords').is_hidden())
        self.page.reload(); self.page.wait_for_selector('#gameUI:not([hidden])')
        self.assertEqual(self.page.locator('#mute').get_attribute('aria-pressed'),'false')
    def test_restore_revoke_reenable_keeps_records_and_removes_cache(self):
        self.page.goto(BASE + '/')
        old={'normal':42,'highest':42,'daily':{'2026-10-11':11}}
        self.page.evaluate("([k,v])=>localStorage.setItem(k,JSON.stringify(v))",[LEGACY,old])
        self.game(); self.page.locator('#keepStorage').check(); self.ready_cache()
        self.assertIn('Normal 42',self.page.locator('#legacyRecords').inner_text())
        snapshot=self.page.evaluate('(k)=>localStorage.getItem(k)',KEY)
        self.page.reload(); self.ready_cache()
        self.assertTrue(self.page.locator('#keepStorage').is_checked())
        self.page.locator('#keepStorage').uncheck()
        self.page.wait_for_function("document.querySelector('#offlineReady').textContent.includes('Offline-Cache entfernt')")
        self.page.locator('#mute').click()
        self.assertEqual(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY),snapshot)
        self.assertEqual(self.page.evaluate('caches.keys()'),[])
        # Old controlled tab must not recreate a deleted shell on failed fetch.
        self.ctx.set_offline(True)
        self.assertTrue(self.page.evaluate("fetch('/game/render.mjs?v=pf2-privacy1',{cache:'no-store'}).then(()=>false,()=>true)"))
        self.assertEqual(self.page.evaluate('caches.keys()'),[])
        self.ctx.set_offline(False)
        self.page.locator('#keepStorage').check(); self.ready_cache()
        self.assertEqual(json.loads(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY))['legacy']['normal'],42)
        self.assertEqual(json.loads(self.page.evaluate('(k)=>localStorage.getItem(k)',LEGACY)),old)
        self.ctx.set_offline(True); self.page.reload(wait_until='load')
        self.page.wait_for_selector('#gameUI:not([hidden])')
        self.assertTrue(self.page.locator('#keepStorage').is_checked())
        self.page.locator('#keepStorage').uncheck()
        self.page.wait_for_function("document.querySelector('#offlineReady').textContent.includes('Offline-Cache entfernt')")
        self.assertEqual(self.page.evaluate('caches.keys()'),[])
    def test_revoke_propagates_to_another_open_tab(self):
        self.game(); self.page.locator('#keepStorage').check(); self.ready_cache()
        other=self.ctx.new_page(); other.goto(BASE+'/game.html')
        other.wait_for_function("document.querySelector('#keepStorage').checked")
        self.page.locator('#keepStorage').uncheck()
        other.wait_for_function("!document.querySelector('#keepStorage').checked")
        other.wait_for_function("document.querySelector('#offlineReady').textContent.includes('Offline-Cache entfernt')")
        self.assertEqual(other.evaluate('caches.keys()'),[])
    def test_old_automatic_service_worker_is_upgraded_without_consent(self):
        old_sw=subprocess.check_output(['git','show','34e47d6:game-sw.js'],cwd=ROOT,text=True)
        class Handler(SimpleHTTPRequestHandler):
            live=False
            def log_message(self,*args): pass
            def do_GET(self):
                if self.path.split('?')[0]=='/game-sw.js' and not Handler.live:
                    body=old_sw.encode();self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
                else: super().do_GET()
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            url=f'http://127.0.0.1:{server.server_port}'
            self.page.goto(url+'/index.html')
            self.page.evaluate("navigator.serviceWorker.register('/game-sw.js').then(()=>navigator.serviceWorker.ready)")
            self.page.wait_for_function('navigator.serviceWorker.controller !== null')
            self.assertTrue(self.page.evaluate('caches.keys()'))
            self.page.evaluate("([k,v])=>localStorage.setItem(k,v)",[LEGACY,'{"normal":73,"daily":{}}'])
            Handler.live=True
            self.page.goto(url+'/game.html')
            self.page.wait_for_function("document.querySelector('#offlineReady').textContent.includes('Offline-Cache entfernt')")
            self.assertFalse(self.page.locator('#keepStorage').is_checked())
            self.assertEqual(self.page.evaluate('caches.keys()'),[])
            self.assertEqual(self.page.evaluate('navigator.serviceWorker.getRegistrations().then(r=>r.length)'),0)
            self.assertEqual(self.page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).normal',LEGACY),73)
        finally: server.shutdown();server.server_close()
    def test_terminal_touch_reflow_targets_and_keyboard(self):
        out=Path('/tmp/packet-flight-review');out.mkdir(exist_ok=True)
        for width in [320,390]:
            ctx=self.browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
            page=ctx.new_page()
            for command,suffix in [('play','/game.html'),('play --daily','/game.html?mode=daily'),('leaderboard','/game.html#leaderboard')]:
                page.goto(BASE+'/');page.evaluate('document.fonts.ready')
                self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
                boxes=page.locator('.term-chip').evaluate_all('es=>es.map(e=>e.getBoundingClientRect().toJSON())')
                self.assertGreater(len(set(round(b['top']) for b in boxes)),1)
                self.assertTrue(all(b['height']>=44 and b['width']>=44 and b['right']<=width for b in boxes))
                self.assertEqual(page.locator('#termChips button').count(),12)
                self.assertEqual(page.locator('a[href*="game.html"], .home-actions').count(),0)
                # All chips execute, retain native focus and never focus the input.
                page.locator('.term-chip').filter(has_text='about').tap()
                self.assertNotEqual(page.evaluate('document.activeElement.id'),'termIn')
                page.locator('#term').screenshot(path=str(out/f'terminal-shortcuts-{width}.png'))
                page.get_by_role('button',name=command,exact=True).tap();page.wait_for_url(BASE+suffix)
                if command=='play --daily': self.assertTrue(page.locator('[name="mode"][value="daily"]').is_checked())
                if command=='leaderboard': self.assertEqual(page.evaluate('location.hash'),'#leaderboard')
            ctx.close()
        for key in ['Enter','Space']:
            self.page.goto(BASE+'/')
            b=self.page.get_by_role('button',name='play --daily',exact=True);b.focus()
            self.page.keyboard.press('Tab');self.assertEqual(self.page.evaluate('document.activeElement.textContent'),'leaderboard')
            self.page.keyboard.press('Shift+Tab');b.press(key);self.page.wait_for_url(BASE+'/game.html?mode=daily')

if __name__=='__main__': unittest.main(verbosity=2)
