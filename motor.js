/* ==========================================================================
   EL ORIGEN DE LA MÚSICA — motor compartido (capítulos 2 en adelante)
   Lienzo de 192x108 en pixel art, sonidos sintetizados con Web Audio,
   reproductor por escenas con subtítulos y navegación entre capítulos.
   ========================================================================== */
const W=192,H=108;

document.head.insertAdjacentHTML('beforeend',`
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b0a14;--fg:#f3e9d2;--accent:#ffb347;--panel:#16142a;--line:#2a2640}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:'Press Start 2P',monospace;display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:16px}
h1{font-size:clamp(10px,2vw,16px);color:var(--accent);margin:4px 0 14px;text-align:center;line-height:1.6}
.stage{position:relative;width:100%;max-width:960px}
canvas{width:100%;aspect-ratio:16/9;image-rendering:pixelated;display:block;border:4px solid var(--line);background:#000}
#title{position:absolute;inset:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;opacity:0;text-shadow:3px 3px 0 #000;padding:0 16px}
#title .a{font-size:clamp(9px,1.8vw,16px);color:var(--accent);margin-bottom:14px}
#title .b{font-size:clamp(12px,3vw,28px);line-height:1.5}
#start{position:absolute;inset:4px;display:flex;align-items:center;justify-content:center;background:rgba(5,4,12,.75)}
button{font-family:inherit;background:var(--panel);color:var(--fg);border:4px solid var(--line);padding:10px 14px;font-size:clamp(9px,1.4vw,12px);cursor:pointer}
button:hover{border-color:var(--accent);color:var(--accent)}
#start button{font-size:clamp(11px,2vw,18px);padding:16px 22px;border-color:var(--accent)}
#cap{min-height:6em;margin-top:12px;font-size:clamp(9px,1.5vw,13px);line-height:1.9;background:var(--panel);border:4px solid var(--line);padding:12px 14px;width:100%;max-width:960px}
.bar{display:flex;gap:8px;margin-top:10px;width:100%;max-width:960px;align-items:center;flex-wrap:wrap}
.segs{display:flex;gap:4px;flex:1;min-width:160px}
.seg{flex:1;height:14px;background:var(--panel);border:2px solid var(--line);cursor:pointer;position:relative;overflow:hidden}
.seg i{position:absolute;inset:0;background:var(--accent);transform-origin:left;transform:scaleX(0)}
#nav{display:flex;justify-content:space-between;gap:8px;width:100%;max-width:960px;margin-top:14px;font-size:clamp(8px,1.2vw,11px)}
#nav a{color:var(--fg);text-decoration:none;border:4px solid var(--line);background:var(--panel);padding:10px 12px}
#nav a:hover{border-color:var(--accent);color:var(--accent)}
#nav .off{visibility:hidden}
</style>`);

document.body.insertAdjacentHTML('afterbegin',`
<h1 id="h1"></h1>
<div class="stage">
  <canvas id="c" width="192" height="108"></canvas>
  <div id="title"><div class="a"></div><div class="b"></div></div>
  <div id="start"><button id="go"></button></div>
</div>
<div id="cap"></div>
<div class="bar">
  <button id="pp">❚❚</button>
  <button id="rs">↺</button>
  <button id="mu">SONIDO: SÍ</button>
  <div class="segs" id="segs"></div>
</div>
<nav id="nav"></nav>`);

const cv=document.getElementById('c'),ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;

/* ---------- pixel helpers ---------- */
function R(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function P(x,y,c){R(x,y,1,1,c);}
function line(x0,y0,x1,y1,c){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
  for(;;){P(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}
}
function oval(cx,cy,rx,ry,c){
  for(let dy=-Math.round(ry);dy<=Math.round(ry);dy++){
    const w=rx*Math.sqrt(Math.max(0,1-(dy/ry)**2));R(cx-w,cy+dy,2*w,1,c);
  }
}
function ring(cx,cy,r,c){
  const n=Math.max(8,Math.round(r*6));
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;P(cx+Math.cos(a)*r,cy+Math.sin(a)*r,c);}
}
function alpha(a,fn){const g=ctx.globalAlpha;ctx.globalAlpha=g*Math.max(0,Math.min(1,a));fn();ctx.globalAlpha=g;}
function shade(a,c='#000'){if(a>0)alpha(a,()=>R(0,0,W,H,c));}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
let seed=7;function srand(s){seed=s;}
function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}

