import json,sys
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8000/'
ROUTES=['','#/journal-101','#/flx-edits','#/this-is-animation','#/insurance-experience','#/generative-art','#/solar-system','#/matter-monsters','#/erie-events-branding','#/certifications','#/resume','#/intern-blog','#/culture-log','#/culture/music','#/culture/games','#/culture/movies','#/culture/tv']
issues=[]
def note(s): issues.append(s); print('ISSUE:',s)
with sync_playwright() as p:
    b=p.chromium.launch()
    # 0 failed requests and broken media (skips Google Fonts and third-party cover art so it works offline)
    ctx0=b.new_context(viewport={'width':1280,'height':800}); pg0=ctx0.new_page(); bad=[]
    pg0.on('response',lambda r: bad.append(f'{r.status} {r.url}') if r.status>=400 and 'fonts.g' not in r.url and 'steamstatic' not in r.url else None)
    pg0.on('requestfailed',lambda r: bad.append(f'failed {r.url[:90]}') if 'fonts.g' not in r.url and 'steamstatic' not in r.url and 'ERR_ABORTED' not in str(r.failure) else None)
    for r in ROUTES:
        pg0.goto(URL.split('#')[0]+r); pg0.reload(); pg0.wait_for_timeout(600)
        pg0.evaluate("window.scrollTo(0,document.body.scrollHeight)"); pg0.wait_for_timeout(250)
        broken=pg0.evaluate("[...document.querySelectorAll('img')].filter(i=>i.getAttribute('src')&&!/^https?:/.test(i.getAttribute('src'))&&i.complete&&i.naturalWidth===0).map(i=>i.src.slice(-40))")
        if broken: note(f'broken images on "{r or "home"}": {broken}')
    if bad: note(f'failed requests: {sorted(set(bad))[:6]}')
    ctx0.close()
    # 1 console/page errors + 2 overflow at several widths + 3 dup ids + a11y basics
    for w,h in [(320,640),(360,740),(390,844),(768,1024),(1024,768),(1440,900)]:
        ctx=b.new_context(viewport={'width':w,'height':h}); pg=ctx.new_page()
        errs=[]
        pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)))
        pg.on('console',lambda m: errs.append('console '+m.text) if m.type in('error','warning') and 'ERR_NAME_NOT_RESOLVED' not in m.text and 'ERR_INTERNET' not in m.text else None)
        for r in ROUTES:
            pg.goto(URL.split('#')[0]+r); pg.reload(); pg.wait_for_timeout(450)
            ow=pg.evaluate("document.documentElement.scrollWidth-window.innerWidth")
            if ow>1: note(f'horizontal overflow {ow}px at {w}px on "{r or "home"}"')
            dups=pg.evaluate("(()=>{const c={};document.querySelectorAll('[id]').forEach(e=>c[e.id]=(c[e.id]||0)+1);return Object.entries(c).filter(([k,v])=>v>1).map(([k])=>k)})()")
            if dups and w==390: note(f'duplicate ids {dups} on {r}')
            if w==390:
                noalt=pg.evaluate("[...document.querySelectorAll('img:not([alt])')].length")
                if noalt: note(f'{noalt} imgs without alt on {r}')
                nobtn=pg.evaluate("[...document.querySelectorAll('button')].filter(b=>!(b.innerText||b.getAttribute('aria-label')||'').trim()).length")
                if nobtn: note(f'{nobtn} buttons with no name on {r}')
                h1=pg.evaluate("document.querySelectorAll('h1').length")
                vis=pg.evaluate("[...document.querySelectorAll('h1')].filter(e=>e.offsetParent!==null).length")
                if vis!=1: note(f'{vis} visible h1 on "{r or "home"}"')
        if errs: note(f'errors at {w}px: {sorted(set(errs))[:4]}')
        ctx.close()
    # 4 anchors
    pg=b.new_page(viewport={'width':1280,'height':800}); pg.goto(URL); pg.wait_for_timeout(500)
    bad=pg.evaluate("""(()=>{const out=[];const routes=new Set(['certifications','resume','intern-blog','culture-log','culture/music','culture/games','culture/movies','culture/tv']);
      const ids=new Set(window.__ids||[]);
      document.querySelectorAll('a[href^="#"]').forEach(a=>{const h=a.getAttribute('href');if(h==='#')return;
        if(h.startsWith('#/')){const k=h.slice(2);if(!routes.has(k)&&!document.getElementById('p-'+k)&&!/^(journal-101|flx-edits|this-is-animation|insurance-experience|generative-art|solar-system|matter-monsters|erie-events-branding)$/.test(k))out.push(h);}
        else if(!document.getElementById(h.slice(1)))out.push(h);});return out})()""")
    if bad: note(f'dead anchors {bad}')
    # 5 external links rel
    ext=pg.evaluate("[...document.querySelectorAll('a[href^=http]')].filter(a=>a.target==='_blank'&&!/noopener/.test(a.rel)).map(a=>a.href)")
    if ext: note(f'external links missing noopener {ext}')
    # 6 keyboard: arrows, toggle, dropdown, escape
    pg.keyboard.press('ArrowRight'); t1=pg.evaluate("document.getElementById('title').textContent")
    pg.keyboard.press('ArrowLeft'); t2=pg.evaluate("document.getElementById('title').textContent")
    if t1==t2: note('arrow keys do not change disc')
    kb=pg.evaluate("(()=>{const s=document.getElementById('stage');return {tab:s.tabIndex,role:s.getAttribute('role')}})()")
    if kb['tab']<0 or not kb['role']: note('case (stage) is not keyboard focusable / has no role')
    nav=pg.evaluate("document.querySelector('nav').getAttribute('aria-label')")
    if not nav: note('nav has no aria-label')
    # 7 back/forward scroll restoration
    pg.evaluate("window.scrollTo(0,900)"); pg.wait_for_timeout(150); y0=pg.evaluate("scrollY")
    pg.evaluate("location.hash='#/matter-monsters'"); pg.wait_for_timeout(300)
    pg.go_back(); pg.wait_for_timeout(600); y1=pg.evaluate("scrollY")
    if abs(y1-y0)>150: note(f'scroll position lost after back (was {y0}, now {y1})')
    # 8 smooth scroll jump when opening a view
    # 9 unknown route
    pg.evaluate("location.hash='#/nope'"); pg.wait_for_timeout(300)
    if pg.evaluate("document.body.classList.contains('viewing')"): note('unknown route leaves viewing state')
    # 10 lightbox
    pg.goto(URL.split('#')[0]+'#/matter-monsters'); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('.gal img').focus()"); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    if not pg.evaluate("document.getElementById('lb').classList.contains('on')"): note('lightbox does not open from keyboard')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    if pg.evaluate("document.getElementById('lb').classList.contains('on')"): note('lightbox does not close with Escape')
    # 11 perf metrics
    ctx=b.new_context(viewport={'width':390,'height':844}); pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg); cdp.send('Performance.enable')
    pg.goto(URL); pg.wait_for_timeout(1500)
    m={x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
    nav_t=pg.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)}})()")
    print('PERF nodes',int(m['Nodes']),'heapMB',round(m['JSHeapUsedSize']/1e6,1),'layoutCount',int(m['LayoutCount']),'script ms',round(m['ScriptDuration']*1000),'task ms',round(m['TaskDuration']*1000),nav_t)
    b.close()
print('\nTOTAL ISSUES',len(issues))
