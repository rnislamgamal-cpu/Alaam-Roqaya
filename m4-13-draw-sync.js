import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, onChildAdded, onChildRemoved, push, remove, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,unsubStrokeAdd=null,unsubStrokeRemove=null,overlay=null,frame=null,initBusy=false,observerBusy=false;
let strokeLines=new Map(),strokeKeysByLocalId=new Map();

const WORDS=[
 ['شجرة','🌳'],['بيت','🏠'],['شمس','☀️'],['قمر','🌙'],['سمكة','🐟'],['قطة','🐱'],['كلب','🐶'],['عربية','🚗'],['طيارة','✈️'],['مركب','⛵'],
 ['وردة','🌸'],['نجمة','⭐'],['قلب','❤️'],['كتاب','📖'],['كورة','⚽'],['تفاحة','🍎'],['موزة','🍌'],['بالونة','🎈'],['هدية','🎁'],['ساعة','⏰'],
 ['شمسية','☂️'],['جزمة','👟'],['نضارة','👓'],['تاج','👑'],['قلم','✏️'],['باب','🚪'],['فراشة','🦋'],['عصفورة','🐦'],['أرنب','🐰'],['فيل','🐘'],
 ['أسد','🦁'],['قطر','🚂'],['عجلة','🚲'],['صاروخ','🚀'],['جبل','⛰️'],['سحابة','☁️'],['قوس قزح','🌈'],['تعبان','🐍'],['نحلة','🐝'],['بطيخة','🍉'],
 ['جزرة','🥕'],['تورتة','🎂'],['أتوبيس','🚌'],['موبايل','📱'],['مفتاح','🔑'],['بطة','🦆']
];

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const other=p=>p==='host'?'guest':'host';
const childName=()=>String(shared?.childName||'رقية');

