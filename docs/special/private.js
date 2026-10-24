(function(){
'use strict';
var D=document;
function $(s,r){return (r||D).querySelector(s);}
function el(tag,cls,html){var e=D.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function merge(a,b){for(var k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=merge(a[k]||{},b[k]);}else a[k]=b[k];}return a;}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function rnd(a,b){return a+Math.random()*(b-a);}
function until(t){return new Promise(function(r){requestAnimationFrame(function f(now){if(now>=t-4)r();else requestAnimationFrame(f);});});}   /* resolves on the first frame at or after time t */
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
  fold:{settle:9500,stars:26,circles:26,perImpact:3,delay:2000},   /* delay = ms of stillness before the folders start flying in */
  start:'login'
},window.PRIVATE_CONFIG||{});
var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
var embed=window.PRIVATE_EMBED||null;
var S={vault:null,sec:[],key:null,ckRaw:null,content:null,pending:{}};   /* pending: media added in the editor, not published yet */
window.__fy={stage:'login',hist:['login'],impacts:0,ghosts:0,settleMs:null,particles:0};

/* ------------------------------------------------------------------ crypto */
var enc=new TextEncoder(),dec=new TextDecoder();
function b64(s){var bin=atob(s),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return u;}
function toB64(u8){var s='',c=0x8000;for(var i=0;i<u8.length;i+=c)s+=String.fromCharCode.apply(null,u8.subarray(i,i+c));return btoa(s);}
function hex(u){var s='';for(var i=0;i<u.length;i++)s+=('0'+u[i].toString(16)).slice(-2);return s;}
var NORM={
  digits:function(v){var s=String(v).replace(/\s+/g,'');return /^\d+$/.test(s)?s.replace(/^0+/,''):s;},   /* leading zeros do not matter */
  date:function(v){return String(v).replace(/\D+/g,'').replace(/^0+/,'');},   /* 1/31/2020, 1-31-2020 and 1312020 are the same */
  text:function(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
};
function normQ(q,v){return (NORM[q.kind]||NORM.text)(v);}
async function kdf(pw,saltB64,iter){
  var k=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64(saltB64),iterations:iter},k,256));
}
function aesKey(raw,uses){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,uses||['decrypt']);}
function cat(list){var n=0;list.forEach(function(u){n+=u.length;});var o=new Uint8Array(n),i=0;list.forEach(function(u){o.set(u,i);i+=u.length;});return o;}
/* each question has a secret, wrapped once per accepted answer; a right answer unwraps it */
async function unwrapAnswer(q,raw){
  var n=normQ(q,raw);if(!n)return null;
  for(var i=0;i<q.w.length;i++){
    try{return await aes(await aesKey(await kdf(n,q.w[i].s,S.vault.iter)),b64(q.w[i].d));}catch(e){}
  }
  return null;
}
async function check(stage,raw){
  var sec=await unwrapAnswer(S.vault.q[stage-1],raw);
  if(sec)S.sec[stage-1]=sec;
  return !!sec;
}
/* all the question secrets together unlock the content key */
async function deriveKey(){
  var kek=await aesKey(new Uint8Array(await crypto.subtle.digest('SHA-256',cat(S.sec))));
  return aesKey(await aes(kek,b64(S.vault.kw)));
}
/* the editor password unlocks the same content key on its own */
async function editorKey(pw){
  var raw=await aes(await aesKey(await kdf(pw,S.vault.ke.s,S.vault.iter)),b64(S.vault.ke.d));
  S.ckRaw=raw;return aesKey(raw,['encrypt','decrypt']);
}
async function aes(key,u8){return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:u8.slice(0,12)},key,u8.slice(12)));}
var cache={};
function media(id,mime){
  if(cache[id])return cache[id];
  cache[id]=(async function(){
    var u8;
    if(S.pending[id])u8=S.pending[id].enc;
    else if(embed&&embed.files&&embed.files[id])u8=b64(embed.files[id]);
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
function showHint(){var q=S.vault.q[A.stage-1]||{};if(!q.hint)return;hintEl.textContent=q.hint;hintEl.classList.add('vis');}
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
$('#login').addEventListener('pointerdown',function(e){if(!field.disabled&&!e.target.closest('#editBtn'))field.focus();});
$('#login').addEventListener('click',function(e){if(!field.disabled&&!e.target.closest('#editBtn'))field.focus();});
/* typing before the field has focus still counts */
D.addEventListener('keydown',function(e){
  if(!$('#login').classList.contains('on')||field.disabled||D.activeElement===field||e.metaKey||e.ctrlKey||e.altKey)return;
  if($('#gate').classList.contains('on')||D.body.classList.contains('editing'))return;
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
function editBtnVis(){var b=$('#editBtn');if(b)b.classList.toggle('vis',A.stage===1&&$('#login').classList.contains('on'));}
async function advance(){
  if(A.stage>=S.vault.q.length){field.disabled=true;await finishLogin();return;}
  var n=A.stage+1;A.stage=n;stageName('login'+n);editBtnVis();
  line.style.transition='opacity '+Math.round(CFG.prompt.pre*.92)+'ms ease';line.style.opacity=0;hintEl.classList.remove('vis');field.disabled=true;
  await sleep(CFG.prompt.pre);
  field.value='';sync();loadStage(n);caret.classList.add('hide');line.style.opacity=1;
  await runPrompt(S.vault.q[n-1].prompt||'',function(){caret.classList.remove('hide');});
  caret.classList.remove('hide');
  if(A.fails>=CFG.hintAfter)showHint();
  if(A.until>Date.now())startLock();else{field.disabled=false;try{field.focus();}catch(e){}}
}
async function finishLogin(){
  S.key=await deriveKey();
  S.content=upgrade(JSON.parse(dec.decode(await aes(S.key,b64(S.vault.data)))));
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
  loadStage(1);editBtnVis();
  var q1=S.vault.q[0]||{};
  if(q1.prompt){field.disabled=true;caret.classList.add('hide');await runPrompt(q1.prompt,function(){caret.classList.remove('hide');});caret.classList.remove('hide');field.disabled=false;}
  if(A.fails>=CFG.hintAfter)showHint();
  if(A.until>Date.now())startLock();
  else{try{field.focus();}catch(e){}}
}
/* fills in anything an older content file does not have yet */
function upgrade(c){
  c.look=merge({slideBg:'#8fb8e6',slideText:'#fffdf7',quoteSpeed:1},c.look||{});
  c.slides=c.slides||[];c.folders=c.folders||[];c.books=c.books||[];c.quotes=c.quotes||[];
  if(!c.montage||Array.isArray(c.montage))c.montage={items:(c.montage||[]).map(function(m){return {kind:'photo',id:m.id,mime:m.mime};}),count:64,startMs:150,endMs:60,finale:null,holdMs:3000};
  return c;
}

/* ------------------------------------------------------------------ media items (slides and bubbles) */
var viewerOpen=null;
function buildItem(it,host,where){
  var k=it.kind,wrap;
  if(k==='text'){
    var t=el('div','it text');
    String(it.text||'').split(/\n\n+/).forEach(function(p){t.appendChild(el('p',null,esc(p).replace(/\n/g,'<br>')));});
    if(it.date)t.appendChild(el('div','idate',esc(it.date)));
    return t;
  }
  var b=el('button','it '+(k==='video'?'video':'photo'));b.type='button';
  var th=it.thumb||(k==='video'?it.poster:null);   /* small preview in the grid; the full file only in the viewer */
  b.dataset.id=(th||it).id||'';b.dataset.mime=(th||it).mime||'';b.dataset.still=th||k!=='video'?'1':'';
  b.setAttribute('aria-label',it.caption||(k==='video'?'Play video':'Open photo'));
  if(k==='video')b.appendChild(el('span','play'));
  b.addEventListener('click',function(){openViewer(host,it);});
  /* folders show the words under the picture; slides keep the caption on hover */
  if(where==='folder'&&(it.caption||it.message||it.date)){
    wrap=el('figure','fig');wrap.appendChild(b);
    var fc=el('figcaption');
    if(it.date)fc.appendChild(el('div','idate',esc(it.date)));
    if(it.caption)fc.appendChild(el('div','icap',esc(it.caption)));
    if(it.message)String(it.message).split(/\n\n+/).forEach(function(p){fc.appendChild(el('p','imsg',esc(p).replace(/\n/g,'<br>')));});
    wrap.appendChild(fc);return wrap;
  }
  if(it.caption)b.appendChild(el('span','cap',esc(it.caption)));
  if(it.date)b.appendChild(el('span','dtag',esc(it.date)));
  return b;
}
function renderItems(items,host,cls,where){
  var n=items.length;
  var g=el('div','items '+(cls==='mixed'?'':(n>=5?'scroll':'n'+Math.max(1,Math.min(4,n))))+(cls?' '+cls:''));
  items.forEach(function(it){g.appendChild(buildItem(it,host,where));});
  return g;
}
/* pictures load when they come near the screen, so big folders and slides stay quick */
var lazyIO='IntersectionObserver' in window?new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){lazyIO.unobserve(e.target);fill(e.target);}});},{rootMargin:'300px'}):null;
function fill(b){
  if(b.dataset.ok)return;b.dataset.ok='1';
  var isV=b.classList.contains('video'),still=b.dataset.still;
  media(b.dataset.id,b.dataset.mime).then(function(m){
    var n;
    if(isV&&!still){n=D.createElement('video');n.muted=true;n.playsInline=true;n.preload='metadata';n.src=m.url+'#t=0.1';}
    else{n=new Image();n.alt=b.getAttribute('aria-label')||'';n.decoding='async';n.src=m.url;}
    b.insertBefore(n,b.firstChild);
  }).catch(function(){b.classList.add('broken');});
}
function hydrate(root){
  root.querySelectorAll('.it.photo:not([data-ok]),.it.video:not([data-ok])').forEach(function(b){if(lazyIO)lazyIO.observe(b);else fill(b);});
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
    var sp=Math.max(.25,+(S.content.look||{}).quoteSpeed||1),T={};   /* quote speed from the editor: 2 = twice as fast */
    Object.keys(CFG.intro).forEach(function(k){T[k]=CFG.intro[k]/sp;});
    var raf=0,timers=[],dismissed=false;
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
    var lk=S.content.look||{};$('#show').style.setProperty('--slide-bg',lk.slideBg||'#8fb8e6');$('#show').style.setProperty('--slide-text',lk.slideText||'#fffdf7');
    pager.classList.remove('fadeout');prev.classList.add('gone');next.classList.remove('gone');
    prev.innerHTML=ICON.chevL;next.innerHTML=ICON.chevR;
    var idx=startIdx||0,playing=!!CFG.slide.autoplay,timer=0,ended=false,slideEls=[];
    slides.forEach(function(sl,i){
      var s=el('section','sl');s.setAttribute('aria-label','Slide '+(i+1)+' of '+slides.length);
      if(sl.title)s.appendChild(el('h3',null,esc(sl.title)));
      s.appendChild(renderItems(sl.items||[],stage,'','slide'));
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
  (S.content.slides||[]).forEach(function(s){(s.items||[]).forEach(add);});
  (S.content.folders||[]).forEach(function(f){(f.items||(f.bubble||{}).items||[]).forEach(add);});
  return out;
}
function montagePool(){
  var M=S.content.montage||{},list=(M.items||[]).filter(function(i){return i&&i.id;});
  return list.length?list:allPhotos();
}
async function montage(){
  var M=S.content.montage||{},list=montagePool();
  if(!list.length&&!M.finale)return;
  stageName('montage');
  /* everything is fetched, decrypted and decoded before the screen goes dark, so the pops never stall */
  var srcs=(await Promise.all(list.map(function(it){return media(it.id,it.mime).then(function(m){return {it:it,url:m.url};}).catch(function(){return null;});}))).filter(Boolean);
  await Promise.all(srcs.map(function(x){
    if(x.it.kind==='video'){return new Promise(function(r){var v=D.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.onloadedmetadata=function(){x.ar=(v.videoWidth/v.videoHeight)||1.6;r();};v.onerror=function(){x.ar=1.6;r();};v.src=x.url;setTimeout(r,4000);});}
    var im=new Image();im.src=x.url;return (im.decode?im.decode():Promise.resolve()).then(function(){x.ar=(im.naturalWidth/im.naturalHeight)||1.4;}).catch(function(){x.ar=1.4;});
  }));
  var fin=null;
  if(M.finale&&M.finale.id){try{fin=await media(M.finale.id,M.finale.mime);}catch(e){fin=null;}}
  var wrap=$('#mwrap'),st=$('#mstage'),w=window.innerWidth,h=window.innerHeight;
  st.innerHTML='';wrap.style.transform='';wrap.style.opacity='';$('#mwhite').style.opacity=0;
  D.body.classList.add('dark');on('mont');
  if(!RM)await sleep(1250);                                    /* let the screen settle into the dark before photos start */
  shuffle(srcs);
  var C=CFG.mont,N=srcs.length?Math.max(1,+M.count||C.frames):0,t0=+M.startMs||C.start,t1=+M.endMs||C.end,base=Math.min(w,h),cells=[],live=[];
  function nextCell(){if(!cells.length){for(var i=0;i<9;i++)cells.push(i);shuffle(cells);}return cells.pop();}
  var due=performance.now();                                   /* absolute schedule: a slow frame never pushes the rest back */
  for(var i=0;i<N;i++){
    await until(due);
    var x=srcs[i%srcs.length],ar=x.ar||1.4,L=base*rnd(C.size[0],C.size[1]);
    var dw=ar>=1?L:L*ar,dh=ar>=1?L/ar:L,cap=Math.min(1,C.maxFill*w/dw,C.maxFill*h/dh);dw*=cap;dh*=cap;
    var c=nextCell(),cx=(c%3+.5)/3*w+rnd(-.1,.1)*w,cy=(((c/3)|0)+.5)/3*h+rnd(-.1,.1)*h;
    cx=Math.max(dw*.42,Math.min(w-dw*.42,cx));cy=Math.max(dh*.42,Math.min(h-dh*.42,cy));
    var card=el('div','mcard'),node;
    if(x.it.kind==='video'){node=D.createElement('video');node.muted=true;node.loop=true;node.playsInline=true;node.autoplay=true;node.src=x.url;live.push(node);var pr=node.play();if(pr&&pr.catch)pr.catch(function(){});
      if(live.length>3)live.shift().pause();}                  /* only the newest few videos keep playing */
    else{node=new Image();node.alt='';node.src=x.url;}
    card.appendChild(node);
    card.style.cssText='width:'+dw+'px;height:'+dh+'px;left:'+(cx-dw/2)+'px;top:'+(cy-dh/2)+'px;--r:'+rnd(-C.tilt,C.tilt).toFixed(2)+'deg';
    st.appendChild(card);
    due+=t0+(t1-t0)*(i/Math.max(1,N-1));
  }
  await until(due);
  /* the ending: the vertical video, played all the way through, then a pause before the TV switches off */
  live.forEach(function(v){v.pause();});
  if(fin){
    var shade=el('div','mshade');st.appendChild(shade);
    var fc=el('div','mcard mfinale'),fv=D.createElement('video');fv.playsInline=true;fv.preload='auto';fv.src=fin.url;fc.appendChild(fv);st.appendChild(fc);
    window.__fy.finale=fv;
    /* wait until it can actually play (or give up after a few seconds), then show it and play it to the end */
    var playable=await new Promise(function(r){if(fv.readyState>=3){r(true);return;}fv.oncanplay=function(){r(true);};fv.onerror=function(){r(false);};setTimeout(function(){r(fv.readyState>=2);},6000);});
    if(playable&&fv.videoWidth&&fv.videoHeight)fc.style.aspectRatio=fv.videoWidth+'/'+fv.videoHeight;
    void fc.offsetWidth;shade.classList.add('on');fc.classList.add('on');
    if(playable){
      await new Promise(function(done){
        var ended=false;function end(){if(ended)return;ended=true;done();}
        fv.onended=end;fv.onerror=end;
        var p1=fv.play();
        if(p1&&p1.catch)p1.catch(function(){fv.muted=true;var p2=fv.play();if(p2&&p2.catch)p2.catch(end);});
        setTimeout(end,((isFinite(fv.duration)?fv.duration:120)+8)*1000);   /* never get stuck */
      });
    }else{   /* this browser cannot play the file: show its still frame instead */
      fv.remove();var M2=S.content.montage||{},pst=M2.finale&&(M2.finale.poster||M2.finale.thumb);
      if(pst){try{var pm=await media(pst.id,pst.mime),im=new Image();im.src=pm.url;fc.appendChild(im);}catch(e){}}
      await sleep(2500);
    }
  }
  /* always a pause before the TV switches off */
  await sleep(RM?0:(+M.holdMs||3000));
  live.forEach(function(v){v.pause();});
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

/* ------------------------------------------------------------------ folders: arrive, bounce, settle into a grid (as many as the editor says) */
var SCENE=null;
function foldersScene(){
  if(SCENE)return SCENE.show();
  return new Promise(function(done){
    stageName('folders');
    var layerEl=$('#fold');D.body.classList.add('dark');on('fold');
    var cv=$('#fx'),ctx=cv.getContext('2d'),host=$('#fgrid'),dpr=Math.min(2,devicePixelRatio||1);
    var W=0,H=0,cell=0,size=0,R=0,g=0,slots=[],T=[],G={w:0,h:0};
    var data=(S.content.folders||[]).slice(0,64),NF=data.length,cols=Math.max(1,Math.ceil(Math.sqrt(NF))),rows=Math.max(1,Math.ceil(NF/cols));
    var owner=false;try{owner=localStorage.getItem('jj_fy_owner')==='1';}catch(e){}
    var planets=[{kind:'ring',spawned:false,off:false,x:0,y:0,vx:0,vy:0,tx:0,ty:0,r:20,a:0,ph:rnd(0,6.28)},{kind:'earth',spawned:false,off:false,x:0,y:0,vx:0,vy:0,tx:0,ty:0,r:18,a:0,ph:rnd(0,6.28)}];
    var paused=false,bodies=[],isReady=false,t=0,last=0,raf=0,STAR_CAP=CFG.fold.stars,CIRC_CAP=CFG.fold.circles;
    var stars=[],circs=[],used=[],cd={},ov={},ghost={};
    host.innerHTML='';
    function layout(){
      W=window.innerWidth;H=window.innerHeight;
      cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      cell=Math.min(W*.88/cols,H*.84/rows,W*.88/4*1.25);size=cell*.82;R=size*.43;g=Math.max(cols,rows)*cell;var gw=cols*cell,gh=rows*cell;
      for(var i=0;i<NF;i++){var r_=(i/cols)|0,inRow=Math.min(cols,NF-r_*cols);slots[i]={x:W/2+((i%cols)-(inRow-1)/2)*cell,y:H/2+(r_-(rows-1)/2)*cell};}
      G.w=gw;G.h=gh;
      bodies.forEach(function(b){b.r=R;b.el.style.width=size+'px';b.el.style.height=size*.8+'px';});
      makeTargets();
    }
    function makeTargets(){
      var gx0=W/2-G.w/2-8,gx1=W/2+G.w/2+8,gy0=H/2-G.h/2-8,gy1=H/2+G.h/2+8,C=[],tries=0;
      while(C.length<520&&tries<9000){
        tries++;var x=rnd(18,W-18),y=rnd(18,H-18);
        if(x>gx0&&x<gx1&&y>gy0&&y<gy1)continue;C.push([x,y]);
      }
      if(C.length<90){ /* tiny margins: allow anywhere that is not on a folder spot */
        C=[];tries=0;
        while(C.length<520&&tries<9000){
          tries++;var x2=rnd(18,W-18),y2=rnd(18,H-18),bad=false;
          for(var i=0;i<NF;i++){if(Math.hypot(x2-slots[i].x,y2-slots[i].y)<R*1.3){bad=true;break;}}
          if(!bad)C.push([x2,y2]);
        }
      }
      /* two planets: clear of the folder grid, far from each other, and the stars keep away from them */
      (function(){
        var pr=Math.max(16,Math.min(54,Math.min(W,H)*.055)),P,cl;
        function pool(r){
          cl=r*2.25;var out=[],n=0,gx0=W/2-G.w/2-cl,gx1=W/2+G.w/2+cl,gy0=H/2-G.h/2-cl,gy1=H/2+G.h/2+cl;
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
      if(f.name)b.dataset.name=f.name;
      host.appendChild(b);
      bodies.push({i:i,el:b,x:-999,y:-999,vx:0,vy:0,r:0,spawned:false,entered:false,at:0,born:0});
    });
    layout();
    window.addEventListener('resize',function(){layout();jamAt=null;arrow.style.width='';if(isReady)place(true);});
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
    var earthBtn=$('#earthBtn'),arrow=$('#jam'),jaSvg=$('#jamArrow'),jaLine=$('.jaLine',jaSvg),jaHead=$('.jaHead',jaSvg),jamAt=null;
    function hideJam(){earthBtn.classList.remove('vis');arrow.classList.remove('vis');jaSvg.classList.remove('vis');}
    function placeEarth(){
      var p=planets[1];
      if(!p||p.off||!p.spawned||p.a<.9||!(S.content.books||[]).length&&!S.content.map){hideJam();return;}
      var r=p.r*1.25,ex=p.x,ey=p.y+Math.sin(p.ph*.9)*2.2;
      earthBtn.style.cssText='left:'+(ex-r)+'px;top:'+(ey-r)+'px;width:'+(r*2)+'px;height:'+(r*2)+'px';
      earthBtn.classList.add('vis');earthBtn.onclick=function(){earthGate().then(function(ok){if(ok){hideJam();flyToEarth(ex,ey,p.r);}});};
      if(!isReady)return;
      /* the sign sits off toward the middle of the screen (where there is room), and the arrow runs from it to the planet */
      var aw=arrow.offsetWidth||200,ah=arrow.offsetHeight||64;
      if(!jamAt){   /* try spots around the planet: on screen, clear of the folders and the other planet; shrink the sign if nothing fits */
        var gx0=W/2-G.w/2-10,gx1=W/2+G.w/2+10,gy0=H/2-G.h/2-10,gy1=H/2+G.h/2+10,o=planets[0],best=null,px0=p.tx,py0=p.ty,full=Math.min(220,Math.max(150,W*.2));
        [1,.82,.68,.56].some(function(f){
          var bw=full*f,bh=bw*78/250;best=null;
          for(var dd=0;dd<7;dd++)for(var k=0;k<24;k++){
            var ang=k/24*Math.PI*2,dist=r+70+dd*36+Math.hypot(bw,bh)/2,cx=px0+Math.cos(ang)*dist,cy=py0+Math.sin(ang)*dist*.8;
            var l=cx-bw/2,t0=cy-bh/2,rr=cx+bw/2,b0=cy+bh/2;
            if(l<8||rr>W-8||t0<56||b0>H-8)continue;
            var hitG=!(rr<gx0||l>gx1||b0<gy0||t0>gy1),hitO=o&&!o.off&&Math.hypot(cx-o.x,cy-o.y)<o.r*2.4+bw/2;
            if(hitG||hitO)continue;
            var sc=dist+(Math.sin(ang)>.3?40:0);
            if(!best||sc<best.s)best={s:sc,x:cx,y:cy,w:bw};
          }
          return !!best;
        });
        if(!best)best={x:Math.max(full*.28+8,Math.min(W-full*.28-8,px0)),y:Math.max(56+full*.1,py0-r-80),w:full*.56};
        arrow.style.width=best.w+'px';aw=best.w;ah=aw*78/250;
        jamAt={x:best.x,y:best.y};   /* a fixed spot on screen; only the arrow's tip follows the bobbing planet */
      }else{aw=arrow.offsetWidth;ah=arrow.offsetHeight;}
      var sx=jamAt.x,sy=jamAt.y;
      arrow.style.left=(sx-aw/2)+'px';arrow.style.top=(sy-ah/2)+'px';
      /* start just outside the sign, on the side facing the planet; end just short of the planet */
      var vx=ex-sx,vy=ey-sy,vl=Math.hypot(vx,vy)||1,nx=vx/vl,ny=vy/vl;
      var t=Math.min(Math.abs(aw/2/(nx||1e-6)),Math.abs(ah/2/(ny||1e-6)))+10,x0=sx+nx*t,y0=sy+ny*t,x1=ex-nx*(r+10),y1=ey-ny*(r+10);
      var side=(nx>=0?1:-1)*(ny>=0?-1:1),len=Math.hypot(x1-x0,y1-y0),qx=(x0+x1)/2+(-ny)*len*.32*side,qy=(y0+y1)/2+nx*len*.32*side;
      jaLine.setAttribute('d','M'+x0.toFixed(1)+' '+y0.toFixed(1)+' Q'+qx.toFixed(1)+' '+qy.toFixed(1)+' '+x1.toFixed(1)+' '+y1.toFixed(1));
      var tx=x1-qx,ty=y1-qy,tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;var hs=16;
      jaHead.setAttribute('d','M'+(x1+tx*4).toFixed(1)+' '+(y1+ty*4).toFixed(1)+' L'+(x1-tx*hs-ty*hs*.6).toFixed(1)+' '+(y1-ty*hs+tx*hs*.6).toFixed(1)+' L'+(x1-tx*hs+ty*hs*.6).toFixed(1)+' '+(y1-ty*hs-tx*hs*.6).toFixed(1)+' Z');
      if(len>24){arrow.classList.add('vis');jaSvg.classList.add('vis');}
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
      for(var i=0;i<NF;i++){
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
      for(var a=0;a<NF;a++){
        var A1=bodies[a];if(!A1.spawned)continue;
        for(var q=a+1;q<NF;q++){
          var B1=bodies[q];if(!B1.spawned)continue;
          var vis=A1.x>-A1.r&&A1.x<W+A1.r&&A1.y>-A1.r&&A1.y<H+A1.r&&B1.x>-B1.r&&B1.x<W+B1.r&&B1.y>-B1.r&&B1.y<H+B1.r;
          if(!vis)continue;
          var key=a*NF+q,dx=B1.x-A1.x,dy=B1.y-A1.y,d=Math.hypot(dx,dy)||.001,min=A1.r+B1.r;
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
      if(snapF>0){for(var z=0;z<NF;z++){var bz=bodies[z],sz=slots[z];bz.x+=(sz.x-bz.x)*snapF;bz.y+=(sz.y-bz.y)*snapF;bz.vx*=(1-snapF);bz.vy*=(1-snapF);}}
      for(var m=0;m<NF;m++){var bm=bodies[m];if(bm.spawned){bm.el.style.opacity=Math.min(1,(t-bm.born)*1.4);draw1(bm);}}
      stepP(stars,dt);stepP(circs,dt);stepPlanets(dt);drawP();placeEarth();
      /* settled? */
      if(!isReady){
        var all=t>2.5,mx=0;
        for(var n=0;n<NF&&all;n++){var bn=bodies[n];if(!bn.spawned){all=false;break;}var e=Math.hypot(bn.x-slots[n].x,bn.y-slots[n].y),v=Math.hypot(bn.vx,bn.vy);if(e>1.2||v>6)all=false;}
        if(all||t>=TS)ready();
      }
      if(!paused)raf=requestAnimationFrame(frame);
    }
    SCENE={
      pause:function(){paused=true;cancelAnimationFrame(raf);hideJam();},
      resume:function(){if(!paused)return;paused=false;layout();if(isReady)place(true);last=performance.now();raf=requestAnimationFrame(frame);},
      show:function(){D.body.classList.add('dark');SCENE.resume();on('fold');stageName('folders-ready');setTimeout(function(){$('#backBtn').classList.add('vis');},500);return Promise.resolve();}
    };
    if(RM){setTimeout(placeEarth,50);ready();for(var s=0;s<STAR_CAP;s++)spawnP(0,W/2,H/2);for(var c2=0;c2<CIRC_CAP;c2++)spawnP(1,W/2,H/2);stars.concat(circs).forEach(function(p){var tg=T[p.ti]||[p.x,p.y];p.x=tg[0];p.y=tg[1];p.a=1;});planets.forEach(function(p){if(!p.off){p.spawned=true;p.x=p.tx;p.y=p.ty;p.a=1;}});drawP();return;}
    setTimeout(function(){if(paused||raf)return;last=performance.now();raf=requestAnimationFrame(frame);},CFG.fold.delay||0);
    window.__fy.bodies=bodies;window.__fy.slots=slots;window.__fy.targets=function(){return T;};window.__fy.particlesRef=function(){return {stars:stars,circs:circs};};window.__fy.planets=function(){return planets;};
  });
}

/* ------------------------------------------------------------------ bubble (Apple-style sheet) */
var bubOpen=null;
function openBubble(f,btn){
  if(bubOpen)return;
  var b=f.bubble?{title:f.bubble.title,items:f.bubble.items,type:f.bubble.type}:{title:f.title,items:f.items},items=b.items||[];
  var type=b.type||(items.length&&items.every(function(i){return i.kind==='text';})?'text':'mixed');
  var wrapEl=$('#bub');wrapEl.innerHTML='';
  var back=el('div','back'),sheet=el('div','sheet'),head=el('header'),h2=el('h2',null,esc(b.title||''));
  var x=el('button','xbtn',ICON.x);x.type='button';x.setAttribute('aria-label','Close');
  head.appendChild(h2);head.appendChild(x);sheet.appendChild(head);
  var body=el('div','body');
  if(!items.length)body.appendChild(el('div','empty','Nothing here yet.'));
  else if(type==='text'){sheet.classList.add('textonly');body.appendChild(renderItems(items,sheet,'mixed','folder'));}
  else body.appendChild(renderItems(items,sheet,'mixed','folder'));
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


/* ------------------------------------------------------------------ Earth: fly in to 42.115744, -79.983994, the heart map draws itself, then the books */
var TARGET={lat:42.115744,lon:-79.983994,label:'Erie, Pennsylvania'};
/* Earth has its own password: the screen blurs, the prompt floats up and away like the ones at the start, then the cursor waits */
var EG={open:false,ok:false,fails:0};
function earthGate(){
  var q=S.vault&&S.vault.earth;
  if(!q||EG.ok)return Promise.resolve(true);
  if(EG.open)return Promise.resolve(false);
  EG.open=true;stageName('earth-lock');
  var g=$('#egate'),pr=$('.eprompt',g),ln=$('.eline',g),ty=$('.etyped',g),ca=$('.caret',g),hi=$('.ehint',g),fd=$('.efield',g),busy=false;
  fd.inputMode=q.kind==='text'?'text':'numeric';fd.value='';ty.textContent='';hi.classList.remove('vis');hi.textContent=q.hint||'';ca.classList.add('hide');fd.disabled=true;
  g.classList.add('on');void g.offsetWidth;g.classList.add('vis');
  return new Promise(function(done){
    function close(ok){
      g.classList.remove('vis');fd.blur();EG.open=false;
      setTimeout(function(){g.classList.remove('on');},500);
      if(!ok)stageName('folders-ready');
      done(ok);
    }
    function sync(){ty.textContent=fd.value;}
    async function submit(){
      if(busy||fd.disabled||!fd.value.trim())return;busy=true;
      var sec=await unwrapAnswer(q,fd.value);busy=false;
      if(sec){EG.ok=true;close(true);return;}
      EG.fails++;fd.value='';sync();ln.classList.remove('wiggle');void ln.offsetWidth;ln.classList.add('wiggle');
      if(EG.fails>=CFG.hintAfter&&q.hint)hi.classList.add('vis');
    }
    fd.oninput=sync;
    fd.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();submit();}else if(e.key==='Escape'){e.preventDefault();close(false);}};
    g.onpointerdown=function(e){if(e.target.closest('.ex'))return;if(!fd.disabled)setTimeout(function(){fd.focus();},0);};
    $('.ex',g).onclick=function(){close(false);};
    /* the same prompt animation as the questions at the start */
    var P=CFG.prompt;
    pr.textContent=q.prompt||'';pr.style.transition='none';pr.style.opacity=0;pr.style.setProperty('--py','12px');void pr.offsetWidth;
    setTimeout(function(){
      pr.style.transition='opacity '+P.fadeIn+'ms ease,transform '+P.fadeIn+'ms ease';pr.style.opacity=1;pr.style.setProperty('--py','0px');
      setTimeout(function(){
        pr.style.transition='opacity '+P.fadeOut+'ms ease,transform '+P.fadeOut+'ms cubic-bezier(.3,.6,.3,1)';pr.style.opacity=0;pr.style.setProperty('--py',(-P.rise)+'px');
        setTimeout(function(){ca.classList.remove('hide');fd.disabled=false;try{fd.focus();}catch(e){}stageName('earth-lock-ready');},Math.round(P.fadeOut*.45));
      },P.fadeIn+P.hold);
    },RM?0:350);
  });
}
var WORLD={busy:false,map:null,booksShown:false,timers:[]};
/* soft, puffy clouds: overlapping round puffs with a lit top and a shaded underside, drawn once and reused */
var CLOUDS=null;
function cloudSprites(){
  if(CLOUDS)return CLOUDS;CLOUDS=[];
  for(var v=0;v<6;v++){
    var c=D.createElement('canvas'),W2=320,H2=180;c.width=W2;c.height=H2;var x=c.getContext('2d'),puffs=[],n=8+(v%3)*3;
    for(var i=0;i<n;i++){var t=i/(n-1),px=W2*(.16+.68*t)+rnd(-14,14),py=H2*(.6-Math.sin(t*Math.PI)*.28)+rnd(-10,8),pr=H2*(.16+Math.sin(t*Math.PI)*.2)*rnd(.8,1.15);puffs.push([px,py,pr]);}
    for(i=0;i<5;i++)puffs.push([W2*rnd(.25,.75),H2*rnd(.55,.7),H2*rnd(.12,.2)]);   /* a fuller base */
    function layer(dy,col0,col1,k){puffs.forEach(function(p){var g=x.createRadialGradient(p[0],p[1]+dy,p[2]*.15,p[0],p[1]+dy,p[2]*k);g.addColorStop(0,col0);g.addColorStop(.62,col0);g.addColorStop(1,col1);x.fillStyle=g;x.beginPath();x.arc(p[0],p[1]+dy,p[2]*k,0,6.283);x.fill();});}
    layer(H2*.05,'rgba(196,212,232,.9)','rgba(196,212,232,0)',1.08);    /* shaded underside */
    layer(0,'rgba(255,255,255,.96)','rgba(255,255,255,0)',1);           /* body */
    layer(-H2*.04,'rgba(255,255,255,.6)','rgba(255,255,255,0)',.7);      /* lit tops */
    CLOUDS.push(c);
  }
  return CLOUDS;
}
function fmtLat(v){return Math.abs(v).toFixed(6)+'° '+(v>=0?'N':'S');}
function fmtLon(v){return Math.abs(v).toFixed(6)+'° '+(v>=0?'E':'W');}
async function flyToEarth(ex,ey,er){
  if(WORLD.busy||bubOpen)return;WORLD.busy=true;
  window.__fy.closeBubble&&bubOpen&&window.__fy.closeBubble();
  $('#backBtn').classList.remove('vis');
  if(SCENE)SCENE.pause();
  stageName('flight');
  var mapP=loadMap();                                     /* decrypt the map while we fly */
  var w=window.innerWidth,h=window.innerHeight,dpr=Math.min(2,devicePixelRatio||1);
  var lay=$('#world');lay.className='layer on vis flying';
  var cv=$('#flycv');cv.width=w*dpr;cv.height=h*dpr;var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  var hud=$('#hud');hud.classList.add('vis');
  $('#fold').classList.remove('vis');
  var T=RM?600:4600,t0=performance.now(),la0=rnd(-50,60),lo0=rnd(-170,170);
  var clouds=[],CS=cloudSprites();for(var i=0;i<40;i++)clouds.push({a:rnd(0,6.283),d:rnd(.05,1),s:rnd(.7,1.5),z:rnd(0,1),v:i%CS.length,f:Math.random()<.5});
  function ease(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
  await new Promise(function(done){
    (function frame(now){
      var p=Math.min(1,(now-t0)/T),e=ease(Math.min(1,p/.72));
      /* the planet grows from where it sat to far past the edges of the screen, drifting to the centre */
      var cx=ex+(w/2-ex)*e,cy=ey+(h/2-ey)*e,R=er*Math.pow(Math.max(w,h)*6/er,e);
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#03060d';ctx.fillRect(0,0,w,h);
      /* stars streak outward as we speed up */
      ctx.strokeStyle='rgba(220,236,255,'+(.5*(1-p))+')';ctx.lineWidth=1.2;
      for(var i=0;i<70;i++){var a=i*2.399,rr=((i*53)%97)/97*Math.max(w,h)*.7+p*240,len=6+p*90;ctx.beginPath();ctx.moveTo(w/2+Math.cos(a)*rr,h/2+Math.sin(a)*rr);ctx.lineTo(w/2+Math.cos(a)*(rr+len),h/2+Math.sin(a)*(rr+len));ctx.stroke();}
      globe(ctx,cx,cy,R,e,now);
      /* clouds rush past near the end */
      if(p>.55){var cp=(p-.55)/.45;
        clouds.forEach(function(c){var z=(c.z+cp*1.6)%1.2,sc=Math.pow(z,2.2)*Math.max(w,h)*.9,x=w/2+Math.cos(c.a)*c.d*w*.4*(1+z*3),y=h/2+Math.sin(c.a)*c.d*h*.4*(1+z*3);
          var cw=sc*c.s*.9,ch=cw*.56;ctx.globalAlpha=Math.max(0,Math.min(.9,z*.95)*(1-Math.max(0,cp-.8)*5));
          ctx.save();ctx.translate(x,y);if(c.f)ctx.scale(-1,1);ctx.drawImage(CS[c.v],-cw/2,-ch/2,cw,ch);ctx.restore();ctx.globalAlpha=1;});
        ctx.fillStyle='rgba(243,238,230,'+Math.max(0,(cp-.55)/.45)+')';ctx.fillRect(0,0,w,h);   /* into the paper */
      }
      var k=Math.min(1,p/.8),kk=1-Math.pow(1-k,3);
      $('#hlat').textContent=fmtLat(la0+(TARGET.lat-la0)*kk);$('#hlon').textContent=fmtLon(lo0+(TARGET.lon-lo0)*kk);
      $('#hplace').classList.toggle('vis',p>.7);
      if(p<1)requestAnimationFrame(frame);else done();
    })(t0);
  });
  stageName('map');
  lay.classList.remove('flying');
  var map=await mapP;
  await drawMap(map);
  WORLD.busy=false;
}
/* a stylised Earth, turning so the target ends up in the middle; Lake Erie shows up as we get close */
function globe(ctx,x,y,r,e,now){
  if(r>1e5)r=1e5;
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.clip();
  var g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);g.addColorStop(0,'#bfe5fc');g.addColorStop(.6,'#7fc1ee');g.addColorStop(1,'#3f8ccc');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  /* land around the target: offsets in planet radii, scaled with the zoom */
  var L=[[-.42,-.22,.2,.12,.5],[-.18,-.08,.16,.1,.2],[.02,.03,.12,.07,-.3],[.2,-.12,.14,.08,.6],[-.05,.22,.11,.16,.1],[.36,.14,.1,.15,-.4],[-.3,.3,.09,.06,.3],[.14,.32,.07,.05,0],[.45,-.3,.12,.07,.2],[-.02,-.002,.03,.018,-.2]];
  ctx.fillStyle='#86d08c';
  L.forEach(function(b){ctx.beginPath();ctx.ellipse(x+b[0]*r,y+b[1]*r,b[2]*r,b[3]*r,b[4],0,6.283);ctx.fill();});
  ctx.fillStyle='#a9e6a3';
  L.forEach(function(b){ctx.beginPath();ctx.ellipse(x+b[0]*r-b[2]*r*.08,y+b[1]*r-b[3]*r*.1,b[2]*r*.7,b[3]*r*.66,b[4],0,6.283);ctx.fill();});
  /* a layer of puffy clouds drifting over the planet, thinning out as we get close */
  var CS=cloudSprites(),cl=[[-.32,-.36,.34],[.26,.24,.4],[.08,-.52,.28],[-.46,.44,.3],[.5,-.12,.26],[-.12,.12,.2],[.36,.56,.24],[-.6,-.04,.22]],dr=Math.sin(now/2600)*r*.025;
  ctx.globalAlpha=Math.max(0,.85*(1-e*1.15));
  cl.forEach(function(c,i){var cw=c[2]*r,ch=cw*.56;ctx.drawImage(CS[i%CS.length],x+c[0]*r+dr*(i%2?1:-1)-cw/2,y+c[1]*r-ch/2,cw,ch);});
  ctx.globalAlpha=1;
  if(e>.55){   /* the Great Lakes appear: Lake Erie just north of the point */
    var a=Math.min(1,(e-.55)/.3);ctx.globalAlpha=a;ctx.fillStyle='#5aa6e0';
    ctx.beginPath();ctx.ellipse(x-r*.004,y-r*.0035,r*.012,r*.0028,-.42,0,6.283);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+r*.022,y-r*.012,r*.009,r*.0024,-.25,0,6.283);ctx.fill();
    ctx.beginPath();ctx.ellipse(x-r*.03,y-r*.02,r*.006,r*.012,.3,0,6.283);ctx.fill();
    ctx.globalAlpha=1;
  }
  var sh=ctx.createRadialGradient(x-r*.5,y-r*.55,r*.2,x,y,r*1.1);sh.addColorStop(0,'rgba(255,255,255,.16)');sh.addColorStop(.6,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(10,40,90,.4)');
  ctx.fillStyle=sh;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  /* the target marker pulses in the middle */
  if(e>.2){var pa=.5+.5*Math.sin(now/180);ctx.strokeStyle='rgba(255,92,140,'+(.55+.4*pa)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,6+pa*6,0,6.283);ctx.stroke();ctx.fillStyle='#ff5c8c';ctx.beginPath();ctx.arc(x,y,3,0,6.283);ctx.fill();}
}
function loadMap(){
  if(WORLD.map)return Promise.resolve(WORLD.map);
  var m=S.content.map;if(!m)return Promise.resolve(null);
  return media(m.id,m.mime).then(function(x){return x.blob.text();}).then(function(t){WORLD.map=JSON.parse(t);return WORLD.map;}).catch(function(){return null;});
}
var SVGNS='http://www.w3.org/2000/svg';
function sv(tag,attrs){var e=D.createElementNS(SVGNS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);return e;}
/* builds the map as real vector shapes and draws them in from several places at once (about 10 seconds) */
function drawMap(M){
  return new Promise(function(done){
    var box=$('#mapbox');box.innerHTML='';
    $('#mapcoords').textContent=fmtLat(TARGET.lat)+'  ·  '+fmtLon(TARGET.lon);
    if(!M){box.appendChild(el('div','empty','Map not found.'));showBooks();done();return;}
    var svg=sv('svg',{viewBox:'0 0 '+M.w+' '+M.h,role:'img','aria-label':'Heart-shaped map'});
    var gR=sv('g',{fill:'none',stroke:'#26262e','stroke-width':M.roadW,'stroke-linecap':'round','stroke-linejoin':'round'});
    var gB=sv('g',{}),gH=sv('g',{fill:'none',stroke:'#1b1b22','stroke-width':M.heartW,'stroke-linecap':'round','stroke-linejoin':'round'});
    svg.appendChild(gR);svg.appendChild(gB);svg.appendChild(gH);box.appendChild(svg);
    $('#world').classList.add('mapon');
    var D0=RM?0:1,anims=[],ends=[];
    /* five starting points spread over the heart: every line starts when the "wave" from its nearest point reaches it */
    var seeds=[[.28,.3],[.72,.26],[.5,.55],[.3,.72],[.72,.7]].map(function(p){return [p[0]*M.w,p[1]*M.h];});
    function wave0(x,y){var m=1e9;seeds.forEach(function(s){m=Math.min(m,Math.hypot(x-s[0],y-s[1]));});return m;}
    var wmax=1;M.roads.forEach(function(r){wmax=Math.max(wmax,Math.min(wave0(r.a[0],r.a[1]),wave0(r.b[0],r.b[1])));});M.buildings.forEach(function(b){wmax=Math.max(wmax,wave0(b.c[0],b.c[1]));});
    function wave(x,y){return wave0(x,y)/wmax;}   /* 0 at a starting point, 1 at the farthest line: the whole drawing takes about 10 seconds */
    function draw(path,len,delay,dur){
      var pad=Math.max(M.heartW,M.roadW)+8;   /* keeps the rounded line ends out of sight until the line starts */
      path.style.strokeDasharray=len+' '+(len+pad*2);path.style.strokeDashoffset=D0?len+pad:0;
      if(!D0)return;
      var a=path.animate([{strokeDashoffset:len+pad},{strokeDashoffset:0}],{duration:dur,delay:delay,easing:'cubic-bezier(.45,.1,.35,1)',fill:'forwards'});anims.push(a);ends.push(delay+dur);
    }
    M.heart.forEach(function(d){var p=sv('path',{d:d});gH.appendChild(p);draw(p,p.getTotalLength(),0,4200);});
    M.roads.forEach(function(r){
      var p=sv('path',{d:r.d});gR.appendChild(p);
      var st=Math.min(wave(r.a[0],r.a[1]),wave(r.b[0],r.b[1]));
      draw(p,r.len,300+st*7400,Math.max(450,Math.min(2200,r.len*2.4)));
    });
    M.buildings.forEach(function(b){
      var p=sv('path',{d:b.o+b.h,'fill-rule':'evenodd',fill:'#3a3a44',stroke:'#26262e','stroke-width':3});
      gB.appendChild(p);
      var delay=900+wave(b.c[0],b.c[1])*6800,len=b.len*1.1;
      p.style.fillOpacity=D0?0:1;draw(p,len,delay,1300);
      if(D0){var f=p.animate([{fillOpacity:0},{fillOpacity:1}],{duration:700,delay:delay+1000,fill:'forwards'});anims.push(f);ends.push(delay+1700);}
    });
    var total=D0?Math.max.apply(null,ends.concat([0])):0;
    window.__fy.mapDrawMs=total;
    tilt(true);
    WORLD.timers.push(setTimeout(function(){
      stageName('map-drawn');
      WORLD.timers.push(setTimeout(function(){showBooks();done();},RM?0:4000));   /* a 4 second pause, then the books */
    },total));
  });
}
/* the map leans toward the pointer, like the CD case */
var tiltOn=false;
function tilt(on){
  var wrap=$('#mapwrap');
  if(on&&!tiltOn&&!RM){tiltOn=true;
    var raf=0,tx=0,ty=0,cx=0,cy=0;
    $('#world').addEventListener('pointermove',function(e){tx=(e.clientX/window.innerWidth-.5);ty=(e.clientY/window.innerHeight-.5);if(!raf)raf=requestAnimationFrame(step);});
    function step(){raf=0;cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;wrap.style.setProperty('--rx',(-cy*7).toFixed(2)+'deg');wrap.style.setProperty('--ry',(cx*9).toFixed(2)+'deg');if(Math.abs(tx-cx)>.002||Math.abs(ty-cy)>.002)raf=requestAnimationFrame(step);}
  }
}
function showBooks(){
  var shelf=$('#shelf');shelf.innerHTML='';
  (S.content.books||[]).forEach(function(bk,i){
    var b=el('button','book');b.type='button';b.setAttribute('aria-label','Open '+(bk.title||'book '+(i+1)));
    b.innerHTML='<span class="bk3"><span class="bkfront"></span><span class="bkspine"></span><span class="bkpages"></span><span class="bkback"></span></span>'+(bk.title?'<span class="bktitle">'+esc(bk.title)+'</span>':'');
    if(bk.cover)media(bk.cover.id,bk.cover.mime).then(function(m){
      $('.bkfront',b).style.backgroundImage='url("'+m.url+'")';
      var im=new Image();im.onload=function(){   /* spine and back take the cover's own colour */
        try{var c=D.createElement('canvas');c.width=c.height=8;var x=c.getContext('2d');x.drawImage(im,0,0,8,8);var d=x.getImageData(0,0,8,8).data,r=0,g=0,bb=0;for(var j=0;j<d.length;j+=4){r+=d[j];g+=d[j+1];bb+=d[j+2];}r=r/64|0;g=g/64|0;bb=bb/64|0;
          b.style.setProperty('--bk','rgb('+r+','+g+','+bb+')');b.style.setProperty('--bkd','rgb('+(r*.7|0)+','+(g*.7|0)+','+(bb*.7|0)+')');b.style.setProperty('--ar',(im.naturalWidth/im.naturalHeight).toFixed(3));}catch(e){}
      };im.src=m.url;
    }).catch(function(){});
    b.addEventListener('click',function(){openReader(bk);});
    shelf.appendChild(b);
  });
  $('#world').classList.add('books');WORLD.booksShown=true;syncBooksBtn();
  $('#booksBtn').classList.add('vis');$('#worldBack').classList.add('vis');
  stageName('books');
}
function syncBooksBtn(){var b=$('#booksBtn');b.textContent=WORLD.booksShown?'Hide books':'Show books';b.setAttribute('aria-pressed',WORLD.booksShown?'false':'true');}
$('#booksBtn').addEventListener('click',function(){WORLD.booksShown=!WORLD.booksShown;$('#world').classList.toggle('books',WORLD.booksShown);syncBooksBtn();});
$('#worldBack').addEventListener('click',async function(){
  if(WORLD.busy)return;closeReader();
  WORLD.timers.forEach(clearTimeout);WORLD.timers=[];
  $('#booksBtn').classList.remove('vis');$('#worldBack').classList.remove('vis');$('#hud').classList.remove('vis');$('#hplace').classList.remove('vis');
  await off('world');$('#world').className='layer';
  if(SCENE)await SCENE.show();
});
/* ------------------------------------------------------------------ book reader: one page on phones, two side by side on wide screens */
var RD=null;
function openReader(bk){
  closeReader();
  var pages=bk.pages||[],r=$('#reader');r.innerHTML='';
  var head=el('div','rhead'),title=el('div','rtitle',esc(bk.title||'')),count=el('div','rcount'),x=el('button','vbtn',ICON.x);x.type='button';x.setAttribute('aria-label','Close book');
  head.appendChild(title);head.appendChild(count);head.appendChild(x);
  var spread=el('div','rspread'),prev=el('button','nav prev',ICON.chevL),next=el('button','nav next',ICON.chevR);prev.type=next.type='button';prev.setAttribute('aria-label','Previous page');next.setAttribute('aria-label','Next page');
  r.appendChild(head);r.appendChild(spread);r.appendChild(prev);r.appendChild(next);
  r.classList.add('on');void r.offsetWidth;r.classList.add('vis');
  var i=0;
  function per(){return window.innerWidth>=900?2:1;}
  function page(p){
    var f=el('div','rpage');
    if(!p){f.classList.add('blank');return f;}
    media(p.id,p.mime).then(function(m){var im=new Image();im.alt='';im.decoding='async';im.src=m.url;f.appendChild(im);}).catch(function(){f.classList.add('blank');});
    f.addEventListener('click',function(){f.classList.toggle('zoom');});
    return f;
  }
  function show(){
    spread.innerHTML='';
    if(!pages.length){spread.appendChild(el('div','rempty','No pages yet.'));count.textContent='';prev.classList.add('gone');next.classList.add('gone');return;}
    var n=per();i=Math.max(0,Math.min(i,pages.length-1));if(n===2)i-=i%2;
    for(var k=0;k<n&&i+k<pages.length;k++)spread.appendChild(page(pages[i+k]));
    count.textContent=(n===2&&i+1<pages.length?(i+1)+'–'+(i+2):(i+1))+' / '+pages.length;
    prev.classList.toggle('gone',i===0);next.classList.toggle('gone',i+n>=pages.length);
    for(var j=i+n;j<Math.min(pages.length,i+n*2);j++)media(pages[j].id,pages[j].mime).catch(function(){});   /* get the next pages ready */
  }
  prev.onclick=function(){i-=per();show();};next.onclick=function(){i+=per();show();};x.onclick=closeReader;
  var sx=null;spread.onpointerdown=function(e){sx=e.clientX;};spread.onpointerup=function(e){if(sx===null)return;var dx=e.clientX-sx;sx=null;if(Math.abs(dx)>50){i+=dx<0?per():-per();show();}};
  function key(e){if(e.key==='Escape')closeReader();else if(e.key==='ArrowRight')next.onclick();else if(e.key==='ArrowLeft')prev.onclick();}
  window.addEventListener('keydown',key);window.addEventListener('resize',show);
  RD={el:r,off:function(){window.removeEventListener('keydown',key);window.removeEventListener('resize',show);}};
  show();x.focus();stageName('reader');
}
function closeReader(){if(!RD)return;var r=RD.el;RD.off();RD=null;r.classList.remove('vis');setTimeout(function(){r.classList.remove('on');r.innerHTML='';},300);stageName('books');}

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
  if(start==='world'){D.body.classList.add('dark');await flyToEarth(window.innerWidth*.78,window.innerHeight*.3,Math.max(16,Math.min(54,Math.min(window.innerWidth,window.innerHeight)*.055)));return;}
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
/* ------------------------------------------------------------------ page editor: reached only from the first password page, opened only by the editor password */
var gate=$('#gate'),gateTries=0;
$('#editBtn').addEventListener('click',function(){gate.classList.add('on');$('#gatePw').value='';$('#gateMsg').textContent='';setTimeout(function(){$('#gatePw').focus();},30);});
$('#gateX').addEventListener('click',function(){gate.classList.remove('on');try{field.focus();}catch(e){}});
$('#gateForm').addEventListener('submit',async function(e){
  e.preventDefault();var pw=$('#gatePw').value,msg=$('#gateMsg');if(!pw||!S.vault)return;
  msg.textContent='Checking\u2026';
  try{S.key=await editorKey(pw);}
  catch(err){gateTries++;await sleep(Math.min(8000,600*gateTries));msg.textContent='That is not the editor password.';$('#gatePw').select();return;}
  $('#gatePw').value='';gateTries=0;
  S.content=upgrade(JSON.parse(dec.decode(await aes(S.key,b64(S.vault.data)))));
  msg.textContent='Opening\u2026';
  try{await loadEditor();}catch(err){msg.textContent='The editor did not load. Check your connection.';return;}
  gate.classList.remove('on');window.FyEditor.open(API);
});
function loadEditor(){
  if(window.FyEditor)return Promise.resolve();
  return new Promise(function(ok,no){
    var l=D.createElement('link');l.rel='stylesheet';l.href='editor.css';D.head.appendChild(l);
    var sc=D.createElement('script');sc.src='editor.js';sc.onload=ok;sc.onerror=no;D.body.appendChild(sc);
  });
}
var API={S:S,CFG:CFG,media:media,cache:cache,aes:aes,aesKey:aesKey,kdf:kdf,b64:b64,toB64:toB64,cat:cat,NORM:NORM,normQ:normQ,unwrapAnswer:unwrapAnswer,upgrade:upgrade,enc:enc,dec:dec,esc:esc,el:el};
/* the editor's Preview runs the real page in a frame, handed the edited content and the unpublished media */
window.__fyPreview=async function(o){
  S.vault=o.vault;S.content=upgrade(JSON.parse(JSON.stringify(o.content)));S.pending=o.pending||{};S.key=await aesKey(o.ckRaw);
  A.locked=true;field.disabled=true;$('#editBtn').classList.remove('vis');
  var lg=$('#login');lg.classList.remove('vis','on');
  await sequence(o.start||'intro');
};
window.__fy.api=API;
boot();
})();
