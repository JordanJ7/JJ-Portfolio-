import {MEDIA,P,STEAM,CERTS,MUSIC,WATCH,WATCHED,REVIEWS,PSN,COURSES} from './data.js?v=20261116a';

var $=function(id){return document.getElementById(id);};
var BASE='Jordan James';

var BYID={};P.forEach(function(p,i){p.i=i;BYID[p.id]=p;});

/* drawn disc art for projects without a cover image */
var ART={
  journal:function(){   /* the Journal-101 app icon (Crimson Violet): one line, two dots */
    return '<rect width="200" height="200" fill="#470b25"/><g transform="translate(100 100) scale(.78) translate(-96 -100)">'+
      '<path d="M60 36V140a24 24 0 0 0 24 24H148" fill="none" stroke="#7a3552" stroke-width="14" stroke-linecap="round"/>'+
      '<circle cx="60" cy="68" r="16" fill="#ffedd5"/><circle cx="148" cy="164" r="20" fill="#b5bedd"/></g>';},
  edits:function(){
    var o='<rect width="200" height="200" fill="#0a0a0a"/>',k;
    for(k=0;k<18;k++)o+='<rect x="'+(k*12-6)+'" y="10" width="7" height="9" rx="1.5" style="fill:var(--pink)" fill-opacity=".9"/><rect x="'+(k*12-6)+'" y="181" width="7" height="9" rx="1.5" style="fill:var(--pink)" fill-opacity=".9"/>';
    return o+'<text x="100" y="66" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="34" style="fill:var(--pink)">FLX</text><text x="100" y="152" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="24" style="fill:var(--pink)">__EDITS</text>';},
  sony:function(){
    var o='<rect width="200" height="200" style="fill:var(--pink)"/>',k;
    for(k=0;k<10;k++)o+='<g transform="rotate('+k*36+' 100 100)"><rect x="86" y="14" width="28" height="22" rx="3" fill="#0a0a0a"/><path d="M91 30L98 21L104 27L109 22" style="stroke:var(--pink)" stroke-width="1.6" fill="none"/></g>';
    return o+'<circle cx="100" cy="100" r="56" fill="none" stroke="#0a0a0a" stroke-opacity=".3" stroke-width="2"/>';},
  erie:function(){
    var o='<rect width="200" height="200" fill="#f5f5f5"/>',k,s,x;
    for(k=0;k<7;k++){s=150-k*17;x=100-s/2;o+='<rect x="'+x+'" y="'+x+'" width="'+s+'" height="'+s+'" rx="'+(6+k*7)+'" fill="none" style="stroke:var(--pink)" stroke-opacity="'+(.3+k*.1).toFixed(2)+'" stroke-width="2.4" transform="rotate('+k*14+' 100 100)"/>';}
    return o+'<circle cx="100" cy="100" r="8" fill="#0a0a0a"/>';}
};

/* each cover image is embedded once and reused with <use> */
var defs='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
P.forEach(function(p){if(p.cover)defs+='<image id="cov-'+p.cover+'" href="'+MEDIA[p.cover].src+'" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>';});
document.body.insertAdjacentHTML('afterbegin',defs+'</defs></svg>');

function svg(p){
  var inner=p.cover?'<rect width="200" height="200" fill="#000"/><use href="#cov-'+p.cover+'"/>':ART[p.art]();
  return '<svg viewBox="0 0 200 200" aria-hidden="true">'+inner+'</svg>';
}
function when(p){return p.date;}

/* ---------- hero: three notable projects on the CD, picked from a numbered tracklist ---------- */
var FEAT=['journal-101','matter-monsters','flx-edits'].map(function(id){return BYID[id];});
var tl=$('tl'),disc=$('disc'),box=$('case'),stage=$('stage'),hero=$('top'),cur=0;
function num(i){return (i<9?'0':'')+(i+1);}
tl.innerHTML=FEAT.map(function(p,i){return '<li><button type="button" aria-pressed="false" aria-label="'+p.title+', '+p.date+'"><span>'+num(i)+'</span>'+p.title+'</button></li>';}).join('');
Array.prototype.forEach.call(tl.querySelectorAll('button'),function(b,i){b.addEventListener('click',function(){setOpen(true);select(i);});});

/* My Works: the newest project leads with its whole disc; the rest are a tracklist */
(function(){
  var f=P[0],h='<article class="feat"><div class="fc"><p class="fd">'+f.date+' &middot; '+f.kind+'</p><h3>'+f.title+'</h3><p class="fb">'+f.blurb+'</p><p class="ft">'+f.tools+'</p><a class="more" href="#/'+f.id+'">View project</a></div>'+
    '<a class="fdisc" href="#/'+f.id+'" aria-label="'+f.title+'">'+svg(f)+'</a></article><ol class="tracks">';
  P.slice(1).forEach(function(p,i){
    h+='<li><a href="#/'+p.id+'"><span class="no">'+num(i+1)+'</span><span class="td">'+svg(p)+'</span><span class="tt"><b>'+p.title+'</b><small>'+p.kind+'</small></span><span class="tdt">'+p.date+'</span><span class="ar" aria-hidden="true">&rarr;</span></a></li>';
  });
  $('works').innerHTML=h+'</ol>';
})();

var wm='<a href="#work"><span>All work</span></a><hr>';
P.forEach(function(p){wm+='<a href="#/'+p.id+'"><span>'+p.title+'</span><small>'+p.date+'</small></a>';});
$('workMenu').innerHTML=wm;

function select(i){
  cur=(i+FEAT.length)%FEAT.length;var p=FEAT[cur];
  Array.prototype.forEach.call(tl.querySelectorAll('button'),function(c,k){c.setAttribute('aria-pressed',k===cur?'true':'false');});
  disc.classList.remove('swap');void disc.offsetWidth;disc.classList.add('swap');
  setTimeout(function(){$('discArt').innerHTML=svg(FEAT[cur]);},120);
  $('spine').textContent=num(cur)+'  '+p.title;
  var info=$('info');info.classList.remove('fade');void info.offsetWidth;info.classList.add('fade');
  $('date').textContent=p.date;$('kind').textContent=p.kind;$('title').textContent=p.title;$('blurb').textContent=p.blurb;
  $('go').setAttribute('href','#/'+p.id);
}
function setOpen(v){box.classList.toggle('open',v);stage.setAttribute('aria-pressed',v?'true':'false');}
function step(d){setOpen(true);select(cur+d);}

/* pointer: tilt eases toward the mouse (one update per frame), swipe changes disc, tap opens/closes */
var sx=0,moved=false,raf=0,pend=.5,mx=.5,mlast=0;
function ease(now){
  var dt=Math.min(.05,(now-(mlast||now))/1000||.016);mlast=now;
  mx+=(pend-mx)*(1-Math.exp(-dt*12));
  if(Math.abs(pend-mx)<.0005)mx=pend;
  stage.style.setProperty('--mx',mx.toFixed(4));
  if(mx!==pend)raf=requestAnimationFrame(ease);else{raf=0;mlast=0;}
}
stage.addEventListener('pointerdown',function(e){sx=e.clientX;moved=false;});
stage.addEventListener('pointermove',function(e){
  if(Math.abs(e.clientX-sx)>8)moved=true;
  if(e.pointerType!=='mouse')return;
  var r=stage.getBoundingClientRect();pend=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  if(!raf)raf=requestAnimationFrame(ease);
});
stage.addEventListener('pointerup',function(e){
  var dx=e.clientX-sx;
  if(Math.abs(dx)>40)select(cur+(dx<0?1:-1));
  else if(!moved)setOpen(!box.classList.contains('open'));
});
stage.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(!box.classList.contains('open'));}});
$('prev').addEventListener('click',function(){step(-1);});
$('next').addEventListener('click',function(){step(1);});

