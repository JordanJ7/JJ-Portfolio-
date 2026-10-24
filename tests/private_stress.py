"""Stress tests for the special site: several screen sizes, the settle-time guarantee, pass-through, lockout persistence, reduced motion.
Usage: python3 tests/private_stress.py   (needs the site served at http://localhost:8000/)"""
import time,json,os,sys
try: PW1,PW2,PW3,PW4=os.environ['PW1'],os.environ['PW2'],os.environ['PW3'],os.environ['PW4']
except KeyError: sys.exit('Set PW1, PW2, PW3 and PW4 to the four answers (they are never stored in the repo).')
from playwright.sync_api import sync_playwright
def cfgjs(extra=''):
    return "window.PRIVATE_CONFIG={locks:[1,1.4],prompt:{fadeIn:100,hold:100,fadeOut:100,rise:56},start:'folders'%s};"%extra
def login(pg):
    pg.goto('http://localhost:8000/special/'); pg.wait_for_timeout(500); pg.click('#login')
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=8000)
    pg.keyboard.type(PW1); pg.keyboard.press('Enter')
    pg.wait_for_function("__fy.stage==='login2'",timeout=8000)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=8000)
    pg.keyboard.type(PW2); pg.keyboard.press('Enter')
    pg.wait_for_function("__fy.stage==='login3'",timeout=8000); pg.wait_for_timeout(300)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=8000)
    pg.keyboard.type(PW3); pg.keyboard.press('Enter')
    pg.wait_for_function("__fy.stage==='login4'",timeout=8000); pg.wait_for_timeout(300)
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=8000)
    pg.keyboard.type(PW4); pg.keyboard.press('Enter')
with sync_playwright() as p:
    b=p.chromium.launch()
    # 1: several viewports, default settle
    for name,w,h in [('phone',390,844),('tiny',320,568),('tablet',768,1024),('hd',1920,1080),('land',844,390)]:
        ctx=b.new_context(viewport={'width':w,'height':h}); ctx.add_init_script(cfgjs()); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        login(pg); t0=time.time(); pg.wait_for_function("__fy.stage==='folders-ready'",timeout=16000); dt=time.time()-t0
        st=pg.evaluate("({settle:__fy.settleMs,imp:__fy.impacts,maxErr:Math.max(...__fy.bodies.map(b=>Math.hypot(b.x-__fy.slots[b.i].x,b.y-__fy.slots[b.i].y))),inView:__fy.bodies.every(b=>b.x>0&&b.x<innerWidth&&b.y>0&&b.y<innerHeight),tin:(()=>{const W=innerWidth,H=innerHeight,g=Math.min(W*.88,H*.84);return __fy.targets().filter(t=>Math.abs(t[0]-W/2)<g/2&&Math.abs(t[1]-H/2)<g/2).length})()})")
        pg.wait_for_timeout(800); pg.screenshot(path=f'fy2_{name}.png')
        print(name,'ready %.1fs'%dt,st,errs)
        ctx.close()
    # 2: tight settle budget still guaranteed
    ctx=b.new_context(viewport={'width':1280,'height':800}); ctx.add_init_script(cfgjs(",fold:{settle:4000}")); pg=ctx.new_page()
    login(pg); pg.wait_for_function("__fy.stage==='folders-ready'",timeout=9000)
    print('settle=4000 ->',pg.evaluate("({s:__fy.settleMs,maxErr:Math.max(...__fy.bodies.map(b=>Math.hypot(b.x-__fy.slots[b.i].x,b.y-__fy.slots[b.i].y)))})")); ctx.close()
    # 3: ghost / pass-through when two folders are pushed into each other
    ctx=b.new_context(viewport={'width':1280,'height':800}); ctx.add_init_script(cfgjs()); pg=ctx.new_page()
    login(pg); pg.wait_for_function("__fy.stage==='folders'",timeout=9000); pg.wait_for_timeout(2500)
    pg.evaluate("(()=>{const s=__fy.slots; s[1].x=s[0].x+6; s[1].y=s[0].y;})()")
    pg.wait_for_timeout(2500); print('ghosts after forced overlap:',pg.evaluate("__fy.ghosts")); ctx.close()
    # 4: lockout alternation and persistence across reload
    ctx=b.new_context(viewport={'width':1280,'height':800}); ctx.add_init_script("window.PRIVATE_CONFIG={locks:[2,3]};"); pg=ctx.new_page()
    pg.goto('http://localhost:8000/special/'); pg.wait_for_timeout(500); pg.click('#login')
    pg.wait_for_function("!document.getElementById('field').disabled",timeout=8000)   # question 1's prompt plays first
    def bad():
        pg.keyboard.type('000'); pg.keyboard.press('Enter'); pg.wait_for_timeout(450)
    for _ in range(4): bad()
    first=pg.evaluate("document.getElementById('count').textContent"); pg.wait_for_function("!document.getElementById('field').disabled",timeout=6000)
    bad(); bad(); second=pg.evaluate("document.getElementById('count').textContent")
    print('lock1 shows',first,'lock2 shows',second)
    pg.reload(); pg.wait_for_timeout(300); print('after reload locked:',pg.evaluate("(JSON.parse(localStorage.getItem('jj_fy_state')||'{}').s1||{}).u>Date.now()"),'(lock survives the reload)',pg.wait_for_timeout(3300) or '','hint visible:',pg.evaluate("document.getElementById('hint').classList.contains('vis')")); ctx.close()
    # 5: reduced motion path
    ctx=b.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce'); ctx.add_init_script(cfgjs()); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    login(pg); pg.wait_for_function("__fy.stage==='folders-ready'",timeout=9000); print('reduced motion ready, errors',errs); ctx.close()
    b.close()
