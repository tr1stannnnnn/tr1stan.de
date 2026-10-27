"""Static-site integrity, using the cloud loopback test server only."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
import re
import struct
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8000'
class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.links=[]; self.refs=[]; self.h1=0
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag == 'h1': self.h1 += 1
        for key in ['src','href']:
            if key in attrs: self.links.append(attrs[key])
        for key in ['aria-labelledby','aria-describedby']:
            if key in attrs: self.refs.extend(attrs[key].split())

class SiteTests(unittest.TestCase):
    def test_html_links_ids_labels_assets(self):
        for path in [*ROOT.glob('*.html'),ROOT/'game/archive.html']:
            doc=Document(path.read_text())
            self.assertEqual(len(doc.ids),len(set(doc.ids)),path.name)
            self.assertEqual(doc.h1,1,path.name)
            self.assertTrue(all(ref in doc.ids for ref in doc.refs),path.name)
            for value in doc.links:
                url=urlparse(value)
                if url.scheme or url.netloc: continue
                if not url.path:
                    if url.fragment: self.assertIn(url.fragment,doc.ids,path.name)
                    continue
                target=ROOT/url.path.lstrip('/')
                self.assertTrue(target.is_file(), f'{path.name}: {value}')
                with urlopen(BASE+'/'+url.path.lstrip('/')+'?'+url.query,timeout=5) as response:
                    self.assertEqual(response.status,200)
                    self.assertGreater(len(response.read()),0)
            # Every label with a for attribute has a real target.
            for label in re.findall(r'<label\b[^>]*\bfor="([^"]+)"',path.read_text()): self.assertIn(label,doc.ids)
    def test_modules_css_fonts_social_and_hosting(self):
        for path in (ROOT/'game').rglob('*.mjs'):
            for value in re.findall(r"from ['\"]([^'\"]+)['\"]",path.read_text()):
                self.assertTrue((path.parent/urlparse(value).path).is_file(),value)
        for value in re.findall(r'url\(["\']?([^"\')]+)',(ROOT/'style.css').read_text()):
            if value.startswith('data:'): continue
            self.assertTrue((ROOT/value.split('?')[0].lstrip('/')).is_file(),value)
        data=(ROOT/'social-preview.png').read_bytes()
        self.assertEqual(data[:8],b'\x89PNG\r\n\x1a\n')
        self.assertEqual(struct.unpack('>II',data[16:24]),(1200,630))
        self.assertEqual((ROOT/'CNAME').read_text().strip(),'tr1stan.de')
        self.assertIn((ROOT/'game/config.mjs').read_text().split('export const API_URL = ')[1].split(';')[0], ["''", "'https://packet-flight-leaderboard.polished-frost-d1f8.workers.dev'"])
        sitemap=ET.parse(ROOT/'sitemap.xml')
        self.assertIn('https://tr1stan.de/game.html',[node.text for node in sitemap.findall('.//{*}loc')])

if __name__ == '__main__': unittest.main(verbosity=2)
