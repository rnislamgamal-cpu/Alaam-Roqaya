/* M4.23 — طبقة الاحتفال والتغذية الراجعة الموحّدة
 * تلتقط زيادة النقاط في state.scores لأي لعبة، وتعلن الفوز بشكل ثابت:
 *   قصاصات + نغمة نجاح (Web Audio) + اهتزاز خفيف + شريط رسالة عربي.
 * - تحترم prefers-reduced-motion تلقائياً.
 * - لا تُغيّر أي حالة Firebase (قراءة فقط) → لا تكرار جائزة (§10).
 * - النطق مسموح هنا؛ «اقرأ» تُستثنى لأنها تمنع النطق (تُرث عبر m4-21).
 */
import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

const ROOM_RE=/^#room=([A-Z2-9]{8})$/;
const currentRoom=()=>location.hash.match(ROOM_RE)?.[1]||'';
const REDUCED=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const TTS_FORBIDDEN_GAMES=new Set(['reading-v1','read']);   /* «اقرأ»: النطق ممنوع نهائياً */
const LABELS={
  draw:'الرسم والتخمين',memory:'كروت الذاكرة',ttt:'إكس أو',odd:'مين المختلف؟','odd-v2':'مين المختلف؟',
  count:'عدّ الصور',pattern:'كمّل النمط','pattern-v2':'كمّل النمط',animals:'بيوت الحيوانات',colors:'ألوان وأشكال',
  math:'حساب الملاهي','math-kids-v1':'نلعب بالأرقام',treasure:'رحلة الكنز',read:'اقرئي واختاري','reading-v1':'اقرئي واختاري',
  english:'عربي وإنجليزي',compare:'ترتيب ومقارنة',numberline:'الرقم الناقص',snakes:'السلم والثعبان',
  coloring:'كتاب التلوين',jigsaw:'البازل',sorting:'فرز الألوان والأشكال',phonics:'الحروف والصور',
  connect4:'إكس أو','hide-seek-v1':'خبّي ودوّر'
};
const E='٠١٢٣٤٥٦٧٨٩';
const ar=v=>String(v).replace(/[0-9]/g,d=>E[d.charCodeAt(0)-48]);

/* ---------- صوت (Web Audio، بدون ملفات) ---------- */
let AC=null;
function ac(){
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    return AC;
  }catch{return null}
}
function tone(freq,dur=.16,when=0,type='triangle',vol=.15){
  const c=ac();if(!c)return;
  const t=c.currentTime+when,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.03);
}
function sfxPoint(){[660,880,1180].forEach((f,i)=>tone(f,.14,i*.075))}
function sfxWin(){[523,659,784,1046,1318].forEach((f,i)=>tone(f,.22,i*.11))}
function buzz(ms){try{navigator.vibrate?.(ms)}catch{}}

