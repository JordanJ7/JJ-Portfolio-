(function(){
'use strict';
var D=document;
function $(s,r){return (r||D).querySelector(s);}
function el(tag,cls,html){var e=D.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function merge(a,b){for(var k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=merge(a[k]||{},b[k]);}else a[k]=b[k];}return a;}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function rnd(a,b){return a+Math.random()*(b-a);}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.random()*(i+1)|0,t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* ------------------------------------------------------------------ config */
var CFG=merge({
  locks:[7,11],            /* lockout seconds, alternating */
  hintAfter:2,             /* wrong tries before the hint shows */
  lockAt:4,                /* total wrong tries before the first lockout, then every 2 more */
  prompt:{pre:553,fadeIn:612,hold:1496,fadeOut:1020,rise:56},   /* waits before the prompts for questions 2 and 3, ms (15% quicker than the last version); pre = pause while the old line fades out; rise = px the prompt floats up while fading */
  intro:{typing:1800,delay:180,attr:200,reading:2100,fade:600},   /* same timings as Journal-101 */
  slide:{autoplay:false,ms:7000},
  more:{type:4320,hold:3000},                      /* typed "There's More", ms (was 6000, then 5400, now 20% faster again) */
  returnSkips:true,                                 /* after the Back button, skip typing, montage and the folder animation */
  mont:{frames:64,start:150,end:60,size:[.38,.8],maxFill:.78,tilt:7},   /* ms per frame ramping from start to end; size = long side as a share of the shorter screen side; maxFill = no photo is ever bigger than this share of the screen width or height; tilt = random degrees */
  tv:1300,
  fold:{settle:9500,stars:26,circles:26,perImpact:3},
  start:'login'
},window.PRIVATE_CONFIG||{});
var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
var HINTS={1:'birthday',2:'Its a Pokemon',3:'never had an actual name for it'};
var PROMPTS={2:"My Child's Name",3:'My Original Child'};
var embed=window.PRIVATE_EMBED||null;
var S={vault:null,p1:'',p2:'',p3:'',key:null,content:null};
window.__fy={stage:'login',hist:['login'],impacts:0,ghosts:0,settleMs:null,particles:0};

/* ------------------------------------------------------------------ crypto */
var enc=new TextEncoder(),dec=new TextDecoder();
function b64(s){var bin=atob(s),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return u;}
function toB64(u8){var s='',c=0x8000;for(var i=0;i<u8.length;i+=c)s+=String.fromCharCode.apply(null,u8.subarray(i,i+c));return btoa(s);}
function hex(u){var s='';for(var i=0;i<u.length;i++)s+=('0'+u[i].toString(16)).slice(-2);return s;}
function norm1(v){var s=String(v).replace(/\s+/g,'');return /^\d+$/.test(s)?s.replace(/^0+/,''):s;}   /* leading zeros do not matter */
function norm2(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
async function kdf(pw,saltB64,iter){
  var k=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64(saltB64),iterations:iter},k,256));
}
async function check(stage,raw){
  var n=stage===1?norm1(raw):norm2(raw); if(!n)return false;
  var ok=hex(await kdf(n,S.vault['s'+stage],S.vault.iter))===S.vault['v'+stage];
  if(ok)S['p'+stage]=n;
  return ok;
}
async function deriveKey(){
  var raw=await kdf(S.p1+'\u0000'+S.p2+'\u0000'+S.p3,S.vault.sk,S.vault.iter);
  return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
}
async function aes(key,u8){return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:u8.slice(0,12)},key,u8.slice(12)));}
var cache={};
function media(id,mime){
  if(cache[id])return cache[id];
  cache[id]=(async function(){
    var u8;
    if(embed&&embed.files&&embed.files[id])u8=b64(embed.files[id]);
    else{var r=await fetch('media/'+id+'.enc');if(!r.ok)throw new Error('missing media '+id);u8=new Uint8Array(await r.arrayBuffer());}
    var pl=await aes(S.key,u8),blob=new Blob([pl],{type:mime||'application/octet-stream'});
    var url=embed?('data:'+(mime||'application/octet-stream')+';base64,'+toB64(pl)):URL.createObjectURL(blob);
    return {url:url,blob:blob};
  })();
  return cache[id];
}

/* ------------------------------------------------------------------ layers */
function on(id){var e=D.getElementById(id);e.classList.add('on');void e.offsetWidth;requestAnimationFrame(function(){e.classList.add('vis');});}
function off(id){var e=D.getElementById(id);e.classList.remove('vis');return sleep(620).then(function(){e.classList.remove('on');});}
function stageName(n){window.__fy.stage=n;window.__fy.hist.push(n);D.body.classList.toggle('hidem',n==='montage'||n==='tvoff');}

