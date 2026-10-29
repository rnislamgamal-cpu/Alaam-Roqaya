import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,observerBusy=false,startBusy=false;
const PER=5;

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');

function randSeed(){try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]&0x7fffffff}catch{return Math.floor(Math.random()*0x7fffffff)}}
function freshStage(){return{merged:false,removed:[],wrong:[],tries:0,answered:false,earned:0,help:false,correctSeq:0}}
function freshGame(roundId){
 return{v:1,roundId,seed:randSeed(),level:0,qIndex:0,view:'map',questionsPerLevel:PER,stage:freshStage(),questionStars:{},levelStars:{},totalStars:0,trophySeq:0};
}
function cleanup(){try{unsubMeta?.()}catch{};try{unsubState?.()}catch{};unsubMeta=unsubState=null;meta=null;shared=null;role=''}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
 if(!db||!roomCode||!role)return;
 try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
 catch(e){console.warn('math kids sync',e)}
}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s,n){let h=Math.imul(2166136261^s,16777619);h=Math.imul(h^n,16777619);h^=h>>>13;h=Math.imul(h,0x5bd1e995);return(h^(h>>>15))>>>0}
function shuffle(a,R){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function pool(l){
 const add=[],sub=[],A=(a,b)=>add.push({op:"+",a,b}),S=(a,b)=>sub.push({op:"-",a,b});
 if(l===1){for(let a=1;a<=4;a++)for(let b=1;b<=4;b++)if(a+b<=5)A(a,b)}
 else if(l===2){for(let a=1;a<=8;a++)for(let b=1;b<=8;b++)if(a+b>=4&&a+b<=10)A(a,b)}
 else if(l===3){for(let n=2;n<=5;n++)for(let k=1;k<n;k++)S(n,k)}
 else if(l===4){for(let n=3;n<=10;n++)for(let k=1;k<n;k++)S(n,k)}
 else if(l===5){for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)if(a+b<=10)A(a,b);for(let n=3;n<=10;n++)for(let k=1;k<n;k++)S(n,k)}
 else{for(let a=3;a<=12;a++)for(let b=2;b<=9;b++)if(a+b<=20)A(a,b);for(let n=8;n<=20;n++)for(let k=2;k<=9;k++)if(n-k>=1)S(n,k)}
 return{add,sub};
}
function makeQuestions(seed,l,n=PER){
 const R=rng(hash(seed,l*997)),{add,sub}=pool(l),take=(arr,k)=>shuffle(arr,R).slice(0,k);
 let list=(add.length&&sub.length)?[...take(add,Math.ceil(n/2)),...take(sub,Math.floor(n/2))]:take([...add,...sub],n);
 list=shuffle(list,R);return list.map(q=>({...q,ans:q.op==='+'?q.a+q.b:q.a-q.b}));
}
function currentQuestion(g){
 if(!g?.level)return null;return makeQuestions(Number(g.seed)||1,Number(g.level),Number(g.questionsPerLevel)||PER)[Number(g.qIndex)||0]||null;
}
async function startGame(){
 if(startBusy||role!=='host'||!meta?.guestUid)return;
 startBusy=true;
 try{
  await mutate(old=>{if(old.game!=='lobby')return;const rr=(Number(old.round)||0)+1;return{...old,game:'math-kids-v1',phase:'playing',round:rr,result:null,mathKidsV1:freshGame(rr)}})
 }finally{startBusy=false}
}
async function selectLevel(level,roundId){
 if(role!=='host'||!Number.isInteger(level)||level<1||level>6)return;
 await mutate(old=>{
  const g=old.mathKidsV1;if(old.game!=='math-kids-v1'||!g||Number(g.roundId)!==Number(roundId))return;
  return{...old,phase:'playing',result:null,mathKidsV1:{...g,level,qIndex:0,view:'play',stage:freshStage()}};
 });
}
async function merge(roundId){
 await mutate(old=>{
  const g=old.mathKidsV1;if(old.game!=='math-kids-v1'||!g||Number(g.roundId)!==Number(roundId)||g.view!=='play'||Number(g.level)!==1||g.stage?.answered)return;
  return{...old,mathKidsV1:{...g,stage:{...g.stage,merged:true}}};
 });
}
async function removeItem(index,roundId){
 await mutate(old=>{
  const g=old.mathKidsV1,q=currentQuestion(g);
  if(old.game!=='math-kids-v1'||!g||!q||Number(g.roundId)!==Number(roundId)||g.view!=='play'||Number(g.level)!==3||g.stage?.answered)return;
  if(!Number.isInteger(index)||index<0||index>=q.a)return;
  const removed=Array.isArray(g.stage?.removed)?[...g.stage.removed]:[];
  if(removed.includes(index)||removed.length>=q.b)return;
  removed.push(index);
  return{...old,mathKidsV1:{...g,stage:{...g.stage,removed}}};
 });
}
async function help(roundId){
 await mutate(old=>{
  const g=old.mathKidsV1;if(old.game!=='math-kids-v1'||!g||Number(g.roundId)!==Number(roundId)||g.view!=='play'||g.stage?.answered)return;
  return{...old,mathKidsV1:{...g,stage:{...g.stage,help:true}}};
 });
}
async function answer(value,roundId){
 await mutate(old=>{
  const g=old.mathKidsV1,q=currentQuestion(g);
  if(old.game!=='math-kids-v1'||!g||!q||Number(g.roundId)!==Number(roundId)||g.view!=='play'||g.stage?.answered)return;
  if(Number(g.level)===1&&!g.stage?.merged)return;
  if(Number(g.level)===3&&(g.stage?.removed?.length||0)<q.b)return;

  const wrong=Array.isArray(g.stage?.wrong)?[...g.stage.wrong]:[],tries=(Number(g.stage?.tries)||0)+1;
  if(Number(value)!==Number(q.ans)){
    if(!wrong.includes(Number(value)))wrong.push(Number(value));
    return{...old,mathKidsV1:{...g,stage:{...g.stage,wrong,tries}}};
  }

  const key=`l${g.level}q${g.qIndex}`,existing=Number(g.questionStars?.[key])||0,earned=existing|| (tries===1?3:tries===2?2:1);
  const questionStars={...(g.questionStars||{})};
  if(!existing)questionStars[key]=earned;
  const levelStars={...(g.levelStars||{})};
  if(!existing)levelStars[g.level]=(Number(levelStars[g.level])||0)+earned;
  const totalStars=(Number(g.totalStars)||0)+(existing?0:earned);
  const correctSeq=(Number(g.stage?.correctSeq)||0)+1;

  return{...old,mathKidsV1:{...g,questionStars,levelStars,totalStars,stage:{...g.stage,answered:true,tries,wrong,earned,correctSeq}}};
 });
}
async function control(action,roundId){
 if(role!=='host')return;
 await mutate(old=>{
  const g=old.mathKidsV1;if(old.game!=='math-kids-v1'||!g||Number(g.roundId)!==Number(roundId)||g.view!=='play')return;
  if(action==='map')return{...old,mathKidsV1:{...g,level:0,qIndex:0,view:'map',stage:freshStage()}};
  if(action==='prev'&&Number(g.qIndex)>0)return{...old,mathKidsV1:{...g,qIndex:Number(g.qIndex)-1,stage:freshStage()}};
  if(action==='replay')return{...old,mathKidsV1:{...g,stage:freshStage()}};
  if(action==='next'){
    if(!g.stage?.answered)return;
    if(Number(g.qIndex)<(Number(g.questionsPerLevel)||PER)-1)return{...old,mathKidsV1:{...g,qIndex:Number(g.qIndex)+1,stage:freshStage()}};
    const view=Number(g.level)===6?'trophy':'levelDone';
    const trophySeq=view==='trophy'?(Number(g.trophySeq)||0)+1:Number(g.trophySeq)||0;
    return{...old,mathKidsV1:{...g,view,trophySeq}};
  }
 });
}
async function mapView(roundId){
 if(role!=='host')return;
 await mutate(old=>{
  const g=old.mathKidsV1;if(old.game!=='math-kids-v1'||!g||Number(g.roundId)!==Number(roundId))return;
  return{...old,mathKidsV1:{...g,level:0,qIndex:0,view:'map',stage:freshStage()}};
 });
}
async function goCity(){
 if(role!=='host')return;
 await mutate(old=>old.game==='math-kids-v1'?{...old,game:'lobby',phase:'lobby'}:old);
}

