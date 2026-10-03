import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, set, get, onValue, runTransaction, push, remove, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (selector) => document.querySelector(selector);
const screen = $('#screen');
const message = $('#message');
const connection = $('#connection');
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const APP_VERSION = '16.0';
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
const MEMORY_SIZES = [4,6,8,12,16,20,24,30];
// The age is a gameplay setting chosen by the adult, not a date of birth.
const AGE_GAME_LEVELS = [
  {max:3,games:['memory','count','colors','compare','coloring','sorting'],memory:[4,6]},
  {max:5,games:['draw','memory','odd','count','pattern','animals','colors','compare','coloring','jigsaw','sorting','phonics'],memory:[6,8,12]},
  {max:7,games:['draw','memory','ttt','odd','count','pattern','animals','colors','math','treasure','read','english','compare','numberline','snakes','coloring','jigsaw','sorting','phonics'],memory:[8,12,16,20]},
  {max:10,games:['draw','memory','ttt','odd','count','pattern','animals','colors','math','treasure','read','english','compare','numberline','snakes','coloring','jigsaw','sorting','phonics'],memory:[12,16,20,24,30]}
];
function normalizeAge(value) {
  const age=Number(value);
  return Number.isInteger(age) && age>=2 && age<=10 ? age : 6;
}
function ageLevel(age) { return AGE_GAME_LEVELS.find(group=>normalizeAge(age)<=group.max); }
function gamesForAge(age) { return ageLevel(age).games; }
function memorySizesForAge(age) { return ageLevel(age).memory; }
function ageOptions(chosen) {
  return Array.from({length:9},(_,i)=>i+2).map(age=>`<option value="${age}" ${age===chosen?'selected':''}>${age} ${age===2?'سنتين':'سنوات'}</option>`).join('');
}
function effectiveMemoryPreference(age) {
  return memorySizesForAge(age).includes(Number(memoryPreference)) ? memoryPreference : 'random';
}
const QUIZ_GAMES = ['odd','count','pattern','animals','colors','math','read','english','compare','numberline'];
const GAMES = ['draw','memory','ttt',...QUIZ_GAMES,'treasure','snakes','coloring','jigsaw','sorting','phonics'];
const GAME_LABELS = {
  draw:['🎨','ارسم وخمّن','واحد يرسم والتاني يخمّن'],
  memory:['🃏','كروت الذاكرة','8–30 كارت أو عدد متغيّر'],
  ttt:['❌⭕','إكس أو','3 نقاط للفائز'],
  odd:['🔍','مين المختلف؟','رسوم كرتونية ممتعة للمقارنة'],
  count:['🔢','عدّ الصور','احسب عدد الرموز'],
  pattern:['🧩','كمّل النمط','خمن الصورة الجاية'],
  animals:['🐾','بيوت الحيوانات','اختار مكان الحيوان'],
  colors:['🌈','ألوان وأشكال','اختار اللون المطلوب'],
  math:['➕','حساب الملاهي','جمع بسيط وممتع'],
  treasure:['🗝️','رحلة الكنز','4 مفاتيح بالتناوب'],
  read:['📖','اقرئي واختاري','اقرئي كلمة عربية واختاري صورتها'],
  english:['🔤','عربي وإنجليزي','معاني كلمات بسيطة'],
  compare:['🔢','ترتيب ومقارنة الأرقام','تصاعدي • تنازلي • مين الأكبر؟'],
  numberline:['🔢','الرقم الناقص','كمّلي تسلسل الأرقام'],
  snakes:['🐍','السلم والثعبان','نرد متحرك • خطوات حقيقية • سلالم وثعابين'],
  coloring:['🎨','كتاب التلوين','اختاري لون واضغطي لتلوين الرسمة'],
  jigsaw:['🧩','البازل المصغّر','ركّبي ٤ أو ٦ قطع في مكانها'],
  sorting:['🧺','فرز الألوان والأشكال','اسحبي كل عنصر للصندوق المناسب'],
  phonics:['🔤','الحروف والصور','وصّلي الحرف بالصورة التي تبدأ به']
};

const BOARD_FINAL_CELL = 100;
const SNAKES = {98:78,94:71,87:66,64:45,55:34,48:27,35:14};
const LADDERS = {4:25,13:46,33:49,42:63,50:69,62:81,74:92};
const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
const COLOR_PALETTE = ['#ef5350','#42a5f5','#fdd835','#66bb6a','#ec6fa9','#ff9800','#8e6bd8','#26c6da'];
const COLORING_PAGES = [
  {id:'kitten',name:'القطة المرِحة',parts:15},
  {id:'car',name:'السيارة السعيدة',parts:14},
  {id:'butterfly',name:'فراشة الحديقة',parts:14},
  {id:'flower',name:'زهرة جميلة',parts:12},
  {id:'house',name:'البيت اللطيف',parts:13},
  {id:'fish',name:'السمكة المرحة',parts:12}
];
const PUZZLE_PICTURES=[
  {id:'farm',name:'عائلة البقر'},
  {id:'pond',name:'السمكة المرحة'},
  {id:'garden',name:'حديقة الفراشة'},
  {id:'car-trip',name:'نزهة السيارة'},
  {id:'castle',name:'قصر الأحلام'},
  {id:'dino',name:'الديناصور اللطيف'}
];
const SORT_COLORS={red:'#ef5350',blue:'#42a5f5'};
const SORTING_POOL=[
  {icon:'🍎',label:'تفاحة'},{icon:'🚗',label:'سيارة'},{icon:'🐠',label:'سمكة'},{icon:'🦋',label:'فراشة'},
  {icon:'⚽',label:'كرة'},{icon:'🍓',label:'فراولة'},{icon:'🚢',label:'قارب'},{icon:'☕',label:'كوب'},
  {icon:'🎈',label:'بالونة'},{icon:'🌸',label:'زهرة'},{icon:'🧸',label:'دبدوب'},{icon:'🍋',label:'ليمونة'},
  {icon:'🍇',label:'عنب'},{icon:'🚂',label:'قطار'},{icon:'🪁',label:'طائرة ورقية'},{icon:'🦆',label:'بطة'}
];
const PHONICS_BANK = [
  ['أ','ألف','أسد','🦁'],['ب','باء','بطة','🦆'],['ت','تاء','تفاحة','🍎'],['ث','ثاء','ثعلب','🦊'],
  ['ج','جيم','جمل','🐪'],['ح','حاء','حصان','🐴'],['خ','خاء','خروف','🐑'],['د','دال','دب','🐻'],
  ['ذ','ذال','ذئب','🐺'],['ر','راء','ريشة','🪶'],['ز','زاي','زهرة','🌸'],['س','سين','سمكة','🐟'],
  ['ش','شين','شمس','☀️'],['ص','صاد','صقر','🦅'],['ض','ضاد','ضفدع','🐸'],['ط','طاء','طائرة','✈️'],
  ['ظ','ظاء','ظرف','✉️'],['ع','عين','عنب','🍇'],['غ','غين','غزال','🦌'],['ف','فاء','فراشة','🦋'],
  ['ق','قاف','قطة','🐱'],['ك','كاف','كتاب','📖'],['ل','لام','ليمون','🍋'],['م','ميم','موز','🍌'],
  ['ن','نون','نحلة','🐝'],['ه','هاء','هلال','🌙'],['و','واو','وردة','🌹'],['ي','ياء','يد','✋']
];

