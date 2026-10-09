import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='',serverOffset=0;
let unsubMeta=null,unsubState=null,unsubOffset=null,overlay=null,frame=null,observerBusy=false,startBusy=false,advanceBusy=false;
const WIN_SCORE=7,WRONG_LOCK_MS=1500;
const G={
  animals:["1f436","1f431","1f42d","1f439","1f430","1f98a","1f43b","1f43c","1f428","1f42f","1f981","1f42e","1f437","1f438","1f435","1f434","1f411","1f418"],
  birds:["1f414","1f427","1f426","1f986","1f989","1f985","1f99c","1f9a2","1f9a9","1f54a"],
  balls:["26bd","1f3c0","1f3c8","26be","1f3be","1f3d0"],
  fruits:["1f34e","1f34a","1f34b","1f34c","1f349","1f347","1f353","1f352","1f351","1f95d","1f34d"],
  vehicles:["1f697","1f695","1f68c","1f693","1f691","1f692","1f69c"],
  sea:["1f41f","1f420","1f421","1f42c","1f433","1f988","1f419"],
  insects:["1f41d","1f41e","1f98b","1f41c","1f41b"]
};
const LINKS=[["animals","balls"],["birds","animals"],["fruits","balls"],["sea","birds"],["insects","fruits"],["vehicles","animals"],["animals","fruits"]];
const H={
  desert:["1f335","1f42a","1f3dc","1f982","1f98e"],forest:["1f332","1f333","1f344","1f98c","1f989"],
  arctic:["2744","26c4","1f9ca","1f427","2603"],ocean:["1f41f","1f420","1f419","1f980","1f42c"],
  tropic:["1f334","1f965","1f99c","1f34d","1f412"]
};
const COLORFUL=[...G.fruits,...G.balls,...G.vehicles,"1f420","1f98b"];
const ASYM=[...G.vehicles,...G.sea,"1f41f","1f986","1f426"];
const MODES=["category","habitat","color","mirror"];

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');
const now=()=>Date.now()+(Number(serverOffset)||0);
const timeFor=n=>Math.max(8000,16000-n*600);
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function build(seed,n){
  const R=rng(seed),pick=a=>a[Math.floor(R()*a.length)];
  const size=Math.min(4+Math.floor((n-1)/2),6),total=size*size,mode=pick(MODES),delta=Math.max(14,70-n*6)*(R()<.5?-1:1);
  let main=()=>"",odd="",base=null;
  if(mode==="category"){const l=pick(LINKS);main=()=>pick(G[l[0]]);odd=pick(G[l[1]])}
  else if(mode==="habitat"){const k=Object.keys(H),a=pick(k),b=pick(k.filter(x=>x!==a));main=()=>pick(H[a]);odd=pick(H[b])}
  else{base=pick(mode==="color"?COLORFUL:ASYM);main=()=>base;odd=base}
  const cells=[];
  for(let i=0;i<total;i++){
    const c={c:main(),rot:(R()-.5)*16,sc:.86+R()*.2,f:"",flip:false};
    if(mode==="color")c.f=`hue-rotate(${((R()-.5)*Math.abs(delta)*.5).toFixed(1)}deg)`;
    cells.push(c);
  }
  const o=Math.floor(R()*total);cells[o].c=odd;
  if(mode==="color")cells[o].f=`hue-rotate(${delta}deg)`;
  if(mode==="mirror")cells[o].flip=true;
  return{size,cells,odd:o,mode};
}
function seed(){
  try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]&0x7fffffff}catch{return Math.floor(Math.random()*0x7fffffff)}
}
function newRound(n){return{n,seed:seed(),startAt:now()+3000,winner:null,doneAt:0}}
function freshMatch(roundId){return{v:1,roundId,winScore:WIN_SCORE,scores:{host:0,guest:0},champion:null,round:newRound(1)}}
function cleanup(){
  for(const fn of [unsubMeta,unsubState,unsubOffset])try{fn?.()}catch{}
  unsubMeta=unsubState=unsubOffset=null;meta=null;shared=null;role='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
  catch(e){console.warn('odd race sync',e)}
}
async function startMatch(){
  if(startBusy||role!=='host'||!meta?.guestUid)return;
  startBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='lobby')return;
      const rr=(Number(old.round)||0)+1;
      return {...old,game:'odd-v2',phase:'playing',round:rr,result:null,oddV2:freshMatch(rr)};
    });
  }finally{startBusy=false}
}
async function claim(index,roundNo,roundId){
  if(!Number.isInteger(index))return;
  await mutate(old=>{
    const g=old.oddV2,r=g?.round;
    if(old.game!=='odd-v2'||old.phase!=='playing'||!g||g.champion||!r||r.winner||r.n!==roundNo||Number(g.roundId)!==Number(roundId))return;
    const t=now(),end=r.startAt+timeFor(r.n);
    if(t<r.startAt||t>end)return;
    if(build(r.seed,r.n).odd!==index)return;
    const scores={...(g.scores||{host:0,guest:0})},global={...(old.scores||{host:0,guest:0})};
    scores[role]=(Number(scores[role])||0)+1;global[role]=(Number(global[role])||0)+1;
    const champion=scores[role]>=Number(g.winScore||WIN_SCORE)?role:null;
    return {...old,scores:global,phase:champion?'finished':'playing',...(champion?{result:champion}:{}),oddV2:{
      ...g,scores,champion,round:{...r,winner:role,doneAt:t}
    }};
  });
}
async function advance(roundNo){
  if(role!=='host'||advanceBusy)return;
  advanceBusy=true;
  try{
    await mutate(old=>{
      const g=old.oddV2,r=g?.round;
      if(old.game!=='odd-v2'||old.phase!=='playing'||!g||g.champion||!r||r.n!==roundNo)return;
      const t=now(),end=r.startAt+timeFor(r.n);
      const ready=(r.winner&&t>Number(r.doneAt||0)+1600)||(!r.winner&&t>end+400);
      if(!ready)return;
      return {...old,oddV2:{...g,round:newRound(r.n+1)}};
    });
  }finally{advanceBusy=false}
}
async function rematch(roundId){
  if(role!=='host')return;
  await mutate(old=>{
    const g=old.oddV2;
    if(old.game!=='odd-v2'||!g||!g.champion||Number(g.roundId)!==Number(roundId))return;
    const rr=(Number(old.round)||0)+1;
    return {...old,phase:'playing',round:rr,result:null,oddV2:freshMatch(rr)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>old.game==='odd-v2'?{...old,game:'lobby',phase:'lobby'}:old);
}

function upgradeCard(){
  const card=screen?.querySelector('.game-card-odd');if(!card)return;
  card.setAttribute('data-odd-v2-start','');
  const title=card.querySelector('strong'),desc=card.querySelector('small');
  if(title&&title.textContent!=='مين المختلف؟')title.textContent='مين المختلف؟';
  const wanted='سباق تركيز • أول واحد لـ ٧ نقاط';
  if(desc&&desc.textContent!==wanted)desc.textContent=wanted;
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='odd-v2-overlay';overlay.className='odd-v2-overlay';overlay.hidden=true;
  overlay.innerHTML='<iframe class="odd-v2-frame" src="odd-race-game.html?v=1" title="مين المختلف؟" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);
  return overlay;
}
function sendConfig(){
  const g=shared?.oddV2;
  if(!frame?.contentWindow||shared?.game!=='odd-v2'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-odd-config',config:{
    role,childName:childName(),roundId:Number(g.roundId)||Number(shared.round)||0,round:g.round||null,
    scores:g.scores||{host:0,guest:0},champion:g.champion||null,winScore:Number(g.winScore)||WIN_SCORE,
    serverOffset:Number(serverOffset)||0
  }},location.origin);
}
function activate(){
  ensureOverlay();document.body.classList.add('odd-v2-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig();
}
function deactivate(){
  document.body.classList.remove('odd-v2-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true;
}
function syncUi(){
  if(shared?.game==='lobby'){deactivate();upgradeCard();return}
  if(shared?.game==='odd-v2'&&shared?.oddV2&&role){activate();return}
  deactivate();
}
function bindRoom(){
  const next=currentRoom();
  if(next===roomCode&&unsubMeta&&unsubState)return;
  cleanup();roomCode=next;
  if(!db||!uid||!roomCode){syncUi();return}
  unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{meta=snap.val();updateRole();syncUi()});
  unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{shared=snap.val();updateRole();syncUi()});
  unsubOffset=onValue(ref(db,'.info/serverTimeOffset'),snap=>{serverOffset=Number(snap.val())||0;sendConfig()});
}

