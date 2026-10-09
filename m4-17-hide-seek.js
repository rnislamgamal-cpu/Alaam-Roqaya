import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,observerBusy=false,startBusy=false,answerBusy=false;
const TRIES=4;

const SCENES={
 house:{cols:4,spots:["door","tv","books","plant","vase","box","bag","basket","bath","tools","luggage","cart"]},
 garden:{cols:4,spots:["tree","pine","sun","mush","rock","bucket","home","fount","mail","flower","herb","hut"]}
};
const ITEMS=new Set(["1f511","1f48e","1f381","1f451","1f48d","1f3c6","1f9f8","1fa99"]);

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');
const other=p=>p==='host'?'guest':'host';

function cleanup(){
  try{unsubMeta?.()}catch{};try{unsubState?.()}catch{};
  unsubMeta=unsubState=null;meta=null;shared=null;role='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
  catch(e){console.warn('hide seek sync',e)}
}
function fresh(roundId,hider='host',roundNo=1,scores={host:0,guest:0}){
  return {
    v:1,roundId,roundNo,hider,phase:'hiding',scene:null,item:null,tries:TRIES,
    guesses:[],result:null,reveal:null,scores:{host:Number(scores.host)||0,guest:Number(scores.guest)||0},
    secretMissing:false,seq:0
  };
}
function validSpot(scene,spot){return Boolean(SCENES[scene]?.spots.includes(spot))}
function hintFor(scene,a,b){
  const S=SCENES[scene];if(!S)return'cold';
  const ia=S.spots.indexOf(a),ib=S.spots.indexOf(b);
  if(ia<0||ib<0)return'cold';
  const x1=ia%S.cols,y1=Math.floor(ia/S.cols),x2=ib%S.cols,y2=Math.floor(ib/S.cols),d=Math.hypot(x1-x2,y1-y2);
  return d===0?'found':d<1.5?'hot':d<2.5?'warm':'cold';
}
async function startGame(){
  if(startBusy||role!=='host'||!meta?.guestUid)return;
  startBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='lobby')return;
      const rr=(Number(old.round)||0)+1;
      return {...old,game:'hide-seek-v1',phase:'playing',round:rr,result:null,hideSeekV1:fresh(rr,'host',1)};
    });
  }finally{startBusy=false}
}
async function place(scene,item,roundId){
  const g=shared?.hideSeekV1;
  if(shared?.game!=='hide-seek-v1'||!g||g.phase!=='hiding'||g.hider!==role||Number(g.roundId)!==Number(roundId))return;
  if(!SCENES[scene]||!ITEMS.has(item))return;
  await mutate(old=>{
    const h=old.hideSeekV1;
    if(old.game!=='hide-seek-v1'||!h||h.phase!=='hiding'||h.hider!==role||Number(h.roundId)!==Number(roundId))return;
    return {...old,hideSeekV1:{...h,phase:'seeking',scene,item,guesses:[],result:null,reveal:null,secretMissing:false}};
  });
}
async function guess(spot,roundId){
  await mutate(old=>{
    const h=old.hideSeekV1;
    if(old.game!=='hide-seek-v1'||old.phase!=='playing'||!h||h.phase!=='seeking'||h.hider===role||Number(h.roundId)!==Number(roundId))return;
    if(!validSpot(h.scene,spot))return;
    const gs=Array.isArray(h.guesses)?[...h.guesses]:[];
    if(gs.length>=Number(h.tries||TRIES)||gs.some(x=>!x.hint)||gs.some(x=>x.spot===spot))return;
    const seq=(Number(h.seq)||0)+1;
    gs.push({seq,spot,by:role,hint:null,t:Date.now()});
    return {...old,hideSeekV1:{...h,seq,guesses:gs,secretMissing:false}};
  });
}
async function answer(secret,roundId){
  if(answerBusy)return;
  const g=shared?.hideSeekV1;
  if(shared?.game!=='hide-seek-v1'||!g||g.phase!=='seeking'||g.hider!==role||Number(g.roundId)!==Number(roundId))return;
  if(!validSpot(g.scene,secret))return;
  answerBusy=true;
  try{
    await mutate(old=>{
      const h=old.hideSeekV1;
      if(old.game!=='hide-seek-v1'||!h||h.phase!=='seeking'||h.hider!==role||Number(h.roundId)!==Number(roundId))return;
      const gs=Array.isArray(h.guesses)?h.guesses.map(x=>({...x})):[];
      const idx=gs.findIndex(x=>!x.hint);
      if(idx<0)return;
      const q=gs[idx],hint=hintFor(h.scene,secret,q.spot),found=hint==='found';
      q.hint=hint;const done=found||gs.length>=Number(h.tries||TRIES);
      const hs={...(h.scores||{host:0,guest:0})},global={...(old.scores||{host:0,guest:0})};
      let result=null,reveal=null,phase='seeking';
      if(done){
        phase='done';result=found?'found':'failed';reveal=secret;
        const winner=found?other(h.hider):h.hider;
        const pts=found?2:1;
        hs[winner]=(Number(hs[winner])||0)+pts;
        global[winner]=(Number(global[winner])||0)+pts;
      }
      return {...old,scores:global,hideSeekV1:{...h,phase,guesses:gs,result,reveal,scores:hs,secretMissing:false}};
    });
  }finally{answerBusy=false}
}
async function secretMissing(roundId){
  await mutate(old=>{
    const h=old.hideSeekV1;
    if(old.game!=='hide-seek-v1'||!h||h.phase!=='seeking'||h.hider!==role||Number(h.roundId)!==Number(roundId)||h.secretMissing)return;
    return {...old,hideSeekV1:{...h,secretMissing:true}};
  });
}
async function retryHide(roundId){
  const g=shared?.hideSeekV1;
  if(shared?.game!=='hide-seek-v1'||!g||g.hider!==role||Number(g.roundId)!==Number(roundId))return;
  await mutate(old=>{
    const h=old.hideSeekV1;
    if(old.game!=='hide-seek-v1'||!h||h.hider!==role||Number(h.roundId)!==Number(roundId))return;
    return {...old,hideSeekV1:{...h,phase:'hiding',scene:null,item:null,guesses:[],result:null,reveal:null,secretMissing:false}};
  });
}
async function nextRound(roundId){
  if(role!=='host')return;
  await mutate(old=>{
    const h=old.hideSeekV1;
    if(old.game!=='hide-seek-v1'||!h||h.phase!=='done'||Number(h.roundId)!==Number(roundId))return;
    const rr=(Number(old.round)||0)+1;
    return {...old,phase:'playing',round:rr,result:null,hideSeekV1:fresh(rr,other(h.hider||'host'),Number(h.roundNo||1)+1,h.scores)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>old.game==='hide-seek-v1'?{...old,game:'lobby',phase:'lobby'}:old);
}

function cardMarkup(){
  const disabled=role!=='host'||!meta?.guestUid?'disabled':'';
  return `<button class="game-choice rg-game-tile rg-cat-games roqaya-hide-seek-card" data-hide-seek-start data-rg-category="games" ${disabled}>
    <span class="game-card-art">
      <svg class="ic" viewBox="0 0 64 64" aria-hidden="true">
        <circle class="fb" cx="24" cy="26" r="15"></circle>
        <path class="fw" d="M12 26q12-13 24 0q-12 13-24 0z"></path>
        <circle class="fk" cx="24" cy="26" r="5" stroke="none"></circle>
        <path class="sk" d="M35 38l17 17"></path>
        <path class="sn" d="M35 38l17 17"></path>
        <path class="fy" d="M43 10l5 10h-10z"></path>
        <circle class="fr" cx="48" cy="13" r="8"></circle>
      </svg>
    </span>
    <strong class="rg-game-label">خبّي ودوّر</strong>
    <small>خبّي حاجة • تلميحات قريب وبعيد</small>
  </button>`;
}
function ensureLobbyCard(){
  if(shared?.game!=='lobby')return;
  const grid=screen?.querySelector('.lobby-game-grid');if(!grid)return;
  let card=grid.querySelector('.roqaya-hide-seek-card');
  if(!card){grid.insertAdjacentHTML('beforeend',cardMarkup());card=grid.querySelector('.roqaya-hide-seek-card')}
  const disabled=role!=='host'||!meta?.guestUid;
  if(card&&card.disabled!==disabled)card.disabled=disabled;
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='hide-seek-v1-overlay';overlay.className='hide-seek-v1-overlay';overlay.hidden=true;
  overlay.innerHTML='<iframe class="hide-seek-v1-frame" src="hide-seek-game.html?v=1" title="خبّي ودوّر" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);
  return overlay;
}
function sendConfig(){
  const h=shared?.hideSeekV1;
  if(!frame?.contentWindow||shared?.game!=='hide-seek-v1'||!h||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-hide-config',config:{
    role,childName:childName(),roundId:Number(h.roundId)||Number(shared.round)||0,roundNo:Number(h.roundNo)||1,hider:h.hider||'host',
    phase:h.phase||'hiding',scene:h.scene||null,item:h.item||null,guesses:Array.isArray(h.guesses)?h.guesses:[],
    result:h.result||null,reveal:h.reveal||null,tries:Number(h.tries)||TRIES,scores:h.scores||{host:0,guest:0},
    secretMissing:Boolean(h.secretMissing)
  }},location.origin);
}
function activate(){
  ensureOverlay();document.body.classList.add('hide-seek-v1-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig();
}
function deactivate(){
  document.body.classList.remove('hide-seek-v1-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true;
}
function syncUi(){
  if(shared?.game==='lobby'){deactivate();ensureLobbyCard();return}
  if(shared?.game==='hide-seek-v1'&&shared?.hideSeekV1&&role){activate();return}
  deactivate();
}
function bindRoom(){
  const next=currentRoom();
  if(next===roomCode&&unsubMeta&&unsubState)return;
  cleanup();roomCode=next;
  if(!db||!uid||!roomCode){syncUi();return}
  unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{meta=snap.val();updateRole();syncUi()});
  unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{shared=snap.val();updateRole();syncUi()});
}

document.addEventListener('click',e=>{
  const card=e.target.closest?.('[data-hide-seek-start]');
  if(!card)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  startGame();
},true);

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-hide-ready'){sendConfig();return}
  if(d.type==='roqaya-hide-place'){place(String(d.scene||''),String(d.item||''),Number(d.roundId));return}
  if(d.type==='roqaya-hide-guess'){guess(String(d.spot||''),Number(d.roundId));return}
  if(d.type==='roqaya-hide-answer'){answer(String(d.secret||''),Number(d.roundId));return}
  if(d.type==='roqaya-hide-secret-missing'){secretMissing(Number(d.roundId));return}
  if(d.type==='roqaya-hide-retry'){retryHide(Number(d.roundId));return}
  if(d.type==='roqaya-hide-next'){nextRound(Number(d.roundId));return}
  if(d.type==='roqaya-hide-city'){goCity();return}
});

const observer=new MutationObserver(()=>{
  if(observerBusy)return;observerBusy=true;
  queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')ensureLobbyCard();if(shared?.game==='hide-seek-v1'&&shared?.hideSeekV1)sendConfig()});
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