// All illustration assets below are original inline SVG drawings, not third-party photographs.
// Asset identifiers (rather than markup) travel through Firebase; both clients draw the same image.
const SCENE_IDS = ['desert','sea','forest','pond','garden','snow','nest','farm','jungle','meadow','river','mountain','home'];
const SCENE_LABELS = {desert:'صحراء',sea:'بحر',forest:'غابة',pond:'بركة',garden:'حديقة',snow:'منطقة جليدية',nest:'عش',farm:'مزرعة',jungle:'غابة استوائية',meadow:'مرج',river:'نهر',mountain:'جبال',home:'منزل'};
const PICTURE_IDS = ['heart','star','sun','moon','flower','tree','house','fish','car','boat','balloon','apple','butterfly','key','cloud','umbrella'];
const PICTURE_AR = {heart:'قلب',star:'نجمة',sun:'شمس',moon:'قمر',flower:'وردة',tree:'شجرة',house:'بيت',fish:'سمكة',car:'سيارة',boat:'قارب',balloon:'بالونة',apple:'تفاحة',butterfly:'فراشة',key:'مفتاح',cloud:'سحابة',umbrella:'مظلة'};
const READ_BANK = PICTURE_IDS.map(id=>({id,word:PICTURE_AR[id]}));
const ENGLISH_BANK = [
  ['arm','ذراع'],
  ['ant','نملة'],
  ['apple','تفاحة'],
  ['axe','فأس'],
  ['book','كتاب'],
  ['ball','كرة'],
  ['bell','جرس'],
  ['bag','حقيبة'],
  ['bee','نحلة'],
  ['bat','خفاش'],
  ['bed','سرير'],
  ['boy','ولد'],
  ['bus','أتوبيس'],
  ['bird','طائر'],
  ['butterfly','فراشة'],
  ['cat','قطة'],
  ['car','سيارة'],
  ['cake','تورتة'],
  ['carrot','جزرة'],
  ['cow','بقرة'],
  ['camel','جمل'],
  ['dog','كلب'],
  ['door','باب'],
  ['doll','عروسة لعبة'],
  ['donkey','حمار'],
  ['desk','مكتب'],
  ['egg','بيضة'],
  ['ear','أذن'],
  ['eye','عين'],
  ['elephant','فيل'],
  ['fan','مروحة'],
  ['fat','سمين'],
  ['fish','سمكة'],
  ['figs','تين'],
  ['flag','علم'],
  ['farmer','فلاح'],
  ['girl','بنت'],
  ['goat','معزة'],
  ['hand','يد'],
  ['hat','قبعة'],
  ['hen','دجاجة'],
  ['horse','حصان'],
  ['house','منزل'],
  ['ice','ثلج'],
  ['ice cream','آيس كريم'],
  ['ink','حبر'],
  ['insect','حشرة'],
  ['jam','مربى'],
  ['jar','برطمان'],
  ['jet','طائرة نفاثة'],
  ['jacket','جاكت'],
  ['jug','إبريق'],
  ['jump','يقفز'],
  ['key','مفتاح'],
  ['king','ملك'],
  ['kite','طائرة ورق'],
  ['lion','أسد'],
  ['lemon','ليمون'],
  ['lip','شفاه'],
  ['leaf','ورقة شجر'],
  ['lizard','سحلية'],
  ['man','رجل'],
  ['mat','سجادة'],
  ['moon','قمر'],
  ['milk','لبن'],
  ['mop','ممسحة'],
  ['monkey','قرد'],
  ['mouse','فأر صغير'],
  ['net','شبكة'],
  ['nest','عش'],
  ['nine','تسعة'],
  ['nose','أنف'],
  ['ox','ثور'],
  ['orange','برتقالة'],
  ['pen','قلم حبر'],
  ['pencil','قلم رصاص'],
  ['pot','حلة'],
  ['pizza','بيتزا'],
  ['queen','ملكة'],
  ['rat','فأر كبير'],
  ['rabbit','أرنب'],
  ['run','يجري'],
  ['room','حجرة'],
  ['sun','شمس'],
  ['star','نجمة'],
  ['snake','ثعبان'],
  ['school','مدرسة'],
  ['tree','شجرة'],
  ['ten','عشرة'],
  ['table','منضدة'],
  ['umbrella','شمسية'],
  ['van','شاحنة صغيرة'],
  ['vase','زهرية'],
  ['window','شباك'],
  ['wolf','ذئب'],
  ['xylophone','إكسيلوفون'],
  ['yo-yo','لعبة اليويو'],
  ['yellow','أصفر'],
  ['zoo','حديقة الحيوان'],
  ['zebra','حمار وحشي'],
  ['red','أحمر'],
  ['blue','أزرق'],
  ['green','أخضر'],
  ['water','ماء'],
  ['flower','وردة'],
  ['mountain','جبل'],
  ['river','نهر'],
  ['bicycle','دراجة'],
  ['winter','شتاء'],
  ['triangle','مثلث']
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
 ['أين ترعى الأغنام عادةً؟','meadow',['meadow','sea','snow']],
 // Additional habitat reasoning for the 8–10 age level.
 ['أي بيئة تناسب نبات الصبّار؟','desert',['desert','river','snow']],
 ['أين تعيش أسماك المياه العذبة؟','river',['river','desert','nest']],
 ['أي مكان مناسب لحيوان يحتاج إلى ثلج كثير؟','snow',['snow','desert','garden']],
 ['أين تبني بعض السناجب بيوتها بين الأشجار؟','forest',['forest','sea','desert']],
 ['أين تزرع بعض النباتات والخضراوات؟','farm',['farm','sea','snow']]
];
const COLOR_QUESTIONS = [
 ['اختاري اللون الأحمر','🔴',['🔴','🔵','🟢']],
 ['اختاري اللون الأزرق','🔵',['🟡','🔵','🟣']],
 ['اختاري اللون الأخضر','🟢',['🟠','🟢','🔴']],
 ['اختاري اللون الأصفر','🟡',['🟣','🔵','🟡']],
 ['اختاري اللون البرتقالي','🟠',['🟠','🔴','🟢']],
 ['اختاري اللون البنفسجي','🟣',['🔵','🟣','🟡']]
];
// Public-domain / CC0 photographs on Wikimedia Commons. Small previews load over HTTPS.
// A local SVG illustration is shown automatically if Wikimedia is unreachable.
// See «مصادر-الصور-V8.txt» for the exact source pages and licenses.
const PHOTO_BANK = {
  apple: {name:'تفاحة',file:'Beautiful_red_apple.jpg',fallback:'apple'},
  banana:{name:'موز',file:'Banana_pic.jpg',fallback:'apple'},
  orange:{name:'برتقالة',file:'Orange-fruit.jpg',fallback:'apple'},
  strawberry:{name:'فراولة',file:'Strawberry_fruit_in_studio.jpg',fallback:'flower'},
  cat:{name:'قطة',file:'Domestic_Cat_White.JPG',fallback:'house'},
  dog:{name:'كلب',file:'Photo_of_a_dog.jpg',fallback:'house'},
  rabbit:{name:'أرنب',file:'Rabbit_face.jpg',fallback:'house'},
  horse:{name:'حصان',file:'Horse_007.jpg',fallback:'house'}
};
const PHOTO_FRUITS=['apple','banana','orange','strawberry'];
const PHOTO_ANIMALS=['cat','dog','rabbit','horse'];
function photoPicture(id) {
  const photo=PHOTO_BANK[id];
  if(!photo) return '';
  const url=`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(photo.file)}?width=320`;
  const fallback=`data:image/svg+xml,${encodeURIComponent(artSvg(photo.fallback))}`;
  return `<img class="art-image real-photo" src="${url}" alt="${photo.name}" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">`;
}
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
  if(q?.visual==='sizes' || q?.visual==='size-order') {
    const [,sizeRaw,objectId]=option.split(':');
    const size=Number(sizeRaw);
    if(![44,78,116].includes(size) || !['apple','fish','house','balloon','tree','car','flower','butterfly'].includes(objectId)) return '';
    return `<span class="size-illustration" style="--object-size:${size}px">${artPicture(objectId)}</span>`;
  }
  if(q?.visual==='photos') return photoPicture(option);
  return q?.visual==='scenes'?artPicture(option,true):q?.visual==='pictures'?artPicture(option):q?.visual==='shapes'?artPicture(option):option;
}
// Show the selected answer and the correct answer only after a quiz round ends.
// Use the existing question option renderer so images, emojis and numbers stay readable.
function answerFeedback(label,option,q,correct=false) {
  return `<div class="answer-feedback ${correct?'is-correct':'is-wrong'}"><strong>${correct?'✅':'❌'} ${label}</strong><div class="feedback-answer">${renderOption(option,q.optionVisual?{visual:q.optionVisual}:q)}</div></div>`;
}
function renderQuestionDisplay(q) {
  if (q.visual==='pattern' && Array.isArray(q.sequence)) return `<div class="picture-sequence">${q.sequence.map(x=>artPicture(x)).join('')}<span class="missing-mark">؟</span></div>`;
  if (q.visual==='count' && Array.isArray(q.sequence)) return `<div class="count-objects ${q.sequence.length>10?'compact-count':''}">${q.sequence.map(x=>`<span aria-hidden="true">${x}</span>`).join('')}</div>`;
  if (q.visual==='compare' && Array.isArray(q.sequence)) return `<div class="picture-sequence">${q.sequence.map(x=>artPicture(x)).join('')}</div>`;
  return q.display?`<div class="quiz-display" aria-label="صور السؤال">${q.display}</div>`:'';
}
function newQuestion(which,previousIndex=-1,age=6,numberSettings={}) {
  age=normalizeAge(age);
  const training=normalizeNumberTraining(numberSettings);
  const rangeMin=training.min,rangeMax=training.max;
  const pick=(length)=>{let n=Math.floor(Math.random()*length);if(length>1 && n===previousIndex)n=(n+1)%length;return n;};
  const pickNumber=(min=rangeMin,max=rangeMax,avoid=null)=>{let n=min+Math.floor(Math.random()*(max-min+1));if(max>min&&n===avoid)n=n===max?min:n+1;return n;};
  if(which==='odd') {
    // Original cartoon-style illustrations: three matching pictures and one different picture.
    // The pictures change each round to keep the exercise varied.
    const n=pick(PICTURE_IDS.length*3);
    const base=PICTURE_IDS[n%PICTURE_IDS.length];
    let odd=PICTURE_IDS[(n*5+7)%PICTURE_IDS.length];
    if(odd===base) odd=PICTURE_IDS[(PICTURE_IDS.indexOf(base)+1)%PICTURE_IDS.length];
    const options=shuffle([base,base,base,odd]);
    return {index:n,prompt:'اختاري الصورة المختلفة عن الثلاث صور المتشابهة',visual:'pictures',options,correct:options.indexOf(odd)};
  }
  if(which==='count') {
    const n=pickNumber(rangeMin,rangeMax,previousIndex);
    const emoji=['🍎','🐱','⭐','🎈','🐠','🧸'][Math.floor(Math.random()*6)];
    const distractors=[];
    for(let distance=1;distractors.length<2;distance++){
      for(const candidate of [n-distance,n+distance]){
        if(candidate>=1 && candidate<=20 && candidate!==n && !distractors.includes(candidate)) distractors.push(candidate);
        if(distractors.length===2) break;
      }
      if(distance>20) break;
    }
    const alternatives=shuffle([String(n),...distractors.slice(0,2).map(String)]);
    return {index:n,prompt:`عدّي الصور… كام واحدة؟ (تدريب من ${rangeMin} إلى ${rangeMax})`,visual:'count',sequence:Array(n).fill(emoji),options:alternatives,correct:alternatives.indexOf(String(n))};
  }
  if(which==='pattern') {
    const n=pick(16),ids=PICTURE_IDS;
    let seq,answer,choices;
    if(n%4===0){const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,b,a,b,a];answer=b;choices=[a,b,ids[(n+2)%ids.length]];}
    else if(n%4===1){const a=ids[n],b=ids[(n+1)%ids.length],c=ids[(n+2)%ids.length];seq=[a,b,c,a,b];answer=c;choices=[a,b,c];}
    else if(n%4===2){const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,a,b,a,a];answer=b;choices=[a,b,ids[(n+2)%ids.length]];}
    else {const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,b,b,a,b];answer=b;choices=[a,b,ids[(n+2)%ids.length]];}
    if(age<=5){const a=ids[n],b=ids[(n+1)%ids.length];seq=[a,b,a,b];answer=a;choices=[a,b,ids[(n+2)%ids.length]];}
    if(age>=8 && n%3===0){const a=ids[n],b=ids[(n+1)%ids.length],c=ids[(n+2)%ids.length];seq=[a,a,b,a,a,b,a,a];answer=b;choices=[a,b,c];}
    const options=shuffle(choices);return {index:n,prompt:'أي صورة تكمّل النمط؟',visual:'pattern',sequence:seq,options,correct:options.indexOf(answer),optionVisual:'pictures'};
  }
  if(which==='animals') {
    const bank=age>=8?ANIMAL_QUESTIONS:ANIMAL_QUESTIONS.slice(0,age<=5?8:14);
    const n=pick(bank.length),[prompt,answer,choices]=bank[n];
    const extras=age>=8?shuffle(SCENE_IDS.filter(id=>!choices.includes(id))).slice(0,1):[];
    const options=shuffle([...choices,...extras]);return {index:n,prompt,options,correct:options.indexOf(answer),visual:'scenes'};
  }
  if(which==='colors') {
    if(age>=8){
      const colors=[[1,'الأزرق'],[2,'الأخضر'],[4,'البنفسجي']];
      const shapes=[['circle','الدائرة'],['triangle','المثلث'],['square','المربع']];
      const n=pick(9),[shape,shapeName]=shapes[n%3],[color,colorName]=colors[Math.floor(n/3)];
      const answer=`shape:${shape}:${color}`;
      const otherShape=shapes[(n%3+1)%3][0],otherColor=colors[(Math.floor(n/3)+1)%3][0];
      const options=shuffle([answer,`shape:${shape}:${otherColor}`,`shape:${otherShape}:${color}`,`shape:${otherShape}:${otherColor}`]);
      return {index:n,prompt:`اختاري ${shapeName} باللون ${colorName}`,options,correct:options.indexOf(answer),visual:'shapes'};
    }
    const n=pick(COLOR_QUESTIONS.length),[prompt,answer,choices]=COLOR_QUESTIONS[n];
    const options=shuffle(choices);return {index:n,prompt,options,correct:options.indexOf(answer)};
  }
  if(which==='treasure') {
    const n=pick(TREASURE_IDS.length),answer=TREASURE_IDS[n];
    const otherOptions=shuffle(TREASURE_IDS.filter(id=>id!==answer)).slice(0,age>=8?3:2),options=shuffle([answer,...otherOptions]);
    return {index:n,prompt:`اقرئي الكلمة واختاري صورتها: ${PICTURE_AR[answer]}`,options,correct:options.indexOf(answer),visual:'pictures'};
  }
  if(which==='read') {
    const n=pick(READ_BANK.length),answer=READ_BANK[n].id;
    const wrong=shuffle(PICTURE_IDS.filter(id=>id!==answer)).slice(0,age>=8?3:2),options=shuffle([answer,...wrong]);
    return {index:n,prompt:`اقرئي الكلمة واختاري الصورة: ${READ_BANK[n].word}`,options,correct:options.indexOf(answer),visual:'pictures'};
  }
  if(which==='english') {
    const limit=age<=5?35:age<=7?75:ENGLISH_BANK.length;
    const bank=ENGLISH_BANK.slice(0,limit);
    const n=pick(bank.length),[en,ar]=bank[n];
    const wrongCount=age>=8?3:2;
    const wrong=shuffle(ENGLISH_BANK.map(item=>item[1]).filter(word=>word!==ar)).slice(0,wrongCount);
    const options=shuffle([ar,...wrong]);
    return {index:n,prompt:`ما معنى كلمة ${en} بالعربي؟`,options,correct:options.indexOf(ar)};
  }
  if(which==='compare') {
    // V12: this game is numbers only: ascending order, descending order, and choosing the larger number.
    // Use the same adult-selected range as the other number games.
    let values=Array.from({length:rangeMax-rangeMin+1},(_,i)=>rangeMin+i);
    // Keep the game usable if an older saved range contains only one value.
    if(values.length<2){
      const neighbor=rangeMin<20?rangeMin+1:rangeMin-1;
      values=[rangeMin,neighbor].sort((a,b)=>a-b);
    }
    const modeCount=values.length>=3?3:1;
    const mode=modeCount===1?2:Math.floor(Math.random()*3);
    if(mode===2){
      const pair=shuffle(values).slice(0,2);
      const options=shuffle(pair.map(String));
      const answer=String(Math.max(...pair));
      return {index:pair[0]*100+pair[1]+20000,prompt:'أي رقم أكبر؟',visual:'number-compare',options,correct:options.indexOf(answer)};
    }
    const picked=shuffle(values).slice(0,3);
    const options=shuffle(picked.map(String));
    const descending=mode===1;
    const expectedOrder=options.map((_,i)=>i).sort((a,b)=>descending?Number(options[b])-Number(options[a]):Number(options[a])-Number(options[b]));
    return {index:picked.reduce((acc,n)=>acc*100+n,mode+1),prompt:descending?'رتّبي الأرقام ترتيبًا تنازليًا: من الأكبر إلى الأصغر':'رتّبي الأرقام ترتيبًا تصاعديًا: من الأصغر إلى الأكبر',visual:'number-order',options,correct:-1,expectedOrder,orderDirection:descending?'desc':'asc'};
  }
  if(which==='numberline') {
    const span=rangeMax-rangeMin;
    let step=1;
    if(age>=8 && span>=6) step=span>=9?(Math.random()<.5?2:3):2;
    if(span<step*2) step=1;
    const latestStart=Math.max(rangeMin,rangeMax-step*2);
    const start=pickNumber(rangeMin,latestStart);
    const missing=start+step;
    const choices=new Set([missing]);
    for(let distance=step;choices.size<3;distance+=step){
      if(missing+distance<=rangeMax) choices.add(missing+distance);
      if(missing-distance>=rangeMin) choices.add(missing-distance);
      if(distance>20) break;
    }
    for(let candidate=1;choices.size<3&&candidate<=20;candidate++) if(candidate!==missing) choices.add(candidate);
    const options=shuffle([...choices].slice(0,3).map(String));
    return {index:start*10+step,prompt:`ما الرقم الناقص؟ (من ${rangeMin} إلى ${rangeMax})`,display:`${start}  ←  ❓  ←  ${start+step*2}`,options,correct:options.indexOf(String(missing))};
  }
  const doubles=training.mode==='doubles';
  const allowSubtract=training.mode==='mixed' && age>=8;
  const previousA=Number.isInteger(previousIndex)?Math.floor((previousIndex%10000)/100):null;
  // Doubles move through the chosen range in order: ١+١، ٢+٢، ٣+٣… then start again.
  const a=doubles?(Number.isInteger(previousA)&&previousA>=rangeMin&&previousA<rangeMax?previousA+1:rangeMin):pickNumber(rangeMin,rangeMax,previousA);
  const b=doubles?a:pickNumber(rangeMin,rangeMax);
  const subtract=!doubles && allowSubtract && Math.random()<.5;
  const first=subtract?Math.max(a,b):a,second=subtract?Math.min(a,b):b;
  const result=subtract?first-second:first+second;
  const distractors=[];
  for(let distance=1;distractors.length<2;distance++) for(const candidate of [result-distance,result+distance]) if(candidate>=0&&candidate!==result&&!distractors.includes(candidate)){distractors.push(candidate);if(distractors.length===2)break;}
  const options=shuffle([String(result),...distractors.slice(0,2).map(String)]);
  return {index:a*100+b+(subtract?10000:0),prompt:doubles?'كم ناتج جمع العددين المتماثلين؟':subtract?'كم ناتج الطرح؟':'كم ناتج الجمع؟',display:`${first} ${subtract?'−':'+'} ${second} = ❓`,options,correct:options.indexOf(String(result))};
}
let memoryPreference = 'random';
let agePreference = 6;
let childNamePreference = 'رقية';
let numberMinPreference = 1;
let numberMaxPreference = 10;
let mathModePreference = 'addition';
function parseTrainingNumber(value){
  const normalized=String(value??'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
  if(!/^\d{1,2}$/.test(normalized)) return NaN;
  return Number(normalized);
}
function normalizeNumberTraining(settings={}){
  let min=parseTrainingNumber(settings.min??numberMinPreference),max=parseTrainingNumber(settings.max??numberMaxPreference);
  if(!Number.isInteger(min)) min=1;if(!Number.isInteger(max)) max=10;
  min=Math.max(1,Math.min(20,min));max=Math.max(1,Math.min(20,max));
  if(min>max)[min,max]=[max,min];
  const mode=['addition','doubles','mixed'].includes(settings.mode)?settings.mode:'addition';
  return {min,max,mode};
}
function currentNumberTraining(){return normalizeNumberTraining({min:numberMinPreference,max:numberMaxPreference,mode:mathModePreference});}
function saveNumberTraining(){try{localStorage.setItem('roqaya-number-min',String(numberMinPreference));localStorage.setItem('roqaya-number-max',String(numberMaxPreference));localStorage.setItem('roqaya-math-mode',mathModePreference);}catch(_){}}
// The adult chooses a first name or nickname; no names are sent to analytics.
function normalizeChildName(value) {
  const candidate=String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');
  if (!candidate || candidate.length>24 || !/^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*$/u.test(candidate)) return '';
  return candidate;
}
function childName() {
  return roomCode ? (normalizeChildName(state?.childName) || 'رقية') : childNamePreference;
}
// The underlying scores, room codes, Firebase data and input values remain ASCII.
// Only visible text is converted to Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩).
const EASTERN_DIGITS='٠١٢٣٤٥٦٧٨٩';
function arabicDigits(value){return String(value).replace(/[0-9]/g,d=>EASTERN_DIGITS[d.charCodeAt(0)-48]);}
const originalUiText = new WeakMap();
function personalizeUi() {
  const root=document.querySelector('.shell');
  if (!root) return;
  const iterator=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for (let node=iterator.nextNode();node;node=iterator.nextNode()) {
    if(node.parentElement?.closest('.room-code,.code-input,[data-keep-ascii]')) continue;
    const original=originalUiText.get(node)??node.nodeValue;
    if (!original.includes('رقية') && !/[0-9]/.test(original)) continue;
    originalUiText.set(node,original);
    const desired=arabicDigits(original.replace(/رقية/g,childName()));
    if(node.nodeValue!==desired) node.nodeValue=desired;
  }
  document.title=`عالم ${childName()} 🎡`;
}
new MutationObserver(personalizeUi).observe(document.querySelector('.shell'),{childList:true,subtree:true});
let soundEnabled = true;
let audioContext = null;
let lastAudioFeedback = null;
try { soundEnabled = localStorage.getItem('roqaya-sound') !== 'off'; memoryPreference = localStorage.getItem('roqaya-memory') || 'random'; agePreference=normalizeAge(localStorage.getItem('roqaya-child-age')); childNamePreference=normalizeChildName(localStorage.getItem('roqaya-child-name'))||'رقية'; const savedTraining=normalizeNumberTraining({min:localStorage.getItem('roqaya-number-min')??1,max:localStorage.getItem('roqaya-number-max')??10,mode:localStorage.getItem('roqaya-math-mode')||'addition'}); numberMinPreference=savedTraining.min;numberMaxPreference=savedTraining.max;mathModePreference=savedTraining.mode; } catch (_) {}
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
// Native Arabic speech runs on-device when supported; never sends a child name to analytics.
const VOICE_GAME_NAMES={draw:'الرَّسْمَ وَالتَّخْمِينَ',memory:'كُرُوتَ الذَّاكِرَةِ',ttt:'إِكْس أَوْ',odd:'اخْتِيَارَ الصُّورَةِ الْمُخْتَلِفَةِ',count:'عَدَّ الصُّوَرِ',pattern:'إِكْمَالَ النَّمَطِ',animals:'بُيُوتَ الْحَيَوَانَاتِ',colors:'الأَلْوَانَ وَالأَشْكَالَ',math:'الْحِسَابَ',treasure:'رِحْلَةَ الْكَنْزِ',read:'الْقِرَاءَةَ',english:'الْعَرَبِيَّةَ وَالْإِنْجِلِيزِيَّةَ',compare:'تَرْتِيبَ وَمُقَارَنَةَ الأَرْقَامِ',numberline:'الرَّقْمَ النَّاقِصَ',snakes:'السُّلَّمَ وَالثُّعْبَانَ',coloring:'التَّلْوِينَ',jigsaw:'تَرْكِيبَ الصُّوَرِ',sorting:'فَرْزَ الأَلْوَانِ وَالأَشْكَالِ',phonics:'مُطَابَقَةَ الْحُرُوفِ وَالصُّوَرِ'};
let lastWelcomeKey='';
function chooseArabicVoice(){
  const voices=window.speechSynthesis?.getVoices()||[];
  const ar=voices.filter(v=>/^ar(?:-|$)/i.test(v.lang));
  return ar.find(v=>/^ar-(SA|001)$/i.test(v.lang)&&v.localService)
      ||ar.find(v=>/^ar-(SA|001)$/i.test(v.lang))
      ||ar.find(v=>/^ar-EG$/i.test(v.lang)&&v.localService)
      ||ar.find(v=>v.localService)||ar[0]||null;
}
function welcomeToGame(which,name=childName(),key=''){
  if(!soundEnabled || !VOICE_GAME_NAMES[which] || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window))return false;
  if(key && lastWelcomeKey===key)return false;
  const voice=chooseArabicVoice();
  const safeName=normalizeChildName(name)||'رقية';
  const spokenName=safeName==='رقية'?'رُقَيَّة':safeName;
  const say=new SpeechSynthesisUtterance(`مَرْحَبًا! هَذَا عَالَمُ ${spokenName}. هَيَّا نَلْعَبُ ${VOICE_GAME_NAMES[which]}.`);
  // Android browsers can expose an empty voice list even when Arabic system TTS is installed.
  // ar-SA lets the browser hand the utterance to the installed Arabic engine without forcing a listed voice.
  say.lang=voice?.lang||'ar-SA';if(voice)say.voice=voice;say.rate=0.86;say.pitch=1;say.volume=1;
  try{window.speechSynthesis.cancel();window.speechSynthesis.resume?.();window.speechSynthesis.speak(say);lastWelcomeKey=key;info('');return true;}
  catch(_){return false;}
}
function maybeWelcomeOnSync(before,after){
  if(!before || !after || after.game==='lobby' || after.phase!=='playing')return;
  // A new question in the same game must not repeat the introduction.
  if(before.game!==after.game)
    welcomeToGame(after.game,after.childName,`${roomCode}:${after.round}`);
}
function soundControl() {
  let control=document.querySelector('#sound-toggle');
  if (!control) {
    control=document.createElement('button');
    control.type='button';control.id='sound-toggle';control.className='sound-toggle';
    control.addEventListener('click',()=>{
      soundEnabled=!soundEnabled;
      try { localStorage.setItem('roqaya-sound',soundEnabled?'on':'off'); } catch (_) {}
      if(!soundEnabled){try{window.speechSynthesis?.cancel();}catch(_){} stopAlphabetMusic();}
      soundControl();
      document.querySelectorAll('.voice-replay').forEach(btn=>{btn.disabled=!soundEnabled;});
      if(soundEnabled)sound('good');
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
let coloringSelectedColor=COLOR_PALETTE[0], puzzleSelectedPiece=null, sortingDragSelected=false;
let alphabetMusicTimer=null, alphabetMusicEnabled=false;
let snakeRollVisualKey='', snakeMoveVisualKey='';
let snakeRollVisualTimer=null;
function stopAlphabetMusic(){if(alphabetMusicTimer){clearInterval(alphabetMusicTimer);alphabetMusicTimer=null;}alphabetMusicEnabled=false;}
function ambientChime(){
  if(!soundEnabled)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    audioContext ||= new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const t=audioContext.currentTime;
    [392,523,659].forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+i*.22);g.gain.exponentialRampToValueAtTime(.012,t+i*.22+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.22+.45);o.connect(g).connect(audioContext.destination);o.start(t+i*.22);o.stop(t+i*.22+.5);});
  }catch(_){}
}
function toggleAlphabetMusic(){
  if(alphabetMusicTimer){stopAlphabetMusic();return false;}
  if(!soundEnabled)return false;
  ambientChime();alphabetMusicTimer=setInterval(ambientChime,5200);alphabetMusicEnabled=true;return true;
}
function speakArabicPhrase(text){
  if(!soundEnabled||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return false;
  try{const voice=chooseArabicVoice(),u=new SpeechSynthesisUtterance(text);u.lang=voice?.lang||'ar-SA';if(voice)u.voice=voice;u.rate=.78;u.pitch=1;u.volume=1;window.speechSynthesis.cancel();window.speechSynthesis.resume?.();window.speechSynthesis.speak(u);return true;}catch(_){return false;}
}


function snakeTone(frequency=440,duration=.09,volume=.045,type='sine',delay=0){
  if(!soundEnabled)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    audioContext ||= new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const t=audioContext.currentTime+delay,o=audioContext.createOscillator(),g=audioContext.createGain();
    o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(audioContext.destination);o.start(t);o.stop(t+duration+.02);
  }catch(_){}
}
function snakeDiceTick(index=0){snakeTone(150+(index%4)*34,.055,.032,'square');snakeTone(300+(index%3)*42,.04,.016,'triangle',.018);}
function snakeStepSound(index=0){snakeTone(index%2?520:430,.08,.05,'sine');snakeTone(index%2?760:650,.045,.02,'triangle',.03);}
function snakeLadderCheer(){[523,659,784,1047].forEach((f,i)=>snakeTone(f,.17,.065,'sine',i*.13));}
function snakeSadSound(){[392,330,262,196].forEach((f,i)=>snakeTone(f,.22,.055,'triangle',i*.18));}
function waitMs(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
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
function nameOf(player) { return player === 'host' ? 'بابا' : childName(); }
function canPlay() { return Boolean(meta?.guestUid); }
function isTurn(player) { return player === role; }
function scorePanel() {
  const a = state?.scores?.host || 0, b = state?.scores?.guest || 0;
  const statusA = presence[meta?.hostUid] ? '🟢 متصل' : '⚪ غير متصل';
  const statusB = presence[meta?.guestUid] ? '🟢 متصلة' : '⚪ غير متصلة';
  return `<div class="scoreboard">
    <div class="score"><span>👨 بابا • ${statusA}</span><strong>${a} ⭐</strong></div>
    <div class="score rose"><span>👧 ${childName()} • ${statusB}</span><strong>${b} ⭐</strong></div>
  </div>`;
}
function renderHome() {
  const invitation = /^#room=([A-Z2-9]{8})$/.exec(location.hash)?.[1] || '';
  screen.innerHTML = `<div class="panel center">
    <div class="hero"><div class="big-emoji">🎡 🎠 🎈</div><h2>أهلًا بيكم في عالم ${childNamePreference || 'رقية'}!</h2><p>ألعاب بتكبر مع عمر طفلك من سنتين لحد 10 سنوات 💜</p></div>
    <div class="age-settings"><label for="child-name-home">✏️ ولي الأمر: اكتب اسم الطفل</label>
      <input id="child-name-home" class="input" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${childNamePreference}" placeholder="مثلاً: سلمى" aria-label="اسم الطفل" />
      <p class="hint">الأفضل تكتب الاسم الأول أو اسم مستعار، من غير الاسم الكامل.</p>
    </div>
    <div class="age-settings"><label for="child-age-home">🎂 ولي الأمر: اختار عمر الطفل</label>
      <select id="child-age-home" class="input">${ageOptions(agePreference)}</select>
      <p class="hint">هنضبط الألعاب وصعوبتها تلقائيًا. للصغيرين، محتاجين حد كبير يقرأ التعليمات معاهم.</p>
    </div>
    <div class="btn-row"><button class="btn primary full" data-action="create">🎟️ بابا: اعمل غرفة جديدة</button></div>
    <p class="rule">أو ادخلي غرفة بابا بالكود:</p>
    <label for="room-input" class="tiny">رمز الغرفة • 8 حروف أو أرقام</label>
    <input class="input code-input" id="room-input" maxlength="8" spellcheck="false" autocomplete="off" autocapitalize="characters" value="${invitation}" placeholder="ABCD2345" aria-label="رمز الغرفة" />
    <div class="btn-row"><button class="btn pink full" data-action="join">🎀 ${childNamePreference || 'رقية'}: ادخلي الغرفة</button></div>
    <p class="hint">رمز الغرفة خاص. ابعته لبنتك فقط؛ ما تنشروش علنًا.</p>
  </div>`;
}
function renderLobby() {
  const waiting = !canPlay();
  const childAge=normalizeAge(state?.childAge);
  const available=gamesForAge(childAge);
  screen.innerHTML = `<div class="panel center">
    <div class="big-emoji">🎪</div><h2>${waiting ? `في انتظار دخول ${childName()} 💌` : 'يلا نلعب سوا! 🎉'}</h2>
    <p>رمز الغرفة</p><div class="room-code" aria-label="رمز الغرفة">${roomCode}</div>
    <div class="btn-row"><button class="btn soft" data-action="copy">🔗 نسخ رابط الدعوة</button></div>
    ${scorePanel()}
    ${waiting ? `<p class="hint">ابعث الرابط لـ${childName()}، وتفتح اللعبة من موبايلها وتضغط دخول الغرفة.</p>` : `<p class="hint">بابا يختار اللعبة؛ و${childName()} هتشوف نفس اللعبة فورًا.</p>`}
    <div class="age-settings"><label for="child-name-lobby">✏️ اسم الطفل في الغرفة</label>
      ${role==='host'?`<input id="child-name-lobby" class="input" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${childName()}" aria-label="اسم الطفل في الغرفة" />`:`<div class="age-view">${childName()}</div>`}
      <p class="hint">ولي الأمر يقدر يغيّر الاسم هنا، وهيوصل للجهازين فورًا.</p>
    </div>
    <div class="age-settings"><label for="child-age-lobby">🎂 عمر الطفل • مستوى الألعاب</label>
      ${role==='host'?`<select id="child-age-lobby" class="input">${ageOptions(childAge)}</select>`:`<div class="age-view">${childAge} سنوات • بابا يقدر يغيّر المستوى</div>`}
      <p class="hint">المتاح دلوقتي ${available.length} ألعاب مناسبة للعمر. المستوى بيتغير مع الجولات الجديدة.</p>
    </div>
    <h3 class="game-title">🎮 اختاروا لعبة الملاهي (${available.length})</h3>
    <p class="hint">إعدادات كل لعبة هتظهر جواها وقت اللعب، عشان الصفحة تفضل بسيطة.</p>
    <div class="game-grid">
      ${available.map(key=>`<button class="game-choice" data-game="${key}" ${role !== 'host' || waiting ? 'disabled':''}><span class="emoji">${GAME_LABELS[key][0]}</span>${GAME_LABELS[key][1]}<small>${GAME_LABELS[key][2]}</small></button>`).join('')}
    </div>
    ${role === 'guest' ? '<p class="hint">استني بابا يختار اللعبة 🎠</p>' : ''}
  </div>`;
}
function gameHeading(icon, title) {
  return `<div class="topline"><span class="tag">${icon} ${title}</span><div class="topline-actions"><button class="btn soft voice-replay" data-action="welcome" ${!soundEnabled?'disabled':''}>🔊 اسمع الترحيب</button>${role === 'host' ? '<button class="btn soft" data-action="lobby">🎡 المدينة</button>' : '<span class="tag green">غرفة خاصة 🔒</span>'}</div></div>${scorePanel()}`;
}
function memorySettingsInsideGame() {
  if (role !== 'host') return '';
  const age=normalizeAge(state?.childAge),sizes=memorySizesForAge(age),chosen=effectiveMemoryPreference(age);
  return `<div class="in-game-settings memory-settings compact-settings">
    <label for="memory-size-game">🃏 حجم لعبة الذاكرة</label>
    <div class="settings-action-row"><select id="memory-size-game" class="input">
      <option value="random" ${chosen==='random'?'selected':''}>🎲 متغيّر (${sizes[0]}–${sizes.at(-1)} كارت)</option>
      ${sizes.map(n=>`<option value="${n}" ${chosen===String(n)?'selected':''}>${n} كارت (${n/2} أزواج)</option>`).join('')}
    </select><button class="btn soft settings-apply" data-action="apply-memory-settings">ابدأ بالحجم ده</button></div>
    <p class="hint">التطبيق يبدأ جولة ذاكرة جديدة فورًا.</p>
  </div>`;
}
function numberSettingsInsideGame(gameKey) {
  if (role !== 'host' || !['count','math','numberline','compare'].includes(gameKey)) return '';
  const cfg=currentNumberTraining();
  const mathMode=gameKey==='math'?`<label for="math-mode-game">نوع مسائل الحساب</label><select id="math-mode-game" class="input"><option value="addition" ${cfg.mode==='addition'?'selected':''}>➕ جمع عادي</option><option value="doubles" ${cfg.mode==='doubles'?'selected':''}>🟰 جمع المتماثلات فقط (١+١، ٢+٢…)</option><option value="mixed" ${cfg.mode==='mixed'?'selected':''}>➕➖ جمع وطرح</option></select>`:'';
  const rangeHint=gameKey==='compare'?'اختار مدى فيه ٣ أرقام على الأقل عشان تظهر أسئلة التصاعدي والتنازلي والمقارنة.':'اختار أي مدى من ١ إلى ٢٠. الإعداد يفضل محفوظ على جهاز بابا.';
  return `<div class="in-game-settings number-settings compact-settings">
    <label>🔢 اختار الأرقام اللي هنتدرّب عليها</label>
    <div class="number-range-row"><label>من <input id="number-min-game" class="input number-input" type="text" inputmode="numeric" maxlength="2" value="${arabicDigits(cfg.min)}" aria-label="أول رقم في التدريب"></label><label>إلى <input id="number-max-game" class="input number-input" type="text" inputmode="numeric" maxlength="2" value="${arabicDigits(cfg.max)}" aria-label="آخر رقم في التدريب"></label></div>
    ${mathMode}
    <button class="btn soft settings-apply" data-action="apply-number-settings">طبّق وابدأ سؤال جديد</button>
    <p class="hint">${rangeHint}</p>
  </div>`;
}
function finishBox() {
  if (state.phase !== 'finished') return '';
  const result = state.result;
  const title = result === 'draw' ? 'تعادل جميل! 🤝' : result === 'host' ? 'بابا كسب الجولة! 🎉' : result === 'guest' ? `الفوز لـ${childName()}! 🎉` : 'خلصت الجولة! 🎉';
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
    ${memorySettingsInsideGame()}
    <h2 class="game-title center">افتح كارتين شبه بعض • ${game.cards.length} كارت</h2>
    <p class="status">${state.phase === 'finished' ? 'كل الكروت اتكشفت! 🎊' : game.waiting ? 'بنبص على الكروت... 👀' : game.turn === role ? 'دورك دلوقتي! ✨' : `دور ${nameOf(game.turn)} ⏳`}</p>
    <div class="memory-grid ${game.cards.length<=6?'few':game.cards.length>=24?'very-dense':game.cards.length>=16?'dense':''} ${game.cards.length===6?'six':''}">${cards}</div>
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
    <p class="rule center">بابا ❌ • ${childName()} ⭕ • الفوز 3 ⭐ والتعادل ⭐ لكل واحد</p>
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
    const correct=chosen && emoji===item.emoji;
    return `<button class="choice ${chosen?(correct?'is-correct':'is-wrong'):''}" data-guess="${i}" ${drawer || chosen || state.phase !== 'playing' ? 'disabled':''} aria-label="${emoji}${chosen?(correct?'، إجابة صحيحة':'، إجابة غلط'):''}">${emoji}${chosen?`<span class="choice-result-tag">${correct?'✅ صح':'❌ غلط'}</span>`:''}</button>`;
  }).join('');
  let caption;
  if (state.phase === 'finished') caption = `الإجابة: ${item.emoji} ${item.name} — ${state.result === 'correct' ? 'برافو! 👏' : 'حاولوا تاني الجولة الجاية 💕'}`;
  else caption = drawer ? `ارسم ${item.name} ${item.emoji} من غير ما تقول الإجابة!` : `شوف الرسمة واختار الصورة الصح! ${game.guesses?.length ? 'جرب اختيار تاني 💪' : ''}`;
  const wrongGuesses=(game.guesses||[]).filter(emoji=>emoji!==item.emoji);
  const wrongAnswer=wrongGuesses.length?`<div class="answer-feedback is-wrong" role="status"><strong>❌ ${wrongGuesses.length>1?'الاختيارات دي غلط':'الإجابة دي غلط'}:</strong><div class="feedback-answer">${wrongGuesses.join('، ')}</div>${state.phase==='playing'?'<p>جرّب اختيار تاني 💪</p>':''}</div>`:'';
  screen.innerHTML = `<div class="panel">${gameHeading('🎨','ارسم وخمّن')}
    <h2 class="game-title center">${drawer?'🖍️ دورك ترسم':'👀 دورك تخمّن'}</h2>
    <p class="status">${caption}</p>
    <div class="drawing-wrap ${drawer && state.phase==='playing'?'':'readonly'}"><canvas id="drawing" width="800" height="600" aria-label="لوحة الرسم المشتركة"></canvas></div>
    ${drawer && state.phase==='playing' ? '<p class="hint center">استخدم صباعك للرسم على اللوحة ✏️</p>' : ''}
    ${!drawer && state.phase==='playing' ? `<div class="choices">${options}</div>` : ''}
    ${wrongAnswer}
    ${state.phase==='finished'?`<div class="finish"><strong>${state.result==='correct'?'🎉 إجابة صحيحة!':'💜 خلصت المحاولات'}</strong><p>✅ الإجابة الصحيحة: ${item.emoji} ${item.name}</p><p>رسّام الجولة الجاية: ${nameOf(other(game.drawer))}</p></div>`:''}
    ${role==='host' && state.phase==='finished' ? '<div class="btn-row"><button class="btn primary" data-action="next-draw">🎨 الرسمة اللي بعدها</button></div>' : ''}
    ${drawer && state.phase==='playing' ? '<div class="btn-row"><button class="btn soft" data-action="clear-draw">🧽 امسح الرسمة وابدأ تاني</button></div>' : ''}
    <p class="rule center">الصح من أول اختيار = 2 ⭐ • من المحاولة التانية أو التالتة = 1 ⭐</p>
  </div>`;
  redrawCanvas();
  bindCanvas(drawer && state.phase === 'playing');
}
function renderNumberOrder(){
  const q=state.quiz.question,order=state.quiz.order||[],done=state.phase==='finished';
  const canAnswer=!done&&state.quiz.turn===role;
  const buttons=q.options.map((option,i)=>{
    const selectedAt=order.indexOf(i),selected=selectedAt!==-1;
    const correct=done && q.expectedOrder[selectedAt]===i;
    return `<button class="quiz-choice number-order-choice ${selected?(correct?'is-correct':'is-picked'):''}" data-quiz="${i}" ${!canAnswer||selected?'disabled':''}><span class="number-card-value">${arabicDigits(option)}</span>${selected?`<span class="choice-result-tag">${arabicDigits(selectedAt+1)} ${done?(correct?'✅':'❌'):'✓'}</span>`:''}</button>`;
  }).join('');
  const sequence=(indices)=>`<div class="number-order-preview">${indices.map(i=>`<span class="number-chip">${arabicDigits(q.options[i])}</span>`).join('<span class="order-arrow">→</span>')}</div>`;
  const directionLabel=q.orderDirection==='desc'?'من الأكبر إلى الأصغر':'من الأصغر إلى الأكبر';
  const result=done?`<div class="finish" role="status"><strong>${state.result==='correct'?'🎉 ترتيب صحيح!':'💜 نتعلّم سوا!'}</strong>${state.result==='incorrect'?`<div class="answer-feedback is-wrong"><strong>❌ ترتيبك:</strong>${sequence(order)}</div>`:''}<div class="answer-feedback is-correct"><strong>✅ الترتيب الصحيح ${directionLabel}:</strong>${sequence(q.expectedOrder)}</div></div>`:'';
  screen.innerHTML=`<div class="panel">${gameHeading('🔢','ترتيب ومقارنة الأرقام')}${numberSettingsInsideGame('compare')}<h2 class="game-title center">${q.prompt}</h2><p class="status">${done?'الجولة خلصت 🎉':canAnswer?`اختاري الرقم التالي في الترتيب (${arabicDigits(order.length+1)} من ${arabicDigits(q.options.length)})`: `دور ${nameOf(state.quiz.turn)} ⏳`}</p><div class="quiz-options number-order-options">${buttons}</div>${role==='host'&&done?'<div class="btn-row quiz-next-row"><button class="btn primary" data-action="restart">🔁 سؤال جديد</button></div>':''}${result}<p class="rule center">رتّبي الأرقام صح لتحصلي على ⭐ نقطتين</p></div>`;
}

function renderQuiz() {
  const key=state.game, quiz=state.quiz;
  if (!quiz?.question) return;
  const q=quiz.question;
  if(q.visual==='number-order')return renderNumberOrder();
  const canAnswer=state.phase==='playing' && quiz.turn===role;
  const answered=state.phase==='finished';
  const selected=Number.isInteger(quiz.selected)?quiz.selected:null;
  const buttons=q.options.map((option,i)=>{
    const isWrong=answered&&selected===i&&i!==q.correct;
    const isCorrect=answered&&i===q.correct;
    return `<button class="quiz-choice ${q.visual?'visual-choice':''} ${isWrong?'is-wrong':''} ${isCorrect?'is-correct':''}" data-quiz="${i}" ${!canAnswer?'disabled':''}>${renderOption(option,q.optionVisual?{visual:q.optionVisual}:q)}${isWrong?'<span class="choice-result-tag">❌ غلط</span>':isCorrect?'<span class="choice-result-tag">✅ صح</span>':''}</button>`;
  }).join('');
  const result=answered ? `<div class="finish" role="status"><strong>${state.result==='correct'?'🎉 برافو! إجابة صح':'💜 نتعلّم سوا!'}</strong>${state.result==='incorrect'&&selected!==null&&q.options[selected]!==undefined?answerFeedback('إجابتك غلط:',q.options[selected],q):''}${answerFeedback('الإجابة الصحيحة:',q.options[q.correct],q,true)}</div>` : '';
  screen.innerHTML=`<div class="panel">${gameHeading(...GAME_LABELS[key].slice(0,2))}
    ${numberSettingsInsideGame(key)}
    <h2 class="game-title center">${q.prompt}</h2>
    ${renderQuestionDisplay(q)}
    <p class="status">${state.phase==='finished'?'الجولة خلصت 🎉':canAnswer?'دورك دلوقتي! ✨':`دور ${nameOf(quiz.turn)} ⏳`}</p>
    <div class="quiz-options ${q.visual==='photos'?'photo-options':q.visual==='number-compare'?'number-compare-options':q.visual==='sizes'&&q.options.length===2?'two-size-options':''}">${buttons}</div>
    ${role==='host'&&state.phase==='finished'?'<div class="btn-row quiz-next-row"><button class="btn primary" data-action="restart">🔁 سؤال جديد</button></div>':''}
    ${result}
    <p class="rule center">إجابة صحيحة = ⭐ نقطتين • الدور بيتبدّل كل سؤال</p>
  </div>`;
}
function renderTreasure() {
  const treasure=state.treasure;
  if(!treasure?.question)return;
  const q=treasure.question;
  const canAnswer=state.phase==='playing'&&treasure.turn===role;
  const buttons=q.options.map((option,i)=>{
    const isWrong=treasure.wrong?.includes(i);
    return `<button class="quiz-choice visual-choice ${isWrong?'is-wrong':''}" data-treasure="${i}" ${!canAnswer||isWrong?'disabled':''}>${renderOption(option,q)}${isWrong?'<span class="choice-result-tag">❌ غلط</span>':''}</button>`;
  }).join('');
  const lastWrong=treasure.wrong?.at(-1);
  // Keep the correct key hidden while the same treasure question is still in play.
  const wrongAnswer=lastWrong!==undefined&&state.phase==='playing'?answerFeedback('الإجابة دي غلط، جرّبوا مفتاح تاني:',q.options[lastWrong],q):'';
  screen.innerHTML=`<div class="panel">${gameHeading('🗝️','رحلة الكنز')}
    <h2 class="game-title center">افتحوا صندوق الكنز سوا! 🧰</h2>
    <div class="treasure-progress">${Array.from({length:treasure.goal||4},(_,i)=>`<span>${i<treasure.stage?'🔑':'🔒'}</span>`).join('')}</div>
    ${state.phase==='finished'?`<div class="finish"><div class="big-emoji">🎁</div><strong>فتحتوا صندوق الكنز! 🎉</strong><p>بابا: ${treasure.roundScores.host} ⭐ • ${childName()}: ${treasure.roundScores.guest} ⭐</p></div>`:
    `<h3 class="game-title center">${q.prompt}</h3><p class="status">${canAnswer?'دورك تختار المفتاح ✨':`دور ${nameOf(treasure.turn)} ⏳`}</p><div class="quiz-options">${buttons}</div>${wrongAnswer}`}
    ${role==='host'&&state.phase==='finished'?'<div class="btn-row"><button class="btn primary" data-action="restart">🎁 كنز جديد</button></div>':''}
    <p class="rule center">كل مفتاح صح = ⭐ لصاحبه • الغلط يسلّم الدور للتاني</p>
  </div>`;
}

function celebration(title='أحسنتِ يا بطلة!'){
  return `<div class="mini-celebration" role="status"><div class="celebration-stars">⭐ ✨ 🌟 ✨ ⭐</div><strong>${title}</strong></div>`;
}
function snakeTokenPosition(cell){
  const value=Math.max(1,Math.min(BOARD_FINAL_CELL,Number(cell)||1));
  const zero=value-1,row=Math.floor(zero/10),colInRow=zero%10;
  const col=row%2===0?colInRow:9-colInRow;
  return {x:((col+.5)/10)*100,y:((9-row+.5)/10)*100};
}
function snakeBoardPoint(cell){return snakeTokenPosition(cell);}
function ladderOverlay(start,end){
  const a=snakeBoardPoint(start),b=snakeBoardPoint(end),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
  const ox=(-dy/len)*1.25,oy=(dx/len)*1.25;
  const rails=`<line x1="${a.x+ox}" y1="${a.y+oy}" x2="${b.x+ox}" y2="${b.y+oy}"/><line x1="${a.x-ox}" y1="${a.y-oy}" x2="${b.x-ox}" y2="${b.y-oy}"/>`;
  let rungs='';for(let i=1;i<=6;i++){const t=i/7,x=a.x+dx*t,y=a.y+dy*t;rungs+=`<line x1="${x+ox}" y1="${y+oy}" x2="${x-ox}" y2="${y-oy}"/>`;}
  return `<g class="board-ladder">${rails}${rungs}</g>`;
}
function snakeCurveGeometry(start,end,index=0){
  const a=snakeBoardPoint(start),b=snakeBoardPoint(end),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
  const px=-dy/len,py=dx/len,wave=5.5+(index%3)*1.3,sign=index%2?1:-1;
  return {a,b,c1:{x:a.x+dx*.30+px*wave*sign,y:a.y+dy*.30+py*wave*sign},c2:{x:a.x+dx*.68-px*wave*sign,y:a.y+dy*.68-py*wave*sign}};
}
function snakeOverlay(start,end,index){
  const g=snakeCurveGeometry(start,end,index),colors=['#ef5b72','#7d63d9','#2cad79','#f38a38','#477bd9','#d45aa6','#28a4b8'],color=colors[index%colors.length];
  return `<g class="board-snake" style="--snake-color:${color}"><path d="M ${g.a.x} ${g.a.y} C ${g.c1.x} ${g.c1.y}, ${g.c2.x} ${g.c2.y}, ${g.b.x} ${g.b.y}"/><circle class="snake-head" cx="${g.a.x}" cy="${g.a.y}" r="2.7"/><circle class="snake-eye" cx="${g.a.x-.85}" cy="${g.a.y-.55}" r=".45"/><circle class="snake-eye" cx="${g.a.x+.85}" cy="${g.a.y-.55}" r=".45"/></g>`;
}
function snakesBoardOverlay(){
  const ladders=Object.entries(LADDERS).map(([a,b])=>ladderOverlay(Number(a),Number(b))).join('');
  const snakes=Object.entries(SNAKES).map(([a,b],i)=>snakeOverlay(Number(a),Number(b),i)).join('');
  return `<svg class="snakes-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${ladders}${snakes}</svg>`;
}
function snakesBoardCells(){
  const rows=[];
  for(let row=9;row>=0;row--){
    const vals=Array.from({length:10},(_,i)=>row*10+i+1);if(row%2===1)vals.reverse();
    for(const n of vals){
      const special=LADDERS[n]?'ladder-start':SNAKES[n]?'snake-start':'';
      rows.push(`<div class="snakes-cell ${special} ${n===1?'start-cell':''} ${n===100?'finish-cell':''}"><span>${arabicDigits(n)}</span>${LADDERS[n]?'<small>🪜</small>':SNAKES[n]?'<small>🐍</small>':n===100?'<small>🏆</small>':''}</div>`);
    }
  }
  return rows.join('');
}
function showSnakeEvent(kind){
  const box=document.querySelector('#snake-event-effect');if(!box)return;
  box.className=`snake-event-effect show ${kind}`;
  box.innerHTML=kind==='ladder'?'<strong>🎉 سُلَّم!</strong><span>✨⭐✨</span>':'<strong>😢 ثعبان!</strong><span>🐍💧</span>';
  setTimeout(()=>{if(box)box.className='snake-event-effect';},1500);
}
function setSnakeTokenPosition(token,pos,duration=0){
  if(!token||!pos)return;
  token.style.transition=duration?`left ${duration}ms cubic-bezier(.22,.75,.25,1), top ${duration}ms cubic-bezier(.22,.75,.25,1), transform ${Math.min(260,duration)}ms ease`:'none';
  token.style.left=`${pos.x}%`;token.style.top=`${pos.y}%`;
}
function cubicPoint(g,t){
  const u=1-t;
  return {x:u*u*u*g.a.x+3*u*u*t*g.c1.x+3*u*t*t*g.c2.x+t*t*t*g.b.x,y:u*u*u*g.a.y+3*u*u*t*g.c1.y+3*u*t*t*g.c2.y+t*t*t*g.b.y};
}
async function animateSnakeJump(token,move){
  if(move.jumpType==='ladder'){
    showSnakeEvent('ladder');snakeLadderCheer();
    const from=snakeBoardPoint(move.jumpFrom),to=snakeBoardPoint(move.jumpTo);
    for(let i=1;i<=9;i++){const t=i/9;setSnakeTokenPosition(token,{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t},125);await waitMs(130);}
  } else if(move.jumpType==='snake'){
    showSnakeEvent('snake');snakeSadSound();
    const entries=Object.keys(SNAKES).map(Number),index=Math.max(0,entries.indexOf(move.jumpFrom)),curve=snakeCurveGeometry(move.jumpFrom,move.jumpTo,index);
    for(let i=1;i<=14;i++){setSnakeTokenPosition(token,cubicPoint(curve,i/14),115);await waitMs(120);}
  }
}
async function runSnakeMoveAnimation(g){
  const move=g?.move;if(!move)return;
  const key=`${state?.round}:${move.id}`;if(snakeMoveVisualKey===key)return;snakeMoveVisualKey=key;
  await waitMs(80);
  const token=document.querySelector(`.snake-token[data-player="${move.player}"]`);if(!token)return;
  for(let i=0;i<(move.steps||[]).length;i++){
    snakeStepSound(i);token.classList.add('hopping');setSnakeTokenPosition(token,snakeBoardPoint(move.steps[i]),330);await waitMs(350);token.classList.remove('hopping');await waitMs(50);
  }
  if(move.jumpType)await animateSnakeJump(token,move);
  await waitMs(120);
  if(role===move.player)finishSnakeMove(move.id);
}
function startDiceVisual(g){
  const key=`${state?.round}:${g.rollId}`;if(snakeRollVisualKey===key)return;snakeRollVisualKey=key;
  if(snakeRollVisualTimer)clearInterval(snakeRollVisualTimer);
  let tick=0;const face=document.querySelector('#dice-face');if(!face)return;
  face.classList.add('rolling');
  snakeRollVisualTimer=setInterval(()=>{tick++;const v=1+((tick*5+g.rollId)%6);face.textContent=DICE_FACES[v];snakeDiceTick(tick);if(tick>=18){clearInterval(snakeRollVisualTimer);snakeRollVisualTimer=null;}},100);
  setTimeout(()=>{if(role===g.turn)finishDiceRoll(g.rollId);},1950);
}
function renderSnakes(){
  const g=state.snakes;if(!g)return;
  const host=snakeTokenPosition(g.positions.host),guest=snakeTokenPosition(g.positions.guest);
  const phase=g.phase||'ready',canRoll=state.phase==='playing'&&g.turn===role&&phase==='ready',canMove=state.phase==='playing'&&g.turn===role&&phase==='rolled';
  const diceValue=phase==='rolled'?g.dice:null;
  const status=state.phase==='finished'?'🏁 انتهى السباق!':phase==='rolling'?`🎲 ${nameOf(g.turn)} بيرمي النرد...`:phase==='rolled'?`${nameOf(g.turn)} طلع له ${arabicDigits(g.dice)} — اضغط تحرك`:phase==='moving'?`👣 ${nameOf(g.turn)} بيتحرك...`:canRoll?'دورك ترمي النرد 🎲':`دور ${nameOf(g.turn)} ⏳`;
  const last=g.lastRoll?`آخر حركة: ${nameOf(g.lastRoll.player)} • ${arabicDigits(g.lastRoll.dice)} خطوات • وصل ${arabicDigits(g.lastRoll.landing)}${g.lastRoll.jump==='ladder'?' 🪜':g.lastRoll.jump==='snake'?' 🐍':''}`:'ابدأوا السباق!';
  screen.innerHTML=`<div class="panel snakes-panel">${gameHeading('🐍','السلم والثعبان')}
    <div class="snakes-title-row"><div><h2 class="game-title">سباق الـ ${arabicDigits(BOARD_FINAL_CELL)}</h2><p class="hint">النرد أولًا، وبعد ظهور الرقم اضغط «تحرك» وشوف كل خطوة.</p></div><div class="turn-badge">${g.turn==='host'?'👨 بابا':`👧 ${childName()}`}</div></div>
    <div class="snakes-summary"><span>👨 بابا: ${arabicDigits(g.positions.host)}</span><span>👧 ${childName()}: ${arabicDigits(g.positions.guest)}</span></div>
    <div class="snakes-pro-board" id="snakes-board">
      <div class="snakes-grid">${snakesBoardCells()}</div>${snakesBoardOverlay()}
      <div class="snakes-token-layer"><div class="snake-token host" data-player="host" style="left:${host.x}%;top:${host.y}%">👨</div>
      <div class="snake-token guest" data-player="guest" style="left:${guest.x}%;top:${guest.y}%">👧</div></div>
      <div class="snake-event-effect" id="snake-event-effect"></div>
    </div>
    <div class="dice-stage ${phase}"><div id="dice-face" class="dice-face ${phase==='rolling'?'rolling':''}">${diceValue?DICE_FACES[diceValue]:'🎲'}</div><div class="dice-copy"><strong>${phase==='rolled'?`طلع ${arabicDigits(g.dice)}`:phase==='rolling'?'النرد بيلف...':'جاهز؟'}</strong><span>${last}</span></div></div>
    <p class="status">${status}</p>
    <div class="btn-row snakes-actions">${canRoll?'<button class="btn primary dice-btn" data-action="roll-dice">🎲 ارمِ النرد</button>':''}${canMove?`<button class="btn pink move-btn" data-action="move-snakes">👣 تحرك ${arabicDigits(g.dice)} خطوات</button>`:''}</div>
    ${state.phase==='finished'?`${celebration(state.result==='host'?'بابا وصل للكأس! 🏆':`${childName()} وصلت للكأس! 🏆`)}${role==='host'?'<div class="btn-row"><button class="btn primary" data-action="restart">🔁 سباق جديد</button></div>':''}`:''}
    <p class="rule center">السلالم والثعابين مرسومة من نفس خريطة الحركة، لذلك مكانها مطابق ١٠٠٪ للمنطق • السلم يصعد تدريجيًا • الثعبان ينزل تدريجيًا.</p>
  </div>`;
  if(phase==='rolling')startDiceVisual(g);
  if(phase==='moving')runSnakeMoveAnimation(g);
}
function coloringSvg(pageId,fills={}){
  const fill=i=>fills?.[i]||'#ffffff';
  const part=(i,markup)=>markup.replace('data-part',`data-color-part="${i}"`).replace(/FILL/g,fill(i));
  const common='stroke="#24174d" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round"';
  let parts=[];
  if(pageId==='kitten') parts=[
    `<circle data-part cx="38" cy="36" r="16" fill="FILL" ${common}/>` ,
    `<path data-part d="M115 27 Q139 8 163 27 Q158 47 139 57 Q120 47 115 27Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M140 44 C90 36 54 50 39 84 C28 111 43 153 77 170 C107 185 146 177 166 149 C183 125 180 90 159 67 C152 58 147 51 140 44Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M81 52 L96 24 L112 51Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M124 48 L144 20 L160 49Z" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="89" cy="123" rx="44" ry="36" fill="FILL" ${common}/>` ,
    `<path data-part d="M54 139 Q35 144 30 159 Q49 168 66 156Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M117 154 Q135 166 157 159 Q154 144 134 141Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M56 126 Q21 118 19 146 Q18 168 42 172" fill="FILL" ${common}/>` ,
    `<path data-part d="M168 129 Q184 135 185 149 Q184 165 165 171" fill="FILL" ${common}/>` ,
    `<path data-part d="M85 44 Q93 57 105 46 Q96 34 85 44Z" fill="FILL" ${common}/>` ,
    `<circle data-part cx="100" cy="73" r="8" fill="FILL" ${common}/>` ,
    `<circle data-part cx="132" cy="74" r="8" fill="FILL" ${common}/>` ,
    `<path data-part d="M26 164 Q43 148 56 168 Q40 186 26 164Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M143 171 Q161 152 176 171 Q160 187 143 171Z" fill="FILL" ${common}/>`
  ];
  else if(pageId==='car') parts=[
    `<circle data-part cx="162" cy="30" r="18" fill="FILL" ${common}/>` ,
    `<path data-part d="M26 37 Q48 12 72 37 Q54 53 26 37Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M20 122 L50 84 Q60 72 81 72 H122 Q143 73 156 95 L179 122 V150 H18 V122Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M74 79 H99 V109 H50Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M104 79 H126 Q139 79 149 110 H104Z" fill="FILL" ${common}/>` ,
    `<circle data-part cx="56" cy="150" r="21" fill="FILL" ${common}/>` ,
    `<circle data-part cx="142" cy="150" r="21" fill="FILL" ${common}/>` ,
    `<circle data-part cx="56" cy="150" r="8" fill="FILL" ${common}/>` ,
    `<circle data-part cx="142" cy="150" r="8" fill="FILL" ${common}/>` ,
    `<path data-part d="M13 170 Q62 139 119 156 Q163 168 192 160" fill="none" stroke="FILL" stroke-width="10" stroke-linecap="round"/>` ,
    `<path data-part d="M160 130 V72" fill="none" stroke="FILL" stroke-width="8" stroke-linecap="round"/>` ,
    `<circle data-part cx="160" cy="61" r="19" fill="FILL" ${common}/>` ,
    `<path data-part d="M24 163 Q36 146 52 163 Q41 179 24 163Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M54 164 Q67 146 83 163 Q70 181 54 164Z" fill="FILL" ${common}/>`
  ];
  else if(pageId==='butterfly') parts=[
    `<circle data-part cx="33" cy="32" r="15" fill="FILL" ${common}/>` ,
    `<path data-part d="M27 178 Q56 134 82 176" fill="none" stroke="FILL" stroke-width="11" stroke-linecap="round"/>` ,
    `<ellipse data-part cx="87" cy="92" rx="28" ry="38" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="127" cy="92" rx="28" ry="38" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="92" cy="137" rx="24" ry="29" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="124" cy="137" rx="24" ry="29" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="108" cy="113" rx="10" ry="35" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="40" cy="162" rx="18" ry="18" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="72" cy="162" rx="18" ry="18" fill="FILL" ${common}/>` ,
    `<circle data-part cx="40" cy="162" r="6" fill="FILL" ${common}/>` ,
    `<circle data-part cx="72" cy="162" r="6" fill="FILL" ${common}/>` ,
    `<path data-part d="M140 176 Q160 140 183 176" fill="none" stroke="FILL" stroke-width="11" stroke-linecap="round"/>` ,
    `<ellipse data-part cx="140" cy="160" rx="18" ry="18" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="183" cy="160" rx="18" ry="18" fill="FILL" ${common}/>`
  ];
  else if(pageId==='house') parts=[
    `<rect data-part x="43" y="89" width="116" height="78" rx="7" fill="FILL" ${common}/>` ,
    `<path data-part d="M28 93 L101 28 L176 93 Z" fill="FILL" ${common}/>` ,
    `<rect data-part x="90" y="119" width="27" height="48" rx="6" fill="FILL" ${common}/>` ,
    `<rect data-part x="58" y="108" width="22" height="21" rx="4" fill="FILL" ${common}/>` ,
    `<rect data-part x="123" y="108" width="22" height="21" rx="4" fill="FILL" ${common}/>` ,
    `<rect data-part x="24" y="167" width="154" height="13" rx="7" fill="FILL" ${common}/>` ,
    `<circle data-part cx="24" cy="42" r="16" fill="FILL" ${common}/>` ,
    `<circle data-part cx="177" cy="43" r="16" fill="FILL" ${common}/>` ,
    `<path data-part d="M154 59 V30 H169 V76" fill="FILL" ${common}/>` ,
    `<circle data-part cx="35" cy="148" r="13" fill="FILL" ${common}/>` ,
    `<circle data-part cx="164" cy="148" r="13" fill="FILL" ${common}/>` ,
    `<path data-part d="M31 178 Q47 157 65 178" fill="none" stroke="FILL" stroke-width="11" stroke-linecap="round"/>` ,
    `<path data-part d="M139 178 Q155 157 173 178" fill="none" stroke="FILL" stroke-width="11" stroke-linecap="round"/>`
  ];
  else if(pageId==='fish') parts=[
    `<ellipse data-part cx="97" cy="101" rx="56" ry="34" fill="FILL" ${common}/>` ,
    `<path data-part d="M147 100 L184 71 L185 130 Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M92 68 Q110 43 131 69Z" fill="FILL" ${common}/>` ,
    `<circle data-part cx="79" cy="93" r="7" fill="FILL" ${common}/>` ,
    `<path data-part d="M76 111 Q95 123 114 111" fill="none" stroke="FILL" stroke-width="5" stroke-linecap="round"/>` ,
    `<path data-part d="M42 145 Q70 133 96 145" fill="none" stroke="FILL" stroke-width="10" stroke-linecap="round"/>` ,
    `<path data-part d="M109 149 Q140 132 168 149" fill="none" stroke="FILL" stroke-width="10" stroke-linecap="round"/>` ,
    `<circle data-part cx="36" cy="44" r="14" fill="FILL" ${common}/>` ,
    `<circle data-part cx="168" cy="38" r="12" fill="FILL" ${common}/>` ,
    `<circle data-part cx="149" cy="166" r="12" fill="FILL" ${common}/>` ,
    `<path data-part d="M23 172 Q36 157 49 172" fill="none" stroke="FILL" stroke-width="10" stroke-linecap="round"/>` ,
    `<path data-part d="M166 178 Q180 162 193 178" fill="none" stroke="FILL" stroke-width="10" stroke-linecap="round"/>`
  ];
  else parts=[
    `<circle data-part cx="103" cy="52" r="20" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="103" cy="17" rx="17" ry="22" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="137" cy="32" rx="17" ry="22" transform="rotate(52 137 32)" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="144" cy="70" rx="17" ry="22" transform="rotate(118 144 70)" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="66" cy="73" rx="17" ry="22" transform="rotate(60 66 73)" fill="FILL" ${common}/>` ,
    `<ellipse data-part cx="61" cy="35" rx="17" ry="22" transform="rotate(122 61 35)" fill="FILL" ${common}/>` ,
    `<path data-part d="M102 75 V156 H90 L102 75Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M99 112 Q60 97 50 126 Q74 142 97 131Z" fill="FILL" ${common}/>` ,
    `<path data-part d="M110 128 Q141 109 154 129 Q136 149 113 141Z" fill="FILL" ${common}/>` ,
    `<rect data-part x="85" y="156" width="35" height="10" rx="5" fill="FILL" ${common}/>` ,
    `<circle data-part cx="27" cy="160" r="15" fill="FILL" ${common}/>` ,
    `<circle data-part cx="173" cy="160" r="15" fill="FILL" ${common}/>`
  ];
  return `<svg class="coloring-canvas" viewBox="0 0 200 190" role="img" aria-label="رسمة للتلوين">${parts.map((s,i)=>part(i,s)).join('')}</svg>`;
}
function renderColoring(){
  const g=state.coloring;if(!g)return;const page=COLORING_PAGES[g.pageIndex%COLORING_PAGES.length];
  const palette=COLOR_PALETTE.map(c=>`<button class="palette-color ${c===coloringSelectedColor?'selected':''}" data-color-pick="${c}" style="--palette:${c}" aria-label="اختيار لون"></button>`).join('');
  const filled=Object.keys(g.fills||{}).length;
  screen.innerHTML=`<div class="panel">${gameHeading('🎨','كتاب التلوين')}<h2 class="game-title center">لوّني ${page.name} بالضغط على الأجزاء</h2><div class="coloring-wrap premium">${coloringSvg(page.id,g.fills)}</div><div class="color-palette" aria-label="لوحة الألوان">${palette}</div><p class="status">تم تلوين ${arabicDigits(filled)} من ${arabicDigits(page.parts)} أجزاء</p>${state.phase==='finished'?celebration(`أحسنتِ يا ${childName()}! اكتملت الرسمة 🎨`):''}<div class="btn-row">${role==='host'?'<button class="btn soft" data-action="reset-coloring">🧽 مسح وإعادة</button><button class="btn primary" data-action="next-coloring">➡️ الرسمة التالية</button>':''}</div><p class="rule center">رسومات أوضح وأجمل للتلوين • اختاري لونًا ثم اضغطي داخل أي جزء • عند الاكتمال تظهر نجوم الاحتفال</p></div>`;
}
function puzzleSceneSvg(id){
  const common=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`;
  if(id==='pond')return `${common}<defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9be0ff"/><stop offset="1" stop-color="#e9fbff"/></linearGradient></defs><rect width="512" height="512" fill="url(#sky)"/><rect y="315" width="512" height="197" fill="#8fd46a"/><ellipse cx="267" cy="331" rx="187" ry="82" fill="#56bfe7"/><ellipse cx="266" cy="337" rx="130" ry="54" fill="#8ae6ff"/><circle cx="90" cy="83" r="38" fill="#ffd45f"/><g fill="#fff"><ellipse cx="186" cy="84" rx="52" ry="22"/><ellipse cx="370" cy="88" rx="60" ry="25"/></g><g fill="#2ea56d"><circle cx="91" cy="266" r="53"/><circle cx="140" cy="248" r="42"/><circle cx="426" cy="272" r="47"/><circle cx="376" cy="282" r="34"/></g><g><ellipse cx="258" cy="331" rx="98" ry="49" fill="#ffb342"/><circle cx="217" cy="320" r="10" fill="#fff"/><circle cx="217" cy="320" r="5" fill="#2a355f"/><path d="M348 334Q327 310 304 334Q327 359 348 334Z" fill="#ff8d2f"/><path d="M210 366Q258 388 307 366" stroke="#d57f27" stroke-width="12" fill="none" stroke-linecap="round"/></g><g fill="#ff78a0"><circle cx="126" cy="415" r="17"/><circle cx="153" cy="416" r="17"/><circle cx="426" cy="406" r="17"/><circle cx="453" cy="408" r="17"/></g></svg>`;
  if(id==='garden')return `${common}<rect width="512" height="512" fill="#dff8ff"/><rect y="344" width="512" height="168" fill="#90d96b"/><circle cx="428" cy="91" r="41" fill="#ffd966"/><g fill="#fff"><ellipse cx="122" cy="94" rx="61" ry="24"/><ellipse cx="244" cy="60" rx="56" ry="20"/></g><g><ellipse cx="181" cy="232" rx="94" ry="72" fill="#ff96b5"/><ellipse cx="331" cy="232" rx="94" ry="72" fill="#9bb8ff"/><ellipse cx="210" cy="324" rx="70" ry="58" fill="#ffb45f"/><ellipse cx="305" cy="324" rx="70" ry="58" fill="#8de28d"/><ellipse cx="257" cy="271" rx="34" ry="108" fill="#6a4d3a"/><circle cx="257" cy="222" r="30" fill="#ffe3a5"/><circle cx="247" cy="217" r="5" fill="#2a355f"/><circle cx="268" cy="217" r="5" fill="#2a355f"/><path d="M244 232Q257 246 270 232" stroke="#2a355f" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M239 177Q220 146 195 160" stroke="#6a4d3a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M275 177Q293 146 319 160" stroke="#6a4d3a" stroke-width="6" fill="none" stroke-linecap="round"/></g><g fill="#ff79ae"><circle cx="86" cy="426" r="19"/><circle cx="118" cy="426" r="19"/><circle cx="101" cy="396" r="19"/></g><circle cx="101" cy="418" r="10" fill="#ffd966"/><g fill="#89c36b"><rect x="98" y="418" width="7" height="62"/></g></svg>`;
  if(id==='castle')return `${common}<defs><linearGradient id="castleSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfe9ff"/><stop offset="1" stop-color="#fff4fb"/></linearGradient></defs><rect width="512" height="512" fill="url(#castleSky)"/><rect y="357" width="512" height="155" fill="#97d87b"/><path d="M123 352H389V210H123Z" fill="#f7b3d3"/><path d="M105 218H164V128H105Z" fill="#d783c3"/><path d="M348 218H407V128H348Z" fill="#d783c3"/><path d="M218 209H293V111H218Z" fill="#ef98ca"/><path d="M105 128L134 94L164 128M218 111L256 72L293 111M348 128L377 94L407 128" fill="#8b63d8" stroke="#4c2f9f" stroke-width="6" stroke-linejoin="round"/><rect x="230" y="271" width="52" height="81" rx="24" fill="#7c53d6"/><rect x="148" y="246" width="44" height="44" rx="13" fill="#fff0fa"/><rect x="322" y="246" width="44" height="44" rx="13" fill="#fff0fa"/><circle cx="86" cy="84" r="35" fill="#ffd966"/><g fill="#fff"><ellipse cx="172" cy="86" rx="55" ry="22"/><ellipse cx="325" cy="71" rx="60" ry="23"/></g><path d="M55 357Q130 330 208 357T360 357T512 357V512H0V357Z" fill="#66bc63"/><g fill="#ff88b1"><circle cx="60" cy="414" r="17"/><circle cx="92" cy="414" r="17"/><circle cx="76" cy="386" r="17"/><circle cx="430" cy="423" r="17"/><circle cx="460" cy="423" r="17"/><circle cx="445" cy="396" r="17"/></g></svg>`;
  if(id==='dino')return `${common}<rect width="512" height="512" fill="#dcf4ff"/><rect y="338" width="512" height="174" fill="#98da71"/><circle cx="429" cy="90" r="36" fill="#ffd966"/><g fill="#fff"><ellipse cx="143" cy="83" rx="57" ry="23"/><ellipse cx="273" cy="60" rx="52" ry="20"/></g><g><path d="M160 303Q128 149 283 138Q386 132 405 228Q420 300 367 337Q323 368 262 357Q186 344 160 303Z" fill="#7fd278" stroke="#2e6b4a" stroke-width="10"/><path d="M110 290Q67 272 66 229Q74 194 130 219" fill="#7fd278" stroke="#2e6b4a" stroke-width="10" stroke-linejoin="round"/><circle cx="307" cy="187" r="13" fill="#fff"/><circle cx="311" cy="186" r="7" fill="#243058"/><path d="M343 220Q314 249 286 220" stroke="#243058" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M228 354V420M319 355V420" stroke="#2e6b4a" stroke-width="18" stroke-linecap="round"/><path d="M390 284Q426 279 441 303Q428 326 392 319" fill="#7fd278" stroke="#2e6b4a" stroke-width="10" stroke-linejoin="round"/><g fill="#f7f3ff"><path d="M195 146L210 113L228 147Z"/><path d="M233 138L249 102L267 140Z"/><path d="M274 136L289 102L307 139Z"/></g></g><g fill="#ff87aa"><circle cx="81" cy="421" r="15"/><circle cx="109" cy="421" r="15"/><circle cx="95" cy="396" r="15"/></g></svg>`;
  return `${common}<defs><linearGradient id="roadSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b8ecff"/><stop offset="1" stop-color="#f7fdff"/></linearGradient></defs><rect width="512" height="512" fill="url(#roadSky)"/><rect y="322" width="512" height="190" fill="#8fd16a"/><path d="M0 510Q158 386 318 406Q430 418 512 374V512Z" fill="#55566a"/><path d="M198 443L266 425M316 408L388 391M428 378L480 362" stroke="#fff3b0" stroke-width="15" stroke-linecap="round"/><circle cx="412" cy="85" r="41" fill="#ffd966"/><g fill="#fff"><ellipse cx="118" cy="81" rx="63" ry="25"/><ellipse cx="241" cy="112" rx="51" ry="21"/></g><g><rect x="92" y="221" width="295" height="111" rx="53" fill="#ff6b62"/><path d="M160 221Q205 145 299 145Q350 145 387 221Z" fill="#ff7f72"/><rect x="190" y="165" width="90" height="72" rx="18" fill="#b8ecff"/><rect x="286" y="165" width="72" height="72" rx="18" fill="#b8ecff"/><circle cx="176" cy="329" r="41" fill="#30344f"/><circle cx="318" cy="329" r="41" fill="#30344f"/><circle cx="176" cy="329" r="20" fill="#f2f2fb"/><circle cx="318" cy="329" r="20" fill="#f2f2fb"/><circle cx="350" cy="255" r="9" fill="#fff"/><circle cx="193" cy="255" r="9" fill="#fff"/><path d="M240 279Q274 302 307 279" stroke="#813734" stroke-width="10" fill="none" stroke-linecap="round"/></g><g fill="#53af63"><circle cx="440" cy="241" r="47"/><rect x="432" y="241" width="17" height="74" fill="#86664d"/></g></svg>`;
}
function puzzleImageUrl(id){
  if(id==='farm')return 'puzzle_farm.png';
  return `data:image/svg+xml,${encodeURIComponent(puzzleSceneSvg(id))}`;
}
function puzzleTile(id,piece,rows,cols,extra=''){
  const x=piece%cols,y=Math.floor(piece/cols),px=cols===1?0:(x/(cols-1))*100,py=rows===1?0:(y/(rows-1))*100;
  return `<span class="puzzle-tile ${extra}" style="background-image:url('${puzzleImageUrl(id)}');background-size:${cols*100}% ${rows*100}%;background-position:${px}% ${py}%"></span>`;
}
function renderJigsaw(){
  const g=state.jigsaw;if(!g)return;const total=g.rows*g.cols,placed=g.placed||{};
  const slots=Array.from({length:total},(_,i)=>`<button class="puzzle-slot ${placed[i]?'filled':''}" data-puzzle-slot="${i}" ${placed[i]?'disabled':''} aria-label="مكان القطعة ${i+1}">${placed[i]?puzzleTile(g.pictureId,i,g.rows,g.cols):'<span>＋</span>'}</button>`).join('');
  const tray=(g.order||[]).filter(i=>!placed[i]).map(i=>`<button class="puzzle-piece ${puzzleSelectedPiece===i?'selected':''}" data-puzzle-piece="${i}" aria-label="قطعة بازل">${puzzleTile(g.pictureId,i,g.rows,g.cols)}</button>`).join('');
  screen.innerHTML=`<div class="panel">${gameHeading('🧩','البازل المصغّر')}<div class="jigsaw-head"><div><h2 class="game-title">ركّبي صورة ${g.pictureName||'ممتعة'} في مكانها</h2><p class="hint">اسحبي القطعة للمكان الصحيح، أو اضغطي القطعة ثم مكانها.</p></div><img class="puzzle-reference" src="${puzzleImageUrl(g.pictureId)}" alt="الصورة المرجعية"></div><div class="puzzle-board" style="--pcols:${g.cols}">${slots}</div><div class="puzzle-tray premium">${tray||'<span class="hint">كل القطع اتركبت ✅</span>'}</div>${state.phase==='finished'?celebration('أحسنتِ يا بطلة! اكتملت الصورة 🧩'):''}${role==='host'&&state.phase==='finished'?'<div class="btn-row"><button class="btn primary" data-action="restart">🧩 بازل جديد</button></div>':''}<p class="rule center">صور ملوّنة وجذابة للأطفال • كل قطعة صحيحة = ⭐ • إكمال الصورة يعطي نجمتين إضافيتين</p></div>`;
  bindPuzzleDrag();
}
function sortingObject(item){
  const color=item.color==='red'?SORT_COLORS.red:SORT_COLORS.blue;
  return `<div class="sort-object-card" style="--sort-color:${color}"><span class="sort-object-emoji">${item.icon}</span><strong>${item.label}</strong><small>${item.color==='red'?'أحمر':'أزرق'}</small></div>`;
}
function renderSorting(){
  const g=state.sorting;if(!g)return;const item=g.items?.[g.index],can=state.phase==='playing'&&g.turn===role;
  const bins=[['red','السلة الحمراء','basket_red.png'],['blue','السلة الزرقاء','basket_blue.png']];
  const binHtml=bins.map(([key,label,src])=>`<button class="sort-bin basket-bin" data-sort-bin="${key}" ${!can?'disabled':''}><img src="${src}" alt="${label}"><span>${label}</span></button>`).join('');
  screen.innerHTML=`<div class="panel">${gameHeading('🧺','فرز الألوان والأشكال')}<h2 class="game-title center">اسحبي العنصر إلى سلة لونه</h2><p class="status">${state.phase==='finished'?'خلص الفرز 🎉':can?'دورك الآن ✨':`دور ${nameOf(g.turn)} ⏳`}</p>${item&&state.phase==='playing'?`<button class="sorting-item premium" data-sort-item="1" ${!can?'disabled':''}>${sortingObject(item)}<small>اسحبي العنصر</small></button>`:''}<div class="sort-bins premium">${binHtml}</div><div class="sort-progress">${Array.from({length:g.goal||10},(_,i)=>`<span>${i<g.index?'⭐':'☆'}</span>`).join('')}</div>${state.phase==='finished'?`${celebration('ممتاز! خلصتوا الفرز كله 🌟')}${role==='host'?'<div class="btn-row"><button class="btn primary" data-action="restart">🔁 جولة فرز جديدة</button></div>':''}`:''}<p class="rule center">العناصر أصبحت متنوعة أكثر والتحدي أكبر • اسحب العنصر إلى السلة المطابقة للونه • الصح = ⭐ • الخطأ يرجّع العنصر مكانه ويدّي الدور للتاني</p></div>`;
  bindSortingDrag();
}
function renderPhonics(){
  const g=state.phonics;if(!g)return;const matched=g.matched||[],can=state.phase==='playing'&&g.turn===role;
  const letters=(g.indices||[]).map(idx=>{const [letter,name]=PHONICS_BANK[idx];return `<button class="phonics-card phonics-letter ${matched.includes(idx)?'matched':''} ${g.selected===idx?'selected':''}" data-phonics-letter="${idx}" ${!can||matched.includes(idx)?'disabled':''}><strong>${letter}</strong><small>${name}</small></button>`;}).join('');
  const images=(g.imageOrder||g.indices||[]).map(idx=>{const [letter,,word,emoji]=PHONICS_BANK[idx];return `<button class="phonics-card phonics-image ${matched.includes(idx)?'matched':''}" data-phonics-image="${idx}" ${!can||matched.includes(idx)?'disabled':''}><span>${emoji}</span><small>${word}</small></button>`;}).join('');
  const links=matched.map(idx=>{const [letter,,word,emoji]=PHONICS_BANK[idx];return `<span class="phonics-link">${letter} ⟵ ${emoji} ${word}</span>`;}).join('');
  screen.innerHTML=`<div class="panel">${gameHeading('🔤','الحروف والصور')}<h2 class="game-title center">اختاري حرفًا ثم الصورة التي تبدأ به</h2><p class="status">${state.phase==='finished'?'اكتملت اللوحة 🎉':can?'دورك في المطابقة ✨':`دور ${nameOf(g.turn)} ⏳`}</p><div class="phonics-columns"><div class="phonics-col"><h3>الحروف</h3>${letters}</div><div class="phonics-col"><h3>الصور</h3>${images}</div></div><div class="phonics-links">${links}</div><div class="btn-row"><button class="btn soft" data-action="alphabet-music">${alphabetMusicEnabled?'🔇 أوقف الموسيقى':'🎵 موسيقى هادئة'}</button></div>${state.phase==='finished'?`${celebration(`أحسنتِ يا ${childName()}!`)}${role==='host'?'<div class="btn-row"><button class="btn primary" data-action="restart">🔤 حروف جديدة</button></div>':''}`:''}<p class="rule center">عند اختيار الحرف نحاول نطقه بالعربية • كل مطابقة صحيحة = ⭐</p></div>`;
}
function bindPointerDrop(sourceSelector,targetSelector,onDrop){
  document.querySelectorAll(sourceSelector).forEach(source=>{
    source.addEventListener('pointerdown',e=>{
      if(source.disabled)return;e.preventDefault();source.setPointerCapture?.(e.pointerId);
      const rect=source.getBoundingClientRect(),ghost=source.cloneNode(true);ghost.classList.add('drag-ghost');ghost.style.width=`${rect.width}px`;ghost.style.height=`${rect.height}px`;document.body.append(ghost);
      const move=ev=>{ghost.style.left=`${ev.clientX-rect.width/2}px`;ghost.style.top=`${ev.clientY-rect.height/2}px`;};move(e);
      const up=ev=>{move(ev);ghost.remove();const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest(targetSelector);source.removeEventListener('pointermove',move);source.removeEventListener('pointerup',up);source.removeEventListener('pointercancel',up);if(target)onDrop(source,target);};
      source.addEventListener('pointermove',move);source.addEventListener('pointerup',up);source.addEventListener('pointercancel',up);
    });
  });
}
function bindPuzzleDrag(){bindPointerDrop('.puzzle-piece','.puzzle-slot',(source,target)=>placePuzzle(Number(source.dataset.puzzlePiece),Number(target.dataset.puzzleSlot),source));}
function bindSortingDrag(){bindPointerDrop('.sorting-item','.sort-bin',(source,target)=>chooseSorting(target.dataset.sortBin,source));}

function render() {
  connection.textContent = !uid ? '⏳ جاري الاتصال' : connected ? '🟢 الإنترنت متصل' : '🟠 الاتصال مقطوع';
  document.body.classList.toggle('playing-game',Boolean(roomCode&&state&&state.game!=='lobby'));
  if(state?.game!=='phonics'&&alphabetMusicTimer)stopAlphabetMusic();
  if (!roomCode) { renderHome(); return; }
  if (!meta || !state) { screen.innerHTML = '<div class="panel center"><div class="big-emoji">🎠</div><h2>جاري دخول الملاهي…</h2></div>'; return; }
  if (state.game === 'lobby') return renderLobby();
  if (state.game === 'memory') return renderMemory();
  if (state.game === 'ttt') return renderTtt();
  if (state.game === 'draw') return renderDraw();
  if (QUIZ_GAMES.includes(state.game)) return renderQuiz();
  if (state.game === 'treasure') return renderTreasure();
  if (state.game === 'snakes') return renderSnakes();
  if (state.game === 'coloring') return renderColoring();
  if (state.game === 'jigsaw') return renderJigsaw();
  if (state.game === 'sorting') return renderSorting();
  if (state.game === 'phonics') return renderPhonics();
  screen.innerHTML = '<div class="panel"><p>اللعبة غير معروفة. اطلب من بابا يرجع للمدينة.</p></div>';
}
// Counts only game starts and completed rounds, not child names, answers, drawings or device IDs.
// Kept inside each room's existing state so no extra Firebase permissions are needed.
const STATS_KEEP_DAYS = 45;
function statisticsDay(date = new Date()) {
  // One reporting timezone for all families; do not use the device's local timezone.
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const part = kind => parts.find(x => x.type === kind)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch (_) { return date.toISOString().slice(0, 10); }
}
function recordAggregateMetrics(previous, next, day = statisticsDay()) {
  if (!next || typeof next !== 'object') return next;
  const validGame = game => GAMES.includes(game);
  const started = validGame(next.game) && next.phase === 'playing' &&
    Number.isInteger(next.round) && next.round > 0 && next.round !== previous.round;
  const completed = validGame(next.game) && next.game === previous.game &&
    next.round === previous.round && previous.phase === 'playing' && next.phase === 'finished';
  if (!started && !completed) return next;
  const prior = previous.metrics?.v === 1 ? previous.metrics : {v:1, days:{}};
  const days = {...(prior.days || {})};
  // Retain a bounded reporting window, including the whole 30-day trial.
  const cutoff = statisticsDay(new Date(Date.parse(`${day}T00:00:00Z`) - (STATS_KEEP_DAYS - 1) * 86400000));
  for (const key of Object.keys(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < cutoff || key > day) delete days[key];
  }
  const today = days[day] || {};
  const metric = started ? 'starts' : 'completions';
  const gameCounts = {...(today[metric] || {})};
  gameCounts[next.game] = (Number(gameCounts[next.game]) || 0) + 1;
  days[day] = {...today, [metric]:gameCounts};
  return {...next, metrics:{v:1,days}};
}
async function mutateState(transform) {
  if (!roomCode || !role) return;
  try {
    return await runTransaction(ref(db, `rooms/${roomCode}/state`), current => {
      // Firebase may invoke the updater with null before the server value is cached.
      const latest = current ?? state;
      if (!latest) return;
      const next = transform(latest);
      return recordAggregateMetrics(latest, next);
    }, { applyLocally:false });
  } catch (e) { info(humanError(e)); }
}
function newGame(which, old, previousDraw) {
  const childAge=normalizeAge(old?.childAge);
  const common={childAge,childName:normalizeChildName(old?.childName)||'رقية'};
  const scores = {...(old?.scores || { host:0,guest:0 })};
  const round = (old?.round || 0) + 1;
  if (which === 'memory') {
    const sizes=memorySizesForAge(childAge);
    const requested=memoryPreference==='random'?null:Number(memoryPreference);
    const eligible=sizes.filter(n=>n!==old?.memory?.cards?.length);
    const size=sizes.includes(requested)?requested:(eligible.length?eligible:sizes)[Math.floor(Math.random()*(eligible.length||sizes.length))];
    const picks=shuffle(MEMORY_EMOJI).slice(0,size/2);
    return { ...common,game:which,phase:'playing',scores,round,memory:{cards:shuffle([...picks,...picks]),matched:[],revealed:[],roundScores:{host:0,guest:0},waiting:false,turn:round%2===0?'guest':'host'} };
  }
  if (which === 'snakes') return {...common,game:which,phase:'playing',scores,round,snakes:{positions:{host:1,guest:1},turn:round%2===0?'guest':'host',phase:'ready',dice:null,pendingDice:null,rollId:0,moveId:0,move:null,lastRoll:null}};
  if (which === 'coloring') {
    const previous=old?.game==='coloring'?old.coloring?.pageIndex:-1,pageIndex=(Number(previous)+1)%COLORING_PAGES.length;
    return {...common,game:which,phase:'playing',scores,round,coloring:{pageIndex,fills:{}}};
  }
  if (which === 'jigsaw') {
    const rows=2,cols=childAge<=6?2:3,total=rows*cols;
    const oldPic=old?.game==='jigsaw'?old.jigsaw?.pictureId:null;
    const choices=PUZZLE_PICTURES.filter(x=>x.id!==oldPic),picture=choices[Math.floor(Math.random()*choices.length)]||PUZZLE_PICTURES[0];
    return {...common,game:which,phase:'playing',scores,round,jigsaw:{pictureId:picture.id,pictureName:picture.name,rows,cols,order:shuffle(Array.from({length:total},(_,i)=>i)),placed:{}}};
  }
  if (which === 'sorting') {
    const goal=normalizeAge(childAge)<=5?8:12,items=[];
    for(let i=0;i<goal;i++){
      const base=SORTING_POOL[Math.floor(Math.random()*SORTING_POOL.length)];
      items.push({...base,color:Math.random()<.5?'red':'blue'});
    }
    return {...common,game:which,phase:'playing',scores,round,sorting:{goal,items,index:0,turn:round%2===0?'guest':'host',roundScores:{host:0,guest:0}}};
  }
  if (which === 'phonics') {
    const oldSet=old?.game==='phonics'?old.phonics?.indices||[]:[];
    let pool=shuffle(Array.from({length:PHONICS_BANK.length},(_,i)=>i));
    let indices=pool.filter(i=>!oldSet.includes(i)).slice(0,3);if(indices.length<3)indices=pool.slice(0,3);
    return {...common,game:which,phase:'playing',scores,round,phonics:{indices,imageOrder:shuffle(indices),matched:[],selected:null,turn:round%2===0?'guest':'host',roundScores:{host:0,guest:0}}};
  }
  if (which === 'ttt') return {...common,game:which,phase:'playing',scores,round,ttt:{board:'.........',turn:round%2===0?'guest':'host'}};
  if (QUIZ_GAMES.includes(which)) return {...common,game:which,phase:'playing',scores,round,quiz:{turn:round%2===0?'guest':'host',question:newQuestion(which,old?.game===which?old?.quiz?.question?.index:-1,childAge,currentNumberTraining())}};
  if (which === 'treasure') return {...common,game:which,phase:'playing',scores,round,treasure:{stage:0,goal:childAge>=8?6:4,turn:round%2===0?'guest':'host',wrong:[],roundScores:{host:0,guest:0},question:newQuestion('treasure',-1,childAge)}};
  const lastIndex = previousDraw?.promptIndex ?? -1;
  const drawLimit=childAge<=5?12:childAge<=7?25:DRAW_ITEMS.length;
  let promptIndex = Math.floor(Math.random()*drawLimit);
  if (drawLimit>1 && promptIndex===lastIndex) promptIndex=(promptIndex+1)%drawLimit;
  const item = DRAW_ITEMS[promptIndex];
  return {...common,game:'draw',phase:'playing',scores,round,draw:{drawer:previousDraw?other(previousDraw.drawer):'host',promptIndex,options:shuffle(item.choices),guesses:[]}};
}
async function startGame(which) {
  if (role !== 'host' || !canPlay() || !gamesForAge(state?.childAge).includes(which)) return;
  if (which === 'draw') await remove(ref(db,`rooms/${roomCode}/strokes`)).catch(e=>info(humanError(e)));
  const base = newGame(which,state,which==='draw' && state?.game==='draw'?state.draw:null);
  welcomeToGame(which,base.childName,`${roomCode}:${base.round}`);
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
    if(q.visual==='number-order'){
      const order=old.quiz.order||[];
      if(order.includes(index))return;
      const nextOrder=[...order,index];
      if(nextOrder.length<q.options.length)return {...old,quiz:{...old.quiz,order:nextOrder}};
      const correct=nextOrder.every((item,i)=>item===q.expectedOrder[i]);
      const scores={...old.scores};
      if(correct)scores[role]+=2;
      return {...old,scores,feedback:addFeedback(old,correct?'good':'bad'),phase:'finished',result:correct?'correct':'incorrect',quiz:{...old.quiz,order:nextOrder}};
    }
    const correct=index===q.correct;
    const scores={...old.scores};
    if(correct)scores[role]+=2;
    return {...old,scores,feedback:addFeedback(old,correct?'good':'bad'),phase:'finished',result:correct?'correct':'incorrect',quiz:{...old.quiz,selected:index}};
  });
}

