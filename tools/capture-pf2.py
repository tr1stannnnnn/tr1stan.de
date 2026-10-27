"""Cloud-only pf-2 evidence. Serve this checkout on 8000, exported pf-1 on 8001."""
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from escape_browser_test import BASE, fly
from visual_browser_test import inspect_effects

OUT=ROOT/'docs/packet-flight-pf2'
OUT.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height,label in [(1440,1100,'desktop'),(390,844,'mobile')]:
        ctx=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',service_workers='block')
        page=ctx.new_page()
        for prefix,url in [('before','http://127.0.0.1:8001'),('after',BASE)]:
            page.goto(url+'/game.html'); page.wait_for_selector('#gameUI:not([hidden])'); page.evaluate('document.fonts.ready')
            page.screenshot(path=str(OUT/f'{prefix}-{label}.png'),full_page=True)
        ctx.close()
    for name in ['static','moving','compress','combo','trace-warning','trace-tracking','trace-locked','trace-active','laser-warning','laser-charging','laser-active','laser-fading']:
        (OUT/(name+'.png')).unlink(missing_ok=True)
    ctx=browser.new_context(viewport={'width':900,'height':1600},service_workers='block')
    inspect_effects(ctx); page=ctx.new_page()
    page.clock.install(time=datetime(2026,10,11,12,tzinfo=timezone.utc))
    page.goto(BASE+'/game.html?mode=daily'); page.wait_for_selector('#gameUI:not([hidden])')
    page.clock.pause_at(datetime.fromtimestamp((page.evaluate('Date.now()')+100)/1000,timezone.utc))
    page.locator('#start').click(); page.clock.run_for(1700)
    result=fly(page,goal=30,captures=OUT)
    assert result['gates']==30 and result['state']=='running',result
    (OUT/'capture-run.json').write_text(json.dumps(result,indent=2)+'\n')
    ctx.close()
    if '--stills-only' in sys.argv:
        browser.close()
        raise SystemExit(0)
    # No virtual clock or gameplay state writes in the recorded run.
    ctx=browser.new_context(viewport={'width':900,'height':1024},service_workers='block',
        record_video_dir='/tmp/pf2-video',record_video_size={'width':900,'height':1024})
    inspect_effects(ctx); page=ctx.new_page(); errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/game.html?mode=daily'); page.wait_for_selector('#gameUI:not([hidden])')
    page.locator('#start').click(); page.wait_for_function("document.body.dataset.gameState==='running'")
    result=fly(page,goal=26,real_time=True)
    assert result['gates']==26 and result['state']=='running',result
    assert {'trace-active','laser-active'}<=set(result['phases']),result
    assert 'compress' in result['types'] and result['fragments']>0 and result['maxCombo']>=2,result
    # Let the packet collide without further inputs, then show the genuine result.
    page.wait_for_function("document.querySelector('#resultDialog').open")
    page.wait_for_timeout(500)
    assert not errors,errors
    video=page.video.path(); ctx.close()
    subprocess.run(['/usr/bin/ffmpeg','-y','-loglevel','error','-i',str(video),'-c:v','libx264','-crf','29',
        '-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'escape-run.mp4')],check=True)
    (OUT/'video-run.json').write_text(json.dumps(result,indent=2)+'\n')
    print('Real-time input-only recording:',json.dumps(result),flush=True)
    browser.close()
