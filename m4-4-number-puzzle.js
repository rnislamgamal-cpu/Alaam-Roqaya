import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen = document.querySelector('#screen');
const SIZES = [3,4,5];
const DEFAULT_SIZE = 4;
const EASTERN = '٠١٢٣٤٥٦٧٨٩';

let db = null;
let auth = null;
let uid = '';
let roomCode = '';
let meta = null;
let shared = null;
let role = '';
let unsubMeta = null;
let unsubState = null;
let uiBusy = false;
let uiQueued = false;
let uiForce = false;
let clockTimer = null;

const arabicDigits = value => String(value ?? '').replace(/[0-9]/g, d => EASTERN[d.charCodeAt(0)-48]);
const childName = () => String(shared?.childName || 'رقية');
const playerName = p => p === 'host' ? 'بابا' : childName();
const isSolved = (board,n) => Array.isArray(board) && board.length === n*n && board.every((v,i)=>v===((i+1)%(n*n)));
const validSize = value => SIZES.includes(Number(value)) ? Number(value) : DEFAULT_SIZE;
const fmt = sec => `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;

function currentRoomCode(){
  return location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
}
function savedSize(){
  try { return validSize(localStorage.getItem('roqaya-number-puzzle-size') || DEFAULT_SIZE); }
  catch { return DEFAULT_SIZE; }
}
function saveSize(size){
  try { localStorage.setItem('roqaya-number-puzzle-size', String(validSize(size))); } catch {}
}
function bestKey(size){ return `roqaya-number-puzzle-best-${size}`; }
function getBest(size){
  try { return Number(localStorage.getItem(bestKey(size))) || 0; }
  catch { return 0; }
}
function saveBest(size,moves){
  if(!Number.isFinite(moves) || moves <= 0) return;
  const old = getBest(size);
  if(!old || moves < old){
    try { localStorage.setItem(bestKey(size), String(moves)); } catch {}
  }
}
function secureIndex(max){
  if(max <= 1) return 0;
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % max;
  } catch {
    return Math.floor(Math.random()*max);
  }
}
function solvedBoard(n){
  return Array.from({length:n*n-1},(_,i)=>i+1).concat(0);
}
// Solvability is guaranteed because we scramble by legal blank moves from solved state.
function makeShuffle(n){
  const board = solvedBoard(n);
  let zero = board.length-1, previous = -1;
  const rounds = n*n*45;
  for(let k=0;k<rounds;k++){
    const r=Math.floor(zero/n), c=zero%n, options=[];
    if(r>0) options.push(zero-n);
    if(r<n-1) options.push(zero+n);
    if(c>0) options.push(zero-1);
    if(c<n-1) options.push(zero+1);
    const choices=options.filter(i=>i!==previous);
    const next=choices[secureIndex(choices.length)];
    board[zero]=board[next]; board[next]=0;
    previous=zero; zero=next;
  }
  if(isSolved(board,n)){
    const z=board.indexOf(0), candidate=z-n>=0?z-n:z-1;
    board[z]=board[candidate]; board[candidate]=0;
  }
  return board;
}
function slideBoard(source,n,index){
  const board=[...source], zero=board.indexOf(0);
  if(index<0 || index>=board.length || index===zero || !board[index]) return null;
  const r=Math.floor(index/n), c=index%n, zr=Math.floor(zero/n), zc=zero%n;
  if(r!==zr && c!==zc) return null;
  const step = r===zr ? (zc>c?1:-1) : (zr>r?n:-n);
  let k=zero, shifted=0;
  while(k!==index){
    board[k]=board[k-step];
    k-=step;
    shifted++;
  }
  board[index]=0;
  return shifted ? board : null;
}
function elapsed(player){
  if(!player?.startedAt) return 0;
  const end=player.completedAt || Date.now();
  return Math.max(0,Math.floor((end-player.startedAt)/1000));
}
function correctCount(player,n){
  const board=player?.board || [];
  return board.reduce((sum,v,i)=>sum+(v!==0 && v===i+1?1:0),0);
}
function playerState(initial){
  return {board:[...initial],moves:0,startedAt:null,completedAt:null};
}
async function mutate(transform){
  if(!db || !roomCode || !role) return null;
  try{
    return await runTransaction(ref(db,`rooms/${roomCode}/state`), current=>{
      if(!current) return;
      return transform(current);
    },{applyLocally:false});
  }catch(error){
    console.warn('number puzzle transaction',error);
    return null;
  }
}
async function startRound(size=savedSize()){
  if(role!=='host' || !meta?.guestUid) return;
  size=validSize(size); saveSize(size);
  const initial=makeShuffle(size);
  await mutate(old=>({
    ...old,
    game:'number-puzzle',
    phase:'playing',
    round:(Number(old.round)||0)+1,
    numberPuzzle:{
      size,
      initial,
      winner:null,
      createdAt:Date.now(),
      players:{host:playerState(initial),guest:playerState(initial)}
    }
  }));
}
async function goLobby(){
  if(role!=='host') return;
  await mutate(old=>({...old,game:'lobby',phase:'lobby'}));
}
async function playIndex(index){
  const game=shared?.numberPuzzle, n=validSize(game?.size);
  const mine=game?.players?.[role];
  if(shared?.game!=='number-puzzle' || shared?.phase==='finished' || mine?.completedAt) return;
  await mutate(old=>{
    if(old.game!=='number-puzzle' || !old.numberPuzzle) return;
    const g=old.numberPuzzle, size=validSize(g.size), p=g.players?.[role];
    if(!p || p.completedAt) return;
    const nextBoard=slideBoard(p.board,size,index);
    if(!nextBoard) return;
    const now=Date.now(), moves=(Number(p.moves)||0)+1;
    const done=isSolved(nextBoard,size);
    const nextPlayer={...p,board:nextBoard,moves,startedAt:p.startedAt||now,completedAt:done?now:null};
    const players={...g.players,[role]:nextPlayer};
    const bothDone=Boolean(players.host?.completedAt && players.guest?.completedAt);
    let winner=g.winner||null;
    const scores={...(old.scores||{host:0,guest:0})};
    if(done && !winner){
      winner=role;
      scores[role]=(Number(scores[role])||0)+3;
    }
    return {
      ...old,
      scores,
      phase:bothDone?'finished':'playing',
      numberPuzzle:{...g,players,winner}
    };
  });
}
function updateRole(){
  if(!uid || !meta){ role=''; return; }
  role=meta.hostUid===uid?'host':meta.guestUid===uid?'guest':'';
}
function cleanupRoom(){
  try{unsubMeta?.();}catch{}
  try{unsubState?.();}catch{}
  unsubMeta=unsubState=null;
  meta=null; shared=null; role='';
}
function bindRoom(){
  const next=currentRoomCode();
  if(next===roomCode && unsubMeta && unsubState) return;
  cleanupRoom(); roomCode=next;
  if(!db || !uid || !roomCode){ scheduleUi(true); return; }
  unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{
    meta=snap.val(); updateRole(); scheduleUi(true);
  });
  unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{
    shared=snap.val(); updateRole(); scheduleUi(true);
  });
}
function gameCard(){
  const disabled=role!=='host'||!meta?.guestUid?'disabled':'';
  return `<button class="game-choice game-card-number-puzzle roqaya-number-puzzle-card" data-number-puzzle-start ${disabled}>
    <span class="game-card-art"><span class="emoji">🔢</span></span>
    <strong>بازل الأرقام</strong>
    <small>رتّبي الأرقام • ٣×٣ / ٤×٤ / ٥×٥</small>
  </button>`;
}
function ensureLobbyCard(){
  if(shared?.game!=='lobby') return;
  const grid=screen?.querySelector('.lobby-game-grid');
  if(!grid) return;
  let card=grid.querySelector('.roqaya-number-puzzle-card');
  if(!card){
    grid.insertAdjacentHTML('beforeend',gameCard());
    card=grid.querySelector('.roqaya-number-puzzle-card');
  }
  const shouldDisable=role!=='host'||!meta?.guestUid;
  if(card && card.disabled!==shouldDisable) card.disabled=shouldDisable;
  const count=screen.querySelector('.games-heading-row span');
  const wanted=`${arabicDigits(grid.querySelectorAll('.game-choice').length)} لعبة`;
  if(count && count.textContent!==wanted) count.textContent=wanted;
}
function tileMarkup(board,n){
  return board.map((value,index)=>{
    if(!value) return '';
    const left=(index%n)*100/n, top=Math.floor(index/n)*100/n;
    const ok=value===index+1?' ok':'';
    return `<button class="number-puzzle-tile${ok}" data-number-puzzle-index="${index}"
      style="--left:${left}%;--top:${top}%;--n:${n}"
      aria-label="رقم ${arabicDigits(value)}">${arabicDigits(value)}</button>`;
  }).join('');
}
function resultText(game){
  if(!game?.winner) return '';
  const winner=playerName(game.winner);
  return `<div class="number-puzzle-winner">🏆 أول واحد خلّص: <strong>${winner}</strong>${game.winner===role?' — +٣ ⭐':''}</div>`;
}
function renderGame(){
  const game=shared?.numberPuzzle;
  if(!screen || shared?.game!=='number-puzzle' || !game || !role) return;
  const n=validSize(game.size), mine=game.players?.[role]||playerState(game.initial||solvedBoard(n));
  const host=game.players?.host||playerState(game.initial||[]);
  const guest=game.players?.guest||playerState(game.initial||[]);
  if(mine.completedAt) saveBest(n,Number(mine.moves)||0);
  const best=getBest(n);
  const hostProgress=correctCount(host,n), guestProgress=correctCount(guest,n);
  const status = mine.completedAt
    ? `✅ خلّصت البازل في ${arabicDigits(mine.moves)} حركة و${arabicDigits(fmt(elapsed(mine)))}`
    : game.winner
      ? `${playerName(game.winner)} خلّص الأول 🏆 — كمّل بازلِك!`
      : 'رتّب الأرقام من ١ للآخر وسيب الفراغ في النهاية.';
  const controls=role==='host'
    ? `<div class="number-puzzle-controls">
        <label>الصعوبة
          <select id="number-puzzle-size">
            <option value="3" ${n===3?'selected':''}>٣×٣ — سهل</option>
            <option value="4" ${n===4?'selected':''}>٤×٤ — متوسط</option>
            <option value="5" ${n===5?'selected':''}>٥×٥ — صعب</option>
          </select>
        </label>
        <button class="btn primary" data-number-puzzle-new>🔄 لعبة جديدة</button>
        <button class="btn soft" data-number-puzzle-lobby>🎡 المدينة</button>
      </div>`
    : `<div class="number-puzzle-controls guest"><span>🔒 بابا بيحدد المستوى</span></div>`;
  screen.innerHTML=`<div class="panel number-puzzle-panel">
    <div class="number-puzzle-top">
      <div><h2>🧩 بازل الأرقام</h2><small>${arabicDigits(n)}×${arabicDigits(n)} • نفس الخلطة عند بابا و${childName()}</small></div>
      ${role==='host'?'':'<span class="tag green">👧 '+childName()+'</span>'}
    </div>
    <div class="number-puzzle-duo">
      <div><strong>👨 بابا</strong><span>${arabicDigits(host.moves||0)} حركة</span><small>${arabicDigits(hostProgress)}/${arabicDigits(n*n-1)} صح</small>${host.completedAt?'<b>✅</b>':''}</div>
      <div><strong>👧 ${childName()}</strong><span>${arabicDigits(guest.moves||0)} حركة</span><small>${arabicDigits(guestProgress)}/${arabicDigits(n*n-1)} صح</small>${guest.completedAt?'<b>✅</b>':''}</div>
    </div>
    ${resultText(game)}
    <div class="number-puzzle-stats">
      <div><small>الحركات</small><strong id="number-puzzle-moves">${arabicDigits(mine.moves||0)}</strong></div>
      <div><small>الوقت</small><strong id="number-puzzle-time">${arabicDigits(fmt(elapsed(mine)))}</strong></div>
      <div><small>أفضل نتيجة</small><strong>${best?arabicDigits(best):'—'}</strong></div>
    </div>
    <div class="number-puzzle-board" style="--n:${n}" role="group" aria-label="لوح بازل الأرقام">
      ${tileMarkup(mine.board||game.initial,n)}
    </div>
    <p class="number-puzzle-status">${status}</p>
    ${controls}
    <p class="number-puzzle-hint">اضغط على أي رقم في نفس صف أو عمود الفراغ؛ كل الأرقام بينه وبين الفراغ هتتحرك. الرقم الذهبي في مكانه الصح.</p>
  </div>`;
}
function updateClock(){
  if(shared?.game!=='number-puzzle') return;
  const mine=shared?.numberPuzzle?.players?.[role];
  const el=document.querySelector('#number-puzzle-time');
  if(el && mine) el.textContent=arabicDigits(fmt(elapsed(mine)));
}
function ensureUi(){
  if(uiBusy) return;
  uiBusy=true;
  try{
    if(shared?.game==='number-puzzle'){
      if(!screen?.querySelector('.number-puzzle-panel')) renderGame();
    }else if(shared?.game==='lobby'){
      ensureLobbyCard();
    }
  }finally{ uiBusy=false; }
}
function scheduleUi(force=false){
  if(force) uiForce=true;
  if(uiQueued) return;
  uiQueued=true;
  queueMicrotask(()=>{
    uiQueued=false;
    const forceRender=uiForce;
    uiForce=false;
    if(shared?.game==='number-puzzle'){
      if(forceRender || !screen?.querySelector('.number-puzzle-panel')) renderGame();
    }else{
      ensureUi();
    }
  });
}

document.addEventListener('click',async event=>{
  const start=event.target.closest?.('[data-number-puzzle-start]');
  if(start){ event.preventDefault(); event.stopPropagation(); return startRound(savedSize()); }
  const tile=event.target.closest?.('[data-number-puzzle-index]');
  if(tile){ event.preventDefault(); event.stopPropagation(); return playIndex(Number(tile.dataset.numberPuzzleIndex)); }
  const fresh=event.target.closest?.('[data-number-puzzle-new]');
  if(fresh){
    event.preventDefault(); event.stopPropagation();
    const size=validSize(document.querySelector('#number-puzzle-size')?.value||savedSize());
    return startRound(size);
  }
  const lobby=event.target.closest?.('[data-number-puzzle-lobby]');
  if(lobby){ event.preventDefault(); event.stopPropagation(); return goLobby(); }
},true);

document.addEventListener('change',event=>{
  if(event.target?.id==='number-puzzle-size') saveSize(event.target.value);
},true);

addEventListener('keydown',event=>{
  if(shared?.game!=='number-puzzle' || shared?.phase==='finished') return;
  const game=shared.numberPuzzle, n=validSize(game.size), mine=game.players?.[role];
  if(!mine?.board || mine.completedAt) return;
  const delta={ArrowUp:n,ArrowDown:-n,ArrowLeft:1,ArrowRight:-1}[event.key];
  if(!delta) return;
  const z=mine.board.indexOf(0), index=z+delta;
  if(index<0 || index>=n*n || (Math.abs(delta)===1 && Math.floor(index/n)!==Math.floor(z/n))) return;
  event.preventDefault(); playIndex(index);
});

const observer=new MutationObserver(()=>scheduleUi());
if(screen) observer.observe(screen,{childList:true,subtree:true});
addEventListener('hashchange',()=>{ bindRoom(); scheduleUi(true); });
addEventListener('pageshow',()=>{ bindRoom(); scheduleUi(true); });

async function boot(){
  // app.js initializes the default Firebase app first. Wait for it rather than
  // creating a second default app, which would break the existing game.
  for(let i=0;i<120 && getApps().length===0;i++){
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  const app=getApps()[0];
  if(!app){ console.warn('number puzzle: Firebase app not available'); return; }
  auth=getAuth(app); db=getDatabase(app);
  onAuthStateChanged(auth,user=>{
    uid=user?.uid||'';
    bindRoom(); scheduleUi(true);
  });
  bindRoom();
  clockTimer=setInterval(updateClock,1000);
  scheduleUi(true);
}
boot();