/* ---------- letras de 3x5 ---------- */
const FONT={A:[2,5,7,5,5],B:[6,5,6,5,6],C:[3,4,4,4,3],D:[6,5,5,5,6],E:[7,4,6,4,7],F:[7,4,6,4,4],G:[3,4,5,5,3],H:[5,5,7,5,5],
I:[7,2,2,2,7],J:[1,1,1,5,2],K:[5,5,6,5,5],L:[4,4,4,4,7],M:[5,7,7,5,5],N:[6,5,5,5,5],O:[2,5,5,5,2],P:[6,5,6,4,4],Q:[2,5,5,6,3],
R:[6,5,6,5,5],S:[3,4,2,1,6],T:[7,2,2,2,2],U:[5,5,5,5,7],V:[5,5,5,5,2],W:[5,5,7,7,5],X:[5,5,2,5,5],Y:[5,5,2,2,2],Z:[7,1,2,4,7],
0:[7,5,5,5,7],1:[2,6,2,2,7],2:[6,1,2,4,7],3:[6,1,2,1,6],4:[5,5,7,1,1],5:[7,4,6,1,6],6:[3,4,7,5,7],7:[7,1,1,2,2],8:[7,5,7,5,7],9:[7,5,7,1,6],
':':[0,2,0,2,0],'/':[1,1,2,4,4],'.':[0,0,0,0,2],',':[0,0,0,2,4],'-':[0,0,7,0,0],'~':[0,3,6,0,0],'?':[6,1,2,0,2],'!':[2,2,2,0,2],'+':[0,2,7,2,0],'=':[0,7,0,7,0],'>':[4,2,1,2,4],'<':[1,2,4,2,1],"'":[2,2,0,0,0],'#':[7,0,6,5,5]};
function txt(s,x,y,c,al=0){
  s=String(s).toUpperCase().replace(/Ñ/g,'#').normalize('NFD').replace(/\p{M}/gu,'').replace(/[̀-ͯ]/g,'');
  const w=s.length*4-1;if(al===1)x-=w>>1;else if(al===2)x-=w;
  for(let i=0;i<s.length;i++){const g=FONT[s[i]];if(!g)continue;
    for(let r=0;r<5;r++)for(let b=0;b<3;b++)if(g[r]&(4>>b))P(x+i*4+b,y+r,c);}
}
function label(s,x,y,c='#ffe27a',bg='rgba(10,8,20,.75)'){
  s=String(s);const w=s.length*4+3;alpha(1,()=>{ctx.fillStyle=bg;ctx.fillRect(Math.round(x-(w>>1)),y-2,w,9);});txt(s,x,y,c,1);
}