function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function savedRounds(){try{const n=Number(localStorage.getItem('roqaya-draw-rounds'));return[4,6,8,10].includes(n)?n:6}catch{return 6}}
function freshQuestion(previous=-1){
 let answer=Math.floor(Math.random()*WORDS.length);
 if(WORDS.length>1&&answer===previous)answer=(answer+1)%WORDS.length;
 const distractors=shuffle(Array.from({length:WORDS.length},(_,i)=>i).filter(i=>i!==answer)).slice(0,3);
 return {answer,options:shuffle([answer,...distractors])};
}
function freshGame(rootRound,total=savedRounds()){
 total=[4,6,8,10].includes(Number(total))?Number(total):6;
 const q=freshQuestion(-1);
 return {v:2,roundId:rootRound,roundNo:1,total,drawer:'host',phase:'draw',answer:q.answer,options:q.options,guesses:[],scores:{host:0,guest:0},lastPoints:0,result:null,winner:null};
}
function nextRoundData(old,rootRound){
 const q=freshQuestion(Number(old.answer));
 return {...old,roundId:rootRound,roundNo:Number(old.roundNo||1)+1,drawer:other(old.drawer||'host'),phase:'draw',answer:q.answer,options:q.options,guesses:[],lastPoints:0,result:null,winner:null};
}
function cleanup(){
 for(const fn of [unsubMeta,unsubState,unsubStrokeAdd,unsubStrokeRemove])try{fn?.()}catch{}
 unsubMeta=unsubState=unsubStrokeAdd=unsubStrokeRemove=null;meta=null;shared=null;role='';strokeLines.clear();strokeKeysByLocalId.clear();
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
 if(!db||!roomCode||!role)return;
 try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
 catch(e){console.warn('draw sync',e)}
}
async function ensureSync(){
 if(initBusy||role!=='host'||shared?.game!=='draw')return;
 if(shared.drawV2?.v===2)return;
 initBusy=true;
 try{
  await remove(ref(db,`rooms/${roomCode}/strokes`)).catch(()=>{});
  await mutate(old=>{if(old.game!=='draw'||old.drawV2?.v===2)return old;return {...old,phase:'playing',drawV2:freshGame(Number(old.round)||1)}})
 }finally{initBusy=false}
}
function cardUpgrade(){
 const card=screen?.querySelector('.game-card-draw');if(!card)return;
 const title=card.querySelector('strong'),desc=card.querySelector('small');
 if(title&&title.textContent!=='ارسم وخمّن')title.textContent='ارسم وخمّن';
 if(desc&&desc.textContent!=='رسم مباشر • ٣ محاولات • أدوار بالتبادل')desc.textContent='رسم مباشر • ٣ محاولات • أدوار بالتبادل';
}
function ensureOverlay(){
 if(overlay)return overlay;
 overlay=document.createElement('section');overlay.id='draw-v2-overlay';overlay.className='draw-v2-overlay';overlay.hidden=true;
 overlay.innerHTML='<iframe class="draw-v2-frame" src="draw-game.html?v=1" title="ارسم وخمّن" loading="eager"></iframe>';
 screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');
 frame.addEventListener('load',()=>{sendConfig();sendAllLines()});return overlay;
}
function wordObj(i){const w=WORDS[Number(i)];return w?{name:w[0],emoji:w[1]}:null}
function sendConfig(){
 const g=shared?.drawV2;if(!frame?.contentWindow||shared?.game!=='draw'||!g||!role)return;
 const answer=g.drawer===role||['result','end'].includes(g.phase)?wordObj(g.answer):null;
 frame.contentWindow.postMessage({type:'roqaya-draw-config',config:{
  role,childName:childName(),phase:g.phase||'draw',roundNo:Number(g.roundNo)||1,total:Number(g.total)||6,drawer:g.drawer||'host',
  scores:g.scores||{host:0,guest:0},answer,options:(g.options||[]).map(wordObj).filter(Boolean),guesses:g.guesses||[],
  lastPoints:Number(g.lastPoints)||0,result:g.result||null,winner:g.winner||null,roundId:Number(g.roundId)||Number(shared.round)||0,
  correctOption:(g.options||[]).indexOf(Number(g.answer))
 }},location.origin);
}
function sendAllLines(){if(frame?.contentWindow)frame.contentWindow.postMessage({type:'roqaya-draw-lines',lines:[...strokeLines.entries()].map(([key,line])=>({key,...line}))},location.origin)}
function activate(){ensureOverlay();document.body.classList.add('draw-v2-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig()}
function deactivate(){document.body.classList.remove('draw-v2-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true}
function syncUi(){cardUpgrade();if(shared?.game==='draw'){if(role==='host'&&!shared?.drawV2)ensureSync();if(shared?.drawV2&&role)activate()}else deactivate()}

function encodeStyle(x,c,s){
 const base=Math.max(0,Math.min(.999,Math.floor(Math.max(0,Math.min(1,Number(x)||0))*1000)/1000));
 const code=Math.max(1,Math.min(27,(Number(c)||0)*3+(Number(s)||0)+1));return base+code/1e6;
}
function decodeStyle(x){
 const value=Math.max(0,Math.min(1,Number(x)||0)),base=Math.floor(value*1000+1e-9)/1000,code=Math.round((value-base)*1e6);
 if(code<1||code>27)return{x:value,c:0,s:1};
 return{x:base,c:Math.floor((code-1)/3),s:(code-1)%3};
}
function decodeLine(v){
 if(!v||![v.x1,v.y1,v.x2,v.y2].every(Number.isFinite))return null;
 const d=decodeStyle(v.x1);return{x1:d.x,y1:Number(v.y1),x2:Number(v.x2),y2:Number(v.y2),c:d.c,s:d.s};
}
function bindStrokes(){
 try{unsubStrokeAdd?.()}catch{};try{unsubStrokeRemove?.()}catch{};unsubStrokeAdd=unsubStrokeRemove=null;strokeLines.clear();
 if(!db||!roomCode)return;const sref=ref(db,`rooms/${roomCode}/strokes`);
 unsubStrokeAdd=onChildAdded(sref,snap=>{const line=decodeLine(snap.val());if(!line)return;strokeLines.set(snap.key,line);if(shared?.game==='draw'&&frame?.contentWindow)frame.contentWindow.postMessage({type:'roqaya-draw-line',line:{key:snap.key,...line}},location.origin)});
 unsubStrokeRemove=onChildRemoved(sref,snap=>{strokeLines.delete(snap.key);if(shared?.game==='draw'&&frame?.contentWindow){frame.contentWindow.postMessage({type:'roqaya-draw-remove',key:snap.key},location.origin);if(strokeLines.size===0)frame.contentWindow.postMessage({type:'roqaya-draw-clear'},location.origin)}});
}
function bindRoom(){
 const next=currentRoom();if(next===roomCode&&unsubMeta&&unsubState)return;
 cleanup();roomCode=next;if(!db||!uid||!roomCode){syncUi();return}
 unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{meta=snap.val();updateRole();syncUi()});
 unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{shared=snap.val();updateRole();syncUi()});
 bindStrokes();
}
async function addSegment(line,roundId){
 const g=shared?.drawV2;if(shared?.game!=='draw'||!g||g.phase!=='draw'||g.drawer!==role||Number(g.roundId)!==Number(roundId)||strokeLines.size>=1400)return;
 const val={x1:encodeStyle(line.x1,line.c,line.s),y1:Math.max(0,Math.min(1,Number(line.y1)||0)),x2:Math.max(0,Math.min(1,Number(line.x2)||0)),y2:Math.max(0,Math.min(1,Number(line.y2)||0))};
 const child=push(ref(db,`rooms/${roomCode}/strokes`),val);
 if(line.strokeId){const keys=strokeKeysByLocalId.get(line.strokeId)||[];keys.push(child.key);strokeKeysByLocalId.set(line.strokeId,keys)}
 try{await child}catch(e){console.warn('draw segment',e)}
}
async function undoStroke(strokeId,roundId){
 const g=shared?.drawV2;if(shared?.game!=='draw'||!g||g.phase!=='draw'||g.drawer!==role||Number(g.roundId)!==Number(roundId))return;
 const keys=strokeKeysByLocalId.get(strokeId)||[];strokeKeysByLocalId.delete(strokeId);
 await Promise.all(keys.map(k=>remove(ref(db,`rooms/${roomCode}/strokes/${k}`)).catch(()=>{})));
}
async function clearDrawing(roundId){
 const g=shared?.drawV2;if(shared?.game!=='draw'||!g||g.phase!=='draw'||g.drawer!==role||Number(g.roundId)!==Number(roundId))return;
 strokeKeysByLocalId.clear();await remove(ref(db,`rooms/${roomCode}/strokes`)).catch(()=>{});
}
async function doneDrawing(roundId){
 await mutate(old=>{const g=old.drawV2;if(old.game!=='draw'||!g||g.phase!=='draw'||g.drawer!==role||Number(g.roundId)!==Number(roundId))return;return {...old,drawV2:{...g,phase:'guess',guesses:[],lastPoints:0,result:null}}});
}
async function guess(index,roundId){
 await mutate(old=>{
  const g=old.drawV2;if(old.game!=='draw'||!g||g.phase!=='guess'||g.drawer===role||Number(g.roundId)!==Number(roundId))return;
  if(!Number.isInteger(index)||index<0||index>=g.options.length||(g.guesses||[]).includes(index))return;
  const guesses=[...(g.guesses||[]),index],correct=g.options[index]===g.answer,ended=correct||guesses.length>=3,points=correct?(guesses.length===1?2:1):0;
  const rs={...(g.scores||{host:0,guest:0})},gs={...(old.scores||{host:0,guest:0})};
  if(points){rs[role]=(Number(rs[role])||0)+points;gs[role]=(Number(gs[role])||0)+points}
  return {...old,scores:gs,drawV2:{...g,guesses,scores:rs,lastPoints:points,result:ended?(correct?'correct':'incorrect'):null,phase:ended?'result':'guess'}};
 });
}
async function nextRound(roundId){
 if(role!=='host')return;const g=shared?.drawV2;if(!g||g.phase!=='result'||Number(g.roundId)!==Number(roundId))return;
 if(Number(g.roundNo)>=Number(g.total)){
  await mutate(old=>{const d=old.drawV2;if(old.game!=='draw'||!d||d.phase!=='result')return;const hs=Number(d.scores?.host)||0,gs=Number(d.scores?.guest)||0,w=hs===gs?'draw':hs>gs?'host':'guest';return {...old,phase:'finished',result:w,drawV2:{...d,phase:'end',winner:w}}});return;
 }
 await remove(ref(db,`rooms/${roomCode}/strokes`)).catch(()=>{});strokeKeysByLocalId.clear();
 await mutate(old=>{const d=old.drawV2;if(old.game!=='draw'||!d||d.phase!=='result')return;const rr=(Number(old.round)||0)+1;return {...old,round:rr,phase:'playing',result:null,drawV2:nextRoundData(d,rr)}});
}
async function newGame(total){
 if(role!=='host')return;total=[4,6,8,10].includes(Number(total))?Number(total):6;try{localStorage.setItem('roqaya-draw-rounds',String(total))}catch{}
 await remove(ref(db,`rooms/${roomCode}/strokes`)).catch(()=>{});strokeKeysByLocalId.clear();
 await mutate(old=>{if(old.game!=='draw')return;const rr=(Number(old.round)||0)+1;return {...old,round:rr,phase:'playing',result:null,drawV2:freshGame(rr,total)}});
}
async function goCity(){if(role!=='host')return;await mutate(old=>old.game==='draw'?{...old,game:'lobby',phase:'lobby'}:old)}

addEventListener('message',e=>{
 if(e.origin!==location.origin)return;const d=e.data||{};
 if(d.type==='roqaya-draw-ready'){sendConfig();sendAllLines();return}
 if(d.type==='roqaya-draw-segment'){addSegment(d.line||{},Number(d.roundId));return}
 if(d.type==='roqaya-draw-undo'){undoStroke(String(d.strokeId||''),Number(d.roundId));return}
 if(d.type==='roqaya-draw-clear'){clearDrawing(Number(d.roundId));return}
 if(d.type==='roqaya-draw-done'){doneDrawing(Number(d.roundId));return}
 if(d.type==='roqaya-draw-guess'){guess(Number(d.index),Number(d.roundId));return}
 if(d.type==='roqaya-draw-next'){nextRound(Number(d.roundId));return}
 if(d.type==='roqaya-draw-new'){newGame(Number(d.total));return}
 if(d.type==='roqaya-draw-city'){goCity();return}
});

const observer=new MutationObserver(()=>{if(observerBusy)return;observerBusy=true;queueMicrotask(()=>{observerBusy=false;cardUpgrade();if(shared?.game==='draw'&&shared?.drawV2)sendConfig()})});
if(screen)observer.observe(screen,{childList:true,subtree:true});
addEventListener('hashchange',bindRoom);addEventListener('pageshow',()=>{bindRoom();syncUi()});
async function boot(){for(let i=0;i<120&&getApps().length===0;i++)await new Promise(r=>setTimeout(r,50));const app=getApps()[0];if(!app)return;auth=getAuth(app);db=getDatabase(app);onAuthStateChanged(auth,user=>{uid=user?.uid||'';bindRoom()});bindRoom()}
boot();
