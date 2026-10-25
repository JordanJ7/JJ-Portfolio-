"""End-to-end test of the special site (three questions). Short timings so it runs in about a minute.
Usage: python3 tests/private_flow.py [url]   (default http://localhost:8000/special/)
Set PW1, PW2, PW3 and PW4 (the four answers) in the environment; they are never stored in the repo."""
import time,json,os,sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8000/special/'
try: PW1,PW2,PW3,PW4=os.environ['PW1'],os.environ['PW2'],os.environ['PW3'],os.environ['PW4']
except KeyError: sys.exit('Set PW1, PW2, PW3 and PW4 to the four answers (they are never stored in the repo).')
CFG="""window.PRIVATE_CONFIG={locks:[1,1.4],prompt:{pre:650,fadeIn:200,hold:250,fadeOut:300,rise:56},intro:{typing:300,delay:50,attr:50,reading:150,fade:100},more:{type:600,hold:300},mont:{frames:20,start:60,end:30},tv:300};"""
def typ(pg,s): pg.keyboard.type(s); pg.keyboard.press('Enter')
def caret_top(pg): return pg.evaluate("document.getElementById('caret').getBoundingClientRect().top")
ok=True
def check(name,cond,extra=''):
    global ok
    print(('PASS ' if cond else 'FAIL ')+name,extra)
    if not cond: ok=False
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':800}); ctx.add_init_script(CFG)
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto(BASE); pg.wait_for_timeout(800); pg.click('#login'); pg.wait_for_timeout(200)
    # question 1 now has a prompt too: it floats away before the cursor takes typing
    pg.wait_for_function("document.getElementById('prompt').textContent==='Our B-day'",timeout=4000); check('q1 prompt text',True)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=8000); pg.wait_for_timeout(200)
    # question 1: cursor must not move when typing starts
    y0=caret_top(pg); pg.keyboard.type('1'); pg.wait_for_timeout(100); y1=caret_top(pg); pg.keyboard.press('Backspace')
    check('q1 cursor does not move when typing starts',abs(y0-y1)<0.5,f'{y0:.1f} -> {y1:.1f}')
    typ(pg,'111'); pg.wait_for_timeout(700); typ(pg,'222'); pg.wait_for_timeout(1300)
    check('q1 hint',pg.evaluate("document.getElementById('hint').textContent")=='birthday')
    typ(pg,'333'); pg.wait_for_timeout(700); typ(pg,'444'); pg.wait_for_timeout(300)
    check('q1 first lockout',pg.evaluate("document.getElementById('field').disabled")==True)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    typ(pg,PW1)
    pg.wait_for_function("__fy.stage==='login2'",timeout=6000)
    # prompt for question 2 floats up while fading
    pg.wait_for_timeout(1250)   # 650 line fade + 200 in + 250 hold -> prompt about to leave
    t0=pg.evaluate("new DOMMatrix(getComputedStyle(document.getElementById('prompt')).transform).m42")
    pg.wait_for_timeout(250)
    t1=pg.evaluate("new DOMMatrix(getComputedStyle(document.getElementById('prompt')).transform).m42")
    check('prompt moves up while fading',t1<t0-5,f'translateY {t0:.1f} -> {t1:.1f}')
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    y0=caret_top(pg); pg.keyboard.type('x'); pg.wait_for_timeout(100); y1=caret_top(pg); pg.keyboard.press('Backspace')
    check('q2 cursor does not move',abs(y0-y1)<0.5,f'{y0:.1f} -> {y1:.1f}')
    typ(pg,'nope'); pg.wait_for_timeout(600); typ(pg,'nah'); pg.wait_for_timeout(1300)
    check('q2 hint',pg.evaluate("document.getElementById('hint').textContent")=='Its a Pokemon')
    typ(pg,'x'); pg.wait_for_timeout(600); typ(pg,'y'); pg.wait_for_timeout(300)
    check('q2 lockout',pg.evaluate("document.getElementById('field').disabled")==True)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    typ(pg,PW2)
    pg.wait_for_function("__fy.stage==='login3'",timeout=6000)
    pg.wait_for_function("document.getElementById('prompt').textContent==='and the second one...?'",timeout=4000); check('q3 prompt text',True)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    typ(pg,'nope'); pg.wait_for_timeout(700); check('q3 wrong answer refused',pg.evaluate("__fy.stage")=='login3')
    typ(pg,PW3.lower())
    pg.wait_for_function("__fy.stage==='login4'",timeout=6000)
    pg.wait_for_function("document.getElementById('prompt').textContent==='My Original Child'",timeout=4000); check('q4 prompt text',True)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    typ(pg,'cat'); pg.wait_for_timeout(600); typ(pg,'cow'); pg.wait_for_timeout(1300)
    check('q4 hint',pg.evaluate("document.getElementById('hint').textContent")=='never had an actual name for it')
    typ(pg,'a'); pg.wait_for_timeout(600); typ(pg,'b'); pg.wait_for_timeout(300)
    check('q4 lockout',pg.evaluate("document.getElementById('field').disabled")==True)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    typ(pg,PW4)
    pg.wait_for_function("__fy.stage==='intro'",timeout=8000)
    pg.wait_for_function("__fy.stage==='slides'",timeout=8000); pg.wait_for_timeout(900)
    nslides=pg.evaluate("document.querySelectorAll('.dot').length")
    # a scrolling slide (five or more items), if there is one: four thumbnails fit at the top
    r=pg.evaluate("(()=>{const g=document.querySelector('.sl .items.scroll');if(!g)return null;const gr=g.getBoundingClientRect();const k=[...g.children].slice(0,4).map(e=>e.getBoundingClientRect());return {cls:g.className,top:g.scrollTop,n:g.children.length,fit:k.every(r=>r.top>=gr.top-1&&r.bottom<=gr.bottom+1&&r.left>=gr.left-1&&r.right<=gr.right+1),fifthBelow:g.children[4].getBoundingClientRect().top>=gr.bottom-1,canScroll:g.scrollHeight>g.clientHeight+2}})()")
    if r is not None:
        si=pg.evaluate("[...document.querySelectorAll('.sl')].findIndex(s=>s.querySelector('.items.scroll'))")
        for i in range(si): pg.click('.nav.next'); pg.wait_for_timeout(900)
        r=pg.evaluate("(()=>{const g=document.querySelector('.sl .items.scroll');const gr=g.getBoundingClientRect();const k=[...g.children].slice(0,4).map(e=>e.getBoundingClientRect());return {fit:k.every(r=>r.top>=gr.top-1&&r.bottom<=gr.bottom+1&&r.left>=gr.left-1&&r.right<=gr.right+1),fifthBelow:g.children[4].getBoundingClientRect().top>=gr.bottom-1,canScroll:g.scrollHeight>g.clientHeight+2}})()")
        check('scroll slide shows exactly four thumbnails at the top',r['fit'] and r['fifthBelow'] and r['canScroll'],str(r))
    else: print('(no scrolling slide in the content; skipped that check)')
    pg.screenshot(path='fy_s6.png')
    while pg.evaluate("[...document.querySelectorAll('.dot')].pop().classList.contains('act')")==False: pg.click('.nav.next'); pg.wait_for_timeout(900)
    pg.click('.nav.next')
    pg.wait_for_function("__fy.stage==='more'",timeout=6000)
    y0=pg.evaluate("document.getElementById('mcaret').getBoundingClientRect().top"); pg.wait_for_timeout(1400)
    y1=pg.evaluate("document.getElementById('mcaret').getBoundingClientRect().top"); mt=pg.evaluate("document.getElementById('mtxt').textContent")
    check('"There\u2019s More" cursor does not move while typing',abs(y0-y1)<0.5 and len(mt)>0,f'{y0:.1f} -> {y1:.1f} text="{mt}"')
    pg.wait_for_function("__fy.stage==='montage'",timeout=8000); pg.wait_for_timeout(800)
    check('Mareep hides during the montage',float(pg.evaluate("getComputedStyle(document.getElementById('mareep')).opacity"))<0.2)
    pg.wait_for_function("__fy.stage==='tvoff'",timeout=16000)   # montage + the pause before the TV switches off
    t0=time.time(); pg.wait_for_function("__fy.stage==='folders-ready'",timeout=16000); dt=time.time()-t0
    st=pg.evaluate("({settle:__fy.settleMs,maxErr:Math.max(...__fy.bodies.map(b=>Math.hypot(b.x-__fy.slots[b.i].x,b.y-__fy.slots[b.i].y))),ready:[...document.querySelectorAll('.fld.ready')].length,n:document.querySelectorAll('#fgrid .fld').length,stars:__fy.particlesRef().stars.length,circ:__fy.particlesRef().circs.length})")
    check('folders settle in under 10s',st['settle']<10000 and st['maxErr']<0.5 and st['ready']==st['n'],str(st))
    pg.wait_for_timeout(4200)
    pl=pg.evaluate("(()=>{const W=innerWidth,H=innerHeight,g=Math.min(W*.88,H*.84);return __fy.planets().map(p=>({spawned:p.spawned,near:Math.hypot(p.x-p.tx,p.y-p.ty)<6,clear:Math.max(Math.abs(p.x-W/2)-g/2,Math.abs(p.y-H/2)-g/2)>=p.r*1.95}))})()")
    check('ringed planet and earth-like planet are in place, clear of the folders',len(pl)==2 and all(x['spawned'] and x['near'] and x['clear'] for x in pl),str(pl))
    stop=pg.evaluate("[...document.querySelectorAll('#fgrad stop')].map(s=>s.getAttribute('stop-color')).join(',')"); print('folder gradient',stop)
    pg.wait_for_timeout(900); pg.screenshot(path='fy_folders.png')
    mb=pg.evaluate("(()=>{const r=document.getElementById('mareep').getBoundingClientRect(),b=document.getElementById('backBtn').getBoundingClientRect();return {m:[r.left,r.top,r.right,r.bottom],b:[b.left,b.top,b.right,b.bottom],href:document.getElementById('mareep').getAttribute('href'),op:getComputedStyle(document.getElementById('mareep')).opacity}})()")
    check('Mareep is top-left, links back to the portfolio and is visible again',mb['m'][0]<40 and mb['m'][1]<40 and mb['href']=='../' and float(mb['op'])>0.9,str(mb))
    check('Back button does not overlap Mareep',mb['b'][0]>=mb['m'][2]-1,str(mb))
    check('back button visible',pg.evaluate("document.getElementById('backBtn').classList.contains('vis')"))
    # open and close a bubble
    pg.click('#fgrid .fld:nth-child(2)'); pg.wait_for_timeout(900); check('bubble opens',pg.evaluate("!!document.querySelector('#bub .sheet')")); pg.screenshot(path='fy_b1.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600)
    # back to the slideshow, then forward again: no typing, no montage, no folder animation
    n0=len(pg.evaluate("__fy.hist"))
    pg.click('#backBtn'); pg.wait_for_function("__fy.stage==='slides'",timeout=6000); pg.wait_for_timeout(1200)
    onlast=pg.evaluate("[...document.querySelectorAll('.dot')].pop().classList.contains('act')")
    check('back lands on the last slide',onlast); pg.screenshot(path='fy_back.png')
    t0=time.time(); pg.click('.nav.next'); pg.wait_for_function("__fy.stage==='folders-ready'",timeout=8000); dt2=time.time()-t0
    hist=pg.evaluate("__fy.hist")[n0:]
    check('return skips typing, montage, TV and folder animation',not any(h in hist for h in ('more','montage','tvoff','folders')),str(hist))
    check('return is quick',dt2<4.5,'%.1fs'%dt2)
    pg.wait_for_timeout(700)
    same=pg.evaluate("__fy.bodies.every(b=>Math.hypot(b.x-__fy.slots[b.i].x,b.y-__fy.slots[b.i].y)<0.5)&&[...document.querySelectorAll('.fld')].every(f=>parseFloat(getComputedStyle(f).opacity)>0.99)")
    check('folders are back in place',same)
    pg.screenshot(path='fy_return.png')
    check('no console errors',not errs,str(errs))
    b.close()
print('ALL PASSED' if ok else 'SOME CHECKS FAILED'); sys.exit(0 if ok else 1)