/* ---------- escenario ---------- */
srand(11);
const STARS=[...Array(50)].map(()=>[rnd()*W|0,rnd()*62|0,rnd()*7|0]);
function stars(t,maxY=62){for(const [x,y,k] of STARS){if(y>maxY)continue;const tw=(k+Math.floor(t*3))%7===0;P(x,y,tw?'#5a5580':(k<2?'#fff6d8':'#b8b3e0'));}}
function sky(cols,band=14){
  for(let i=0;i<cols.length;i++)R(0,i*band,W,i===cols.length-1?H:band,cols[i]);
  for(let i=1;i<cols.length;i++){const y=i*band;for(let x=0;x<W;x+=2){P(x,y,cols[i-1]);P(x+1,y-1,cols[i]);}}
}
function mkRidge(base,waves){return [...Array(W)].map((_,x)=>Math.round(base+waves.reduce((a,[A,f,p])=>a+A*Math.sin(x*f+p),0)));}
function ridge(arr,c,top){for(let x=0;x<W;x++){R(x,arr[x],1,H-arr[x],c);if(top)P(x,arr[x],top);}}
function moon(x,y){oval(x,y,6,6,'#f5e6b8');P(x-2,y-2,'#d9c78f');P(x+2,y+2,'#d9c78f');P(x+1,y-3,'#d9c78f');}
function sun(x,y,r,c='#ffd27a',glow='#ffb347'){alpha(.18,()=>oval(x,y,r*2.2,r*2.2,glow));oval(x,y,r,r,c);}
function fire(x,y,size,t){
  const r=(22+Math.sin(t*9)*1.5+Math.sin(t*23))*size;
  alpha(.13,()=>oval(x,y-1,r,r*.35,'#ff8a2a'));alpha(.07,()=>oval(x,y-10*size,r*.8,r*.8,'#ffb050'));
  line(x-7*size,y,x+6*size,y-3,'#5e3a1c');line(x+7*size,y,x-6*size,y-3,'#4a2c14');
  const n=Math.max(3,Math.round(9*size));
  for(let i=0;i<n;i++){
    const cx=x-(n>>1)+i,center=1-Math.abs(i-(n-1)/2)/(n/2);
    const h=Math.max(1,Math.round((3+10*center)*size*(.75+.25*Math.sin(t*12+i*1.9)+.15*Math.sin(t*27+i*3.1))));
    for(let k=0;k<h;k++){const f=k/h;P(cx,y-3-k,f<.3?'#ffe27a':f<.65?'#ffa12e':'#ff4d1a');}
  }
  for(let i=0;i<4;i++){const a=(t*.8+i*.37)%1;P(x+Math.sin(t*3+i*2)*3,y-8-a*25*size,a<.5?'#ffd27a':'#b0602a');}
}
function flame(x,y,t,k=1){
  const h=Math.round((3+Math.sin(t*14+x)*.8+Math.sin(t*31+y))*k);
  for(let i=0;i<h;i++){const f=i/h;R(x-(f<.5?1:0),y-i,f<.5?2:1,1,f<.35?'#ffe27a':f<.7?'#ffa12e':'#ff4d1a');}
}
function torch(x,y,t){alpha(.12,()=>oval(x,y-3,14,14,'#ffb050'));line(x,y,x+1,y+9,'#5e3a1c');flame(x,y-1,t,1.6);}
function candle(x,y,t){alpha(.12,()=>oval(x+1,y-2,7,7,'#ffcf70'));R(x,y,2,5,'#e8dcc0');P(x+1,y,'#c8bca0');flame(x+1,y-1,t,.9);}
function note(x,y,c){R(x+3,y,1,5,c);R(x+4,y,2,1,c);P(x+5,y+1,c);R(x+1,y+4,3,2,c);}
const NOTE_COLS=['#ffe27a','#ffb347','#9fd3ff','#ffa0c8','#b6f0a0'];
/* notas que flotan desde (x,y): nacen cada `every` segundos */
function notesFrom(x,y,st,every=.6,life=2.4,dir=1,from=0,to=99){
  for(let k=Math.max(0,Math.floor((st-life)/every));k<=Math.floor(st/every);k++){
    const born=k*every,age=st-born;if(born<from||born>to||age<0||age>life)continue;
    alpha(1-age/life,()=>note(x+dir*age*9,y-6-age*10+Math.sin(age*5+k)*2,NOTE_COLS[k%5]));
  }
}
function sil(x,y,c){oval(x,y-5,2,2,c);R(x-3,y-3,7,4,c);}
/* oscuridad con focos de luz (antorchas, velas) */
const LC=document.createElement('canvas');LC.width=W;LC.height=H;const lx=LC.getContext('2d');
function darkness(a,lights,rgb='0,0,0'){
  lx.globalCompositeOperation='source-over';lx.clearRect(0,0,W,H);lx.fillStyle=`rgba(${rgb},${a})`;lx.fillRect(0,0,W,H);
  lx.globalCompositeOperation='destination-out';
  for(const [x,y,r] of lights){const g=lx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.5,'rgba(0,0,0,.85)');g.addColorStop(1,'rgba(0,0,0,0)');lx.fillStyle=g;lx.fillRect(x-r,y-r,2*r,2*r);}
  ctx.drawImage(LC,0,0);
}

