/* Page editor for the special site. Loaded only after the editor password has unlocked the content key.
   Everything is edited in this browser, saved as an encrypted draft on this device, and published by committing
   the encrypted vault and media straight to the GitHub repo with your own token (kept only on this device). */
(function(){
'use strict';
var D=document,API,S,E;
var REPO={owner:'JordanJ7',name:'JJ-Portfolio-',branch:'main',dir:'docs/special/'};
var MAX_VIDEO=95e6,WARN_VIDEO=40e6;   /* GitHub refuses files over 100 MB */
function $(s,r){return (r||D).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s));}
function el(tag,cls,html){var e=D.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function clone(o){return JSON.parse(JSON.stringify(o));}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function rid(){var a=crypto.getRandomValues(new Uint8Array(6));return Array.prototype.map.call(a,function(x){return ('0'+x.toString(16)).slice(-2);}).join('');}
function mb(n){return (n/1e6).toFixed(n<1e7?1:0)+' MB';}
function move(arr,i,d){var j=i+d;if(j<0||j>=arr.length)return;var t=arr[i];arr[i]=arr[j];arr[j]=t;}
var ICON={up:'↑',down:'↓',left:'←',right:'→',x:'✕'};

/* ------------------------------------------------------------------ crypto */
async function seal(key,u8){var iv=crypto.getRandomValues(new Uint8Array(12));var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,u8));return API.cat([iv,ct]);}
async function sealCK(u8){return seal(S.key,u8);}
async function pwKey(pw,saltB64){return API.aesKey(await API.kdf(pw,saltB64,E.vault.iter),['encrypt','decrypt']);}
function salt(){return API.toB64(crypto.getRandomValues(new Uint8Array(16)));}
async function wrapAnswers(q,answers,secret){
  var seen={},w=[];
  for(var i=0;i<answers.length;i++){
    var n=API.normQ(q,answers[i]);if(!n||seen[n])continue;seen[n]=1;
    var s=salt();w.push({s:s,d:API.toB64(await seal(await pwKey(n,s),secret))});
  }
  return w;
}
async function rewrapContentKey(){   /* the visitors' key is made from all question secrets, in order */
  var secrets=E.c._secrets.map(API.b64);
  var kek=await API.aesKey(new Uint8Array(await crypto.subtle.digest('SHA-256',API.cat(secrets))),['encrypt']);
  E.vault.kw=API.toB64(await seal(kek,S.ckRaw));
}

/* ------------------------------------------------------------------ media: resize, thumbnail, encrypt */
var WEBP=(function(){try{return D.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp')===0;}catch(e){return false;}})();
function canvasOf(src,w,h){var c=D.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,w,h);return c;}
function fit(w,h,max){var s=Math.min(1,max/Math.max(w,h));return [Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s))];}
function blobOf(c,type,q){return new Promise(function(ok){c.toBlob(function(b){ok(b);},type,q);});}
async function bytes(blob){return new Uint8Array(await blob.arrayBuffer());}
async function encode(c,q){var t=WEBP?'image/webp':'image/jpeg',b=await blobOf(c,t,q||.86);return {u8:await bytes(b),mime:t};}
async function store(u8,mime,name){var id=rid();S.pending[id]={enc:await sealCK(u8),mime:mime,size:u8.length,name:name||''};return {id:id,mime:mime};}
async function bitmap(file){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){return await createImageBitmap(file);}}
async function addPhoto(file){
  if(file.type==='image/gif'){   /* keep animation: store as is */
    var u=await bytes(file),bm0=await bitmap(file),t0=fit(bm0.width,bm0.height,640),th0=await encode(canvasOf(bm0,t0[0],t0[1]),.8);
    var f0=await store(u,'image/gif',file.name);f0.kind='photo';f0.w=bm0.width;f0.h=bm0.height;f0.thumb=await store(th0.u8,th0.mime);return f0;
  }
  var bm=await bitmap(file),s=fit(bm.width,bm.height,2400),full=await encode(canvasOf(bm,s[0],s[1]),.86);
  var t=fit(bm.width,bm.height,640),th=await encode(canvasOf(bm,t[0],t[1]),.8);
  var it=await store(full.u8,full.mime,file.name);it.kind='photo';it.w=s[0];it.h=s[1];it.thumb=await store(th.u8,th.mime);
  return it;
}
function videoMeta(file){
  return new Promise(function(ok,no){
    var v=D.createElement('video'),url=URL.createObjectURL(file);v.muted=true;v.playsInline=true;v.preload='auto';
    v.onloadedmetadata=function(){var at=Math.min(.5,(v.duration||1)/3);v.currentTime=at;};
    v.onseeked=function(){var w=v.videoWidth,h=v.videoHeight,p=fit(w,h,960),c=canvasOf(v,p[0],p[1]);ok({w:w,h:h,dur:v.duration,frame:c});setTimeout(function(){URL.revokeObjectURL(url);},1000);};
    v.onerror=function(){URL.revokeObjectURL(url);no(new Error('This video format cannot be played in the browser. Try MP4 (H.264).'));};
    v.src=url;
  });
}
async function addVideo(file){
  if(file.size>MAX_VIDEO)throw new Error(file.name+' is '+mb(file.size)+'. GitHub only takes files under 100 MB, so compress it first.');
  var meta=await videoMeta(file),u=await bytes(file);
  var mime=file.type||(/\.mov$/i.test(file.name)?'video/quicktime':'video/mp4');
  var poster=await encode(meta.frame,.84),t=fit(meta.frame.width,meta.frame.height,640),th=await encode(canvasOf(meta.frame,t[0],t[1]),.8);
  var it=await store(u,mime,file.name);it.kind='video';it.w=meta.w;it.h=meta.h;it.dur=Math.round(meta.dur*10)/10;
  it.poster=await store(poster.u8,poster.mime);it.thumb=await store(th.u8,th.mime);
  if(file.size>WARN_VIDEO)toast(file.name+' is '+mb(file.size)+'. It will work, but it loads slowly on phones.');
  return it;
}
/* adds picked files one by one with a progress note; returns the new items */
async function addFiles(files,only){
  var out=[],list=Array.prototype.slice.call(files);
  for(var i=0;i<list.length;i++){
    var f=list[i],isV=/^video\//.test(f.type)||/\.(mp4|m4v|mov|webm)$/i.test(f.name);
    if(only==='video'&&!isV){toast(f.name+' is not a video.');continue;}
    if(only==='photo'&&isV){toast(f.name+' is not a photo.');continue;}
    busy('Adding '+(i+1)+' of '+list.length+': '+f.name);
    try{out.push(isV?await addVideo(f):await addPhoto(f));}catch(e){toast(e.message||String(e),true);}
  }
  busy(null);changed();return out;
}
function pick(accept,multi){
  return new Promise(function(ok){var i=D.createElement('input');i.type='file';i.accept=accept;i.multiple=!!multi;i.onchange=function(){ok(i.files);};i.click();});
}