/* ------------------------------------------------------------------ login */
var store={
  get:function(){try{return JSON.parse(localStorage.getItem('jj_fy_state'))||{};}catch(e){return {};}},
  set:function(o){try{localStorage.setItem('jj_fy_state',JSON.stringify(o));}catch(e){}}
};
var A={stage:1,fails:0,li:0,until:0,busy:false,locked:false,timer:0};
var field=$('#field'),typed=$('#typed'),caret=$('#caret'),line=$('#line'),hintEl=$('#hint'),promptEl=$('#prompt'),countEl=$('#count');
function loadStage(n){var s=store.get()['s'+n]||{f:0,li:0,u:0};A.fails=s.f|0;A.li=s.li|0;A.until=+s.u||0;}
function saveStage(){var s=store.get();s['s'+A.stage]={f:A.fails,li:A.li,u:A.until};store.set(s);}
function sync(){typed.textContent=field.value;}
function wiggle(){line.classList.remove('wiggle');void line.offsetWidth;line.classList.add('wiggle');}
function showHint(){hintEl.textContent=HINTS[A.stage];hintEl.classList.add('vis');}
function startLock(){
  A.locked=true;field.disabled=true;caret.classList.add('locked');countEl.classList.add('vis');
  (function tick(){
    var left=Math.ceil((A.until-Date.now())/1000);
    if(left<=0){endLock();return;}
    countEl.textContent=left;A.timer=setTimeout(tick,150);
  })();
}
function endLock(){A.locked=false;field.disabled=false;caret.classList.remove('locked');countEl.classList.remove('vis');field.value='';sync();try{field.focus();}catch(e){}}
async function submit(){
  if(A.busy||A.locked)return;
  var v=field.value;if(!v.trim())return;
  A.busy=true;var ok=false;
  try{ok=await check(A.stage,v);}catch(e){console.error(e);}
  A.busy=false;
  if(ok){A.fails=0;A.li=0;A.until=0;saveStage();return advance();}
  A.fails++;field.value='';sync();wiggle();
  if(A.fails>=CFG.hintAfter)showHint();
  if(A.fails>=CFG.lockAt&&A.fails%2===0){
    var sec=CFG.locks[A.li%CFG.locks.length];A.li++;A.until=Date.now()+sec*1000;saveStage();startLock();
  }else saveStage();
}
field.addEventListener('input',sync);
field.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submit();}});
$('#login').addEventListener('pointerdown',function(){if(!field.disabled)field.focus();});
$('#login').addEventListener('click',function(){if(!field.disabled)field.focus();});
/* typing before the field has focus still counts */
D.addEventListener('keydown',function(e){
  if(!$('#login').classList.contains('on')||field.disabled||D.activeElement===field||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key.length===1){field.focus();field.value+=e.key;sync();e.preventDefault();}
  else if(e.key==='Backspace'){field.focus();field.value=field.value.slice(0,-1);sync();e.preventDefault();}
  else if(e.key==='Enter'){e.preventDefault();submit();}
});
async function runPrompt(text,midway){
  var P=CFG.prompt;
  promptEl.textContent=text;
  promptEl.style.transition='none';promptEl.style.opacity=0;promptEl.style.setProperty('--py','12px');
  void promptEl.offsetWidth;
  promptEl.style.transition='opacity '+P.fadeIn+'ms ease,transform '+P.fadeIn+'ms ease';
  promptEl.style.opacity=1;promptEl.style.setProperty('--py','0px');
  await sleep(P.fadeIn+P.hold);
  /* it floats up and fades, and the blinking cursor appears underneath as it goes */
  promptEl.style.transition='opacity '+P.fadeOut+'ms ease,transform '+P.fadeOut+'ms cubic-bezier(.3,.6,.3,1)';
  promptEl.style.opacity=0;promptEl.style.setProperty('--py',(-P.rise)+'px');
  setTimeout(midway,Math.round(P.fadeOut*.45));
  await sleep(P.fadeOut);
}
async function advance(){
  if(A.stage>=3){field.disabled=true;await finishLogin();return;}
  var n=A.stage+1;A.stage=n;stageName('login'+n);
  line.style.transition='opacity '+Math.round(CFG.prompt.pre*.92)+'ms ease';line.style.opacity=0;hintEl.classList.remove('vis');field.disabled=true;
  await sleep(CFG.prompt.pre);
  field.value='';sync();loadStage(n);caret.classList.add('hide');line.style.opacity=1;
  await runPrompt(PROMPTS[n],function(){caret.classList.remove('hide');});
  caret.classList.remove('hide');
  if(A.fails>=CFG.hintAfter)showHint();
  if(A.until>Date.now())startLock();else{field.disabled=false;try{field.focus();}catch(e){}}
}
async function finishLogin(){
  S.key=await deriveKey();
  S.content=JSON.parse(dec.decode(await aes(S.key,b64(S.vault.data))));
  stageName('opening');
  await off('login');
  await sequence(CFG.start);
}
async function boot(){
  if(!window.crypto||!crypto.subtle){typed.textContent='needs https';return;}
  try{
    if(embed&&embed.vault)S.vault=embed.vault;
    else{var r=await fetch('vault.json',{cache:'no-store'});S.vault=await r.json();}
  }catch(e){console.error('vault',e);return;}
  loadStage(1);
  if(A.fails>=CFG.hintAfter)showHint();
  if(A.until>Date.now())startLock();
  else{try{field.focus();}catch(e){}}
}

