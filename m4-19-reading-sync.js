import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const screen=document.getElementById('screen');
let db=null,auth=null,uid='',roomCode='',meta=null,shared=null,role='';
let unsubMeta=null,unsubState=null,overlay=null,frame=null,observerBusy=false,startBusy=false;
const ROUNDS=10;
const IM_KEYS=new Set(["cat","dog","lion","elephant","horse","cow","chicken","duck","rabbit","monkey","fish","bird","apple","banana","grapes","orange","carrot","bread","milk","egg","car","bus","plane","house","book","ball","clock","phone","key","bag","sun","moon","star","tree","rose","cloud"]);

const L2=[
 ["lion","الْأَسَدُ مَلِكُ الْغَابَةِ"],["elephant","الْفِيلُ حَيَوَانٌ كَبِيرٌ"],["fish","تَسْبَحُ السَّمَكَةُ فِي الْمَاءِ"],
 ["cow","الْبَقَرَةُ تَأْكُلُ الْعُشْبَ",["milk"]],["chicken","تَصِيحُ الدَّجَاجَةُ فِي الصَّبَاحِ",["egg"]],["horse","الْحِصَانُ يَجْرِي بِسُرْعَةٍ"],
 ["duck","تَسْبَحُ الْبَطَّةُ فِي الْبُحَيْرَةِ",["fish"]],["rabbit","الْأَرْنَبُ يَقْفِزُ فِي الْحَدِيقَةِ"],["cat","تَنَامُ الْقِطَّةُ بِهُدُوءٍ"],
 ["dog","يَنْبَحُ الْكَلْبُ بِصَوْتٍ عَالٍ"],["apple","أَكَلَ سَامِي تُفَّاحَةً حَمْرَاءَ"],["banana","الْمَوْزَةُ فَاكِهَةٌ صَفْرَاءُ"],
 ["grapes","أُحِبُّ الْعِنَبَ الْحُلْوَ"],["car","رَكِبَ أَبِي السَّيَّارَةَ",["bus"]],["plane","تَطِيرُ الطَّائِرَةُ فِي السَّمَاءِ",["bird","cloud"]],
 ["house","نَسْكُنُ فِي بَيْتٍ جَمِيلٍ"],["book","قَرَأَتْ لَيْلَى الْكِتَابَ"],["ball","يَلْعَبُ أَحْمَدُ بِالْكُرَةِ"],
 ["sun","تُشْرِقُ الشَّمْسُ فِي الصَّبَاحِ",["moon","star"]],["moon","يَظْهَرُ الْقَمَرُ فِي اللَّيْلِ",["star"]],["tree","الشَّجَرَةُ طَوِيلَةٌ وَخَضْرَاءُ"],
 ["rose","رَسَمَتْ سَلْمَى وَرْدَةً جَمِيلَةً"],["clock","السَّاعَةُ تُشِيرُ إِلَى الْوَاحِدَةِ"]
];
const L3=[
 ["elephant","حَيَوَانٌ ضَخْمٌ لَهُ خُرْطُومٌ طَوِيلٌ وَأُذُنَانِ كَبِيرَتَانِ"],["banana","فَاكِهَةٌ صَفْرَاءُ طَوِيلَةٌ نُقَشِّرُهَا قَبْلَ أَكْلِهَا",["orange"]],
 ["fish","يَعِيشُ فِي الْمَاءِ وَلَهُ زَعَانِفُ",["duck"]],["clock","نَنْظُرُ إِلَيْهَا لِنَعْرِفَ الْوَقْتَ",["phone"]],
 ["bus","نَرْكَبُهَا مَعَ أَصْدِقَائِنَا لِنَذْهَبَ إِلَى الْمَدْرَسَةِ",["car","plane"]],["moon","يُضِيءُ السَّمَاءَ فِي اللَّيْلِ وَيَتَغَيَّرُ شَكْلُهُ",["star"]],
 ["star","تَلْمَعُ فِي السَّمَاءِ لَيْلًا وَهِيَ صَغِيرَةٌ جِدًّا",["moon"]],["cow","حَيَوَانٌ فِي الْمَزْرَعَةِ نَشْرَبُ لَبَنَهُ",["milk","chicken"]],
 ["chicken","تَعِيشُ فِي الْمَزْرَعَةِ وَتَضَعُ الْبَيْضَ",["egg","duck","cow"]],["sun","تُعْطِينَا الضَّوْءَ وَالدِّفْءَ فِي النَّهَارِ",["moon","star"]],
 ["book","نَقْرَؤُهُ لِنَتَعَلَّمَ وَنَسْتَمْتِعَ بِالْقِصَصِ",["phone"]],["key","نَفْتَحُ بِهِ بَابَ الْبَيْتِ",["house"]],
 ["bag","يَحْمِلُهَا التِّلْمِيذُ عَلَى ظَهْرِهِ وَفِيهَا كُتُبُهُ",["book"]],["rose","زَهْرَةٌ جَمِيلَةٌ رَائِحَتُهَا طَيِّبَةٌ وَلَهَا أَشْوَاكٌ",["tree"]],
 ["lion","حَيَوَانٌ قَوِيٌّ لَهُ شَعْرٌ كَثِيفٌ حَوْلَ رَأْسِهِ"],["carrot","خُضْرَةٌ بُرْتُقَالِيَّةٌ تُحِبُّهَا الْأَرَانِبُ",["rabbit","orange"]],
 ["bird","يُغَرِّدُ عَلَى الْأَغْصَانِ وَيَطِيرُ",["plane","duck","chicken"]],["egg","نَأْكُلُهَا فِي الْفُطُورِ وَتَخْرُجُ مِنْهَا الْكَتَاكِيتُ",["chicken"]]
];
const L1=[...IM_KEYS].map(k=>[k,k]);
const BANK={1:L1,2:L2,3:L3};