/* ------------------------------------------------------------------ book pages: find the page, straighten it, clean it up like a scanner */
function gray(d,n){var g=new Float32Array(n);for(var i=0,j=0;i<n;i++,j+=4)g[i]=.299*d[j]+.587*d[j+1]+.114*d[j+2];return g;}
function otsu(g){var h=new Array(256).fill(0),n=g.length;for(var i=0;i<n;i++)h[g[i]|0]++;var sum=0;for(var t=0;t<256;t++)sum+=t*h[t];var sB=0,wB=0,best=0,th=128;for(t=0;t<256;t++){wB+=h[t];if(!wB)continue;var wF=n-wB;if(!wF)break;sB+=t*h[t];var mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;th=t;}}return th;}
function findPage(c){
  var s=Math.min(1,480/Math.max(c.width,c.height)),w=Math.round(c.width*s),h=Math.round(c.height*s),sm=canvasOf(c,w,h);
  var g=gray(sm.getContext('2d').getImageData(0,0,w,h).data,w*h),t=otsu(g),lab=new Int32Array(w*h),best=0,bestN=0,cur=0,stack=[];
  for(var i=0;i<w*h;i++){
    if(g[i]<=t||lab[i])continue;cur++;var n=0;stack.push(i);lab[i]=cur;
    while(stack.length){var p=stack.pop();n++;var x=p%w,y=(p/w)|0;
      if(x>0&&!lab[p-1]&&g[p-1]>t){lab[p-1]=cur;stack.push(p-1);}if(x<w-1&&!lab[p+1]&&g[p+1]>t){lab[p+1]=cur;stack.push(p+1);}
      if(y>0&&!lab[p-w]&&g[p-w]>t){lab[p-w]=cur;stack.push(p-w);}if(y<h-1&&!lab[p+w]&&g[p+w]>t){lab[p+w]=cur;stack.push(p+w);}}
    if(n>bestN){bestN=n;best=cur;}
  }
  var frac=bestN/(w*h);if(frac<.2||frac>.96)return null;   /* no clear page, or it already fills the picture */
  var tl=[0,0,1e9],tr=[0,0,-1e9],br=[0,0,-1e9],bl=[0,0,-1e9];
  for(i=0;i<w*h;i++){if(lab[i]!==best)continue;var X=i%w,Y=(i/w)|0;
    if(X+Y<tl[2])tl=[X,Y,X+Y];if(X-Y>tr[2])tr=[X,Y,X-Y];if(X+Y>br[2])br=[X,Y,X+Y];if(Y-X>bl[2])bl=[X,Y,Y-X];}
  return [tl,tr,br,bl].map(function(p){return [p[0]/s,p[1]/s];});
}
function solve(A,b){var n=b.length;for(var i=0;i<n;i++){var m=i;for(var r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;var t=A[i];A[i]=A[m];A[m]=t;var tb=b[i];b[i]=b[m];b[m]=tb;for(r=i+1;r<n;r++){var f=A[r][i]/A[i][i];for(var c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}var x=new Array(n);for(i=n-1;i>=0;i--){var s=b[i];for(c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i];}return x;}
function homography(from,to){var A=[],b=[];for(var i=0;i<4;i++){var x=from[i][0],y=from[i][1],u=to[i][0],v=to[i][1];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}var h=solve(A,b);h.push(1);return h;}
function warp(c,q){
  var ow=Math.round((Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1])+Math.hypot(q[2][0]-q[3][0],q[2][1]-q[3][1]))/2);
  var oh=Math.round((Math.hypot(q[3][0]-q[0][0],q[3][1]-q[0][1])+Math.hypot(q[2][0]-q[1][0],q[2][1]-q[1][1]))/2);
  var sz=fit(ow,oh,2400);ow=sz[0];oh=sz[1];
  var H=homography([[0,0],[ow,0],[ow,oh],[0,oh]],q),sw=c.width,sh=c.height,src=c.getContext('2d').getImageData(0,0,sw,sh).data;
  var out=D.createElement('canvas');out.width=ow;out.height=oh;var oc=out.getContext('2d'),img=oc.createImageData(ow,oh),o=img.data;
  for(var y=0;y<oh;y++)for(var x=0;x<ow;x++){
    var z=H[6]*x+H[7]*y+1,u=(H[0]*x+H[1]*y+H[2])/z,v=(H[3]*x+H[4]*y+H[5])/z,x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0,k=(y*ow+x)*4;
    if(x0<0||y0<0||x0>=sw-1||y0>=sh-1){o[k]=o[k+1]=o[k+2]=255;o[k+3]=255;continue;}
    var a=(y0*sw+x0)*4,b2=a+4,c2=a+sw*4,d2=c2+4;
    for(var ch=0;ch<3;ch++)o[k+ch]=(src[a+ch]*(1-fx)+src[b2+ch]*fx)*(1-fy)+(src[c2+ch]*(1-fx)+src[d2+ch]*fx)*fy;
    o[k+3]=255;
  }
  oc.putImageData(img,0,0);return out;
}
function cleanUp(c){   /* even out the lighting so the paper is white and the ink is crisp */
  var w=c.width,h=c.height,x=c.getContext('2d'),im=x.getImageData(0,0,w,h),d=im.data;
  var bw=Math.max(8,Math.round(w/28)),bh=Math.max(8,Math.round(h/28)),bgc=canvasOf(canvasOf(c,bw,bh),Math.max(4,bw>>1),Math.max(4,bh>>1));
  /* the brightest local paper colour: dilate the small image so ink does not darken the estimate */
  var bx=bgc.getContext('2d'),bd=bx.getImageData(0,0,bgc.width,bgc.height),bdd=bd.data,BW=bgc.width,BH=bgc.height,cp=new Uint8ClampedArray(bdd);
  for(var yy=0;yy<BH;yy++)for(var xx=0;xx<BW;xx++){var m=[0,0,0];for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var X=Math.min(BW-1,Math.max(0,xx+dx)),Y=Math.min(BH-1,Math.max(0,yy+dy)),q=(Y*BW+X)*4;for(var ch=0;ch<3;ch++)if(cp[q+ch]>m[ch])m[ch]=cp[q+ch];}var p=(yy*BW+xx)*4;bdd[p]=m[0];bdd[p+1]=m[1];bdd[p+2]=m[2];}
  bx.putImageData(bd,0,0);
  var bg=canvasOf(bgc,w,h).getContext('2d').getImageData(0,0,w,h).data;
  var hist=new Array(256).fill(0);
  for(var i=0;i<d.length;i+=4){for(ch=0;ch<3;ch++){var v=d[i+ch]/Math.max(30,bg[i+ch])*245;d[i+ch]=v>255?255:v;}hist[(.299*d[i]+.587*d[i+1]+.114*d[i+2])|0]++;}
  var n=w*h,acc=0,lo=0;for(var t=0;t<256;t++){acc+=hist[t];if(acc>n*.02){lo=t;break;}}lo=Math.min(lo,120);
  for(i=0;i<d.length;i+=4)for(ch=0;ch<3;ch++){var u2=(d[i+ch]-lo)/(250-lo);u2=u2<0?0:u2>1?1:u2;d[i+ch]=255*Math.pow(u2,1.15);}
  x.putImageData(im,0,0);
  return c;
}
async function scanPage(file){
  var bm=await bitmap(file),s=fit(bm.width,bm.height,3000),c=canvasOf(bm,s[0],s[1]),q=null;
  try{q=findPage(c);}catch(e){q=null;}
  var flat=q?warp(c,q):c;
  var clean=cleanUp(canvasOf(flat,flat.width,flat.height));
  var o=fit(c.width,c.height,2200),orig=await encode(canvasOf(c,o[0],o[1]),.85);
  var sc=await encode(clean,.85),t=fit(clean.width,clean.height,420),th=await encode(canvasOf(clean,t[0],t[1]),.8);
  var it=await store(sc.u8,sc.mime,file.name);it.w=clean.width;it.h=clean.height;it.thumb=await store(th.u8,th.mime);
  E.scans[it.id]={orig:orig,scan:sc,using:'scan',found:!!q};
  return it;
}

