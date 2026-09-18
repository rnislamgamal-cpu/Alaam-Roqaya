import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, set, get, onValue, runTransaction, push, remove, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (selector) => document.querySelector(selector);
const screen = $('#screen');
const message = $('#message');
const connection = $('#connection');
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DRAW_ITEMS = [
  { name:'قطة', emoji:'🐱', choices:['🐱','🐶','🐰'] },
  { name:'شمس', emoji:'☀️', choices:['☀️','🌙','⭐'] },
  { name:'تفاحة', emoji:'🍎', choices:['🍎','🍌','🍇'] },
  { name:'سمكة', emoji:'🐟', choices:['🐟','🐢','🦋'] },
  { name:'بيت', emoji:'🏠', choices:['🏠','🚗','🚀'] },
  { name:'وردة', emoji:'🌹', choices:['🌹','🌳','🍄'] },
  { name:'قلب', emoji:'❤️', choices:['❤️','⭐','☁️'] },
  { name:'سيارة', emoji:'🚗', choices:['🚗','🚲','🚂'] },
  { name:'بالونة', emoji:'🎈', choices:['🎈','🎁','🎀'] },
  { name:'فراشة', emoji:'🦋', choices:['🦋','🐝','🐞'] },
  { name:'موزة', emoji:'🍌', choices:['🍌','🍎','🍐'] },
  { name:'نجمة', emoji:'⭐', choices:['⭐','☀️','🌙'] }
];
const MEMORY_EMOJI = [
  '🐱','🐶','🐸','🦊','🐼','🐻','🐰','🦁','🐯','🐨','🐵','🐮','🐷','🐧','🐢',
  '🦋','🐝','🐞','🐬','🐳','🐙','🦀','🦄','🦖','🐘','🦒','🦓','🐿️','🦉','🐥',
  '🍎','🍌','🍉','🍇','🍓','🍒','🍍','🥝','🥕','🌽','🍋','🥑','🍄','🌻','🌈',
  '🚗','🚀','🚂','🚲','✈️','⚽','🎈','🎁','🎠','🎡','⭐','☀️','🌙','💎','🏀'
];
const MEMORY_SIZES = [8,12,16,20,24,30];
const QUIZ_GAMES = ['odd','count','pattern','animals','colors','math'];
const GAMES = ['draw','memory','ttt',...QUIZ_GAMES,'treasure'];
const GAME_LABELS = {
  draw:['🎨','ارسم وخمّن','واحد يرسم والتاني يخمّن'],
  memory:['🃏','كروت الذاكرة','8–30 كارت أو عدد متغيّر'],
  ttt:['❌⭕','إكس أو','3 نقاط للفائز'],
  odd:['🔍','مين المختلف؟','اكتشف الصورة الغريبة'],
  count:['🔢','عدّ الصور','احسب عدد الرموز'],
  pattern:['🧩','كمّل النمط','خمن الصورة الجاية'],
  animals:['🐾','بيوت الحيوانات','اختار مكان الحيوان'],
  colors:['🌈','ألوان وأشكال','اختار اللون المطلوب'],
  math:['➕','حساب الملاهي','جمع بسيط وممتع'],
  treasure:['🗝️','رحلة الكنز','4 مفاتيح بالتناوب']
};
const ODD_GROUPS = [
  ['🐱','🐶','🐰','🚗'], ['🍎','🍌','🍓','🐢'],
  ['🚗','🚲','🚂','🌻'], ['☀️','⭐','🌙','🍇'],
  ['⚽','🏀','🎾','🐝'], ['🦁','🐯','🐼','🎈'],
  ['🍉','🍒','🥝','✈️'], ['🐬','🐳','🐙','🚀']
];
const ANIMAL_QUESTIONS = [
  ['أين يعيش السمك؟ 🐟','🌊 في الماء',['🌊 في الماء','🌳 على الشجرة','🏜️ في الصحراء']],
  ['أين يعيش الجمل؟ 🐪','🏜️ في الصحراء',['🏜️ في الصحراء','🌊 في البحر','❄️ وسط الثلج']],
  ['أين تعيش الأسماك الملونة؟ 🐠','🌊 في الماء',['🌊 في الماء','🌳 على الشجرة','☁️ في السحاب']],
  ['أين تعيش النحلة؟ 🐝','🌸 قرب الزهور',['🌸 قرب الزهور','🌊 تحت البحر','🏠 داخل الثلاجة']],
  ['أين ينام الطائر عادة؟ 🐦','🪺 في العش',['🪺 في العش','🛁 في البانيو','🚗 في السيارة']],
  ['ما الذي يأكله الأرنب غالبًا؟ 🐰','🥕 الجزر',['🥕 الجزر','🔩 المسامير','🧱 الطوب']]
];
const COLOR_QUESTIONS = [
  ['اختار اللون الأحمر ❤️','🔴',['🔴','🔵','🟢']],
  ['اختار اللون الأزرق 💙','🔵',['🟡','🔵','🟣']],
  ['اختار اللون الأخضر 💚','🟢',['🟠','🟢','🔴']],
  ['اختار اللون الأصفر 💛','🟡',['🟣','🔵','🟡']],
  ['اختار اللون البرتقالي 🧡','🟠',['🟠','🔴','🟢']],
  ['اختار اللون البنفسجي 💜','🟣',['🔵','🟣','🟡']]
];
const TREASURE_QUESTIONS = [
  ['اختار مفتاح الشمس ☀️','☀️',['☀️','🌙','⭐']],
  ['اختار مفتاح القلب ❤️','❤️',['🌻','❤️','🍎']],
  ['اختار مفتاح القمر 🌙','🌙',['🪐','⭐','🌙']],
  ['اختار مفتاح النجمة ⭐','⭐',['⭐','☀️','💎']],
  ['اختار مفتاح السمكة 🐠','🐠',['🐠','🐱','🐝']],
  ['اختار مفتاح الوردة 🌹','🌹',['🌷','🌹','🌈']]
];
let memoryPreference = 'random';
let soundEnabled = true;
let audioContext = null;
let lastAudioFeedback = null;
try { soundEnabled = localStorage.getItem('roqaya-sound') !== 'off'; memoryPreference = localStorage.getItem('roqaya-memory') || 'random'; } catch (_) {}
function sound(type='tap') {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(()=>{});
    const notes = type === 'good' ? [[523,0,.11],[659,.12,.12],[784,.24,.18]]
      : type === 'bad' ? [[330,0,.14],[247,.15,.20]]
      : type === 'win' ? [[523,0,.10],[659,.1,.10],[784,.2,.12],[1047,.34,.22]]
      : [[520,0,.035]];
    const start = audioContext.currentTime;
    for (const [frequency,offset,duration] of notes) {
      const oscillator=audioContext.createOscillator();
      const volume=audioContext.createGain();
      oscillator.type=type==='bad'?'triangle':'sine';
      oscillator.frequency.value=frequency;
      volume.gain.setValueAtTime(.0001,start+offset);
      volume.gain.exponentialRampToValueAtTime(type==='tap'?.027:.075,start+offset+.012);
      volume.gain.exponentialRampToValueAtTime(.0001,start+offset+duration);
      oscillator.connect(volume).connect(audioContext.destination);
      oscillator.start(start+offset);oscillator.stop(start+offset+duration+.015);
    }
  } catch (_) { /* Sound is optional on browsers that block audio. */ }
}
function soundControl() {
  let control=document.querySelector('#sound-toggle');
  if (!control) {
    control=document.createElement('button');
    control.type='button';control.id='sound-toggle';control.className='sound-toggle';
    control.addEventListener('click',()=>{
      soundEnabled=!soundEnabled;
      try { localStorage.setItem('roqaya-sound',soundEnabled?'on':'off'); } catch (_) {}
      soundControl();if(soundEnabled)sound('good');
    });
    document.querySelector('.header')?.append(control);
  }
  control.textContent=soundEnabled?'🔊 الصوت شغال':'🔇 الصوت مقفول';
  control.setAttribute('aria-label',soundEnabled?'إيقاف الأصوات':'تشغيل الأصوات');
}
function feedbackSignal(old,next) {
  if (!old || !next?.feedback || old.feedback?.seq === next.feedback.seq) return;
  sound(next.feedback.type);
}
function addFeedback(old,type) { return {seq:(old.feedback?.seq||0)+1,type}; }
function newQuestion(which,previousIndex=-1) {
  const pick=(length)=>{let n=Math.floor(Math.random()*length);if(length>1 && n===previousIndex)n=(n+1)%length;return n;};
  if(which==='odd') {
    const n=pick(ODD_GROUPS.length), items=ODD_GROUPS[n];
    const options=shuffle(items);
    return {index:n,prompt:'مين الصورة المختلفة عن التلاتة الباقيين؟',display:'',options,correct:options.indexOf(items[3])};
  }
  if(which==='count') {
    const n=2+Math.floor(Math.random()*7);
    const emoji=['🍎','🐱','⭐','🎈','🐠'][Math.floor(Math.random()*5)];
    const alternatives=shuffle([String(n),String(n===9?n-2:n+1),String(n===2?n+2:n-1)]);
    return {index:n,prompt:'عدّ الصور… كام واحدة؟',display:Array(n).fill(emoji).join(' '),options:alternatives,correct:alternatives.indexOf(String(n))};
  }
  if(which==='pattern') {
    const pairs=[['🔴','🔵','🟢'],['🐱','🐶','🐰'],['⭐','🌙','☀️'],['🍎','🍌','🍇'],['💜','💛','💚']];
    const n=pick(pairs.length),[a,b,c]=pairs[n];
    const options=shuffle([a,b,c]);
    return {index:n,prompt:'إيه الصورة اللي هتيجي مكان علامة السؤال؟',display:`${a} ${b} ${a} ${b} ❓`,options,correct:options.indexOf(a)};
  }
  const bank=which==='animals'?ANIMAL_QUESTIONS:which==='colors'?COLOR_QUESTIONS:TREASURE_QUESTIONS;
  if(which==='animals'||which==='colors'||which==='treasure') {
    const n=pick(bank.length),[prompt,correct,choices]=bank[n];
    const options=shuffle(choices);
    return {index:n,prompt,display:'',options,correct:options.indexOf(correct)};
  }
  const a=1+Math.floor(Math.random()*5),b=1+Math.floor(Math.random()*5),sum=a+b;
  const options=shuffle([String(sum),String(sum+1),String(sum-1)]);
  return {index:a*10+b,prompt:'كام نتيجة الجمع؟',display:`${a} + ${b} = ❓`,options,correct:options.indexOf(String(sum))};
}

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let auth, db, uid, roomCode = '', role = '', meta = null, state = null, presence = {}, strokes = {};
let connected = false, unsubs = [], presenceBound = false, hideKey = '', pointerIsDown = false;
let lastPoint = null, lastDrawAt = 0, lastRenderingKey = '';

