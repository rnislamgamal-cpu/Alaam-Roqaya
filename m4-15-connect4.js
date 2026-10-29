import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,observerBusy=false,startBusy=false;
const ROWS=6,COLS=7;

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');
const other=p=>p==='host'?'guest':'host';
const pnum=p=>p==='host'?1:2;

function cleanup(){
  try{unsubMeta?.()}catch{};try{unsubState?.()}catch{};
  unsubMeta=unsubState=null;meta=null;shared=null;role='';
}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
  if(!db||!roomCode||!role)return;
  try{
    return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{
      if(!cur)return;
      return transform(cur);
    },{applyLocally:false});
  }catch(e){console.warn('connect4 sync',e)}
}
function fresh(roundId,wins={host:0,guest:0},starter='host',gameNo=1){
  return {
    v:1,roundId,board:Array(ROWS*COLS).fill(0),turn:starter,starter,
    winner:null,wins:{host:Number(wins.host)||0,guest:Number(wins.guest)||0},
    winningCells:[],lastMove:null,moveSeq:0,gameNo
  };
}
function winLine(board,r,c,p){
  const at=(y,x)=>y>=0&&y<ROWS&&x>=0&&x<COLS&&board[y*COLS+x]===p;
  for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]){
    const line=[[r,c]];
    for(const sign of [1,-1]){
      let y=r+dy*sign,x=c+dx*sign;
      while(at(y,x)){line.push([y,x]);y+=dy*sign;x+=dx*sign}
    }
    if(line.length>=4)return line.map(([y,x])=>y*COLS+x);
  }
  return [];
}
async function startGame(){
  if(startBusy||role!=='host'||!meta?.guestUid)return;
  startBusy=true;
  try{
    await mutate(old=>{
      if(old.game!=='lobby')return;
      const rr=(Number(old.round)||0)+1;
      return {...old,game:'connect4',phase:'playing',round:rr,result:null,connect4V1:fresh(rr)};
    });
  }finally{startBusy=false}
}
async function drop(column,roundId){
  if(!Number.isInteger(column)||column<0||column>=COLS)return;
  await mutate(old=>{
    const g=old.connect4V1;
    if(old.game!=='connect4'||old.phase!=='playing'||!g||g.winner||g.turn!==role||Number(g.roundId)!==Number(roundId))return;
    const board=Array.isArray(g.board)?[...g.board]:Array(42).fill(0);
    let row=ROWS-1;
    while(row>=0&&board[row*COLS+column])row--;
    if(row<0)return;
    const player=pnum(role),index=row*COLS+column;
    board[index]=player;
    const winningCells=winLine(board,row,column,player);
    const full=board.every(Boolean);
    const winner=winningCells.length?role:full?'draw':null;
    const wins={...(g.wins||{host:0,guest:0})};
    const scores={...(old.scores||{host:0,guest:0})};
    if(winner==='host'||winner==='guest'){
      wins[winner]=(Number(wins[winner])||0)+1;
      scores[winner]=(Number(scores[winner])||0)+3;
    }else if(winner==='draw'){
      scores.host=(Number(scores.host)||0)+1;
      scores.guest=(Number(scores.guest)||0)+1;
    }
    const seq=(Number(g.moveSeq)||0)+1;
    return {...old,scores,phase:winner?'finished':'playing',...(winner?{result:winner}:{}),connect4V1:{
      ...g,board,winner,winningCells,turn:winner?g.turn:other(role),moveSeq:seq,
      lastMove:{seq,index,row,column,player:role}
    }};
  });
}
async function newRound(roundId){
  if(role!=='host')return;
  await mutate(old=>{
    const g=old.connect4V1;
    if(old.game!=='connect4'||!g||!g.winner||Number(g.roundId)!==Number(roundId))return;
    const rr=(Number(old.round)||0)+1,starter=other(g.starter||'host');
    return {...old,phase:'playing',round:rr,result:null,connect4V1:fresh(rr,g.wins,starter,(Number(g.gameNo)||1)+1)};
  });
}
async function goCity(){
  if(role!=='host')return;
  await mutate(old=>old.game==='connect4'?{...old,game:'lobby',phase:'lobby'}:old);
}

