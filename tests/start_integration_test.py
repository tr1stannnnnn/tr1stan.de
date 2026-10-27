"""Two real-time browser runs against workerd + ephemeral D1, never production."""
import json
import os
import select
import subprocess
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:8000'

class StartIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        env={k:v for k,v in os.environ.items() if k not in ['CLOUDFLARE_API_TOKEN','GH_TOKEN','GITHUB_TOKEN']}
        cls.log=open('/tmp/pf2-start-isolated-worker.log','w')
        cls.server=subprocess.Popen(['node','tests/local_leaderboard.mjs'],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=cls.log,text=True)
        if not select.select([cls.server.stdout],[],[],30)[0]:
            cls.server.terminate(); raise RuntimeError('Isolated workerd did not become ready')
        ready=json.loads(cls.server.stdout.readline()); assert ready['ready']
        cls.api_url=ready['url']; assert urlsplit(cls.api_url).hostname=='127.0.0.1'
        cls.pw=sync_playwright().start()
        cls.browser=cls.pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.terminate();cls.server.wait(timeout=15);cls.server.stdout.close();cls.log.close()
    def run_mode(self,mode):
        ctx=self.browser.new_context(reduced_motion='reduce',service_workers='block')
        ctx.route('**/game/config.mjs*',lambda route:route.fulfill(content_type='text/javascript',body="export const API_URL='https://packet-flight.test';"))
        page=ctx.new_page();errors=[];starts=[];scores=[];statuses=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def bridge(route):
            req=route.request; url=urlsplit(req.url)
            headers={k:v for k,v in req.headers.items() if k.lower() in ['origin','content-type','x-player-id','access-control-request-method','access-control-request-headers']}
            request=urllib.request.Request(self.api_url+url.path+('?' + url.query if url.query else ''),method=req.method,headers=headers,data=req.post_data_buffer)
            try: response=urllib.request.urlopen(request,timeout=15)
            except urllib.error.HTTPError as error: response=error
            body=response.read(); status=response.status
            statuses.append(status)
            if req.method=='POST' and url.path=='/api/run/start': starts.append(json.loads(body))
            if req.method=='POST' and url.path=='/api/score': scores.append(json.loads(body))
            route.fulfill(status=status,headers=dict(response.headers),body=body)
        ctx.route('https://packet-flight.test/**',bridge)
        # Any accidental production API request fails the test before network I/O.
        ctx.route('https://*.workers.dev/**',lambda route:route.abort('blockedbyclient'))
        try:
            page.goto(BASE+'/game.html?mode='+mode);page.wait_for_selector('#gameUI:not([hidden])')
            self.assertEqual(starts,[]);self.assertEqual(scores,[])
            page.locator('#startOnline').click()
            page.wait_for_selector('#resultDialog[open]',timeout=15000)
            self.assertEqual(len(starts),1);self.assertEqual(starts[0]['mode'],mode)
            self.assertTrue(starts[0]['token'].startswith('pf2.'))
            self.assertEqual(scores,[]);self.assertTrue(page.locator('#enterScore').is_enabled())
            page.locator('#enterScore').click();page.locator('#alias').fill('Isolated_Browser');page.locator('#publish').click()
            page.wait_for_function("document.querySelector('#submitStatus').textContent.includes('Eintragung bestätigt')",timeout=15000)
            self.assertEqual(len(scores),1);self.assertTrue(scores[0]['accepted'])
            self.assertEqual(scores[0]['mode'],mode)
            page.wait_for_function("document.querySelector('#ownPosition').textContent.includes('Dein Bestwert')")
            first_token=starts[0]['token']
            page.locator('#again').click();page.wait_for_function("document.body.dataset.gameState === 'countdown'")
            self.assertEqual(len(starts),2);self.assertNotEqual(starts[1]['token'],first_token)
            self.assertEqual(starts[1]['mode'],mode)
            self.assertEqual(len(scores),1);self.assertTrue(all(s in [200,204] for s in statuses),statuses)
            self.assertEqual(errors,[])
        finally: ctx.close()
    def test_normal_real_signed_run_submit_readback_and_restart(self): self.run_mode('normal')
    def test_daily_real_signed_run_submit_readback_and_restart(self): self.run_mode('daily')

if __name__=='__main__':unittest.main(verbosity=2)