function info(text) { message.hidden = !text; message.textContent = text || ''; }
function humanError(error) {
  console.error(error);
  const code = error?.code || '';
  if (code.includes('permission-denied')) return 'Firebase رفض العملية. راجع قواعد Database وتأكد إنك حفظتها بالنشر.';
  if (code.includes('auth/operation-not-allowed')) return 'فعّل Anonymous من Firebase Authentication أولًا.';
  if (code.includes('auth/unauthorized-domain')) return 'أضف نطاق GitHub Pages إلى Authorized domains في Firebase Authentication.';
  if (code.includes('network') || code.includes('unavailable')) return 'فيه مشكلة اتصال بالإنترنت. حاول مرة تانية.';
  return `حصل خطأ: ${code || error?.message || 'غير معروف'}`;
}
function shuffle(items) {
  const out = [...items];
  for (let i = out.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [out[i],out[j]] = [out[j],out[i]];
  }
  return out;
}
function randomCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map(n=>LETTERS[n % LETTERS.length]).join('');
}
function other(player) { return player === 'host' ? 'guest' : 'host'; }
function nameOf(player) { return player === 'host' ? 'بابا' : 'رقية'; }
function canPlay() { return Boolean(meta?.guestUid); }
function isTurn(player) { return player === role; }
function scorePanel() {
  const a = state?.scores?.host || 0, b = state?.scores?.guest || 0;
  const statusA = presence[meta?.hostUid] ? '🟢 متصل' : '⚪ غير متصل';
  const statusB = presence[meta?.guestUid] ? '🟢 متصلة' : '⚪ غير متصلة';
  return `<div class="scoreboard">
    <div class="score"><span>👨 بابا • ${statusA}</span><strong>${a} ⭐</strong></div>
    <div class="score rose"><span>👧 رقية • ${statusB}</span><strong>${b} ⭐</strong></div>
  </div>`;
}
function renderHome() {
  const invitation = /^#room=([A-Z2-9]{8})$/.exec(location.hash)?.[1] || '';
  screen.innerHTML = `<div class="panel center">
    <div class="hero"><div class="big-emoji">🎡 🎠 🎈</div><h2>أهلًا بيكم في عالم رقية!</h2><p>10 ألعاب مسلّية لبابا ورقية من أي مكان 💜</p></div>
    <div class="btn-row"><button class="btn primary full" data-action="create">🎟️ بابا: اعمل غرفة جديدة</button></div>
    <p class="rule">أو ادخلي غرفة بابا بالكود:</p>
    <label for="room-input" class="tiny">رمز الغرفة • 8 حروف أو أرقام</label>
    <input class="input code-input" id="room-input" maxlength="8" spellcheck="false" autocomplete="off" autocapitalize="characters" value="${invitation}" placeholder="ABCD2345" aria-label="رمز الغرفة" />
    <div class="btn-row"><button class="btn pink full" data-action="join">🎀 رقية: ادخلي الغرفة</button></div>
    <p class="hint">رمز الغرفة خاص. ابعته لبنتك فقط؛ ما تنشروش علنًا.</p>
  </div>`;
}
function renderLobby() {
  const waiting = !canPlay();
  screen.innerHTML = `<div class="panel center">
    <div class="big-emoji">🎪</div><h2>${waiting ? 'مستنيين رقية تدخل 💌' : 'يلا نلعب سوا! 🎉'}</h2>
    <p>رمز الغرفة</p><div class="room-code" aria-label="رمز الغرفة">${roomCode}</div>
    <div class="btn-row"><button class="btn soft" data-action="copy">🔗 نسخ رابط الدعوة</button></div>
    ${scorePanel()}
    ${waiting ? '<p class="hint">ابعث الرابط لرقية، وتفتح اللعبة من موبايلها وتضغط دخول الغرفة.</p>' : '<p class="hint">بابا يختار اللعبة؛ ورقية هتشوف نفس اللعبة فورًا.</p>'}
    <h3 class="game-title">🎮 اختاروا لعبة الملاهي</h3>
    <div class="memory-settings"><label for="memory-size">🃏 حجم لعبة الذاكرة (بابا يختار):</label>
      <select id="memory-size" class="input" ${role !== 'host'?'disabled':''}>
        <option value="random" ${memoryPreference==='random'?'selected':''}>🎲 عدد مختلف كل جولة (8–30 كارت)</option>
        ${MEMORY_SIZES.map(n=>`<option value="${n}" ${memoryPreference===String(n)?'selected':''}>${n} كارت (${n/2} أزواج)</option>`).join('')}
      </select>
      <p class="hint">الاختيار بيتطبق لما بابا يبدأ جولة ذاكرة جديدة.</p>
    </div>
    <div class="game-grid">
      ${GAMES.map(key=>`<button class="game-choice" data-game="${key}" ${role !== 'host' || waiting ? 'disabled':''}><span class="emoji">${GAME_LABELS[key][0]}</span>${GAME_LABELS[key][1]}<small>${GAME_LABELS[key][2]}</small></button>`).join('')}
    </div>
    ${role === 'guest' ? '<p class="hint">استني بابا يختار اللعبة 🎠</p>' : ''}
  </div>`;
}
function gameHeading(icon, title) {
  return `<div class="topline"><span class="tag">${icon} ${title}</span>${role === 'host' ? '<button class="btn soft" data-action="lobby">🎡 المدينة</button>' : '<span class="tag green">غرفة خاصة 🔒</span>'}</div>${scorePanel()}`;
}
function finishBox() {
  if (state.phase !== 'finished') return '';
  const result = state.result;
  const title = result === 'draw' ? 'تعادل جميل! 🤝' : result === 'host' ? 'بابا كسب الجولة! 🎉' : result === 'guest' ? 'رقية كسبت الجولة! 🎉' : 'خلصت الجولة! 🎉';
  return `<div class="finish"><div class="big-emoji">🏆</div><strong>${title}</strong><p class="hint">النقاط متجمعة بين الألعاب.</p></div>`;
}
function renderMemory() {
  const game = state.memory;
  if (!game) return;
  const revealed = game.revealed || [], matched = game.matched || [];
  const cards = (game.cards || []).map((emoji,i) => {
    const open = revealed.includes(i) || matched.includes(i);
    const css = matched.includes(i) ? 'matched' : open ? 'open' : '';
    const disabled = state.phase !== 'playing' || game.waiting || game.turn !== role || open;
    return `<button class="memory-card ${css}" data-memory="${i}" aria-label="كارت ${i+1}${open?' '+emoji:''}" ${disabled?'disabled':''}>${open?emoji:'؟'}</button>`;
  }).join('');
  screen.innerHTML = `<div class="panel">${gameHeading('🃏','كروت الذاكرة')}
    <h2 class="game-title center">افتح كارتين شبه بعض • ${game.cards.length} كارت</h2>
    <p class="status">${state.phase === 'finished' ? 'كل الكروت اتكشفت! 🎊' : game.waiting ? 'بنبص على الكروت... 👀' : game.turn === role ? 'دورك دلوقتي! ✨' : `دور ${nameOf(game.turn)} ⏳`}</p>
    <div class="memory-grid ${game.cards.length>=24?'very-dense':game.cards.length>=16?'dense':''}">${cards}</div>
    ${finishBox()}
    ${role === 'host' && state.phase === 'finished' ? '<div class="btn-row"><button class="btn primary" data-action="restart">🔁 جولة جديدة</button></div>' : ''}
    <p class="rule center">كل زوج متطابق = ⭐ واحدة • صاحب الزوج يلعب مرة كمان</p>
  </div>`;
  if (game.waiting && state.phase === 'playing') scheduleHide(game);
}
function outcome(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] !== '.' && board[a] === board[b] && board[b] === board[c]) return board[a] === 'X' ? 'host' : 'guest';
  }
  return board.includes('.') ? null : 'draw';
}
function renderTtt() {
  const game = state.ttt;
  if (!game) return;
  const cells = [...game.board].map((mark,i) => `<button class="ttt-cell ${mark==='X'?'x':mark==='O'?'o':''}" data-cell="${i}" aria-label="خانة ${i+1}" ${mark !== '.' || game.turn !== role || state.phase !== 'playing' ? 'disabled':''}>${mark==='.'?'':mark==='X'?'❌':'⭕'}</button>`).join('');
  screen.innerHTML = `<div class="panel">${gameHeading('❌⭕','إكس أو')}
    <h2 class="game-title center">حط علامتك في 3 خانات على خط واحد</h2>
    <p class="status">${state.phase === 'finished'?'الجولة خلصت 🎊':game.turn===role?'دورك دلوقتي! ✨':`دور ${nameOf(game.turn)} ⏳`}</p>
    <div class="ttt-grid">${cells}</div>
    ${finishBox()}
    ${role === 'host' && state.phase === 'finished' ? '<div class="btn-row"><button class="btn primary" data-action="restart">🔁 جولة جديدة</button></div>' : ''}
    <p class="rule center">بابا ❌ • رقية ⭕ • الفوز 3 ⭐ والتعادل ⭐ لكل واحد</p>
  </div>`;
}
function renderDraw() {
  const game = state.draw;
  if (!game) return;
  const item = DRAW_ITEMS[game.promptIndex];
  if (!item) { info('فيه مشكلة في السؤال. بابا يقدر يرجع للمدينة.'); return; }
  const drawer = game.drawer === role;
  const options = (game.options || []).map((emoji,i) => {
    const chosen = (game.guesses || []).includes(emoji);
    return `<button class="choice ${chosen?'chosen':''}" data-guess="${i}" ${drawer || chosen || state.phase !== 'playing' ? 'disabled':''} aria-label="${emoji}">${emoji}</button>`;
  }).join('');
  let caption;
  if (state.phase === 'finished') caption = `الإجابة: ${item.emoji} ${item.name} — ${state.result === 'correct' ? 'برافو! 👏' : 'حاولوا تاني الجولة الجاية 💕'}`;
  else caption = drawer ? `ارسم ${item.name} ${item.emoji} من غير ما تقول الإجابة!` : `شوف الرسمة واختار الصورة الصح! ${game.guesses?.length ? 'جرب اختيار تاني 💪' : ''}`;
  screen.innerHTML = `<div class="panel">${gameHeading('🎨','ارسم وخمّن')}
    <h2 class="game-title center">${drawer?'🖍️ دورك ترسم':'👀 دورك تخمّن'}</h2>
    <p class="status">${caption}</p>
    <div class="drawing-wrap ${drawer && state.phase==='playing'?'':'readonly'}"><canvas id="drawing" width="800" height="600" aria-label="لوحة الرسم المشتركة"></canvas></div>
    ${drawer && state.phase==='playing' ? '<p class="hint center">استخدم صباعك للرسم على اللوحة ✏️</p>' : ''}
    ${!drawer && state.phase==='playing' ? `<div class="choices">${options}</div>` : ''}
    ${state.phase==='finished'?`<div class="finish"><strong>${state.result==='correct'?'🎉 إجابة صحيحة!':'💜 خلصت المحاولات'}</strong><p>رسّام الجولة الجاية: ${nameOf(other(game.drawer))}</p></div>`:''}
    ${role==='host' && state.phase==='finished' ? '<div class="btn-row"><button class="btn primary" data-action="next-draw">🎨 الرسمة اللي بعدها</button></div>' : ''}
    ${drawer && state.phase==='playing' ? '<div class="btn-row"><button class="btn soft" data-action="clear-draw">🧽 امسح الرسمة وابدأ تاني</button></div>' : ''}
    <p class="rule center">الصح من أول اختيار = 2 ⭐ • من المحاولة التانية أو التالتة = 1 ⭐</p>
  </div>`;
  redrawCanvas();
  bindCanvas(drawer && state.phase === 'playing');
}
function renderQuiz() {
  const key=state.game, quiz=state.quiz;
  if (!quiz?.question) return;
  const q=quiz.question;
  const canAnswer=state.phase==='playing' && quiz.turn===role;
  const buttons=q.options.map((option,i)=>`<button class="quiz-choice" data-quiz="${i}" ${!canAnswer?'disabled':''}>${option}</button>`).join('');
  const result=state.phase==='finished' ? `<div class="finish"><strong>${state.result==='correct'?'🎉 برافو! إجابة صح':'💜 محاولة حلوة! الإجابة الصحيحة:'}</strong><p class="answer-reveal">${q.options[q.correct]}</p></div>` : '';
  screen.innerHTML=`<div class="panel">${gameHeading(...GAME_LABELS[key].slice(0,2))}
    <h2 class="game-title center">${q.prompt}</h2>
    ${q.display?`<div class="quiz-display" aria-label="صور السؤال">${q.display}</div>`:''}
    <p class="status">${state.phase==='finished'?'الجولة خلصت 🎉':canAnswer?'دورك دلوقتي! ✨':`دور ${nameOf(quiz.turn)} ⏳`}</p>
    <div class="quiz-options">${buttons}</div>
    ${result}
    ${role==='host'&&state.phase==='finished'?'<div class="btn-row"><button class="btn primary" data-action="restart">🔁 سؤال جديد</button></div>':''}
    <p class="rule center">إجابة صحيحة = ⭐ نقطتين • الدور بيتبدّل كل سؤال</p>
  </div>`;
}
function renderTreasure() {
  const treasure=state.treasure;
  if(!treasure?.question)return;
  const q=treasure.question;
  const canAnswer=state.phase==='playing'&&treasure.turn===role;
  const buttons=q.options.map((option,i)=>`<button class="quiz-choice" data-treasure="${i}" ${!canAnswer||treasure.wrong?.includes(i)?'disabled':''}>${option}</button>`).join('');
  screen.innerHTML=`<div class="panel">${gameHeading('🗝️','رحلة الكنز')}
    <h2 class="game-title center">افتحوا صندوق الكنز سوا! 🧰</h2>
    <div class="treasure-progress">${Array.from({length:4},(_,i)=>`<span>${i<treasure.stage?'🔑':'🔒'}</span>`).join('')}</div>
    ${state.phase==='finished'?`<div class="finish"><div class="big-emoji">🎁</div><strong>فتحتوا صندوق الكنز! 🎉</strong><p>بابا: ${treasure.roundScores.host} ⭐ • رقية: ${treasure.roundScores.guest} ⭐</p></div>`:
    `<h3 class="game-title center">${q.prompt}</h3><p class="status">${canAnswer?'دورك تختار المفتاح ✨':`دور ${nameOf(treasure.turn)} ⏳`}</p><div class="quiz-options">${buttons}</div>`}
    ${role==='host'&&state.phase==='finished'?'<div class="btn-row"><button class="btn primary" data-action="restart">🎁 كنز جديد</button></div>':''}
    <p class="rule center">كل مفتاح صح = ⭐ لصاحبه • الغلط يسلّم الدور للتاني</p>
  </div>`;
}
function render() {
  connection.textContent = !uid ? '⏳ جاري الاتصال' : connected ? '🟢 الإنترنت متصل' : '🟠 الاتصال مقطوع';
  if (!roomCode) { renderHome(); return; }
  if (!meta || !state) { screen.innerHTML = '<div class="panel center"><div class="big-emoji">🎠</div><h2>جاري دخول الملاهي…</h2></div>'; return; }
  if (state.game === 'lobby') return renderLobby();
  if (state.game === 'memory') return renderMemory();
  if (state.game === 'ttt') return renderTtt();
  if (state.game === 'draw') return renderDraw();
  if (QUIZ_GAMES.includes(state.game)) return renderQuiz();
  if (state.game === 'treasure') return renderTreasure();
  screen.innerHTML = '<div class="panel"><p>اللعبة غير معروفة. اطلب من بابا يرجع للمدينة.</p></div>';
}
async function mutateState(transform) {
  if (!roomCode || !role) return;
  try {
    return await runTransaction(ref(db, `rooms/${roomCode}/state`), current => {
      // Firebase may invoke the updater with null before the server value is cached.
      const latest = current ?? state;
      if (!latest) return;
      return transform(latest);
    }, { applyLocally:false });
  } catch (e) { info(humanError(e)); }
}
function newGame(which, old, previousDraw) {
  const scores = {...(old?.scores || { host:0,guest:0 })};
  const round = (old?.round || 0) + 1;
  if (which === 'memory') {
    const requested=memoryPreference==='random'?null:Number(memoryPreference);
    const eligible=MEMORY_SIZES.filter(n=>n!==old?.memory?.cards?.length);
    const size=MEMORY_SIZES.includes(requested)?requested:eligible[Math.floor(Math.random()*eligible.length)];
    const picks=shuffle(MEMORY_EMOJI).slice(0,size/2);
    return { game:which,phase:'playing',scores,round,memory:{cards:shuffle([...picks,...picks]),matched:[],revealed:[],roundScores:{host:0,guest:0},waiting:false,turn:round%2===0?'guest':'host'} };
  }
  if (which === 'ttt') return {game:which,phase:'playing',scores,round,ttt:{board:'.........',turn:round%2===0?'guest':'host'}};
  if (QUIZ_GAMES.includes(which)) return {game:which,phase:'playing',scores,round,quiz:{turn:round%2===0?'guest':'host',question:newQuestion(which,old?.quiz?.question?.index)}};
  if (which === 'treasure') return {game:which,phase:'playing',scores,round,treasure:{stage:0,turn:round%2===0?'guest':'host',wrong:[],roundScores:{host:0,guest:0},question:newQuestion('treasure')}};
  const lastIndex = previousDraw?.promptIndex ?? -1;
  let promptIndex = Math.floor(Math.random()*DRAW_ITEMS.length);
  if (DRAW_ITEMS.length>1 && promptIndex===lastIndex) promptIndex=(promptIndex+1)%DRAW_ITEMS.length;
  const item = DRAW_ITEMS[promptIndex];
  return {game:'draw',phase:'playing',scores,round,draw:{drawer:previousDraw?other(previousDraw.drawer):'host',promptIndex,options:shuffle(item.choices),guesses:[]}};
}
async function startGame(which) {
  if (role !== 'host' || !canPlay() || !GAMES.includes(which)) return;
  if (which === 'draw') await remove(ref(db,`rooms/${roomCode}/strokes`)).catch(e=>info(humanError(e)));
  const base = newGame(which,state,which==='draw' && state?.game==='draw'?state.draw:null);
  await mutateState(old=>({...base,scores:{...old.scores}}));
}
async function restart() {
  if (role !== 'host' || state?.phase !== 'finished') return;
  if (state.game === 'draw') return nextDraw();
  const which = state.game;
  const next = newGame(which,state);
  await mutateState(old=>old.phase==='finished' && old.game===which ? {...next,scores:{...old.scores}} : undefined);
}
async function goLobby() {
  if (role !== 'host') return;
  await mutateState(old=>({...old,game:'lobby',phase:'lobby'}));
}
function scheduleHide(game) {
  const key = `${roomCode}:${state.round}:${(game.revealed||[]).join(',')}`;
  if (hideKey === key) return;
  hideKey = key;
  setTimeout(async()=>{
    await mutateState(old=>{
      if (old.game!=='memory' || old.round!==state?.round || !old.memory?.waiting || (old.memory.revealed||[]).join(',')!==(game.revealed||[]).join(',')) return;
      const m = old.memory;
      return {...old,memory:{...m,revealed:[],waiting:false,turn:other(m.turn)}};
    });
  },1350);
}
async function chooseCard(i) {
  await mutateState(old=>{
    if (old.game!=='memory'||old.phase!=='playing') return;
    const m=old.memory;
    if (!m || m.turn!==role || m.waiting || !Number.isInteger(i) || i<0 || i>=m.cards.length || (m.revealed||[]).includes(i) || (m.matched||[]).includes(i)) return;
    const revealed = [...(m.revealed||[]),i];
    if (revealed.length===1) return {...old,memory:{...m,revealed}};
    const [a,b]=revealed;
    if (m.cards[a]===m.cards[b]) {
      const matched=[...(m.matched||[]),a,b];
      const scores={...old.scores,[role]:old.scores[role]+1};
      const roundScores={...(m.roundScores||{host:0,guest:0}),[role]:(m.roundScores?.[role]||0)+1};
      const finished=matched.length===m.cards.length;
      const result=finished ? (roundScores.host===roundScores.guest?'draw':roundScores.host>roundScores.guest?'host':'guest') : undefined;
      return {...old,scores,feedback:addFeedback(old,finished?'win':'good'),phase:finished?'finished':'playing',...(finished?{result}:{}),memory:{...m,revealed:[],matched,roundScores,waiting:false}};
    }
    return {...old,feedback:addFeedback(old,'bad'),memory:{...m,revealed,waiting:true}};
  });
}
async function chooseCell(i) {
  await mutateState(old=>{
    if (old.game!=='ttt'||old.phase!=='playing'||old.ttt?.turn!==role||!Number.isInteger(i)||i<0||i>8||old.ttt.board[i]!=='.') return;
    const mark=role==='host'?'X':'O';
    const board=old.ttt.board.slice(0,i)+mark+old.ttt.board.slice(i+1);
    const result=outcome(board);
    const scores={...old.scores};
    if (result==='draw') { scores.host++;scores.guest++; }
    else if (result) scores[result]+=3;
    return {...old,ttt:{board,turn:other(role)},scores,feedback:addFeedback(old,result?'win':'tap'),phase:result?'finished':'playing',...(result?{result}:{})};
  });
}
async function chooseGuess(index) {
  await mutateState(old=>{
    if (old.game!=='draw'||old.phase!=='playing'||!old.draw||old.draw.drawer===role) return;
    const d=old.draw, emoji=d.options?.[index];
    if (!emoji || (d.guesses||[]).includes(emoji)) return;
    const guesses=[...(d.guesses||[]),emoji];
    const correct=emoji===DRAW_ITEMS[d.promptIndex].emoji;
    const ended=correct||guesses.length>=3;
    const scores={...old.scores};
    if (correct) scores[role]+=guesses.length===1?2:1;
    return {...old,scores,feedback:addFeedback(old,correct?'good':'bad'),draw:{...d,guesses},phase:ended?'finished':'playing',...(ended?{result:correct?'correct':'incorrect'}:{})};
  });
}
async function chooseQuiz(index) {
  await mutateState(old=>{
    if(!QUIZ_GAMES.includes(old.game)||old.phase!=='playing'||old.quiz?.turn!==role)return;
    const q=old.quiz.question;
    if(!Number.isInteger(index)||index<0||index>=q.options.length)return;
    const correct=index===q.correct;
    const scores={...old.scores};
    if(correct)scores[role]+=2;
    return {...old,scores,feedback:addFeedback(old,correct?'good':'bad'),phase:'finished',result:correct?'correct':'incorrect'};
  });
}
async function chooseTreasure(index) {
  await mutateState(old=>{
    if(old.game!=='treasure'||old.phase!=='playing'||old.treasure?.turn!==role)return;
    const t=old.treasure,q=t.question;
    if(!Number.isInteger(index)||index<0||index>=q.options.length||t.wrong?.includes(index))return;
    const correct=index===q.correct, nextStage=t.stage+(correct?1:0);
    const scores={...old.scores},roundScores={...t.roundScores};
    if(correct){scores[role]+=1;roundScores[role]+=1;}
    const finished=nextStage===4;
    const result=finished?(roundScores.host===roundScores.guest?'draw':roundScores.host>roundScores.guest?'host':'guest'):undefined;
    return {...old,scores,feedback:addFeedback(old,finished?'win':correct?'good':'bad'),
      phase:finished?'finished':'playing',...(finished?{result}:{}),
      treasure:{...t,stage:nextStage,turn:other(role),roundScores,wrong:correct?[]:[...(t.wrong||[]),index],
        question:correct&&!finished?newQuestion('treasure',q.index):q}};
  });
}
async function nextDraw() {
  if (role!=='host'||state?.game!=='draw'||state.phase!=='finished') return;
  try { await remove(ref(db,`rooms/${roomCode}/strokes`)); }
  catch(e) { info(humanError(e)); return; }
  const next=newGame('draw',state,state.draw);
  await mutateState(old=>old.game==='draw'&&old.phase==='finished'?{...next,scores:{...old.scores}}:undefined);
}
function round3(x) { return Math.max(0,Math.min(1,Math.round(x*1000)/1000)); }
function redrawCanvas() {
  const canvas=$('#drawing');
  if (!canvas) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#6953d7'; ctx.lineWidth=8; ctx.lineCap='round';ctx.lineJoin='round';
  const all=Object.values(strokes||{});
  for (const line of all) {
    if (![line.x1,line.y1,line.x2,line.y2].every(Number.isFinite)) continue;
    ctx.beginPath();ctx.moveTo(line.x1*canvas.width,line.y1*canvas.height);
    ctx.lineTo(line.x2*canvas.width,line.y2*canvas.height);ctx.stroke();
  }
}
function bindCanvas(enabled) {
  const canvas=$('#drawing');
  if (!canvas || !enabled) return;
  const coords=e=>{const box=canvas.getBoundingClientRect();return {x:round3((e.clientX-box.left)/box.width),y:round3((e.clientY-box.top)/box.height)};};
  const send=(a,b)=>{
    if (!connected || Object.keys(strokes||{}).length>=1400) return;
    push(ref(db,`rooms/${roomCode}/strokes`),{x1:a.x,y1:a.y,x2:b.x,y2:b.y}).catch(e=>info(humanError(e)));
  };
  canvas.addEventListener('pointerdown',e=>{
    e.preventDefault(); pointerIsDown=true;lastPoint=coords(e);lastDrawAt=0;
    canvas.setPointerCapture(e.pointerId);
    send(lastPoint,{x:Math.min(1,lastPoint.x+.001),y:lastPoint.y});
  });
  canvas.addEventListener('pointermove',e=>{
    if (!pointerIsDown||!lastPoint)return;
    e.preventDefault();
    if (performance.now()-lastDrawAt<32)return;
    const p=coords(e); send(lastPoint,p); lastPoint=p;lastDrawAt=performance.now();
  });
  const stop=e=>{
    if (!pointerIsDown)return;
    if (lastPoint && e.type==='pointerup') send(lastPoint,coords(e));
    pointerIsDown=false;lastPoint=null;
  };
  canvas.addEventListener('pointerup',stop);
  canvas.addEventListener('pointercancel',stop);
  canvas.addEventListener('lostpointercapture',()=>{pointerIsDown=false;lastPoint=null;});
}
function detachRoom() {
  for (const unsub of unsubs) try { unsub(); } catch(e) { console.warn(e); }
  unsubs=[];presenceBound=false;meta=null;state=null;presence={};strokes={};role='';lastAudioFeedback=null;
}
function trackPresence() {
  if (presenceBound || !role || !uid) return;
  presenceBound=true;
  const ownRef=ref(db,`rooms/${roomCode}/presence/${uid}`);
  unsubs.push(onValue(ref(db,'.info/connected'),snapshot=>{
    connected=snapshot.val()===true;
    connection.textContent=connected?'🟢 الإنترنت متصل':'🟠 الاتصال مقطوع';
    if (connected) onDisconnect(ownRef).remove().then(()=>set(ownRef,true)).catch(e=>info(humanError(e)));
  }));
}
function subscribeRoom(code) {
  detachRoom(); roomCode=code;
  location.hash=`room=${code}`;
  const base=`rooms/${code}`;
  unsubs.push(onValue(ref(db,`${base}/meta`),snap=>{
    meta=snap.val();
    if (!meta) {info('الغرفة مش موجودة.');roomCode='';detachRoom();render();return;}
    role=meta.hostUid===uid?'host':meta.guestUid===uid?'guest':'';
    if (!role) { info('الغرفة مكتملة أو مش مسموح لك تدخلها.'); detachRoom();roomCode='';location.hash='';render();return; }
    trackPresence();render();
  },e=>{info(humanError(e));detachRoom();roomCode='';location.hash='';render();}));
  unsubs.push(onValue(ref(db,`${base}/state`),snap=>{const oldState=state;state=snap.val();feedbackSignal(oldState,state);render();},e=>info(humanError(e))));
  unsubs.push(onValue(ref(db,`${base}/strokes`),snap=>{strokes=snap.val()||{};redrawCanvas();},e=>info(humanError(e))));
  unsubs.push(onValue(ref(db,`${base}/presence`),snap=>{presence=snap.val()||{};render();},e=>info(humanError(e))));
}
async function createRoom() {
  if (!uid || !db) return;
  info('');
  try {
    const code=randomCode();
    await set(ref(db,`rooms/${code}/meta`),{hostUid:uid,createdAt:serverTimestamp()});
    await set(ref(db,`rooms/${code}/state`),{game:'lobby',phase:'lobby',scores:{host:0,guest:0},round:0});
    subscribeRoom(code);
  } catch(e) { info(humanError(e)); }
}
async function joinRoom() {
  if (!uid || !db) return;
  const code=($('#room-input')?.value||'').toUpperCase().replace(/\s/g,'');
  if (!/^[A-Z2-9]{8}$/.test(code) || [...code].some(c=>!LETTERS.includes(c))) {info('اكتب رمز الغرفة المكوّن من 8 حروف أو أرقام من غير مسافات.');return;}
  info('');
  try {
    const target=ref(db,`rooms/${code}/meta`);
    const current=(await get(target)).val();
    if (!current) {info('الرمز مش موجود. تأكد من كتابة الكود صح.');return;}
    if (current.hostUid===uid || current.guestUid===uid) {subscribeRoom(code);return;}
    if (current.guestUid) {info('الغرفة مكتملة؛ فيها بابا ورقية بالفعل.');return;}
    const joined=await runTransaction(target,old=>{
      // The first local transaction attempt can receive null for an existing room.
      // Use the room we just read; Firebase will retry with server data on conflict.
      const room = old ?? current;
      if (!room || room.guestUid || room.hostUid!==current.hostUid || room.hostUid===uid) return;
      return {...room,guestUid:uid};
    },{applyLocally:false});
    if (!joined.committed) {info('الغرفة اتملت أو حد دخل قبلك. جرّب غرفة جديدة.');return;}
    subscribeRoom(code);
  } catch(e) {info(e?.code?.includes('permission-denied')?'الغرفة مكتملة أو الرابط غير صالح. اطلب من بابا يعمل غرفة جديدة.':humanError(e));}
}
async function copyLink() {
  const link=`${location.origin}${location.pathname}#room=${roomCode}`;
  try { await navigator.clipboard.writeText(link);info('اتنسخ رابط الدعوة! ابعته لرقية بشكل خاص 💌'); }
  catch(e) { info(`انسخ الكود وابعت الرابط من شريط العنوان: ${roomCode}`); }
}
screen.addEventListener('click',e=>{if(e.target.closest('button:not(:disabled)'))sound('tap');},true);
screen.addEventListener('change',e=>{
  if(e.target?.id!=='memory-size'||role!=='host')return;
  memoryPreference=e.target.value;
  try {localStorage.setItem('roqaya-memory',memoryPreference);}catch(_){}
  sound('tap');
});
screen.addEventListener('click',async e=>{
  const button=e.target.closest('button');
  if (!button || button.disabled) return;
  const action=button.dataset.action;
  if (action==='create') return createRoom();
  if (action==='join') return joinRoom();
  if (action==='copy') return copyLink();
  if (action==='lobby') return goLobby();
  if (action==='restart') return restart();
  if (action==='next-draw') return nextDraw();
  if (action==='clear-draw' && state?.game==='draw' && state.draw.drawer===role) {
    return remove(ref(db,`rooms/${roomCode}/strokes`)).catch(err=>info(humanError(err)));
  }
  if (button.dataset.game) return startGame(button.dataset.game);
  if (button.dataset.memory!==undefined) return chooseCard(Number(button.dataset.memory));
  if (button.dataset.cell!==undefined) return chooseCell(Number(button.dataset.cell));
  if (button.dataset.guess!==undefined) return chooseGuess(Number(button.dataset.guess));
  if (button.dataset.quiz!==undefined) return chooseQuiz(Number(button.dataset.quiz));
  if (button.dataset.treasure!==undefined) return chooseTreasure(Number(button.dataset.treasure));
});
screen.addEventListener('keydown',e=>{
  if (e.key==='Enter'&&e.target?.id==='room-input') {e.preventDefault();joinRoom();}
});
async function initialize() {
  soundControl();
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('PASTE_') || firebaseConfig.databaseURL.includes('PASTE_')) {
    connection.textContent='⚙️ محتاجة إعداد';
    screen.innerHTML='<div class="panel center"><div class="big-emoji">🔧</div><h2>قبل أول لعبة</h2><p>بابا لازم يضيف إعدادات Firebase الحقيقية في ملف <b>firebase-config.js</b>، ويشغّل Anonymous Authentication ويضبط قواعد Realtime Database.</p><p class="hint">افتح ملف README-AR.md المرفق واتبع الخطوات من الموبايل.</p></div>';
    return;
  }
  try {
    const app=initializeApp(firebaseConfig);
    auth=getAuth(app);db=getDatabase(app);
    const result=await signInAnonymously(auth);
    uid=result.user.uid;
    unsubs.push(onValue(ref(db,'.info/connected'),snap=>{
      connected=snap.val()===true;
      connection.textContent=connected?'🟢 الإنترنت متصل':'🟠 الاتصال مقطوع';
    }));
    render();
  } catch(e) {
    info(humanError(e));
    screen.innerHTML='<div class="panel center"><div class="big-emoji">🔌</div><h2>الاتصال مش جاهز</h2><p>راجع إعدادات Firebase والإنترنت، وبعدها اعمل تحديث للصفحة.</p></div>';
  }
}
initialize();