/* ------------------------------------------------------------------ media items (slides and bubbles) */
var viewerOpen=null;
function buildItem(it,host){
  var k=it.kind;
  if(k==='text'){
    var t=el('div','it text');
    String(it.text||'').split(/\n\n+/).forEach(function(p){t.appendChild(el('p',null,esc(p).replace(/\n/g,'<br>')));});
    return t;
  }
  var b=el('button','it '+(k==='video'?'video':'photo'));b.type='button';
  b.dataset.id=it.id||'';b.dataset.mime=it.mime||'';
  if(it.poster){b.dataset.pid=it.poster.id;b.dataset.pmime=it.poster.mime||'image/jpeg';}
  b.setAttribute('aria-label',it.caption||(k==='video'?'Play video':'Open photo'));
  if(k==='video')b.appendChild(el('span','play'));
  if(it.caption)b.appendChild(el('span','cap',esc(it.caption)));
  b.addEventListener('click',function(){openViewer(host,it);});
  return b;
}
function renderItems(items,host,cls){
  var n=items.length;
  var g=el('div','items '+(cls==='mixed'?'':(n>=5?'scroll':'n'+Math.max(1,Math.min(4,n))))+(cls?' '+cls:''));
  items.forEach(function(it){g.appendChild(buildItem(it,host));});
  return g;
}
function hydrate(root){
  root.querySelectorAll('.it.photo:not([data-ok]),.it.video:not([data-ok])').forEach(function(b){
    b.dataset.ok='1';
    var isV=b.classList.contains('video');
    if(isV&&b.dataset.pid){
      media(b.dataset.pid,b.dataset.pmime).then(function(m){var im=new Image();im.alt='';im.decoding='async';im.src=m.url;b.insertBefore(im,b.firstChild);}).catch(function(){});
    }else if(isV){
      media(b.dataset.id,b.dataset.mime).then(function(m){var v=D.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';v.src=m.url+'#t=0.1';b.insertBefore(v,b.firstChild);}).catch(function(){});
    }else{
      media(b.dataset.id,b.dataset.mime).then(function(m){var im=new Image();im.alt=b.getAttribute('aria-label')||'';im.decoding='async';im.src=m.url;b.insertBefore(im,b.firstChild);}).catch(function(){});
    }
  });
}
var ICON={
  chevR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  play:'<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause:'<svg viewBox="0 0 14 14"><rect x="2.5" y="1.5" width="3" height="11" rx="1" fill="currentColor"/><rect x="8.5" y="1.5" width="3" height="11" rx="1" fill="currentColor"/></svg>',
  full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
function fsEl(e){return e.requestFullscreen?e.requestFullscreen():(e.webkitRequestFullscreen?e.webkitRequestFullscreen():null);}
function openViewer(host,it){
  closeViewer();
  var v=el('div','viewer'),bar=el('div','vbar');
  var fb=el('button','vbtn',ICON.full);fb.type='button';fb.setAttribute('aria-label','Full screen');
  var cb=el('button','vbtn',ICON.x);cb.type='button';cb.setAttribute('aria-label','Close');
  bar.appendChild(fb);bar.appendChild(cb);v.appendChild(bar);host.appendChild(v);
  var node;
  media(it.id,it.mime).then(function(m){
    if(!v.isConnected)return;
    if(it.kind==='video'){node=D.createElement('video');node.controls=true;node.playsInline=true;node.autoplay=true;node.src=m.url;}
    else{node=new Image();node.alt=it.caption||'';node.src=m.url;}
    v.insertBefore(node,bar);
    fb.onclick=function(){
      if(D.fullscreenElement||D.webkitFullscreenElement){(D.exitFullscreen||D.webkitExitFullscreen).call(D);return;}
      var r=fsEl(v);if(!r&&node&&node.webkitEnterFullscreen)node.webkitEnterFullscreen();
    };
  }).catch(function(){v.appendChild(el('div','empty','Could not load.'));});
  cb.onclick=closeViewer;
  viewerOpen=v;
}
function closeViewer(){
  if(!viewerOpen)return;
  var v=viewerOpen;viewerOpen=null;
  if(D.fullscreenElement||D.webkitFullscreenElement){try{(D.exitFullscreen||D.webkitExitFullscreen).call(D);}catch(e){}}
  var vid=v.querySelector('video');if(vid)vid.pause();
  v.remove();
}

/* ------------------------------------------------------------------ intro quote (same animation as Journal-101) */
function intro(){
  return new Promise(function(done){
    var quotes=(S.content.quotes||[]).filter(function(q){return q&&String(q).trim();});
    var q=quotes.length?quotes[Math.random()*quotes.length|0]:'Love Is A Catalyst for Change';
    var h=$('#q'),attr=$('#attr');
    h.className=['f-serif','f-sans','f-grotesk','f-display','f-mono'][Math.random()*5|0];
    h.innerHTML='\u201C<span id="qt"></span>\u201D<span class="vc"></span>';
    var qt=$('#qt'),vc=$('.vc',h);
    attr.textContent=S.content.attribution||'\u2014 Me';attr.classList.remove('vis');
    stageName('intro');on('intro');
    var T=CFG.intro,raf=0,timers=[],dismissed=false;
    function dismiss(){
      if(dismissed)return;dismissed=true;cancelAnimationFrame(raf);timers.forEach(clearTimeout);
      var o=$('#intro');o.classList.remove('vis');setTimeout(function(){o.classList.remove('on');done();},T.fade);
    }
    $('#skip').onclick=dismiss;
    timers.push(setTimeout(function(){
      var start=null;
      function step(now){
        if(dismissed)return;
        if(start===null)start=now;
        var el_=now-start,n=Math.min(q.length,Math.floor(q.length*el_/T.typing));
        qt.textContent=q.slice(0,n);
        if(el_<T.typing)raf=requestAnimationFrame(step);
        else{
          qt.textContent=q;vc.classList.add('pulse');
          timers.push(setTimeout(function(){attr.classList.add('vis');timers.push(setTimeout(dismiss,T.reading));},T.attr));
        }
      }
      raf=requestAnimationFrame(step);
    },T.delay));
  });
}

/* ------------------------------------------------------------------ slideshow */
function slideshow(startIdx){
  return new Promise(function(done){
    var slides=S.content.slides||[];
    if(!slides.length){done();return;}
    var stage=$('#stage'),track=$('#track'),caps=$('#caps'),prev=$('.nav.prev'),next=$('.nav.next'),pp=$('#pp'),pager=$('#pager');
    track.innerHTML='';caps.innerHTML='';stage.style.opacity='';stage.style.transition='';
    pager.classList.remove('fadeout');prev.classList.add('gone');next.classList.remove('gone');
    prev.innerHTML=ICON.chevL;next.innerHTML=ICON.chevR;
    var idx=startIdx||0,playing=!!CFG.slide.autoplay,timer=0,ended=false,slideEls=[];
    slides.forEach(function(sl,i){
      var s=el('section','sl');s.setAttribute('aria-label','Slide '+(i+1)+' of '+slides.length);
      if(sl.title)s.appendChild(el('h3',null,esc(sl.title)));
      s.appendChild(renderItems(sl.items||[],stage));
      track.appendChild(s);slideEls.push(s);
      var d=el('button','dot','<i></i>');d.type='button';d.setAttribute('aria-label','Go to slide '+(i+1));
      d.addEventListener('click',function(){go(i);});caps.appendChild(d);
    });
    function setPP(){pp.innerHTML=playing?ICON.pause:ICON.play;pp.setAttribute('aria-label',playing?'Pause slideshow':'Play slideshow');}
    function progress(){
      clearTimeout(timer);
      Array.prototype.forEach.call(caps.children,function(d,i){
        var f=d.firstChild;f.style.transition='none';f.style.transform='scaleX(0)';
        if(i===idx){void f.offsetWidth;f.style.transition=playing?'transform '+CFG.slide.ms+'ms linear':'transform .9s cubic-bezier(.2,.8,.2,1)';f.style.transform='scaleX(1)';}
      });
      if(playing)timer=setTimeout(function(){if(idx<slides.length-1)go(idx+1);else{playing=false;setPP();}},CFG.slide.ms);
    }
    function fit(){stage.querySelectorAll('.items.scroll').forEach(function(g){var h=g.clientHeight;if(h>60)g.style.gridAutoRows=((h-14)/2)+'px';});}
    function hyd(){for(var i=Math.max(0,idx-1);i<=Math.min(slides.length-1,idx+1);i++)hydrate(slideEls[i]);}
    function update(){
      track.style.transform='translateX(-'+(idx*100)+'%)';
      Array.prototype.forEach.call(caps.children,function(d,i){d.classList.toggle('act',i===idx);d.setAttribute('aria-current',i===idx?'true':'false');});
      prev.classList.toggle('gone',idx===0);
      closeViewer();progress();hyd();fit();
    }
    function go(i){if(ended||i<0)return;if(i>=slides.length){finish();return;}idx=i;update();}
    function finish(){
      if(ended)return;ended=true;clearTimeout(timer);closeViewer();
      W.removeEventListener('keydown',key);W.removeEventListener('resize',fit);
      prev.classList.add('gone');next.classList.add('gone');pager.classList.add('fadeout');
      stage.style.transition='opacity .9s ease';stage.style.opacity=0;
      setTimeout(function(){off('show').then(done);},1050);
    }
    var W=window;
    function key(e){
      if(viewerOpen){if(e.key==='Escape')closeViewer();return;}
      if(e.key==='ArrowRight')go(idx+1);else if(e.key==='ArrowLeft')go(idx-1);
    }
    W.addEventListener('keydown',key);W.addEventListener('resize',fit);
    prev.onclick=function(){go(idx-1);};next.onclick=function(){go(idx+1);};
    pp.onclick=function(){playing=!playing;setPP();progress();};
    var sx=null;
    stage.onpointerdown=function(e){sx=e.clientX;};
    stage.onpointerup=function(e){if(sx===null)return;var dx=e.clientX-sx;sx=null;if(Math.abs(dx)>60&&!viewerOpen)go(idx+(dx<0?1:-1));};
    stageName('slides');setPP();on('show');update();setTimeout(fit,60);
    window.__fy.slide=function(i){go(i);};
    window.__fy.slideCount=slides.length;
  });
}

/* ------------------------------------------------------------------ "There's More..." typed on the cursor */
function typeMore(){
  return new Promise(function(done){
    var txt='There\u2019s More\u2026',t=$('#mtxt'),c=$('#mcaret');
    t.textContent='';c.classList.remove('hide');stageName('more');on('more');
    setTimeout(function(){
      var start=null;
      (function step(now){
        if(start===null)start=now;
        var e=now-start,n=Math.min(txt.length,Math.floor(txt.length*e/CFG.more.type));
        t.textContent=txt.slice(0,n);
        if(e<CFG.more.type)requestAnimationFrame(step);
        else{
          t.textContent=txt;
          setTimeout(function(){c.classList.add('hide');setTimeout(function(){off('more').then(done);},650);},CFG.more.hold);
        }
      })(performance.now());
    },700);
  });
}

/* ------------------------------------------------------------------ rapid-fire montage, then the TV switches off */
function allPhotos(){
  var out=[],seen={};
  function add(it){if(it&&it.kind==='photo'&&it.id&&!seen[it.id]){seen[it.id]=1;out.push(it);}if(it&&it.kind==='video'&&it.poster&&!seen[it.poster.id]){seen[it.poster.id]=1;out.push({id:it.poster.id,mime:it.poster.mime||'image/jpeg'});}}
  (S.content.montage||[]).forEach(function(m){if(m&&m.id&&!seen[m.id]){seen[m.id]=1;out.push(m);}});
  (S.content.slides||[]).forEach(function(s){(s.items||[]).forEach(add);});
  (S.content.folders||[]).forEach(function(f){((f.bubble||{}).items||[]).forEach(add);});
  return out;
}
async function montage(){
  var list=allPhotos();
  if(!list.length)return;
  stageName('montage');
  var bmps=[];
  await Promise.all(list.map(function(p){return media(p.id,p.mime).then(function(m){return createImageBitmap(m.blob);}).then(function(b){bmps.push(b);}).catch(function(){});}));
  if(!bmps.length)return;
  shuffle(bmps);
  var wrap=$('#mwrap'),cv=$('#mcv'),w=window.innerWidth,h=window.innerHeight,dpr=Math.min(2,devicePixelRatio||1);
  cv.width=w*dpr;cv.height=h*dpr;var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  wrap.style.transform='';wrap.style.opacity='';$('#mwhite').style.opacity=0;
  ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
  D.body.classList.add('dark');on('mont');
  var M=CFG.mont,N=Math.max(2,M.frames),base=Math.min(w,h),cells=[],sizes=[];
  /* photos land on a loose 3 x 3 spread so the pile builds up everywhere, and each gets its own random size */
  function nextCell(){if(!cells.length){for(var i=0;i<9;i++)cells.push(i);shuffle(cells);}return cells.pop();}
  for(var i=0;i<N;i++){
    var b=bmps[i%bmps.length],ar=b.width/b.height;
    var L=base*rnd(M.size[0],M.size[1]);                        /* long side, in px */
    var dw=ar>=1?L:L*ar,dh=ar>=1?L/ar:L;
    var cap=Math.min(1,M.maxFill*w/dw,M.maxFill*h/dh);          /* never close to filling the screen */
    dw*=cap;dh*=cap;
    var c=nextCell(),cx=(c%3+.5)/3*w+rnd(-.1,.1)*w,cy=(((c/3)|0)+.5)/3*h+rnd(-.1,.1)*h;
    cx=Math.max(dw*.42,Math.min(w-dw*.42,cx));cy=Math.max(dh*.42,Math.min(h-dh*.42,cy));
    var a=rnd(-M.tilt,M.tilt)*Math.PI/180,pad=Math.max(3,Math.round(dw*.012));
    ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
    ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=26;ctx.shadowOffsetY=6;
    ctx.fillStyle='#f6f1e6';ctx.fillRect(-dw/2-pad,-dh/2-pad,dw+pad*2,dh+pad*2);   /* thin white print edge */
    ctx.shadowColor='transparent';ctx.drawImage(b,-dw/2,-dh/2,dw,dh);
    ctx.restore();
    await sleep(M.start+(M.end-M.start)*(i/(N-1)));
  }
}
async function tvOff(){
  var m=D.getElementById('mont');
  if(!m.classList.contains('on'))return;
  stageName('tvoff');
  var wrap=$('#mwrap'),white=$('#mwhite'),T=CFG.tv;
  if(wrap.animate&&!RM){
    var a=wrap.animate([
      {transform:'scale(1,1)',filter:'brightness(1)',opacity:1,offset:0},
      {transform:'scale(1,.014)',filter:'brightness(2.4)',opacity:1,offset:.5},
      {transform:'scale(.014,.014)',filter:'brightness(3)',opacity:1,offset:.86},
      {transform:'scale(0,0)',filter:'brightness(3)',opacity:0,offset:1}
    ],{duration:T,easing:'cubic-bezier(.55,0,.25,1)',fill:'forwards'});
    white.animate([{opacity:0},{opacity:0,offset:.18},{opacity:1,offset:.55},{opacity:1}],{duration:T,fill:'forwards'});
    await sleep(T+60);
  }
  m.classList.remove('vis','on');
}

/* ------------------------------------------------------------------ folders: arrive, bounce, settle into a 4 x 4 grid */
var SCENE=null;
function foldersScene(){
  if(SCENE)return SCENE.show();
  return new Promise(function(done){
    stageName('folders');
    var layerEl=$('#fold');D.body.classList.add('dark');on('fold');
    var cv=$('#fx'),ctx=cv.getContext('2d'),host=$('#fgrid'),dpr=Math.min(2,devicePixelRatio||1);
    var W=0,H=0,cell=0,size=0,R=0,g=0,slots=[],T=[];
    var data=(S.content.folders||[]).slice(0,16);
    while(data.length<16)data.push({bubble:{type:'text',items:[]}});
    var owner=false;try{owner=localStorage.getItem('jj_fy_owner')==='1';}catch(e){}
    var planets=[{kind:'ring',spawned:false,off:false,x:0,y:0,vx:0,vy:0,tx:0,ty:0,r:20,a:0,ph:rnd(0,6.28)},{kind:'earth',spawned:false,off:false,x:0,y:0,vx:0,vy:0,tx:0,ty:0,r:18,a:0,ph:rnd(0,6.28)}];
    var paused=false,bodies=[],isReady=false,t=0,last=0,raf=0,STAR_CAP=CFG.fold.stars,CIRC_CAP=CFG.fold.circles;
    var stars=[],circs=[],used=[],cd={},ov={},ghost={};
    host.innerHTML='';
    function layout(){
      W=window.innerWidth;H=window.innerHeight;
      cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      g=Math.min(W*.88,H*.84);cell=g/4;size=cell*.82;R=size*.43;
      for(var i=0;i<16;i++){slots[i]={x:W/2+((i%4)-1.5)*cell,y:H/2+(((i/4)|0)-1.5)*cell};}
      bodies.forEach(function(b){b.r=R;b.el.style.width=size+'px';b.el.style.height=size*.8+'px';});
      makeTargets();
    }
    function makeTargets(){
      var gx0=W/2-g/2-8,gx1=W/2+g/2+8,gy0=H/2-g/2-8,gy1=H/2+g/2+8,C=[],tries=0;
      while(C.length<520&&tries<9000){
        tries++;var x=rnd(18,W-18),y=rnd(18,H-18);
        if(x>gx0&&x<gx1&&y>gy0&&y<gy1)continue;C.push([x,y]);
      }
      if(C.length<90){ /* tiny margins: allow anywhere that is not on a folder spot */
        C=[];tries=0;
        while(C.length<520&&tries<9000){
          tries++;var x2=rnd(18,W-18),y2=rnd(18,H-18),bad=false;
          for(var i=0;i<16;i++){if(Math.hypot(x2-slots[i].x,y2-slots[i].y)<R*1.3){bad=true;break;}}
          if(!bad)C.push([x2,y2]);
        }
      }
      /* two planets: clear of the folder grid, far from each other, and the stars keep away from them */
      (function(){
        var pr=Math.max(16,Math.min(54,Math.min(W,H)*.055)),P,cl;
        function pool(r){
          cl=r*2.25;var out=[],n=0,gx0=W/2-g/2-cl,gx1=W/2+g/2+cl,gy0=H/2-g/2-cl,gy1=H/2+g/2+cl;
          if(W<cl*2||H<cl*2)return out;
          while(out.length<160&&n<6000){n++;var x=rnd(cl,W-cl),y=rnd(cl,H-cl);if(x>gx0&&x<gx1&&y>gy0&&y<gy1)continue;out.push([x,y]);}
          return out;
        }
        P=pool(pr);while(P.length<20&&pr>12){pr*=.85;P=pool(pr);}
        if(P.length<2){planets.forEach(function(p){p.off=true;});return;}
        var a=P[Math.random()*P.length|0],bi=0,bd=-1;
        for(var i=0;i<P.length;i++){var d=Math.hypot(P[i][0]-a[0],P[i][1]-a[1]);if(d>bd){bd=d;bi=i;}}
        var b=P[bi],flip=Math.random()<.5,A=flip?b:a,B=flip?a:b;
        planets[0].tx=A[0];planets[0].ty=A[1];planets[0].r=pr;
        planets[1].tx=B[0];planets[1].ty=B[1];planets[1].r=pr*.92;
        planets.forEach(function(p){p.off=false;});
        C=C.filter(function(c){return Math.hypot(c[0]-A[0],c[1]-A[1])>cl*.95&&Math.hypot(c[0]-B[0],c[1]-B[1])>cl*.95;});
      })();
      /* farthest-point order: every prefix is spread across the screen */
      T=[];if(!C.length)return;
      T.push(C.splice(Math.random()*C.length|0,1)[0]);
      var want=STAR_CAP+CIRC_CAP+6;
      var md=C.map(function(c){return Math.hypot(c[0]-T[0][0],c[1]-T[0][1]);});
      while(T.length<want&&C.length){
        var bi=0;for(var k=1;k<C.length;k++)if(md[k]>md[bi])bi=k;
        var p=C.splice(bi,1)[0];md.splice(bi,1);T.push(p);
        for(var j=0;j<C.length;j++){var d=Math.hypot(C[j][0]-p[0],C[j][1]-p[1]);if(d<md[j])md[j]=d;}
      }
      used.length=T.length;for(var u=0;u<used.length;u++)if(used[u]===undefined)used[u]=false;
    }
    /* folder buttons */
    data.forEach(function(f,i){
      var b=el('button','fld','<svg viewBox="0 0 120 96" aria-hidden="true"><path d="M6 20a8 8 0 0 1 8-8h26l10 10h56a8 8 0 0 1 8 8v54a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8z" fill="#a9d3f6"/><path d="M6 34a8 8 0 0 1 8-8h92a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8z" fill="url(#fgrad)"/></svg>');
      b.type='button';b.setAttribute('aria-label','Open folder '+(i+1));b.tabIndex=-1;
      if(owner&&f.name)b.appendChild(el('span','flabel',esc(f.name)));
      b.addEventListener('click',function(){if(isReady)openBubble(f,b);});
      host.appendChild(b);
      bodies.push({i:i,el:b,x:-999,y:-999,vx:0,vy:0,r:0,spawned:false,entered:false,at:0,born:0});
    });
    layout();
    window.addEventListener('resize',function(){layout();if(isReady)place(true);});
    function place(snap){bodies.forEach(function(b){if(snap){b.x=slots[b.i].x;b.y=slots[b.i].y;b.vx=b.vy=0;}draw1(b);});}
    function draw1(b){b.el.style.transform='translate('+(b.x-size/2)+'px,'+(b.y-size*.4)+'px)';}
    function ready(){
      if(isReady)return;isReady=true;
      bodies.forEach(function(b){b.x=slots[b.i].x;b.y=slots[b.i].y;b.vx=b.vy=0;b.el.style.opacity=1;draw1(b);b.el.classList.add('ready');b.el.tabIndex=0;});
      window.__fy.settleMs=Math.round(t*1000);stageName('folders-ready');
      setTimeout(function(){$('#backBtn').classList.add('vis');},500);
      done();
    }
    /* spawn points: random sides, aimed loosely at the middle */
    bodies.forEach(function(b){
      b.r=R;b.at=rnd(0,2.4);
      var side=Math.random()*4|0,m=size*.9;
      if(side===0){b.x=rnd(.05*W,.95*W);b.y=-m;}else if(side===1){b.x=W+m;b.y=rnd(.05*H,.95*H);}
      else if(side===2){b.x=rnd(.05*W,.95*W);b.y=H+m;}else{b.x=-m;b.y=rnd(.05*H,.95*H);}
      var tx=rnd(.28,.72)*W,ty=rnd(.28,.72)*H,sp=rnd(230,380),dx=tx-b.x,dy=ty-b.y,dl=Math.hypot(dx,dy)||1;
      b.vx=dx/dl*sp;b.vy=dy/dl*sp;b.el.style.opacity=0;b.el.style.transform='translate(-999px,-999px)';
    });
    /* particles: sparkles and dots that drift to evenly spread resting places */
    function takeTarget(){for(var i=0;i<T.length;i++){if(!used[i]){used[i]=true;return i;}}return 0;}
    function spawnP(type,x,y){
      var arr=type?circs:stars,cap=type?CIRC_CAP:STAR_CAP,p;
      if(arr.length<cap){p={type:type,ti:takeTarget()};arr.push(p);}
      else{p=arr[0];for(var i=1;i<arr.length;i++)if(arr[i].born<p.born)p=arr[i];}
      var a=rnd(0,Math.PI*2),sp=rnd(140,330);
      p.x=x;p.y=y;p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;p.a=0;p.born=t;p.ph=rnd(0,6.28);
      p.s=type?rnd(1.6,3.8):rnd(6,13);p.col=(Math.random()<.5)?'255,255,255':'204,230,252';
    }
    function spawnPlanet(i,x,y){
      var p=planets[i];if(p.off||p.spawned)return;
      var a=rnd(0,6.283),sp=rnd(90,170);p.spawned=true;p.x=x;p.y=y;p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;p.a=0;
    }
    function emit(x,y){
      for(var n=0;n<CFG.fold.perImpact;n++){spawnP(0,x,y);spawnP(1,x,y);}
      window.__fy.impacts++;window.__fy.particles=stars.length+circs.length;
      if(window.__fy.impacts===2)spawnPlanet(0,x,y);else if(window.__fy.impacts===5)spawnPlanet(1,x,y);
    }
    function star(x,y,s,rot){
      ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();
      ctx.moveTo(0,-s);ctx.quadraticCurveTo(0,0,s,0);ctx.quadraticCurveTo(0,0,0,s);ctx.quadraticCurveTo(0,0,-s,0);ctx.quadraticCurveTo(0,0,0,-s);
      ctx.closePath();ctx.fill();ctx.restore();
    }
    function stepPlanets(dt){
      if(t>3.2)spawnPlanet(0,W/2,H/2);if(t>4.2)spawnPlanet(1,W/2,H/2);
      planets.forEach(function(p){
        if(!p.spawned)return;
        p.vx+=(.9*(p.tx-p.x)-1.9*p.vx)*dt;p.vy+=(.9*(p.ty-p.y)-1.9*p.vy)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.a=Math.min(1,p.a+dt*.85);p.ph+=dt;
      });
    }
    function ringArc(x,y,r,rot,a0,a1,rx,ry,w,col){ctx.beginPath();ctx.ellipse(x,y,r*rx,r*ry,rot,a0,a1);ctx.lineWidth=w;ctx.strokeStyle=col;ctx.stroke();}
    function ringPlanet(x,y,r){
      var rot=-.38;
      /* back half of the ring, then the planet, then the front half */
      ringArc(x,y,r,rot,Math.PI,Math.PI*2,1.95,.55,r*.27,'rgba(172,211,246,.95)');
      ringArc(x,y,r,rot,Math.PI,Math.PI*2,1.55,.43,r*.07,'rgba(222,239,253,.95)');
      var g1=ctx.createRadialGradient(x-r*.38,y-r*.42,r*.08,x,y,r*1.05);
      g1.addColorStop(0,'#ffe9d2');g1.addColorStop(.55,'#ffd0a3');g1.addColorStop(1,'#f3aa7a');
      ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
      ctx.fillStyle=g1;ctx.fillRect(x-r,y-r,r*2,r*2);
      ctx.fillStyle='rgba(255,255,255,.2)';ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillRect(-r,-r*.34,r*2,r*.2);ctx.fillStyle='rgba(222,134,88,.2)';ctx.fillRect(-r,r*.1,r*2,r*.26);ctx.restore();
      var sh=ctx.createRadialGradient(x-r*.5,y-r*.55,r*.2,x,y,r*1.15);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(150,80,50,.35)');
      ctx.fillStyle=sh;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
      ringArc(x,y,r,rot,0,Math.PI,1.95,.55,r*.27,'rgba(172,211,246,.98)');
      ringArc(x,y,r,rot,0,Math.PI,1.55,.43,r*.07,'rgba(222,239,253,.98)');
    }
    var LAND=[[.3,-.25,.55,.38,.3],[.9,.35,.42,.28,-.4],[1.6,-.1,.6,.42,.1],[2.3,.42,.38,.26,.5],[2.8,-.35,.5,.3,-.2],[3.4,.15,.5,.4,.25],[3.75,-.52,.3,.2,0]];
    var CLOUD=[[.6,-.55,.3,.08],[1.9,.5,.34,.08],[3.1,.05,.28,.07]];
    function earthPlanet(x,y,r,ph){
      ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
      var w=ctx.createRadialGradient(x-r*.38,y-r*.42,r*.08,x,y,r*1.05);
      w.addColorStop(0,'#bfe5fc');w.addColorStop(.6,'#86c8f2');w.addColorStop(1,'#56a2dc');
      ctx.fillStyle=w;ctx.fillRect(x-r,y-r,r*2,r*2);
      function blobs(list,speed,fill,fill2,isCloud){
        var off=(ph*speed)%4;
        list.forEach(function(b){
          var px=(((b[0]+off)%4)*r)-2*r,u=px/(1.6*r);if(u<-1||u>1)return;
          var k=Math.cos(u*Math.PI/2*.95),X=x+r*Math.sin(u*Math.PI/2*.95)*1.02,Y=y+b[1]*r;
          var rx=Math.max(.04*r,b[2]*r*k),ry=b[3]*r;
          if(isCloud){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(X,Y,rx,ry,0,0,Math.PI*2);ctx.fill();return;}
          ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(X,Y,rx,ry,b[4],0,Math.PI*2);ctx.fill();
          ctx.fillStyle=fill2;ctx.beginPath();ctx.ellipse(X-rx*.08,Y-ry*.12,rx*.72,ry*.68,b[4],0,Math.PI*2);ctx.fill();
        });
      }
      blobs(LAND,.05,'#86d08c','#a9e6a3',false);
      blobs(CLOUD,.085,'rgba(255,255,255,.42)',null,true);
      var sh=ctx.createRadialGradient(x-r*.5,y-r*.55,r*.2,x,y,r*1.12);sh.addColorStop(0,'rgba(255,255,255,.18)');sh.addColorStop(.55,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(20,60,120,.38)');
      ctx.fillStyle=sh;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.lineWidth=Math.max(1,r*.07);ctx.strokeStyle='rgba(205,234,255,.5)';ctx.stroke();
    }
    function drawPlanets(){
      planets.forEach(function(p){
        if(!p.spawned||p.off)return;
        var s=p.a*p.a*(3-2*p.a),r=p.r*(.25+.75*s),y=p.y+Math.sin(p.ph*.9)*2.2;
        ctx.save();ctx.globalAlpha=Math.min(1,p.a*1.5);
        if(p.kind==='ring')ringPlanet(p.x,y,r);else earthPlanet(p.x,y,r,p.ph);
        ctx.restore();
      });
    }
    function stepP(arr,dt){
      for(var i=0;i<arr.length;i++){
        var p=arr[i],tg=T[p.ti]||[p.x,p.y];
        p.vx+=(1.15*(tg[0]-p.x)-1.9*p.vx)*dt;p.vy+=(1.15*(tg[1]-p.y)-1.9*p.vy)*dt;
        p.x+=p.vx*dt;p.vy=p.vy;p.y+=p.vy*dt;p.a=Math.min(1,p.a+dt*2.4);p.ph+=dt*1.6;
      }
    }
    function drawP(){
      ctx.clearRect(0,0,W,H);
      drawPlanets();
      for(var i=0;i<circs.length;i++){var p=circs[i];ctx.fillStyle='rgba('+p.col+','+(.55*p.a)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.s*(.9+.14*Math.sin(p.ph)),0,6.283);ctx.fill();}
      for(var j=0;j<stars.length;j++){var q=stars[j];ctx.fillStyle='rgba('+q.col+','+(.9*q.a*(.78+.22*Math.sin(q.ph)))+')';star(q.x,q.y,q.s*(.9+.12*Math.sin(q.ph*1.3)),0);}
    }
    /* simulation */
    var TS=CFG.fold.settle/1000;
    function frame(now){
      var dt=Math.min(.033,(now-last)/1000||.016);last=now;t+=dt;
      var f=Math.min(1,t/TS),k=2.4+42*f*f*f,c=.7+9.5*f*f,collide=t<TS*.8;
      var snapF=t>TS-.9?Math.min(1,(t-(TS-.9))/.9):0;
      for(var i=0;i<16;i++){
        var b=bodies[i];
        if(!b.spawned){if(t>=b.at){b.spawned=true;b.born=t;}else continue;}
        var s=slots[i];
        b.vx+=(k*(s.x-b.x)-c*b.vx)*dt;b.vy+=(k*(s.y-b.y)-c*b.vy)*dt;
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(!b.entered&&b.x>b.r&&b.x<W-b.r&&b.y>b.r&&b.y<H-b.r)b.entered=true;
        if(b.entered){
          if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.88;}else if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx)*.88;}
          if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)*.88;}else if(b.y>H-b.r){b.y=H-b.r;b.vy=-Math.abs(b.vy)*.88;}
        }
      }
      /* collisions */
      for(var a=0;a<16;a++){
        var A1=bodies[a];if(!A1.spawned)continue;
        for(var q=a+1;q<16;q++){
          var B1=bodies[q];if(!B1.spawned)continue;
          var vis=A1.x>-A1.r&&A1.x<W+A1.r&&A1.y>-A1.r&&A1.y<H+A1.r&&B1.x>-B1.r&&B1.x<W+B1.r&&B1.y>-B1.r&&B1.y<H+B1.r;
          if(!vis)continue;
          var key=a*16+q,dx=B1.x-A1.x,dy=B1.y-A1.y,d=Math.hypot(dx,dy)||.001,min=A1.r+B1.r;
          if(ghost[key]){
            if(d>min+3){ghost[key]=false;ov[key]=0;A1.vx*=.3;A1.vy*=.3;B1.vx*=.3;B1.vy*=.3;}   /* clear of each other: physics is reset */
            continue;
          }
          if(!collide)continue;
          if(d<min+.8){
            var nx=dx/d,ny=dy/d,rv=(B1.vx-A1.vx)*nx+(B1.vy-A1.vy)*ny;
            if(d<min){
              if(rv<0){
                var j=-(1+.9)*rv/2;A1.vx-=j*nx;A1.vy-=j*ny;B1.vx+=j*nx;B1.vy+=j*ny;
                if(-rv>55&&(!cd[key]||t-cd[key]>.3)){cd[key]=t;emit((A1.x+B1.x)/2,(A1.y+B1.y)/2);}
              }
              var pen=(min-d)/2;A1.x-=nx*pen;A1.y-=ny*pen;B1.x+=nx*pen;B1.y+=ny*pen;
            }
            /* pressed together for half a second and barely moving: let them pass through each other */
            if(Math.abs(rv)<70){ov[key]=(ov[key]||0)+dt;if(ov[key]>.5){ghost[key]=true;window.__fy.ghosts++;}}else ov[key]=0;
          }else ov[key]=0;
        }
      }
      if(snapF>0){for(var z=0;z<16;z++){var bz=bodies[z],sz=slots[z];bz.x+=(sz.x-bz.x)*snapF;bz.y+=(sz.y-bz.y)*snapF;bz.vx*=(1-snapF);bz.vy*=(1-snapF);}}
      for(var m=0;m<16;m++){var bm=bodies[m];if(bm.spawned){bm.el.style.opacity=Math.min(1,(t-bm.born)*1.4);draw1(bm);}}
      stepP(stars,dt);stepP(circs,dt);stepPlanets(dt);drawP();
      /* settled? */
      if(!isReady){
        var all=t>2.5,mx=0;
        for(var n=0;n<16&&all;n++){var bn=bodies[n];if(!bn.spawned){all=false;break;}var e=Math.hypot(bn.x-slots[n].x,bn.y-slots[n].y),v=Math.hypot(bn.vx,bn.vy);if(e>1.2||v>6)all=false;}
        if(all||t>=TS)ready();
      }
      if(!paused)raf=requestAnimationFrame(frame);
    }
    SCENE={
      pause:function(){paused=true;cancelAnimationFrame(raf);},
      resume:function(){if(!paused)return;paused=false;layout();if(isReady)place(true);last=performance.now();raf=requestAnimationFrame(frame);},
      show:function(){D.body.classList.add('dark');SCENE.resume();on('fold');stageName('folders-ready');setTimeout(function(){$('#backBtn').classList.add('vis');},500);return Promise.resolve();}
    };
    if(RM){ready();for(var s=0;s<STAR_CAP;s++)spawnP(0,W/2,H/2);for(var c2=0;c2<CIRC_CAP;c2++)spawnP(1,W/2,H/2);stars.concat(circs).forEach(function(p){var tg=T[p.ti]||[p.x,p.y];p.x=tg[0];p.y=tg[1];p.a=1;});planets.forEach(function(p){if(!p.off){p.spawned=true;p.x=p.tx;p.y=p.ty;p.a=1;}});drawP();return;}
    last=performance.now();raf=requestAnimationFrame(frame);
    window.__fy.bodies=bodies;window.__fy.slots=slots;window.__fy.targets=function(){return T;};window.__fy.particlesRef=function(){return {stars:stars,circs:circs};};window.__fy.planets=function(){return planets;};
  });
}

