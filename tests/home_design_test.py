"""Cloud-only homepage draft regressions. No public API/score requests."""
import hashlib,json,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];BASE='http://127.0.0.1:8000'
class HomeDesignTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.ctx=self.browser.new_context(reduced_motion='reduce',service_workers='block');self.page=self.ctx.new_page();self.errors=[];self.external=[];self.requests=[]
  self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.page.on('request',lambda r:self.requests.append(r.url))
  self.ctx.route('https://**/*',lambda r:(self.external.append(r.request.url),r.abort('blockedbyclient')))
 def tearDown(self):self.ctx.close();self.assertEqual(self.errors,[]);self.assertEqual(self.external,[])
 def home(self,hash=''):
  self.page.goto(BASE+'/'+hash);self.page.wait_for_selector('.term-chip');self.page.evaluate('document.fonts.ready')
 def command(self,s):self.page.locator('#termIn').fill(s);self.page.locator('#termIn').press('Enter')
 def test_projects_log_commands_deep_links_history_and_view_focus(self):
  self.home();self.command('projects');self.assertEqual(self.page.url,BASE+'/#projects');self.assertTrue(self.page.locator('#projectOverview').is_visible());self.assertTrue(self.page.locator('#project-packet-flight').is_hidden());self.assertEqual(self.page.evaluate('document.activeElement.id'),'projectsTitle')
  self.command('projects packet-flight');self.assertTrue(self.page.locator('#project-packet-flight').is_visible());self.assertTrue(self.page.locator('#projectOverview').is_hidden());self.assertEqual(self.page.url,BASE+'/#project-packet-flight')
  self.command('log');self.assertEqual(self.page.url,BASE+'/#log');self.assertTrue(self.page.locator('#project-packet-flight').is_hidden())
  self.page.go_back();self.assertTrue(self.page.locator('#project-packet-flight').is_visible());self.page.go_back();self.assertTrue(self.page.locator('#projectOverview').is_visible());self.page.go_forward();self.assertTrue(self.page.locator('#project-packet-flight').is_visible())
  self.page.reload();self.page.wait_for_selector('.term-chip');self.assertTrue(self.page.locator('#project-packet-flight').is_visible())
  self.page.locator('.back-link').click();self.assertTrue(self.page.locator('#projectOverview').is_visible());self.assertEqual(self.page.url,BASE+'/#projects')
 def test_help_ls_cat_all_are_short_and_safe_and_keep_personal_content(self):
  self.home()
  for cmd in['help','ls','cat projects','cat log','all']:
   self.command('clear');self.command(cmd);out=self.page.locator('#termOut').inner_text();
   if cmd in ['help','ls','all']:self.assertIn('projects',out.lower());self.assertIn('log',out.lower())
   elif cmd=='cat projects':self.assertEqual(self.page.locator('#termOut a[href="#projects"]').count(),1)
   else:self.assertEqual(self.page.locator('#termOut a[href="#log"]').count(),1)
   if cmd=='all':self.assertIn('Über das Zocken',out);self.assertIn('chef@tr1stan.de',out);self.assertNotIn('Vom Mittelweg zur richtigen Route',out)
  self.command('cat not-real');self.assertIn('kein solches Thema',self.page.locator('#termOut').inner_text())
  self.command('<img src=x onerror=alert(1)>');self.assertEqual(self.page.locator('#termOut img').count(),0);self.assertIn('Unbekannter Befehl',self.page.locator('#termOut').inner_text())
  self.command('__proto__');self.assertIn('Unbekannter Befehl',self.page.locator('#termOut').inner_text())
 def test_tab_completion_history_clear_and_focus_exit(self):
  self.home();f=self.page.locator('#termIn')
  for before,after in[('pro','projects'),('projects p','projects packet-flight'),('cat pro','cat projects'),('cat lo','cat log'),('play --d','play --daily')]:
   f.fill(before);f.press('Tab');self.assertEqual(f.input_value(),after);f.press('Tab');self.assertNotEqual(self.page.evaluate('document.activeElement.id'),'termIn')
  f.fill('about');f.press('Enter');f.press('ArrowUp');self.assertEqual(f.input_value(),'about');f.press('ArrowDown');self.assertEqual(f.input_value(),'')
  f.press('Control+l');self.assertEqual(self.page.locator('#termOut').inner_text().strip(),'');f.press('Shift+Tab');self.assertNotEqual(self.page.evaluate('document.activeElement.id'),'termIn')
 def test_all_existing_commands_and_validation(self):
  self.home()
  for cmd,part in[('about','Über das Zocken'),('skills','Linux und Docker'),('honest','drei Abende'),('next','Monitoring'),('contact','chef@tr1stan.de'),('whoami','tr1stan'),('neofetch','CSS-Szene'),('sudo','nicht gemeldet'),('exit','weiterscrollen'),('play nope','nutze play'),('projects nope','nutze projects')]:
   self.command('clear');self.command(cmd);self.assertIn(part,self.page.locator('#termOut').inner_text(),cmd)
 def test_touch_chips_execute_without_keyboard_including_all_navigation_targets(self):
  self.ctx.close();self.ctx=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block');self.page=self.ctx.new_page();self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  for command,target in[('projects','#projects'),('projects packet-flight','#project-packet-flight'),('log','#log'),('play','/game.html'),('play --daily','/game.html?mode=daily'),('leaderboard','/game.html#leaderboard')]:
   self.home();self.assertNotEqual(self.page.evaluate('document.activeElement.id'),'termIn');chip=self.page.locator('.term-chip').filter(has_text=command);exact=[c for c in chip.all()if c.inner_text()==command][0];exact.tap();self.page.wait_for_url(BASE+('/'+target if target.startswith('#')else target));self.assertNotIn(self.page.evaluate('document.activeElement.tagName'),['INPUT','TEXTAREA'])
 def test_keyboard_chips_enter_space_and_skip_focus(self):
  self.home();self.page.locator('.skip').focus();self.page.keyboard.press('Enter');self.assertEqual(self.page.evaluate('document.activeElement.id'),'content')
  for name,key,target in[('projects','Enter','#projects'),('log','Space','#log')]:
   chip=[c for c in self.page.locator('.term-chip').all()if c.inner_text()==name][0];chip.focus();self.page.keyboard.press(key);self.page.wait_for_url(BASE+'/'+target);self.assertTrue(self.page.url.endswith(target));self.assertNotEqual(self.page.evaluate('document.activeElement.id'),'termIn')
 def test_reading_old_output_is_not_pulled_to_new_lines(self):
  self.home()
  for _ in range(3):self.command('all')
  out=self.page.locator('#termOut');out.evaluate('e=>e.scrollTop=0');self.page.wait_for_timeout(80);self.command('help');self.assertEqual(out.evaluate('e=>e.scrollTop'),0);self.assertTrue(self.page.locator('#newOutput').is_visible());self.page.locator('#newOutput').click();self.assertTrue(self.page.locator('#newOutput').is_hidden());self.assertLess(out.evaluate('e=>e.scrollHeight-e.scrollTop-e.clientHeight'),2)
 def test_responsive_matrix_zoom_touch_sizes_and_terminal_peek(self):
  self.home()
  for w,h in[(1280,720),(1440,900),(320,568),(390,844),(430,932),(768,1024),(1024,768),(844,390)]:
   self.page.set_viewport_size({'width':w,'height':h});self.page.evaluate("document.documentElement.style.zoom='1';scrollTo(0,0)")
   self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),w,(w,h))
   if h>=568:self.assertLess(self.page.locator('.term-bar').bounding_box()['y'],h,(w,h))
   for e in self.page.locator('.term-chip, .home-nav a, .term-send').all():
    box=e.bounding_box();self.assertGreaterEqual(box['height'],43.9);self.assertGreaterEqual(box['width'],43.9)
   self.page.evaluate("document.documentElement.style.zoom='2'");self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),(w,h))
 def test_no_js_and_failed_home_js_keep_real_content_and_native_detail_links(self):
  for javascript in[False,True]:
   ctx=self.browser.new_context(java_script_enabled=javascript,service_workers='block');p=ctx.new_page()
   if javascript:ctx.route('**/home.js*',lambda r:r.abort('failed'))
   p.goto(BASE+'/#project-packet-flight');self.assertTrue(p.locator('#project-packet-flight').is_visible());self.assertTrue(p.locator('#log').is_visible());self.assertTrue(p.locator('#term').is_hidden());p.locator('.personal-note summary').first.click();self.assertTrue(p.locator('[data-topic=about]').is_visible());self.assertTrue(p.locator('[data-topic=contact] a').first.is_visible());p.locator('.back-link').click();self.assertTrue(p.url.endswith('#projects'));ctx.close()
 def test_semantic_sources_single_place_and_no_hidden_focusable_store(self):
  self.home();self.assertEqual(self.page.locator('h1').count(),1);self.assertEqual(self.page.locator('[data-topic]').count(),5);self.assertEqual(self.page.locator('.store').count(),0)
  self.assertEqual(self.page.locator('a[href*="game.html"]').count(),0);self.assertTrue(self.page.locator('#project-packet-flight a').first.is_hidden());self.assertEqual(self.page.locator('#projectOverview video').count(),0)
  self.assertEqual(self.page.locator('#log time').all_text_contents(),['28.10.2026','27.10.2026','27.10.2026','27.10.2026','11.10.2026'])
 def test_no_persistence_api_or_background_fetches_and_media_lazy(self):
  self.ctx.add_init_script("window.stored=[];for(const m of['getItem','setItem','removeItem']){const old=Storage.prototype[m];Storage.prototype[m]=function(...a){stored.push([m,a[0]]);return old.apply(this,a)}}")
  self.home();self.command('neofetch');self.page.wait_for_timeout(1000);self.assertEqual(self.page.evaluate('stored'),[]);self.assertFalse(any('.mp4'in u or 'workers.dev'in u for u in self.requests));before=len(self.requests);self.page.wait_for_timeout(800);self.assertEqual(len(self.requests),before)
 def test_protected_game_backend_shared_files_unchanged(self):
  hashes=json.loads((ROOT/'tests/home-protected-sha256.json').read_text())
  for name,expected in hashes.items():self.assertEqual(hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),expected,name)
 def test_copy_contact(self):
  self.home();self.page.evaluate('navigator.clipboard.writeText=async text=>{window.copied=text}');self.page.locator('.copy').click();self.page.wait_for_function("window.copied==='chef@tr1stan.de'");self.assertIn('kopiert',self.page.locator('.copy').inner_text())
 def test_reduced_motion_webgl_and_module_failure_fallback(self):
  self.home();self.assertFalse(any('scene3d'in u or '/vendor/'in u for u in self.requests));self.command('projects');self.assertIsNone(self.page.locator('body').get_attribute('data-route'))
  for failure in['context','module','weak','savedata']:
   ctx=self.browser.new_context(reduced_motion='no-preference',service_workers='block');p=ctx.new_page();p.on('pageerror',lambda e:self.errors.append(str(e)));requests=[];p.on('request',lambda r:requests.append(r.url))
   if failure=='context':ctx.add_init_script("const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...a){return k.startsWith('webgl')?null:old.call(this,k,...a)}")
   elif failure=='module':ctx.route('**/scene3d.js*',lambda r:r.abort('failed'))
   elif failure=='weak':ctx.add_init_script("Object.defineProperty(navigator,'deviceMemory',{get:()=>2})")
   else:ctx.add_init_script("Object.defineProperty(navigator,'connection',{get:()=>({saveData:true})})")
   p.goto(BASE+'/');p.wait_for_selector('.term-chip');p.wait_for_timeout(350);self.assertFalse(p.evaluate('document.documentElement.classList.contains("has-3d")'))
   chip=[c for c in p.locator('.term-chip').all()if c.inner_text()=='projects'][0];chip.click();self.assertTrue(p.locator('#projectOverview').is_visible())
   if failure!='module':self.assertFalse(any('/vendor/'in u for u in requests))
   ctx.close()
 def test_3d_lifecycle_reduced_motion_hidden_tab_offscreen_and_context_loss(self):
  ctx=self.browser.new_context(reduced_motion='no-preference',service_workers='block');p=ctx.new_page();p.on('pageerror',lambda e:self.errors.append(str(e)))
  source=(ROOT/'scene3d.js').read_text().replace('renderer.render(scene, camera);','window.__rendered=(window.__rendered||0)+1;renderer.render(scene,camera);').replace('    running = false;\n    if (raf)', '    running = false;window.__scenePaused=true;\n    if (raf)').replace('    running = true;\n    lastT', '    running = true;window.__scenePaused=false;\n    lastT')
  ctx.route('**/scene3d.js*',lambda r:r.fulfill(content_type='text/javascript',body=source));ctx.add_init_script("window.__hidden=false;Object.defineProperty(document,'hidden',{get:()=>__hidden})")
  p.goto(BASE+'/');p.wait_for_function('document.documentElement.classList.contains("has-3d")');p.wait_for_timeout(100)
  p.evaluate("__hidden=true;document.dispatchEvent(new Event('visibilitychange'))");before=p.evaluate('__rendered');p.wait_for_timeout(300);self.assertEqual(p.evaluate('__rendered'),before);self.assertTrue(p.evaluate('document.documentElement.classList.contains("is-hidden")'))
  p.evaluate("__hidden=false;document.dispatchEvent(new Event('visibilitychange'))");p.wait_for_function('(n)=>__rendered>n',arg=before)
  p.locator('#log').scroll_into_view_if_needed();p.wait_for_function('window.__scenePaused===true');before=p.evaluate('__rendered');p.wait_for_timeout(300);self.assertEqual(p.evaluate('__rendered'),before)
  p.evaluate("scrollTo({top:0,behavior:'instant'})");p.wait_for_function('(n)=>__rendered>n',arg=before)
  p.locator('.stage').evaluate("c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true}))");self.assertFalse(p.evaluate('document.documentElement.classList.contains("has-3d")'));self.assertTrue(p.locator('#term').is_visible())
  p.emulate_media(reduced_motion='reduce');p.locator('a[href="#projects"]').first.click();self.assertIsNone(p.locator('body').get_attribute('data-route'));ctx.close()
if __name__=='__main__':unittest.main(verbosity=2)
