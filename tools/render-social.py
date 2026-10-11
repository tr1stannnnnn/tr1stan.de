"""Render the original social artwork; optional cloud tool, never a Pages build step."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = '''<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="stylesheet" href="http://127.0.0.1:8000/style.css">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#06020c}
.art{position:relative;width:1200px;height:630px;background:linear-gradient(#06020c,#160628 55%,#2f0b46 78%,#0b0316)}
svg{position:absolute;inset:0;width:100%;height:100%}
.copy{position:absolute;inset:55px 70px;font-family:"JetBrains Mono Variable",monospace;color:#fff}
.brand{font-size:25px;color:#f5d0fe;letter-spacing:2px;font-weight:500}
.label{margin-top:105px;font-size:16px;letter-spacing:5px;color:#e879f9}
h1{font-size:68px;letter-spacing:-4px;line-height:1.2;margin:18px 0 20px;font-weight:750}
h1 span{color:#e879f9}.tag{font:24px "Inter Variable",sans-serif;color:#f3ecfa}
.bottom{position:absolute;bottom:0;font-size:15px;letter-spacing:2px;color:#f5d0fe}
</style></head><body><div class="art">
<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><linearGradient id="sun" x2="0" y2="1"><stop stop-color="#FEF3C7"/><stop offset=".5" stop-color="#FDA4D3"/><stop offset="1" stop-color="#C026D3"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#e879f9" stop-opacity=".4"/><stop offset="1" stop-color="#e879f9" stop-opacity="0"/></radialGradient>
<clipPath id="disc"><circle cx="950" cy="330" r="120"/></clipPath></defs>
<ellipse cx="950" cy="330" rx="250" ry="230" fill="url(#glow)"/>
<g clip-path="url(#disc)"><rect x="830" y="210" width="240" height="240" fill="url(#sun)"/>
<path d="M830 330H1070M830 351H1070M830 374H1070M830 400H1070M830 430H1070" stroke="#2f0b46" stroke-width="8"/></g>
<path d="M0 495L95 415L166 460L270 394L350 456L446 420L560 490L704 450L790 377L840 425L918 369L1010 427L1080 389L1200 470V630H0Z" fill="#0b0316"/>
<path d="M0 495L95 415L166 460L270 394L350 456L446 420L560 490L704 450L790 377L840 425L918 369L1010 427L1080 389L1200 470" fill="none" stroke="#c084fc" stroke-width="2" opacity=".7"/>
<g stroke="#e879f9" opacity=".35" fill="none">
<path d="M0 490H1200M0 510H1200M0 540H1200M0 580H1200M0 629H1200"/>
<path d="M600 490L-600 630M600 490L-300 630M600 490L0 630M600 490L300 630M600 490V630M600 490L900 630M600 490L1200 630M600 490L1500 630M600 490L1800 630"/></g>
<g fill="#f5d0fe" opacity=".7"><circle cx="410" cy="80" r="1.5"/><circle cx="900" cy="66" r="2"/><circle cx="1160" cy="171" r="1.5"/><circle cx="760" cy="140" r="1"/><circle cx="620" cy="45" r="1.5"/><circle cx="1100" cy="40" r="1"/></g>
<g transform="translate(985 145) rotate(-12)" fill="#160628" stroke="#f5d0fe" stroke-width="3"><rect x="-31" y="-24" width="62" height="48" rx="2"/><path d="M-15-8H-6M6-8H15M-12 10H12"/><path d="M-51-9H-40M-55 3H-40M-48 15H-39" stroke="#e879f9"/></g>
</svg><div class="copy"><div class="brand">tr1stan.de</div><div class="label">ARCADE / ROUTE 001</div>
<h1>PACKET<span>//</span>FLIGHT</h1><div class="tag">Ein Paket. Eine Route. Deine Daily Challenge.</div>
<div class="bottom">SYNTHWAVE · NORMAL + DAILY · KEIN KONTO</div></div></div></body></html>'''

if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        page.set_content(HTML, wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.screenshot(path=str(ROOT / 'social-preview.png'))
        browser.close()
    print('social-preview.png: 1200 × 630')