/* ------------------------------------------------------------------ bubble (Apple-style sheet) */
var bubOpen=null;
function openBubble(f,btn){
  if(bubOpen)return;
  var b=f.bubble||{},items=b.items||[],type=b.type||'mixed';
  var wrapEl=$('#bub');wrapEl.innerHTML='';
  var back=el('div','back'),sheet=el('div','sheet'),head=el('header'),h2=el('h2',null,esc(b.title||''));
  var x=el('button','xbtn',ICON.x);x.type='button';x.setAttribute('aria-label','Close');
  head.appendChild(h2);head.appendChild(x);sheet.appendChild(head);
  var body=el('div','body');
  if(!items.length)body.appendChild(el('div','empty','Nothing here yet.'));
  else if(type==='text'){sheet.classList.add('textonly');body.appendChild(renderItems(items,sheet,''));}
  else if(type==='mixed')body.appendChild(renderItems(items,sheet,'mixed'));
  else body.appendChild(renderItems(items,sheet,''));
  if(!b.title)h2.style.display='none';
  sheet.appendChild(body);wrapEl.appendChild(back);wrapEl.appendChild(sheet);
  hydrate(sheet);
  wrapEl.classList.add('on');void wrapEl.offsetWidth;wrapEl.classList.add('vis');
  var fr=btn.getBoundingClientRect(),fx=fr.left+fr.width/2,fy=fr.top+fr.height/2,sr,dx,dy;
  sr=sheet.getBoundingClientRect();dx=fx-(sr.left+sr.width/2);dy=fy-(sr.top+sr.height/2);
  if(sheet.animate&&!RM)sheet.animate([{transform:'translate('+dx+'px,'+dy+'px) scale(.12)',opacity:0},{transform:'none',opacity:1}],{duration:520,easing:'cubic-bezier(.2,.9,.2,1)'});
  bubOpen={wrap:wrapEl,sheet:sheet,btn:btn};
  function close(){
    if(!bubOpen)return;closeViewer();
    var o=bubOpen;bubOpen=null;wrapEl.classList.remove('vis');
    var r2=o.btn.getBoundingClientRect(),sr2=o.sheet.getBoundingClientRect();
    var ddx=r2.left+r2.width/2-(sr2.left+sr2.width/2),ddy=r2.top+r2.height/2-(sr2.top+sr2.height/2);
    if(o.sheet.animate&&!RM)o.sheet.animate([{transform:'none',opacity:1},{transform:'translate('+ddx+'px,'+ddy+'px) scale(.12)',opacity:0}],{duration:380,easing:'cubic-bezier(.5,0,.8,.4)',fill:'forwards'});
    setTimeout(function(){wrapEl.classList.remove('on');wrapEl.innerHTML='';try{o.btn.focus();}catch(e){}},RM?0:400);
  }
  x.onclick=close;back.onclick=close;x.focus();
  window.__fy.closeBubble=close;
}
window.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  if(viewerOpen){closeViewer();return;}
  if(window.__fy.closeBubble&&bubOpen)window.__fy.closeBubble();
});