/* ---------- personaje ---------- */
const BASE={skin:'#c68642',shade:'#8d5524',hair:'#2b1a10',cloth:'#7a5230',clothL:'#a8753f',eye:'#140a05',mouth:'#4a1410'};
/* o: {pal, wear:'fur'|'tunic'|'robe'|'dress'|'coat'|'shirt', hair:'short'|'long'|'wig'|'wild'|'none', hood, beard, hat,
       hands:[[x,y],..] (coords locales, hombro en 8,-12), mouth, blink, lift} */
function person(x,y,s,flip,o={}){
  const c=Object.assign({},BASE,o.pal),wear=o.wear||'fur',L=o.lift||0,legs=c.legs||c.skin,feet=c.feet||c.shade;
  ctx.save();ctx.translate(flip?x+12*s:x,y);ctx.scale(flip?-s:s,s);
  if(wear==='robe'||wear==='dress'){R(wear==='dress'?1:2,-7,wear==='dress'?10:8,7,c.cloth);R(3,-1,3,1,feet);R(7,-1,3,1,feet);P(5,-5,c.clothL);P(7,-3,c.clothL);}
  else{R(3,-6,2,6,legs);R(7,-6-L,2,6,legs);R(3,-1,3,1,feet);R(7,-1-L,3,1,feet);}
  if(wear==='fur'){R(2,-13,8,7,c.cloth);P(2,-6,c.cloth);P(5,-6,c.cloth);P(8,-6,c.cloth);P(4,-11,c.clothL);P(7,-9,c.clothL);P(3,-8,c.clothL);}
  else if(wear==='tunic'){R(2,-13,8,9,c.cloth);R(2,-9,8,1,c.clothL);}
  else if(wear==='robe'||wear==='dress'){R(2,-13,8,7,c.cloth);R(2,-9,8,1,c.clothL);}
  else if(wear==='coat'){R(2,-13,8,8,c.cloth);R(6,-13,2,3,c.clothL);P(3,-7,c.cloth);}
  else R(2,-13,8,7,c.cloth);
  R(4,-19,6,6,c.skin);
  const hs=o.hood?'hood':(o.hair||'short'),hc=hs==='hood'?c.cloth:c.hair;
  if(hs!=='none'){
    R(3,-21,7,3,hc);R(3,-18,2,5,hc);P(9,-20,hc);
    if(hs==='hood'){R(2,-20,1,7,hc);P(10,-20,hc);}
    if(hs==='long')R(2,-18,3,9,hc);
    if(hs==='wig'){R(2,-21,8,3,hc);R(2,-18,2,7,hc);P(1,-16,hc);P(1,-13,hc);}
    if(hs==='wild'){P(2,-22,hc);P(5,-22,hc);P(8,-22,hc);P(10,-21,hc);R(1,-19,2,5,hc);}
  }
  if(o.beard)R(6,-15,4,3,c.beard||c.hair);
  if(o.hat==='top'){R(3,-26,7,5,'#141418');R(2,-21,9,1,'#141418');}
  if(o.hat==='cap'){R(3,-22,7,2,c.hatc||'#8a2020');R(9,-21,2,1,c.hatc||'#8a2020');}
  if(o.hat==='wreath'){P(3,-21,'#5a9a3a');P(5,-22,'#5a9a3a');P(7,-22,'#5a9a3a');P(9,-21,'#5a9a3a');}
  P(8,-17,o.blink?c.shade:c.eye);
  if(o.mouth)R(8,-15,2,2,c.mouth);else if(!o.beard)P(8,-15,c.shade);
  if(o.glasses){P(7,-17,'#e8e8f0');P(9,-17,'#e8e8f0');}
  if(o.phones){R(3,-20,1,4,'#222');R(3,-21,7,1,'#222');R(2,-18,2,3,'#e04848');}
  for(const h of (o.hands||[[9,-7],[7,-7]])){line(8,-12,h[0],h[1],o.sleeve?c.cloth:c.skin);R(h[0],h[1],2,2,c.skin);}
  ctx.restore();
}
/* coordenada local -> mundo, y mundo -> local */
const hw=(x,y,s,flip,hx,hy)=>[flip?x+12*s-s*hx:x+s*hx,y+s*hy];
const loc=(x,y,s,flip,wx,wy)=>[flip?(x+12*s-wx)/s:(wx-x)/s,(wy-y)/s];