async function rollDice(){
  const pending=1+Math.floor(Math.random()*6);
  sound('tap');
  await mutateState(old=>{
    if(old.game!=='snakes'||old.phase!=='playing'||old.snakes?.turn!==role)return;
    const g=old.snakes;if((g.phase||'ready')!=='ready')return;
    return {...old,snakes:{...g,phase:'rolling',pendingDice:pending,dice:null,rollId:(g.rollId||0)+1,move:null}};
  });
}
async function finishDiceRoll(rollId){
  await mutateState(old=>{
    if(old.game!=='snakes'||old.phase!=='playing'||old.snakes?.turn!==role)return;
    const g=old.snakes;if(g.phase!=='rolling'||g.rollId!==rollId||!Number.isInteger(g.pendingDice))return;
    return {...old,snakes:{...g,phase:'rolled',dice:g.pendingDice,pendingDice:null}};
  });
}
async function startSnakeMove(){
  await mutateState(old=>{
    if(old.game!=='snakes'||old.phase!=='playing'||old.snakes?.turn!==role)return;
    const g=old.snakes;if(g.phase!=='rolled'||!Number.isInteger(g.dice))return;
    const start=Number(g.positions?.[role])||1,steps=[];
    for(let i=1;i<=g.dice;i++){steps.push(Math.min(BOARD_FINAL_CELL,start+i));if(steps.at(-1)>=BOARD_FINAL_CELL)break;}
    const jumpFrom=steps.at(-1)||start;
    const jumpType=LADDERS[jumpFrom]?'ladder':SNAKES[jumpFrom]?'snake':'';
    const jumpTo=jumpType==='ladder'?LADDERS[jumpFrom]:jumpType==='snake'?SNAKES[jumpFrom]:jumpFrom;
    const id=(g.moveId||0)+1;
    return {...old,snakes:{...g,phase:'moving',moveId:id,move:{id,player:role,dice:g.dice,steps,jumpType,jumpFrom,jumpTo,destination:jumpTo}}};
  });
}
async function finishSnakeMove(moveId){
  await mutateState(old=>{
    if(old.game!=='snakes'||old.phase!=='playing'||old.snakes?.turn!==role)return;
    const g=old.snakes,m=g.move;if(g.phase!=='moving'||!m||m.id!==moveId||m.player!==role)return;
    const positions={...g.positions,[role]:m.destination},finished=m.destination>=BOARD_FINAL_CELL,scores={...old.scores};
    if(finished)scores[role]+=5;
    return {...old,scores,feedback:addFeedback(old,finished?'win':'tap'),phase:finished?'finished':'playing',...(finished?{result:role}:{}),snakes:{...g,positions,turn:finished?g.turn:other(role),phase:finished?'done':'ready',dice:null,pendingDice:null,move:null,lastRoll:{player:role,dice:m.dice,jump:m.jumpType,landing:m.destination}}};
  });
}
async function colorPart(index){
  if(!Number.isInteger(index)||!COLOR_PALETTE.includes(coloringSelectedColor))return;
  await mutateState(old=>{
    if(old.game!=='coloring'||old.phase!=='playing'||!old.coloring)return;
    const page=COLORING_PAGES[old.coloring.pageIndex%COLORING_PAGES.length];if(index<0||index>=page.parts)return;
    const fills={...(old.coloring.fills||{}),[index]:coloringSelectedColor},finished=Object.keys(fills).length>=page.parts,scores={...old.scores};if(finished)scores[role]+=3;
    return {...old,scores,feedback:addFeedback(old,finished?'win':'tap'),phase:finished?'finished':'playing',...(finished?{result:'complete'}:{}),coloring:{...old.coloring,fills}};
  });
}
async function placePuzzle(piece,slot,source){
  if(!Number.isInteger(piece)||!Number.isInteger(slot))return;
  if(piece!==slot){sound('bad');source?.classList.add('shake');setTimeout(()=>source?.classList.remove('shake'),420);return;}
  puzzleSelectedPiece=null;
  await mutateState(old=>{
    if(old.game!=='jigsaw'||old.phase!=='playing'||!old.jigsaw)return;const g=old.jigsaw,total=g.rows*g.cols;if(piece<0||piece>=total||g.placed?.[piece])return;
    const placed={...(g.placed||{}),[piece]:true},finished=Object.keys(placed).length>=total,scores={...old.scores,[role]:(old.scores?.[role]||0)+1+(finished?2:0)};
    return {...old,scores,feedback:addFeedback(old,finished?'win':'good'),phase:finished?'finished':'playing',...(finished?{result:'complete'}:{}),jigsaw:{...g,placed}};
  });
}
async function chooseSorting(bin,source){
  await mutateState(old=>{
    if(old.game!=='sorting'||old.phase!=='playing'||old.sorting?.turn!==role)return;
    const g=old.sorting,item=g.items?.[g.index];if(!item)return;
    const correct=bin===item.color,scores={...old.scores},roundScores={...g.roundScores};let index=g.index;
    if(correct){scores[role]+=1;roundScores[role]=(roundScores[role]||0)+1;index++;}
    const finished=correct&&index>=g.goal,result=finished?(roundScores.host===roundScores.guest?'draw':roundScores.host>roundScores.guest?'host':'guest'):undefined;
    return {...old,scores,feedback:addFeedback(old,finished?'win':correct?'good':'bad'),phase:finished?'finished':'playing',...(finished?{result}:{}),sorting:{...g,index,turn:other(role),roundScores}};
  });
}
async function choosePhonicsLetter(index){
  if(!Number.isInteger(index)||!state?.phonics?.indices?.includes(index))return;
  const entry=PHONICS_BANK[index];if(entry)speakArabicPhrase(`حَرْفُ ${entry[1]}`);
  await mutateState(old=>old.game==='phonics'&&old.phase==='playing'&&old.phonics?.turn===role&&!old.phonics.matched?.includes(index)?{...old,phonics:{...old.phonics,selected:index}}:undefined);
}
async function choosePhonicsImage(index){
  await mutateState(old=>{
    if(old.game!=='phonics'||old.phase!=='playing'||old.phonics?.turn!==role)return;const g=old.phonics,selected=g.selected;if(!Number.isInteger(selected)||!g.indices?.includes(index)||g.matched?.includes(index))return;
    const correct=selected===index,scores={...old.scores},roundScores={...g.roundScores},matched=[...(g.matched||[])];if(correct){matched.push(index);scores[role]+=1;roundScores[role]=(roundScores[role]||0)+1;}
    const finished=correct&&matched.length>=g.indices.length,result=finished?(roundScores.host===roundScores.guest?'draw':roundScores.host>roundScores.guest?'host':'guest'):undefined;
    return {...old,scores,feedback:addFeedback(old,finished?'win':correct?'good':'bad'),phase:finished?'finished':'playing',...(finished?{result}:{}),phonics:{...g,matched,selected:null,turn:other(role),roundScores}};
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
    const finished=nextStage===(t.goal||4);
    const result=finished?(roundScores.host===roundScores.guest?'draw':roundScores.host>roundScores.guest?'host':'guest'):undefined;
    return {...old,scores,feedback:addFeedback(old,finished?'win':correct?'good':'bad'),
      phase:finished?'finished':'playing',...(finished?{result}:{}),
      treasure:{...t,stage:nextStage,turn:other(role),roundScores,wrong:correct?[]:[...(t.wrong||[]),index],
        question:correct&&!finished?newQuestion('treasure',q.index,old.childAge):q}};
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
  unsubs=[];presenceBound=false;meta=null;state=null;presence={};strokes={};role='';lastAudioFeedback=null;snakeRollVisualKey='';snakeMoveVisualKey='';if(snakeRollVisualTimer){clearInterval(snakeRollVisualTimer);snakeRollVisualTimer=null;}
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
  unsubs.push(onValue(ref(db,`${base}/state`),snap=>{const oldState=state;state=snap.val();feedbackSignal(oldState,state);maybeWelcomeOnSync(oldState,state);render();},e=>info(humanError(e))));
  unsubs.push(onValue(ref(db,`${base}/strokes`),snap=>{strokes=snap.val()||{};redrawCanvas();},e=>info(humanError(e))));
  unsubs.push(onValue(ref(db,`${base}/presence`),snap=>{presence=snap.val()||{};render();},e=>info(humanError(e))));
}
async function createRoom() {
  if (!uid || !db) return;
  info('');
  try {
    const code=randomCode();
    agePreference=normalizeAge($('#child-age-home')?.value??agePreference);
    const enteredName=normalizeChildName($('#child-name-home')?.value);
    if (!enteredName) {info('اكتب اسمًا أول أو اسمًا مستعارًا من حروف فقط، بحد أقصى 24 حرفًا.');return;}
    childNamePreference=enteredName;
    try {localStorage.setItem('roqaya-child-name',enteredName);} catch (_) {}
    await set(ref(db,`rooms/${code}/meta`),{hostUid:uid,createdAt:serverTimestamp()});
    await set(ref(db,`rooms/${code}/state`),{game:'lobby',phase:'lobby',scores:{host:0,guest:0},round:0,childAge:agePreference,childName:enteredName,metrics:{v:1,days:{}}});
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
    if (current.guestUid) {info(`الغرفة مكتملة؛ فيها بابا و${childName()} بالفعل.`);return;}
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
  try { await navigator.clipboard.writeText(link);info(`اتنسخ رابط الدعوة! ابعته لـ${childName()} بشكل خاص 💌`); }
  catch(e) { info(`انسخ الكود وابعت الرابط من شريط العنوان: ${roomCode}`); }
}
screen.addEventListener('click',e=>{if(e.target.closest('button:not(:disabled)'))sound('tap');},true);
screen.addEventListener('input',e=>{
  if(e.target?.id!=='child-name-home') return;
  const candidate=normalizeChildName(e.target.value);
  if (candidate) { childNamePreference=candidate; personalizeUi(); }
});
screen.addEventListener('change',async e=>{
  if(e.target?.id==='child-name-home') {
    const candidate=normalizeChildName(e.target.value);
    if(!candidate){info('اكتب اسمًا أول أو اسمًا مستعارًا من حروف فقط، بحد أقصى 24 حرفًا.');return;}
    childNamePreference=candidate;
    try{localStorage.setItem('roqaya-child-name',candidate);}catch(_){}
    info('');personalizeUi();return;
  }
  if(e.target?.id==='child-name-lobby' && role==='host' && state?.game==='lobby') {
    const candidate=normalizeChildName(e.target.value);
    if(!candidate){info('اكتب اسمًا أول أو اسمًا مستعارًا من حروف فقط، بحد أقصى 24 حرفًا.');return;}
    if(candidate===childName()) return;
    const result=await mutateState(old=>old.game==='lobby'?{...old,childName:candidate}:undefined);
    if(result?.committed){childNamePreference=candidate;try{localStorage.setItem('roqaya-child-name',candidate);}catch(_){}info('');sound('tap');}
    else if(result) info('مقدرناش نغيّر الاسم. جرّب مرة تانية.');
    return;
  }
  if(e.target?.id==='child-age-home') {
    agePreference=normalizeAge(e.target.value);
    try{localStorage.setItem('roqaya-child-age',String(agePreference));}catch(_){}
    return;
  }
  if(e.target?.id==='child-age-lobby' && role==='host' && state?.game==='lobby') {
    const age=normalizeAge(e.target.value);
    const result=await mutateState(old=>old.game==='lobby'?{...old,childAge:age}:undefined);
    if(result?.committed){agePreference=age;try{localStorage.setItem('roqaya-child-age',String(age));}catch(_){}sound('tap');}
    else if(result) info('مقدرناش نغيّر العمر. جرّب مرة تانية.');
    return;
  }
});
screen.addEventListener('click',async e=>{
  const part=e.target.closest?.('[data-color-part]');
  if(part&&state?.game==='coloring'&&state.phase==='playing'){e.preventDefault();return colorPart(Number(part.dataset.colorPart));}
});
screen.addEventListener('click',async e=>{
  const button=e.target.closest('button');
  if (!button || button.disabled) return;
  const action=button.dataset.action;
  if (action==='welcome') {
    if(!welcomeToGame(state?.game,state?.childName)) info(soundEnabled?'المتصفح الحالي لا يتيح النطق الصوتي. جرّب فتح اللعبة في Google Chrome.':'شغّل الصوت من الزر العلوي أولًا.');
    return;
  }
  if (action==='create') return createRoom();
  if (action==='join') return joinRoom();
  if (action==='copy') return copyLink();
  if (action==='lobby') return goLobby();
  if (action==='roll-dice') return rollDice();
  if (action==='move-snakes') return startSnakeMove();
  if (action==='reset-coloring'&&role==='host'&&state?.game==='coloring') return mutateState(old=>old.game==='coloring'?{...old,phase:'playing',coloring:{...old.coloring,fills:{}}}:undefined);
  if (action==='next-coloring'&&role==='host'&&state?.game==='coloring') return mutateState(old=>old.game==='coloring'?newGame('coloring',old):undefined);
  if (action==='alphabet-music') {toggleAlphabetMusic();render();return;}
  if (button.dataset.colorPick) {coloringSelectedColor=button.dataset.colorPick;document.querySelectorAll('.palette-color').forEach(x=>x.classList.toggle('selected',x.dataset.colorPick===coloringSelectedColor));return;}
  if (button.dataset.puzzlePiece!==undefined) {puzzleSelectedPiece=Number(button.dataset.puzzlePiece);document.querySelectorAll('.puzzle-piece').forEach(x=>x.classList.toggle('selected',Number(x.dataset.puzzlePiece)===puzzleSelectedPiece));return;}
  if (button.dataset.puzzleSlot!==undefined&&puzzleSelectedPiece!==null) return placePuzzle(puzzleSelectedPiece,Number(button.dataset.puzzleSlot),document.querySelector(`[data-puzzle-piece="${puzzleSelectedPiece}"]`));
  if (button.dataset.sortItem!==undefined) {sortingDragSelected=!sortingDragSelected;button.classList.toggle('selected',sortingDragSelected);return;}
  if (button.dataset.sortBin&&state?.game==='sorting') {sortingDragSelected=false;return chooseSorting(button.dataset.sortBin,document.querySelector('.sorting-item'));}
  if (button.dataset.phonicsLetter!==undefined) return choosePhonicsLetter(Number(button.dataset.phonicsLetter));
  if (button.dataset.phonicsImage!==undefined) return choosePhonicsImage(Number(button.dataset.phonicsImage));
  if (action==='apply-memory-settings') {
    if(role!=='host'||state?.game!=='memory')return;
    const value=document.querySelector('#memory-size-game')?.value||'random';
    memoryPreference=memorySizesForAge(state?.childAge).includes(Number(value))?value:'random';
    try{localStorage.setItem('roqaya-memory',memoryPreference);}catch(_){}
    info('');
    return mutateState(old=>old.game==='memory'?newGame('memory',old):undefined);
  }
  if (action==='apply-number-settings') {
    if(role!=='host'||!['count','math','numberline','compare'].includes(state?.game))return;
    const rawMin=parseTrainingNumber(document.querySelector('#number-min-game')?.value),rawMax=parseTrainingNumber(document.querySelector('#number-max-game')?.value);
    if(!Number.isInteger(rawMin)||!Number.isInteger(rawMax)||rawMin<1||rawMax<1||rawMin>20||rawMax>20){info('اكتب مدى أرقام من ١ إلى ٢٠.');return;}
    if(state.game==='compare'&&Math.abs(rawMax-rawMin)<2){info('في ترتيب ومقارنة الأرقام اختار مدى فيه ٣ أرقام على الأقل، مثل ١ إلى ٣.');return;}
    const cfg=normalizeNumberTraining({min:rawMin,max:rawMax,mode:document.querySelector('#math-mode-game')?.value||mathModePreference});
    numberMinPreference=cfg.min;numberMaxPreference=cfg.max;if(state.game==='math')mathModePreference=cfg.mode;saveNumberTraining();info('');
    const which=state.game;
    return mutateState(old=>old.game===which?newGame(which,old):undefined);
  }
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
  personalizeUi();
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
