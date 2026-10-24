"""Earth trip test: from the folders, click Earth, fly in, watch the heart map draw, see the books, hide/show them, open the reader, go back.
Usage: python3 tests/private_world.py [width height]   (needs the site at http://localhost:8000/)
Set PW1, PW2 and PW3 (the three answers) in the environment; they are never stored in the repo."""
import os,sys,time
from playwright.sync_api import sync_playwright
import tempfile
S=tempfile.mkdtemp(); W,H=(int(sys.argv[1]),int(sys.argv[2])) if len(sys.argv)>2 else (1280,800); tag='w'
CFG="window.PRIVATE_CONFIG={locks:[1,1.4],prompt:{pre:300,fadeIn:100,hold:100,fadeOut:100,rise:56},fold:{settle:4000,delay:0},start:'folders'};"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':W,'height':H},device_scale_factor=2 if W<500 else 1,has_touch=W<500); ctx.add_init_script(CFG); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8000/special/'); pg.wait_for_timeout(600); pg.click('#login')
    for pw in [os.environ['PW1'],os.environ['PW2'],os.environ['PW3']]:
        pg.wait_for_function("!document.getElementById('field').disabled",timeout=10000); pg.keyboard.type(pw); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    pg.wait_for_function("__fy.stage==='folders-ready'",timeout=20000); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{S}/w_{tag}_0folders.png')
    print('earth btn visible',pg.evaluate("document.getElementById('earthBtn').classList.contains('vis')"),'arrow',pg.evaluate("document.getElementById('jam').className"))
    pg.click('#earthBtn'); t0=time.time()
    pg.wait_for_timeout(1800); pg.screenshot(path=f'{S}/w_{tag}_1fly.png')
    pg.wait_for_function("__fy.stage==='map'",timeout=15000); print('flight took',round(time.time()-t0,1),'s')
    pg.wait_for_timeout(3500); pg.screenshot(path=f'{S}/w_{tag}_2drawing.png')
    pg.wait_for_function("__fy.stage==='map-drawn'",timeout=30000); print('map drawn after',round(time.time()-t0,1),'s; mapDrawMs',pg.evaluate("__fy.mapDrawMs"))
    pg.screenshot(path=f'{S}/w_{tag}_3drawn.png')
    pg.wait_for_function("__fy.stage==='books'",timeout=15000); print('books after',round(time.time()-t0,1),'s')
    pg.wait_for_timeout(1200); pg.screenshot(path=f'{S}/w_{tag}_4books.png')
    pg.hover('.book >> nth=0'); pg.wait_for_timeout(700); pg.screenshot(path=f'{S}/w_{tag}_5hover.png')
    pg.click('#booksBtn'); pg.wait_for_timeout(1300); print('button now says',pg.inner_text('#booksBtn')); pg.screenshot(path=f'{S}/w_{tag}_6hidden.png')
    pg.click('#booksBtn'); pg.wait_for_timeout(900)
    pg.click('.book >> nth=0'); pg.wait_for_timeout(700); print('reader:',pg.inner_text('#reader')[:60].replace('\n',' | ')); pg.screenshot(path=f'{S}/w_{tag}_7reader.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    pg.click('#worldBack'); pg.wait_for_timeout(1500); print('after back:',pg.evaluate("__fy.stage"))
    print('errors',errs)