/* ---------- audio ---------- */
let AC=null,master=null,tintF=null,NB=null,revIn=null,dly=null,fbk=null,muted=false,playing=false,evt={};
function initAudio(){
  if(AC)return;AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=.5;
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-10;comp.knee.value=6;comp.ratio.value=8;comp.attack.value=.003;comp.release.value=.2;
  tintF=AC.createBiquadFilter();tintF.type='lowpass';tintF.frequency.value=20000;tintF.Q.value=.7;
  master.connect(comp);comp.connect(tintF);tintF.connect(AC.destination);
  revIn=AC.createGain();revIn.gain.value=0;dly=AC.createDelay(1.5);fbk=AC.createGain();fbk.gain.value=.35;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
  tintF.connect(revIn);revIn.connect(dly);dly.connect(lp);lp.connect(fbk);fbk.connect(dly);lp.connect(AC.destination);
  NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function setEco(send=0,time=.25,fb=.35){if(!AC)return;const t=AC.currentTime;revIn.gain.setTargetAtTime(send,t,.1);dly.delayTime.setTargetAtTime(time,t,.1);fbk.gain.setTargetAtTime(fb,t,.1);}
function setTint(type='lowpass',f=20000,q=.7){if(!AC)return;tintF.type=type;tintF.frequency.setTargetAtTime(f,AC.currentTime,.05);tintF.Q.value=q;}
/* cadena de salida con envolvente; o.filt=[tipo,freq,q] filtra la nota */
function out(node,peak,t,d,att=.004,sus=false,rel=.1,filt){
  if(filt){const f=AC.createBiquadFilter();f.type=filt[0];f.frequency.value=filt[1];f.Q.value=filt[2]||1;node.connect(f);node=f;}
  const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+att);
  if(sus)g.gain.setValueAtTime(Math.max(.0002,peak),Math.max(t+att,t+d-rel));
  g.gain.exponentialRampToValueAtTime(.0001,t+d);node.connect(g).connect(master);return g;
}
function noise(type,freq,q,peak,dur,delay=0,o={}){
  if(!AC)return;const t=AC.currentTime+delay,s=AC.createBufferSource(),f=AC.createBiquadFilter();
  s.buffer=NB;s.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;
  if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+dur);
  s.connect(f);out(f,peak,t,dur,o.att||.004,o.sus,o.rel);s.start(t,Math.random()*.5);s.stop(t+dur+.05);
}
function osc(type,f0,f1,peak,dur,delay=0){tone({type,f:f0,f1,peak,dur,delay});}
/* tono general: {type,f,f1,glide,peak,dur,delay,att,sus,rel,lp,lp1,q,vib,vibD,dist,filt} */
function tone(o){
  if(!AC)return;const t=AC.currentTime+(o.delay||0),d=o.dur||.3,s=AC.createOscillator();
  s.type=o.type||'sine';s.frequency.setValueAtTime(o.f,t);
  if(o.f1)s.frequency.exponentialRampToValueAtTime(o.f1,t+(o.glide||d));
  if(o.vib){const v=AC.createOscillator(),vg=AC.createGain();v.frequency.value=o.vib;vg.gain.value=o.vibD||o.f*.01;v.connect(vg).connect(s.frequency);v.start(t);v.stop(t+d+.1);}
  let n=s;
  if(o.lp){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(o.lp,t);f.Q.value=o.q||1;if(o.lp1)f.frequency.exponentialRampToValueAtTime(o.lp1,t+(o.lpT||d));n.connect(f);n=f;}
  if(o.dist){const w=AC.createWaveShaper();w.curve=distCurve(o.dist);n.connect(w);n=w;}
  out(n,o.peak||.2,t,d,o.att||.004,o.sus,o.rel||.1,o.filt);s.start(t);s.stop(t+d+.05);
}
const DC={};
function distCurve(k){if(DC[k])return DC[k];const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/n*2-1;c[i]=Math.tanh(x*k)/Math.tanh(k);}return DC[k]=c;}
/* cuerda pulsada (Karplus-Strong precalculado). o:{dur,hl (vida media s),lp,peak,dist,bp:[f0,f1],filt,delay} */
const KS={};
function ksBuf(f,dur,hl){
  const k=f.toFixed(2)+'|'+dur+'|'+hl;if(KS[k])return KS[k];
  const sr=AC.sampleRate,n=Math.floor(sr*dur),b=AC.createBuffer(1,n,sr),d=b.getChannelData(0),N=Math.max(2,Math.round(sr/f));
  const damp=Math.pow(.5,1/(f*hl));
  for(let i=0;i<N&&i<n;i++)d[i]=Math.random()*2-1;
  for(let i=N;i<n;i++)d[i]=damp*.5*(d[i-N]+d[i-N+1<i?i-N+1:i-N]);
  return KS[k]=b;
}
function pluck(f,o={}){
  if(!AC)return;const t=AC.currentTime+(o.delay||0),d=o.dur||1.2,s=AC.createBufferSource();
  s.buffer=ksBuf(f,d,o.hl||.35);let n=s;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=o.lp||4000;n.connect(lp);n=lp;
  if(o.bp){const b=AC.createBiquadFilter(),m=AC.createGain(),dry=AC.createGain();b.type='bandpass';b.Q.value=o.bpq||6;
    b.frequency.setValueAtTime(o.bp[0],t);b.frequency.exponentialRampToValueAtTime(o.bp[1],t+d*.6);dry.gain.value=.35;
    n.connect(b).connect(m);n.connect(dry).connect(m);n=m;}
  if(o.dist){const w=AC.createWaveShaper();w.curve=distCurve(o.dist);n.connect(w);n=w;}
  out(n,o.peak||.5,t,d,.002,true,.15,o.filt);s.start(t);
}
const VOW={a:[800,1150,2900],e:[400,2000,2600],i:[300,2300,3000],o:[450,800,2800],u:[325,700,2500]};
/* voz cantada con formantes. o:{peak,att,rel,vib,vibD,delay,f1,filt} */
function sing(f,d,v='a',o={}){
  if(!AC)return;const t=AC.currentTime+(o.delay||0),s=AC.createOscillator(),vb=AC.createOscillator(),vg=AC.createGain(),mix=AC.createGain();
  mix.gain.value=2.5;s.type='sawtooth';s.frequency.setValueAtTime(f,t);if(o.f1)s.frequency.exponentialRampToValueAtTime(o.f1,t+d*.8);
  vb.frequency.value=o.vib||5;vg.gain.value=f*(o.vibD??.012);vb.connect(vg).connect(s.frequency);
  (VOW[v]||VOW.a).forEach((F,i)=>{const b=AC.createBiquadFilter(),g=AC.createGain();b.type='bandpass';b.frequency.value=F;b.Q.value=6;g.gain.value=[3,1.6,.6][i];s.connect(b).connect(g).connect(mix);});
  const lp=AC.createBiquadFilter(),lg=AC.createGain();lp.type='lowpass';lp.frequency.value=f*1.6;lg.gain.value=.3;s.connect(lp).connect(lg).connect(mix);
  out(mix,o.peak||.22,t,d,o.att||.08,true,o.rel||.15,o.filt);s.start(t);vb.start(t);s.stop(t+d+.05);vb.stop(t+d+.05);
}
const SND={
  clap(){noise('bandpass',1200,.8,.7,.02);noise('bandpass',1200,.8,.7,.02,.011);noise('bandpass',1100,.7,.8,.16,.022);},
  stomp(){osc('sine',120,40,.9,.28);noise('lowpass',300,1,.3,.08);},
  crackle(){noise('highpass',3000+Math.random()*3000,1,.06+Math.random()*.08,.015);},
  hum(f,d=.6){tone({type:'triangle',f,peak:.35,dur:d,att:.08,sus:true,rel:.18,vib:5,vibD:3,lp:900});},
  flute(f,d=.45,o={}){tone({f,f1:f*1.004,peak:o.peak||.25,dur:d,att:.04,sus:true,rel:.12,vib:5,vibD:f*.004,delay:o.delay||0,filt:o.filt});noise('bandpass',f*2,6,(o.peak||.25)*.3,d,o.delay||0,{att:.03,sus:true});},
  brass(f,d=.5,o={}){tone({type:'sawtooth',f,peak:(o.peak||.16)*2.2,dur:d,att:.04,sus:true,rel:.1,lp:500,lp1:o.bright||3000,lpT:.08,vib:5,vibD:f*.003,delay:o.delay||0,filt:o.filt});},
  bowed(f,d=.6,o={}){tone({type:'sawtooth',f,peak:(o.peak||.11)*3,dur:d,att:o.att||.09,sus:true,rel:.12,lp:o.lp||2600,q:.7,vib:5.5,vibD:f*.008,delay:o.delay||0,filt:o.filt});},
  reed(f,d=.5,o={}){tone({type:'square',f,peak:(o.peak||.06)*3,dur:d,att:.03,sus:true,rel:.08,lp:o.lp||1800,q:2,vib:5,vibD:f*.005,delay:o.delay||0});},
  organ(f,d=.6,o={}){const p=(o.peak||1)*1.8;tone({type:'square',f,peak:.05*p,dur:d,att:.02,sus:true,rel:.08,lp:2200,delay:o.delay||0});tone({f:f/2,peak:.1*p,dur:d,att:.02,sus:true,rel:.08,delay:o.delay||0});tone({f:f*2,peak:.04*p,dur:d,att:.02,sus:true,rel:.08,delay:o.delay||0});},
  piano(f,d=1.2,v=.3,o={}){tone({type:'triangle',f,peak:v,dur:d,delay:o.delay||0,filt:o.filt});tone({f:f*2,peak:v*.35,dur:d*.5,delay:o.delay||0,filt:o.filt});tone({f:f*3,peak:v*.12,dur:d*.3,delay:o.delay||0,filt:o.filt});noise('bandpass',2500,1,v*.25,.02,o.delay||0);},
  membrane(f=90,peak=.8,delay=0){tone({f:f*1.8,f1:f,glide:.05,peak,dur:.4,delay});noise('lowpass',700,1,peak*.35,.06,delay);},
  kick(delay=0,p=.9){tone({f:150,f1:42,glide:.12,peak:p,dur:.32,delay});},
  snare(delay=0,p=.5){noise('highpass',1400,.7,p,.16,delay);tone({type:'triangle',f:190,f1:150,peak:p*.6,dur:.08,delay});},
  hat(delay=0,open=false,p=.22){noise('highpass',7500,.7,p,open?.18:.035,delay);},
  shaker(delay=0,p=.15){noise('bandpass',5000,1.5,p,.06,delay,{att:.02});},
  tap(delay=0,p=.2){noise('bandpass',2500,2,p,.02,delay);},
  thud(delay=0,p=.7){tone({f:90,f1:50,peak:p,dur:.2,delay});noise('lowpass',500,1,p*.5,.08,delay);},
  applause(d=3,dens=40){for(let i=0;i<d*dens;i++)noise('bandpass',900+Math.random()*1800,1.2,.12+Math.random()*.15,.03,Math.random()*d);},
  bell(f,d=2.5,p=.25,delay=0){[[1,1],[2,.5],[2.4,.35],[3,.25],[4.2,.15]].forEach(([k,a])=>tone({f:f*k,peak:p*a,dur:d/Math.sqrt(k),delay}));}
};

