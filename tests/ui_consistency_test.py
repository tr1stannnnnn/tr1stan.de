"""Cloud-only UI regressions; synthetic local192 fixture never reaches an API."""
import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import browser_test as bt

ROOT=Path(__file__).resolve().parents[1]
BASE=bt.BASE
OUT=Path('/tmp/pf2-ux-release');OUT.mkdir(exist_ok=True)

class UIConsistencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw=sync_playwright().start()
        cls.browser=cls.pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):cls.browser.close();cls.pw.stop()
    def setUp(self):
        self.context=self.browser.new_context(reduced_motion='reduce',service_workers='block')
        self.page=self.context.new_page();self.errors=[];self.production=[];self.requests=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.on('request',lambda r:self.requests.append(r.url))
        self.context.route('https://*.workers.dev/**',self.reject_production)
    def reject_production(self,route):self.production.append(route.request.url);route.abort('blockedbyclient')
    def tearDown(self):
        self.context.close();self.assertEqual(self.errors,[]);self.assertEqual(self.production,[])
    game=bt.BrowserTests.game
    clock=bt.BrowserTests.clock
    state=bt.BrowserTests.state
    online=bt.BrowserTests.online
    def fixture(self):
        # Explicit synthetic *local* result to test the reported exact192 HUD bug.
        # Actual physics/input and authenticated scoring are covered in other suites.
        source=(ROOT/'game/pf3/app.mjs').read_text()+'''
window.__uiFixture = {
  prior() { records.data.daily[currentDay]=73; records.data.highest=50; records.data.skin='root'; records.data.muted=true; skins(); best(); },
  finish192() {
    if (state!=='running' || run.online) throw Error('Fixture only permits an isolated local run');
    Object.assign(flight,{score:192,gatesPassed:18,fragments:3,bonusPoints:12,combo:3,alarm:2,hazard:{kind:'laser',phase:'active',age:2,side:1,target:414,beamY:414}});
    $('score').textContent='192';updateRoute();flight.end('ISOLATED UI FIXTURE');finish();
  },
  snapshot() { return {score:flight.score,gates:flight.gatesPassed,combo:flight.combo,hazard:flight.hazard,alarm:flight.alarm,y:flight.y,ticks:flight.ticks,dead:flight.dead,effects:{time:effects.time,broken:effects.broken,counts:[effects.particles.length,effects.trail.length,effects.rings.length,effects.labels.length,effects.gates.length]},records:{normal:records.data.normal,daily:records.data.daily,highest:records.data.highest,skin:records.data.skin,muted:records.data.muted}}; }
};
'''
        self.context.route('**/game/pf3/app.mjs*',lambda r:r.fulfill(content_type='text/javascript',body=source))
    def finish192(self,dialog=True):
        self.fixture();self.clock();self.game();self.page.evaluate('__uiFixture.prior()')
        self.page.locator('#start').click();self.page.clock.run_for(1700)
        self.page.evaluate('__uiFixture.finish192()')
        if dialog:self.page.clock.run_for(500)
        self.assertEqual(self.page.locator('#resultScore').inner_text(),'192')
        self.assertEqual(self.page.locator('#best').inner_text(),'192')
    def assert_fresh(self,best='192'):
        self.assertEqual(self.state(),'ready')
        self.assertEqual(self.page.locator('#score').inner_text(),'0')
        self.assertEqual(self.page.locator('#best').inner_text(),best)
        self.assertEqual(self.page.locator('#gateCount').inner_text(),'0 GATES')
        self.assertEqual(self.page.locator('#combo').inner_text(),'COMBO —')
        self.assertEqual(self.page.locator('#stateBadge').inner_text(),'BEREIT')
        snapshot=self.page.evaluate('__uiFixture.snapshot()')
        self.assertEqual([snapshot['score'],snapshot['gates'],snapshot['combo'],snapshot['alarm'],snapshot['ticks']],[0]*5)
        self.assertIsNone(snapshot['hazard']);self.assertFalse(snapshot['dead'])
        self.assertEqual(snapshot['effects'],{'time':0,'broken':False,'counts':[0]*5})
        self.assertEqual(snapshot['records']['highest'],50);self.assertEqual(snapshot['records']['skin'],'root')
        self.assertTrue(snapshot['records']['muted'])
        self.assertIn('Goldene Fragmente',self.page.locator('#threatStatus').inner_text())
    def test_192_result_skip_resets_scene_and_preserves_records_skins(self):
        self.finish192();self.assertEqual(self.page.locator('#score').inner_text(),'192')
        self.page.locator('#skipScore').click();self.page.clock.run_for(50);self.assert_fresh()
        self.assertFalse(self.page.locator('#resultDialog').evaluate('d=>d.open'))
        self.page.locator('.flight-panel').screenshot(path=str(OUT/'ready-after-192.png'))
    def test_192_result_escape_and_native_close_return_to_fresh_ready(self):
        self.finish192();self.page.keyboard.press('Escape');self.page.clock.run_for(50);self.assert_fresh()
        self.page.locator('#start').click();self.page.clock.run_for(1700)
        self.page.evaluate('__uiFixture.finish192()');self.page.clock.run_for(500)
        self.page.evaluate("document.querySelector('#resultDialog').close()")
        self.page.clock.run_for(50);self.assert_fresh()
    def test_mode_switch_in_result_reveal_clears_192_and_separates_bests(self):
        self.finish192(dialog=False)
        self.page.locator('[name=mode][value=daily]').check();self.page.clock.run_for(50)
        self.assert_fresh(best='73');self.assertFalse(self.page.locator('#resultDialog').evaluate('d=>d.open'))
        self.assert_selected('daily');self.page.locator('[name=mode][value=normal]').check()
        self.assert_fresh();self.assert_selected('normal')
    def test_restart_clears_current_score_pause_resume_keeps_progress(self):
        self.finish192();self.page.locator('#again').click()
        self.assertEqual(self.state(),'countdown');self.assertEqual(self.page.locator('#score').inner_text(),'0')
        self.assertEqual(self.page.locator('#best').inner_text(),'192')
        self.page.clock.run_for(1700);self.page.locator('#pause').click()
        before=self.page.evaluate('__uiFixture.snapshot()');self.page.clock.run_for(4000)
        self.assertEqual(self.page.evaluate('__uiFixture.snapshot()'),before)
        self.page.locator('#start').click();self.assertEqual(self.state(),'countdown')
        self.page.clock.run_for(1000);self.assertEqual(self.page.evaluate('__uiFixture.snapshot()'),before)
    def assert_selected(self,mode):
        daily=mode=='daily'
        self.assertEqual(self.page.locator('#todayBoard').get_attribute('aria-pressed'),str(daily).lower())
        self.assertEqual(self.page.locator('#alltimeBoard').get_attribute('aria-pressed'),str(not daily).lower())
        self.assertEqual(self.page.locator('#todayBoard').inner_text(),'DAILY · HEUTE')
        self.assertEqual(self.page.locator('#alltimeBoard').inner_text(),'NORMAL · ALLZEIT')
        self.assertEqual(self.page.locator('#boardDate').is_visible(),daily)
        self.assertIn('Nur Daily-Runs' if daily else 'Normale Runs aller Tage',self.page.locator('#boardDescription').inner_text())
        if daily:self.assertIn('00:00 UTC',self.page.locator('#boardDate').inner_text())
    def test_initial_normal_daily_urls_and_game_modes_keep_board_lazy(self):
        self.online();self.clock()
        for mode in ['normal','daily']:
            self.game('/game.html?mode='+mode);self.assert_selected(mode)
            self.assertFalse(any('/api/leaderboard' in url for url in self.requests))
            opposite='normal' if mode=='daily' else 'daily'
            self.page.locator('[name=mode][value='+opposite+']').check();self.assert_selected(opposite)
            self.assertFalse(any('/api/leaderboard' in url for url in self.requests))
            self.page.locator('#todayBoard' if opposite=='normal' else '#alltimeBoard').click()
            self.assert_selected(mode);self.assertFalse(any('/api/leaderboard' in url for url in self.requests))
        self.page.locator('#refreshBoard').click()
        self.page.wait_for_function("document.querySelector('#boardStatus').textContent.includes('Noch keine')")
        self.page.locator('[name=mode][value=daily]').check()
        self.page.locator('[name=mode][value=normal]').check();self.assert_selected('normal')
        self.page.wait_for_function("document.querySelector('#boardStatus').textContent.includes('NORMAL · ALLZEIT')")
        self.assertEqual(len([u for u in self.requests if '/api/leaderboard?' in u]),2)
    def board_entry(self,alias):
        return {'position':1,'alias':alias,'score':10,'gates':1,'fragments':0,'bonusPoints':0,'rank':'SCRIPT KIDDIE','achievedAt':1791720000000,'own':False}
    def fulfill_board(self,route,mode,alias,day='2026-10-11'):
        route.fulfill(status=200,headers={'Access-Control-Allow-Origin':BASE,'Content-Type':'application/json'},body=json.dumps({'version':'pf-3','mode':mode,'day':day if mode=='daily' else '','entries':[self.board_entry(alias)],'ownEntry':None}))
    def test_late_daily_reply_never_paints_under_normal_and_final_reload_wins(self):
        self.online();self.clock();self.game();held=[];loads=[]
        def route_api(route):
            if route.request.method!='GET':route.fallback();return
            mode='daily' if 'mode=daily' in route.request.url else 'alltime';loads.append(mode)
            if mode=='daily':held.append(route)
            else:self.fulfill_board(route,mode,'Normal_Fresh')
        self.context.route('https://packet-flight.test/api/leaderboard?*',route_api)
        self.page.locator('#refreshBoard').click();self.page.wait_for_selector('#boardEntries li')
        self.page.evaluate("window.boardPaints=[];new MutationObserver(()=>boardPaints.push(document.querySelector('#boardEntries').textContent)).observe(document.querySelector('#boardEntries'),{subtree:true,childList:true})")
        self.page.locator('#todayBoard').click();self.assert_selected('daily')
        self.assertEqual(self.page.locator('#boardEntries li').count(),0)
        self.page.locator('#alltimeBoard').click();self.assert_selected('normal')
        self.fulfill_board(held[0],'daily','Late_Daily')
        self.page.wait_for_function("document.querySelector('#boardEntries').textContent.includes('Normal_Fresh')")
        self.assertFalse(any('Late_Daily' in s for s in self.page.evaluate('boardPaints')))
        self.assertEqual(loads,['alltime','daily','alltime'])
        self.assertTrue(self.page.locator('#boardDate').is_hidden())
    def test_old_reply_after_game_mode_change_uses_current_daily_scope(self):
        self.online();self.clock();self.game();held=[]
        def route_api(route):
            if route.request.method!='GET':route.fallback();return
            if 'mode=alltime' in route.request.url:held.append(route)
            else:self.fulfill_board(route,'daily','Current_Daily')
        self.context.route('https://packet-flight.test/api/leaderboard?*',route_api)
        self.page.locator('#refreshBoard').click();self.page.wait_for_function("document.querySelector('#refreshBoard').disabled")
        self.page.locator('[name=mode][value=daily]').check();self.assert_selected('daily')
        self.fulfill_board(held[0],'alltime','Old_Normal')
        self.page.wait_for_function("document.querySelector('#boardEntries').textContent.includes('Current_Daily')")
        self.assertNotIn('Old_Normal',self.page.locator('#boardEntries').inner_text())
        self.assertIn('2026-10-11',self.page.locator('#boardDate').inner_text())
    def test_utc_rollover_clears_old_day_and_rejects_late_daily_response(self):
        self.online();self.page.clock.install(time=datetime(2026,10,11,23,59,59,tzinfo=timezone.utc));self.game('/game.html?mode=daily')
        held=[]
        self.context.route('https://packet-flight.test/api/leaderboard?*',lambda r:held.append(r) if r.request.method=='GET' else r.fallback())
        self.page.locator('#refreshBoard').click();self.page.clock.run_for(2000)
        self.assertIn('2026-10-12',self.page.locator('#boardDate').inner_text())
        self.fulfill_board(held[0],'daily','Previous_Day')
        self.page.wait_for_function("!document.querySelector('#refreshBoard').disabled")
        self.assertEqual(self.page.locator('#boardEntries li').count(),0);self.assertEqual(len(held),1)
        self.page.locator('#refreshBoard').click()
        self.fulfill_board(held[1],'daily','Today_Daily',day='2026-10-12')
        self.page.wait_for_selector('#boardEntries li');self.assert_selected('daily')
        self.assertIn('Today_Daily',self.page.locator('#boardEntries').inner_text())
        self.assertIn('2026-10-12',self.page.locator('#boardDate').inner_text())
    def test_existing_decline_and_blocked_storage_remain_ram_without_auto_opt_in(self):
        self.page.goto(BASE+'/');self.page.evaluate("localStorage.setItem('tr1stan.packet-flight.storage-choice-1','no')")
        self.clock();self.game();self.assertFalse(self.page.locator('#keepStorage').is_checked())
        self.assertIn('empfohlen',self.page.locator('.online-choice').inner_text())
        self.assertIn('Das veröffentlicht keine Scores',self.page.locator('#storageChoiceHint').inner_text())
        self.page.reload();self.assertFalse(self.page.locator('#keepStorage').is_checked())
        self.context.add_init_script("Object.defineProperty(window,'localStorage',{get:()=>({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}})})")
        self.page.reload();self.assertFalse(self.page.locator('#keepStorage').is_checked())
        self.page.locator('#keepStorage').click();self.assertFalse(self.page.locator('#keepStorage').is_checked())
        self.assertTrue(self.page.locator('#storageNotice').is_visible())
        self.page.locator('#start').click();self.page.clock.run_for(6000)
        self.assertEqual(self.state(),'gameover')
    def test_recommendations_reflow_mobile_desktop_zoom_and_keyboard(self):
        self.online();self.clock()
        for width,height in [(320,844),(390,844),(1440,1000)]:
            self.page.set_viewport_size({'width':width,'height':height});self.game('/game.html?mode=daily')
            self.assertIn('MIT RANGLISTE STARTEN · EMPFOHLEN',self.page.locator('#startOnline').inner_text())
            self.assertEqual(self.page.locator('#startRecommendation').inner_text(),'Damit kannst du deinen Score nach dem Spiel freiwillig in die Rangliste eintragen. Ohne Anmeldung.')
            for zoom in [1,2]:
                self.page.evaluate('(z)=>document.documentElement.style.zoom=String(z)',zoom)
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),self.page.evaluate('document.documentElement.clientWidth'))
                for selector in ['#startOnline','#start','#todayBoard','#alltimeBoard']:
                    self.assertTrue(self.page.locator(selector).is_visible())
                    self.assertTrue(self.page.locator(selector).evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
                self.assert_selected('daily')
            self.page.evaluate("document.documentElement.style.zoom='1'")
            self.page.locator('.flight-actions').screenshot(path=str(OUT/f'recommended-start-{width}.png'))
            self.page.locator('#leaderboard').screenshot(path=str(OUT/f'daily-board-{width}.png'))
        self.page.locator('#startOnline').focus();self.page.keyboard.press('Tab');self.assertEqual(self.page.evaluate('document.activeElement.id'),'start')
        self.page.keyboard.press('Shift+Tab');self.page.keyboard.press('Enter')
        self.page.wait_for_function("document.body.dataset.gameState==='countdown'")
        self.page.clock.run_for(6000);self.assertTrue(self.page.locator('#enterScore').is_enabled())
        self.page.locator('#enterScore').focus();self.page.keyboard.press('Space');self.assertEqual(self.state(),'entry')

if __name__=='__main__':unittest.main(verbosity=2)
