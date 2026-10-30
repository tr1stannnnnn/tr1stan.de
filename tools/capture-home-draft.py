"""Render the real homepage draft in the cloud. Existing Playwright/Chromium only.
Serve this checkout on127.0.0.1:8000 first. No production navigation or API calls.
"""
import argparse,json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/home-design-2026-10-30';OUT.mkdir(exist_ok=True)
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--video',action='store_true');args=parser.parse_args()
BASE='http://127.0.0.1:8000';records=[];errors=[];external=[]
with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 def context(w,h,motion='reduce',js=True,video=None):
  ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=w<500,is_mobile=w<500,reduced_motion=motion,java_script_enabled=js,service_workers='block',**({'record_video_dir':str(video),'record_video_size':{'width':w,'height':h}}if video else{}))
  ctx.route('https://**/*',lambda r:(external.append(r.request.url),r.abort('blockedbyclient')));return ctx
 def ready(p,hash='',js=True):
  p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE+'/'+hash)
  if js:p.wait_for_selector('.term-chip');p.evaluate('document.fonts.ready')
 def shot(name,w,h,motion='reduce',hash='',js=True,fallback=False):
  ctx=context(w,h,motion,js);p=ctx.new_page()
  if fallback:ctx.add_init_script("const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...a){return k.startsWith('webgl')?null:old.call(this,k,...a)}")
  ready(p,hash,js)
  if motion=='no-preference':p.wait_for_timeout(1600)
  if hash=='#projects':p.locator('#projectOverview img').evaluate('e=>e.decode()')
  if hash=='#about':p.locator('.personal-note summary').first.click()
  if 'zoom' in name:p.evaluate("document.documentElement.style.zoom='2'")
  p.wait_for_timeout(120);p.screenshot(path=str(OUT/(name+'.png')))
  records.append({'file':name+'.png','viewport':[w,h],'motion':motion,'javascript':js,'hash':hash,'webgl_disabled':fallback,'renderer':p.evaluate('document.documentElement.classList.contains("has-3d")')if js else'no JS','no_horizontal_overflow':p.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth')if js else'not measured with JS'})
  ctx.close()
 for spec in[
  ('home-desktop-1440',1440,900,'no-preference'),('home-desktop-1280',1280,720,'no-preference'),
  ('home-mobile-320',320,568),('home-mobile-390',390,844,'no-preference'),('home-mobile-430',430,932),
  ('home-tablet-768',768,1024),('home-landscape-844',844,390),('home-zoom200',1280,720),
  ('projects-desktop',1440,900,'reduce','#projects'),('projects-mobile-390',390,844,'reduce','#projects'),
  ('project-detail-desktop',1440,900,'reduce','#project-packet-flight'),('project-detail-mobile-390',390,844,'reduce','#project-packet-flight'),
  ('log-desktop',1440,900,'reduce','#log'),('log-mobile-390',390,844,'reduce','#log'),
  ('about-desktop',1440,900,'reduce','#about')]:shot(*spec)
 shot('home-css-fallback',1440,900,'no-preference',fallback=True)
 shot('projects-no-js-390',390,844,hash='#projects',js=False)
 # The separate social asset affects only this draft's metadata, not the game's.
 ctx=context(1200,630);p=ctx.new_page();ready(p);p.screenshot(path=str(ROOT/'assets/home/social-preview.png'));ctx.close()
 video_result=None
 if args.video:
  scratch=Path('/workspace/home-design-evidence/recording');scratch.mkdir(parents=True,exist_ok=True)
  ctx=context(1280,800,'no-preference',video=scratch);p=ctx.new_page();ready(p);events=[];started=time.monotonic()
  p.evaluate("""() => {const el=document.createElement('div');el.textContent='DESIGNENTWURF · Cloud-Browser · automatisierte Bedienung · nicht veröffentlicht';el.style.cssText='position:fixed;z-index:9999;bottom:8px;left:8px;right:8px;padding:8px 12px;background:#10091aed;color:#f3d7fa;font:11px monospace;pointer-events:none';document.body.append(el)}""")
  p.wait_for_timeout(2000)
  for selector,label in[('#termChips .term-chip','Terminal'),('.project-intro .text-link','Projektdetails')]:
   if label=='Terminal':
    chip=[e for e in p.locator(selector).all()if e.inner_text()=='projects'][0];chip.click()
   else:p.locator(selector).click()
   p.wait_for_timeout(1800);events.append({'action':label,'hash':p.evaluate('location.hash')})
  film=p.locator('video');film.scroll_into_view_if_needed();film.focus();p.keyboard.press('Space');p.wait_for_timeout(2400);events.append({'action':'Video per Tastatur','playing':film.evaluate('v=>!v.paused')})
  p.locator('.back-link').click();p.wait_for_timeout(1500);events.append({'action':'Zur Übersicht','hash':p.evaluate('location.hash'),'video_paused':film.evaluate('v=>v.paused')})
  p.locator('.home-nav a[href="#log"]').click();p.wait_for_timeout(2000);p.mouse.wheel(0,320);p.wait_for_timeout(1400);events.append({'action':'Log','hash':p.evaluate('location.hash')})
  p.go_back();p.wait_for_timeout(1400);events.append({'action':'Browser zurück','hash':p.evaluate('location.hash')})
  p.locator('.brand').click();p.wait_for_timeout(1300)
  field=p.locator('#termIn');field.fill('');field.press_sequentially('projects p',delay=100);field.press('Tab');p.wait_for_timeout(800);events.append({'action':'Tab-Vervollständigung','value':field.input_value()});field.press('Enter');p.wait_for_timeout(1800)
  p.locator('a[href="#terminal"]').click();p.wait_for_timeout(1200);field.fill('');field.press_sequentially('help',delay=180);field.press('Enter');p.wait_for_timeout(2000)
  recorded_seconds=time.monotonic()-started
  v=p.video;ctx.close();original=Path(v.path());dest=OUT/'interactions.mp4'
  with open(scratch/'encode.log','w')as log:subprocess.run(['ffmpeg','-y','-i',str(original),'-an','-c:v','libx264','-preset','veryfast','-crf','29','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True,stdout=log,stderr=log)
  gif=OUT/'interactions.gif'
  with open(scratch/'gif-encode.log','w')as log:subprocess.run(['ffmpeg','-y','-i',str(dest),'-filter_complex','fps=6,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-loop','-1',str(gif)],check=True,stdout=log,stderr=log)
  video_result={'gif_preview':str(gif.relative_to(ROOT)),'file':str(dest.relative_to(ROOT)),'real_wall_seconds':recorded_seconds,'input_automation':True,'no_fake_state':True,'events':events}
 browser.close()
assert errors==[] and external==[],(errors,external)
result={'screenshots':records,'video':video_result,'page_errors':errors,'external_requests':external,'physical_devices':'not tested','Safari':'not tested','browser':'Cloud Chromium; optional 3D via software WebGL'}
(OUT/'capture-evidence.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