function cardMarkup(){
  const disabled=role!=='host'||!meta?.guestUid?'disabled':'';
  return `<button class="game-choice game-card-connect4 rg-game-tile rg-cat-games roqaya-connect4-card" data-connect4-start data-rg-category="games" ${disabled}>
    <span class="game-card-art" data-rg-icon="connect4">
      <svg class="ic" viewBox="0 0 64 64" aria-hidden="true">
        <rect class="fb" x="5" y="10" width="54" height="44" rx="7"></rect>
        <g class="fw" stroke-width="2">
          <circle cx="15" cy="20" r="5"></circle><circle cx="27" cy="20" r="5"></circle><circle cx="39" cy="20" r="5"></circle><circle cx="51" cy="20" r="5"></circle>
          <circle cx="15" cy="32" r="5"></circle><circle cx="27" cy="32" r="5"></circle><circle cx="39" cy="32" r="5"></circle><circle cx="51" cy="32" r="5"></circle>
          <circle cx="15" cy="44" r="5"></circle><circle cx="27" cy="44" r="5"></circle><circle cx="39" cy="44" r="5"></circle><circle cx="51" cy="44" r="5"></circle>
        </g>
        <circle class="fr" cx="15" cy="44" r="5" stroke-width="2"></circle>
        <circle class="fy" cx="27" cy="44" r="5" stroke-width="2"></circle>
        <circle class="fr" cx="27" cy="32" r="5" stroke-width="2"></circle>
        <circle class="fy" cx="39" cy="44" r="5" stroke-width="2"></circle>
        <circle class="fr" cx="39" cy="32" r="5" stroke-width="2"></circle>
        <circle class="fy" cx="39" cy="20" r="5" stroke-width="2"></circle>
      </svg>
    </span>
    <strong class="rg-game-label">4 في صف</strong>
    <small>بابا ضد ${childName()} • وصّل ٤</small>
  </button>`;
}
function ensureLobbyCard(){
  if(shared?.game!=='lobby')return;
  const grid=screen?.querySelector('.lobby-game-grid');if(!grid)return;
  let card=grid.querySelector('.roqaya-connect4-card');
  if(!card){grid.insertAdjacentHTML('beforeend',cardMarkup());card=grid.querySelector('.roqaya-connect4-card')}
  const disabled=role!=='host'||!meta?.guestUid;
  if(card&&card.disabled!==disabled)card.disabled=disabled;
  const small=card?.querySelector('small'),wanted=`بابا ضد ${childName()} • وصّل ٤`;
  if(small&&small.textContent!==wanted)small.textContent=wanted;
}
function ensureOverlay(){
  if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='connect4-v1-overlay';overlay.className='connect4-v1-overlay';overlay.hidden=true;
  overlay.innerHTML='<iframe class="connect4-v1-frame" src="connect4-game.html?v=1" title="4 في صف" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);
  return overlay;
}
function sendConfig(){
  const g=shared?.connect4V1;
  if(!frame?.contentWindow||shared?.game!=='connect4'||!g||!role)return;
  frame.contentWindow.postMessage({type:'roqaya-connect4-config',config:{
    role,childName:childName(),roundId:Number(g.roundId)||Number(shared.round)||0,
    board:Array.isArray(g.board)?g.board:Array(42).fill(0),turn:g.turn||'host',starter:g.starter||'host',
    winner:g.winner||null,wins:g.wins||{host:0,guest:0},winningCells:g.winningCells||[],
    lastMove:g.lastMove||null,gameNo:Number(g.gameNo)||1
  }},location.origin);
}
function activate(){
  ensureOverlay();document.body.classList.add('connect4-v1-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig();
}
function deactivate(){
  document.body.classList.remove('connect4-v1-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true;
}
function syncUi(){
  if(shared?.game==='lobby'){deactivate();ensureLobbyCard();return}
  if(shared?.game==='connect4'&&shared?.connect4V1&&role){activate();return}
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
  const card=e.target.closest?.('[data-connect4-start]');
  if(card){e.preventDefault();e.stopPropagation();startGame();return}
},true);

addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.type==='roqaya-connect4-ready'){sendConfig();return}
  if(d.type==='roqaya-connect4-drop'){drop(Number(d.column),Number(d.roundId));return}
  if(d.type==='roqaya-connect4-new'){newRound(Number(d.roundId));return}
  if(d.type==='roqaya-connect4-city'){goCity();return}
});

const observer=new MutationObserver(()=>{
  if(observerBusy)return;observerBusy=true;
  queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')ensureLobbyCard();if(shared?.game==='connect4'&&shared?.connect4V1)sendConfig()});
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