/* ---------- colour palettes: [id, name, swatches, page colour for the browser bar] ---------- */
var PALETTES=[
  ['espresso','Espresso',['#3f2622','#f3c9d5','#f5f1e6'],'#1d1210'],
  ['lavender','Lavender & Coral',['#8e93cb','#f8769c','#fedced'],'#16152b'],
  ['crimson','Crimson & Periwinkle',['#470b25','#b5bedd','#ffeed6'],'#1c0610'],
  ['nox','Nox & Amethyst',['#141414','#7e49b3','#cfcfcf'],'#141414'],
  ['obsidian','Obsidian & Guava',['#4c1413','#ea6b7e','#fedced'],'#1f0808'],
  ['classic','Classic pink',['#0a0a0a','#ff4fa3','#ffb3d6'],'#0a0a0a']
];
function swatch(c){return c.map(function(x){return '<i style="background:'+x+'"></i>';}).join('');}
function setPalette(id,save){
  var p=PALETTES.filter(function(q){return q[0]===id;})[0]||PALETTES[0];
  if(p[0]==='espresso')document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',p[0]);
  document.querySelector('meta[name="theme-color"]').setAttribute('content',p[3]);
  $('palSw').innerHTML=swatch(p[2]);
  Array.prototype.forEach.call($('palMenu').querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',b.dataset.pal===p[0]?'true':'false');});
  if(save)try{localStorage.setItem('palette',p[0]);}catch(e){}
}
$('palMenu').innerHTML='<div class="palh">Colour palette</div>'+PALETTES.map(function(p){return '<button type="button" data-pal="'+p[0]+'" aria-pressed="false"><span class="sw">'+swatch(p[2])+'</span>'+p[1]+'</button>';}).join('');
$('palMenu').addEventListener('click',function(e){var b=e.target.closest('button[data-pal]');if(b)setPalette(b.dataset.pal,true);});
setPalette(document.documentElement.getAttribute('data-theme')||'espresso',false);

/* ---------- dropdowns ---------- */
var dds=document.querySelectorAll('.dd');
function closeDD(except){Array.prototype.forEach.call(dds,function(d){if(d!==except){d.classList.remove('open');if(d.firstElementChild.tagName==='BUTTON')d.firstElementChild.setAttribute('aria-expanded','false');}});}
Array.prototype.forEach.call(dds,function(d){
  var btn=d.firstElementChild,isBtn=btn.tagName==='BUTTON';
  if(isBtn)btn.addEventListener('click',function(e){e.stopPropagation();var o=d.classList.toggle('open');btn.setAttribute('aria-expanded',o?'true':'false');closeDD(d);});
  d.addEventListener('mouseleave',function(){d.classList.remove('open');if(isBtn)btn.setAttribute('aria-expanded','false');});
  d.querySelector('.menu').addEventListener('click',function(){closeDD(null);if(document.activeElement)document.activeElement.blur();});
});
document.addEventListener('click',function(){closeDD(null);});

/* ---------- nav buddy: a different Pokemon in the corner on each visit; it opens the special site ---------- */
/* Every buddy gets Mareep's moves: idle bob, lean, blinking, hop on hover, sparks on click.
   Mareep also wags its tail. Jirachi sleeps until you hover or tap it, then dozes off again a few seconds later. */
var Buddy=(function(){
  var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var BOX_W=42,BOX_H=28;                                   /* largest sprite size in the nav, css px */
  var PAD_T=6,PAD_X=3,PAD_B=1;                             /* room for the hop, lean and sparks, css px */
  var DIR='assets/sprites/';
  var ROSTER=[
    {id:'mareep',src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAhCAYAAAC1ONkWAAAEXUlEQVR4nK2YLXSjShTH/7OnInJw1FFHHRK3kawjLnWRqVpceA5JHVEbWRfqeA7ZOiRueWpZ1XEg89Q8QWcYPpPs6z2H08zn/c3cO3fulHDOMSdv+3sOAFlWy7rd8Z3MDrpSfr8QXjITAPD1+08CAGQO7G1/z+31ulPHihLxIUWYnlBVFRHgAOAGDABQVdXF4L9fCNfdE1AuAABRoGN3fCeTYE8Pt9yLtqNtrCgBAJabgBXeoF4FvwgKAEsaMN1q4EbB5qDOwYm2Ms/gBmwW7vcL4boFsLyt0y1Atylu+p3//otwQB9MksUxAKBvWt9ZDPrqpvHRluLp4Vau/BrflDv29HDLTYNhc6AAMDCRbhrSv7xoC1aUsNxE9nne1rCcjYTK4lguYm4H3/b33HYKWRY+dgMAq9WKxyHD2ncBvE7ugCqWm2C5XDaTrZMP32h8ixVeZ2fF+DwBNE3jKtzX7z/J2/6eZ1mNMD0BOGEH4Iumadx1XQCA67pSmfChvjSDIfu7rgvd+gBwQiyXS+hmNLm4JNA75hVwu+M7EboBND7meR7oFvAOnmwwQguln8sJhTkAYLGhoB/jAGB5aMaI8pwYlo0sS2f7PD3c8puqqoimaZ0V1HYAZ+vCCIGQhp1dokGMOi06E+V5d+I8cWcVh2ljrr7EYQKWA9aWts6vaRp/3tbYHChoEMM0zMHAomyByigBrWNZ9p0FTIN1DkBf1BDjO4vBKf33H8IF2BdRWVUVKUodjDHUQTckSLDtsm0zW3DfWWC9dWA5m9FxKpTav+9rWdrO2Ylju+P7wKyq6PowvokwAYyf3j4UANg2lX+fHm757vhOVqsVf31lAJq2QeQn3/bccMzzpkwL0CyQ/jQFNQUnJD40B0H1YwCtKVvtxQBirEyzAM/behZGlSnwMD3BC9jgBumAve3v+SnTUaYtnPhUEe3nTHiNeAFDfqiRBDqqqiISrJPiFMXU+IEJP0tYDpTMlKmTBFMTQXXXOlBRgpCGnwZluQnyxIVuUwklrqtOHOunL+rVIo5422ZcBdF3/jLPYFi2/N2/4AdpT3cyb/Q0/V8oABJqSiSYuJoEjFD+GY79J9I5lVVVEd2MLg6Ul/Q5N0YkBv1wMTDlWEYqFFy6e5csQIUaSyCHAXZCkYjQnwGkQgHjmzEA8zP3KgV9KFXhGESZZ52yG7DRt0AHjNw9cifyYWwWyOIYrCilwiZlbn4vbIaFzWRZhRIBUhVRJ4CyrEaW1bOvKBnHBJS4fsooQWgn8nIVp7amaziRDwBIDwlKPwfQviXV4CtAk2Dk1fWR40+BdZxfQNXBGhTA7lgRNdOsqoqQu0eu9hUvpSTQ4aPuvJxE/bVQQC/yqwCTA+4eueG58s4cU96+eMYdW7XClB5wzq/6KKVcfGN1lFIOJ7qqfeybvZLGZGyVwsRiJ6fa1XT8nFwUxy4R/usHKaMEhjOunP/6QebSqb7M/hvqT0T46pT/nGsX8h/R6RlXBca52QAAAABJRU5ErkJggg==',scale:.8,tail:{x:31,rows:9},blink:{copy:[10,11],at:[[11,11],[12,11]]},spark:['#f8d800','#ffffff']},
    {id:'reshiram',src:DIR+'reshiram.png',blink:{color:'#4a4a6a',at:[[20,11],[18,12]]},spark:['#ff7a1a','#ffd27a']},
    {id:'rayquaza',src:DIR+'rayquaza.png',spark:['#3fd18a','#f8e04a']},
    {id:'latias',src:DIR+'latias-right.png',spark:['#c792ea','#ffffff']},
    {id:'jirachi',src:DIR+'jirachi.png',sleep:DIR+'jirachi-sleep.png',blink:{color:'#101010',at:[[23,20],[24,20],[23,21],[30,21],[31,21]]},spark:['#ffe65a','#62d5de'],wakeMs:5000}
  ];
  function load(src){return new Promise(function(ok,no){var i=new Image();i.onload=function(){ok(i);};i.onerror=no;i.src=src;});}
  function canvas(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingEnabled=false;return [c,x];}

  /* one pose (an image) prepared for drawing: s = css px per sprite pixel, k = work-canvas px per sprite pixel */
  function pose(img,def,blinkSpec){
    var w=img.width,h=img.height,s=def.scale||Math.min(1,BOX_W/w,BOX_H/h),k=Math.max(1,Math.round(4*s));
    var normal=canvas(w,h),closed=null;normal[1].drawImage(img,0,0);
    if(blinkSpec){
      closed=canvas(w,h);var bx=closed[1];bx.drawImage(img,0,0);
      var col=blinkSpec.copy?bx.getImageData(blinkSpec.copy[0],blinkSpec.copy[1],1,1).data:null;
      blinkSpec.at.forEach(function(p){if(col){var d=bx.createImageData(1,1);d.data.set(col);bx.putImageData(d,p[0],p[1]);}else{bx.fillStyle=blinkSpec.color;bx.fillRect(p[0],p[1],1,1);}});
    }
    return {w:w,h:h,s:s,k:k,normal:normal[0],closed:closed&&closed[0]};
  }

  function mount(host,def,o){
    o=o||{};
    var poses={};
    var ready=Promise.all([load(def.src),def.sleep?load(def.sleep):null]).then(function(r){
      poses.awake=pose(r[0],def,def.blink);
      if(r[1])poses.sleep=pose(r[1],def,null);
    });
    var dpr=Math.max(1,window.devicePixelRatio||1),cv=document.createElement('canvas'),ctx=cv.getContext('2d');
    cv.setAttribute('aria-hidden','true');cv.style.display='block';host.appendChild(cv);
    var cssW=0,cssH=0,fw=0,fh=0,work={};
    function size(){
      var mw=0,mh=0;Object.keys(poses).forEach(function(n){var p=poses[n];mw=Math.max(mw,p.w*p.s);mh=Math.max(mh,p.h*p.s);});
      cssW=Math.round(mw+PAD_X*2+(poses.sleep?4:0));cssH=Math.round(mh+PAD_T+PAD_B);
      fw=Math.round(cssW*dpr);fh=Math.round(cssH*dpr);cv.width=fw;cv.height=fh;cv.style.width=cssW+'px';cv.style.height=cssH+'px';
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      Object.keys(poses).forEach(function(n){   /* work canvases: the frame, its light rim, and the two combined */
        var p=poses[n],ww=Math.ceil(cssW/p.s*p.k),wh=Math.ceil(cssH/p.s*p.k);
        work[n]={fr:canvas(ww,wh),rim:canvas(ww,wh),hc:canvas(ww,wh),ww:ww,wh:wh};
      });
    }
    var rimColor=o.rim||null,t0=performance.now(),nextBlink=2200+Math.random()*2000,blinkUntil=0,hop=null,zap=null,hover=false,onscreen=true;
    var state=poses&&def.sleep&&!RM?'sleep':'awake',wakeT=0,zzz=[],nextZ=0;
    function bobY(t,period){return ((Math.sin(2*Math.PI*t/period-Math.PI/2)+1)/2)>.5?-1:0;}
    function draw(now){
      var p=poses[state]||poses.awake,W=work[state]||work.awake;if(!p)return;
      var t=RM?0:(now-t0)/1000*(hover?1.7:1),ms=now-t0,asleep=state==='sleep',U=p.k;   /* U = work px per sprite pixel */
      var px=function(css){return Math.round(css/p.s);};                               /* css px -> sprite pixels */
      var bob=RM?0:bobY(t,asleep?2.6:1.3)*Math.max(1,px(.8)),sway=asleep?0:Math.sin(2*Math.PI*t/3.2),wag=Math.sin(2*Math.PI*t/1.15+.8),hopY=0;
      if(hop){var hp=(now-hop)/300;if(hp>=1)hop=null;else hopY=-Math.round(px(4)*Math.sin(Math.PI*hp));}
      if(!RM&&!asleep&&ms>nextBlink){blinkUntil=ms+120;nextBlink=ms+2600+Math.random()*2600;}
      var src=(ms<blinkUntil&&p.closed)?p.closed:p.normal;
      var ox=Math.round((W.ww/U-p.w)/2),oy=px(PAD_T)+Math.round((W.wh/U-px(PAD_T)-px(PAD_B)-p.h));   /* sprite sits on the bottom, centred */
      var fx=W.fr[1],tail=def.tail&&state==='awake'?def.tail:null,TX=tail?tail.x:p.w,lean1=px(1.12),wag1=px(1.76);
      fx.clearRect(0,0,W.ww,W.wh);
      for(var y=0;y<p.h;y++){
        var lean=Math.round(lean1*sway*Math.pow((p.h-1-y)/(p.h-1),1.3)),dy=oy+y+bob+hopY;
        var tw=(tail&&y<tail.rows)?Math.round(wag1*wag*(tail.rows-y)/tail.rows):0;
        fx.drawImage(src,0,y,TX,1,(ox+lean)*U,dy*U,TX*U,U);
        if(tail)fx.drawImage(src,TX,y,p.w-TX,1,(ox+TX+lean+tw)*U,dy*U,(p.w-TX)*U,U);
      }
      var hx=W.hc[1];hx.clearRect(0,0,W.ww,W.wh);
      if(rimColor){   /* thin light edge so the dark outline stays visible on a dark page */
        var rx=W.rim[1];rx.clearRect(0,0,W.ww,W.wh);rx.globalCompositeOperation='source-over';rx.drawImage(W.fr[0],0,0);
        rx.globalCompositeOperation='source-in';rx.fillStyle=rimColor;rx.fillRect(0,0,W.ww,W.wh);
        var rw=Math.max(1,Math.round(U/p.s));[[-1,0],[1,0],[0,-1],[0,1]].forEach(function(d){hx.drawImage(W.rim[0],d[0]*rw,d[1]*rw);});
      }
      hx.drawImage(W.fr[0],0,0);
      var dot=Math.max(1,Math.round(U/p.s));                                            /* one css px, in work px */
      if(asleep&&!RM){   /* little z's drifting up from its head */
        if(ms>nextZ){zzz.push(ms);nextZ=ms+1400;}
        zzz=zzz.filter(function(z){return ms-z<2800;});
        zzz.forEach(function(z){
          var a=(ms-z)/2800,zx=(ox+p.w)*U-dot*2+Math.round(a*dot*5),zy=(oy+p.h*.35)*U-Math.round(a*dot*14),n=a<.5?3:2;
          hx.globalAlpha=1-a;hx.fillStyle='#e6eef6';
          for(var i=0;i<n;i++){hx.fillRect(zx+i*dot,zy,dot,dot);hx.fillRect(zx+i*dot,zy+(n-1)*dot,dot,dot);hx.fillRect(zx+(n-1-i)*dot,zy+i*dot,dot,dot);}
          hx.globalAlpha=1;
        });
      }
      if(zap){   /* sparks in the buddy's colours */
        var zp=(now-zap)/420;
        if(zp>=1)zap=null;else{
          hx.globalAlpha=1-zp;
          var cx0=(ox+p.w/2)*U,cy0=(oy+p.h*.45)*U;
          for(var i=0;i<8;i++){
            var a2=i/8*Math.PI*2+.4,r=(8+zp*13)*(i%2?1:.75)*.8*dot,cx=Math.round(cx0+Math.cos(a2)*r),cy=Math.round(cy0+Math.sin(a2)*r*.8);
            hx.fillStyle=def.spark[i%2];
            hx.fillRect(cx,cy,dot,dot);hx.fillRect(cx+dot,cy,dot,dot);hx.fillRect(cx,cy+dot,dot,dot);
          }
          hx.globalAlpha=1;
        }
      }
      ctx.clearRect(0,0,fw,fh);ctx.drawImage(W.hc[0],0,0,Math.round(cssW/p.s*U),Math.round(cssH/p.s*U),0,0,fw,fh);
    }
    var last=0,raf=0,dead=false,io=null;
    function loop(now){raf=requestAnimationFrame(loop);if(!onscreen||now-last<28)return;last=now;draw(now);}
    ready.then(function(){if(dead)return;state=poses.sleep&&!RM?'sleep':'awake';size();draw(performance.now());raf=requestAnimationFrame(loop);});
    if(window.IntersectionObserver){io=new IntersectionObserver(function(e){onscreen=e[0].isIntersecting;});io.observe(cv);}
    function doze(){clearTimeout(wakeT);if(poses.sleep)wakeT=setTimeout(function(){if(!hover){state='sleep';zzz=[];nextZ=0;}},def.wakeMs||5000);}
    return {
      def:def,
      hop:function(){if(!RM)hop=performance.now();},
      zap:function(){zap=performance.now();if(!RM)hop=performance.now();},
      hover:function(v){hover=v;if(!v)doze();},
      asleep:function(){return state==='sleep';},
      wake:function(){if(!poses.sleep)return;clearTimeout(wakeT);if(state==='sleep'){state='awake';if(!RM)hop=performance.now();}doze();},
      destroy:function(){dead=true;cancelAnimationFrame(raf);clearTimeout(wakeT);if(io)io.disconnect();cv.remove();},
      canvas:cv
    };
  }
  /* a random buddy, never the one just shown (remembered across reloads) */
  function pick(){
    var last='';try{last=localStorage.getItem('jj_buddy')||'';}catch(e){}
    var pool=ROSTER.filter(function(d){return d.id!==last;}),def=pool[Math.random()*pool.length|0];
    try{localStorage.setItem('jj_buddy',def.id);}catch(e){}
    return def;
  }
  /* turns a link into a buddy button: hops on hover, sparks on click, then goes to href.
     A new buddy is picked on every page load and every page change inside the site. */
  function link(a,o){
    var HREF=a.getAttribute('href'),LABEL=a.getAttribute('aria-label'),TITLE=a.getAttribute('title');
    var forced=(/[?&]buddy=([a-z]+)/.exec(location.search)||[])[1];
    var def=ROSTER.filter(function(d){return d.id===forced;})[0]||pick(),m=null;
    function show(d){
      if(m)m.destroy();
      m=mount(a,d,o||{});a.dataset.buddy=d.id;
      /* only Mareep is a way into the special site; the others are just for fun */
      if(d.id==='mareep'){a.setAttribute('href',HREF);a.setAttribute('aria-label',LABEL);if(TITLE)a.setAttribute('title',TITLE);a.removeAttribute('role');a.removeAttribute('tabindex');}
      else{a.removeAttribute('href');a.setAttribute('role','img');a.setAttribute('aria-label',d.id.charAt(0).toUpperCase()+d.id.slice(1));a.removeAttribute('title');}
      if(a.matches(':hover')){m.hover(true);m.wake();}
    }
    show(def);
    a.classList.add('mareep');
    window.addEventListener('hashchange',function(){show(pick());});
    a.addEventListener('mouseenter',function(){m.hover(true);m.wake();m.hop();});
    a.addEventListener('mouseleave',function(){m.hover(false);});
    a.addEventListener('focus',function(){m.wake();m.hop();});
    a.addEventListener('blur',function(){m.hover(false);});
    a.addEventListener('click',function(e){
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;
      if(m.asleep()){e.preventDefault();m.wake();return;}   /* a tap on a sleeping Jirachi just wakes it */
      m.zap();
      var href=a.getAttribute('href');
      if(!href){e.preventDefault();return;}             /* not Mareep: sparks, but it goes nowhere */
      if(a.target==='_blank')return;                    /* new tab: let the browser open it right away */
      e.preventDefault();
      setTimeout(function(){location.assign(href);},RM?0:430);
    });
    return {id:function(){return m.def.id;},asleep:function(){return m.asleep();},next:function(){show(pick());}};
  }
  return {link:link,roster:ROSTER};
})();

window.__buddy=Buddy.link(document.getElementById('mareepLink'),{rim:'rgba(244,239,228,.95)'});

/* ---------- Giratina: now and then flies across the page on a random path ---------- */
/* Not on every visit: a chance per page load, after a random wait, and sometimes it comes back later.
   The sheet has 8 facing directions (rows: S, SE, E, NE, N, NW, W, SW) with 3 wing poses each. */
window.__fly=(function(){
  var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var CFG={chance:.45,first:[8000,30000],again:.3,gap:[40000,120000],speed:[150,230]};
  var CW=59,CH=38,ROW={E:2,SE:1,S:0,SW:7,W:6,NW:5,N:4,NE:3},SECT=['E','SE','S','SW','W','NW','N','NE'];
  var atlas=null,flying=false;
  function rnd(a,b){return a+Math.random()*(b-a);}
  function sheet(){return atlas||(atlas=new Promise(function(ok,no){var i=new Image();i.onload=function(){ok(i);};i.onerror=no;i.src='assets/sprites/giratina-fly.png';}));}
  /* a path that enters from one edge, wanders through 2-3 random points, and leaves by another edge */
  function route(W,H,m){
    function edge(e){return e===0?[rnd(0,W),-m]:e===1?[W+m,rnd(0,H)]:e===2?[rnd(0,W),H+m]:[-m,rnd(0,H)];}
    var e0=Math.random()*4|0,e1=(e0+1+(Math.random()*3|0))%4,pts=[edge(e0)];
    for(var i=0,n=2+(Math.random()*2|0);i<n;i++)pts.push([rnd(.12,.88)*W,rnd(.15,.8)*H]);
    pts.push(edge(e1));
    var P=[pts[0]].concat(pts,[pts[pts.length-1]]),poly=[[pts[0][0],pts[0][1],0]];
    for(var j=1;j<P.length-2;j++){   /* Catmull-Rom through every point */
      for(var s=1;s<=40;s++){
        var t=s/40,t2=t*t,t3=t2*t,p0=P[j-1],p1=P[j],p2=P[j+1],p3=P[j+2];
        var x=.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
        var y=.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
        var q=poly[poly.length-1];poly.push([x,y,q[2]+Math.hypot(x-q[0],y-q[1])]);
      }
    }
    return poly;
  }
  function at(poly,d){   /* point and heading at distance d along the path */
    var lo=0,hi=poly.length-1;while(hi-lo>1){var mid=(lo+hi)>>1;if(poly[mid][2]<d)lo=mid;else hi=mid;}
    var a=poly[lo],b=poly[hi],f=(d-a[2])/((b[2]-a[2])||1);
    return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,ang:Math.atan2(b[1]-a[1],b[0]-a[0])};
  }
  function fly(){
    if(flying)return Promise.resolve();
    if(document.hidden){return new Promise(function(r){document.addEventListener('visibilitychange',function v(){if(!document.hidden){document.removeEventListener('visibilitychange',v);fly().then(r);}});});}
    flying=true;
    return sheet().then(function(img){return new Promise(function(done){
      var W=window.innerWidth,H=window.innerHeight,dpr=Math.min(2,window.devicePixelRatio||1),sc=W<600?1.4:2;
      var cv=document.createElement('canvas');cv.className='flyer';cv.setAttribute('aria-hidden','true');
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);document.body.appendChild(cv);
      var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
      var poly=route(W,H,Math.max(CW,CH)*sc),len=poly[poly.length-1][2],v=rnd(CFG.speed[0],CFG.speed[1]),t0=performance.now(),last=t0,d=0,sect=-1;
      (function frame(now){
        var dt=Math.min(.05,(now-last)/1000);last=now;
        var tt=(now-t0)/1000;d+=v*dt*(1+.18*Math.sin(tt*1.7));   /* glides a little faster and slower */
        if(d>=len){cv.remove();flying=false;done();return;}
        var p=at(poly,d),deg=p.ang*180/Math.PI;
        var want=((Math.round(deg/45)%8)+8)%8;
        if(sect<0)sect=want;
        else{var off=Math.abs(((deg-sect*45)%360+540)%360-180);if(off>32)sect=want;}   /* only turn once clearly past the edge of a direction */
        var pose=[0,1,2,1][Math.floor(tt/.13)%4],row=ROW[SECT[sect]];
        var x=p.x,y=p.y+Math.sin(tt*2.3)*6,dw=CW*sc,dh=CH*sc;
        ctx.clearRect(0,0,W,H);
        ctx.drawImage(img,pose*CW,row*CH,CW,CH,Math.round(x-dw/2),Math.round(y-dh/2),dw,dh);
        requestAnimationFrame(frame);
      })(t0);
    });});
  }
  function schedule(range,chance){if(Math.random()<chance)setTimeout(function(){fly().then(function(){schedule(CFG.gap,CFG.again);});},rnd(range[0],range[1]));}
  if(!RM){
    if(/[?&]fly=1/.test(location.search))setTimeout(function(){fly().then(function(){schedule(CFG.gap,CFG.again);});},800);
    else schedule(CFG.first,CFG.chance);
  }
  return {fly:fly,config:CFG,active:function(){return flying;}};
})();

