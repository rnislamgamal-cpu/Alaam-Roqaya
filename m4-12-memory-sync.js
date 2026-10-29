import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='',presence={};
let unsubMeta=null,unsubState=null,unsubPresence=null,overlay=null,frame=null,playerStatus=null,initBusy=false,hideTimer=null,scheduledWaitKey='',observerBusy=false;

const EMO=[...'🐶🐱🐭🐰🦊🐻🐼🐯🦁🐮🐷🐸🐵🐔🐧🦆🦉🐺🐴🦄🐝🦋🐢🐍🐙🦀🐠🐬🐘🦒🍎🍌🍇🍓🍉🍒🍍🥕🌽🍕⚽🚗🚁🚀🌈⭐🎈🎁🔔🎵'];
const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const other=p=>p==='host'?'guest':'host';
const childName=()=>String(shared?.childName||'رقية');

function shuffle(a){
  const x=[...a];
  for(let i=x.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [x[i],x[j]]=[x[j],x[i]];
  }
  return x;
}
function savedPairs(){
  try{
    const n=Number(localStorage.getItem('roqaya-memory-pairs'));
    return [2,3,4,6,8,10,12,16,20,24,30,40,50].includes(n)?n:6;
  }catch{return 6}
}
function deckFor(pairs){
  const picks=shuffle(EMO).slice(0,pairs);
  return shuffle(picks.flatMap(e=>[e,e]));
}
function freshMemory(roundId,pairs=savedPairs()){
  pairs=[2,3,4,6,8,10,12,16,20,24,30,40,50].includes(Number(pairs))?Number(pairs):6;
  return {
    v:2,roundId,pairs,deck:deckFor(pairs),revealed:[],matchedBy:{},
    turn:roundId%2===0?'guest':'host',scores:{host:0,guest:0},
    waiting:false,waitId:0,lastPicker:'',finished:false,result:null
  };
}
function cleanup(){
  try{unsubMeta?.()}catch{}
  try{unsubState?.()}catch{}
  try{unsubPresence?.()}catch{}
  unsubMeta=unsubState=unsubPresence=null;meta=null;shared=null;role='';presence={};
  clearTimeout(hideTimer);hideTimer=null;scheduledWaitKey='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{
    await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{
      if(!cur)return;
      return transform(cur);
    },{applyLocally:false});
  }catch(e){console.warn('memory sync',e)}
}
async function ensureSync(){
  if(initBusy||role!=='host'||shared?.game!=='memory')return;
  const current=shared.memoryV2?.v===2&&Number(shared.memoryV2.roundId)===Number(shared.round)&&Array.isArray(shared.memoryV2.deck)&&shared.memoryV2.deck.length===Number(shared.memoryV2.pairs)*2;
  if(current&&!Object.hasOwn(shared,'memory'))return;
  initBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='memory')return;
      const {memory:legacyMemory,...clean}=old;
      const oldGame=old.memoryV2;
      if(oldGame?.v===2&&Number(oldGame.roundId)===Number(old.round)&&Array.isArray(oldGame.deck)&&oldGame.deck.length===Number(oldGame.pairs)*2)return legacyMemory?clean:old;
      return {...clean,phase:'playing',memoryV2:freshMemory(Number(old.round)||1)};
    });
  }finally{initBusy=false}
}
function ensureOverlay(){
  if(overlay)return overlay;
  playerStatus=document.createElement('div');playerStatus.id='memory-player-status';playerStatus.className='memory-player-status';playerStatus.hidden=true;
  playerStatus.setAttribute('aria-label','حالة اللاعبين');
  playerStatus.innerHTML='<span class="memory-player" data-player="host">👨 بابا <i aria-hidden="true"></i></span><span class="memory-player" data-player="guest">👧 رقية <i aria-hidden="true"></i></span>';
  overlay=document.createElement('section');
  overlay.id='memory-v1-overlay';
  overlay.className='memory-v1-overlay';
  overlay.hidden=true;
  overlay.innerHTML='<iframe class="memory-v1-frame" src="memory-game.html?v=3" title="لعبة الذاكرة" loading="eager"></iframe>';
  const header=document.querySelector('.header');header?.insertBefore(playerStatus,header.firstChild);header?.insertAdjacentElement('afterend',overlay);
  frame=overlay.querySelector('iframe');
  frame.addEventListener('load',sendConfig);
  return overlay;
}
function sendConfig(){
  const g=shared?.memoryV2;
  if(!frame?.contentWindow||shared?.game!=='memory'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-memory-config',config:{
    role,childName:childName(),roundId:Number(g.roundId)||Number(shared.round)||0,
    pairs:Number(g.pairs)||8,deck:Array.isArray(g.deck)?g.deck:[],
    revealed:Array.isArray(g.revealed)?g.revealed:[],
    matchedBy:g.matchedBy||{},turn:g.turn||'host',scores:g.scores||{host:0,guest:0},
    worldScores:shared.scores||{host:0,guest:0},
    waiting:Boolean(g.waiting),finished:Boolean(g.finished),result:g.result||null
  }},location.origin);
}
function activate(){
  ensureOverlay();
  document.body.classList.add('memory-v1-active');
  screen.setAttribute('aria-hidden','true');
  overlay.hidden=false;
  playerStatus.hidden=false;renderPlayerStatus();
  sendConfig();
  scheduleHide();
}
function deactivate(){
  document.body.classList.remove('memory-v1-active');
  screen?.removeAttribute('aria-hidden');
  if(overlay)overlay.hidden=true;
  if(playerStatus)playerStatus.hidden=true;
  clearTimeout(hideTimer);hideTimer=null;scheduledWaitKey='';
}
function scheduleHide(){
  const g=shared?.memoryV2;
  if(shared?.game!=='memory'||!g?.waiting)return;
  const waitId=Number(g.waitId)||0;
  const roundId=Number(g.roundId)||Number(shared.round)||0;
  const waitKey=`${roundId}:${waitId}`;
  if(!waitId||scheduledWaitKey===waitKey)return;
  scheduledWaitKey=waitKey;
  clearTimeout(hideTimer);
  hideTimer=setTimeout(async()=>{
    await mutate(old=>{
      const m=old.memoryV2;
      if(old.game!=='memory'||!m||!m.waiting||Number(m.roundId)!==roundId||Number(m.waitId)!==waitId)return;
      return {...old,memoryV2:{...m,revealed:[],waiting:false,turn:other(m.lastPicker||m.turn)}};
    });
  },930);
}
function cardUpgrade(){
  const card=screen?.querySelector('.game-card-memory');
  if(!card)return;
  const title=card.querySelector('strong'),desc=card.querySelector('small');
  if(title&&title.textContent!=='لعبة الذاكرة')title.textContent='لعبة الذاكرة';
  if(desc&&desc.textContent!=='٤–١٠٠ كارت • لعب بالأدوار')desc.textContent='٤–١٠٠ كارت • لعب بالأدوار';
}
function renderPlayerStatus(){
  if(!playerStatus)return;
  const active=shared?.game==='memory'&&Boolean(role);playerStatus.hidden=!active;if(!active)return;
  for(const player of ['host','guest']){
    const name=player==='host'?'بابا':childName(),playerUid=meta?.[player==='host'?'hostUid':'guestUid'],online=Boolean(playerUid&&presence[playerUid]);
    const chip=playerStatus.querySelector(`[data-player="${player}"]`);if(!chip)continue;
    chip.querySelector('i').classList.toggle('online',online);chip.querySelector('i').classList.toggle('offline',!online);
    chip.setAttribute('aria-label',`${name}: ${online?'متصل':'غير متصل'}`);chip.firstChild.textContent=`${player==='host'?'👨':'👧'} ${name} `;
  }
}
function syncUi(){
  cardUpgrade();
  if(shared?.game==='memory'){
    ensureOverlay();renderPlayerStatus();
    const g=shared?.memoryV2;
    const valid=g?.v===2&&Number(g.roundId)===Number(shared.round)&&Array.isArray(g.deck)&&g.deck.length===Number(g.pairs)*2;
    if(role==='host'&&!valid)ensureSync();
    if(valid&&role)activate();
  }else deactivate();
}
function bindRoom(){
  const next=currentRoom();
  if(next===roomCode&&unsubMeta&&unsubState)return;
  cleanup();roomCode=next;
  if(!db||!uid||!roomCode){syncUi();return}
  unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{
    meta=snap.val();updateRole();syncUi();
  });
  unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{
    shared=snap.val();updateRole();syncUi();scheduleHide();
  });
  unsubPresence=onValue(ref(db,`rooms/${roomCode}/presence`),snap=>{presence=snap.val()||{};renderPlayerStatus()});
}
async function pick(index,roundId){
  await mutate(old=>{
    const m=old.memoryV2;
    if(old.game!=='memory'||old.phase!=='playing'||!m||m.finished||m.waiting||m.turn!==role||Number(m.roundId)!==Number(roundId))return;
    if(!Number.isInteger(index)||index<0||index>=m.deck.length||m.matchedBy?.[index]||(m.revealed||[]).includes(index))return;
    const revealed=[...(m.revealed||[]),index];
    if(revealed.length===1)return {...old,memoryV2:{...m,revealed}};
    const [a,b]=revealed;
    if(m.deck[a]===m.deck[b]){
      const matchedBy={...(m.matchedBy||{}),[a]:role,[b]:role};
      const roundScores={...(m.scores||{host:0,guest:0}),[role]:(Number(m.scores?.[role])||0)+1};
      const globalScores={...(old.scores||{host:0,guest:0}),[role]:(Number(old.scores?.[role])||0)+1};
      const matchedCount=Object.keys(matchedBy).length;
      const finished=matchedCount>=m.deck.length;
      const result=finished?(roundScores.host===roundScores.guest?'draw':roundScores.host>roundScores.guest?'host':'guest'):null;
      return {...old,scores:globalScores,feedback:addFeedback(old,finished?'win':'good'),phase:finished?'finished':'playing',...(finished?{result}:{}),memoryV2:{
        ...m,revealed:[],matchedBy,scores:roundScores,finished,result
      }};
    }
    return {...old,feedback:addFeedback(old,'bad'),memoryV2:{
      ...m,revealed,waiting:true,waitId:(Number(m.waitId)||0)+1,lastPicker:role
    }};
  });
}
async function newRound(pairs){
  if(role!=='host')return;
  pairs=[2,3,4,6,8,10,12,16,20,24,30,40,50].includes(Number(pairs))?Number(pairs):6;
  try{localStorage.setItem('roqaya-memory-pairs',String(pairs))}catch{}
  await mutate(old=>{
    if(old.game!=='memory')return;
    const nextRound=(Number(old.round)||0)+1;
    return {...old,round:nextRound,phase:'playing',result:null,memoryV2:freshMemory(nextRound,pairs)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>{
    if(old.game!=='memory')return;
    const {memory:legacyMemory,memoryV2,...clean}=old;
    return {...clean,game:'lobby',phase:'lobby'};
  });
}

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-memory-ready'){sendConfig();return}
  if(d.type==='roqaya-memory-pick'){pick(Number(d.index),Number(d.roundId));return}
  if(d.type==='roqaya-memory-new'){newRound(Number(d.pairs));return}
  if(d.type==='roqaya-memory-city'){goCity();return}
});

const observer=new MutationObserver(()=>{
  if(observerBusy)return;
  observerBusy=true;
  queueMicrotask(()=>{
    observerBusy=false;
    cardUpgrade();
    if(shared?.game==='memory'&&shared?.memoryV2)sendConfig();
  });
});
if(screen)observer.observe(screen,{childList:true,subtree:true});
addEventListener('hashchange',bindRoom);
addEventListener('pageshow',()=>{bindRoom();syncUi()});

async function boot(){
  for(let i=0;i<120&&getApps().length===0;i++)await new Promise(r=>setTimeout(r,50));
  const app=getApps()[0];if(!app)return;
  auth=getAuth(app);db=getDatabase(app);
  onAuthStateChanged(auth,user=>{uid=user?.uid||'';bindRoom()});
  bindRoom();
}
boot();