const currentRoom=()=>location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1]||'';
const childName=()=>String(shared?.childName||'رقية');
function seed(){try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]&0x7fffffff}catch{return Math.floor(Math.random()*0x7fffffff)}}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s,n){let h=Math.imul(2166136261^s,16777619);h=Math.imul(h^n,16777619);h^=h>>>13;h=Math.imul(h,0x5bd1e995);return(h^(h>>>15))>>>0}
function shuffle(a,R){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function buildKeys(s,l,rounds){
  const R=rng(hash(s,911)),take=(L,n)=>shuffle(L,R).slice(0,n).map(q=>q[0]);
  if(l==='mix'){const a=Math.round(rounds*.3),b=Math.round(rounds*.4);return[...take(L1,a),...take(L2,b),...take(L3,rounds-a-b)]}
  return take(BANK[Number(l)],rounds);
}
function freshPlayer(){return{index:0,stars:0,firstTry:0,tries:0,wrongs:[],done:false}}
function freshMatch(roundId){return{v:1,roundId,seed:seed(),level:null,rounds:ROUNDS,phase:'choose',players:{host:freshPlayer(),guest:freshPlayer()},winner:null,awarded:false}}
function cleanup(){try{unsubMeta?.()}catch{};try{unsubState?.()}catch{};unsubMeta=unsubState=null;meta=null;shared=null;role=''}
function updateRole(){role=meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
async function mutate(transform){
 if(!db||!roomCode||!role)return;
 try{return await runTransaction(ref(db,`rooms/${roomCode}/state`),cur=>{if(!cur)return;return transform(cur)},{applyLocally:false})}
 catch(e){console.warn('reading sync',e)}
}
async function startGame(){
 if(startBusy||role!=='host'||!meta?.guestUid)return;
 startBusy=true;
 try{
  await mutate(old=>{if(old.game!=='lobby')return;const rr=(Number(old.round)||0)+1;return{...old,game:'reading-v1',phase:'playing',round:rr,result:null,readingV1:freshMatch(rr)}})
 }finally{startBusy=false}
}
async function chooseLevel(level,roundId){
 if(role!=='host'||![1,2,3,'mix'].includes(level))return;
 await mutate(old=>{
  const g=old.readingV1;if(old.game!=='reading-v1'||!g||g.level||Number(g.roundId)!==Number(roundId))return;
  return{...old,readingV1:{...g,level,phase:'playing',players:{host:freshPlayer(),guest:freshPlayer()},winner:null,awarded:false}};
 });
}
async function answer(key,question,roundId){
 if(!IM_KEYS.has(key))return;
 await mutate(old=>{
  const g=old.readingV1;if(old.game!=='reading-v1'||!g||!g.level||Number(g.roundId)!==Number(roundId))return;
  const p={...(g.players?.[role]||freshPlayer())};if(p.done||Number(p.index)!==Number(question))return;
  const keys=buildKeys(Number(g.seed)||1,g.level,Number(g.rounds)||ROUNDS),correct=keys[question];
  if(!correct)return;
  const wrongs=Array.isArray(p.wrongs)?[...p.wrongs]:[],tries=(Number(p.tries)||0)+1;
  if(key!==correct){
    if(!wrongs.includes(key))wrongs.push(key);
    p.tries=tries;p.wrongs=wrongs;
  }else{
    const got=tries===1?3:tries===2?2:1;
    p.stars=(Number(p.stars)||0)+got;if(tries===1)p.firstTry=(Number(p.firstTry)||0)+1;
    p.index=Number(p.index)+1;p.tries=0;p.wrongs=[];p.done=p.index>=keys.length;
  }
  const players={...(g.players||{}),[role]:p};let awarded=Boolean(g.awarded),winner=g.winner||null,phase=old.phase,result=old.result||null;
  const scores={...(old.scores||{host:0,guest:0})};
  if(players.host?.done&&players.guest?.done&&!awarded){
    const hs=Number(players.host.stars)||0,gs=Number(players.guest.stars)||0;
    winner=hs===gs?'draw':hs>gs?'host':'guest';awarded=true;phase='finished';result=winner;
    if(winner==='draw'){scores.host=(Number(scores.host)||0)+1;scores.guest=(Number(scores.guest)||0)+1}
    else scores[winner]=(Number(scores[winner])||0)+3;
  }
  return{...old,scores,phase,result,readingV1:{...g,players,awarded,winner}};
 });
}
async function newGame(roundId){
 if(role!=='host')return;
 await mutate(old=>{
  const g=old.readingV1;if(old.game!=='reading-v1'||!g||Number(g.roundId)!==Number(roundId)||!g.players?.host?.done||!g.players?.guest?.done)return;
  const rr=(Number(old.round)||0)+1;return{...old,phase:'playing',round:rr,result:null,readingV1:freshMatch(rr)};
 });
}
async function goCity(){if(role!=='host')return;await mutate(old=>old.game==='reading-v1'?{...old,game:'lobby',phase:'lobby'}:old)}

function cardMarkup(){
 const disabled=role!=='host'||!meta?.guestUid?'disabled':'';
 return`<button class="game-choice rg-game-tile rg-cat-letters roqaya-reading-card" data-reading-start data-rg-category="letters" ${disabled}>
 <span class="game-card-art"><svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><path class="fb" d="M5 15l27 5 27-5v38l-27 6-27-6z"></path><path class="fw" d="M9 11c8-3 16-2 23 3v38c-7-5-15-6-23-3z"></path><path class="fw" d="M55 11c-8-3-16-2-23 3v38c7-5 15-6 23-3z"></path><path class="fr" d="M29 4h6v20l-3-3-3 3z"></path><text class="tx" x="20" y="36" font-size="17" text-anchor="middle">ا</text><text class="tx" x="44" y="36" font-size="17" text-anchor="middle">ب</text></svg></span>
 <strong class="rg-game-label">اقرأ</strong><small>كلمات وجمل وأوصاف • ٤ مستويات</small></button>`;
}
function ensureLobbyCard(){
 if(shared?.game!=='lobby')return;
 const grid=screen?.querySelector('.lobby-game-grid');if(!grid)return;
 let card=grid.querySelector('.roqaya-reading-card');if(!card){grid.insertAdjacentHTML('beforeend',cardMarkup());card=grid.querySelector('.roqaya-reading-card')}
 const disabled=role!=='host'||!meta?.guestUid;if(card&&card.disabled!==disabled)card.disabled=disabled;
}
function ensureOverlay(){
 if(overlay)return overlay;
 overlay=document.createElement('section');overlay.id='reading-v1-overlay';overlay.className='reading-v1-overlay';overlay.hidden=true;
 overlay.innerHTML='<iframe class="reading-v1-frame" src="arabic-reading-game.html?v=1" title="اقرأ" loading="eager"></iframe>';
 screen.insertAdjacentElement('afterend',overlay);frame=overlay.querySelector('iframe');frame.addEventListener('load',sendConfig);return overlay;
}
function sendConfig(){
 const g=shared?.readingV1;if(!frame?.contentWindow||shared?.game!=='reading-v1'||!g||!role)return;
 frame.contentWindow.postMessage({type:'roqaya-reading-config',config:{role,childName:childName(),roundId:Number(g.roundId)||Number(shared.round)||0,seed:Number(g.seed)||1,level:g.level??null,rounds:Number(g.rounds)||ROUNDS,phase:g.phase||'choose',players:g.players||{host:freshPlayer(),guest:freshPlayer()},winner:g.winner||null}},location.origin);
}
function activate(){ensureOverlay();document.body.classList.add('reading-v1-active');screen.setAttribute('aria-hidden','true');overlay.hidden=false;sendConfig()}
function deactivate(){document.body.classList.remove('reading-v1-active');screen?.removeAttribute('aria-hidden');if(overlay)overlay.hidden=true}
function syncUi(){if(shared?.game==='lobby'){deactivate();ensureLobbyCard();return}if(shared?.game==='reading-v1'&&shared?.readingV1&&role){activate();return}deactivate()}
function bindRoom(){
 const next=currentRoom();if(next===roomCode&&unsubMeta&&unsubState)return;
 cleanup();roomCode=next;if(!db||!uid||!roomCode){syncUi();return}
 unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),snap=>{meta=snap.val();updateRole();syncUi()});
 unsubState=onValue(ref(db,`rooms/${roomCode}/state`),snap=>{shared=snap.val();updateRole();syncUi()});
}
document.addEventListener('click',e=>{const card=e.target.closest?.('[data-reading-start]');if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();startGame()},true);
addEventListener('message',e=>{
 if(e.origin!==location.origin)return;const d=e.data||{};
 if(d.type==='roqaya-reading-ready'){sendConfig();return}
 if(d.type==='roqaya-reading-level'){const lv=d.level==='mix'?'mix':Number(d.level);chooseLevel(lv,Number(d.roundId));return}
 if(d.type==='roqaya-reading-answer'){answer(String(d.key||''),Number(d.question),Number(d.roundId));return}
 if(d.type==='roqaya-reading-new'){newGame(Number(d.roundId));return}
 if(d.type==='roqaya-reading-city'){goCity();return}
});
const observer=new MutationObserver(()=>{if(observerBusy)return;observerBusy=true;queueMicrotask(()=>{observerBusy=false;if(shared?.game==='lobby')ensureLobbyCard();if(shared?.game==='reading-v1'&&shared?.readingV1)sendConfig()})});
if(screen)observer.observe(screen,{childList:true,subtree:true});
addEventListener('hashchange',bindRoom);addEventListener('pageshow',()=>{bindRoom();syncUi()});
async function boot(){for(let i=0;i<120&&getApps().length===0;i++)await new Promise(r=>setTimeout(r,50));const app=getApps()[0];if(!app)return;auth=getAuth(app);db=getDatabase(app);onAuthStateChanged(auth,user=>{uid=user?.uid||'';bindRoom()});bindRoom()}
boot();
