/* Mareep: a small pixel-art companion. Idle bob, lean, tail wag and blinking. Hop on hover, zap on click. */
var Mareep=(function(){
  var SRC='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAhCAYAAAC1ONkWAAAEXUlEQVR4nK2YLXSjShTH/7OnInJw1FFHHRK3kawjLnWRqVpceA5JHVEbWRfqeA7ZOiRueWpZ1XEg89Q8QWcYPpPs6z2H08zn/c3cO3fulHDOMSdv+3sOAFlWy7rd8Z3MDrpSfr8QXjITAPD1+08CAGQO7G1/z+31ulPHihLxIUWYnlBVFRHgAOAGDABQVdXF4L9fCNfdE1AuAABRoGN3fCeTYE8Pt9yLtqNtrCgBAJabgBXeoF4FvwgKAEsaMN1q4EbB5qDOwYm2Ms/gBmwW7vcL4boFsLyt0y1Atylu+p3//otwQB9MksUxAKBvWt9ZDPrqpvHRluLp4Vau/BrflDv29HDLTYNhc6AAMDCRbhrSv7xoC1aUsNxE9nne1rCcjYTK4lguYm4H3/b33HYKWRY+dgMAq9WKxyHD2ncBvE7ugCqWm2C5XDaTrZMP32h8ixVeZ2fF+DwBNE3jKtzX7z/J2/6eZ1mNMD0BOGEH4Iumadx1XQCA67pSmfChvjSDIfu7rgvd+gBwQiyXS+hmNLm4JNA75hVwu+M7EboBND7meR7oFvAOnmwwQguln8sJhTkAYLGhoB/jAGB5aMaI8pwYlo0sS2f7PD3c8puqqoimaZ0V1HYAZ+vCCIGQhp1dokGMOi06E+V5d+I8cWcVh2ljrr7EYQKWA9aWts6vaRp/3tbYHChoEMM0zMHAomyByigBrWNZ9p0FTIN1DkBf1BDjO4vBKf33H8IF2BdRWVUVKUodjDHUQTckSLDtsm0zW3DfWWC9dWA5m9FxKpTav+9rWdrO2Ylju+P7wKyq6PowvokwAYyf3j4UANg2lX+fHm757vhOVqsVf31lAJq2QeQn3/bccMzzpkwL0CyQ/jQFNQUnJD40B0H1YwCtKVvtxQBirEyzAM/behZGlSnwMD3BC9jgBumAve3v+SnTUaYtnPhUEe3nTHiNeAFDfqiRBDqqqiISrJPiFMXU+IEJP0tYDpTMlKmTBFMTQXXXOlBRgpCGnwZluQnyxIVuUwklrqtOHOunL+rVIo5422ZcBdF3/jLPYFi2/N2/4AdpT3cyb/Q0/V8oABJqSiSYuJoEjFD+GY79J9I5lVVVEd2MLg6Ul/Q5N0YkBv1wMTDlWEYqFFy6e5csQIUaSyCHAXZCkYjQnwGkQgHjmzEA8zP3KgV9KFXhGESZZ52yG7DRt0AHjNw9cifyYWwWyOIYrCilwiZlbn4vbIaFzWRZhRIBUhVRJ4CyrEaW1bOvKBnHBJS4fsooQWgn8nIVp7amaziRDwBIDwlKPwfQviXV4CtAk2Dk1fWR40+BdZxfQNXBGhTA7lgRNdOsqoqQu0eu9hUvpSTQ4aPuvJxE/bVQQC/yqwCTA+4eueG58s4cU96+eMYdW7XClB5wzq/6KKVcfGN1lFIOJ7qqfeybvZLGZGyVwsRiJ6fa1XT8nFwUxy4R/usHKaMEhjOunP/6QebSqb7M/hvqT0T46pT/nGsX8h/R6RlXBca52QAAAABJRU5ErkJggg==';
  var W=38,H=33,PX=3,PT=7,PB=1,LW=W+PX*2,LH=H+PT+PB;       /* sprite size, padding, logical canvas size */
  var TAIL_X=31,TAIL_ROWS=9;                               /* the ball and top of the tail move on their own */
  var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var img=new Image(),ready=false,queue=[];
  var normal=document.createElement('canvas'),blink=document.createElement('canvas');
  img.onload=function(){
    [normal,blink].forEach(function(c){c.width=W;c.height=H;c.getContext('2d').drawImage(img,0,0);});
    var bc=blink.getContext('2d'),face=bc.getImageData(10,11,1,1).data;
    [[11,11],[12,11]].forEach(function(p){var d=bc.createImageData(1,1);d.data.set(face);bc.putImageData(d,p[0],p[1]);});   /* eye closes into a line */
    ready=true;queue.forEach(function(f){f();});queue=[];
  };
  img.src=SRC;
  /* o.scale: size relative to the original 44 x 40 (for example 0.8). Anything other than 1 is drawn big and
     then smoothed down, so it stays clean at sizes that are not a whole multiple of the sprite's pixels. */
  function mount(host,o){
    o=o||{};
    var zoom=o.zoom||1,sc=o.scale||1,smooth=sc!==1,dpr=Math.max(1,window.devicePixelRatio||1);
    var k=smooth?4*zoom:Math.max(1,Math.round(dpr))*zoom;
    var cssW=LW*zoom*sc,cssH=LH*zoom*sc,hw=LW*k,hh=LH*k;
    var fw=smooth?Math.round(cssW*dpr):hw,fh=smooth?Math.round(cssH*dpr):hh;
    var cv=document.createElement('canvas');cv.width=fw;cv.height=fh;
    cv.style.width=cssW+'px';cv.style.height=cssH+'px';cv.style.display='block';
    cv.style.imageRendering=smooth?'auto':'pixelated';
    cv.setAttribute('aria-hidden','true');host.appendChild(cv);
    var ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=smooth;if(smooth)ctx.imageSmoothingQuality='high';
    function layer(){var c=document.createElement('canvas');c.width=hw;c.height=hh;var x=c.getContext('2d');x.imageSmoothingEnabled=false;return [c,x];}
    var L1=layer(),fr=L1[0],fx=L1[1],L2=layer(),rim=L2[0],rx=L2[1],L3=layer(),hc=L3[0],hx=L3[1];
    var rimColor=o.rim||null;
    var t0=performance.now(),nextBlink=2200+Math.random()*2000,blinkUntil=0,hop=null,zap=null,speed=1,hover=false,onscreen=true;
    function bobY(t){return ((Math.sin(2*Math.PI*t/1.3-Math.PI/2)+1)/2)>.5?-1:0;}
    function draw(now){
      var t=RM?0:(now-t0)/1000*speed*(hover?1.7:1),ms=now-t0;
      var bob=RM?0:bobY(t),sway=Math.sin(2*Math.PI*t/3.2),wag=Math.sin(2*Math.PI*t/1.15+.8),hopY=0;
      if(hop){var p=(now-hop)/300;if(p>=1)hop=null;else hopY=-Math.round(5*Math.sin(Math.PI*p));}
      if(!RM&&ms>nextBlink){blinkUntil=ms+120;nextBlink=ms+2600+Math.random()*2600;}
      var src=(ms<blinkUntil)?blink:normal;
      fx.clearRect(0,0,hw,hh);
      for(var y=0;y<H;y++){
        var lean=Math.round(1.4*sway*Math.pow((H-1-y)/(H-1),1.3)),dy=PT+y+bob+hopY;
        var tail=(y<TAIL_ROWS)?Math.round(2.2*wag*(TAIL_ROWS-y)/TAIL_ROWS):0;
        fx.drawImage(src,0,y,TAIL_X,1,(PX+lean)*k,dy*k,TAIL_X*k,k);
        fx.drawImage(src,TAIL_X,y,W-TAIL_X,1,(PX+TAIL_X+lean+tail)*k,dy*k,(W-TAIL_X)*k,k);
      }
      hx.clearRect(0,0,hw,hh);
      if(rimColor){   /* thin light edge so the dark outline stays visible on a dark page */
        rx.clearRect(0,0,hw,hh);rx.globalCompositeOperation='source-over';rx.drawImage(fr,0,0);
        rx.globalCompositeOperation='source-in';rx.fillStyle=rimColor;rx.fillRect(0,0,hw,hh);
        var rw=Math.round(k*(smooth?1.3:1));[[-1,0],[1,0],[0,-1],[0,1]].forEach(function(d){hx.drawImage(rim,d[0]*rw,d[1]*rw);});
      }
      hx.drawImage(fr,0,0);
      if(zap){   /* little sparks of electricity */
        var zp=(now-zap)/420;
        if(zp>=1)zap=null;else{
          hx.globalAlpha=1-zp;
          for(var i=0;i<8;i++){
            var a=i/8*Math.PI*2+.4,r=(8+zp*13)*(i%2?1:.75),cx=Math.round(LW/2-1+Math.cos(a)*r),cy=Math.round(PT+H*.45+Math.sin(a)*r*.8);
            hx.fillStyle=(i%2)?'#f8d800':'#ffffff';
            hx.fillRect(cx*k,cy*k,k,k);hx.fillRect((cx+1)*k,cy*k,k,k);hx.fillRect(cx*k,(cy+1)*k,k,k);
          }
          hx.globalAlpha=1;
        }
      }
      ctx.clearRect(0,0,fw,fh);ctx.drawImage(hc,0,0,hw,hh,0,0,fw,fh);
    }
    var last=0,raf=0;
    function loop(now){raf=requestAnimationFrame(loop);if(!onscreen||now-last<28)return;last=now;draw(now);}
    function start(){if(!raf){draw(performance.now());raf=requestAnimationFrame(loop);}}
    if(window.IntersectionObserver)new IntersectionObserver(function(e){onscreen=e[0].isIntersecting;}).observe(cv);
    var api={
      hop:function(){if(!RM)hop=performance.now();},
      zap:function(){zap=performance.now();if(!RM)hop=performance.now();},
      blink:function(){blinkUntil=performance.now()-t0+140;},
      speed:function(s){speed=s;},
      hover:function(v){hover=v;},
      setRim:function(c){rimColor=c||null;},
      canvas:cv
    };
    if(ready)start();else queue.push(start);
    return api;
  }
  /* turns a link into a Mareep button: hops on hover, zaps on click, then goes to href */
  function link(a,o){
    var m=mount(a,o||{});
    a.classList.add('mareep');
    a.addEventListener('mouseenter',function(){m.hover(true);m.hop();});
    a.addEventListener('mouseleave',function(){m.hover(false);});
    a.addEventListener('focus',function(){m.hop();});
    a.addEventListener('click',function(e){
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;
      m.zap();
      if(a.target==='_blank')return;                    /* new tab: let the browser open it right away */
      e.preventDefault();
      var href=a.getAttribute('href');
      setTimeout(function(){location.assign(href);},RM?0:430);
    });
    return m;
  }
  return {mount:mount,link:link};
})();