/* ---------- reproductor ---------- */
function step(key,n,fn){if(evt[key]!==n){evt[key]=n;if(playing&&!muted)fn();}}
let SCENES=[],TOTAL=0,T=0,last=0,curScene=-1,shownLen=-1;
const cap=document.getElementById('cap'),titleEl=document.getElementById('title'),segs=document.getElementById('segs'),pp=document.getElementById('pp'),mu=document.getElementById('mu');
function jump(i){T=SCENES.slice(0,i).reduce((a,s)=>a+s.dur,0);evt={};curScene=-1;}
function iniciar(cfg){
  SCENES=cfg.escenas;TOTAL=SCENES.reduce((a,s)=>a+s.dur,0);
  document.title=`Origen de la Música · Cap. ${cfg.num}`;
  document.getElementById('h1').textContent=`EL ORIGEN DE LA MÚSICA · CAPÍTULO ${cfg.num}`;
  document.getElementById('go').textContent=`▶ VER CAPÍTULO ${cfg.num}`;
  const nav=document.getElementById('nav');
  nav.innerHTML=(cfg.prev?`<a href="${cfg.prev}">◀ CAP. ${cfg.num-1}</a>`:'<a class="off">-</a>')+'<a href="index.html">ÍNDICE</a>'+(cfg.next?`<a href="${cfg.next}">CAP. ${cfg.num+1} ▶</a>`:'<a class="off">-</a>');
  SCENES.forEach((s,i)=>{const d=document.createElement('div');d.className='seg';d.title=s.name;d.innerHTML='<i></i>';d.onclick=()=>jump(i);segs.appendChild(d);});
  requestAnimationFrame(frame);
}
document.getElementById('go').onclick=()=>{initAudio();AC.resume();document.getElementById('start').remove();playing=true;curScene=-1;};
pp.onclick=()=>{if(!AC)return;if(T>=TOTAL-.01)jump(0);playing=!playing;pp.textContent=playing?'❚❚':'▶';};
document.getElementById('rs').onclick=()=>{jump(0);if(AC){playing=true;pp.textContent='❚❚';}};
mu.onclick=()=>{muted=!muted;mu.textContent='SONIDO: '+(muted?'NO':'SÍ');};
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();pp.click();}});

