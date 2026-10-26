"""Cloud-only review captures. Serve the repository on localhost:8000 first."""
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))
from visual_browser_test import BASE, inspect_effects, steer

OUT = ROOT / 'docs/packet-flight-visuals'
OUT.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for label, width, height in [('desktop',1440,900), ('mobile',390,844)]:
        ctx = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce', service_workers='block')
        page = ctx.new_page()
        for name, path in [('home','/'), ('game','/game.html')]:
            page.goto(BASE + path); page.evaluate('document.fonts.ready')
            page.screenshot(path=str(OUT / f'after-{name}-{label}.png'), full_page=True)
        ctx.close()
    # Actual moving WebGL scene: scroll across the hero/terminal transition.
    ctx = browser.new_context(viewport={'width':1440,'height':900}, service_workers='block')
    page = ctx.new_page(); page.goto(BASE + '/'); page.evaluate('document.fonts.ready')
    page.mouse.wheel(0,650); page.wait_for_timeout(1000)
    page.screenshot(path=str(OUT / 'after-home-transition.png'))
    ctx.close()
    # Frozen moments from actual input-driven Daily gameplay (no physics writes).
    ctx = browser.new_context(viewport={'width':1440,'height':1100}, service_workers='block')
    inspect_effects(ctx); page = ctx.new_page()
    page.clock.install(time=datetime(2026,10,11,12,tzinfo=timezone.utc)); page.goto(BASE + '/game.html?mode=daily')
    page.evaluate('document.fonts.ready')
    page.clock.pause_at(datetime.fromtimestamp((page.evaluate('Date.now()') + 100) / 1000, timezone.utc))
    page.locator('#start').click(); page.clock.run_for(1700)
    assert steer(page, goal=2)['score'] == 2
    page.locator('.flight-panel').screenshot(path=str(OUT / 'after-game-point.png'))
    page.locator('#flightCanvas').press('Space'); page.clock.run_for(35)
    page.locator('.flight-panel').screenshot(path=str(OUT / 'after-game-jump.png'))
    page.clock.run_for(3000)
    assert page.locator('#resultDialog').evaluate('d=>d.open')
    page.screenshot(path=str(OUT / 'after-game-over.png'))
    ctx.close()
    # Real wall-clock video, actual keyboard flaps, score and unassisted collision.
    ctx = browser.new_context(viewport={'width':900,'height':1024}, service_workers='block',
        record_video_dir='/tmp/packet-flight-visual-video', record_video_size={'width':900,'height':1024})
    inspect_effects(ctx); page = ctx.new_page(); errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/game.html?mode=daily'); page.evaluate('document.fonts.ready')
    page.locator('#start').click(); page.wait_for_function("document.body.dataset.gameState==='running'")
    outcome = steer(page, goal=3, frames=1000, real_time=True)
    assert outcome['score'] == 3, outcome
    page.wait_for_function("document.querySelector('#resultDialog').open")
    page.wait_for_timeout(1000)
    events = page.evaluate('__visualEvents')
    assert events['point'] == 3 and events['collide'] == 1 and events['flap'] > 3, events
    assert errors == [], errors
    video_path = page.video.path()
    ctx.close()
    subprocess.run(['/usr/bin/ffmpeg','-y','-loglevel','error','-i',str(video_path),
        '-c:v','libx264','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',
        str(OUT / 'packet-flight-motion.mp4')], check=True)
    subprocess.run(['/usr/bin/ffmpeg','-y','-loglevel','error','-i',str(video_path),
        '-filter_complex','fps=8,scale=450:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse',
        str(OUT / 'packet-flight-motion.gif')], check=True)
    print('Real-time Daily video:', events)
    browser.close()