/* ---------- scroll cue: fades out once the page has been scrolled ---------- */
(function(){var m=document.getElementById('moreh');if(!m)return;function chk(){m.classList.toggle('gone',window.scrollY>60);}window.addEventListener('scroll',chk,{passive:true});chk();})();

/* ---------- lightbox ---------- */
var lb=$('lb'),lbi=lb.querySelector('img');
function openLB(img){lbi.src=img.src;lbi.alt=img.alt;lb.classList.add('on');}
function closeLB(){lb.classList.remove('on');}
lb.addEventListener('click',closeLB);
$('detail').addEventListener('click',function(e){var t=e.target;if(t.tagName==='IMG'&&t.closest('.gal,.zoom'))openLB(t);});
$('detail').addEventListener('keydown',function(e){var t=e.target;if((e.key==='Enter'||e.key===' ')&&t.tagName==='IMG'&&t.closest('.gal,.zoom')){e.preventDefault();openLB(t);}});

window.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeLB();closeDD(null);return;}
  if(document.body.classList.contains('viewing')||lb.classList.contains('on'))return;
  var tag=e.target&&e.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
  if(window.scrollY>window.innerHeight*.9)return;
  if(e.key==='ArrowRight'){e.preventDefault();step(1);}
  if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
});

/* ---------- pause work that isn't on screen ---------- */
if('IntersectionObserver' in window){
  new IntersectionObserver(function(en){hero.classList.toggle('off',!en[0].isIntersecting);}).observe(hero);
}
var vio='IntersectionObserver' in window?new IntersectionObserver(function(en){
  en.forEach(function(e){if(e.isIntersecting){var p=e.target.play();if(p&&p.catch)p.catch(function(){});}else e.target.pause();});
},{threshold:.25}):null;

  // static pages
  var CB='https://www.coursera.org/account/accomplishments/';
  function pageCerts(){
    /* each Coursera record has its certificate image saved as MEDIA['cert_'+record id] */
    function pic(k){var m=MEDIA[k];return m?'<img class="cimg" src="'+m.src+'" alt="'+m.alt+'" width="'+m.w+'" height="'+m.h+'" tabindex="0" decoding="async" loading="lazy">':'';}
    function card(title,by,link,k,ext){return '<div class="cert">'+pic(k)+'<b>'+title+'</b><span class="d">'+by+'</span><a href="'+link+'"'+(ext?' target="_blank" rel="noopener">View credential &#8599;':'>View the project')+'</a></div>';}
    function rec(c){return 'cert_'+c[2].split('/').pop().toLowerCase();}
    var pro=CERTS.slice(0,7),ess=CERTS.slice(7);
    var o='<div class="pg zoom"><h1>Certifications.</h1><p class="sub">'+(CERTS.length+2)+' certificates, shown as issued. Tap one to see it full size, or open the official record.</p>'+
      '<div class="certf">'+pic('cert_fcz277ui53ya')+'<div class="cf"><p class="date">Google &middot; Coursera &middot; Jun 30, 2026</p><h2>Google AI Professional Certificate</h2>'+
      '<p>Seven courses on applying AI at work: brainstorming, research, writing, content, data analysis and building an app, with a portfolio of 20+ pieces made along the way.</p>'+
      '<a href="'+CB+'professional-cert/FCZ277UI53YA" target="_blank" rel="noopener">View credential &#8599;</a></div></div>'+
      '<h2>The seven courses</h2><div class="certs">';
    pro.forEach(function(c){o+=card(c[0],'Google, issued '+c[1],CB+c[2],rec(c),1);});
    o+='</div><h2>Google AI Essentials</h2><div class="certs">';
    ess.forEach(function(c){o+=card(c[0],'Google, issued '+c[1],CB+c[2],rec(c),1);});
    o+='</div><h2>Sony Pictures Animation &middot; Yellowbrick</h2><div class="certs">'+card('This Is Animation','Sony Pictures Animation on Yellowbrick, issued Jun 23, 2025','#/this-is-animation','sony_cert',0)+'</div>'+
      '<p class="sub" style="margin-top:22px">More on <a href="https://www.linkedin.com/in/jordan-james07" target="_blank" rel="noopener">LinkedIn</a>.</p></div>';
    return o;}
  var DEPT={game:'Game Development',digit:'Digital Media',inart:'Integrative Arts',art:'Art',comm:'Communications'};
  function semId(sm){return 'sem-'+sm.replace(/\s+/g,'-').toLowerCase();}
  function deptOf(c){return c.code.split(' ')[0].toLowerCase();}
  function pageCourses(){
    var sems=[],cnt={};
    COURSES.forEach(function(c){if(sems.indexOf(c.sem)<0)sems.push(c.sem);cnt[deptOf(c)]=(cnt[deptOf(c)]||0)+1;});
    var linked=COURSES.filter(function(c){return c.link;});
    var o='<div class="pg wide crs"><h1>Coursework.</h1><p class="sub">The courses I took at Penn State Behrend for my BA in Digital Media, Arts &amp; Technology, with a minor in Game Development. Open a course for the full description.</p>'+
      '<div class="cstats"><div><b>'+COURSES.length+'</b><span>courses</span></div><div><b>'+sems.length+'</b><span>semesters</span></div><div><b>'+Object.keys(cnt).length+'</b><span>departments</span></div><div><b>'+linked.length+'</b><span>with work to see</span></div></div>'+
      '<div class="cfilter" role="group" aria-label="Show courses from one department"><button type="button" data-d="all" aria-pressed="true">All <span>'+COURSES.length+'</span></button>'+
      Object.keys(DEPT).filter(function(d){return cnt[d];}).map(function(d){return '<button type="button" class="d-'+d+'" data-d="'+d+'" aria-pressed="false"><i></i>'+DEPT[d]+' <span>'+cnt[d]+'</span></button>';}).join('')+'</div>'+
      '<h2>Work from these classes</h2><div class="cwork">'+linked.map(function(c){
        var ext=c.link.h.charAt(0)!=='#';
        return '<a class="d-'+deptOf(c)+'" href="'+c.link.h+'"'+(ext?' target="_blank" rel="noopener"':'')+'><span class="code">'+c.code+' &middot; '+c.sem+'</span><b>'+c.title+'</b><span class="go2">'+c.link.l+(ext?' &#8599;':' &rarr;')+'</span></a>';}).join('')+'</div>'+
      '<div class="ctime">';
    sems.slice().reverse().forEach(function(sm){
      var list=COURSES.filter(function(c){return c.sem===sm;});
      o+='<section class="csem" id="'+semId(sm)+'"><h2>'+sm+'<small>'+list.length+' course'+(list.length>1?'s':'')+'</small></h2><div class="courses">';
      list.forEach(function(c){
        o+='<details class="course d-'+deptOf(c)+'" data-d="'+deptOf(c)+'"><summary><span class="code">'+c.code+' <em>'+DEPT[deptOf(c)]+'</em></span><b>'+c.title+'</b><span class="short">'+c.short+'</span><span class="more">Read the full description</span></summary>'+
          '<p class="full">'+c.full+'</p>'+(c.link?'<a class="clink" href="'+c.link.h+'"'+(c.link.h.charAt(0)==='#'?'':' target="_blank" rel="noopener"')+'>'+c.link.l+(c.link.h.charAt(0)==='#'?'':' &#8599;')+'</a>':'')+'</details>';
      });
      o+='</div></section>';
    });
    o+='</div><p class="sub" style="margin-top:22px">See the projects in <a href="#work">My Works</a>, and my <a href="#/certifications">certifications</a>.</p></div>';
    return o;}
  function initCourses(){   /* department filter: hides other departments' courses and any semester left empty */
    var f=document.querySelector('.cfilter');if(!f)return;
    f.addEventListener('click',function(e){
      var b=e.target.closest('button[data-d]');if(!b)return;var d=b.dataset.d;
      f.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
      document.querySelectorAll('.csem').forEach(function(sec){
        var any=false;sec.querySelectorAll('.course').forEach(function(c){var on=d==='all'||c.dataset.d===d;c.hidden=!on;if(on)any=true;});
        sec.hidden=!any;
      });
    });
  }
  function job(org,dates,role,bul){return '<div class="job"><div class="row"><b>'+org+'</b><span>'+dates+'</span></div>'+(role?'<div class="role">'+role+'</div>':'')+'<ul>'+bul.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>';}
  function pageResume(){
    return '<div class="pg"><div class="btns"><a href="assets/Jordan-James-Resume.pdf" download>Download PDF</a><button type="button" onclick="window.print()">Print</button><a href="#/certifications">See certifications</a><a href="#/courses">See coursework</a></div>'+
    '<div class="paper"><h1>Jordan James</h1><p class="contactline">Erie, PA &middot; <a href="mailto:saojmj123456@gmail.com">saojmj123456@gmail.com</a> &middot; <a href="https://www.linkedin.com/in/jordan-james07/" target="_blank" rel="noopener">linkedin.com/in/jordan-james07</a> &middot; <a href="#/flx-edits">Edits</a></p>'+
    '<h2>Summary</h2><ul><li>IT support technician with nearly three years of help desk experience, resolving 40+ tickets weekly in ServiceNow.</li><li>Trained in computer networking, with hands-on hardware repair, network installation, and customer service skills.</li></ul>'+
    '<h2>Education</h2>'+
    job('The Pennsylvania State University, Erie, PA','May 2025','Bachelor of Arts, Digital Media, Arts &amp; Technology. Minor: Game Development',[])+
    job('Erie County Technical School, Erie, PA','August 2018 &ndash; May 2020','Focus: Computer Networking',['Coursework: designing, installing, and troubleshooting computer and A/V network systems; LANs, WANs, OSI model, Ethernet, IP addressing, routers and router programming, cabling, and Windows Server administration.'])+
    '<ul><li>Penn State Bridge Program (master&rsquo;s prep): CMPSC 2310 Foundations of Programming (Python), CMPSC 2320 Data Structures and Algorithms, MATH 2340 Calculus, MATH 2350 Statistics and Probability. In progress.</li></ul>'+
    '<h2>Certifications</h2>'+
    '<ul><li>Google AI (Coursera): AI Engineering and Prompting (Google Gemini, Google AI Studio). Completed June 2026. <a href="#/certifications">All credentials</a></li>'+
    '<li>Sony Pictures Animation &amp; Imageworks: This Is Animation, Yellowbrick Program. Completed June 2025.</li></ul>'+
    '<h2>IT experience</h2>'+
    job('Penn State Behrend, Erie, PA','September 2022 &ndash; May 2025','Student Technician',['Resolved 40+ ServiceNow tickets weekly for 800+ faculty and staff and 3,000+ students, documenting each one.','Provided onsite and remote support (Remote Desktop, TeamViewer) for Windows 8&ndash;11, macOS, Microsoft 365, and CAD.','Reimaged, deployed, or decommissioned 1,000+ computers using SCCM, and built, upgraded, and repaired hardware.','Managed Active Directory accounts and permissions, including password resets and MFA troubleshooting.','Set up printers, classroom projectors, and A/V equipment, and configured security software on campus machines.','Trained new student hires on software and daily help desk procedures, and wrote how-to guides for users.'])+
    job('Erie County Convention Center Authority (ECCA), Erie, PA','May 2024 &ndash; August 2024','IT / Social Media Intern',['Installed networked IP cameras across the entire ECCA campus, including the Bayfront Convention Center.','Audited Erie Events venue websites for UI/UX and designed logos and animations in Adobe Creative Cloud.'])+
    '<h2>Customer service experience</h2>'+
    job('Bayfront Convention Center, Erie, PA','July 2025 &ndash; Present','Banquet Server',['Deliver professional food and beverage service in banquet and catering settings with attention to timing.','Set up and break down event spaces, including linens, tableware, and place settings.'])+
    job('Waldameer Park &amp; Water Park, Erie, PA','Summers 2018 &ndash; 2022','Admission and Guest Service Representative',['Served a high volume of guests and large group orders, resolving questions and billing complaints via refunds.'])+
    '<h2>Projects</h2>'+
    job('AI Journaling App &middot; Google AI Studio, Claude Code','June 2026 &ndash; Present','',['Building a journaling app through AI-assisted development and prompt engineering.'])+
    job('Portfolio Website &middot; HTML, CSS, GitHub Pages, Claude Code','August 2022 &ndash; Present','',['Designing and maintaining my portfolio site, currently building it with Claude Code.'])+
    job('Matter Monsters &middot; Unreal Engine 5, Capstone','August 2024 &ndash; December 2024','',['Created environment designs, assets, story, and character concepts for a team-built game.'])+
    '<h2>Leadership</h2>'+
    job('Behrend Esports Club &middot; Valorant Player and Captain','August 2021 &ndash; May 2025','',['Helped establish the club, coached teammates, and competed in the ECAC for 8 semesters.'])+
    job('National Society of Leadership and Success &middot; Member','January 2025 &ndash; Present','',['Completed a leadership program on personal growth, career success, and community impact.'])+
    '<h2>Technical skills</h2>'+
    '<p class="skill"><b>Support &amp; systems:</b> ServiceNow, Active Directory, SCCM, RDP, TeamViewer, Windows 8&ndash;11, macOS, Microsoft 365</p>'+
    '<p class="skill"><b>Hardware:</b> PC build, upgrade, and repair; imaging; printers and peripherals; classroom A/V; IP cameras</p>'+
    '<p class="skill"><b>Networking &amp; servers:</b> LAN/WAN, OSI model, Ethernet, IP addressing, routers, cabling, Windows Server administration</p>'+
    '<p class="skill"><b>Design &amp; 3D:</b> Blender, Unreal Engine 5, OpenToonz, Clip Studio Paint, Adobe Creative Cloud</p>'+
    '<p class="skill"><b>Development &amp; AI:</b> Python, HTML/CSS, Git/GitHub, Claude Code, Google AI Studio, Google Gemini</p>'+
    '<p class="skill"><b>Additional:</b> Trello, tennis racket stringing, DJing, cable management connoisseur</p>'+
    /* names, roles and what each can speak to; their phone numbers and emails stay off the public page */
    '<h2>References</h2><div class="refs">'+
    ref('Nick Silka','Associate Director of Information Technology Services, Penn State Behrend','Former supervisor','Teamwork, technical skills, work ethic')+
    ref('Scott Smith','Systems Administrator, Information Technology Services, Penn State Behrend','Former coworker in Behrend IT Services','Teamwork, technical skills, work ethic, passions outside of work')+
    ref('Dr. Elisa Beshero-Bondar','Program Chair and Professor of Digital Humanities, Penn State Behrend','Former professor and program head','Passion, reliability, work ethic')+
    '</div><p class="refnote">Contact details for each reference are available on request: <a href="mailto:saojmj123456@gmail.com?subject=Reference%20request">email me</a>.</p>'+
    '</div></div>';}
  function ref(n,role,rel,speak){return '<div class="ref"><b>'+n+'</b><span class="role">'+role+'</span><span>'+rel+'</span><span class="sp">Can speak to: '+speak+'</span></div>';}
  function pageBlog(){
    var posts=[
      ['Week of May 13th','This starting week I got introduced to the staff across each job site, including Erie Bayfront Convention Center, Erie Insurance Arena, UPMC Ball Park, Warner Theater, and the Sheraton Hotel. I collaborated with the website manager, social media team, and production manager. We started a big project setting up around 50 cameras at the Sheraton. In downtime, I revived this website, combining school projects and cleaning up pages.'],
      ['Week of May 20th','Got to know the Sheraton team better. Hung about 20 cameras. I updated my website\u2019s color scheme to a clean, classic color palette and scheduled a meeting with Erica about younger audience engagement and anime expo/pokemon tournament ideas.'],
      ['Week of August 5th','My final reflection week \u2014 learned a ton about office workflow, project collaboration, cybersecurity, web limitations, and content creation with Adobe Suite. Developed real appreciation for how supportive and fast-paced professional environments can be. Great relationships made and valuable lessons learned for post-grad work life.']
    ];
    var o='<div class="pg"><h1>Intern blog.</h1><p class="sub">Notes from my summer 2024 internship with the Erie County Convention Center Authority.</p>';
    posts.forEach(function(x){o+='<article class="post"><h2>'+x[0]+'</h2><p>'+x[1]+'</p></article>';});
    o+='<p class="note">* Most of the original intern blog posts could not be recovered. These are the ones that survived.</p>';
    o+='<p class="sub" style="margin-top:22px">See the logo work from this internship in <a href="#/erie-events-branding">Erie Events Branding</a>.</p></div>';
    return o;}


/* culture log */
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var LOG=[
  {t:'game',title:'Valorant',where:'PC, Riot Games',st:'done',min:-1,pin:1,note:'Peak rank Ascendant 3. 1,104 hours and 1,910 competitive matches at a 50.2% win rate, mostly on Killjoy. Eight semesters in the Behrend esports club.'},
  {t:'game',title:'League of Legends',where:'PC, Riot Games',st:'done',min:-1,pin:1,note:'Peak rank Bronze III (2023 Season 2). Back in 2026 Season 3 with a ranked win as Viego.'}
].concat(STEAM.map(function(g){return {t:'game',title:g[0],where:'Steam',st:'done',min:g[1],last:g[2],ach:g[3]};}));
PSN.split(';').forEach(function(s){var a=s.split('|');LOG.push({t:'game',title:a[0],where:a[4]==='5'?'PlayStation 5':'PlayStation 4',st:'done',min:-1,last:a[3]?a[3].slice(0,4)+'-'+a[3].slice(4)+'-01':'',tr:[+a[1],+a[2]]});});
var RK={love:4,like:3,meh:2,dislike:1,none:0},RL={love:'Loved',like:'Liked',meh:'Meh',dislike:'Disliked',none:'Unrated'};
var FLX={'La La Land':1,'Soul':1};
['love','like','meh','dislike','none'].forEach(function(k){WATCH[k].split('|').forEach(function(s){
  var tv=s.charAt(0)==='~',t=tv?s.slice(1):s;
  LOG.push({t:tv?'tv':'movie',title:t,where:tv?'TV show':'Movie',st:'done',min:-1,rate:k,note:FLX[t]?'Source for an FLX Edit':''});});});
['Dan Da Dan','Game of Thrones','Hunter x Hunter','Fire Force','The Walking Dead','Gachiakuta'].forEach(function(t){LOG.push({t:'tv',title:t,where:'TV show',st:'now',min:-1,rate:'none',note:''});});
var SL={game:{now:'Playing',done:'Played',next:'Want to play'},movie:{now:'Watching',done:'Watched',next:'Want to watch'},tv:{now:'Watching',done:'Watched',next:'Want to watch'}};
var TL={all:'All',game:'Games',movie:'Movies',tv:'TV shows'};
var QLINK='https://www.link.queue.co/eURMTlhrNFFV';
function fmtTime(m){if(m<120)return m+' minutes';var h=Math.round(m/6)/10;return (h%1===0?h.toFixed(0):h.toFixed(1))+' hours';}
function fmtDate(iso){var d=iso.split('-');return MON[+d[1]-1]+' '+(+d[2])+', '+d[0];}
function metaOf(e){
  if(e.t!=='game')return '<div class="m">'+e.where+(e.note?', '+e.note:'')+'</div>';
  if(e.note)return '<div class="m">'+e.where+', '+e.note+'</div>';
  if(e.tr)return '<div class="m">'+e.where+', '+e.tr[0]+' of '+e.tr[1]+' trophies</div>'+(e.last?'<div class="m">Last trophy '+MON[+e.last.slice(5,7)-1]+' '+e.last.slice(0,4)+'</div>':'');
  var s=e.where+', '+fmtTime(e.min);if(e.ach&&e.ach.split('/')[1])s+=', '+e.ach.replace('/',' of ')+' achievements';
  return '<div class="m">'+s+'</div><div class="m">Last played '+fmtDate(e.last)+'</div>';}

/* music (Apple Music Replay) */
function fmtN(n){return Number(n).toLocaleString('en-US');}
function rows(str,kind){return str?str.split(';').map(function(x){return x.split('|');}):[];}
function nmHTML(kind,name,sub){
  var u=kind==='a'?'':(COVERS[(kind==='s'?'song:':'album:')+(name+'|'+sub).toLowerCase()]||'');
  var t=name+(sub?'<small>'+sub+'</small>':'');
  return u?'<span class="nm hasc"><span class="cth"><img src="'+u+'" alt="" loading="lazy" referrerpolicy="no-referrer"></span><span>'+t+'</span></span>':'<span class="nm">'+t+'</span>';
}
function boxList(title,items,kind,cap){
  if(!items.length)return '';
  var more=cap&&items.length>cap;
  return '<div class="mbox"><h3>'+title+'</h3><ol>'+items.map(function(r,i){
    var name=r[0],sub=kind==='a'?'':r[1],met=kind==='a'?fmtN(r[1])+' min':kind==='s'?fmtN(r[2])+' plays':fmtN(r[2])+' min';
    return '<li'+(cap&&i>=cap?' class="xtra" hidden':'')+'><span class="rk">'+(i+1)+'</span>'+nmHTML(kind,name,sub)+'<span class="mt">'+met+'</span></li>';}).join('')+'</ol>'+(more?'<button type="button" class="mshow" data-n="'+(items.length-cap)+'">Show '+(items.length-cap)+' more</button>':'')+'</div>';}
function allYears(){
  var A={},S={},L={},ys=Object.keys(MUSIC.years);
  ys.forEach(function(y){var d=MUSIC.years[y];
    rows(d.a).forEach(function(r){var o=A[r[0]]||(A[r[0]]={n:r[0],t:0,y:0});o.t+=+r[1];o.y++;});
    rows(d.s).forEach(function(r){var k=r[0]+'|'+r[1],o=S[k]||(S[k]={n:r[0],a:r[1],t:0,y:0});o.t+=+r[2];o.y++;});
    rows(d.l).forEach(function(r){var k=r[0]+'|'+r[1],o=L[k]||(L[k]={n:r[0],a:r[1],t:0,y:0});o.t+=+r[2];o.y++;});});
  var top=function(O,n){return Object.keys(O).map(function(k){return O[k];}).sort(function(a,b){return b.t-a.t;}).slice(0,n);};
  return {A:top(A,25).map(function(o){return [o.n,o.t,o.y];}),S:top(S,40).map(function(o){return [o.n,o.a,o.t,o.y];}),L:top(L,15).map(function(o){return [o.n,o.a,o.t,o.y];})};}
function initMusic(){
  var yrs=['All','2026','2025','2024','2023','2022','2021','2020','2019','2018'],cur='2026',bar=$('mYears'),body=$('mBody');
  function draw(){
    bar.innerHTML='';
    yrs.forEach(function(y){var b=document.createElement('button');b.type='button';b.textContent=y;b.setAttribute('aria-pressed',y===cur?'true':'false');b.addEventListener('click',function(){cur=y;draw();});bar.appendChild(b);});
    if(cur==='All'){
      var T=allYears(),span=function(y){return y>1?' ('+y+' years)':'';};
      var ab=function(t,items,kind){return '<div class="mbox"><h3>'+t+'</h3><ol>'+items.map(function(r,i){return '<li'+(i>=10?' class="xtra" hidden':'')+'><span class="rk">'+(i+1)+'</span><span class="nm">'+r[0]+'<small>'+(kind==='a'?'In the top lists for '+r[2]+' of 8 years':r[1]+', '+(r[3]>1?r[3]+' years':'1 year'))+'</small></span><span class="mt">'+fmtN(kind==='a'?r[1]:r[2])+(kind==='s'?' plays':' min')+'</span></li>';}).join('')+'</ol>'+(items.length>10?'<button type="button" class="mshow" data-n="'+(items.length-10)+'">Show '+(items.length-10)+' more</button>':'')+'</div>';};
      body.innerHTML='<p class="mhead">All of 2018 to 2025 added together. '+T.A[0][0]+' leads with '+fmtN(T.A[0][1])+' minutes. These totals add up each year\u2019s top lists, so listening outside those lists in a given year is not counted.</p><div class="mgrid"><div class="mcol">'+ab('Top artists, all years',T.A,'a')+ab('Top albums, all years',T.L,'l')+'</div><div class="mcol">'+ab('Top songs, all years',T.S,'s')+'</div></div>';
      return;}
    if(cur==='2026'){
      var mo=Object.keys(MUSIC.m26),tot=0;
      var li=mo.map(function(m){var d=MUSIC.m26[m];tot+=d[0];return '<li class="mm"><span class="rk">'+m+'</span><span class="nm">'+d[1]+' ('+fmtN(d[2])+' min), then '+d[3]+'<small>Top song: '+d[5]+' by '+d[6]+', '+d[7]+' plays</small></span><span class="mt">'+fmtN(d[0])+' min</span></li>';}).join('');
      body.innerHTML='<p class="mhead">2026 so far: '+fmtN(tot)+' minutes from January to September. Billie Eilish was my top artist every month.</p><div class="mbox"><h3>Month by month</h3><ol>'+li+'</ol></div>';
      return;}
    var d=MUSIC.years[cur],A=rows(d.a),S=rows(d.s),L=rows(d.l);
    window.setTimeout(function(){fixCovers(body);},0);
    body.innerHTML='<p class="mhead">'+cur+': '+A[0][0]+' was my top artist with '+fmtN(A[0][1])+' minutes. My most played song was "'+S[0][0]+'" by '+S[0][1]+', '+fmtN(S[0][2])+' plays.</p>'+
      '<div class="mgrid"><div class="mcol">'+boxList('Top artists',A,'a',12)+boxList('Top albums',L,'l',8)+'</div><div class="mcol">'+boxList('Top songs',S,'s',20)+'</div></div>';
  }
  body.addEventListener('click',function(e){var b=e.target.closest('.mshow');if(!b)return;var box=b.closest('.mbox');box.querySelectorAll('.xtra').forEach(function(li){li.hidden=false;});b.remove();});
  draw();
}
/* ---- cover art: Steam artwork by app id, anything else from COVERS (see tools/fetch-covers.mjs) ---- */
var STEAMAPP={'Destiny 2':1085660,'Apex Legends':1172470,'Rust':252490,'Marvel Rivals':2767030,'Counter-Strike 2':730,'ELDEN RING':1245620,"Tom Clancy's Rainbow Six Siege":359550,'Bloons TD 6':960090,'Deadlock':1422450,'Your Only Move Is HUSTLE':2212330,'Warframe':230410,'PUBG: BATTLEGROUNDS':578080,'Among Us':945360,'Terraria':105600,'Hades':1145360,'Portal 2':620,'Cyberpunk 2077':1091500,'Hogwarts Legacy':990080,'Lethal Company':1966720,'HELLDIVERS 2':553850,"Garry's Mod":4000,'Left 4 Dead 2':550,'Phasmophobia':739630,'Undertale':391540,'Cuphead':268910,'Aimlabs':714010,'Split Fiction':2001120,'THE FINALS':2073850};
var COVERS=window.COVERS||{};
function coverFor(e){
  var k=e.t+':'+e.title.toLowerCase();
  if(COVERS[k])return COVERS[k];
  if(e.t==='game'&&e.where==='Steam'&&STEAMAPP[e.title])return 'https://cdn.cloudflare.steamstatic.com/steam/apps/'+STEAMAPP[e.title]+'/header.jpg';
  return '';
}
function markHTML(e){var u=coverFor(e);return '<div class="mark '+e.t+'" aria-hidden="true">'+e.title.charAt(0)+(u?'<img src="'+u+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'</div>';}
function fixCovers(root){root.querySelectorAll('.mark img,.pt img,.cth img').forEach(function(i){i.addEventListener('error',function(){i.remove();});});}
function animateBars(root){requestAnimationFrame(function(){requestAnimationFrame(function(){root.querySelectorAll('.cfill').forEach(function(f){f.classList.add('in');});});});}
function bars(rows,fmt){
  var max=Math.max.apply(null,rows.map(function(r){return r.v;}))||1;
  return '<div class="chart">'+rows.map(function(r){
    var th=r.cover?'<span class="cth" aria-hidden="true">'+r.name.charAt(0)+(r.cover.length>1?'<img src="'+r.cover+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'</span>':'';
    return '<div class="crow"><span class="cl">'+th+'<span>'+r.name+'</span></span><span class="ctrack"><span class="cfill" style="width:'+Math.max(2,Math.round(r.v/max*100))+'%"></span></span><span class="cval">'+fmt(r.v)+'</span></div>';
  }).join('')+'</div>';
}
function fmtHrs(min){return fmtN(Math.round(min/60))+' hrs';}

/* ---- data for the charts ---- */
var HOURS=STEAM.map(function(g){return {name:g[0],v:g[1],cover:coverFor({t:'game',title:g[0],where:'Steam'})||'-'};}).concat([{name:'Valorant',v:66240,cover:'-'}]).sort(function(a,b){return b.v-a.v;});
/* newest watched and newest reviewed, from Queue (WATCHED and REVIEWS in data.js; refresh with tools/fetch-queue.mjs) */
function findW(t,title){for(var i=0;i<LOG.length;i++){if(LOG[i].t===t&&LOG[i].title===title)return LOG[i];}return {t:t,title:title,rate:'none',where:''};}
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDay(d){var p=d.split('-');return MON[+p[1]-1]+' '+(+p[2])+', '+p[0];}
function poster(t,title){var u=coverFor({t:t,title:title});return '<div class="pt" aria-hidden="true">'+title.charAt(0)+(u?'<img src="'+u+'" alt="" loading="lazy">':'')+'</div>';}
/* rows: [title, movie|tv, rating, date] */
function strip(rows,tagFirst,showKind){
  return '<div class="strip">'+rows.map(function(r,i){
    return '<div class="pc">'+(i===0&&tagFirst?'<span class="tag">'+tagFirst+'</span>':'')+poster(r[1],r[0])+'<div class="pname">'+r[0]+'</div>'+
      '<div class="pmeta">'+(r[2]&&r[2]!=='none'?'<span class="rk '+r[2]+'">'+RL[r[2]]+'</span>':'')+(showKind?'<span class="pk">'+(r[1]==='tv'?'Show':'Movie')+'</span>':'')+'</div></div>';
  }).join('')+'</div>';
}
function reviewCard(kind,more){
  var list=REVIEWS.filter(function(r){return r[1]===kind;}),r=list[0],lbl=kind==='tv'?'show':'movie';
  if(!r)return '';
  return '<div class="hcard rev"><h3>Newest '+lbl+' reviewed</h3><div class="rv">'+poster(kind,r[0])+'<div class="rvt"><div class="big">'+r[0]+'</div>'+
    '<p class="rvm"><span class="rk '+r[2]+'">'+RL[r[2]]+'</span>Reviewed '+fmtDay(r[3])+'</p><blockquote>'+r[4].replace(/</g,'&lt;')+'</blockquote></div></div>'+
    '<p class="rvh">More '+lbl+' reviews</p>'+strip(list.slice(1,9))+(more?'<a class="more" href="#/culture/'+(kind==='tv'?'tv':'movies')+'">See all '+lbl+'s &rarr;</a>':'')+'</div>';
}
function countBy(t){var c={love:0,like:0,meh:0,dislike:0,none:0};LOG.forEach(function(e){if(e.t===t&&e.rate)c[e.rate]++;});return c;}
function rateBars(t){var c=countBy(t);return bars(['love','like','meh','dislike','none'].map(function(k){return {name:RL[k],v:c[k]};}),function(v){return fmtN(v);});}
function topArtists(n){var T=allYears();return T.A.slice(0,n).map(function(r){return {name:r[0],v:r[1]};});}
function topSongs(n){var T=allYears();return T.S.slice(0,n).map(function(r){return {name:r[0]+' <small style="opacity:.6">'+r[1]+'</small>',v:r[2]};});}
function subnav(active){
  var L=[['culture-log','Highlights'],['culture/music','Music'],['culture/games','Games'],['culture/movies','Movies'],['culture/tv','TV shows']];
  return '<div class="subnav" role="navigation" aria-label="Culture log sections">'+L.map(function(l){return '<a href="#/'+l[0]+'"'+(l[0]===active?' aria-current="page"':'')+'>'+l[1]+'</a>';}).join('')+'</div>';
}
function profiles(){
  return '<h2>Profiles.</h2><div class="plats">'+
    '<div class="plat"><span class="k">PlayStation</span><b>iSeezynn</b><span class="d">Level 257, 1,840 trophies, and 5 platinums. 178 games played.</span><a href="https://profile.playstation.com/iSeezynn" target="_blank" rel="noopener">View profile &#8599;</a></div>'+
    '<div class="plat"><span class="k">Steam</span><b>Seezynn</b><span class="d">Level 12, 553 achievements, and 4 perfect games. '+STEAM.length+' games played so far.</span><a href="https://steamcommunity.com/profiles/76561198374056448/" target="_blank" rel="noopener">View profile &#8599;</a></div>'+
    '<div class="plat"><span class="k">Riot Games</span><b>Seezynn#6377</b><span class="d">Valorant peak rank Ascendant 3, with 1,104 hours played. League of Legends peak Bronze III.</span><div class="two"><a href="https://tracker.gg/valorant/profile/riot/Seezynn%236377/overview" target="_blank" rel="noopener">Valorant &#8599;</a><a href="https://tracker.gg/lol/profile/riot/Seezynn%236377" target="_blank" rel="noopener">League &#8599;</a></div></div>'+
    '<div class="plat"><span class="k">Apple Music</span><b>Replay, 2018 to 2026</b><span class="d">Top artists, songs and albums for every year.</span><a href="#/culture/music">Open music</a></div>'+
    '<div class="plat"><span class="k">Queue</span><b>Movies and TV</b><span class="d">Movies and shows I have watched, rated love, like, meh, or dislike.</span><a href="'+QLINK+'" target="_blank" rel="noopener">Open my Queue &#8599;</a></div>'+
    '</div>';
}

/* ---- Culture Log main page: highlights only ---- */
function pageCulture(){
  var g=HOURS[0],a=topArtists(5),s=topSongs(1)[0],nm=LOG.filter(function(e){return e.t==='movie';}).length,nt=LOG.filter(function(e){return e.t==='tv';}).length,cm=countBy('movie');
  return '<div class="pg wide"><h1>Culture log.</h1><p class="sub">The highlights from the games I play, the movies and shows I watch, and the music I listen to. Each section has the full list.</p>'+subnav('culture-log')+
    '<div class="hl">'+
    '<div class="hcard"><h3>Most played game</h3><div class="big">'+g.name+'<small>'+fmtHrs(g.v)+' played</small></div>'+bars(HOURS.slice(0,5).map(function(r){return {name:r.name,v:r.v,cover:r.cover};}),fmtHrs)+'<a class="more" href="#/culture/games">See all games &rarr;</a></div>'+
    '<div class="hcard"><h3>Top artist</h3><div class="big">'+a[0].name+'<small>'+fmtN(a[0].v)+' minutes, 2018 to 2025</small></div>'+bars(a,function(v){return fmtN(v)+' min';})+'<a class="more" href="#/culture/music">See all music &rarr;</a></div>'+
    reviewCard('movie',1)+reviewCard('tv',1)+
    '<div class="hcard wide"><h3>Recently watched</h3><div class="big">'+WATCHED[0][0]+'<small>Watched '+fmtDay(WATCHED[0][3])+' &middot; '+fmtN(nm)+' movies and '+fmtN(nt)+' shows so far</small></div>'+strip(WATCHED.slice(0,14),'Newest',1)+'<a class="more" href="'+QLINK+'" target="_blank" rel="noopener">See it all on Queue &#8599;</a></div>'+
    '<div class="hcard wide"><h3>Most played song</h3><div class="big">'+s.name+'<small>'+fmtN(s.v)+' plays across Replay</small></div>'+bars(topSongs(5),function(v){return fmtN(v)+' plays';})+'<a class="more" href="#/culture/music">See all music &rarr;</a></div>'+
    '</div>'+profiles()+'</div>';
}
function initCulture(){fixCovers(detail);animateBars(detail);}

/* ---- category pages ---- */
function listMarkup(){
  return '<h2>The list.</h2><div class="logbar" id="logTabs" hidden></div><div class="logbar" id="logSt"></div><div class="logbar" id="logSort"></div><div class="logbar" id="logRate"></div>'+
    '<div class="logbar"><input id="logQ" type="search" placeholder="Search titles" aria-label="Search titles"></div><div class="logs" id="logs" aria-live="polite"></div><div class="logbar more" id="logMore"></div>';
}
function pageCat(kind){
  var out='<div class="pg wide">',n;
  if(kind==='game'){
    var st=LOG.filter(function(e){return e.where==='Steam';}).length,ps=LOG.filter(function(e){return /^PlayStation/.test(e.where);}).length,all=LOG.filter(function(e){return e.t==='game';}).length;
    out+='<h1>Games.</h1><p class="sub">'+all+' games logged: '+st+' on Steam, '+ps+' on PlayStation, plus Valorant and League of Legends.</p>'+subnav('culture/games')+
      '<div class="hcard"><h3>Most played games</h3><div class="big">'+HOURS[0].name+'<small>'+fmtHrs(HOURS[0].v)+', the most hours of any game</small></div>'+bars(HOURS.slice(0,10).map(function(r){return {name:r.name,v:r.v,cover:r.cover};}),fmtHrs)+'</div>'+listMarkup();
  }else if(kind==='movie'||kind==='tv'){
    var lbl=kind==='movie'?'movie':'show',c=LOG.filter(function(e){return e.t===kind;}).length;
    out+='<h1>'+(kind==='movie'?'Movies.':'TV shows.')+'</h1><p class="sub">'+fmtN(c)+' '+lbl+'s watched, each rated love, like, meh, or dislike.</p>'+subnav(kind==='movie'?'culture/movies':'culture/tv')+
      '<div class="hl">'+reviewCard(kind,0)+'<div class="hcard"><h3>How I rated them</h3>'+rateBars(kind)+'</div>'+
        '<div class="hcard wide"><h3>Recently watched</h3>'+strip(WATCHED.filter(function(r){return r[1]===kind;}).slice(0,14),'Newest')+'</div></div>'+listMarkup();
  }else{
    out+='<h1>Music.</h1><p class="sub">From my Apple Music Replay, 2018 to 2026. Artists are ranked by minutes listened and songs by plays.</p>'+subnav('culture/music')+
      '<div class="hl"><div class="hcard"><h3>Most listened artists</h3><div class="big">'+topArtists(1)[0].name+'<small>'+fmtN(topArtists(1)[0].v)+' minutes, 2018 to 2025</small></div>'+bars(topArtists(10),function(v){return fmtN(v)+' min';})+'</div>'+
      '<div class="hcard"><h3>Most played songs</h3><div class="big">'+topSongs(1)[0].name+'<small>'+fmtN(topSongs(1)[0].v)+' plays, 2018 to 2025</small></div>'+bars(topSongs(10),function(v){return fmtN(v)+' plays';})+'</div></div>'+
      '<h2>Year by year.</h2><div class="logbar" id="mYears"></div><div id="mBody"></div>';
  }
  return out+'</div>';
}
function initCat(kind){
  fixCovers(detail);animateBars(detail);
  if(kind==='music')initMusic();else initLog(kind);
}
function initLog(preset){
  var STEP=24,S={t:preset,st:'all',r:'all',q:'',sort:preset==='game'?'min':'rate',n:STEP},tabs=$('logTabs'),sts=$('logSt'),srt=$('logSort'),rat=$('logRate'),list=$('logs'),more=$('logMore'),q=$('logQ');
  sts.hidden=preset!=='tv';rat.hidden=preset==='game';
  function bar(el,items,key,label,reset){
    el.innerHTML='';
    items.forEach(function(k){
      var b=document.createElement('button');b.type='button';b.textContent=label(k);b.setAttribute('aria-pressed',S[key]===k?'true':'false');
      b.addEventListener('click',function(){S[key]=k;if(reset)S.n=STEP;draw();});el.appendChild(b);});}
  function draw(){
    bar(sts,['all','now','done'],'st',function(k){return {all:'Any status',now:'In progress',done:'Finished'}[k];},1);
    bar(srt,preset==='game'?['min','last']:['rate','az'],'sort',function(k){return {min:'Most played',last:'Recently played',rate:'Best rated',az:'A to Z'}[k];},1);
    bar(rat,['all','love','like','meh','dislike','none'],'r',function(k){return k==='all'?'Any rating':RL[k];},1);
    var rows=LOG.filter(function(e){return e.t===preset&&(S.st==='all'||e.st===S.st)&&(S.r==='all'||e.rate===S.r)&&(!S.q||e.title.toLowerCase().indexOf(S.q)>-1);});
    rows.sort(function(a,b){
      if((b.pin||0)!==(a.pin||0))return (b.pin||0)-(a.pin||0);
      if(S.sort==='az')return a.title.localeCompare(b.title);
      if(S.sort==='last')return (b.last||'').localeCompare(a.last||'');
      if(S.sort==='rate')return ((RK[b.rate]||0)-(RK[a.rate]||0))||a.title.localeCompare(b.title);
      return b.min-a.min;});
    if(!rows.length){list.innerHTML='<div class="empty">Nothing here yet. My <a href="'+QLINK+'" target="_blank" rel="noopener">Queue</a> has the full list.</div>';more.innerHTML='';return;}
    list.innerHTML=rows.slice(0,S.n).map(function(e){return '<div class="entry">'+markHTML(e)+'<div><div class="t">'+e.title+'</div>'+metaOf(e)+'<span class="s '+(e.st==='done'&&e.t==='game'?'done':'')+'">'+SL[e.t][e.st]+'</span>'+(e.rate&&e.rate!=='none'?'<span class="s rk '+e.rate+'">'+RL[e.rate]+'</span>':'')+'</div></div>';}).join('');
    fixCovers(list);
    more.innerHTML='';
    if(rows.length>S.n){var b=document.createElement('button');b.type='button';b.textContent='Show '+Math.min(STEP,rows.length-S.n)+' more ('+(rows.length-S.n)+' left)';b.addEventListener('click',function(){S.n+=STEP;draw();});more.appendChild(b);}
  }
  q.addEventListener('input',function(){S.q=q.value.trim().toLowerCase();S.n=STEP;draw();});
  draw();
}
var PAGES={'certifications':[pageCerts,'Certifications'],'courses':[pageCourses,'Coursework',initCourses],'resume':[pageResume,'Resume'],'intern-blog':[pageBlog,'Intern blog'],'culture-log':[pageCulture,'Culture Log',initCulture],'culture/games':[function(){return pageCat('game');},'Games',function(){initCat('game');}],'culture/movies':[function(){return pageCat('movie');},'Movies',function(){initCat('movie');}],'culture/tv':[function(){return pageCat('tv');},'TV shows',function(){initCat('tv');}],'culture/music':[function(){return pageCat('music');},'Music',function(){initCat('music');}]};

/* ---------- routing ---------- */
var detail=$('detail'),homeY=0;
/* ---------- Journal-101: the app's intro, played by scrolling, then a tour of the four screens ---------- */
var JQ='One honest line a day is enough.';
var TOUR=[['week','Week','The week','Every entry lands under today, with a bar for each day you wrote and the next session counting down beside it.'],
  ['topics','Topics','Topics','Folders for the things that keep coming back: books to read, places to go, small wins.'],
  ['session','Session','Session prep','Everything tagged \u201cFor session\u201d gathers into one sheet before the appointment, ready to print.'],
  ['media','Media','Media','Links, photos and videos from every week, collected in one grid.']];
function journalIntro(){
  return '<section class="jin" id="jin" aria-label="The Journal-101 intro. Scroll to play it."><div class="jin-stage"><a class="back jin-back" href="#work">&larr; All projects</a>'+
    '<div class="jin-lay"><svg class="jin-mark" viewBox="16 8 76 86" aria-hidden="true"><path class="jin-rail" d="M30 18 V70 a12 12 0 0 0 12 12 H80"/><circle class="jin-now" cx="30" cy="34" r="8"/><circle class="jin-dest" cx="74" cy="82" r="10"/></svg>'+
    '<div class="jin-q"><p class="jin-quote"><span class="vh">\u201c'+JQ+'\u201d</span><span aria-hidden="true">\u201c<span class="jin-typed"></span>\u201d<i class="jin-caret"></i></span></p><p class="jin-attr">Me &middot; Saturday, November 14</p></div></div>'+
    '<p class="jin-hint" aria-hidden="true">Scroll to play the intro</p><div class="jin-bar" aria-hidden="true"><i></i></div></div></section>';
}
function journalTour(){
  return '<section class="jtour zoom" id="jtour" aria-label="A tour of the app, one screen at a time"><div class="jt-stage"><div class="jt-copy"><p class="jt-eyebrow">Explore the app <span class="jt-count">1 of '+TOUR.length+'</span></p><ol class="jt-steps">'+
    TOUR.map(function(t,i){return '<li data-i="'+i+'"><span class="n">0'+(i+1)+'</span><div><b>'+t[2]+'</b><p>'+t[3]+'</p></div></li>';}).join('')+'</ol></div><div class="jt-shots">'+
    TOUR.map(function(t,i){return '<picture class="jt-shot" data-i="'+i+'"><source media="(max-width:760px)" srcset="assets/media/j101_tour_'+t[0]+'_m.webp" width="693" height="1500"><img src="assets/media/j101_tour_'+t[0]+'_d.webp" width="1800" height="1125" alt="The '+t[1]+' screen of Journal-101, filled with sample entries" decoding="async"'+(i?' loading="lazy"':'')+'></picture>';}).join('')+'</div></div></section>';
}
function initJournal(){
  var sec=$('jin'),tour=$('jtour');if(!sec)return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rail=sec.querySelector('.jin-rail'),now=sec.querySelector('.jin-now'),dest=sec.querySelector('.jin-dest'),typed=sec.querySelector('.jin-typed'),
      attr=sec.querySelector('.jin-attr'),hint=sec.querySelector('.jin-hint'),bar=sec.querySelector('.jin-bar i'),
      lis=tour.querySelectorAll('.jt-steps li'),shots=tour.querySelectorAll('.jt-shot'),count=tour.querySelector('.jt-count'),raf=0,lastP=-1,lastI=-1;
  function seg(p,a,b){return Math.min(1,Math.max(0,(p-a)/(b-a)));}
  function out(t){return 1-Math.pow(1-t,3);}
  function pop(t){if(t<=0)return 0;var c=1.6;t-=1;return 1+t*t*((c+1)*t+c);}   /* a small overshoot, like the app's dots */
  function prog(el){var r=el.getBoundingClientRect(),span=r.height-innerHeight;return span>0?Math.min(1,Math.max(0,-r.top/span)):1;}
  function frame(){
    raf=0;
    if(!sec.isConnected){removeEventListener('scroll',ask);removeEventListener('resize',ask);return;}
    /* the intro is tied to the scroll position: it plays while you scroll and holds still when you stop */
    var p=reduce?1:prog(sec);
    if(p!==lastP){
      lastP=p;
      rail.style.strokeDashoffset=(130*(1-out(seg(p,.06,.32)))).toFixed(1);
      now.style.transform='scale('+pop(seg(p,0,.08)).toFixed(3)+')';
      dest.style.transform='scale('+pop(seg(p,.30,.40)).toFixed(3)+')';
      typed.textContent=JQ.slice(0,Math.round(JQ.length*seg(p,.40,.78)));
      var a=seg(p,.80,.88);attr.style.opacity=a;attr.style.transform='translateY('+(8*(1-a)).toFixed(1)+'px)';
      hint.style.opacity=1-seg(p,0,.05);
      bar.style.transform='scaleX('+p.toFixed(4)+')';
      sec.classList.toggle('done',p>=.78);
    }
    var i=reduce?-1:Math.min(TOUR.length-1,Math.floor(prog(tour)*TOUR.length));
    if(reduce)i=lastI<0?0:lastI;
    if(i!==lastI){lastI=i;
      Array.prototype.forEach.call(lis,function(l,k){l.classList.toggle('on',k===i);l.setAttribute('aria-current',k===i?'step':'false');});
      Array.prototype.forEach.call(shots,function(s,k){s.classList.toggle('on',k===i);});
      count.textContent=(i+1)+' of '+TOUR.length;
    }
  }
  function ask(){if(!raf)raf=requestAnimationFrame(frame);}
  /* a step can be picked directly: scroll to the middle of its stretch */
  Array.prototype.forEach.call(lis,function(l,k){l.addEventListener('click',function(){
    var r=tour.getBoundingClientRect(),span=r.height-innerHeight,top=window.scrollY+r.top+span*(k+.5)/TOUR.length;
    if(reduce){Array.prototype.forEach.call(lis,function(x,j){x.classList.toggle('on',j===k);});Array.prototype.forEach.call(shots,function(x,j){x.classList.toggle('on',j===k);});count.textContent=(k+1)+' of '+TOUR.length;return;}
    window.scrollTo({top:top,behavior:'smooth'});});});
  addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);frame();
}
function projectHTML(p){
  var gal='',acts='',pv=P[(p.i+P.length-1)%P.length],nx=P[(p.i+1)%P.length];
  if(p.gallery.length){
    p.gallery.forEach(function(k){var m=MEDIA[k];
      gal+=m.t==='video'?'<video src="'+m.src+'" poster="'+m.poster+'" width="'+m.w+'" height="'+m.h+'" muted loop playsinline preload="metadata" aria-label="'+m.alt+'"></video>':'<img src="'+m.src+'" alt="'+m.alt+'" width="'+m.w+'" height="'+m.h+'" tabindex="0" decoding="async" loading="lazy">';
      if(m.cap)gal=gal.replace(/(<(?:img|video)[^>]*>(?:<\/video>)?)$/,'<figure class="'+(m.h>m.w?'tall':'wide')+(m.feat?' feature':'')+'">$1<figcaption>'+m.cap+'</figcaption></figure>');});
  }else gal='<div class="frame">Add image</div><div class="frame">Add image</div><div class="frame">Add image</div>';
  (p.links||[]).forEach(function(x){acts+='<a href="'+x.h+'"'+(x.internal?'':' target="_blank" rel="noopener"')+'>'+x.l+(x.internal?'':' &#8599;')+'</a>';});
  var story=p.id==='journal-101';
  return (story?journalIntro()+'<div class="dhead">':'<a class="back" href="#work">&larr; All projects</a>')+'<div class="dbig">'+svg(p)+'</div>'+
    '<div class="dc"><p class="date">'+p.date+'</p><p class="kind">'+p.kind+'</p><h1>'+p.title.replace(/-/g,'\u2011')+'</h1><p class="lede">'+p.blurb+'</p><div class="tools">'+p.tools+'</div>'+
    (p.credit?'<div class="meta">'+p.credit+'</div>':'')+(acts?'<div class="acts">'+acts+'</div>':'')+'</div>'+(story?'</div>'+journalTour()+'<h2 class="gh">More from the design</h2>':'')+
    '<div class="gal'+(p.gallery.length===1?' one':'')+(p.gallery.some(function(k){return MEDIA[k].cap;})?' capt':'')+'">'+gal+'</div>'+
    '<div class="pn"><a href="#/'+pv.id+'">&larr; '+pv.title+'</a><a href="#/'+nx.id+'">'+nx.title+' &rarr;</a></div>';
}
function route(){
  var m=/^#\/(.+)$/.exec(location.hash),key=m&&m[1],p=key&&BYID[key],pg=key&&PAGES[key];
  if(vio)vio.disconnect();
  if(!p&&!pg){
    var was=document.body.classList.contains('viewing');
    document.body.classList.remove('viewing');document.title=BASE;detail.innerHTML='';
    if(was){
      var id=location.hash.slice(1),el=id&&document.getElementById(id);
      if(el)el.scrollIntoView();else window.scrollTo({top:id?0:homeY,behavior:'instant'});
    }
    return;
  }
  if(p){detail.innerHTML=projectHTML(p);document.title=p.title+' | '+BASE;if(p.id==='journal-101')requestAnimationFrame(initJournal);}
  else{detail.innerHTML='<a class="back" href="#top">&larr; Home</a>'+pg[0]();document.title=pg[1]+' | '+BASE;if(pg[2])pg[2]();}
  if(!document.body.classList.contains('viewing'))homeY=window.scrollY;
  document.body.classList.add('viewing');window.scrollTo({top:0,behavior:'instant'});
  var h1=detail.querySelector('h1');if(h1){h1.tabIndex=-1;h1.focus({preventScroll:true});}
  if(vio)Array.prototype.forEach.call(detail.querySelectorAll('video'),function(v){vio.observe(v);});
}
var RM=matchMedia('(prefers-reduced-motion: reduce)');
function routeWithFade(){
  /* only a real page change gets the fade: going between pages, or between a page and home */
  var m=/^#\/(.+)$/.exec(location.hash),goingTo=!!(m&&(BYID[m[1]]||PAGES[m[1]])),viewing=document.body.classList.contains('viewing');
  if(document.startViewTransition&&!RM.matches&&(goingTo||viewing))document.startViewTransition(route);else route();
}
window.addEventListener('hashchange',routeWithFade);

select(0);route();
setTimeout(function(){setOpen(true);},500);
