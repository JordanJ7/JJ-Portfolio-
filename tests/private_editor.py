"""Page editor test: opens the editor, edits slides, quotes, the photo barrage, folders, books (page scan) and answers,
then publishes to a FAKE GitHub (nothing leaves this machine) and checks the commit it would make.
Usage: python3 tests/private_editor.py   (needs the site at http://localhost:8000/)
Set EDPW (editor password) and PW3 (the third answer) in the environment; they are never stored in the repo."""
import os,sys,json,base64,time,tempfile
from playwright.sync_api import sync_playwright
S=tempfile.mkdtemp(); F=S; EDPW=os.environ['EDPW']
results=[]
def check(n,c,x=''): results.append(c); print(('PASS ' if c else 'FAIL ')+n,x)
commits={'blobs':[],'tree':None,'commit':None,'ref':None}
def gh(route):
    r=route.request; u=r.url; body=r.post_data_json if r.method in('POST','PATCH') else None
    def ok(o): route.fulfill(status=200 if r.method!='POST' else 201,content_type='application/json',body=json.dumps(o))
    if '/git/ref/heads/main' in u and r.method=='GET': return ok({'object':{'sha':'headsha'}})
    if '/git/commits/headsha' in u: return ok({'sha':'headsha','tree':{'sha':'treesha'}})
    if '/contents/docs/special/editor.js' in u: return ok({'name':'editor.js'})
    if u.endswith('/git/blobs'): commits['blobs'].append(len(body['content'])); return ok({'sha':'blob%d'%len(commits['blobs'])})
    if u.endswith('/git/trees'): commits['tree']=body; return ok({'sha':'newtree'})
    if u.endswith('/git/commits'): commits['commit']=body; return ok({'sha':'newcommit'})
    if '/git/refs/heads/main' in u: commits['ref']=body; return ok({'object':{'sha':'newcommit'}})
    route.fulfill(status=404,body='{}')
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':860},accept_downloads=False); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('dialog',lambda d: d.accept())
    ctx.route('https://api.github.com/**',gh)
    pg.goto('http://localhost:8000/special/'); pg.wait_for_timeout(800)
    def canvas_file(js,name):
        b64=pg.evaluate("async()=>{const c=document.createElement('canvas');"+js+";const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));const u=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);}")
        open(F+'/'+name,'wb').write(base64.b64decode(b64))
    canvas_file("c.width=1200;c.height=900;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,900);g.addColorStop(0,'#88a0c8');g.addColorStop(1,'#d8a0a8');x.fillStyle=g;x.fillRect(0,0,1200,900);x.fillStyle='#fff';x.font='bold 90px sans-serif';x.fillText('TEST PHOTO',330,470)",'photo.jpg')
    canvas_file("c.width=2200;c.height=2600;const x=c.getContext('2d');x.fillStyle='#283040';x.fillRect(0,0,2200,2600);x.translate(420,330);x.rotate(.09);const g=x.createLinearGradient(0,0,1450,0);g.addColorStop(0,'#e2e8ee');g.addColorStop(1,'#8c9095');x.fillStyle=g;x.fillRect(0,0,1450,1900);x.fillStyle='#463228';x.font='italic 90px serif';['Dear you,','I wrote this by hand','so the scanner has','to find the page.','Love, me'].forEach((t,i)=>x.fillText(t,110,260+i*190))",'page.jpg')
    check('edit button visible on the first password page',pg.evaluate("document.getElementById('editBtn').classList.contains('vis')"))
    pg.click('#editBtn'); pg.fill('#gatePw','wrong password'); pg.click('#gateForm button[type=submit]'); pg.wait_for_timeout(1800)
    check('wrong editor password refused',pg.inner_text('#gateMsg').startswith('That is not'),pg.inner_text('#gateMsg'))
    pg.fill('#gatePw',EDPW); pg.click('#gateForm button[type=submit]')
    pg.wait_for_selector('#ed',timeout=15000); check('editor opens with the right password',True)
    # slides: colour, title, add photo + text
    pg.screenshot(path=S+'/ed_slides.png')
    pg.click('.edSw[title="White"]')
    pg.locator('.edCard').nth(1).locator('input').first.fill('Our first trip')
    with pg.expect_file_chooser() as fc: pg.locator('.edCard').nth(1).get_by_text('+ Photos / videos').click()
    fc.value.set_files(F+'/photo.jpg'); pg.wait_for_function("!document.getElementById('edBusy').classList.contains('on')",timeout=20000); pg.wait_for_timeout(300)
    st=pg.evaluate("FyEditor._test.state()")
    sl=st['c']['slides'][0]
    check('photo added to slide 1 with a thumbnail',sl['items'][-1]['kind']=='photo' and 'thumb' in sl['items'][-1],str(sl['items'][-1])[:120])
    check('slide title and colour changed',sl['title']=='Our first trip' and st['c']['look']['slideText']=='#ffffff')
    # quotes speed
    pg.click('.edTab[data-tab=quotes]'); pg.locator('input[type=range]').evaluate("r=>{r.value=1.6;r.dispatchEvent(new Event('input'))}")
    check('quote speed set',pg.evaluate("FyEditor._test.state().c.look.quoteSpeed")==1.6)
    # barrage: count + vertical ending video made in the browser
    pg.click('.edTab[data-tab=barrage]')
    vid=pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=360;c.height=640;const x=c.getContext('2d');const s=c.captureStream(30);const r=new MediaRecorder(s,{mimeType:'video/webm'});const ch=[];r.ondataavailable=e=>ch.push(e.data);r.start();
      const t0=performance.now();await new Promise(res=>{(function f(){const t=(performance.now()-t0)/1000;x.fillStyle='hsl('+(t*120)+',70%,60%)';x.fillRect(0,0,360,640);x.fillStyle='#fff';x.font='60px sans-serif';x.fillText('END '+t.toFixed(1),60,320);if(t<2.2)requestAnimationFrame(f);else res();})();});
      r.stop();await new Promise(res=>r.onstop=res);const b=new Blob(ch,{type:'video/webm'});const u=new Uint8Array(await b.arrayBuffer());let s2='';for(let i=0;i<u.length;i+=32768)s2+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s2);}""")
    open(F+'/vertical.webm','wb').write(base64.b64decode(vid))
    pg.locator('.edCard').nth(1).locator('input[type=number]').first.fill('20')
    with pg.expect_file_chooser() as fc: pg.get_by_text('+ Choose the vertical video').click()
    fc.value.set_files(F+'/vertical.webm'); pg.wait_for_function("!document.getElementById('edBusy').classList.contains('on')",timeout=20000); pg.wait_for_timeout(400)
    M=pg.evaluate("FyEditor._test.state().c.montage")
    check('ending video set and vertical',M['finale'] and M['finale']['h']>M['finale']['w'],str({k:M['finale'][k] for k in ('w','h','dur')} if M['finale'] else None))
    check('barrage count set',M['count']==20)
    # folders: count and a text item with a date
    pg.click('.edTab[data-tab=folders]'); pg.locator('.edCard').first.locator('input[type=number]').fill('9'); pg.get_by_text('Apply').click(); pg.wait_for_timeout(300)
    check('folder count changed to 9',len(pg.evaluate("FyEditor._test.state().c.folders"))==9)
    # books: add a page through the scanner
    pg.click('.edTab[data-tab=books]')
    with pg.expect_file_chooser() as fc: pg.locator('.edCard').first.get_by_text('+ Add pages').click()
    t0=time.time(); fc.value.set_files(F+'/page.jpg'); pg.wait_for_function("!document.getElementById('edBusy').classList.contains('on')",timeout=60000); pg.wait_for_timeout(300)
    bk=pg.evaluate("FyEditor._test.state().c.books[0]"); sc=pg.evaluate("Object.values(FyEditor._test.state().scans)[0]")
    check('page scanned and added',len(bk['pages'])==1,'took %.1fs, page %dx%d, edges found %s'%(time.time()-t0,bk['pages'][0]['w'],bk['pages'][0]['h'],sc['found']))
    pid=bk['pages'][0]['id']
    data=pg.evaluate("async id=>{const m=await __fy.api.media(id,'image/webp');const b=await m.blob.arrayBuffer();const u=new Uint8Array(b);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);}",pid)
    open(S+'/scanned_page.webp','wb').write(base64.b64decode(data))
    pg.screenshot(path=S+'/ed_books.png')
    # access: change answer for q3 needs the old one
    pg.click('.edTab[data-tab=access]')
    pg.locator('.edCard').nth(2).get_by_text('Change the answers').click()
    pg.locator('.edDlgBox input').first.fill('not the answer'); pg.locator('.edDlgBox textarea').fill('pup'); pg.locator('.edDlgBox button[type=submit]').click(); pg.wait_for_timeout(1500)
    w_before=pg.evaluate("FyEditor._test.state().vault.q[2].w.length")
    pg.locator('.edDlgBox input').first.fill(os.environ['PW3']); pg.locator('.edDlgBox textarea').fill('dog\nDoggo\ndog'); pg.locator('.edDlgBox button[type=submit]').click(); pg.wait_for_timeout(2500)
    q3=pg.evaluate("FyEditor._test.state().vault.q[2]")
    check('wrong old answer refused, right one accepted, duplicates folded',len(q3['w'])==2,'wraps now %d'%len(q3['w']))
    pg.screenshot(path=S+'/ed_access.png')
    # publish against the fake GitHub
    pg.click('.edTab[data-tab=publish]'); pg.locator('#ed input[type=password]').fill('ghp_testtoken'); pg.get_by_text('Save token').click()
    pg.get_by_text('Publish now').click(); pg.wait_for_function("document.querySelector('.edLog')&&/Done\\./.test(document.querySelector('.edLog').innerText)",timeout=60000)
    tree=commits['tree']['tree']; paths=[t['path'] for t in tree]
    check('commit has the vault and every new media file',('docs/special/vault.json' in paths) and sum(p.startswith('docs/special/media/') for p in paths)>=6, '%d tree entries, %d blobs'%(len(tree),len(commits['blobs'])))
    check('ref moved to the new commit',commits['ref']=={'sha':'newcommit'})
    vault_blob=None
    print('log:',pg.inner_text('.edLog').replace('\n',' | '))
    pg.screenshot(path=S+'/ed_publish.png')
    print('errors',errs)
    print('ALL PASSED' if all(results) else 'SOME FAILED')