document.addEventListener('click',e=>{
  const card=e.target.closest?.('.game-card-odd,[data-odd-v2-start]');
  if(!card)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  startMatch();
},true);

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-odd-ready'){sendConfig();return}
  if(d.type==='roqaya-odd-claim'){claim(Number(d.index),Number(d.roundNo),Number(d.roundId));return}
  if(d.type==='roqaya-odd-rematch'){rematch(Number(d.roundId));return}
  if(d.type==='roqaya-odd-city'){goCity();return}
});

setInterval(()=>{
  const g=shared?.oddV2,r=g?.round;
  if(role==='host'&&shared?.game==='odd-v2'&&shared?.phase==='playing'&&g&&!g.champion&&r)advance(Number(r.n));
},350);

const observer=new MutationObserver(()=>{
  if(observerBusy)return;observerBusy=true;
  queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')upgradeCard();if(shared?.game==='odd-v2'&&shared?.oddV2)sendConfig()});
});
if(screen)observer.observe(screen,{childList:true,subtree:true});
addEventListener('hashchange',bindRoom);addEventListener('pageshow',()=>{bindRoom();syncUi()});

async function boot(){
  for(let i=0;i<120&&getApps().length===0;i++)await new Promise(r=>setTimeout(r,50));
  const app=getApps()[0];if(!app)return;
  auth=getAuth(app);db=getDatabase(app);
  onAuthStateChanged(auth,user=>{uid=user?.uid||'';bindRoom()});
  bindRoom();
}
boot();
