/* M4.24 — «اقلب بالترتيب» (GAME_RULES §14)
 * - Seed مشترك → نفس توزيع الكروت على الجهازين.
 * - Firebase يحدد الدور؛ الخصم يشاهد فقط ولا يتفاعل.
 * - اختيار غلط → الكروت المفتوحة ترجع تتقلب + انتقال الدور.
 * - أول من يفتح السلسلة كاملة يفوز بالجولة.
 */
import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='',serverOffset=0;
let unsubMeta=null,unsubState=null,unsubOffset=null,overlay=null,frame=null,observerBusy=false,startBusy=false;
const WIN_TARGET=3;

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');
const now=()=>Date.now()+(Number(serverOffset)||0);
const other=p=>p==='host'?'guest':'host';

function seed(){try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]&0x7fffffff}catch{return Math.floor(Math.random()*0x7fffffff)}}
function countFor(n){return[6,9,12,16,20,25][Math.min(n-1,5)]||25}
function peekMs(n){return Math.max(1400,4200-n*350)}
function newRound(n,turn){
  return{n,seed:seed(),count:countFor(n),peekAt:now()+peekMs(n),phase:'play',next:1,opened:[],turn:turn||'host',winner:null,doneAt:0};
}
function freshMatch(roundId){return{v:1,roundId,winTarget:WIN_TARGET,scores:{host:0,guest:0},champion:null,round:newRound(1,'host')}}

