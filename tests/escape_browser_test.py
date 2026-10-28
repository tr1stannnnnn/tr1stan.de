"""Input-driven pf-2 cloud checks. Observers read gameplay; they never set it."""
import json
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
from visual_browser_test import BASE, inspect_effects

ARTIFACTS = Path('/tmp/packet-flight-pf2')
ARTIFACTS.mkdir(exist_ok=True)

def observe(page, lead=0):
    return page.evaluate("""lead => {
      const f=window.__flight, h=f?.hazard;
      if (!f) return {state:document.body.dataset.gameState};
      let target=f.gates.find(g=>!g.passed)?.center || 360;
      const fragment=f.gates.find(g=>g.passed&&g.fragment&&!g.resolved);
      if (fragment) target=fragment.baseCenter+fragment.fragmentOffset;
      if(h?.kind==='trace'&&h.locked!==null) target=h.locked>=360?Math.max(252,h.locked-82):Math.min(452,h.locked+100);
      if(h?.kind==='laser') target=h.side>0?310:420;
      return {state:document.body.dataset.gameState, flap:window.__bot(lead||.016,window.__collectFragments!==false),time:f.time,
        gates:f.gatesPassed, score:f.score, fragments:f.fragments, bonus:f.bonusPoints, combo:f.combo,
        ticks:f.ticks, y:f.y, vy:f.vy, reason:f.reason, phase:h?`${h.kind}-${h.phase}`:null,
        locked:h?.locked, gateType:f.gates.find(g=>!g.passed)?.type};
    }""", lead)

def fly(page, goal=30, touch=False, pause_phases=False, captures=None, real_time=False,input_lead=.04,tap_interval=.14):
    phases=set(); types=set(); max_combo=0; paused=set(); frames=0; last_tap=-10
    while frames < 15000:
        frames+=1
        sample=observe(page, input_lead if real_time else 0)
        if sample['state'] != 'running' or sample['gates'] >= goal:
            break
        phase=sample['phase']
        types.add(sample['gateType']); max_combo=max(max_combo,sample['combo'])
        if phase:
            phases.add(phase)
            if pause_phases and phase not in paused:
                paused.add(phase)
                page.locator('#flightCanvas').press('Escape')
                before=page.evaluate('JSON.stringify([__flight,__effects])')
                page.clock.run_for(3000)
                assert page.evaluate('JSON.stringify([__flight,__effects])') == before, phase
                assert page.locator('body').get_attribute('data-game-state') == 'paused'
                page.locator('#flightCanvas').press('Space')
                page.clock.run_for(1500)
                while page.locator('body').get_attribute('data-game-state') == 'countdown':
                    page.clock.run_for(8)
                assert page.locator('body').get_attribute('data-game-state') == 'running'
        if captures:
            labels={sample['gateType']}
            if phase: labels.add(phase)
            if sample['combo']>=2: labels.add('combo')
            for label in sorted(labels):
                dest=captures/(label+'.png')
                if not dest.exists(): page.locator('.flight-panel').screenshot(path=str(dest))
        if sample['flap'] and sample['time']-last_tap>=tap_interval:
            last_tap=sample['time']
            if touch: page.locator('#flightCanvas').tap()
            else: page.keyboard.press('Space')
        if real_time: time.sleep(.025)
        else: page.clock.run_for(17)
    sample=observe(page)
    return {**sample,'phases':sorted(phases),'types':sorted(types),'maxCombo':max_combo,'paused':sorted(paused)}

class EscapeBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw=sync_playwright().start()
        cls.browser=cls.pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
    def run_route(self,touch=False):
        ctx=self.browser.new_context(viewport={'width':390 if touch else 1440,'height':844 if touch else 1100},
            is_mobile=touch,has_touch=touch,service_workers='block',reduced_motion='reduce' if touch else 'no-preference')
        inspect_effects(ctx); page=ctx.new_page(); errors=[]; requests=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url))
        try:
            page.clock.install(time=datetime(2026,10,11,12,tzinfo=timezone.utc))
            page.goto(BASE+'/game.html?mode=daily'); page.wait_for_selector('#gameUI:not([hidden])')
            page.clock.pause_at(datetime.fromtimestamp((page.evaluate('Date.now()')+100)/1000,timezone.utc))
            if touch: page.locator('#start').tap()
            else: page.locator('#start').click()
            page.clock.run_for(1700)
            result=fly(page,goal=30,touch=touch,pause_phases=not touch)
            self.assertEqual(result['gates'],30,result)
            self.assertEqual(result['state'],'running',result)
            self.assertGreater(result['fragments'],0); self.assertGreaterEqual(result['maxCombo'],2)
            self.assertEqual(result['score'],result['gates']*10+result['bonus'])
            self.assertTrue({'moving','compress'} <= set(result['types']),result)
            self.assertTrue({'trace-warning','trace-tracking','trace-locked','trace-active','laser-warning','laser-charging','laser-active','laser-fading'} <= set(result['phases']),result)
            self.assertTrue(all(r.startswith(BASE) for r in requests),requests)
            self.assertEqual(errors,[])
            (ARTIFACTS/('touch.json' if touch else 'keyboard.json')).write_text(json.dumps(result,indent=2))
            page.locator('#flightCanvas').press('Escape')
            page.screenshot(path=str(ARTIFACTS/('touch.png' if touch else 'keyboard.png')),full_page=True)
        finally: ctx.close()
    def test_keyboard_full_route_and_pause_every_attack_phase(self): self.run_route()
    def test_touch_full_route_with_reduced_motion(self): self.run_route(touch=True)

if __name__=='__main__': unittest.main(verbosity=2)
