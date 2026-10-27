"""Real wall-clock input-automated local pf3 run; no state/score/seed/time writes."""
import json,time,hashlib,sys,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from escape_browser_test import fly
from visual_browser_test import inspect_effects
attempt=int(sys.argv[1]) if len(sys.argv)>1 else 1
OUT=Path(f'/tmp/pf3-work/video-attempt-{attempt}');OUT.mkdir(parents=True,exist_ok=True)
chosen=json.loads(Path('/tmp/pf3-work/video-policy.json').read_text())
policy=chosen['policy'];tap=chosen['tapInterval'];lead=.04
errors=[];external=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':900,'height':1100},record_video_dir=str(OUT),record_video_size={'width':900,'height':1100},service_workers='block',reduced_motion='no-preference')
 inspect_effects(ctx);ctx.add_init_script('window.__collectFragments=false;window.__botPolicy='+json.dumps(policy)+';')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 ctx.route('https://*.workers.dev/**',lambda r:(external.append(r.request.url),r.abort('blockedbyclient')))
 page.goto('http://127.0.0.1:8000/game.html?mode=daily');page.wait_for_selector('#gameUI:not([hidden])');page.evaluate('document.fonts.ready')
 assert chosen['day'] in page.locator('#dailyInfo').inner_text()
 page.evaluate("""() => {const el=document.createElement('div');el.id='automationLabel';el.style.cssText='position:fixed;z-index:9999;inset:5px 5px auto;padding:8px;background:#091122ed;color:#9debf0;font:12px monospace;pointer-events:none';document.body.append(el);setInterval(()=>{const f=window.__flight;el.textContent='EINGABEAUTOMATION · echte Physik · lokaler Run · keine Eintragung'+(f?' | Gates '+f.gatesPassed+' | Tempo '+f.speed.toFixed(0)+' | Lücke '+(f.gates.find(g=>!g.passed)?.gap||0).toFixed(0):'')},100)}""")
 page.screenshot(path=str(OUT/'start.png'),full_page=True)
 page.locator('#start').click();page.wait_for_function("document.body.dataset.gameState==='running' && !!window.__flight")
 started=time.monotonic();outcome=fly(page,goal=35,real_time=True,input_lead=lead,tap_interval=tap)
 elapsed=time.monotonic()-started
 state=page.evaluate("() => {const f=__flight;return{seed:f.seed,gates:f.gatesPassed,score:f.score,fragments:f.fragments,bonusPoints:f.bonusPoints,activeMs:f.activeMs,speed:f.speed,state:document.body.dataset.gameState}}")
 if outcome['gates']>=35:page.locator('#flightCanvas').press('Escape')
 page.screenshot(path=str(OUT/'end.png'),full_page=True)
 video=page.video;ctx.close();video_path=Path(video.path());browser.close()
metadata={'input_automation':True,'actual_wall_clock':True,'wall_seconds':elapsed,'outcome':outcome,'state':state,'controller_policy':policy,'min_tap_interval':tap,'input_lead':lead,'day':chosen['day'],'expected_daily_seed':chosen['seed'],'no_physics_score_seed_or_time_writes':True,'public_api_requests':len(external),'page_errors':errors,'video_webm':str(video_path),'source_sha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'game/pf3').glob('*.mjs')}}
(OUT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
assert errors==[] and external==[],metadata
assert outcome['gates']>=35 and outcome['state']=='running',outcome
assert {'moving','compress'}<=set(outcome['types']),outcome
assert {'trace-warning','trace-tracking','trace-locked','trace-active','laser-warning','laser-charging','laser-active','laser-fading'}<=set(outcome['phases']),outcome
assert state['score']==state['gates']*10+state['bonusPoints']
DEST=ROOT/'docs/packet-flight-pf3';DEST.mkdir(parents=True,exist_ok=True)
mp4=DEST/'pf3-input-automation.mp4'
subprocess.run(['ffmpeg','-y','-i',str(video_path),'-an','-c:v','libx264','-preset','veryfast','-crf','27','-pix_fmt','yuv420p','-movflags','+faststart',str(mp4)],check=True,stdout=subprocess.DEVNULL,stderr=open(OUT/'ffmpeg.log','w'))
metadata['mp4_sha256']=hashlib.sha256(mp4.read_bytes()).hexdigest()
(DEST/'video-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps({'gates':state['gates'],'score':state['score'],'wall_seconds':elapsed,'types':outcome['types'],'phases':outcome['phases'],'video':str(mp4)},indent=2))
