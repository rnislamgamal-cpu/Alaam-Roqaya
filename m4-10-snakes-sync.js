import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,initBusy=false,observerBusy=false;
const LAD={1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100};
const SNK={16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78};

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const other=p=>p==='host'?'guest':'host';
const childName=()=>String(shared?.childName||'رقية');
const randomDice=()=>1+Math.floor(Math.random()*6);

function cleanup(){
  try{unsubMeta?.()}catch{}
  try{unsubState?.()}catch{}
  unsubMeta=unsubState=null;meta=null;shared=null;role='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{
    await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{
      if(!cur)return;
      return transform(cur);
    },{applyLocally:false});
  }catch(e){console.warn('snakes sync',e)}
}
function freshSnake(roundId){
  return {
    v:2,roundId,positions:{host:0,guest:0},
    turn:roundId%2===0?'guest':'host',
    phase:'ready',dice:null,spinId:0,moveId:0,move:null,winner:null,
    lastEvent:{id:0,type:'',player:'',dice:null,at:0}
  };
}
async function ensureSync(){
  if(initBusy||role!=='host'||shared?.game!=='snakes')return;
  if(shared.snakeV2?.v===2&&Number(shared.snakeV2.roundId)===Number(shared.round))return;
  initBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='snakes')return;
      if(old.snakeV2?.v===2&&Number(old.snakeV2.roundId)===Number(old.round))return old;
      return {...old,phase:'playing',snakeV2:freshSnake(Number(old.round)||1)};
    });
  }finally{initBusy=false}
}
function cardUpgrade(){
  const card=screen?.querySelector('.game-card-snakes');
  if(!card)return;
  const title=card.querySelector('strong'),desc=card.querySelector('small');
  if(title&&title.textContent!=='السلم والثعبان')title.textContent='السلم والثعبان';
  if(desc&&desc.textContent!=='وقف النرد • عدّ الخطوات • اختار المربع')desc.textContent='وقف النرد • عدّ الخطوات • اختار المربع';
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');
  overlay.id='snakes-v2-overlay';
  overlay.className='snakes-v2-overlay';
  overlay.hidden=true;
  overlay.innerHTML='<iframe class="snakes-v2-frame" src="snakes-game.html?v=1" title="السلم والثعبان" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend',overlay);
  frame=overlay.querySelector('iframe');
  frame.addEventListener('load',sendConfig);
  return overlay;
}
function soundEnabled(){
  const b=document.getElementById('sound-toggle');
  return !b||!b.textContent.includes('مقفول');
}
function sendConfig(){
  const g=shared?.snakeV2;
  if(!frame?.contentWindow||shared?.game!=='snakes'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-snakes-config',config:{
    role,
    childName:childName(),
    positions:g.positions||{host:0,guest:0},
    turn:g.turn||'host',
    phase:g.phase||'ready',
    dice:Number.isInteger(g.dice)?g.dice:null,
    spinId:Number(g.spinId)||0,
    roundId:Number(g.roundId)||Number(shared.round)||0,
    winner:g.winner||null,
    lastEvent:g.lastEvent||null,
    move:g.move||null,
    soundEnabled:soundEnabled()
  }},location.origin);
}
function activate(){
  ensureOverlay();
  document.body.classList.add('snakes-v2-active');
  screen.setAttribute('aria-hidden','true');
  overlay.hidden=false;
  sendConfig();
}
function deactivate(){
  document.body.classList.remove('snakes-v2-active');
  screen?.removeAttribute('aria-hidden');
  if(overlay)overlay.hidden=true;
}
function syncUi(){
  cardUpgrade();
  if(shared?.game==='snakes'){
    if(role==='host'&&!shared?.snakeV2)ensureSync();
    if(shared?.snakeV2&&role)activate();
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
    shared=snap.val();updateRole();syncUi();
  });
}
async function rollStart(roundId){
  await mutate(old=>{
    const g=old.snakeV2;
    if(old.game!=='snakes'||old.phase!=='playing'||!g||g.turn!==role||g.phase!=='ready'||Number(g.roundId)!==Number(roundId))return;
    return {...old,snakeV2:{...g,phase:'spinning',dice:null,spinId:(Number(g.spinId)||0)+1}};
  });
}
async function rollStop(roundId){
  const v=randomDice();
  await mutate(old=>{
    const g=old.snakeV2;
    if(old.game!=='snakes'||old.phase!=='playing'||!g||g.turn!==role||g.phase!=='spinning'||Number(g.roundId)!==Number(roundId))return;
    const start=Number(g.positions?.[role])||0,target=start+v;
    if(target>100){
      const id=(Number(g.lastEvent?.id)||0)+1;
      return {...old,snakeV2:{
        ...g,phase:'ready',dice:null,turn:v===6?role:other(role),
        lastEvent:{id,type:'overshoot',player:role,dice:v,at:Date.now()}
      }};
    }
    return {...old,snakeV2:{...g,phase:'choose',dice:v}};
  });
}
async function chooseSquare(square,roundId){
  await mutate(old=>{
    const g=old.snakeV2;
    if(old.game!=='snakes'||old.phase!=='playing'||!g||g.turn!==role||g.phase!=='choose'||Number(g.roundId)!==Number(roundId))return;
    const from=Number(g.positions?.[role])||0,dice=Number(g.dice)||0,target=from+dice;
    if(square!==target||target>100)return;
    const jumpType=LAD[target]?'ladder':SNK[target]?'snake':'';
    const destination=jumpType==='ladder'?LAD[target]:jumpType==='snake'?SNK[target]:target;
    const moveId=(Number(g.moveId)||0)+1;
    const positions={...(g.positions||{}),[role]:destination};
    const winner=destination===100?role:null;
    return {...old,snakeV2:{...g,positions,phase:'moving',moveId,move:{
      id:moveId,player:role,from,dice,target,jumpType,destination,winner,
      nextTurn:dice===6?role:other(role),roundId:Number(g.roundId)
    }}};
  });
}
async function moveDone(moveId,roundId){
  await mutate(old=>{
    const g=old.snakeV2,m=g?.move;
    if(old.game!=='snakes'||!g||g.phase!=='moving'||!m||Number(m.id)!==Number(moveId)||Number(g.roundId)!==Number(roundId))return;
    const scores={...(old.scores||{host:0,guest:0})};
    const id=(Number(g.lastEvent?.id)||0)+1;
    if(m.winner){
      scores[m.winner]=(Number(scores[m.winner])||0)+5;
      return {...old,scores,phase:'finished',result:m.winner,snakeV2:{
        ...g,phase:'finished',winner:m.winner,dice:null,
        lastEvent:{id,type:'win',player:m.winner,dice:m.dice,at:Date.now()}
      }};
    }
    return {...old,snakeV2:{
      ...g,phase:'ready',turn:m.nextTurn,dice:null,
      lastEvent:{id,type:m.dice===6?'six':m.jumpType||'move',player:m.player,dice:m.dice,at:Date.now()}
    }};
  });
}
async function newRound(){
  if(role!=='host')return;
  await mutate(old=>{
    if(old.game!=='snakes')return;
    const nextRound=(Number(old.round)||0)+1;
    return {...old,round:nextRound,phase:'playing',snakeV2:freshSnake(nextRound)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>old.game==='snakes'?{...old,game:'lobby',phase:'lobby'}:old);
}

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-snakes-ready'){sendConfig();return}
  if(d.type==='roqaya-snakes-roll-start'){rollStart(Number(d.roundId));return}
  if(d.type==='roqaya-snakes-roll-stop'){rollStop(Number(d.roundId));return}
  if(d.type==='roqaya-snakes-square'){chooseSquare(Number(d.square),Number(d.roundId));return}
  if(d.type==='roqaya-snakes-move-done'){moveDone(Number(d.moveId),Number(d.roundId));return}
  if(d.type==='roqaya-snakes-new'){newRound();return}
  if(d.type==='roqaya-snakes-city'){goCity();return}
});
document.addEventListener('click',e=>{
  if(e.target.closest?.('#sound-toggle'))setTimeout(sendConfig,0);
},true);

const observer=new MutationObserver(()=>{
  if(observerBusy)return;
  observerBusy=true;
  queueMicrotask(()=>{
    observerBusy=false;
    cardUpgrade();
    if(shared?.game==='snakes'&&shared?.snakeV2)sendConfig();
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