function frame(ts){
  const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  if(playing){T+=dt;if(T>=TOTAL){T=TOTAL-.001;playing=false;pp.textContent='▶';}}
  let acc=0,i=0;while(i<SCENES.length-1&&T>=acc+SCENES[i].dur){acc+=SCENES[i].dur;i++;}
  const sc=SCENES[i],st=T-acc;
  if(i!==curScene){
    curScene=i;shownLen=-1;
    titleEl.querySelector('.a').innerHTML=sc.title?sc.title[0]:'';titleEl.querySelector('.b').innerHTML=sc.title?sc.title[1]:'';
    setEco(...(sc.eco||[0]));setTint(...(sc.tint||[]));
  }
  sc.draw(st);
  if(playing&&!muted&&sc.amb)sc.amb(dt,st);
  const fade=Math.max(0,1-st/.6,1-(sc.dur-st)/.6);
  if(fade>0)shade(fade);
  titleEl.style.opacity=sc.title?Math.max(0,Math.min(1,(st-(i?3.5:.8))/.8,(sc.dur-st-.6)/.6)):0;
  const len=Math.min(sc.text.length,Math.floor(st*38));
  if(len!==shownLen){shownLen=len;cap.textContent=sc.text.slice(0,len);}
  [...segs.children].forEach((d,k)=>{const a=SCENES.slice(0,k).reduce((x,s)=>x+s.dur,0);d.firstChild.style.transform=`scaleX(${clamp((T-a)/SCENES[k].dur)})`;});
  requestAnimationFrame(frame);
}
const fireAmb=(dt)=>{if(Math.random()<dt*3)SND.crackle();};