/* ---------- واجهة ---------- */
let layer=null,toastTimer=0,lastKey='';
function ensureLayer(){
  if(layer)return layer;
  layer=document.createElement('div');
  layer.className='m4-celebrate-layer';
  layer.setAttribute('aria-live','polite');
  layer.setAttribute('aria-atomic','true');
  layer.innerHTML='<div class="m4-cf-box" aria-hidden="true"></div><div class="m4-toast" role="status"></div>';
  document.body.appendChild(layer);
  return layer;
}
function confetti(n){
  if(REDUCED)return;
  const box=layer.querySelector('.m4-cf-box');
  const cols=['#7c5cff','#ff7ab6','#4cc4ff','#ffb020','#22b573','#ff6b6b'];
  for(let i=0;i<n;i++){
    const d=document.createElement('i');
    d.className='m4-cf';
    d.style.insetInlineStart=Math.random()*100+'%';
    d.style.background=cols[i%cols.length];
    d.style.animationDuration=(1.1+Math.random()*1.1)+'s';
    d.style.animationDelay=(Math.random()*.25)+'s';
    box.appendChild(d);
    setTimeout(()=>d.remove(),2600);
  }
}
function toast(text,kind='point'){
  ensureLayer();
  const el=layer.querySelector('.m4-toast');
  el.textContent=text;
  el.className='m4-toast m4-show m4-'+kind;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{el.className='m4-toast'},2400);
}
function say(text,game){
  if(!text||TTS_FORBIDDEN_GAMES.has(game))return;
  try{
    if(!('speechSynthesis' in window))return;
    const u=new SpeechSynthesisUtterance(text);
    u.lang='ar-EG';u.rate=1;u.pitch=1.15;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch{}
}

let db=null,auth=null,uid='',roomCode='',meta=null,unsubMeta=null,unsubState=null;
let prev=null,busy=false;

function updateRole(){return meta?.hostUid===uid?'host':meta?.guestUid===uid?'guest':''}
function childName(state){return String(state?.childName||'رقية')}

/* نلتقط زيادة النقاط فقط — لا نكتب أي شيء */
function onState(state){
  if(busy)return;
  const role=updateRole();
  if(!state||state.phase==='hub'||state.game==='lobby'){prev=null;return}
  const scores=state.scores||{host:0,guest:0};
  const game=String(state.game||'');
  const round=Number(state.round)||0;
  const snap={h:Number(scores.host)||0,g:Number(scores.guest)||0,game,round};
  if(!prev){prev=snap;return}
  const dh=snap.h-prev.h, dg=snap.g-prev.g;
  /* نتجاهل تغيّر اللعبة أو الجولة (إعادة ضبط النقاط = ليست نقطة) */
  if(snap.game!==prev.game||snap.round!==prev.round||dh<0||dg<0){prev=snap;return}
  if(dh<=0&&dg<=0){prev=snap;return}
  const me=role==='host'?dh:dg;
  const opp=role==='host'?dg:dh;
  const key=`${snap.game}:${snap.round}:${snap.h}:${snap.g}`;
  if(key===lastKey){prev=snap;return}
  lastKey=key;
  const name=childName(state);
  const guessKiller=snap.game==='hide-seek-v1';
  let text,kind='point',speak=null;
  if(me>0&&opp>0){
    text=`نقطة للاتنين! 💜`;kind='both';
  }else if(me>0){
    text=`برافو يا ${nameOfMe(role,state)}! ⭐`;kind='win';speak=`برافو يا ${nameOfMe(role,state)}`;
  }else{
    const who=role==='host'?name:'بابا';
    text=guessKiller?`${who} خبّي صح! 😎`:`${who} كسب نقطة 👏`;kind='opp';
  }
  const fresh=state.phase==='finished'||state.result;
  toast(text,kind);
  if(kind==='win'){confetti(30);sfxPoint();buzz([18,40,18]);say(speak||text,game)}
  else if(kind==='both'){confetti(22);sfxPoint();buzz(20)}
  else {tone(440,.12,0,'sine',.1)}
  if(fresh&&state.phase==='finished'){
    const winner=state.result;
    if(winner===role){
      const winnerName=nameOfMe(role,state);
      toast(`🏆 ${winnerName} كسب اللعبة — مبروك يا بطل!`,'win');
      confetti(60);sfxWin();buzz([30,60,30,60,60]);say(`مبروك يا ${winnerName}!`,game);
    }else{
      const who=role==='host'?name:'بابا';
      toast(`🏆 ${who} كسب اللعبة — لعبة حلوة!`,'opp');
      confetti(20);tone(392,.2,0,'sine',.12);
    }
  }
  prev=snap;
}
function nameOfMe(role,state){
  return role==='host'?'بابا':childName(state);
}
function bindRoom(){
  const next=currentRoom();
  if(next===roomCode&&unsubMeta&&unsubState)return;
  try{unsubMeta?.()}catch{};try{unsubState?.()}catch{};
  unsubMeta=unsubState=null;meta=null;prev=null;roomCode=next;
  if(!db||!uid||!roomCode)return;
  unsubMeta=onValue(ref(db,`rooms/${roomCode}/meta`),s=>{meta=s.val()});
  unsubState=onValue(ref(db,`rooms/${roomCode}/state`),s=>{onState(s.val())});
}
/* أول تفاعل يفتح سياق الصوت (سياسات المتصفح) */
addEventListener('pointerdown',()=>ac(),{once:true});
addEventListener('hashchange',bindRoom);
addEventListener('pageshow',()=>{bindRoom()});

async function boot(){
  for(let i=0;i<120&&getApps().length===0;i++)await new Promise(r=>setTimeout(r,50));
  const app=getApps()[0];if(!app)return;
  auth=getAuth(app);db=getDatabase(app);
  ensureLayer();
  onAuthStateChanged(auth,user=>{uid=user?.uid||'';bindRoom()});
  bindRoom();
}
boot();
