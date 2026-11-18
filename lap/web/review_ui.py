#!/usr/bin/env python3
"""Isolated UI review: no imports from, or process control of, server.py.
Requires Python Playwright and an installed Chrome (QA only, not kiosk runtime).
Run: python lap/web/review_ui.py --pass-number 1
"""
import argparse
import asyncio
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCENES = ['welcome-asking', 'welcome-listening', 'welcome-detecting',
          'welcome-waiting', 'loading', 'watching', 'seeing', 'detected',
          'video', 'listening', 'thinking', 'answer']
ROOT = Path(__file__).resolve().parent

class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/static/'):
            self.path = self.path[7:]
        return super().do_GET()
    def log_message(self, *_):
        pass

async def capture(port, args):
    from playwright.async_api import async_playwright
    report = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=args.chrome,
            headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width, height in [(1920, 1080), (1280, 800)]:
            for lang in ['en', 'ta']:
                page = await browser.new_page(viewport={'width':width, 'height':height})
                errors, requests = [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('request', lambda r: requests.append(r.url))
                for scene in SCENES:
                    url = f'http://127.0.0.1:{port}/?mock=1&lang={lang}&scene={scene}'
                    await page.goto(url)
                    await page.evaluate('document.fonts.ready')
                    await page.wait_for_timeout(500)
                    path = args.output / f'ui_r{args.pass_number}_{scene}_{width}_{lang}.png'
                    await page.screenshot(path=str(path))
                    audit = await page.evaluate('''() => ({
                      pageOverflow: document.documentElement.scrollWidth > innerWidth ||
                        document.documentElement.scrollHeight > innerHeight,
                      regions: [...document.querySelectorAll('#ask-btn,#bins,.chat-wrap,.stage-cell,.welcome-choices,#welcome-talk')]
                       .map(n => { const r=n.getBoundingClientRect(); return {id:n.id||n.className,
                         x:r.x,y:r.y,width:r.width,height:r.height,overflow:n.scrollHeight>n.clientHeight+2}; })
                    })''')
                    report.append(dict(scene=scene, width=width, lang=lang,
                        screenshot=str(path), errors=errors[:], audit=audit,
                        externalRequests=[u for u in requests if not u.startswith((f'http://127.0.0.1:{port}/','data:'))]))
                    errors.clear(); requests.clear()
                await page.close()
        await browser.close()
    (args.output / f'sorti_r{args.pass_number}_audit.json').write_text(json.dumps(report, indent=2))
    print(f'Captured {len(report)} screenshots in {args.output}; inspect them before claiming visual QA.')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pass-number', type=int, choices=[1,2], required=True)
    parser.add_argument('--output', type=Path, default=Path('/tmp'))
    parser.add_argument('--chrome', default='/usr/bin/google-chrome')
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True, parents=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0),
        functools.partial(PreviewHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        asyncio.run(capture(server.server_port, args))
    finally:
        server.shutdown(); server.server_close()

if __name__ == '__main__':
    main()
