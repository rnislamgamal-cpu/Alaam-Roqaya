import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, set, get, onValue, runTransaction, push, remove, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (selector) => document.querySelector(selector);
const screen = $('#screen');
const message = $('#message');
const connection = $('#connection');
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const APP_VERSION = '3.0';
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
  { name:'نجمة', emoji:'⭐', choices:['⭐','☀️','🌙'] },
  { name:'شجرة', emoji:'🌳', choices:['🌳','🌴','🌵'] },
  { name:'أسد', emoji:'🦁', choices:['🦁','🐯','🐻'] },
  { name:'قمر', emoji:'🌙', choices:['🌙','⭐','☀️'] },
  { name:'فيل', emoji:'🐘', choices:['🐘','🦒','🦓'] },
  { name:'دراجة', emoji:'🚲', choices:['🚲','🚗','🛵'] },
  { name:'صاروخ', emoji:'🚀', choices:['🚀','✈️','🚂'] },
  { name:'مظلة', emoji:'☂️', choices:['☂️','🎈','🌂'] },
  { name:'مفتاح', emoji:'🔑', choices:['🔑','🔒','🗝️'] },
  { name:'ساعة', emoji:'⏰', choices:['⏰','⌚','🕰️'] },
  { name:'قارب', emoji:'⛵', choices:['⛵','🚗','🚀'] },
  { name:'طائرة', emoji:'✈️', choices:['✈️','🚁','🚀'] },
  { name:'سلحفاة', emoji:'🐢', choices:['🐢','🐸','🐠'] },
  { name:'جمل', emoji:'🐪', choices:['🐪','🦒','🐘'] },
  { name:'دب', emoji:'🐻', choices:['🐻','🐼','🦁'] },
  { name:'نحلة', emoji:'🐝', choices:['🐝','🦋','🐞'] },
  { name:'بطة', emoji:'🦆', choices:['🦆','🐥','🐧'] },
  { name:'حذاء', emoji:'👟', choices:['👟','🧦','🧢'] },
  { name:'كتاب', emoji:'📖', choices:['📖','📓','✏️'] },
  { name:'كرسي', emoji:'🪑', choices:['🪑','🛋️','🛏️'] },
  { name:'كعكة', emoji:'🎂', choices:['🎂','🍩','🍪'] },
  { name:'موز', emoji:'🍌', choices:['🍌','🍐','🌽'] },
  { name:'نظارة', emoji:'👓', choices:['👓','🕶️','🎩'] },
  { name:'بالون', emoji:'🎈', choices:['🎈','🎁','🎀'] }
];
const MEMORY_EMOJI = [
  '🐱','🐶','🐸','🦊','🐼','🐻','🐰','🦁','🐯','🐨','🐵','🐮','🐷','🐧','🐢',
  '🦋','🐝','🐞','🐬','🐳','🐙','🦀','🦄','🦖','🐘','🦒','🦓','🐿️','🦉','🐥',
  '🍎','🍌','🍉','🍇','🍓','🍒','🍍','🥝','🥕','🌽','🍋','🥑','🍄','🌻','🌈',
  '🚗','🚀','🚂','🚲','✈️','⚽','🎈','🎁','🎠','🎡','⭐','☀️','🌙','💎','🏀'
];
const MEMORY_SIZES = [8,12,16,20,24,30];
const QUIZ_GAMES = ['odd','count','pattern','animals','colors','math','read','english','compare','numberline'];
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
  treasure:['🗝️','رحلة الكنز','4 مفاتيح بالتناوب'],
  read:['📖','اقرئي واختاري','اقرئي كلمة عربية واختاري صورتها'],
  english:['🔤','عربي وإنجليزي','معاني كلمات بسيطة'],
  compare:['📐','مين الأكبر؟','مقارنة أحجام مرسومة'],
  numberline:['🔢','الرقم الناقص','كمّلي تسلسل الأرقام']
};
// All illustration assets below are original inline SVG drawings, not third-party photographs.
// Asset identifiers (rather than markup) travel through Firebase; both clients draw the same image.
const SCENE_IDS = ['desert','sea','forest','pond','garden','snow','nest','farm','jungle','meadow','river','mountain','home'];
const SCENE_LABELS = {desert:'صحراء',sea:'بحر',forest:'غابة',pond:'بركة',garden:'حديقة',snow:'منطقة جليدية',nest:'عش',farm:'مزرعة',jungle:'غابة استوائية',meadow:'مرج',river:'نهر',mountain:'جبال',home:'منزل'};
const PICTURE_IDS = ['heart','star','sun','moon','flower','tree','house','fish','car','boat','balloon','apple','butterfly','key','cloud','umbrella'];
const PICTURE_AR = {heart:'قلب',star:'نجمة',sun:'شمس',moon:'قمر',flower:'وردة',tree:'شجرة',house:'بيت',fish:'سمكة',car:'سيارة',boat:'قارب',balloon:'بالونة',apple:'تفاحة',butterfly:'فراشة',key:'مفتاح',cloud:'سحابة',umbrella:'مظلة'};
const READ_BANK = PICTURE_IDS.map(id=>({id,word:PICTURE_AR[id]}));
const ENGLISH_BANK = [
 ['CAT','قطة','كلب','حصان'],['DOG','كلب','قطة','سمكة'],['SUN','شمس','قمر','نجمة'],
 ['MOON','قمر','شمس','مطر'],['STAR','نجمة','شجرة','باب'],['TREE','شجرة','وردة','بيت'],
 ['FISH','سمكة','عصفور','قطة'],['HOUSE','بيت','سيارة','قارب'],['CAR','سيارة','طائرة','دراجة'],
 ['APPLE','تفاحة','موزة','برتقالة'],['BOOK','كتاب','قلم','مكتب'],['BIRD','عصفور','سمكة','كلب'],
 ['RED','أحمر','أزرق','أخضر'],['BLUE','أزرق','أصفر','أحمر'],['GREEN','أخضر','أبيض','أسود'],
 ['WATER','ماء','رمل','ثلج'],['FLOWER','وردة','شجرة','حجر'],['HAND','يد','رجل','عين']
];
// Do not place an animal emoji beside its name: that would give away the answer.
const ANIMAL_QUESTIONS = [
 ['أين يعيش الجمل عادة؟','desert',['desert','sea','snow']],
 ['أين تعيش السمكة؟','sea',['sea','desert','nest']],
 ['أين يعيش الضفدع غالبًا؟','pond',['pond','desert','snow']],
 ['أين تصنع النحلة العسل؟','garden',['garden','sea','snow']],
 ['أين يعيش الدب القطبي؟','snow',['snow','desert','farm']],
 ['أين يضع الطائر بيضه؟','nest',['nest','sea','desert']],
 ['أين تعيش البقرة عادةً؟','farm',['farm','sea','snow']],
 ['أين تعيش الفراشات بين الأزهار؟','garden',['garden','desert','snow']],
 ['أين يعيش الحوت؟','sea',['sea','forest','farm']],
 ['أين يعيش القرد في الطبيعة غالبًا؟','jungle',['jungle','snow','sea']],
 ['أين تقف الضفادع قرب الماء؟','pond',['pond','mountain','desert']],
 ['أين تنمو أشجار كثيرة متجاورة؟','forest',['forest','sea','snow']],
 ['أين يسبح البط غالبًا؟','pond',['pond','desert','mountain']],
 ['أين ترعى الأغنام عادةً؟','meadow',['meadow','sea','snow']]
];
const COLOR_QUESTIONS = [
 ['اختاري اللون الأحمر','🔴',['🔴','🔵','🟢']],
 ['اختاري اللون الأزرق','🔵',['🟡','🔵','🟣']],
 ['اختاري اللون الأخضر','🟢',['🟠','🟢','🔴']],
 ['اختاري اللون الأصفر','🟡',['🟣','🔵','🟡']],
 ['اختاري اللون البرتقالي','🟠',['🟠','🔴','🟢']],
 ['اختاري اللون البنفسجي','🟣',['🔵','🟣','🟡']]
];
const TREASURE_IDS = ['heart','star','sun','moon','flower','tree','house','fish','car','boat','balloon','apple','butterfly','key','cloud','umbrella'];
const VECTOR_COLORS = ['#f36d96','#6f80e9','#30b898','#f9b44d','#8f6ad9','#36a8da'];
function artSvg(id,scene=false) {
  const sky='<rect width="160" height="112" rx="17" fill="#daefff"/>';
  const ground='<path d="M0 79 Q60 66 160 82 V112 H0Z" fill="#a7d88b"/>';
  const C={heart:'#f46f98',star:'#ffc553',sun:'#f9b843',moon:'#f9d98b',flower:'#ee7caf',tree:'#53b982',house:'#9585ee',fish:'#4bbde3',car:'#7f81e8',boat:'#f8ac5f',balloon:'#f27baf',apple:'#e96569',butterfly:'#b28af5',key:'#edb75a',cloud:'#fff',umbrella:'#fa709d'};
  const base=(inner)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112" role="img"><rect width="160" height="112" rx="17" fill="#f1f6ff"/>${inner}</svg>`;
  if (scene) {
    const sketches={
      desert:`<rect width="160" height="112" rx="17" fill="#ffe6a9"/><circle cx="130" cy="24" r="15" fill="#ffbf56"/><path d="M0 68 Q46 37 93 67 Q132 42 160 66 V112 H0Z" fill="#e4b571"/><path d="M0 89 Q69 68 160 88 V112 H0Z" fill="#c8874f"/><path d="M42 89 V43 M42 65 Q26 70 26 51 M42 76 Q58 82 59 61" stroke="#36896b" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      sea:`<rect width="160" height="112" rx="17" fill="#b8e9ff"/><circle cx="125" cy="24" r="12" fill="#ffcf68"/><path d="M0 56 Q18 44 39 56 T80 56 T121 56 T160 56 V112 H0Z" fill="#47b6dd"/><path d="M0 73 Q17 65 34 73 T69 73 T104 73 T139 73 T174 73" stroke="#ecffff" stroke-width="4" fill="none"/><path d="M45 91 Q60 75 77 91 Q60 107 45 91 M77 91 L87 84 L87 99Z" fill="#ffdf8e"/>`,
      forest:`<rect width="160" height="112" rx="17" fill="#d5f5d3"/>${ground}<path d="M25 101 V43 M75 103 V32 M125 101 V41" stroke="#8c694c" stroke-width="11"/><circle cx="25" cy="43" r="25" fill="#4ca783"/><circle cx="75" cy="33" r="30" fill="#339977"/><circle cx="125" cy="40" r="27" fill="#56b579"/>`,
      pond:`${sky}${ground}<ellipse cx="80" cy="88" rx="73" ry="23" fill="#59b7da"/><ellipse cx="48" cy="82" rx="15" ry="6" fill="#80c877"/><path d="M25 82V49 M137 81V52" stroke="#62a66c" stroke-width="5"/><path d="M19 54Q25 34 31 54 M131 57Q137 36 143 57" fill="#92724e"/>`,
      garden:`${sky}${ground}<path d="M30 90V55 M79 90V47 M131 90V54" stroke="#4f9b69" stroke-width="4"/><circle cx="30" cy="52" r="12" fill="#f47da7"/><circle cx="79" cy="45" r="13" fill="#f8c45a"/><circle cx="131" cy="52" r="12" fill="#ae8aee"/><circle cx="30" cy="52" r="4" fill="#fff"/><circle cx="79" cy="45" r="4" fill="#fff"/><circle cx="131" cy="52" r="4" fill="#fff"/>`,
      snow:`<rect width="160" height="112" rx="17" fill="#cfeaff"/><path d="M0 87 L40 38 L74 79 L111 26 L160 85 V112 H0Z" fill="#9ebfcf"/><path d="M24 59L40 38L55 58 M95 48L111 26L129 48" fill="#fff"/><path d="M0 90 Q80 75 160 91 V112 H0Z" fill="#f8fdff"/><circle cx="31" cy="20" r="4" fill="white"/><circle cx="75" cy="13" r="4" fill="white"/>`,
      nest:`${sky}${ground}<path d="M8 92 Q90 80 159 50" stroke="#8b654e" stroke-width="14" fill="none"/><path d="M51 65 Q80 100 113 61 L101 88 Q79 105 59 85Z" fill="#ae754c"/><ellipse cx="73" cy="70" rx="9" ry="12" fill="#fff0cc"/><ellipse cx="94" cy="70" rx="9" ry="12" fill="#fff0cc"/>`,
      farm:`${sky}${ground}<path d="M39 54 L80 27 L121 54Z" fill="#d86c61"/><rect x="47" y="54" width="67" height="48" rx="2" fill="#fff2d9"/><rect x="70" y="70" width="24" height="32" fill="#a96c52"/><path d="M0 97H160 M6 83V106 M35 83V106 M126 83V106 M154 83V106" stroke="#a87955" stroke-width="4"/>`,
      jungle:`<rect width="160" height="112" rx="17" fill="#c4ecd9"/><path d="M0 84Q80 43 160 84V112H0Z" fill="#4dad75"/><path d="M24 112L50 24 M124 112L101 14" stroke="#8b6955" stroke-width="12"/><circle cx="51" cy="30" r="26" fill="#258c6d"/><circle cx="105" cy="26" r="28" fill="#379e6d"/><path d="M0 42Q55 20 80 43T160 40" stroke="#277c69" stroke-width="5" fill="none"/>`,
      meadow:`${sky}${ground}<path d="M0 93 Q43 52 92 84 Q135 56 160 88 V112 H0Z" fill="#83c979"/><circle cx="21" cy="82" r="4" fill="#fff"/><circle cx="72" cy="97" r="4" fill="#ffc6db"/><circle cx="139" cy="85" r="4" fill="#fff"/>`,
      river:`${sky}${ground}<path d="M112 59Q50 72 79 88T39 112H116Q134 88 102 74T134 59Z" fill="#4db9dd"/><path d="M111 75Q88 88 100 96" stroke="#fff" stroke-width="3" fill="none"/>`,
      mountain:`<rect width="160" height="112" rx="17" fill="#bfe5ff"/><path d="M0 100L50 26L89 100Z" fill="#829fb5"/><path d="M55 100L112 18L160 100Z" fill="#6f8da5"/><path d="M35 47L50 26L64 48 M98 39L112 18L125 40" fill="#fff"/><path d="M0 96 Q78 81 160 98V112H0Z" fill="#77b98f"/>`,
      home:`${sky}${ground}<path d="M25 58L80 21L135 58Z" fill="#ee8975"/><rect x="35" y="57" width="90" height="47" fill="#fff0cc"/><rect x="72" y="73" width="20" height="31" fill="#9d7ac8"/><rect x="43" y="67" width="17" height="14" fill="#92d5ef"/>`
    };
    return base(sketches[id]||sketches.garden);
  }
  const shapes={
    heart:'<path d="M80 94C23 57 34 26 58 27Q73 27 80 44Q88 26 103 27C128 26 137 57 80 94Z"/>',
    star:'<path d="M80 16L94 51L131 54L103 77L112 105L80 87L48 105L57 77L29 54L66 51Z"/>',
    sun:'<circle cx="80" cy="56" r="24"/><path d="M80 13V24M80 89V101M36 56H48M112 56H124M49 25L56 33M104 79L112 87M111 24L103 33M56 79L48 87" stroke="#f9b843" stroke-width="7" stroke-linecap="round"/>',
    moon:'<path d="M98 15A40 40 0 1 0 126 80A46 46 0 0 1 98 15Z"/>',
    flower:'<circle cx="80" cy="55" r="11" fill="#ffe3a2"/><circle cx="80" cy="33" r="12"/><circle cx="80" cy="77" r="12"/><circle cx="58" cy="55" r="12"/><circle cx="102" cy="55" r="12"/><path d="M80 85V103" stroke="#4ba977" stroke-width="5"/>',
    tree:'<path d="M80 62V100" stroke="#997052" stroke-width="12"/><circle cx="80" cy="39" r="25"/><circle cx="57" cy="58" r="20"/><circle cx="101" cy="58" r="20"/>',
    house:'<path d="M32 56L80 20L128 56Z"/><rect x="43" y="55" width="75" height="45" rx="3"/><rect x="73" y="68" width="21" height="32" fill="#fff"/>',
    fish:'<path d="M31 61Q65 17 113 58Q70 101 31 61Z"/><path d="M106 57L131 35V84Z"/><circle cx="54" cy="56" r="4" fill="#fff"/>',
    car:'<rect x="22" y="53" width="118" height="36" rx="10"/><path d="M48 53L65 33H110L126 53Z"/><circle cx="49" cy="91" r="12" fill="#3d456d"/><circle cx="114" cy="91" r="12" fill="#3d456d"/>',
    boat:'<path d="M19 79H140L121 98H43Z"/><path d="M80 18V78M78 23L28 73H78Z" stroke="#805a50" stroke-width="4"/>',
    balloon:'<ellipse cx="80" cy="42" rx="28" ry="34"/><path d="M80 76L74 83H86Z"/><path d="M80 84Q62 96 81 105" stroke="#936e9e" stroke-width="3" fill="none"/>',
    apple:'<path d="M80 39C47 16 24 56 43 88Q58 108 80 94Q108 108 122 88C143 55 109 17 80 39Z"/><path d="M80 35Q85 16 104 18Q100 35 80 35" fill="#64b687"/>',
    butterfly:'<ellipse cx="54" cy="49" rx="23" ry="22"/><ellipse cx="106" cy="49" rx="23" ry="22"/><ellipse cx="58" cy="79" rx="18" ry="18"/><ellipse cx="102" cy="79" rx="18" ry="18"/><path d="M80 34V98" stroke="#68567f" stroke-width="6"/>',
    key:'<circle cx="55" cy="50" r="19" fill="none" stroke="#edb75a" stroke-width="11"/><path d="M73 62L120 101M108 88L121 75M95 76L106 65" stroke="#edb75a" stroke-width="10" fill="none"/>',
    cloud:'<path d="M40 89Q19 87 23 65Q27 52 44 51Q50 23 80 27Q106 28 110 52Q139 48 142 71Q143 90 120 89Z" stroke="#b9d4ea" stroke-width="3"/>',
    umbrella:'<path d="M20 58Q80 -7 140 58Z"/><path d="M80 58V88Q80 105 64 94" fill="none" stroke="#7e7297" stroke-width="6" stroke-linecap="round"/>'
  };
  return base(`<g fill="${C[id]||'#8c82e3'}" stroke-linejoin="round">${shapes[id]||shapes.heart}</g>`);
}
function artPicture(id,scene=false) {
  if (!scene && id.startsWith('shape:')) {
    const parts=id.split(':'),color=VECTOR_COLORS[Number(parts[2])%VECTOR_COLORS.length];
    const el=parts[1]==='triangle'?`<path d="M80 17L136 98H24Z"/>`:parts[1]==='square'?`<rect x="31" y="16" width="98" height="83" rx="9"/>`:parts[1]==='diamond'?`<path d="M80 12L140 56L80 105L20 56Z"/>`:`<circle cx="80" cy="57" r="42"/>`;
    return `<img class="art-image" alt="شكل هندسي" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112"><rect width="160" height="112" rx="17" fill="#f1f6ff"/><g fill="${color}">${el}</g></svg>`)}">`;
  }
  return `<img class="art-image" alt="${scene?SCENE_LABELS[id]:PICTURE_AR[id]}" src="data:image/svg+xml,${encodeURIComponent(artSvg(id,scene))}">`;
}
function renderOption(option,q) {
  if(q?.visual==='sizes'){
    const size=Number(option.split(':')[1]);return `<span class="size-illustration"><span style="width:${size*2}px;height:${size*2}px"></span></span>`;
  }
  return q?.visual==='scenes'?artPicture(option,true):q?.visual==='pictures'?artPicture(option):q?.visual==='shapes'?artPicture(option):option;
}
function renderQuestionDisplay(q) {
  if (q.visual==='pattern' && Array.isArray(q.sequence)) return `<div class="picture-sequence">${q.sequence.map(x=>artPicture(x)).join('')}<span class="missing-mark">؟</span></div>`;
  if (q.visual==='count' && Array.isArray(q.sequence)) return `<div class="count-objects">${q.sequence.map(x=>`<span aria-hidden="true">${x}</span>`).join('')}</div>`;
  if (q.visual==='compare' && Array.isArray(q.sequence)) return `<div class="picture-sequence">${q.sequence.map(x=>artPicture(x)).join('')}</div>`;
  return q.display?`<div class="quiz-display" aria-label="صور السؤال">${q.display}</div>`:'';
}
function newQuestion(which,previousIndex=-1) {
  const pick=(length)=>{let n=Math.floor(Math.random()*length);if(length>1 && n===previousIndex)n=(n+1)%length;return n;};
  if(which==='odd') {
    const n=pick(15);
    if(n<6) {
      const cats=[['🐱','🐶','🐰','🚗'],['🍎','🍌','🍓','🐢'],['🚗','🚲','🚂','🌻'],['☀️','⭐','🌙','🍇'],['⚽','🏀','🎾','🐝'],['🦁','🐯','🐼','🎈']];
      const options=shuffle(cats[n]);return {index:n,prompt:'مين المختلف عن الثلاثة الباقيين؟',display:'',options,correct:options.indexOf(cats[n][3])};
    }
    if(n<11) {
      const shape=['circle','triangle','square','diamond'][n%4];const different=['circle','triangle','square','diamond'][(n+1)%4];
      const colors=[0,1,2,3];const targets=colors.slice(0,3).map(c=>`shape:${shape}:${c}`),odd=`shape:${different}:4`;
      const options=shuffle([...targets,odd]);return {index:n,prompt:'اختاري الشكل المختلف عن الباقيين',options,correct:options.indexOf(odd),visual:'shapes'};
    }
    const catSets=[['forest','jungle','meadow','sea'],['sea','river','pond','desert'],['desert','mountain','snow','farm'],['garden','meadow','forest','sea']];
    const items=catSets[n-11],options=shuffle(items);return {index:n,prompt:'اختاري المكان المختلف عن بقية الصور',options,correct:options.indexOf(items[3]),visual:'scenes'};
  }
  if(which==='count') {
    const n=3+Math.floor(Math.random()*8),emoji=['🍎','🐱','⭐','🎈','🐠','🧸'][Math.floor(Math.random()*6)];
    const alternatives=shuffle([String(n),String(n===10?n-2:n+1),String(n===3?n+2:n-1)]);
    return {index:n,prompt:'عدّي الصور… كام واحدة؟',visual:'count',sequence:Array(n).fill(emoji),options:alternatives,correct:alternatives.indexOf(String(n))};
  }
  if(which==='pattern') {
    const n=pick(16),ids=PICTURE_IDS;
    let seq,answer,choices;
    if(n%4===0){const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,b,a,b,a];answer=b;choices=[a,b,ids[(n+2)%ids.length]];}
    else if(n%4===1){const a=ids[n],b=ids[(n+1)%ids.length],c=ids[(n+2)%ids.length];seq=[a,b,c,a,b];answer=c;choices=[a,b,c];}
    else if(n%4===2){const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,a,b,a,a];answer=b;choices=[a,b,ids[(n+2)%ids.length]];}
    else {const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,b,b,a,b];answer=b;choices=[a,b,ids[(n+2)%ids.length]];}
    const options=shuffle(choices);return {index:n,prompt:'أي صورة تكمّل النمط؟',visual:'pattern',sequence:seq,options,correct:options.indexOf(answer),optionVisual:'pictures'};
  }
  if(which==='animals') {
    const n=pick(ANIMAL_QUESTIONS.length),[prompt,answer,choices]=ANIMAL_QUESTIONS[n];
    const options=shuffle(choices);return {index:n,prompt,options,correct:options.indexOf(answer),visual:'scenes'};
  }
  if(which==='colors') {
    const n=pick(COLOR_QUESTIONS.length),[prompt,answer,choices]=COLOR_QUESTIONS[n];
    const options=shuffle(choices);return {index:n,prompt,options,correct:options.indexOf(answer)};
  }
  if(which==='treasure') {
    const n=pick(TREASURE_IDS.length),answer=TREASURE_IDS[n];
    const otherOptions=shuffle(TREASURE_IDS.filter(id=>id!==answer)).slice(0,2),options=shuffle([answer,...otherOptions]);
    return {index:n,prompt:`اقرئي الكلمة واختاري صورتها: ${PICTURE_AR[answer]}`,options,correct:options.indexOf(answer),visual:'pictures'};
  }
  if(which==='read') {
    const n=pick(READ_BANK.length),answer=READ_BANK[n].id;
    const wrong=shuffle(PICTURE_IDS.filter(id=>id!==answer)).slice(0,2),options=shuffle([answer,...wrong]);
    return {index:n,prompt:`اقرئي الكلمة واختاري الصورة: ${READ_BANK[n].word}`,options,correct:options.indexOf(answer),visual:'pictures'};
  }
  if(which==='english') {
    const n=pick(ENGLISH_BANK.length),[en,ar,w1,w2]=ENGLISH_BANK[n],options=shuffle([ar,w1,w2]);
    return {index:n,prompt:`ما معنى كلمة ${en} بالعربي؟`,options,correct:options.indexOf(ar)};
  }
  if(which==='compare') {
    const n=pick(12),size=[21,32,43],target=n%2===0?'الكبير':'الصغير';
    const options=shuffle(size.map((s,i)=>`size:${s}:${i}`));
    return {index:n,prompt:`اختاري الشكل ${target} في الحجم`,visual:'sizes',options,correct:options.findIndex(v=>v.startsWith('size:'+(target==='الكبير'?43:21)+':'))};
  }
  if(which==='numberline') {
    const n=pick(13),start=n+1,missing=start+1,options=shuffle([String(missing),String(missing+1),String(start)]);
    return {index:n,prompt:'ما الرقم الناقص في السلسلة؟',display:`${start}  ←  ❓  ←  ${start+2}`,options,correct:options.indexOf(String(missing))};
  }
  const a=1+Math.floor(Math.random()*8),b=1+Math.floor(Math.random()*7),sum=a+b;
  const options=shuffle([String(sum),String(sum+1),String(sum-1)]);
  return {index:a*10+b,prompt:'كم ناتج الجمع؟',display:`${a} + ${b} = ❓`,options,correct:options.indexOf(String(sum))};
}
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
    <div class="hero"><div class="big-emoji">🎡 🎠 🎈</div><h2>أهلًا بيكم في عالم رقية!</h2><p>14 لعبة مسلّية لبابا ورقية من أي مكان 💜</p></div>
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
  const buttons=q.options.map((option,i)=>`<button class="quiz-choice ${q.visual?'visual-choice':''}" data-quiz="${i}" ${!canAnswer?'disabled':''}>${renderOption(option,q.optionVisual?{visual:q.optionVisual}:q)}</button>`).join('');
  const result=state.phase==='finished' ? `<div class="finish"><strong>${state.result==='correct'?'🎉 برافو! إجابة صح':'💜 محاولة حلوة! الإجابة الصحيحة:'}</strong><p class="answer-reveal">${renderOption(q.options[q.correct],q.optionVisual?{visual:q.optionVisual}:q)}</p></div>` : '';
  screen.innerHTML=`<div class="panel">${gameHeading(...GAME_LABELS[key].slice(0,2))}
    <h2 class="game-title center">${q.prompt}</h2>
    ${renderQuestionDisplay(q)}
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
  const buttons=q.options.map((option,i)=>`<button class="quiz-choice visual-choice" data-treasure="${i}" ${!canAnswer||treasure.wrong?.includes(i)?'disabled':''}>${renderOption(option,q)}</button>`).join('');
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
  document.querySelector('.brand p')?.append(` • V${APP_VERSION}`);
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