/* ------------------------------------------------------------------ draft: kept on this device (encrypted) until published */
var DB=null;
function db(){if(DB)return DB;DB=new Promise(function(ok,no){var r=indexedDB.open('jj-fy-editor',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv');};r.onsuccess=function(){ok(r.result);};r.onerror=function(){no(r.error);};});return DB;}
function idb(mode,fn){return db().then(function(d){return new Promise(function(ok,no){var t=d.transaction('kv',mode),st=t.objectStore('kv'),r=fn(st);t.oncomplete=function(){ok(r&&r.result);};t.onerror=function(){no(t.error);};});});}
var saveT=0;
function changed(){E.dirty=true;status();clearTimeout(saveT);saveT=setTimeout(saveDraft,1200);}
async function saveDraft(){
  try{
    var body=await sealCK(API.enc.encode(JSON.stringify({c:E.c,vault:E.vault})));
    var pend={};Object.keys(S.pending).forEach(function(k){pend[k]=S.pending[k];});
    await idb('readwrite',function(st){return st.put({base:S.vault.data.slice(0,64),at:Date.now(),body:body,pending:pend},'draft');});
    E.savedAt=Date.now();status();
  }catch(e){console.warn('draft',e);}
}
async function loadDraft(){
  try{var d=await idb('readonly',function(st){return st.get('draft');});if(!d)return null;
    var o=JSON.parse(API.dec.decode(await API.aes(S.key,d.body)));o.pending=d.pending;o.at=d.at;o.sameBase=d.base===S.vault.data.slice(0,64);return o;}catch(e){return null;}
}
function clearDraft(){return idb('readwrite',function(st){return st.delete('draft');}).catch(function(){});}

/* ------------------------------------------------------------------ UI shell */
var TABS=[['slides','Slides'],['quotes','Intro quotes'],['barrage','Photo barrage'],['folders','Folders'],['books','Books'],['access','Questions & passwords'],['publish','Publish']];
var STARTS=[['intro','Intro quote'],['slides','Slides'],['more','“There’s More”'],['montage','Photo barrage'],['folders','Folders'],['world','Earth, map & books']];
function busy(msg){var b=$('#edBusy');if(!b)return;b.textContent=msg||'';b.classList.toggle('on',!!msg);}
function toast(msg,bad){var t=el('div','edToast'+(bad?' bad':''),esc(msg));$('#edToasts').appendChild(t);setTimeout(function(){t.classList.add('out');setTimeout(function(){t.remove();},400);},bad?7000:4200);}
function status(){
  var s=$('#edStatus');if(!s)return;var n=newMedia().length;
  s.textContent=E.dirty?('Unpublished changes'+(n?' · '+n+' new file'+(n>1?'s':''):'')+(E.savedAt?' · draft saved':'')):'Everything is published';
  s.classList.toggle('dirty',!!E.dirty);
}
function open(api){
  API=api;S=api.S;
  E={c:clone(S.content),vault:clone(S.vault),tab:'slides',dirty:false,savedAt:0,scans:{},base:refs(S.content)};
  if(!E.c._secrets){toast('This content has no question secrets; answers cannot be changed here.',true);E.c._secrets=[];}
  D.body.classList.add('editing');
  var root=el('div',null);root.id='ed';
  root.innerHTML='<header class="edTop"><div class="edBrand">Special site editor</div><div id="edStatus"></div><div class="edActs">'+
    '<label class="edStart">Preview from <select id="edStartSel">'+STARTS.map(function(s){return '<option value="'+s[0]+'">'+esc(s[1])+'</option>';}).join('')+'</select></label>'+
    '<button type="button" class="edBtn" id="edPrev">Preview</button><button type="button" class="edBtn pri" id="edPub">Publish…</button><button type="button" class="edBtn ghost" id="edClose">Close</button></div></header>'+
    '<nav class="edTabs" id="edTabs"></nav><main class="edMain" id="edMain"></main><div id="edBusy" aria-live="polite"></div><div id="edToasts" aria-live="polite"></div>';
  D.body.appendChild(root);
  TABS.forEach(function(t){var b=el('button','edTab',esc(t[1]));b.type='button';b.dataset.tab=t[0];b.onclick=function(){E.tab=t[0];render();};$('#edTabs').appendChild(b);});
  $('#edPrev').onclick=function(){preview($('#edStartSel').value);};
  $('#edPub').onclick=function(){E.tab='publish';render();};
  $('#edClose').onclick=async function(){
    if(E.dirty&&!confirm('Close the editor? Your unpublished changes stay saved on this device and come back next time you open the editor.'))return;
    clearTimeout(saveT);if(E.dirty)await saveDraft();location.reload();
  };
  render();status();
  loadDraft().then(function(d){
    if(!d)return;
    var when=new Date(d.at).toLocaleString();
    var msg=d.sameBase?'You have unpublished changes from '+when+'. Bring them back?':'There is an older draft from '+when+', made before the last publish. Bring it back anyway? (It would replace what is published.)';
    if(confirm(msg)){E.c=d.c;E.vault=d.vault;Object.keys(d.pending||{}).forEach(function(k){S.pending[k]=d.pending[k];});E.dirty=true;render();status();toast('Draft restored.');}
  });
}
function render(){
  $$('.edTab').forEach(function(b){b.classList.toggle('act',b.dataset.tab===E.tab);b.setAttribute('aria-current',b.dataset.tab===E.tab?'page':'false');});
  var m=$('#edMain'),y=m.scrollTop;m.innerHTML='';
  ({slides:tabSlides,quotes:tabQuotes,barrage:tabBarrage,folders:tabFolders,books:tabBooks,access:tabAccess,publish:tabPublish})[E.tab](m);
  m.scrollTop=y;
}

/* small builders */
function field(label,value,oninput,opts){
  opts=opts||{};var w=el('label','edField'+(opts.wide?' wide':'')),i;
  w.appendChild(el('span','edLab',esc(label)));
  if(opts.area){i=el('textarea');i.rows=opts.rows||3;}else{i=el('input');i.type=opts.type||'text';if(opts.min!=null)i.min=opts.min;if(opts.max!=null)i.max=opts.max;if(opts.step!=null)i.step=opts.step;}
  if(opts.placeholder)i.placeholder=opts.placeholder;
  i.value=value==null?'':value;i.addEventListener('input',function(){oninput(opts.type==='number'?+i.value:i.value);changed();});
  w.appendChild(i);if(opts.note)w.appendChild(el('span','edNote',esc(opts.note)));return w;
}
function btn(text,fn,cls){var b=el('button','edBtn'+(cls?' '+cls:''),esc(text));b.type='button';b.onclick=fn;return b;}
function card(title,tools){var c=el('section','edCard'),h=el('div','edCardHead');h.appendChild(el('h3',null,esc(title)));var t=el('div','edTools');(tools||[]).forEach(function(x){t.appendChild(x);});h.appendChild(t);c.appendChild(h);return c;}
function thumbInto(img,ref){if(!ref)return;API.media(ref.id,ref.mime).then(function(m){img.src=m.url;}).catch(function(){img.alt='missing';});}
function intro(m,text){m.appendChild(el('p','edIntro',text));}

/* an editable list of items (photos, videos, text) used by slides and folders */
function itemsEditor(items,opts){
  var wrap=el('div','edItems');
  items.forEach(function(it,i){
    var t=el('div','edItem '+it.kind);
    if(it.kind==='text'){
      if(opts.folder)t.appendChild(field('Heading',it.title,function(v){it.title=v;},{placeholder:'optional'}));
      t.appendChild(field('Text',it.text,function(v){it.text=v;},{area:true,rows:opts.folder?8:4,wide:true}));
    }else if(it.kind==='link'){
      t.appendChild(field('Link',it.url,function(v){it.url=v.trim();},{placeholder:'https://…',wide:true}));
      t.appendChild(field('Name',it.title,function(v){it.title=v;},{placeholder:'shown on the card'}));
      t.appendChild(field('Note',it.caption,function(v){it.caption=v;},{placeholder:'optional'}));
    }else{
      var fig=el('div','edThumb'),img=el('img');img.alt='';fig.appendChild(img);thumbInto(img,it.thumb||it.poster||it);
      fig.appendChild(el('span','edKind',it.kind==='video'?'▶ video'+(it.dur?' · '+it.dur+'s':''):'photo'));t.appendChild(fig);
      t.appendChild(field('Caption',it.caption,function(v){it.caption=v;},{placeholder:'optional'}));
      if(opts.folder&&it.kind==='video')t.appendChild(field('Message',it.message,function(v){it.message=v;},{area:true,rows:3,placeholder:'optional, shown under the video'}));
    }
    if(opts.folder||opts.date)t.appendChild(field('Date',it.date,function(v){it.date=v;},{placeholder:'only shown if you type one'}));
    var tools=el('div','edItemTools');
    tools.appendChild(btn(ICON.left,function(){move(items,i,-1);changed();render();},'sq'));
    tools.appendChild(btn(ICON.right,function(){move(items,i,1);changed();render();},'sq'));
    tools.appendChild(btn(ICON.x,function(){if(confirm('Remove this '+(it.kind==='text'?'text':it.kind)+'?')){items.splice(i,1);changed();render();}},'sq bad'));
    t.appendChild(tools);wrap.appendChild(t);
  });
  var add=el('div','edAdd');
  add.appendChild(btn('+ Photos / videos',async function(){var f=await pick('image/*,video/*',true);if(!f||!f.length)return;var got=await addFiles(f);got.forEach(function(x){items.push(x);});render();}));
  add.appendChild(btn('+ Text',function(){items.push({kind:'text',text:''});changed();render();}));
  if(opts.folder)add.appendChild(btn('+ Link',function(){items.push({kind:'link',url:'',title:''});changed();render();}));
  wrap.appendChild(add);
  return wrap;
}

/* ------------------------------------------------------------------ tabs */
function tabSlides(m){
  intro(m,'Each slide can hold any mix of photos, videos and text. One item fills the slide, two to four share it, and five or more become a scrolling grid.');
  var look=card('Slide look');
  var L=E.c.look;
  var row=el('div','edRow');
  row.appendChild(colorField('Background behind the photos',L.slideBg,[['#8fb8e6','Baby blue'],['#a9cdf0','Lighter blue'],['#ece5d4','Cream']],function(v){L.slideBg=v;}));
  row.appendChild(colorField('Text colour',L.slideText,[['#ffffff','White'],['#fffdf7','Bone white'],['#2c3a4b','Ink']],function(v){L.slideText=v;}));
  look.appendChild(row);m.appendChild(look);
  E.c.slides.forEach(function(sl,i){
    var c=card('Slide '+(i+1),[btn(ICON.up,function(){move(E.c.slides,i,-1);changed();render();},'sq'),btn(ICON.down,function(){move(E.c.slides,i,1);changed();render();},'sq'),
      btn('Delete',function(){if(confirm('Delete slide '+(i+1)+' and everything on it?')){E.c.slides.splice(i,1);changed();render();}},'bad')]);
    c.appendChild(field('Title (optional)',sl.title,function(v){sl.title=v;}));
    sl.items=sl.items||[];c.appendChild(itemsEditor(sl.items,{date:true}));m.appendChild(c);
  });
  m.appendChild(btn('+ Add a slide',function(){E.c.slides.push({title:'',items:[]});changed();render();},'pri'));
}
function colorField(label,value,presets,set){
  var w=el('div','edField'),inp=el('input');inp.type='color';inp.value=value||presets[0][0];
  w.appendChild(el('span','edLab',esc(label)));var r=el('div','edSwatches');
  presets.forEach(function(p){var b=el('button','edSw');b.type='button';b.title=p[1];b.style.background=p[0];b.innerHTML='<span>'+esc(p[1])+'</span>';b.onclick=function(){inp.value=p[0];set(p[0]);changed();};r.appendChild(b);});
  inp.oninput=function(){set(inp.value);changed();};r.appendChild(inp);w.appendChild(r);return w;
}
function tabQuotes(m){
  intro(m,'One quote is picked at random each time someone gets in, and typed out before the slides.');
  var c=card('Quotes');
  E.c.quotes.forEach(function(q,i){
    var r=el('div','edRow');r.appendChild(field('Quote '+(i+1),q,function(v){E.c.quotes[i]=v;},{area:true,rows:2,wide:true}));
    r.appendChild(btn(ICON.x,function(){E.c.quotes.splice(i,1);changed();render();},'sq bad'));c.appendChild(r);
  });
  c.appendChild(btn('+ Add a quote',function(){E.c.quotes.push('');changed();render();}));
  m.appendChild(c);
  var c2=card('Signature and speed');
  c2.appendChild(field('Signed as',E.c.attribution,function(v){E.c.attribution=v;}));
  var sp=+E.c.look.quoteSpeed||1,w=el('label','edField'),r=el('input'),out=el('span','edNote');
  r.type='range';r.min=.4;r.max=2.5;r.step=.1;r.value=sp;w.appendChild(el('span','edLab','Quote animation speed'));w.appendChild(r);w.appendChild(out);
  function lab(){out.textContent=(+r.value).toFixed(1)+'× '+(+r.value>1.05?'(faster)':+r.value<.95?'(slower)':'(normal)');}
  r.oninput=function(){E.c.look.quoteSpeed=+r.value;lab();changed();};lab();c2.appendChild(w);
  m.appendChild(c2);
}
function tabBarrage(m){
  var M=E.c.montage;
  intro(m,'The photo barrage pops pictures and videos onto the screen, faster and faster. Then the vertical video plays all the way through, the screen holds for a moment, and the TV switches off.');
  var c=card('What pops in');
  if(!M.items.length)c.appendChild(el('p','edNote','Nothing chosen yet, so it uses every photo from the slides and folders.'));
  var g=el('div','edGrid');
  M.items.forEach(function(it,i){
    var t=el('div','edMini'),img=el('img');img.alt='';thumbInto(img,it.thumb||it.poster||it);t.appendChild(img);
    if(it.kind==='video')t.appendChild(el('span','edKind','▶'));
    t.appendChild(btn(ICON.x,function(){M.items.splice(i,1);changed();render();},'sq bad'));g.appendChild(t);
  });
  c.appendChild(g);
  c.appendChild(btn('+ Photos / videos',async function(){var f=await pick('image/*,video/*',true);if(!f||!f.length)return;(await addFiles(f)).forEach(function(x){M.items.push(x);});render();}));
  m.appendChild(c);
  var c2=card('Timing');
  function total(){var n=Math.max(1,+M.count||1),a=+M.startMs||150,b=+M.endMs||60;return (n*(a+b)/2/1000);}
  var tot=el('p','edNote');function upd(){tot.textContent='About '+total().toFixed(1)+' seconds of pictures, then the ending video.';}
  var row=el('div','edRow');
  row.appendChild(field('How many pop in',M.count,function(v){M.count=Math.max(1,Math.min(400,v|0));upd();},{type:'number',min:1,max:400}));
  row.appendChild(field('First gap (ms)',M.startMs,function(v){M.startMs=Math.max(20,v|0);upd();},{type:'number',min:20,max:3000,note:'time between the first pops'}));
  row.appendChild(field('Last gap (ms)',M.endMs,function(v){M.endMs=Math.max(20,v|0);upd();},{type:'number',min:20,max:3000,note:'time between the last pops'}));
  c2.appendChild(row);upd();c2.appendChild(tot);
  c2.appendChild(field('Or set the whole length (seconds)','',function(v){if(!(v>0))return;var n=Math.max(1,+M.count||1),r=(+M.startMs||150)/((+M.endMs||60)||1),b=2000*v/(n*(1+r));M.endMs=Math.max(20,Math.round(b));M.startMs=Math.max(20,Math.round(b*r));upd();},{type:'number',min:1,step:.5,note:'keeps the speed-up, scales both gaps'}));
  m.appendChild(c2);
  var c3=card('The ending video');
  c3.appendChild(el('p','edNote','Always shown last, centred, played to the end with sound when the browser allows it. Shoot it vertically.'));
  if(M.finale){var t=el('div','edItem video'),f=el('div','edThumb'),img=el('img');img.alt='';f.appendChild(img);thumbInto(img,M.finale.thumb||M.finale.poster);t.appendChild(f);
    t.appendChild(el('p','edNote',(M.finale.w&&M.finale.h?(M.finale.w+'×'+M.finale.h+(M.finale.w>M.finale.h?' (this is sideways, not vertical)':'')):'')+(M.finale.dur?' · '+M.finale.dur+'s':'')));
    t.appendChild(btn('Remove',function(){M.finale=null;changed();render();},'bad'));c3.appendChild(t);}
  c3.appendChild(btn(M.finale?'Replace the video':'+ Choose the vertical video',async function(){var f=await pick('video/*',false);if(!f||!f.length)return;var got=await addFiles(f,'video');if(got[0]){M.finale=got[0];if(got[0].w>got[0].h)toast('That video is wider than it is tall. It will still play, with bars.',true);render();}}));
  c3.appendChild(field('Pause after it ends (seconds)',(M.holdMs||3000)/1000,function(v){M.holdMs=Math.max(0,Math.round(v*1000));},{type:'number',min:0,max:20,step:.5}));
  m.appendChild(c3);
}
function tabFolders(m){
  var F=E.c.folders;
  intro(m,'Folders float into a grid at the end. The title only shows once a folder is opened. Inside, you can put long text, photos and videos; videos can have a caption and a message, and anything can have a date (it only shows when you type one).');
  var c=card('How many folders');
  var r=el('div','edRow'),n=el('input');n.type='number';n.min=1;n.max=64;n.value=F.length;
  var apply=btn('Apply',function(){
    var want=Math.max(1,Math.min(64,n.value|0));
    if(want<F.length){var lost=F.slice(want).filter(function(f){return (f.items||[]).length||f.title;}).length;if(lost&&!confirm('This removes the last '+(F.length-want)+' folders, and '+lost+' of them have things in them. Remove them?'))return;F.length=want;}
    while(F.length<want)F.push({name:'',title:'',items:[]});changed();render();
  });
  var w=el('label','edField');w.appendChild(el('span','edLab','Folders'));w.appendChild(n);r.appendChild(w);r.appendChild(apply);c.appendChild(r);
  var own=false;try{own=localStorage.getItem('jj_fy_owner')==='1';}catch(e){}
  var ob=el('label','edCheck'),cb=el('input');cb.type='checkbox';cb.checked=own;cb.onchange=function(){try{localStorage.setItem('jj_fy_owner',cb.checked?'1':'0');}catch(e){}};
  ob.appendChild(cb);ob.appendChild(D.createTextNode(' Show my own labels under the folders on this device'));c.appendChild(ob);
  m.appendChild(c);
  F.forEach(function(f,i){
    f.items=f.items||[];
    var cc=card('Folder '+(i+1)+(f.name?' · '+f.name:''),[btn(ICON.up,function(){move(F,i,-1);changed();render();},'sq'),btn(ICON.down,function(){move(F,i,1);changed();render();},'sq')]);
    var rr=el('div','edRow');
    rr.appendChild(field('Title (shown inside)',f.title,function(v){f.title=v;}));
    rr.appendChild(field('My label (only for me)',f.name,function(v){f.name=v;}));
    cc.appendChild(rr);
    var det=el('details','edDet');det.open=!!E.openFolders&&E.openFolders[i];det.ontoggle=function(){E.openFolders=E.openFolders||{};E.openFolders[i]=det.open;};
    det.appendChild(el('summary',null,f.items.length?f.items.length+' item'+(f.items.length>1?'s':''):'Empty'));
    det.appendChild(itemsEditor(f.items,{folder:true}));cc.appendChild(det);m.appendChild(cc);
  });
}
function tabBooks(m){
  var B=E.c.books;
  intro(m,'Books sit on the map after the Earth trip. Add photos of the pages: each one is found in the photo, straightened and cleaned up like a scan. If a scan looks wrong, switch that page back to the original photo before publishing.');
  B.forEach(function(bk,i){
    bk.pages=bk.pages||[];
    var c=card(bk.title||'Book '+(i+1),[btn(ICON.up,function(){move(B,i,-1);changed();render();},'sq'),btn(ICON.down,function(){move(B,i,1);changed();render();},'sq'),
      btn('Delete',function(){if(confirm('Delete this book and its '+bk.pages.length+' pages?')){B.splice(i,1);changed();render();}},'bad')]);
    var row=el('div','edRow'),cov=el('div','edCover'),img=el('img');img.alt='';cov.appendChild(img);thumbInto(img,bk.cover);
    cov.appendChild(btn('Change cover',async function(){var f=await pick('image/*',false);if(!f||!f.length)return;busy('Adding cover');try{var it=await addPhoto(f[0]);bk.cover={id:it.id,mime:it.mime};}catch(e){toast(e.message,true);}busy(null);changed();render();}));
    row.appendChild(cov);row.appendChild(field('Title',bk.title,function(v){bk.title=v;}));c.appendChild(row);
    /* colour-coded sections: they make the book's glossary and each page can belong to one */
    if(bk.sections){
      var sb=el('div','edSecs');sb.appendChild(el('div','edLab','Sections (the glossary jumps to each one)'));
      var COLORS=['#e57373','#f0a35e','#f2d16b','#8fcf8a','#6fb7e0','#9b8be0','#e58fc4','#b9a07a'];
      bk.sections.forEach(function(sc,k){
        var r=el('div','edSec'),col=el('input');col.type='color';col.value=sc.color||COLORS[k%COLORS.length];col.title='Label colour';
        col.oninput=function(){sc.color=col.value;changed();};r.appendChild(col);
        var t=el('input');t.type='text';t.value=sc.title||'';t.placeholder='Section name';t.oninput=function(){sc.title=t.value;changed();};r.appendChild(t);
        r.appendChild(btn(ICON.up,function(){move(bk.sections,k,-1);bk.pages.forEach(function(p){if(p.section===k)p.section=k-1;else if(p.section===k-1)p.section=k;});changed();render();},'sq'));
        r.appendChild(btn(ICON.down,function(){if(k>=bk.sections.length-1)return;move(bk.sections,k,1);bk.pages.forEach(function(p){if(p.section===k)p.section=k+1;else if(p.section===k+1)p.section=k;});changed();render();},'sq'));
        r.appendChild(btn(ICON.x,function(){var n=bk.pages.filter(function(p){return p.section===k;}).length;if(n&&!confirm('Remove this section? Its '+n+' pages stay in the book without a section.'))return;
          bk.sections.splice(k,1);bk.pages.forEach(function(p){if(p.section===k)delete p.section;else if(p.section>k)p.section--;});changed();render();},'sq bad'));
        sb.appendChild(r);
      });
      sb.appendChild(btn('+ Add a section',function(){bk.sections.push({title:'',color:COLORS[bk.sections.length%COLORS.length]});changed();render();}));
      c.appendChild(sb);
    }else c.appendChild(btn('Use colour-coded sections',function(){bk.sections=[];changed();render();},'ghost'));
    /* each page: its scan (or none yet), page number, prompt and the words that go with it */
    if(bk.sections)bk.pages.sort(function(x,y){return ((x.section==null?999:x.section)-(y.section==null?999:y.section))||((x.num||0)-(y.num||0));});
    else bk.pages.sort(function(x,y){return (x.num||0)-(y.num||0);});
    var det=el('details','edDet');det.open=!!(E.openBooks&&E.openBooks[i]);det.ontoggle=function(){E.openBooks=E.openBooks||{};E.openBooks[i]=det.open;};
    det.appendChild(el('summary',null,bk.pages.length+' page'+(bk.pages.length===1?'':'s')+(bk.pages.some(function(p){return !p.id;})?' · '+bk.pages.filter(function(p){return !p.id;}).length+' still need a scan':'')));
    var list=el('div','edPages');
    bk.pages.forEach(function(p,j){
      var row=el('div','edPage'),fig=el('div','edMini page');
      if(p.id){var im=el('img');im.alt='';fig.appendChild(im);thumbInto(im,p.thumb||p);}else fig.appendChild(el('span','edNoScan','no scan yet'));
      var sc=E.scans[p.id];
      if(sc&&!sc.found)fig.appendChild(el('span','edFlag','page edges not found: cleaned only'));
      row.appendChild(fig);
      var fl=el('div','edPageFields'),r1=el('div','edRow');
      if(bk.sections&&bk.sections.length){
        var sw=el('label','edField'),ss=el('select');ss.innerHTML='<option value="">No section</option>'+bk.sections.map(function(sc,k){return '<option value="'+k+'">'+esc(sc.title||('Section '+(k+1)))+'</option>';}).join('');
        ss.value=p.section==null?'':String(p.section);ss.onchange=function(){if(ss.value==='')delete p.section;else p.section=+ss.value;changed();render();};
        sw.appendChild(el('span','edLab','Section'));sw.appendChild(ss);r1.appendChild(sw);
      }
      r1.appendChild(field(bk.sections?'Order':'Page',p.num,function(v){p.num=v|0;},{type:'number',min:1}));
      r1.appendChild(field('Prompt',p.prompt,function(v){p.prompt=v;},{placeholder:'Read Me When…'}));
      fl.appendChild(r1);
      fl.appendChild(field('Caption',p.caption,function(v){p.caption=v;},{area:true,rows:3,wide:true,placeholder:'what you wrote about this page'}));
      var tl=el('div','edItemTools');
      tl.appendChild(btn(p.id?'Replace scan':'+ Add scan',async function(){
        var f=await pick('image/*',false);if(!f||!f.length)return;busy('Scanning page '+(p.num||''));
        try{var pg=await scanPage(f[0]);['id','mime','w','h','thumb'].forEach(function(k){p[k]=pg[k];});}catch(err){toast(err.message||String(err),true);}
        busy(null);changed();render();
      }));
      if(sc)tl.appendChild(btn(sc.using==='scan'?'Use original':'Use scan',async function(){
        sc.using=sc.using==='scan'?'orig':'scan';var v=sc[sc.using];S.pending[p.id].enc=await sealCK(v.u8);S.pending[p.id].mime=v.mime;S.pending[p.id].size=v.u8.length;p.mime=v.mime;
        delete API.cache[p.id];changed();render();
      }));
      tl.appendChild(btn(ICON.x,function(){if(confirm('Remove this page?')){bk.pages.splice(j,1);changed();render();}},'sq bad'));
      fl.appendChild(tl);row.appendChild(fl);list.appendChild(row);
    });
    det.appendChild(list);c.appendChild(det);
    c.appendChild(btn('+ Add pages',async function(){
      var f=await pick('image/*',true);if(!f||!f.length)return;var list=Array.prototype.slice.call(f);
      var nextNum=bk.pages.reduce(function(a,p){return Math.max(a,p.num||0);},0)+1;
      for(var k=0;k<list.length;k++){busy('Scanning page '+(k+1)+' of '+list.length);try{var pg=await scanPage(list[k]);pg.num=nextNum++;pg.prompt='';pg.caption='';bk.pages.push(pg);}catch(e){toast(list[k].name+': '+(e.message||e),true);}await sleep(10);}
      busy(null);changed();render();
    },'pri'));
    m.appendChild(c);
  });
  m.appendChild(btn('+ Add a book',async function(){var f=await pick('image/*',false);if(!f||!f.length)return;busy('Adding cover');try{var it=await addPhoto(f[0]);B.push({title:'',cover:{id:it.id,mime:it.mime},pages:[]});}catch(e){toast(e.message,true);}busy(null);changed();render();}));
}
function tabAccess(m){
  var Q=E.vault.q;
  intro(m,'These are the questions visitors answer to get in, in order. Prompts and hints can be changed freely. Changing what counts as a right answer needs the current answer first. Answers ignore capital letters, accents, extra spaces and leading zeros, so you rarely need variations.');
  Q.forEach(function(q,i){
    var c=card('Question '+(i+1),[btn(ICON.up,async function(){if(i<1)return;move(Q,i,-1);move(E.c._secrets,i,-1);await rewrapContentKey();changed();render();},'sq'),
      btn(ICON.down,async function(){if(i>=Q.length-1)return;move(Q,i,1);move(E.c._secrets,i,1);await rewrapContentKey();changed();render();},'sq'),
      btn('Remove',function(){removeQuestion(i);},'bad')]);
    var r=el('div','edRow');
    r.appendChild(field('Prompt (typed above the line)',q.prompt,function(v){q.prompt=v;},{placeholder:i===0?'nothing: just the blinking line':''}));
    r.appendChild(field('Hint (after 2 wrong tries)',q.hint,function(v){q.hint=v;}));
    var kw=el('label','edField'),sel=el('select');sel.innerHTML='<option value="digits">Numbers (leading zeros ignored)</option><option value="date">Date (only the digits count)</option><option value="text">Words</option>';sel.value=q.kind||'text';
    sel.onchange=function(){toast('To switch between numbers and words, change the answers too (so they are saved the new way).');sel.value=q.kind||'text';};
    kw.appendChild(el('span','edLab','Kind of answer'));kw.appendChild(sel);r.appendChild(kw);
    c.appendChild(r);
    c.appendChild(el('p','edNote',q.w.length+' accepted answer'+(q.w.length>1?'s':'')+' (they are stored scrambled, so they cannot be shown).'));
    c.appendChild(btn('Change the answers…',function(){changeAnswers(i);}));
    m.appendChild(c);
  });
  m.appendChild(btn('+ Add a question',function(){addQuestion();},'pri'));
  /* Earth's own password, asked when the planet is clicked */
  var eq=E.vault.earth,ce=card('Earth password',eq?[btn('Remove',async function(){
    var r=await ask('Remove the Earth password',[{label:'Its current answer',type:'password',note:'Needed to remove it. Without it, anyone who gets in can fly to the map and books.'}],'Remove');
    if(!r)return;if(!await API.unwrapAnswer(eq,r.values[0])){r.msg.textContent='That is not the current answer.';await sleep(700);r.close();return;}
    delete E.vault.earth;r.close();changed();render();toast('Earth no longer asks for a password.');},'bad')]:[]);
  if(eq){
    var er=el('div','edRow');
    er.appendChild(field('Prompt',eq.prompt,function(v){eq.prompt=v;}));
    er.appendChild(field('Hint (after 2 wrong tries)',eq.hint,function(v){eq.hint=v;},{placeholder:'optional'}));
    ce.appendChild(er);
    ce.appendChild(el('p','edNote','Kind of answer: '+({date:'date (slashes, dashes or just the digits all work)',digits:'numbers',text:'words'}[eq.kind]||eq.kind)+'. '+eq.w.length+' accepted answer'+(eq.w.length>1?'s':'')+'.'));
    ce.appendChild(btn('Change the answer\u2026',async function(){
      while(true){
        var r=await ask('Change the Earth password',[{label:'Current answer',type:'password'},{label:'Kind of answer',options:[['date','Date'],['digits','Numbers'],['text','Words']],value:eq.kind||'date'},{label:'New accepted answers',area:true,placeholder:'one per line'}],'Change');
        if(!r)return;r.msg.textContent='Checking\u2026';
        var sec=await API.unwrapAnswer(eq,r.values[0]);
        if(!sec){r.msg.textContent='That is not the current answer.';await sleep(700);r.close();continue;}
        var ans=lines(r.values[2]);if(!ans.length){r.close();toast('Type at least one answer.',true);continue;}
        var nq=Object.assign({},eq,{kind:r.values[1]});nq.w=await wrapAnswers(nq,ans,sec);E.vault.earth=nq;r.close();changed();render();toast('Earth password changed.');return;
      }
    }));
  }else{
    ce.appendChild(el('p','edNote','Earth opens without a password.'));
    ce.appendChild(btn('Add a password for Earth\u2026',async function(){
      var r=await ask('Add a password for Earth',[{label:'Prompt',value:'The Date We Started Dating'},{label:'Hint',placeholder:'optional'},{label:'Kind of answer',options:[['date','Date'],['digits','Numbers'],['text','Words']]},{label:'Accepted answers',area:true,placeholder:'one per line'}],'Add');
      if(!r)return;var ans=lines(r.values[3]);if(!ans.length){r.close();toast('Type at least one answer.',true);return;}
      var q2={prompt:r.values[0],hint:r.values[1],kind:r.values[2],w:[]};q2.w=await wrapAnswers(q2,ans,crypto.getRandomValues(new Uint8Array(32)));E.vault.earth=q2;r.close();changed();render();
    }));
  }
  m.appendChild(ce);
  var c2=card('Editor password');
  c2.appendChild(el('p','edNote','The password for this editor. You need the current one to set a new one.'));
  c2.appendChild(btn('Change the editor password…',changeEditorPw));
  m.appendChild(c2);
}
/* a small form in a dialog; resolves with the values or null */
function ask(title,fields,okText){
  return new Promise(function(done){
    var bg=el('div','edDlg'),f=el('form','edDlgBox');f.appendChild(el('h3',null,esc(title)));
    var ins=fields.map(function(x){var w=el('label','edField wide');w.appendChild(el('span','edLab',esc(x.label)));var i=x.area?el('textarea'):el('input');if(!x.area)i.type=x.type||'text';if(x.area)i.rows=x.rows||4;if(x.value)i.value=x.value;if(x.placeholder)i.placeholder=x.placeholder;
      if(x.options){i=el('select');x.options.forEach(function(o){var op=el('option',null,esc(o[1]));op.value=o[0];i.appendChild(op);});if(x.value)i.value=x.value;}
      w.appendChild(i);if(x.note)w.appendChild(el('span','edNote',esc(x.note)));f.appendChild(w);return i;});
    var msg=el('div','edDlgMsg');f.appendChild(msg);
    var row=el('div','edRow end');row.appendChild(btn('Cancel',function(){bg.remove();done(null);},'ghost'));var ok=el('button','edBtn pri',esc(okText||'Save'));ok.type='submit';row.appendChild(ok);f.appendChild(row);
    f.onsubmit=function(e){e.preventDefault();done({values:ins.map(function(i){return i.value;}),msg:msg,close:function(){bg.remove();}});};
    bg.appendChild(f);D.body.appendChild(bg);setTimeout(function(){if(ins[0])ins[0].focus();},30);
  });
}
function lines(v){return String(v||'').split(/\n|,/).map(function(s){return s.trim();}).filter(Boolean);}
async function changeAnswers(i){
  var q=E.vault.q[i];
  while(true){
    var r=await ask('Change the answers for question '+(i+1),[{label:'Current answer',type:'password'},{label:'Kind of answer',options:[['digits','Numbers'],['date','Date'],['text','Words']],value:q.kind||'text'},{label:'New accepted answers',area:true,placeholder:'one per line',note:'Every line is a right answer. The first is the main one.'}],'Change answers');
    if(!r)return;
    r.msg.textContent='Checking…';
    var sec=await API.unwrapAnswer(Object.assign({},q,{w:q.w}),r.values[0]);
    if(!sec){r.msg.textContent='That is not the current answer.';await sleep(700);r.close();continue;}
    var ans=lines(r.values[2]);if(!ans.length){r.msg.textContent='Type at least one answer.';r.close();continue;}
    var nq=Object.assign({},q,{kind:r.values[1]});
    nq.w=await wrapAnswers(nq,ans,sec);if(!nq.w.length){r.msg.textContent='Those answers are empty once tidied up.';r.close();continue;}
    E.vault.q[i]=nq;r.close();changed();render();toast('Answers changed for question '+(i+1)+'.');return;
  }
}
async function addQuestion(){
  var r=await ask('Add a question',[{label:'Prompt',placeholder:'what visitors see'},{label:'Hint',placeholder:'after 2 wrong tries'},{label:'Kind of answer',options:[['text','Words'],['digits','Numbers'],['date','Date']]},{label:'Accepted answers',area:true,placeholder:'one per line'}],'Add question');
  if(!r)return;var ans=lines(r.values[3]);if(!ans.length){r.close();toast('A question needs at least one answer.',true);return;}
  var sec=crypto.getRandomValues(new Uint8Array(32)),q={prompt:r.values[0],hint:r.values[1],kind:r.values[2],w:[]};
  q.w=await wrapAnswers(q,ans,sec);E.vault.q.push(q);E.c._secrets.push(API.toB64(sec));await rewrapContentKey();r.close();changed();render();toast('Question added. Visitors now answer '+E.vault.q.length+' questions.');
}
async function removeQuestion(i){
  if(E.vault.q.length<=1){toast('There has to be at least one question.',true);return;}
  while(true){
    var r=await ask('Remove question '+(i+1),[{label:'Its current answer',type:'password',note:'Needed to remove it.'}],'Remove');
    if(!r)return;
    if(!await API.unwrapAnswer(E.vault.q[i],r.values[0])){r.msg.textContent='That is not the current answer.';await sleep(700);r.close();continue;}
    E.vault.q.splice(i,1);E.c._secrets.splice(i,1);await rewrapContentKey();r.close();changed();render();toast('Question removed.');return;
  }
}
async function changeEditorPw(){
  while(true){
    var r=await ask('Change the editor password',[{label:'Current editor password',type:'password'},{label:'New password',type:'password',note:'At least 10 characters.'},{label:'New password again',type:'password'}],'Change password');
    if(!r)return;
    try{await API.aes(await pwKey(r.values[0],E.vault.ke.s),API.b64(E.vault.ke.d));}catch(e){r.msg.textContent='That is not the current editor password.';await sleep(800);r.close();continue;}
    if(r.values[1].length<10){r.msg.textContent='Use at least 10 characters.';r.close();continue;}
    if(r.values[1]!==r.values[2]){r.msg.textContent='The two new passwords do not match.';r.close();continue;}
    var s=salt();E.vault.ke={s:s,d:API.toB64(await seal(await pwKey(r.values[1],s),S.ckRaw))};r.close();changed();toast('Editor password changed. It takes effect when you publish.');return;
  }
}

/* ------------------------------------------------------------------ media bookkeeping */
function refs(c){
  var ids={};
  (function walk(o){if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(walk);return;}if(typeof o.id==='string'&&/^[0-9a-f]{12}$/.test(o.id))ids[o.id]=o.mime||1;Object.keys(o).forEach(function(k){if(k!=='_secrets')walk(o[k]);});})(c);
  return ids;
}
function newMedia(){var r=refs(E.c);return Object.keys(r).filter(function(id){return S.pending[id];});}

/* ------------------------------------------------------------------ preview: the real page in a frame */
function preview(start){
  var o=el('div','edPrevWrap'),bar=el('div','edPrevBar'),f=el('iframe');
  bar.appendChild(el('span',null,'Preview · nothing is published'));bar.appendChild(btn('Back to the editor',function(){o.remove();},'pri'));
  f.src='index.html?preview='+Date.now();f.title='Preview';o.appendChild(bar);o.appendChild(f);D.body.appendChild(o);
  f.onload=async function(){
    var w=f.contentWindow;for(var i=0;i<100&&!w.__fyPreview;i++)await sleep(50);
    if(!w.__fyPreview){toast('The preview did not start.',true);return;}
    w.__fyPreview({vault:E.vault,content:E.c,ckRaw:S.ckRaw,pending:S.pending,start:start});
  };
}

/* ------------------------------------------------------------------ publish: commit the encrypted vault and new media to GitHub */
function token(){try{return localStorage.getItem('jj_fy_gh')||'';}catch(e){return '';}}
async function gh(method,path,body){
  var r=await fetch('https://api.github.com/repos/'+REPO.owner+'/'+REPO.name+path,{method:method,headers:{'Authorization':'Bearer '+token(),'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!r.ok){var t='';try{t=(await r.json()).message;}catch(e){}throw new Error('GitHub said '+r.status+(t?': '+t:'')+(r.status===401||r.status===403?' (check the token and its access to '+REPO.name+')':''));}
  return r.json();
}
function tabPublish(m){
  var nm=newMedia(),size=nm.reduce(function(a,id){return a+S.pending[id].enc.length;},0),old=Object.keys(E.base).filter(function(id){return !refs(E.c)[id];});
  intro(m,'Publishing encrypts everything here and saves it to the website by committing to GitHub. The site updates about a minute later. Drafts are kept on this device until then, so closing the editor does not lose anything.');
  var c=card('What will be published');
  c.appendChild(el('p',null,E.dirty?('Your changes'+(nm.length?', '+nm.length+' new file'+(nm.length>1?'s':'')+' ('+mb(size)+')':'')+(old.length?', and '+old.length+' unused file'+(old.length>1?'s':'')+' removed':'')+'.'):'Nothing has changed since the last publish.'));
  if(size>200e6)c.appendChild(el('p','edNote warn','That is a lot at once. Consider publishing in smaller batches.'));
  m.appendChild(c);
  var c2=card('Your GitHub token');
  var has=!!token();
  c2.appendChild(el('p','edNote',has?'A token is saved on this device.':'Publishing needs a GitHub token that can write to '+REPO.owner+'/'+REPO.name+'. It is saved only in this browser.'));
  var help=el('details','edDet');help.appendChild(el('summary',null,'How to make one'));
  help.appendChild(el('ol',null,'<li>Open <b>github.com → Settings → Developer settings → Fine-grained tokens → Generate new token</b>.</li><li>Repository access: <b>Only select repositories</b> → <b>'+esc(REPO.name)+'</b>.</li><li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li><li>Generate, copy it, and paste it below.</li>'));
  c2.appendChild(help);
  var r=el('div','edRow'),ti=el('input');ti.type='password';ti.placeholder=has?'saved (paste a new one to replace it)':'paste the token';ti.autocomplete='off';
  var w=el('label','edField wide');w.appendChild(el('span','edLab','Token'));w.appendChild(ti);r.appendChild(w);
  r.appendChild(btn('Save token',function(){if(!ti.value.trim())return;try{localStorage.setItem('jj_fy_gh',ti.value.trim());}catch(e){}ti.value='';render();toast('Token saved on this device.');}));
  if(has)r.appendChild(btn('Forget it',function(){try{localStorage.removeItem('jj_fy_gh');}catch(e){}render();},'ghost'));
  c2.appendChild(r);m.appendChild(c2);
  var c3=card('Publish');var log=el('ol','edLog');(E.log||[]).forEach(function(t){log.appendChild(el('li',null,esc(t)));});
  var go=btn('Publish now',async function(){
    if(!token()){toast('Save a GitHub token first.',true);return;}
    if(!confirm('Publish these changes to the live site?'))return;
    go.disabled=true;E.log=[];log.innerHTML='';function say(t){E.log.push(t);var l=$('.edLog');if(l){l.appendChild(el('li',null,esc(t)));l.scrollTop=1e9;}}
    try{await publish(say);say('Done. The site updates in about a minute.');toast('Published.');}
    catch(e){say('Stopped: '+(e.message||e));toast(e.message||String(e),true);}
    go.disabled=false;status();
  },'pri big');
  c3.appendChild(go);c3.appendChild(log);m.appendChild(c3);
}
async function publish(say){
  say('Encrypting the content');
  var V=clone(E.vault);V.data=API.toB64(await sealCK(API.enc.encode(JSON.stringify(E.c))));
  var used=refs(E.c),add=Object.keys(used).filter(function(id){return S.pending[id];}),gone=Object.keys(E.base).filter(function(id){return !used[id];});
  say('Checking the site on GitHub');
  var ref=await gh('GET','/git/ref/heads/'+REPO.branch),head=ref.object.sha,cm=await gh('GET','/git/commits/'+head);
  /* the live site must already run this editor's version of the page, or the new vault would lock everyone out */
  try{await gh('GET','/contents/'+REPO.dir+'editor.js?ref='+head);}
  catch(e){throw new Error('The live site does not have the editor yet. Merge the site update first, then publish.');}
  var tree=[];
  for(var i=0;i<add.length;i++){
    var id=add[i],p=S.pending[id];say('Uploading file '+(i+1)+' of '+add.length+' ('+mb(p.enc.length)+')');
    var b=await gh('POST','/git/blobs',{content:API.toB64(p.enc),encoding:'base64'});
    tree.push({path:REPO.dir+'media/'+id+'.enc',mode:'100644',type:'blob',sha:b.sha});
  }
  var vb=await gh('POST','/git/blobs',{content:API.toB64(API.enc.encode(JSON.stringify(V))),encoding:'base64'});
  tree.push({path:REPO.dir+'vault.json',mode:'100644',type:'blob',sha:vb.sha});
  gone.forEach(function(id){tree.push({path:REPO.dir+'media/'+id+'.enc',mode:'100644',type:'blob',sha:null});});
  say('Saving');
  var nt=await gh('POST','/git/trees',{base_tree:cm.tree.sha,tree:tree});
  var nc=await gh('POST','/git/commits',{message:'Update the special site from the editor',tree:nt.sha,parents:[head]});
  await gh('PATCH','/git/refs/heads/'+REPO.branch,{sha:nc.sha});
  /* now this is what is published */
  S.vault=V;E.vault=clone(V);S.content=clone(E.c);E.base=used;add.forEach(function(id){delete S.pending[id];});E.scans={};E.dirty=false;
  await clearDraft();render();
}

window.FyEditor={open:open,_test:{scanPage:scanPage,findPage:findPage,refs:refs,publish:publish,state:function(){return E;}}};
})();