function cardMarkup(){
 const disabled=role!=='host'||!meta?.guestUid?'disabled':'';
 return`<button class="game-choice rg-game-tile rg-cat-numbers roqaya-math-kids-card" data-math-kids-start data-rg-category="numbers" ${disabled}>
 <span class="game-card-art"><svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><circle class="fy" cx="18" cy="21" r="10"></circle><circle class="fb" cx="46" cy="21" r="10"></circle><path class="sk" d="M14 21h8M18 17v8M42 21h8"></path><rect class="fw" x="12" y="38" width="40" height="16" rx="6"></rect><text class="tx" x="32" y="50" font-size="15" text-anchor="middle">١٢٣</text></svg></span>
 <strong class="rg-game-label">نلعب بالأرقام</strong><small>٦ مستويات • جمع وطرح • بابا المتحكم</small></button>`;
}
function ensureLobbyCard(){
 if(shared?.game!=='lobby')return;
 const grid=screen?.querySelector('.lobby-game-grid');if(!grid)return;
 let card=grid.querySelector('.roqaya-math-kids-card');if(!card){grid.insertAdjacentHTML('beforeend',cardMarkup());card=grid.querySelector('.roqaya-math-kids-card')}
 const disabled=role!=='host'||!meta?.guestUid;if(card&&card.disabled!==disabled)card.disabled=disabled;
}
function ensureOverlay(){
 if(overlay)return overlay;
 overlay=document.createElement('section');overlay.id='math-kids-v1-overlay';overlay.className='math-kids-v1-overlay';overlay.hidden=true;
 overlay.innerHTML='<iframe class="math-kids-v1-frame" src="math-kids-game.html?v=1" title="نلعب بالأرقام" loading="eager"></iframe>';
 screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);return overlay;
}
function sendConfig(){
 const g=shared?.mathKidsV1;if(!frame?.contentWindow||shared?.game!=='math-kids-v1'||!g||!role)return;
 frame.contentWindow.postMessage({type:'roqaya-math-config',config:{
  role,childName:childName(),roundId:Number(g.roundId)||Number(shared.round)||0,seed:Number(g.seed)||1,
  level:Number(g.level)||0,qIndex:Number(g.qIndex)||0,view:g.view||'map',questionsPerLevel:Number(g.questionsPerLevel)||PER,
  stage:g.stage||freshStage(),questionStars:g.questionStars||{},levelStars:g.levelStars||{},totalStars:Number(g.totalStars)||0,trophySeq:Number(g.trophySeq)||0
 }},location.origin);
}
function activate(){ensureOverlay();document.body.classList.add('math-kids-v1-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig()}
function deactivate(){document.body.classList.remove('math-kids-v1-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true}
function syncUi(){if(shared?.game==='lobby'){deactivate();ensureLobbyCard();return}if(shared?.game==='math-kids-v1'&&shared?.mathKidsV1&&role){activate();return}deactivate()}
function bindRoom(){
 const next=currentRoom();if(next===roomCode&&unsubMeta&&unsubState)return;
 cleanup();roomCode=next;if(!db||!uid||!roomCode){syncUi();return}
 unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{meta=snap.val();updateRole();syncUi()});
 unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{shared=snap.val();updateRole();syncUi()});
}

document.addEventListener('click',e=>{const card=e.target.closest?.('[data-math-kids-start]');if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();startGame()},true);
addEventListener('message',e=>{
 if(e.origin!==location.origin)return;const d=e.data||{};
 if(d.type==='roqaya-math-ready'){sendConfig();return}
 if(d.type==='roqaya-math-level'){selectLevel(Number(d.level),Number(d.roundId));return}
 if(d.type==='roqaya-math-merge'){merge(Number(d.roundId));return}
 if(d.type==='roqaya-math-remove'){removeItem(Number(d.index),Number(d.roundId));return}
 if(d.type==='roqaya-math-help'){help(Number(d.roundId));return}
 if(d.type==='roqaya-math-answer'){answer(Number(d.value),Number(d.roundId));return}
 if(d.type==='roqaya-math-control'){control(String(d.action||''),Number(d.roundId));return}
 if(d.type==='roqaya-math-map'){mapView(Number(d.roundId));return}
 if(d.type==='roqaya-math-city'){goCity();return}
});
const observer=new MutationObserver(()=>{if(observerBusy)return;observerBusy=true;queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')ensureLobbyCard();if(shared?.game==='math-kids-v1'&&shared?.mathKidsV1)sendConfig()})});
if(screen)observer.observe(screen,{childList:true,subtree:true});
addEventListener('hashchange',bindRoom);addEventListener('pageshow',()=>{bindRoom();syncUi()});
async function boot(){for(let i=0;i<120&&getApps().length===0;i++)await new Promise(r=>setTimeout(r,50));const app=getApps()[0];if(!app)return;auth=getAuth(app);db=getDatabase(app);onAuthStateChanged(auth,user=>{uid=user?.uid||'';bindRoom()});bindRoom()}
boot();
