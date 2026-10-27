"""Cloud-only archive/version/storage UI; no production API traffic."""
import json
import unittest
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8000'
OLD='tr1stan.packet-flight.pf-2.storage-1'
NEW='tr1stan.packet-flight.pf-3.storage-1'
CHOICE='tr1stan.packet-flight.storage-choice-1'
class ArchiveTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.ctx=self.browser.new_context(service_workers='block',reduced_motion='reduce');self.page=self.ctx.new_page();self.errors=[];self.production=[];self.loads=[]
  self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  self.ctx.route('https://*.workers.dev/**',lambda r:(self.production.append(r.request.url),r.abort('blockedbyclient')))
  self.ctx.route('**/game/pf3/config.mjs*',lambda r:r.fulfill(content_type='text/javascript',body="export const API_URL='https://packet-flight.test';"))
  self.ctx.route('https://packet-flight.test/**',self.api)
 def tearDown(self):self.ctx.close();self.assertEqual(self.errors,[]);self.assertEqual(self.production,[])
 def answer(self,route,mode,day='',alias='Older_Score',version='pf-2'):
  entry={'position':1,'alias':alias,'score':192,'gates':18,'fragments':3,'bonusPoints':12,'rank':'PACKET ROUTER','achievedAt':1793092811119,'own':False}
  route.fulfill(status=200,headers={'Access-Control-Allow-Origin':BASE,'Content-Type':'application/json'},body=json.dumps({'version':version,'mode':mode,'day':day,'entries':[entry],'ownEntry':None}))
 def api(self,route):
  q=parse_qs(urlsplit(route.request.url).query);self.loads.append(q)
  self.assertNotIn('x-player-id',route.request.headers)
  self.answer(route,q['mode'][0],q.get('day',[''])[0])
 def archive(self):
  self.page.clock.install(time=datetime(2026,10,27,12,tzinfo=timezone.utc));self.page.goto(BASE+'/game/archive.html')
 def test_archive_normal_daily_dates_are_explicit_separate_and_lazy_without_storage(self):
  self.ctx.add_init_script("window.reads=[];window.writes=[];const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(k){reads.push(k);return get.call(this,k)};Storage.prototype.setItem=function(k,v){writes.push(k);return set.call(this,k,v)}")
  self.archive();self.assertEqual(self.loads,[]);self.assertTrue(self.page.locator('#archiveDayChoice').is_hidden())
  self.page.locator('#archiveMode').select_option('daily');self.page.locator('#archiveDay').fill('2026-10-26');self.page.locator('#archiveDay').dispatch_event('change')
  self.assertEqual(self.loads,[]);self.assertIn('2026-10-26',self.page.locator('#archiveExplanation').inner_text())
  self.page.locator('#loadArchive').click();self.page.wait_for_selector('#archiveEntries li')
  self.assertEqual(self.loads[0],{'mode':['daily'],'version':['pf-2'],'day':['2026-10-26']})
  self.assertIn('Alte Wertung pf-2',self.page.locator('#archiveStatus').inner_text())
  self.assertEqual(self.page.evaluate('reads'),[]);self.assertEqual(self.page.evaluate('writes'),[])
  self.page.locator('#archiveMode').select_option('alltime');self.assertEqual(self.page.locator('#archiveEntries li').count(),0)
  self.page.locator('#loadArchive').click();self.page.wait_for_selector('#archiveEntries li');self.assertEqual(self.loads[-1],{'mode':['alltime'],'version':['pf-2']})
 def test_archive_late_response_and_wrong_date_cannot_paint_another_scope(self):
  held=[];self.ctx.route('https://packet-flight.test/**',lambda r:held.append(r));self.archive()
  self.page.locator('#loadArchive').click();self.page.locator('#archiveMode').select_option('daily')
  self.answer(held.pop(),'alltime',alias='Late_Normal')
  self.page.wait_for_function("!document.querySelector('#loadArchive').disabled")
  self.assertEqual(self.page.locator('#archiveEntries li').count(),0)
  self.page.locator('#archiveDay').fill('2026-10-26');self.page.locator('#archiveDay').dispatch_event('change');self.page.locator('#loadArchive').click()
  self.answer(held.pop(),'daily','2026-10-27',alias='Wrong_Day')
  self.page.wait_for_function("document.querySelector('#archiveStatus').textContent.includes('Ungültige Rangliste')")
  self.assertEqual(self.page.locator('#archiveEntries li').count(),0)
 def test_persisted_pf2_best_is_archive_only_preserving_original_raw_value_and_settings(self):
  old={'normal':192,'daily':{'2026-10-27':86},'highest':50,'skin':'root','muted':True,'playerId':'12345678-1234-4234-8234-123456789abc','stats':{'runs':9,'gates':84,'points':1920,'fragments':10}}
  self.page.goto(BASE+'/');raw=json.dumps(old)
  self.page.evaluate('([key,raw,choice])=>{localStorage.setItem(key,raw);localStorage.setItem(choice,"yes")}',[OLD,raw,CHOICE])
  self.page.goto(BASE+'/game.html');self.page.wait_for_selector('#gameUI:not([hidden])')
  self.assertEqual(self.page.locator('#best').inner_text(),'0');self.assertTrue(self.page.locator('#keepStorage').is_checked())
  self.assertIn('pf-2 · Normal192'.replace('Normal192','Normal 192'),self.page.locator('#legacyRecords').inner_text())
  self.assertEqual(self.page.locator('#skin').input_value(),'root');self.assertEqual(self.page.locator('#mute').get_attribute('aria-pressed'),'true')
  self.assertEqual(self.page.evaluate('(k)=>localStorage.getItem(k)',OLD),raw)
  data=self.page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',NEW)
  self.assertEqual(data['normal'],0);self.assertEqual(data['daily'],{});self.assertEqual(data['archives']['pf-2']['daily'],old['daily'])
  self.assertEqual(data['playerId'],old['playerId'])
  self.page.locator('#keepStorage').uncheck();self.page.reload();self.page.wait_for_selector('#gameUI:not([hidden])')
  self.assertFalse(self.page.locator('#keepStorage').is_checked());self.assertTrue(self.page.locator('#legacyRecords').is_hidden())
  self.assertEqual(self.page.evaluate('(k)=>localStorage.getItem(k)',OLD),raw)
 def test_archive_reflow_mobile_desktop_zoom_and_native_keys(self):
  self.archive()
  for width in[320,390,1440]:
   self.page.set_viewport_size({'width':width,'height':900});self.page.locator('#archiveMode').select_option('daily')
   for zoom in[1,2]:
    self.page.evaluate('(z)=>document.documentElement.style.zoom=String(z)',zoom)
    self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),self.page.evaluate('document.documentElement.clientWidth'))
   self.page.evaluate("document.documentElement.style.zoom='1'")
  self.page.locator('#loadArchive').focus();self.page.keyboard.press('Enter');self.page.wait_for_selector('#archiveEntries li')
  self.assertIn('192',self.page.locator('#archiveEntries').inner_text())
if __name__=='__main__':unittest.main(verbosity=2)
