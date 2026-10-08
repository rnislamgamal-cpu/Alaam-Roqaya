import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
const header=document.querySelector('.header');
const LEVELS=10;
const CHEER_TYPES=4;
const VALID_N=new Set([3,4,5,6]);
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,headerCluster=null,headerPill=null;
let observerBusy=false,initBusy=false;

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const other=p=>p==='host'?'guest':'host';
const childName=()=>String(shared?.childName||'رقية');
const roleName=p=>p==='host'?'بابا':childName();
function secureInt(max){
  try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max}
  catch{return Math.floor(Math.random()*max)}
}
function savedN(){
  try{const n=Number(localStorage.getItem('roqaya-jigsaw-n'));return VALID_N.has(n)?n:3}
  catch{return 3}
}
function cleanup(){
  try{unsubMeta?.()}catch{}
  try{unsubState?.()}catch{}
  unsubMeta=unsubState=null;meta=null;shared=null;role='';
}
function updateRole(){
  role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':'';
}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{
    await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{
      if(!cur)return;
      return transform(cur);
    },{applyLocally:false});
  }catch(e){console.warn('jigsaw sync',e)}
}
function freshSync(old,n=savedN()){
  const prev=old?.jigsawSync;
  let imageIndex=secureInt(LEVELS);
  if(prev&&LEVELS>1&&imageIndex===prev.imageIndex)imageIndex=(imageIndex+1)%LEVELS;
  return {
    v:3,roundId:(Number(old?.round)||0)+1,imageIndex,n,
    seed:secureInt(0x7fffffff)+1,placed:{},
    turn:(Number(old?.round)||0)%2===0?'host':'guest',
    cheer:{seq:0,from:'',type:0,at:0},
    startedAt:Date.now(),completedAt:null,finished:false
  };
}
async function ensureSync(){
  if(initBusy||role!=='host'||shared?.game!=='jigsaw')return;
  if(shared.jigsawSync?.v===3&&shared.jigsawSync.roundId===shared.round)return;
  initBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='jigsaw')return;
      if(old.jigsawSync?.v===3&&old.jigsawSync.roundId===old.round)return old;
      const n=savedN();
      return {...old,phase:'playing',jigsawSync:{
        v:3,roundId:old.round,imageIndex:secureInt(LEVELS),n,
        seed:secureInt(0x7fffffff)+1,placed:{},
        turn:(Number(old.round)||0)%2===0?'guest':'host',
        cheer:{seq:0,from:'',type:0,at:0},
        startedAt:Date.now(),completedAt:null,finished:false
      }};
    });
  }finally{initBusy=false}
}
function cardUpgrade(){
  const card=screen?.querySelector('.game-card-jigsaw');
  if(!card)return;
  const title=card.querySelector('strong'),desc=card.querySelector('small');
  if(title&&title.textContent!=='لعبة تكوين الصور')title.textContent='لعبة تكوين الصور';
  if(desc&&desc.textContent!=='٩ / ١٦ / ٢٥ / ٣٦ قطعة • لعب بالتبادل')desc.textContent='٩ / ١٦ / ٢٥ / ٣٦ قطعة • لعب بالتبادل';
}
function mountHeader(){
  if(!header)return;
  if(!headerCluster){
    headerCluster=document.createElement('div');
    headerCluster.className='jigsaw-header-cluster';
    headerPill=document.createElement('div');
    headerPill.className='jigsaw-header-pill';
    headerPill.innerHTML=`<span class="jigsaw-turn-mini">🧩 جاري التجهيز</span><button type="button" class="jigsaw-city-mini" aria-label="الرجوع للمدينة">🎡</button>`;
    headerCluster.append(headerPill);
    headerPill.querySelector('.jigsaw-city-mini').addEventListener('click',()=>goLobby());
  }
  if(!headerCluster.isConnected){
    const sound=document.getElementById('sound-toggle');
    if(sound){
      header.insertBefore(headerCluster,sound);
      headerCluster.prepend(sound);
    }else header.append(headerCluster);
  }
}
function unmountHeader(){
  if(!headerCluster?.isConnected)return;
  const sound=headerCluster.querySelector('#sound-toggle');
  if(sound&&header)header.append(sound);
  headerCluster.remove();
}
function updateHeader(){
  mountHeader();
  const g=shared?.jigsawSync,turn=headerPill?.querySelector('.jigsaw-turn-mini');
  if(!turn||!g)return;
  turn.textContent=g.finished?'🧩 اكتمل البازل':g.turn===role?`🧩 دورك ${roleName(role)}`:`👀 دور ${roleName(g.turn)}`;
  headerPill.classList.toggle('my-turn',!g.finished&&g.turn===role);
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');
  overlay.id='jigsaw-sync-overlay';
  overlay.className='jigsaw-sync-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`<iframe class="jigsaw-sync-frame" src="jigsaw-game.html?v=4" title="لعبة تكوين الصور" loading="eager"></iframe>`;
  screen.insertAdjacentElement('afterend',overlay);
  frame=overlay.querySelector('iframe');
  frame.addEventListener('load',()=>sendConfig());
  return overlay;
}
function sendConfig(){
  const g=shared?.jigsawSync;
  if(!frame?.contentWindow||shared?.game!=='jigsaw'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-jigsaw-config',config:{
    imageIndex:Number(g.imageIndex)||0,
    n:VALID_N.has(Number(g.n))?Number(g.n):3,
    seed:Number(g.seed)||1,
    placed:Object.keys(g.placed||{}).filter(k=>g.placed[k]).map(Number),
    turn:g.turn||'host',
    role,
    childName:childName(),
    startedAt:Number(g.startedAt)||Date.now(),
    completedAt:Number(g.completedAt)||null,
    finished:Boolean(g.finished),
    roundId:Number(g.roundId)||Number(shared.round)||0,
    cheer:g.cheer||{seq:0,from:'',type:0,at:0}
  }},location.origin);
}
function activate(){
  ensureOverlay();
  document.body.classList.add('jigsaw-sync-active');
  screen.setAttribute('aria-hidden','true');
  overlay.hidden=false;
  updateHeader();
  sendConfig();
}
function deactivate(){
  document.body.classList.remove('jigsaw-sync-active');
  screen?.removeAttribute('aria-hidden');
  if(overlay)overlay.hidden=true;
  unmountHeader();
}
async function placePiece(piece,roundId){
  if(role!=='host'&&role!=='guest')return;
  await mutate(old=>{
    if(old.game!=='jigsaw'||old.phase==='finished')return;
    const g=old.jigsawSync;
    if(!g||g.v!==3||g.finished||g.turn!==role||Number(g.roundId)!==Number(roundId))return;
    const n=VALID_N.has(Number(g.n))?Number(g.n):3,total=n*n;
    if(!Number.isInteger(piece)||piece<0||piece>=total||g.placed?.[piece])return;
    const placed={...(g.placed||{}),[piece]:true};
    const count=Object.keys(placed).filter(k=>placed[k]).length;
    const finished=count>=total;
    return {...old,phase:finished?'finished':'playing',...(finished?{result:'complete'}:{}),jigsawSync:{
      ...g,placed,turn:finished?g.turn:other(role),finished,completedAt:finished?Date.now():null
    }};
  });
}
async function newRound(n){
  if(role!=='host')return;
  n=VALID_N.has(Number(n))?Number(n):3;
  try{localStorage.setItem('roqaya-jigsaw-n',String(n))}catch{}
  await mutate(old=>{
    if(old.game!=='jigsaw')return;
    const nextRound=(Number(old.round)||0)+1;
    let imageIndex=secureInt(LEVELS);
    if(old.jigsawSync&&LEVELS>1&&imageIndex===old.jigsawSync.imageIndex)imageIndex=(imageIndex+1)%LEVELS;
    return {...old,round:nextRound,phase:'playing',jigsawSync:{
      v:3,roundId:nextRound,imageIndex,n,seed:secureInt(0x7fffffff)+1,placed:{},
      turn:nextRound%2===0?'guest':'host',
      cheer:{seq:0,from:'',type:0,at:0},
      startedAt:Date.now(),completedAt:null,finished:false
    }};
  });
}
async function sendCheer(roundId){
  if(role!=='host'&&role!=='guest')return;
  await mutate(old=>{
    if(old.game!=='jigsaw'||old.phase==='finished')return;
    const g=old.jigsawSync;
    if(!g||g.v!==3||g.finished||g.turn===role||Number(g.roundId)!==Number(roundId))return;
    const prev=g.cheer||{seq:0};
    return {...old,jigsawSync:{...g,cheer:{
      seq:(Number(prev.seq)||0)+1,
      from:role,
      type:secureInt(CHEER_TYPES),
      at:Date.now()
    }}};
  });
}
async function goLobby(){
  if(role!=='host')return;
  await mutate(old=>old.game==='jigsaw'?{...old,game:'lobby',phase:'lobby'}:old);
}
function syncUi(){
  cardUpgrade();
  if(shared?.game==='jigsaw'){
    if(role==='host'&&!shared?.jigsawSync)ensureSync();
    if(shared?.jigsawSync&&role)activate();
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
addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  if(e.data?.type==='roqaya-jigsaw-ready'){sendConfig();return}
  if(e.data?.type==='roqaya-jigsaw-piece'){placePiece(Number(e.data.piece),Number(e.data.roundId));return}
  if(e.data?.type==='roqaya-jigsaw-cheer'){sendCheer(Number(e.data.roundId));return}
  if(e.data?.type==='roqaya-jigsaw-new'){newRound(Number(e.data.n));return}
});
const observer=new MutationObserver(()=>{
  if(observerBusy)return;
  observerBusy=true;
  queueMicrotask(()=>{observerBusy=false;cardUpgrade();if(shared?.game==='jigsaw'&&shared?.jigsawSync)sendConfig()});
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