function cleanup(){
  for(const fn of [unsubMeta,unsubState,unsubOffset])try{fn?.()}catch{}
  unsubMeta=unsubState=unsubOffset=null;meta=null;shared=null;role='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
  catch(e){console.warn('seq sync',e)}
}
async function startMatch(){
  if(startBusy||role!=='host'||!meta?.guestUid)return;
  startBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='lobby')return;
      const rr=(Number(old.round)||0)+1;
      return {...old,game:'sequence-v1',phase:'playing',round:rr,result:null,sequenceV1:freshMatch(rr)};
    });
  }finally{startBusy=false}
}
/* card chosen, and it is the correct next number */
async function openCard(index,roundId){
  if(!Number.isInteger(index))return;
  await mutate(old=>{
    const g=old.sequenceV1,r=g?.round;
    if(old.game!=='sequence-v1'||old.phase!=='playing'||!g||g.champion||!r)return;
    if(Number(g.roundId)!==Number(roundId)||r.phase!=='play'||r.turn!==role||r.winner)return;
    const count=Number(r.count)||countFor(r.n),i=Number(index);
    if(i<0||i>=count)return;
    /* رقم الكارت في الموضع i مشتق من الـseed → الطرفان يتفقان */
    if(cardNumber(r.seed,r.n,i)!==Number(r.next))return;
    const opened=[...(r.opened||[]),i];
    const next=Number(r.next)+1;
    if(next>count){
      /* أكمل السلسلة → يفوز بالجولة */
      const scores={...(g.scores||{host:0,guest:0})},global={...(old.scores||{host:0,guest:0})};
      scores[role]=(Number(scores[role])||0)+1;global[role]=(Number(global[role])||0)+1;
      const champion=scores[role]>=Number(g.winTarget||WIN_TARGET)?role:null;
      return {...old,scores:global,phase:champion?'finished':'playing',...(champion?{result:champion}:{}),
        sequenceV1:{...g,scores,champion,round:{...r,opened,next,phase:'won',winner:role,doneAt:now()}}};
    }
    return {...old,sequenceV1:{...g,round:{...r,opened,next}}};
  });
}
/* wrong card: flip the opened cards back and hand the turn over */
async function wrongCard(index,roundId){
  if(!Number.isInteger(index))return;
  await mutate(old=>{
    const g=old.sequenceV1,r=g?.round;
    if(old.game!=='sequence-v1'||old.phase!=='playing'||!g||g.champion||!r)return;
    if(Number(g.roundId)!==Number(roundId)||r.phase!=='play'||r.turn!==role||r.winner)return;
    const count=Number(r.count)||countFor(r.n),i=Number(index);
    if(i<0||i>=count)return;
    if(cardNumber(r.seed,r.n,i)===Number(r.next))return;
    return {...old,sequenceV1:{...g,round:{...r,opened:[],next:1,turn:other(role),phase:'play'}}};
  });
}
async function rematch(roundId){
  if(role!=='host')return;
  await mutate(old=>{
    const g=old.sequenceV1;
    if(old.game!=='sequence-v1'||!g||!g.champion||Number(g.roundId)!==Number(roundId))return;
    const rr=(Number(old.round)||0)+1;
    return {...old,phase:'playing',round:rr,result:null,sequenceV1:freshMatch(rr)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>old.game==='sequence-v1'?{...old,game:'lobby',phase:'lobby'}:old);
}
/* host advances when a round was won and everyone has seen it */
async function advance(roundId){
  if(role!=='host')return;
  await mutate(old=>{
    const g=old.sequenceV1,r=g?.round;
    if(old.game!=='sequence-v1'||old.phase!=='playing'||!g||g.champion||!r)return;
    if(Number(g.roundId)!==Number(roundId)||r.phase!=='won')return;
    if(now()<Number(r.doneAt||0)+1800)return;
    const turn=other(r.winner||'host');
    return {...old,sequenceV1:{...g,round:newRound(Number(r.n)+1,turn)}};
  });
}

/* ---------- board derivation (MUST match sequence-game.html) ---------- */
const EMOJI_COUNT=24;
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuf(R,a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function positions(seed,n){
  const R=rng(seed),count=countFor(n);
  /* consume the same stream as the page: faces slice, then position shuffle */
  shuf(R,[...Array(EMOJI_COUNT)].map((_,i)=>i)).slice(0,count);
  const order=shuf(R,[...Array(count)].map((_,i)=>i));
  /* order[i] = position index receiving card i (card i holds number i+1) */
  const numAtPosition=new Array(count);
  for(let i=0;i<count;i++)numAtPosition[order[i]]=i+1;
  return numAtPosition;
}
function cardNumber(seed,n,index){return positions(seed,n)[index]}

/* ---------- UI ---------- */
function upgradeCard(){
  const card=screen?.querySelector('.game-card-memory');  /* أضعها بجانب الذاكرة في قسم الألعاب */
  if(card)card.setAttribute('data-seq-v1-anchor','');
}
function cardMarkup(){
  const disabled=role!=='host'||!meta?.guestUid?'disabled':'';
  return `<button class="game-choice rg-game-tile rg-cat-games roqaya-sequence-card" data-seq-v1-start data-rg-category="games" ${disabled}>
    <span class="game-card-art">
      <svg class="ic" viewBox="0 0 64 64" aria-hidden="true">
        <rect class="cb a" x="6" y="10" width="22" height="30" rx="5"></rect>
        <rect class="cb b" x="21" y="18" width="22" height="30" rx="5"></rect>
        <rect class="cb c" x="36" y="10" width="22" height="30" rx="5"></rect>
        <path class="ar1" d="M14 60h36" stroke-width="3" stroke-linecap="round"></path>
      </svg>
    </span>
    <strong class="rg-game-label">اقلب بالترتيب</strong>
    <small>1 ثم 2 ثم 3… بالترتيب الحفظ والسرعة</small>
  </button>`;
}
function ensureLobbyCard(){
  if(shared?.game!=='lobby')return;
  const grid=screen?.querySelector('.lobby-game-grid');if(!grid)return;
  let card=grid.querySelector('.roqaya-sequence-card');
  if(!card){grid.insertAdjacentHTML('beforeend',cardMarkup());card=grid.querySelector('.roqaya-sequence-card')}
  const disabled=role!=='host'||!meta?.guestUid;
  if(card&&card.disabled!==disabled)card.disabled=disabled;
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='sequence-v1-overlay';overlay.className='sequence-v1-overlay';overlay.hidden=true;
  overlay.innerHTML='<iframe class="sequence-v1-frame" src="sequence-game.html?v=1" title="اقلب بالترتيب" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);
  return overlay;
}
function sendConfig(){
  const g=shared?.sequenceV1;
  if(!frame?.contentWindow||shared?.game!=='sequence-v1'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-seq-config',config:{
    role,childName:childName(),childAge:Number(shared?.childAge)||6,serverOffset:Number(serverOffset)||0,
    roundId:Number(g.roundId)||Number(shared.round)||0,winTarget:Number(g.winTarget)||WIN_TARGET,
    scores:g.scores||{host:0,guest:0},champion:g.champion||null,round:g.round||null
  }},location.origin);
}
function activate(){
  ensureOverlay();document.body.classList.add('sequence-v1-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig();
}
function deactivate(){
  document.body.classList.remove('sequence-v1-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true;
}
function syncUi(){
  if(shared?.game==='lobby'){deactivate();ensureLobbyCard();return}
  if(shared?.game==='sequence-v1'&&shared?.sequenceV1&&role){activate();return}
  deactivate();
}
function bindRoom(){
  const next=currentRoom();
  if(next===roomCode&&unsubMeta&&unsubState)return;
  cleanup();roomCode=next;
  if(!db||!uid||!roomCode){syncUi();return}
  unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),s=>{meta=s.val();updateRole();syncUi()});
  unsubState=onValue(ref(db,`rooms/${roomCode}/state`),s=>{shared=s.val();updateRole();syncUi()});
  unsubOffset=onValue(ref(db,'.info/serverTimeOffset'),s=>{serverOffset=Number(s.val())||0;sendConfig()});
}

document.addEventListener('click',e=>{
  const card=e.target.closest?.('[data-seq-v1-start]');
  if(!card)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  startMatch();
},true);

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-seq-ready'){sendConfig();return}
  if(d.type==='roqaya-seq-open'){openCard(Number(d.index),Number(d.roundId));return}
  if(d.type==='roqaya-seq-wrong'){wrongCard(Number(d.index),Number(d.roundId));return}
  if(d.type==='roqaya-seq-rematch'){rematch(Number(d.roundId));return}
  if(d.type==='roqaya-seq-city'){goCity();return}
});

setInterval(()=>{
  const g=shared?.sequenceV1,r=g?.round;
  if(role==='host'&&shared?.game==='sequence-v1'&&shared?.phase==='playing'&&g&&!g.champion&&r&&r.phase==='won')advance(Number(g.roundId));
},400);

const observer=new MutationObserver(()=>{
  if(observerBusy)return;observerBusy=true;
  queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')ensureLobbyCard();if(shared?.game==='sequence-v1'&&shared?.sequenceV1)sendConfig()});
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
