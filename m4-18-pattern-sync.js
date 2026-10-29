import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,observerBusy=false,startBusy=false;
const ROUNDS=10,LIVES=3;

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');

function seed(){
  try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]&0x7fffffff}catch{return Math.floor(Math.random()*0x7fffffff)}
}
function freshPlayer(){return{score:0,round:1,lives:LIVES,streak:0,correct:0,done:false}}
function freshMatch(roundId){return{v:1,roundId,seed:seed(),rounds:ROUNDS,maxLives:LIVES,players:{host:freshPlayer(),guest:freshPlayer()},awarded:false,winner:null}}
function cleanup(){
  try{unsubMeta?.()}catch{};try{unsubState?.()}catch{};
  unsubMeta=unsubState=null;meta=null;shared=null;role='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
  catch(e){console.warn('pattern v2 sync',e)}
}
async function startMatch(){
  if(startBusy||role!=='host'||!meta?.guestUid)return;
  startBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='lobby')return;
      const rr=(Number(old.round)||0)+1;
      return {...old,game:'pattern-v2',phase:'playing',round:rr,result:null,patternV2:freshMatch(rr)};
    });
  }finally{startBusy=false}
}
function sanitizeProgress(p){
  return{
    score:Math.max(0,Math.floor(Number(p?.score)||0)),
    round:Math.max(1,Math.min(ROUNDS,Math.floor(Number(p?.round)||1))),
    lives:Math.max(0,Math.min(LIVES,Math.floor(Number(p?.lives)??LIVES))),
    streak:Math.max(0,Math.floor(Number(p?.streak)||0)),
    correct:Math.max(0,Math.min(ROUNDS,Math.floor(Number(p?.correct)||0))),
    done:Boolean(p?.done)
  };
}
async function progress(p,roundId){
  const clean=sanitizeProgress(p);
  await mutate(old=>{
    const g=old.patternV2;
    if(old.game!=='pattern-v2'||!g||Number(g.roundId)!==Number(roundId))return;
    const players={...(g.players||{}),[role]:clean};
    let awarded=Boolean(g.awarded),winner=g.winner||null;
    const scores={...(old.scores||{host:0,guest:0})};
    let phase=old.phase,result=old.result||null;
    if(players.host?.done&&players.guest?.done&&!awarded){
      const hs=Number(players.host.score)||0,gs=Number(players.guest.score)||0;
      winner=hs===gs?'draw':hs>gs?'host':'guest';awarded=true;phase='finished';result=winner;
      if(winner==='draw'){
        scores.host=(Number(scores.host)||0)+1;scores.guest=(Number(scores.guest)||0)+1;
      }else scores[winner]=(Number(scores[winner])||0)+3;
    }
    return {...old,scores,phase,result,patternV2:{...g,players,awarded,winner}};
  });
}
async function newMatch(roundId){
  if(role!=='host')return;
  await mutate(old=>{
    const g=old.patternV2;
    if(old.game!=='pattern-v2'||!g||Number(g.roundId)!==Number(roundId)||!g.players?.host?.done||!g.players?.guest?.done)return;
    const rr=(Number(old.round)||0)+1;
    return {...old,phase:'playing',round:rr,result:null,patternV2:freshMatch(rr)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>old.game==='pattern-v2'?{...old,game:'lobby',phase:'lobby'}:old);
}
function upgradeCard(){
  const card=screen?.querySelector('.game-card-pattern');if(!card)return;
  card.setAttribute('data-pattern-v2-start','');
  const title=card.querySelector('strong'),desc=card.querySelector('small');
  if(title&&title.textContent!=='أكمل النمط')title.textContent='أكمل النمط';
  const wanted='١٠ ألغاز • ٣ محاولات • سباق بينكم';
  if(desc&&desc.textContent!==wanted)desc.textContent=wanted;
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='pattern-v2-overlay';overlay.className='pattern-v2-overlay';overlay.hidden=true;
  overlay.innerHTML='<iframe class="pattern-v2-frame" src="pattern-game.html?v=1" title="أكمل النمط" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);
  return overlay;
}
function sendConfig(){
  const g=shared?.patternV2;
  if(!frame?.contentWindow||shared?.game!=='pattern-v2'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-pattern-config',config:{
    role,childName:childName(),roundId:Number(g.roundId)||Number(shared.round)||0,seed:Number(g.seed)||1,
    rounds:Number(g.rounds)||ROUNDS,maxLives:Number(g.maxLives)||LIVES,players:g.players||{host:freshPlayer(),guest:freshPlayer()},
    winner:g.winner||null,awarded:Boolean(g.awarded)
  }},location.origin);
}
function activate(){
  ensureOverlay();document.body.classList.add('pattern-v2-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig();
}
function deactivate(){
  document.body.classList.remove('pattern-v2-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true;
}
function syncUi(){
  if(shared?.game==='lobby'){deactivate();upgradeCard();return}
  if(shared?.game==='pattern-v2'&&shared?.patternV2&&role){activate();return}
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
  const card=e.target.closest?.('.game-card-pattern,[data-pattern-v2-start]');
  if(!card)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  startMatch();
},true);

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-pattern-ready'){sendConfig();return}
  if(d.type==='roqaya-pattern-progress'){progress(d.progress||{},Number(d.roundId));return}
  if(d.type==='roqaya-pattern-new'){newMatch(Number(d.roundId));return}
  if(d.type==='roqaya-pattern-city'){goCity();return}
});

const observer=new MutationObserver(()=>{
  if(observerBusy)return;observerBusy=true;
  queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')upgradeCard();if(shared?.game==='pattern-v2'&&shared?.patternV2)sendConfig()});
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