/* ------------------------------------------------------------------ sequence and the Back button */
var backing=false;
async function goBack(){
  if(backing||bubOpen)return;
  backing=true;stageName('back');
  $('#backBtn').classList.remove('vis');
  await off('fold');
  if(SCENE)SCENE.pause();
  D.body.classList.remove('dark');
  await slideshow(Math.max(0,(S.content.slides||[]).length-1));
  /* second time through: no typing, no montage, no TV, no folder arrival, just the folders as they were */
  if(CFG.returnSkips&&SCENE)await SCENE.show();else{await typeMore();await montage();await tvOff();await foldersScene();}
  backing=false;
}
$('#backBtn').addEventListener('click',goBack);
async function sequence(start){
  var order=['intro','slides','more','montage','folders'],i=order.indexOf(start);
  if(i<0)i=0;
  var steps={
    intro:intro,slides:function(){return slideshow(0);},more:typeMore,
    montage:async function(){await montage();await tvOff();},
    folders:foldersScene
  };
  for(;i<order.length;i++){await steps[order[i]]();}
}
/* Mareep (top left) goes back to the portfolio. It gets a light edge on the black screens. */
(function(){
  var a=$('#mareep');if(!a||typeof Mareep==='undefined')return;
  var m=Mareep.link(a,{scale:.8});
  function sync(){m.setRim(D.body.classList.contains('dark')?'rgba(244,239,228,.95)':null);}
  new MutationObserver(sync).observe(D.body,{attributes:true,attributeFilter:['class']});sync();
})();
boot();
})();
