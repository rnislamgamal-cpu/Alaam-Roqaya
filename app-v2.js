import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, set, get, onValue, runTransaction, push, remove, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (selector) => document.querySelector(selector);
const screen = $('#screen');
const message = $('#message');
const connection = $('#connection');
function setConn(kind){connection.dataset.s=kind;connection.textContent={wait:'جاري الاتصال',on:'متصل',off:'مقطوع',cfg:'محتاجة إعداد'}[kind]||'';}
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const APP_VERSION = '2.0';
const HUB_GAMES = new Set(['school-gate','corridor','school-arabic-gate','school-math','school-english','school-quran','school-arabic','world-gate']);
const HUB_ASSETS = {
  schoolGate:'assets/school-gate.jpg',
  corridor:'assets/corridor.jpg',
  worldGate:'assets/world-gate.jpg',
  arabic:'assets/arabic.jpg',
  math:'assets/math.jpg',
  english:'assets/english.jpg',
  quran:'assets/quran.jpg'
};
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
  jigsaw:['🧩','البازل','٤ / ١٠ / ٢٠ / ٥٠ قطعة • لكل لاعب بازل مستقل'],
  sorting:['🧺','فرز الألوان والأشكال','اسحبي كل عنصر للصندوق المناسب'],
  phonics:['🔤','الحروف والصور','وصّلي الحرف بالصورة التي تبدأ به']
};

const BOARD_FINAL_CELL = 100;
const SNAKES = {98:78,94:71,87:66,64:45,55:34,48:27,35:14};
const LADDERS = {4:25,13:46,33:49,42:63,50:69,62:81,74:92};
const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
const COLOR_PALETTE = ['#ef5350','#42a5f5','#fdd835','#66bb6a','#ec6fa9','#ff9800','#8e6bd8','#26c6da'];
const COLORING_PAGES = [
  {id:'sun-face',name:'الشمس المرِحة',src:'assets/coloring/sun-face.webp',level:'سهل'},
  {id:'flower',name:'الزهرة المرِحة',src:'assets/coloring/flower.webp',level:'سهل'},
  {id:'butterfly-simple',name:'الفراشة',src:'assets/coloring/butterfly-simple.webp',level:'سهل'},
  {id:'sun-flowers',name:'الشمس والزهور',src:'assets/coloring/sun-flowers.webp',level:'سهل'},
  {id:'teddy-balloon',name:'الدبدوب والبالونة',src:'assets/coloring/teddy-balloon.webp',level:'متوسط'},
  {id:'fish-line',name:'السمكة تحت البحر',src:'assets/coloring/fish-line.webp',level:'متوسط'},
  {id:'unicorn-line',name:'اليونيكورن',src:'assets/coloring/unicorn-line.webp',level:'متوسط'},
  {id:'butterfly-flowers',name:'الفراشة والزهور',src:'assets/coloring/butterfly-flowers.webp',level:'متوسط'},
  {id:'rabbit-garden',name:'الأرنب في الحديقة',src:'assets/coloring/rabbit-garden.webp',level:'متوسط'},
  {id:'house-garden',name:'البيت والحديقة',src:'assets/coloring/house-garden.webp',level:'صعب'},
  {id:'princess-castle-line',name:'الأميرة والقلعة',src:'assets/coloring/princess-castle-line.webp',level:'صعب'},
  {id:'princess-unicorn-detail',name:'الأميرة واليونيكورن',src:'assets/coloring/princess-unicorn-detail.webp',level:'خبير'},
  {id:'fairy-garden-detail',name:'الجنية والحديقة',src:'assets/coloring/fairy-garden-detail.webp',level:'خبير'}
];
const PUZZLE_PICTURES=[
  {id:'farm',name:'المزرعة المرِحة',src:'assets/puzzles/farm.webp'},
  {id:'dinosaurs',name:'عالم الديناصورات',src:'assets/puzzles/dinosaurs.webp'},
  {id:'unicorn',name:'يونيكورن قوس قزح',src:'assets/puzzles/unicorn.webp'},
  {id:'ocean',name:'عالم البحر',src:'assets/puzzles/ocean.webp'},
  {id:'candy',name:'أرض الحلوى',src:'assets/puzzles/candy.webp'},
  {id:'school-bus',name:'باص المدرسة',src:'assets/puzzles/school-bus.webp'},
  {id:'teddy-picnic',name:'نزهة الدبدوب',src:'assets/puzzles/teddy-picnic.webp'},
  {id:'princess',name:'الأميرة والقلعة',src:'assets/puzzles/princess.webp'},
  {id:'jungle',name:'حيوانات الغابة',src:'assets/puzzles/jungle.webp'},
  {id:'space',name:'رحلة الفضاء',src:'assets/puzzles/space.webp'}
];
const PUZZLE_LEVELS=[4,10,20,50];
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
  if(q?.visual==='odd-hard'){const [base,variant]=String(option).split('::');const art=artPicture(base);return `<span class="odd-detail-card ${variant?'odd-'+variant:''}">${art}${variant?'<i aria-hidden="true"></i>':''}</span>`;}
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
    const n=pick(PICTURE_IDS.length*5);
    const base=PICTURE_IDS[n%PICTURE_IDS.length];
    const variant=age<=5?'dot':age<=7?'micro':'micro2';
    const odd=`${base}::${variant}`;
    const options=shuffle([base,base,base,odd]);
    return {index:n,prompt:age>=8?'ركّزي في أدق تفصيلة… مين المختلف؟':'اختاري الصورة المختلفة',visual:'odd-hard',optionVisual:'odd-hard',options,correct:options.indexOf(odd)};
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
    const limit=Math.max(1,Math.min(ENGLISH_BANK.length,Number(englishWordLimitPreference)||20));
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
    return {index:start*10+step,prompt:`ما الرقم الناقص؟ (من ${rangeMin} إلى ${rangeMax})`,display:`<span class="math-equation" dir="rtl">${start} ← ❓ ← ${start+step*2}</span>`,options,correct:options.indexOf(String(missing))};
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
  return {index:a*100+b+(subtract?10000:0),prompt:doubles?'كم ناتج جمع العددين المتماثلين؟':subtract?'كم ناتج الطرح؟':'كم ناتج الجمع؟',display:`<span class="math-equation" dir="rtl">${first} ${subtract?'−':'+'} ${second} = ❓</span>`,options,correct:options.indexOf(String(result))};
}
let memoryPreference = 'random';
let agePreference = 6;
let childNamePreference = 'رقية';
let numberMinPreference = 1;
let numberMaxPreference = 10;
let mathModePreference = 'addition';
let englishWordLimitPreference = 20;
let puzzlePiecePreference = 10;
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
function normalizeEnglishLimit(value){const n=Number(value);const steps=[10,20,30,40,50,75,100,ENGLISH_BANK.length];return steps.find(x=>x>=n)||ENGLISH_BANK.length;}
function saveEnglishLimit(){try{localStorage.setItem('roqaya-english-limit',String(englishWordLimitPreference));}catch(_){}}
function normalizePuzzlePieces(value){const n=Number(value);return PUZZLE_LEVELS.includes(n)?n:10;}
function savePuzzlePieces(){try{localStorage.setItem('roqaya-puzzle-pieces',String(puzzlePiecePreference));}catch(_){}}
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
  document.title=`مدرسة وعالم ${childName()} 👑`;
}
new MutationObserver(personalizeUi).observe(document.querySelector('.shell'),{childList:true,subtree:true});
let soundEnabled = true;
let audioContext = null;
let lastAudioFeedback = null;
try { soundEnabled = localStorage.getItem('roqaya-sound') !== 'off'; memoryPreference = localStorage.getItem('roqaya-memory') || 'random'; agePreference=normalizeAge(localStorage.getItem('roqaya-child-age')); childNamePreference=normalizeChildName(localStorage.getItem('roqaya-child-name'))||'رقية'; const savedTraining=normalizeNumberTraining({min:localStorage.getItem('roqaya-number-min')??1,max:localStorage.getItem('roqaya-number-max')??10,mode:localStorage.getItem('roqaya-math-mode')||'addition'}); numberMinPreference=savedTraining.min;numberMaxPreference=savedTraining.max;mathModePreference=savedTraining.mode; englishWordLimitPreference=normalizeEnglishLimit(localStorage.getItem('roqaya-english-limit')||20); puzzlePiecePreference=normalizePuzzlePieces(localStorage.getItem('roqaya-puzzle-pieces')||10); } catch (_) {}
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
  control.textContent=soundEnabled?'🔊':'🔇';
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
// V20 voice call: ultra-low-bandwidth speech mode for very weak internet,
// Opus DTX/FEC, adaptive bitrate, a larger jitter buffer when supported,
// trickle ICE, auto-reconnect, and an optional push-to-talk rescue mode.
const VOICE_RTC_CONFIG={
  iceServers:[
    {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302','stun:stun3.l.google.com:19302','stun:stun4.l.google.com:19302']}
  ],
  iceCandidatePoolSize:2,
  bundlePolicy:'max-bundle',
  rtcpMuxPolicy:'require'
};
let voicePeer=null,voiceLocalStream=null,voiceRemoteStream=null,voiceCallId='',voiceCallMode='idle';
let voiceMicMuted=false,voiceSpeakerMuted=false,voiceRingTimer=null,voiceRingCallId='';
let voiceSyncChain=Promise.resolve(),voiceCandidateFlushBusy=false,voiceCandidateSeq=0;
let voicePendingCandidates=[],voiceSeenRemoteCandidates=new Set(),voiceIceGeneration=0,voiceRemoteDescriptionGeneration=-1;
let voiceReconnectTimer=null,voiceRestartInFlight=false,voiceLastReconnectRequest=0;
let voiceStatsTimer=null,voiceUiTimer=null,voiceQuality='idle',voiceWakeLock=null;
let voiceCurrentBitrate=12000,voicePushToTalk=false,voicePttTalking=false;
let voiceAudioDevices=[],voiceSelectedInputId='',voiceSelectedOutputId='',voiceDevicePanelOpen=false;
let voiceDeviceRefreshBusy=false;

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

function voiceCallSupported(){return Boolean(window.RTCPeerConnection&&navigator.mediaDevices?.getUserMedia);}
function remoteAudioElement(){return document.querySelector('#remote-audio');}
function voiceCallError(error){
  const name=error?.name||'';
  if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'لازم تسمح للعبة باستخدام الميكروفون عشان المكالمة تشتغل.';
  if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'مش لاقي ميكروفون متاح على الجهاز.';
  if(name==='NotReadableError'||name==='TrackStartError')return 'الميكروفون مستخدم في تطبيق تاني أو مش متاح دلوقتي.';
  return 'تعذر تشغيل المكالمة الصوتية. جرّب تاني.';
}
function voiceCallTone(kind='ring'){
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    audioContext ||= new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const seq=kind==='connected'?[[660,0,.08],[880,.1,.12]]:kind==='ended'?[[440,0,.08],[330,.1,.12]]:[[740,0,.12],[920,.17,.12]];
    const t=audioContext.currentTime;
    for(const [freq,delay,duration] of seq){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t+delay);g.gain.exponentialRampToValueAtTime(.04,t+delay+.015);g.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);o.connect(g).connect(audioContext.destination);o.start(t+delay);o.stop(t+delay+duration+.02);}
  }catch(_){}
}
function startIncomingVoiceRing(callId){
  if(voiceRingCallId===callId&&voiceRingTimer)return;
  stopIncomingVoiceRing();voiceRingCallId=callId;
  const ring=()=>{voiceCallTone('ring');try{navigator.vibrate?.([100,70,100]);}catch(_){}};
  ring();voiceRingTimer=setInterval(ring,2600);
}
function stopIncomingVoiceRing(){if(voiceRingTimer){clearInterval(voiceRingTimer);voiceRingTimer=null;}voiceRingCallId='';}
function voiceDuration(start){
  if(!start)return '00:00';const sec=Math.max(0,Math.floor((Date.now()-start)/1000)),m=Math.floor(sec/60),s=sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
async function acquireVoiceWakeLock(){
  if(!('wakeLock'in navigator)||voiceWakeLock)return;
  try{voiceWakeLock=await navigator.wakeLock.request('screen');voiceWakeLock.addEventListener?.('release',()=>{voiceWakeLock=null;});}catch(_){}
}
async function releaseVoiceWakeLock(){if(voiceWakeLock){try{await voiceWakeLock.release();}catch(_){}voiceWakeLock=null;}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state?.call&&voiceCallMode!=='idle')acquireVoiceWakeLock();});
function stopVoiceLocalTracks(){
  if(voiceLocalStream){for(const track of voiceLocalStream.getTracks())try{track.stop();}catch(_){} voiceLocalStream=null;}
}
function stopVoiceTimers(){
  if(voiceReconnectTimer){clearTimeout(voiceReconnectTimer);voiceReconnectTimer=null;}
  if(voiceStatsTimer){clearInterval(voiceStatsTimer);voiceStatsTimer=null;}
  if(voiceUiTimer){clearInterval(voiceUiTimer);voiceUiTimer=null;}
}
function cleanupVoicePeer({stopLocal=true}={}){
  stopIncomingVoiceRing();stopVoiceTimers();releaseVoiceWakeLock();
  if(voicePeer){try{voicePeer.ontrack=null;voicePeer.onconnectionstatechange=null;voicePeer.oniceconnectionstatechange=null;voicePeer.onicecandidate=null;voicePeer.close();}catch(_){} voicePeer=null;}
  voiceRemoteStream=null;
  const audio=remoteAudioElement();if(audio){try{audio.pause();}catch(_){}audio.srcObject=null;audio.muted=false;}
  if(stopLocal)stopVoiceLocalTracks();
  voiceCallId='';voiceCallMode='idle';voiceMicMuted=false;voiceSpeakerMuted=false;voiceQuality='idle';
  voicePendingCandidates=[];voiceSeenRemoteCandidates.clear();voiceIceGeneration=0;voiceRemoteDescriptionGeneration=-1;
  voiceCandidateFlushBusy=false;voiceRestartInFlight=false;voiceLastReconnectRequest=0;
  voiceCurrentBitrate=12000;voicePushToTalk=false;voicePttTalking=false;voiceDevicePanelOpen=false;
}
function optimizeVoiceSdp(description,bitrate=12000){
  if(!description?.sdp)return description;
  let sdp=description.sdp;
  const match=sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i);
  if(!match)return description;
  const pt=match[1];
  const wanted={minptime:'20',useinbandfec:'1',usedtx:'1',stereo:'0','sprop-stereo':'0',maxaveragebitrate:String(Math.max(8000,Math.min(16000,bitrate))),maxplaybackrate:'16000','sprop-maxcapturerate':'16000'};
  const fmtpRx=new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`,'i');
  const found=sdp.match(fmtpRx);
  const params={};
  if(found){for(const item of found[1].split(';')){const [k,v]=item.trim().split('=');if(k)params[k]=v??'';}}
  Object.assign(params,wanted);
  const fmtp=`a=fmtp:${pt} `+Object.entries(params).map(([k,v])=>v===''?k:`${k}=${v}`).join(';');
  if(found)sdp=sdp.replace(fmtpRx,fmtp);else sdp=sdp.replace(new RegExp(`(a=rtpmap:${pt} opus\\/48000\\/2[^\\r\\n]*\\r?\\n)`,'i'),`$1${fmtp}\\r\\n`);
  // 40 ms packets reduce protocol overhead while keeping speech latency reasonable.
  const audioStart=sdp.indexOf('m=audio ');if(audioStart>=0){const next=sdp.indexOf('\nm=',audioStart+1),end=next>=0?next:sdp.length;let audio=sdp.slice(audioStart,end);audio=audio.replace(/a=ptime:\d+\r?\n/i,'');audio+='a=ptime:40\r\n';sdp=sdp.slice(0,audioStart)+audio+sdp.slice(end);}
  return {type:description.type,sdp};
}
async function applyVoiceBitrate(bps){
  const target=Math.max(8000,Math.min(16000,Number(bps)||12000));
  if(!voicePeer||voiceCurrentBitrate===target)return;voiceCurrentBitrate=target;
  const senders=voicePeer.getSenders?.().filter(x=>x.track?.kind==='audio')||[];
  for(const sender of senders){
    try{const p=sender.getParameters();p.encodings=p.encodings?.length?p.encodings:[{}];p.encodings[0].maxBitrate=target;p.encodings[0].priority='high';p.encodings[0].networkPriority='high';await sender.setParameters(p);}catch(_){}
  }
}
function configureVoiceReceiver(receiver){
  if(!receiver)return;
  try{if('jitterBufferTarget'in receiver)receiver.jitterBufferTarget=350;}catch(_){}
  try{if('playoutDelayHint'in receiver)receiver.playoutDelayHint=.30;}catch(_){}
}
function voiceDeviceLabel(device,index){
  const kind=device.kind==='audioinput'?'مايك':'سماعة';
  if(device.label)return device.label;
  return `${kind} ${index+1}`;
}
function voiceDeviceIcon(device){
  const label=(device.label||'').toLowerCase();
  if(/bluetooth|buds|airpods|headset|headphone|galaxy buds|freebuds|tws/.test(label))return '🎧';
  if(device.kind==='audioinput')return '🎙️';
  return '🔊';
}
async function refreshVoiceAudioDevices(){
  if(voiceDeviceRefreshBusy||!navigator.mediaDevices?.enumerateDevices)return voiceAudioDevices;
  voiceDeviceRefreshBusy=true;
  try{
    // Labels are normally hidden until microphone permission has been granted.
    if(!voiceLocalStream){
      try{
        const probe=await navigator.mediaDevices.getUserMedia({video:false,audio:true});
        for(const t of probe.getTracks())t.stop();
      }catch(_){}
    }
    voiceAudioDevices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'||d.kind==='audiooutput');
    const inputs=voiceAudioDevices.filter(d=>d.kind==='audioinput'),outputs=voiceAudioDevices.filter(d=>d.kind==='audiooutput');
    if(voiceSelectedInputId&&!inputs.some(d=>d.deviceId===voiceSelectedInputId))voiceSelectedInputId='';
    if(voiceSelectedOutputId&&!outputs.some(d=>d.deviceId===voiceSelectedOutputId))voiceSelectedOutputId='';
    return voiceAudioDevices;
  }catch(error){console.warn('voice devices',error);return voiceAudioDevices;}
  finally{voiceDeviceRefreshBusy=false;}
}
function voiceAudioConstraint(deviceId=''){
  return {
    echoCancellation:true,noiseSuppression:true,autoGainControl:true,
    channelCount:{ideal:1},sampleRate:{ideal:16000},sampleSize:{ideal:16},
    ...(deviceId?{deviceId:{exact:deviceId}}:{})
  };
}
async function switchVoiceInput(deviceId){
  if(!deviceId||deviceId===voiceSelectedInputId)return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:false,audio:voiceAudioConstraint(deviceId)});
    const newTrack=stream.getAudioTracks()[0];if(!newTrack)throw new Error('no-audio-track');
    if(voicePeer){
      const sender=voicePeer.getSenders?.().find(s=>s.track?.kind==='audio');
      if(sender){await sender.replaceTrack(newTrack);await tuneVoiceSender(sender);}
    }
    const old=voiceLocalStream;
    voiceLocalStream=new MediaStream([newTrack]);voiceSelectedInputId=deviceId;
    newTrack.enabled=voicePushToTalk?(voicePttTalking&&!voiceMicMuted):!voiceMicMuted;
    if(old){for(const track of old.getTracks())if(track!==newTrack)try{track.stop();}catch(_){}}
    await refreshVoiceAudioDevices();renderVoiceCallControls();info('✅ تم تغيير الميكروفون');
  }catch(error){console.warn('switch voice input',error);info('مش قادر أغيّر الميكروفون. تأكد إن البلوتوث متصل واسمح للمتصفح باستخدام الميكروفون.');}
}
async function switchVoiceOutput(deviceId){
  const audio=remoteAudioElement();if(!audio)return;
  try{
    if(typeof audio.setSinkId!=='function'){
      info('المتصفح على الموبايل هو اللي بيسلّم اختيار السماعة للنظام. اختار البلوتوث من لوحة الصوت في الهاتف.');
      return;
    }
    await audio.setSinkId(deviceId||'default');voiceSelectedOutputId=deviceId||'default';
    if(audio.srcObject&&!voiceSpeakerMuted)audio.play().catch(()=>{});
    renderVoiceCallControls();info('✅ تم تغيير مخرج الصوت');
  }catch(error){console.warn('switch voice output',error);info('تعذر تحويل الصوت للسماعة دي. جرّب توصيل البلوتوث قبل بدء المكالمة.');}
}
function voiceOutputRoutingSupported(){
  const audio=remoteAudioElement();return Boolean(audio&&typeof audio.setSinkId==='function');
}
function voiceDevicePanel(){
  if(!voiceDevicePanelOpen)return '';
  const inputs=voiceAudioDevices.filter(d=>d.kind==='audioinput');
  const outputs=voiceAudioDevices.filter(d=>d.kind==='audiooutput');
  const inputOptions=['<option value="">🎙️ تلقائي / ميكروفون الهاتف</option>',...inputs.map((d,i)=>`<option value="${d.deviceId}" ${voiceSelectedInputId===d.deviceId?'selected':''}>${voiceDeviceIcon(d)} ${voiceDeviceLabel(d,i)}</option>`)].join('');
  const outputOptions=['<option value="default">🔊 تلقائي / صوت الهاتف</option>',...outputs.map((d,i)=>`<option value="${d.deviceId}" ${voiceSelectedOutputId===d.deviceId?'selected':''}>${voiceDeviceIcon(d)} ${voiceDeviceLabel(d,i)}</option>`)].join('');
  const outputControl=voiceOutputRoutingSupported()
    ? `<label>الصوت الخارج<select class="call-device-select" data-call-device="output">${outputOptions}</select></label>`
    : `<div class="call-device-fallback"><span>🔊 مخرج الصوت</span><small>غيّره من لوحة الصوت أو البلوتوث في الهاتف؛ المتصفح الحالي لا يدعم تحويله مباشرة.</small></div>`;
  return `<button class="call-device-backdrop" data-call-action="devices-close" aria-label="إغلاق قائمة أجهزة المكالمة"></button><div class="call-device-panel" role="dialog" aria-modal="true" aria-label="أجهزة المكالمة">
    <div class="call-device-head"><strong>🎧 أجهزة المكالمة</strong><div><button class="call-device-refresh" data-call-action="devices-refresh" aria-label="تحديث الأجهزة">↻</button><button class="call-device-close" data-call-action="devices-close" aria-label="إغلاق">✕</button></div></div>
    <label>الميكروفون<select class="call-device-select" data-call-device="input">${inputOptions}</select></label>
    ${outputControl}
    <small class="call-device-note">لو سماعة البلوتوث متصلة وظهرت في القائمة اختارها هنا. التغيير يتطبق فورًا.</small>
  </div>`;
}
async function ensureVoiceLocalStream(){
  if(voiceLocalStream?.getAudioTracks().some(t=>t.readyState==='live'))return voiceLocalStream;
  voiceLocalStream=await navigator.mediaDevices.getUserMedia({
    video:false,
    audio:voiceAudioConstraint(voiceSelectedInputId)
  });
  const track=voiceLocalStream.getAudioTracks()[0];
  if(track?.getSettings?.().deviceId)voiceSelectedInputId=track.getSettings().deviceId;
  voiceMicMuted=false;
  refreshVoiceAudioDevices().then(()=>renderVoiceCallControls());
  return voiceLocalStream;
}
function attachVoiceRemoteStream(stream){
  voiceRemoteStream=stream;const audio=remoteAudioElement();if(!audio)return;
  audio.srcObject=stream;audio.muted=voiceSpeakerMuted;audio.volume=1;
  if(voiceSelectedOutputId&&typeof audio.setSinkId==='function')audio.setSinkId(voiceSelectedOutputId).catch(()=>{});
  const play=()=>audio.play().catch(()=>{});play();setTimeout(play,250);setTimeout(play,1000);
}
async function tuneVoiceSender(sender){
  if(!sender)return;
  try{const p=sender.getParameters();p.encodings=p.encodings?.length?p.encodings:[{}];p.encodings[0].maxBitrate=12000;p.encodings[0].priority='high';p.encodings[0].networkPriority='high';await sender.setParameters(p);voiceCurrentBitrate=12000;}catch(_){}
}
function queueVoiceCandidate(candidate,generation=voiceIceGeneration){
  if(!candidate)return;
  const json=candidate.toJSON?candidate.toJSON():{candidate:candidate.candidate,sdpMid:candidate.sdpMid,sdpMLineIndex:candidate.sdpMLineIndex,usernameFragment:candidate.usernameFragment};
  voicePendingCandidates.push({key:`${generation}-${role}-${Date.now()}-${++voiceCandidateSeq}`,generation,candidate:json});
  flushVoiceCandidates();
}
async function publishVoiceCandidate(entry){
  const result=await mutateState(old=>{
    if(!old.call||old.call.id!==voiceCallId||Number(old.call.generation||0)!==Number(entry.generation))return;
    const candidates={...(old.call.candidates||{})};
    const mine={...(candidates[role]||{})};mine[entry.key]={generation:entry.generation,...entry.candidate};candidates[role]=mine;
    return {...old,call:{...old.call,candidates}};
  });
  return Boolean(result?.committed);
}
async function flushVoiceCandidates(){
  if(voiceCandidateFlushBusy||!voicePendingCandidates.length||!state?.call||state.call.id!==voiceCallId)return;
  voiceCandidateFlushBusy=true;
  try{
    let guard=0;
    while(voicePendingCandidates.length&&guard++<30){
      const entry=voicePendingCandidates[0];
      if(Number(state?.call?.generation||0)!==Number(entry.generation))break;
      const ok=await publishVoiceCandidate(entry);if(!ok)break;voicePendingCandidates.shift();
    }
  }finally{voiceCandidateFlushBusy=false;}
}
async function addRemoteVoiceCandidates(call){
  if(!voicePeer||!voicePeer.remoteDescription||!call||call.id!==voiceCallId)return;
  const generation=Number(call.generation||0),remoteRole=other(role),items=call.candidates?.[remoteRole]||{};
  for(const [key,value] of Object.entries(items)){
    if(voiceSeenRemoteCandidates.has(key)||Number(value?.generation||0)!==generation)continue;
    try{await voicePeer.addIceCandidate(new RTCIceCandidate({candidate:value.candidate,sdpMid:value.sdpMid??null,sdpMLineIndex:value.sdpMLineIndex??null,usernameFragment:value.usernameFragment??undefined}));voiceSeenRemoteCandidates.add(key);}catch(error){console.warn('voice ICE candidate',error);}
  }
}
function voiceSdp(desc){return desc?{type:desc.type,sdp:desc.sdp}:null;}
function scheduleVoiceReconnect(delay=3500){
  if(voiceReconnectTimer||!state?.call)return;
  voiceReconnectTimer=setTimeout(()=>{voiceReconnectTimer=null;if(state?.call&&voicePeer?.connectionState!=='connected')requestVoiceReconnect();},delay);
}
async function requestVoiceReconnect(){
  const call=state?.call;if(!call||!voiceCallId||call.id!==voiceCallId)return;
  voiceCallMode='reconnecting';voiceQuality='offline';renderVoiceCallControls();
  if(call.caller===role)return restartVoiceIce();
  const stamp=Date.now();voiceLastReconnectRequest=stamp;
  await mutateState(old=>old.call?.id===call.id?{...old,call:{...old.call,status:'reconnecting',reconnectRequestAt:stamp}}:undefined);
}
async function restartVoiceIce(){
  const call=state?.call;if(!call||call.id!==voiceCallId||call.caller!==role||!voicePeer||voiceRestartInFlight)return;
  voiceRestartInFlight=true;
  try{
    const generation=Number(call.generation||0)+1;voiceIceGeneration=generation;voiceRemoteDescriptionGeneration=-1;voiceSeenRemoteCandidates.clear();voicePendingCandidates=[];
    try{voicePeer.restartIce?.();}catch(_){}
    const offer=optimizeVoiceSdp(await voicePeer.createOffer({iceRestart:true}),voiceCurrentBitrate);await voicePeer.setLocalDescription(offer);
    const result=await mutateState(old=>{
      if(old.call?.id!==call.id)return;
      return {...old,call:{...old.call,status:'reconnecting',offer:voiceSdp(voicePeer.localDescription),answer:null,generation,candidates:{host:{},guest:{}},restartAt:Date.now()}};
    });
    if(!result?.committed)throw new Error('restart-not-committed');
    await flushVoiceCandidates();
  }catch(error){console.warn('voice ICE restart',error);scheduleVoiceReconnect(5000);}
  finally{voiceRestartInFlight=false;renderVoiceCallControls();}
}
async function createVoicePeer(callId,generation=0){
  if(voicePeer&&voiceCallId===callId)return voicePeer;
  if(voicePeer)cleanupVoicePeer({stopLocal:false});
  const local=await ensureVoiceLocalStream();
  const pc=new RTCPeerConnection(VOICE_RTC_CONFIG);voicePeer=pc;voiceCallId=callId;voiceCallMode='connecting';voiceQuality='connecting';voiceIceGeneration=Number(generation||0);
  for(const track of local.getTracks()){const sender=pc.addTrack(track,local);tuneVoiceSender(sender);}
  pc.ontrack=e=>{configureVoiceReceiver(e.receiver);attachVoiceRemoteStream(e.streams?.[0]||new MediaStream([e.track]));};
  pc.onicecandidate=e=>{if(e.candidate)queueVoiceCandidate(e.candidate,voiceIceGeneration);};
  const update=()=>{
    if(pc!==voicePeer)return;const status=pc.connectionState,ice=pc.iceConnectionState;
    if(status==='connected'||ice==='connected'||ice==='completed'){
      const wasConnected=voiceCallMode==='connected';voiceCallMode='connected';voiceQuality=voiceQuality==='poor'?'poor':'good';
      if(voiceReconnectTimer){clearTimeout(voiceReconnectTimer);voiceReconnectTimer=null;}stopIncomingVoiceRing();acquireVoiceWakeLock();startVoiceHealthMonitor();if(!wasConnected)voiceCallTone('connected');
    }else if(status==='failed'||ice==='failed'){
      voiceCallMode='reconnecting';voiceQuality='offline';scheduleVoiceReconnect(900);
    }else if(status==='disconnected'||ice==='disconnected'){
      voiceCallMode='reconnecting';voiceQuality='offline';scheduleVoiceReconnect(3500);
    }else if(status==='connecting'||status==='new'||ice==='checking'||ice==='new'){
      voiceCallMode='connecting';voiceQuality='connecting';
    }
    renderVoiceCallControls();
  };
  pc.onconnectionstatechange=update;pc.oniceconnectionstatechange=update;
  acquireVoiceWakeLock();ensureVoiceUiTicker();return pc;
}
async function updateVoiceQuality(){
  if(!voicePeer||voicePeer.connectionState!=='connected'){if(voiceCallMode==='reconnecting')voiceQuality='offline';return renderVoiceCallControls();}
  try{
    const stats=await voicePeer.getStats();let inbound=null,pair=null;
    stats.forEach(r=>{if(r.type==='inbound-rtp'&&r.kind==='audio'&&!r.isRemote)inbound=r;if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated)pair=r;});
    const received=Number(inbound?.packetsReceived||0),lost=Number(inbound?.packetsLost||0),loss=received+lost>0?lost/(received+lost):0,jitter=Number(inbound?.jitter||0),rtt=Number(pair?.currentRoundTripTime||0);
    voiceQuality=loss>.12||jitter>.12||rtt>.9?'poor':loss>.04||jitter>.065||rtt>.45?'fair':'good';
    applyVoiceBitrate(voiceQuality==='poor'?8000:voiceQuality==='fair'?10000:14000);
  }catch(_){voiceQuality='good';}
  renderVoiceCallControls();
}
function startVoiceHealthMonitor(){if(!voiceStatsTimer){updateVoiceQuality();voiceStatsTimer=setInterval(updateVoiceQuality,4000);}}
function ensureVoiceUiTicker(){if(!voiceUiTimer)voiceUiTimer=setInterval(()=>{if(state?.call)renderVoiceCallControls();else{clearInterval(voiceUiTimer);voiceUiTimer=null;}},1000);}
async function startVoiceCall(){
  if(!voiceCallSupported()){info('المتصفح الحالي لا يدعم المكالمات الصوتية داخل اللعبة. جرّب Google Chrome.');return;}
  if(!roomCode||!state||!canPlay()){info('المكالمة بتشتغل بعد ما اللاعب الثاني يدخل الغرفة.');return;}
  if(state.call){info('فيه مكالمة حالية بالفعل. انهيها الأول.');return;}
  const callId=`${Date.now()}-${role}-${Math.random().toString(36).slice(2,8)}`;
  try{
    voiceCallMode='outgoing';voiceCallId=callId;voiceIceGeneration=0;voicePendingCandidates=[];voiceSeenRemoteCandidates.clear();renderVoiceCallControls();
    const pc=await createVoicePeer(callId,0),offer=optimizeVoiceSdp(await pc.createOffer({offerToReceiveAudio:true}),12000);
    await pc.setLocalDescription(offer);
    const result=await mutateState(old=>{
      if(old.call)return;
      return {...old,call:{id:callId,status:'ringing',caller:role,offer:voiceSdp(pc.localDescription),generation:0,candidates:{host:{},guest:{}},createdAt:Date.now()}};
    });
    if(!result?.committed){cleanupVoicePeer();info('مقدرناش نبدأ المكالمة. جرّب مرة تانية.');return;}
    ensureVoiceUiTicker();await flushVoiceCandidates();
  }catch(error){cleanupVoicePeer();info(voiceCallError(error));}
  renderVoiceCallControls();
}
async function commitVoiceAnswer(callId,answer,generation){
  for(let attempt=0;attempt<2;attempt++){
    const result=await mutateState(old=>{
      if(old.call?.id!==callId||!['ringing','reconnecting'].includes(old.call.status))return;
      return {...old,call:{...old.call,status:'accepted',answer,acceptedBy:role,acceptedAt:old.call.acceptedAt||Date.now(),generation:Number(generation||0)}};
    });
    if(result?.committed)return true;
    await waitMs(280);
  }
  return false;
}
async function acceptVoiceCall(){
  const call=state?.call;if(!call||call.status!=='ringing'||call.caller===role||!call.offer)return;
  if(!voiceCallSupported()){info('المتصفح الحالي لا يدعم المكالمات الصوتية داخل اللعبة. جرّب Google Chrome.');return;}
  stopIncomingVoiceRing();
  try{
    const generation=Number(call.generation||0);voiceCallId=call.id;voiceCallMode='connecting';voiceIceGeneration=generation;voiceSeenRemoteCandidates.clear();renderVoiceCallControls();
    const pc=await createVoicePeer(call.id,generation);
    await pc.setRemoteDescription(new RTCSessionDescription(call.offer));voiceRemoteDescriptionGeneration=generation;
    await addRemoteVoiceCandidates(call);
    const answer=optimizeVoiceSdp(await pc.createAnswer(),voiceCurrentBitrate);await pc.setLocalDescription(answer);
    const ok=await commitVoiceAnswer(call.id,voiceSdp(pc.localDescription),generation);
    if(!ok){
      const latest=(await get(ref(db,`rooms/${roomCode}/state/call`))).val();
      if(latest?.id!==call.id||latest?.status!=='accepted'){cleanupVoicePeer();info('المكالمة انتهت قبل ما يتم قبولها.');return;}
    }
    ensureVoiceUiTicker();await flushVoiceCandidates();
  }catch(error){cleanupVoicePeer();info(voiceCallError(error));}
  renderVoiceCallControls();
}
async function answerVoiceRestart(call){
  if(!call?.offer||call.caller===role||voiceRestartInFlight)return;
  const generation=Number(call.generation||0);if(generation<=voiceRemoteDescriptionGeneration)return;
  voiceRestartInFlight=true;
  try{
    const pc=await createVoicePeer(call.id,generation);voiceIceGeneration=generation;voicePendingCandidates=[];voiceSeenRemoteCandidates.clear();
    await pc.setRemoteDescription(new RTCSessionDescription(call.offer));voiceRemoteDescriptionGeneration=generation;
    await addRemoteVoiceCandidates(call);
    const answer=optimizeVoiceSdp(await pc.createAnswer(),voiceCurrentBitrate);await pc.setLocalDescription(answer);
    await commitVoiceAnswer(call.id,voiceSdp(pc.localDescription),generation);await flushVoiceCandidates();
  }catch(error){console.warn('voice restart answer',error);scheduleVoiceReconnect(5000);}
  finally{voiceRestartInFlight=false;renderVoiceCallControls();}
}
async function clearSharedVoiceCall(callId){
  if(!callId)return;
  return mutateState(old=>{if(old.call?.id!==callId)return;const next={...old};delete next.call;return next;});
}
async function endVoiceCall(){
  const id=state?.call?.id||voiceCallId;cleanupVoicePeer();voiceCallTone('ended');renderVoiceCallControls();if(id)await clearSharedVoiceCall(id);
}
async function rejectVoiceCall(){const id=state?.call?.id;stopIncomingVoiceRing();cleanupVoicePeer();if(id)await clearSharedVoiceCall(id);renderVoiceCallControls();}
function toggleVoiceMic(){
  if(!voiceLocalStream)return;voiceMicMuted=!voiceMicMuted;for(const track of voiceLocalStream.getAudioTracks())track.enabled=voicePushToTalk?(voicePttTalking&&!voiceMicMuted):!voiceMicMuted;renderVoiceCallControls();
}
function toggleVoiceSpeaker(){
  voiceSpeakerMuted=!voiceSpeakerMuted;const audio=remoteAudioElement();if(audio){audio.muted=voiceSpeakerMuted;if(!voiceSpeakerMuted)audio.play().catch(()=>{});}renderVoiceCallControls();
}
function toggleVoicePushToTalk(){
  voicePushToTalk=!voicePushToTalk;voicePttTalking=false;
  if(voiceLocalStream){for(const track of voiceLocalStream.getAudioTracks())track.enabled=voicePushToTalk?false:!voiceMicMuted;}
  renderVoiceCallControls();
}
function setVoicePttTalking(on){
  if(!voicePushToTalk||!voiceLocalStream)return;voicePttTalking=Boolean(on);
  for(const track of voiceLocalStream.getAudioTracks())track.enabled=voicePttTalking&&!voiceMicMuted;
  const btn=document.querySelector('[data-call-ptt="hold"]');if(btn)btn.classList.toggle('talking',voicePttTalking);
}
async function retryVoiceCall(){voiceCallMode='reconnecting';voiceQuality='offline';renderVoiceCallControls();return requestVoiceReconnect();}
async function syncVoiceCallNow(before,after){
  const previous=before?.call||null,call=after?.call||null;
  if(!call){
    stopIncomingVoiceRing();if(previous&&voiceCallId===previous.id)cleanupVoicePeer();renderVoiceCallControls();return;
  }
  ensureVoiceUiTicker();
  if(call.status==='ringing'&&call.caller!==role)startIncomingVoiceRing(call.id);else stopIncomingVoiceRing();
  if(voiceCallId===call.id&&voicePeer){
    const generation=Number(call.generation||0);
    if(call.caller===role&&call.answer&&generation>voiceRemoteDescriptionGeneration){
      try{await voicePeer.setRemoteDescription(new RTCSessionDescription(call.answer));voiceRemoteDescriptionGeneration=generation;voiceCallMode='connecting';await addRemoteVoiceCandidates(call);}catch(error){console.warn('voice remote answer',error);voiceCallMode='reconnecting';scheduleVoiceReconnect(1800);}
    }else if(call.caller!==role&&call.status==='reconnecting'&&call.offer&&generation>voiceRemoteDescriptionGeneration){
      await answerVoiceRestart(call);
    }else if(voicePeer.remoteDescription){
      await addRemoteVoiceCandidates(call);
    }
    await flushVoiceCandidates();
  }else if(call.status!=='ringing'&&role&&call.id!==voiceCallId){
    // A page reload or Android browser suspension lost the PeerConnection. Ask the original caller to renegotiate instead of silently ending the call.
    voiceCallId=call.id;voiceCallMode='reconnecting';voiceQuality='offline';
    if(call.caller===role){
      try{await createVoicePeer(call.id,Number(call.generation||0));await restartVoiceIce();}catch(error){console.warn('voice resume caller',error);}
    }else{
      requestVoiceReconnect();
    }
  }
  if(call.caller===role&&call.reconnectRequestAt&&Number(call.reconnectRequestAt)>voiceLastReconnectRequest){
    voiceLastReconnectRequest=Number(call.reconnectRequestAt);restartVoiceIce();
  }
  renderVoiceCallControls();
}
function syncVoiceCall(before,after){
  voiceSyncChain=voiceSyncChain.then(()=>syncVoiceCallNow(before,after)).catch(error=>{console.warn('voice sync',error);voiceCallMode='reconnecting';voiceQuality='offline';renderVoiceCallControls();});
  return voiceSyncChain;
}
function callSignalBars(){return `<span class="call-signal ${voiceQuality}" aria-hidden="true"><i></i><i></i><i></i></span>`;}
function callWave(){return '<span class="call-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';}
function renderVoiceCallControls(){
  const box=document.querySelector('#call-controls');if(!box)return;
  const available=Boolean(roomCode&&state&&meta&&canPlay());
  if(!available){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  if(!voiceCallSupported()){box.innerHTML='<div class="call-unsupported">📞</div>';return;}
  const call=state?.call||null;
  if(!call){box.className='call-controls';box.innerHTML='<button class="call-main-btn" data-call-action="start" aria-label="بدء مكالمة صوتية"><span class="call-main-icon">📞</span><span>اتصال</span></button>';return;}
  const callerName=call.caller==='host'?'بابا':childName(),otherName=nameOf(other(role));
  if(call.status==='ringing'&&call.caller!==role){
    box.className='call-controls call-overlay';
    box.innerHTML=`<div class="call-incoming-card"><div class="caller-orbit"><span class="caller-avatar">${call.caller==='host'?'👨':'👧'}</span><i></i><i></i><i></i></div><strong>${callerName}</strong><small>📞 مكالمة صوتية</small><div class="incoming-wave">${callWave()}</div><div class="call-round-actions"><button class="call-round reject" data-call-action="reject" aria-label="رفض المكالمة">✕</button><button class="call-round accept" data-call-action="accept" aria-label="قبول المكالمة">📞</button></div></div>`;return;
  }
  if(call.status==='ringing'&&call.caller===role){
    box.className='call-controls';
    box.innerHTML=`<div class="call-modern-pill ringing"><div class="call-avatar-mini">${other(role)==='host'?'👨':'👧'}</div><div class="call-ring-dots"><i></i><i></i><i></i></div><span class="call-peer-name">${otherName}</span><button class="call-icon-btn end" data-call-action="end" aria-label="إلغاء المكالمة">✕</button></div>`;return;
  }
  const connected=voicePeer?.connectionState==='connected'||voiceCallMode==='connected';
  const reconnecting=!connected&&(voiceCallMode==='reconnecting'||call.status==='reconnecting'||voiceQuality==='offline');
  const statusClass=connected?'live':reconnecting?'reconnecting':'connecting';
  const statusIcon=connected?'●':reconnecting?'↻':'◌';
  const statusLabel=connected?(voiceQuality==='poor'?'الاتصال ضعيف':voiceQuality==='fair'?'الاتصال متوسط':'المكالمة شغالة'):reconnecting?'إعادة الاتصال…':'جاري التوصيل…';
  box.className='call-controls';
  box.innerHTML=`<div class="call-modern-pill ${statusClass} ${voiceQuality} ${voicePushToTalk?'ptt-mode':''}"><div class="call-live-core"><span class="call-state-dot" aria-label="${statusLabel}">${statusIcon}</span>${connected?callWave():''}<span class="call-timer">${voiceDuration(call.acceptedAt)}</span>${callSignalBars()}<span class="call-data-badge" title="وضع توفير البيانات" aria-label="وضع توفير البيانات شغال">📡</span></div><div class="call-icon-tools">${voicePushToTalk?`<button class="call-ptt-talk ${voicePttTalking?'talking':''}" data-call-ptt="hold" aria-label="اضغط واستمر للكلام">🎙️</button>`:`<button class="call-icon-btn ${voiceMicMuted?'off':''}" data-call-action="mic" aria-label="${voiceMicMuted?'تشغيل الميكروفون':'كتم الميكروفون'}">${voiceMicMuted?'🔇':'🎙️'}</button>`}<button class="call-icon-btn ${voicePushToTalk?'on':''}" data-call-action="ptt" aria-label="${voicePushToTalk?'إلغاء وضع اللاسلكي':'تشغيل وضع اللاسلكي للنت الضعيف'}">📻</button><button class="call-icon-btn ${voiceSpeakerMuted?'off':''}" data-call-action="speaker" aria-label="${voiceSpeakerMuted?'تشغيل صوت المكالمة':'كتم صوت المكالمة'}">${voiceSpeakerMuted?'🔈':'🔊'}</button><button class="call-icon-btn ${voiceDevicePanelOpen?'on':''}" data-call-action="devices" aria-label="اختيار الميكروفون والسماعة">🎧</button>${reconnecting?'<button class="call-icon-btn retry" data-call-action="retry" aria-label="إعادة محاولة الاتصال">↻</button>':''}<button class="call-icon-btn end" data-call-action="end" aria-label="إنهاء المكالمة">📵</button></div><span class="call-sr-status">${statusLabel}</span></div>${voiceDevicePanel()}`;
}


let infoDismissTimer=null;
function info(text,delay=2600) { if(infoDismissTimer){clearTimeout(infoDismissTimer);infoDismissTimer=null;} message.hidden = !text; message.textContent = text || ''; if(text&&delay>0)infoDismissTimer=setTimeout(()=>{if(message.textContent===text){message.hidden=true;message.textContent='';}},delay); }
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
/* ===== V2 presentation layer (home, school hub, world lobby) =====
   Presentation only: every data-action / data-hub-target / data-game hook,
   element id and Firebase write below is identical to the live version. */
const V2_ICONS = {"ttt": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fy\" x=\"6\" y=\"6\" width=\"52\" height=\"52\" rx=\"10\"></rect><path d=\"M23 8v48M41 8v48M8 23h48M8 41h48\"></path><path class=\"sr\" d=\"M12 12l9 9m0-9l-9 9\"></path><circle class=\"sb\" cx=\"48.5\" cy=\"48.5\" r=\"5\"></circle></svg>", "snakes": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"sk\" d=\"M11 58V8M27 58V8\"></path><path class=\"sn\" d=\"M11 58V8M27 58V8\"></path><path class=\"sk\" style=\"stroke-width:9\" d=\"M11 20h16M11 32h16M11 44h16\"></path><path class=\"sn\" style=\"stroke-width:3.5\" d=\"M11 20h16M11 32h16M11 44h16\"></path><path class=\"sk\" d=\"M50 56c-12 0-16-8-8-12s14-4 12-12-12-6-8-16\"></path><path class=\"sg\" d=\"M50 56c-12 0-16-8-8-12s14-4 12-12-12-6-8-16\"></path><circle class=\"fg\" cx=\"46\" cy=\"13\" r=\"8\"></circle><circle class=\"fw\" cx=\"43\" cy=\"11\" r=\"2.6\" style=\"stroke-width:1.5\"></circle><circle class=\"fw\" cx=\"49\" cy=\"11\" r=\"2.6\" style=\"stroke-width:1.5\"></circle><circle class=\"fk\" cx=\"43.6\" cy=\"11.6\" r=\"1\" stroke=\"none\"></circle><circle class=\"fk\" cx=\"49.6\" cy=\"11.6\" r=\"1\" stroke=\"none\"></circle><path class=\"sr\" style=\"stroke-width:2.5\" d=\"M46 21v4m0 0l-2 3m2-3l2 3\"></path></svg>", "treasure": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fn\" d=\"M6 32C6 18 18 9 32 9s26 9 26 23z\"></path><rect class=\"fn\" x=\"6\" y=\"32\" width=\"52\" height=\"24\" rx=\"3\"></rect><rect class=\"fy\" x=\"26\" y=\"9\" width=\"12\" height=\"47\"></rect><rect class=\"fy\" x=\"25\" y=\"28\" width=\"14\" height=\"13\" rx=\"3\"></rect><circle class=\"fk\" cx=\"32\" cy=\"33.5\" r=\"2\" stroke=\"none\"></circle><path d=\"M32 35v3\" style=\"stroke-width:2.5\"></path></svg>", "animals": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fy\" x=\"10\" y=\"28\" width=\"44\" height=\"28\" rx=\"2\"></rect><path class=\"fr\" d=\"M4 31L32 8l28 23z\"></path><path d=\"M24 56V44a8 8 0 0 1 16 0v12z\" style=\"fill:#5a3a22\"></path><circle class=\"fs\" cx=\"32\" cy=\"50\" r=\"3.2\" stroke=\"none\"></circle><circle class=\"fs\" cx=\"27.5\" cy=\"45\" r=\"1.6\" stroke=\"none\"></circle><circle class=\"fs\" cx=\"32\" cy=\"43\" r=\"1.6\" stroke=\"none\"></circle><circle class=\"fs\" cx=\"36.5\" cy=\"45\" r=\"1.6\" stroke=\"none\"></circle></svg>", "memory": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><g transform=\"rotate(-14 22 36)\"><rect class=\"fb\" x=\"8\" y=\"14\" width=\"26\" height=\"36\" rx=\"5\"></rect><path class=\"fy\" d=\"M21 24l2.6 5.2 5.8.8-4.2 4 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4 5.8-.8z\"></path></g><g transform=\"rotate(12 42 34)\"><rect class=\"fw\" x=\"30\" y=\"12\" width=\"26\" height=\"36\" rx=\"5\"></rect><path class=\"fr\" d=\"M43 41l-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6z\"></path></g></svg>", "odd": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"sk\" d=\"M42 42l15 15\"></path><path class=\"sn\" d=\"M42 42l15 15\"></path><circle class=\"fl\" cx=\"27\" cy=\"27\" r=\"19\"></circle><circle class=\"fb\" cx=\"19\" cy=\"25\" r=\"4.5\"></circle><circle class=\"fb\" cx=\"31\" cy=\"19\" r=\"4.5\"></circle><circle class=\"fr\" cx=\"27\" cy=\"35\" r=\"4.5\"></circle></svg>", "pattern": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><circle class=\"fr\" cx=\"11\" cy=\"19\" r=\"8\"></circle><rect class=\"fb\" x=\"22\" y=\"11\" width=\"16\" height=\"16\" rx=\"3\"></rect><path class=\"fy\" d=\"M42 27h16L50 11z\"></path><circle class=\"fr\" cx=\"11\" cy=\"45\" r=\"8\"></circle><rect class=\"fb\" x=\"22\" y=\"37\" width=\"16\" height=\"16\" rx=\"3\"></rect><path class=\"fw\" d=\"M42 53h16L50 37z\" style=\"stroke-dasharray:3 3\"></path></svg>", "jigsaw": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fb\" transform=\"translate(4 24)\" d=\"M0 0h12a4 4 0 1 1 8 0h12v12a4 4 0 1 1 0 8v12H20a4 4 0 1 0-8 0H0V20a4 4 0 1 0 0-8z\"></path><path class=\"fy\" transform=\"translate(24 6)\" d=\"M0 0h12a4 4 0 1 1 8 0h12v12a4 4 0 1 1 0 8v12H20a4 4 0 1 0-8 0H0V20a4 4 0 1 0 0-8z\"></path></svg>", "draw": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"sr\" style=\"stroke-width:4\" d=\"M6 58q5-7 10 0t10 0\"></path><g transform=\"rotate(40 32 30)\"><rect class=\"fp\" x=\"24\" y=\"2\" width=\"16\" height=\"9\" rx=\"2\"></rect><rect class=\"fb\" x=\"24\" y=\"11\" width=\"16\" height=\"5\"></rect><rect class=\"fy\" x=\"24\" y=\"16\" width=\"16\" height=\"26\"></rect><path class=\"fs\" d=\"M24 42h16l-8 14z\"></path><path class=\"fk\" d=\"M29.5 52h5l-2.5 4z\" stroke=\"none\"></path></g></svg>", "colors": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><circle class=\"fy\" cx=\"32\" cy=\"32\" r=\"25\"></circle><path class=\"fr\" d=\"M32 7a25 25 0 0 1 25 25H32z\"></path><path class=\"fb\" d=\"M32 57A25 25 0 0 1 7 32h25z\"></path><ellipse class=\"fw\" cx=\"21\" cy=\"19\" rx=\"6\" ry=\"3.5\" transform=\"rotate(-40 21 19)\" stroke=\"none\"></ellipse><circle class=\"fw\" cx=\"32\" cy=\"32\" r=\"4.5\"></circle><circle cx=\"32\" cy=\"32\" r=\"25\"></circle></svg>", "coloring": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fs\" d=\"M32 7C16 7 5 18 5 31s9 26 23 26c8 0 7-5 4-8s-1-8 5-8h8c8 0 14-5 14-13C59 15 47 7 32 7z\"></path><circle class=\"fr\" cx=\"17\" cy=\"30\" r=\"5\"></circle><circle class=\"fb\" cx=\"27\" cy=\"17\" r=\"5\"></circle><circle class=\"fg\" cx=\"42\" cy=\"17\" r=\"5\"></circle><circle class=\"fy\" cx=\"50\" cy=\"30\" r=\"5\"></circle><circle class=\"fw\" cx=\"20\" cy=\"45\" r=\"4.5\"></circle></svg>", "sorting": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fy\" d=\"M6 17l26 11v31L6 48z\"></path><path class=\"fo\" d=\"M58 17L32 28v31l26-11z\"></path><path class=\"fg\" d=\"M32 6l26 11-26 11L6 17z\"></path><ellipse class=\"fk\" cx=\"32\" cy=\"17\" rx=\"8.5\" ry=\"3.8\" stroke=\"none\"></ellipse><path class=\"fg\" d=\"M18 33l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z\"></path><path class=\"fg\" d=\"M45 35l8 13H37z\"></path></svg>", "count": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fb\" x=\"5\" y=\"36\" width=\"25\" height=\"25\" rx=\"4\"></rect><rect class=\"fr\" x=\"34\" y=\"36\" width=\"25\" height=\"25\" rx=\"4\"></rect><rect class=\"fy\" x=\"19.5\" y=\"7\" width=\"25\" height=\"25\" rx=\"4\"></rect><text class=\"tx\" x=\"17.5\" y=\"56\" font-size=\"20\" text-anchor=\"middle\">1</text><text class=\"tx\" x=\"46.5\" y=\"56\" font-size=\"20\" text-anchor=\"middle\">2</text><text class=\"tx\" x=\"32\" y=\"27\" font-size=\"20\" text-anchor=\"middle\">3</text></svg>", "math": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><circle class=\"fb\" cx=\"32\" cy=\"37\" r=\"22\"></circle><ellipse cx=\"32\" cy=\"10\" rx=\"13\" ry=\"4.5\" style=\"stroke:#f2b705;stroke-width:5\"></ellipse><path d=\"M32 26v22M21 37h22\" style=\"stroke-width:13\"></path><path d=\"M32 26v22M21 37h22\" style=\"stroke:#fff;stroke-width:7\"></path></svg>", "compare": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><ellipse class=\"fr\" cx=\"32\" cy=\"52\" rx=\"24\" ry=\"8\"></ellipse><ellipse class=\"fy\" cx=\"32\" cy=\"42\" rx=\"19\" ry=\"7\"></ellipse><ellipse class=\"fg\" cx=\"32\" cy=\"32\" rx=\"14\" ry=\"6.5\"></ellipse><ellipse class=\"fb\" cx=\"32\" cy=\"23\" rx=\"10\" ry=\"5.5\"></ellipse><circle class=\"fr\" cx=\"32\" cy=\"12\" r=\"6\"></circle></svg>", "numberline": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fb\" x=\"8\" y=\"14\" width=\"11\" height=\"16\" rx=\"2\"></rect><rect class=\"fr\" x=\"5\" y=\"9\" width=\"17\" height=\"7\" rx=\"3\"></rect><rect class=\"fg\" x=\"4\" y=\"28\" width=\"36\" height=\"20\" rx=\"5\"></rect><rect class=\"fb\" x=\"36\" y=\"17\" width=\"23\" height=\"31\" rx=\"3\"></rect><rect class=\"fr\" x=\"33\" y=\"10\" width=\"29\" height=\"9\" rx=\"3\"></rect><rect class=\"fw\" x=\"41\" y=\"24\" width=\"13\" height=\"13\" rx=\"2\"></rect><text x=\"47.5\" y=\"35\" font-size=\"12\" font-weight=\"800\" text-anchor=\"middle\" style=\"fill:#2b1b17;stroke:none\">؟</text><circle class=\"fr\" cx=\"17\" cy=\"52\" r=\"8\"></circle><circle class=\"fy\" cx=\"17\" cy=\"52\" r=\"3\" style=\"stroke-width:2\"></circle><circle class=\"fr\" cx=\"48\" cy=\"52\" r=\"8\"></circle><circle class=\"fy\" cx=\"48\" cy=\"52\" r=\"3\" style=\"stroke-width:2\"></circle></svg>", "number-puzzle": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fr\" x=\"6\" y=\"6\" width=\"25\" height=\"25\" rx=\"5\"></rect><rect class=\"fb\" x=\"33\" y=\"6\" width=\"25\" height=\"25\" rx=\"5\"></rect><rect class=\"fg\" x=\"6\" y=\"33\" width=\"25\" height=\"25\" rx=\"5\"></rect><rect class=\"fw\" x=\"33\" y=\"33\" width=\"25\" height=\"25\" rx=\"5\" style=\"stroke-dasharray:4 4\"></rect><text class=\"tx\" x=\"18.5\" y=\"26\" font-size=\"19\" text-anchor=\"middle\">1</text><text class=\"tx\" x=\"45.5\" y=\"26\" font-size=\"19\" text-anchor=\"middle\">2</text><text class=\"tx\" x=\"18.5\" y=\"53\" font-size=\"19\" text-anchor=\"middle\">3</text></svg>", "read": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fb\" d=\"M3 17l29 5 29-5v39l-29 5-29-5z\"></path><path class=\"fw\" d=\"M7 12c9-3 18-2 25 3v40c-7-5-16-6-25-3z\"></path><path class=\"fw\" d=\"M57 12c-9-3-18-2-25 3v40c7-5 16-6 25-3z\"></path><path class=\"fr\" d=\"M30 3h7v21l-3.5-3.5L30 24z\"></path><path d=\"M12 22c4-1 9 0 14 2M12 31c4-1 9 0 14 2M38 24c5-2 10-3 14-2M38 33c5-2 10-3 14-2\" style=\"stroke-width:2\"></path></svg>", "english": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fo\" d=\"M6 10h30a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H20l-8 7v-7H6a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5z\"></path><path class=\"fb\" d=\"M28 28h30a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-4v7l-8-7H28a5 5 0 0 1-5-5V33a5 5 0 0 1 5-5z\"></path><text class=\"tx\" x=\"21\" y=\"31\" font-size=\"22\" text-anchor=\"middle\">ع</text><text class=\"tx\" x=\"43\" y=\"47\" font-size=\"20\" text-anchor=\"middle\">A</text></svg>", "phonics": "<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fy\" x=\"4\" y=\"20\" width=\"31\" height=\"31\" rx=\"5\"></rect><text class=\"tx\" x=\"19.5\" y=\"45\" font-size=\"26\" text-anchor=\"middle\">أ</text><circle class=\"fr\" cx=\"47\" cy=\"39\" r=\"14\"></circle><path class=\"sn\" style=\"stroke-width:3\" d=\"M47 26c0-4 1-7 3-9\"></path><path class=\"fg\" d=\"M50 21c3-6 8-6 11-4-2 5-7 6-11 4z\"></path><ellipse class=\"fw\" cx=\"41.5\" cy=\"34\" rx=\"2.5\" ry=\"4\" transform=\"rotate(25 41.5 34)\" stroke=\"none\"></ellipse></svg>"};
const V2_CATS = {"ttt": "games", "snakes": "games", "treasure": "games", "animals": "games", "memory": "smart", "odd": "smart", "pattern": "smart", "jigsaw": "smart", "draw": "art", "colors": "art", "coloring": "art", "sorting": "art", "count": "numbers", "math": "numbers", "compare": "numbers", "numberline": "numbers", "number-puzzle": "numbers", "read": "letters", "english": "letters", "phonics": "letters"};
const V2_FILTERS = [['all','الكل'],['numbers','أرقام'],['letters','حروف'],['art','ألوان ورسم'],['smart','ذكاء'],['games','ألعاب']];
const V2_DOOR_ICONS = {
  quran:'<svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><path class="fg" d="M4 14c10-3 20-2 28 4v38c-8-6-18-7-28-4z"></path><path class="fy" d="M60 14c-10-3-20-2-28 4v38c8-6 18-7 28-4z"></path><path class="fw" d="M32 4l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.7 5.4-.7z"></path></svg>',
  world:'<svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 60l12-32 12 32M14 60h36"></path><circle class="fl" cx="32" cy="28" r="21"></circle><path d="M32 7v42M11 28h42M17 13l30 30M47 13L17 43"></path><circle class="fr" cx="32" cy="7" r="4.5"></circle><circle class="fb" cx="53" cy="28" r="4.5"></circle><circle class="fy" cx="32" cy="49" r="4.5"></circle><circle class="fg" cx="11" cy="28" r="4.5"></circle><circle class="fw" cx="32" cy="28" r="4"></circle></svg>'
};
let lastScreenGame = '';
let lobbyFilter = 'all';
let lobbySettingsOpen = false;
screen.addEventListener('toggle',e=>{if(e.target?.classList?.contains('v2-details'))lobbySettingsOpen=e.target.open;},true);
const LAST_GAME_KEY = 'roqaya-v2-last-game';
function lastGame(){ try{ return localStorage.getItem(LAST_GAME_KEY)||''; }catch(_){ return ''; } }
function rememberGame(key){ try{ localStorage.setItem(LAST_GAME_KEY,key); }catch(_){} }

function presenceDot(on){ return `<i class="pdot ${on?'on':'off'}" role="img" aria-label="${on?'متصل':'غير متصل'}"></i>`; }
function scorePanel() {
  const a = state?.scores?.host || 0, b = state?.scores?.guest || 0;
  const onA = Boolean(presence[meta?.hostUid]), onB = Boolean(presence[meta?.guestUid]);
  return `<div class="scoreboard">
    <div class="score${role==='host'?' me':''}"><span>👨 بابا ${presenceDot(onA)}</span><strong>⭐ ${arabicDigits(a)}</strong></div>
    <div class="score rose${role==='guest'?' me':''}"><span>👧 ${childName()} ${presenceDot(onB)}</span><strong>⭐ ${arabicDigits(b)}</strong></div>
  </div>`;
}
function heroImage(src,alt){ return `<div class="v2-hero"><img src="${src}" alt="${alt}" class="v2-hero-img" decoding="async" /></div>`; }

function renderHome() {
  const invitation = /^#room=([A-Z2-9]{8})$/.exec(location.hash)?.[1] || '';
  document.body.classList.add('v2-hub-view');
  screen.innerHTML = `<div class="v2-page v2-home${invitation?' has-invite':''}">
    ${heroImage(HUB_ASSETS.schoolGate,'مدخل مدرسة رقية')}
    <section class="v2-card v2-entry">
      <h2 class="v2-title">أهلًا بك في مدرسة رقية 💜</h2>
      <p class="v2-sub">بابا ورقية يدخلوا نفس الغرفة، والمكالمة تفضل معاهم طول الرحلة.</p>
      <div class="v2-block v2-create">
        <div class="v2-fields">
          <label class="v2-field"><span>✏️ اسم الطفل</span><input id="child-name-home" class="input" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${childNamePreference}" placeholder="رقية" /></label>
          <label class="v2-field"><span>🎂 العمر</span><select id="child-age-home" class="input">${ageOptions(agePreference)}</select></label>
        </div>
        <button class="btn primary v2-cta" data-action="create">👨 بابا: افتح المدرسة</button>
      </div>
      <div class="v2-divider"><span>أو</span></div>
      <div class="v2-block v2-join">
        <label class="v2-field"><span>🔑 كود الغرفة</span>
          <div class="v2-join-row"><input class="input code-input" id="room-input" maxlength="8" spellcheck="false" autocomplete="off" autocapitalize="characters" value="${invitation}" placeholder="كود الغرفة" aria-label="رمز الغرفة" /><button class="btn pink" data-action="join">👧 ادخلي</button></div>
        </label>
      </div>
    </section>
  </div>`;
}

function hubRoleNote(){ return role==='guest' ? 'بابا هو اللي بيختار المكان' : ''; }
function hubStage(image,title,subtitle,actions=''){
  return `<div class="v2-page v2-stage">${heroImage(image,title)}
    <section class="v2-card v2-caption"><h2 class="v2-title">${title}</h2>${subtitle?`<p class="v2-sub">${subtitle}</p>`:''}${actions}</section>
  </div>`;
}
async function navigateHub(target){
  if(role!=='host'||!state)return;
  const allowed=new Set([...HUB_GAMES,'lobby']);
  if(!allowed.has(target))return;
  await mutateState(old=>({...old,game:target,phase:'hub'}));
}
async function shareInvite(){
  const link=`${location.origin}${location.pathname}#room=${roomCode}`;
  try{
    if(navigator.share){ await navigator.share({title:'مدرسة وعالم رقية',text:`تعالي ندخل المدرسة سوا 💜 — كود الغرفة: ${roomCode}`,url:link}); return; }
    await navigator.clipboard.writeText(link); info(`اتنسخ رابط الدعوة! ابعته لـ${childName()} بشكل خاص 💌`);
  }catch(e){
    if(e?.name==='AbortError')return;
    try{ await navigator.clipboard.writeText(link); info(`اتنسخ رابط الدعوة! ابعته لـ${childName()} بشكل خاص 💌`); }
    catch(_){ info(`ابعت الكود: ${roomCode}`); }
  }
}
function roomCard(){
  return `<div class="v2-room"><div><small>كود الغرفة</small><b class="room-code" dir="ltr">${roomCode}</b></div>
    <div class="v2-room-actions"><button class="v2-round" data-action="copy" aria-label="نسخ رابط الدعوة">📋</button>${role==='host'?'<button class="v2-round" data-action="share" aria-label="مشاركة الدعوة">📤</button>':''}</div></div>`;
}
function renderSchoolGate(){
  const waiting=!canPlay();
  const host=role==='host';
  const status=waiting
    ? `<div class="v2-status wait"><span class="v2-pulse" aria-hidden="true"></span>في انتظار دخول ${childName()}… ابعت لها الكود أو الرابط</div>`
    : `<div class="v2-status ok">✅ ${childName()} وبابا دلوقتي عند باب المدرسة سوا</div>`;
  const cta=host
    ? `<button class="btn primary v2-cta" data-hub-target="corridor" ${waiting?'disabled':''}>🚪 ندخل المدرسة</button>`
    : (!waiting?`<div class="v2-status guest">💜 استني بابا يدخل بيكم المدرسة</div>`:'');
  screen.innerHTML=hubStage(HUB_ASSETS.schoolGate,'مدرسة رقية','',`${status}${roomCard()}${cta}`);
}
function renderCorridor(){
  const host=role==='host';
  const dis=host?'':'disabled';
  const door=(target,cls,icon,label,aria,badge='')=>`<button class="v2-door ${cls}" data-hub-target="${target}" ${dis} aria-label="${aria}"><span class="v2-door-ico">${icon}</span><strong>${label}</strong>${badge?`<em>${badge}</em>`:''}</button>`;
  screen.innerHTML=`<div class="v2-page v2-corridor">
    <div class="v2-topbar"><button class="v2-round" data-hub-target="school-gate" ${dis} aria-label="الرجوع لباب المدرسة">🏫</button><h2 class="v2-title">${host?'اختار المكان':'بابا بيختار المكان'}</h2></div>
    <div class="v2-doors">
      ${door('school-arabic-gate','d-arabic',V2_ICONS.read,'العربي','اللغة العربية')}
      ${door('school-math','d-math',V2_ICONS.math,'الحساب','الحساب','قريبًا')}
      ${door('school-english','d-english',V2_ICONS.english,'English','اللغة الإنجليزية','قريبًا')}
      ${door('school-quran','d-quran',V2_DOOR_ICONS.quran,'القرآن','القرآن الكريم','قريبًا')}
    </div>
    <button class="v2-world" data-hub-target="world-gate" ${dis} aria-label="عالم رقية"><span class="v2-door-ico">${V2_DOOR_ICONS.world}</span><span class="v2-world-text"><small>ملاهي وألعاب</small><strong>عالم رقية</strong></span><span class="v2-world-go" aria-hidden="true">‹</span></button>
    ${host?'':'<p class="v2-lock">🔒 التنقل عند بابا</p>'}
  </div>`;
}
function renderSubjectGate(kind){
  const map={
    'school-arabic-gate':[HUB_ASSETS.arabic,'اللغة العربية','محتوى مدرسة رقية جاهز','school-arabic','📚 ندخل العربي'],
    'school-math':[HUB_ASSETS.math,'الحساب','القسم جاهز بصريًا • المحتوى قريبًا','','قريبًا'],
    'school-english':[HUB_ASSETS.english,'English','القسم جاهز بصريًا • المحتوى قريبًا','','Coming soon'],
    'school-quran':[HUB_ASSETS.quran,'القرآن الكريم','القسم جاهز بصريًا • المحتوى قريبًا','','قريبًا']
  };
  const [image,title,sub,target,label]=map[kind];
  const disabled=role!=='host'?'disabled':'';
  const primary=target?`<button class="btn primary v2-cta" data-hub-target="${target}" ${disabled}>${label}</button>`:`<button class="btn soft v2-cta" disabled>${label}</button>`;
  const note=hubRoleNote();
  screen.innerHTML=hubStage(image,title,sub,`<div class="v2-actions"><button class="btn soft" data-hub-target="corridor" ${disabled}>↩ الطرقة</button>${primary}</div>${note?`<p class="v2-lock">🔒 ${note}</p>`:''}`);
}
function renderWorldGate(){
  const disabled=role!=='host'?'disabled':'';
  const note=hubRoleNote();
  screen.innerHTML=hubStage(HUB_ASSETS.worldGate,'عالم رقية','من هنا ندخل الألعاب والملاهي',`<div class="v2-actions"><button class="v2-round" data-hub-target="corridor" ${disabled} aria-label="الرجوع للمدرسة">🏫</button><button class="btn primary v2-cta" data-hub-target="lobby" ${disabled}>🎡 دخول عالم رقية</button></div>${note?`<p class="v2-lock">🔒 ${note}</p>`:''}`);
}
function renderSchoolArabic(){
  const existing=document.querySelector('#school-frame');
  if(existing?.dataset?.hubRoom===roomCode&&existing?.dataset?.hubRole===role)return;
  const disabled=role!=='host'?'disabled':'';
  const params=new URLSearchParams({embed:'1',hubRoom:roomCode,hubRole:role});
  screen.innerHTML=`<div class="school-frame-shell v2-frame">
    <div class="school-frame-bar"><button class="btn soft" data-hub-target="corridor" ${disabled}>↩ الطرقة</button><strong>📕 اللغة العربية</strong><span>${role==='host'?'التحكم عندك':'بتتعلمي مع بابا'}</span></div>
    <iframe id="school-frame" data-hub-room="${roomCode}" data-hub-role="${role}" title="مادة اللغة العربية في مدرسة رقية" src="school/index.html?${params.toString()}"></iframe>
  </div>`;
}

function lobbyKeys(available){ return [...available,'number-puzzle']; }
function applyLobbyFilter(){
  for(const tile of screen.querySelectorAll('.v2-tile')) tile.hidden = lobbyFilter!=='all' && tile.dataset.cat!==lobbyFilter;
  for(const chip of screen.querySelectorAll('[data-lobby-filter]')){
    const on=chip.dataset.lobbyFilter===lobbyFilter;
    chip.classList.toggle('on',on); chip.setAttribute('aria-pressed',on?'true':'false');
  }
}
function lobbyTile(key,disabled){
  const np=key==='number-puzzle';
  const [,label,sub]=np?['','بازل الأرقام','رتّبي الأرقام • ٣×٣ / ٤×٤ / ٥×٥']:GAME_LABELS[key];
  const cat=V2_CATS[key]||'games';
  const hook=np?'data-number-puzzle-start':`data-game="${key}"`;
  const extra=np?'roqaya-number-puzzle-card game-card-number-puzzle':`game-card-${key}`;
  const hidden=lobbyFilter!=='all'&&cat!==lobbyFilter?'hidden':'';
  return `<button type="button" class="game-choice v2-tile cat-${cat} ${extra}" ${hook} data-cat="${cat}" ${disabled} ${hidden} aria-label="${label} — ${sub}"><span class="game-card-art v2-art">${V2_ICONS[key]||''}</span><strong class="v2-lbl">${label}</strong></button>`;
}
function renderLobby() {
  const waiting=!canPlay();
  const host=role==='host';
  const childAge=normalizeAge(state?.childAge);
  const available=gamesForAge(childAge);
  const keys=lobbyKeys(available);
  const disabled=(!host||waiting)?'disabled':'';
  const counts={all:keys.length};
  for(const k of keys){ const c=V2_CATS[k]||'games'; counts[c]=(counts[c]||0)+1; }
  if(lobbyFilter!=='all'&&!counts[lobbyFilter]) lobbyFilter='all';
  const last=lastGame();
  const resume=host&&!waiting&&last&&available.includes(last)
    ? `<section class="v2-resume cat-${V2_CATS[last]||'games'}"><span class="v2-resume-art">${V2_ICONS[last]||''}</span><div class="v2-resume-text"><small>كمّل من هنا</small><strong>${GAME_LABELS[last][1]}</strong></div><button class="btn v2-play" data-game="${last}">▶ العب</button></section>` : '';
  const summary=`${childName()} • ${childAge} سنوات`;
  const top=host
    ? `<div class="v2-lobby-top"><button class="v2-pill" data-hub-target="corridor" aria-label="الرجوع للمدرسة">🏫 <span>المدرسة</span></button>
        <details class="v2-details" ${lobbySettingsOpen?'open':''}><summary><span>⚙️ ${summary}</span></summary>
          <div class="v2-settings">
            <label class="v2-field"><span>✏️ الاسم</span><input id="child-name-lobby" class="input" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${childName()}" aria-label="اسم الطفل في الغرفة" /></label>
            <label class="v2-field"><span>🎂 العمر</span><select id="child-age-lobby" class="input">${ageOptions(childAge)}</select></label>
          </div></details></div>`
    : `<div class="v2-settings-view"><span class="v2-chip">✏️ ${childName()}</span><span class="v2-chip">🎂 ${childAge} سنوات</span></div>`;
  const chips=V2_FILTERS.filter(([k])=>k==='all'||counts[k]).map(([k,label])=>
    `<button type="button" class="v2-filter ${k==='all'?'':'cat-'+k} ${k===lobbyFilter?'on':''}" data-lobby-filter="${k}" aria-pressed="${k===lobbyFilter}">${k==='all'?'':'<i class="dot"></i>'}${label}<small>${arabicDigits(counts[k])}</small></button>`).join('');
  screen.innerHTML = `<div class="v2-page v2-lobby lobby-panel">
    ${scorePanel()}
    ${top}
    ${role==='guest'&&!waiting?'<div class="v2-status guest">استني بابا يختار اللعبة 🎠</div>':''}
    ${waiting?`<div class="v2-status wait"><span class="v2-pulse" aria-hidden="true"></span>في انتظار دخول ${childName()}…</div>`:''}
    ${resume}
    <nav class="v2-filters" aria-label="أقسام الألعاب">${chips}</nav>
    <div class="games-heading-row"><h3 class="game-title">اختار لعبتك 🎮</h3><span>${arabicDigits(keys.length)} لعبة</span></div>
    <div class="game-grid lobby-game-grid v2-grid">${keys.map(k=>lobbyTile(k,disabled)).join('')}</div>
    <div class="v2-roombar"><div><small>الغرفة</small><b class="room-code" dir="ltr">${roomCode}</b></div><button class="v2-round" data-action="copy" aria-label="نسخ رابط الدعوة">📋</button></div>
  </div>`;
}

function gameHeading(icon, title) {
  return `<div class="topline compact-game-nav"><span class="tag game-name-tag">${icon} ${title}</span><div class="topline-actions"><button class="btn soft voice-replay" data-action="welcome" ${!soundEnabled?'disabled':''}>🔊 <span>اسمع الترحيب</span></button>${role === 'host' ? '<button class="btn soft" data-action="lobby">🎡 <span>المدينة</span></button>' : '<span class="tag green">🔒</span>'}</div></div>${scorePanel()}`;
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
function englishSettingsInsideGame(){
  if(role!=='host')return '';
  const max=ENGLISH_BANK.length;
  const steps=[10,20,30,40,50,75,100,max].filter((n,i,a)=>n<=max&&a.indexOf(n)===i);
  const chosen=Math.min(englishWordLimitPreference,max);
  return `<div class="in-game-settings english-settings compact-settings"><label for="english-limit-game">🔤 الكلمات المتاحة</label><div class="settings-action-row"><select id="english-limit-game" class="input">${steps.map(n=>`<option value="${n}" ${chosen===n?'selected':''}>أول ${arabicDigits(n)} كلمة</option>`).join('')}</select><button class="btn soft settings-apply" data-action="apply-english-settings">طبّق</button></div></div>`;
}
function puzzleSettingsInsideGame(){
  if(role!=='host')return '';
  const chosen=normalizePuzzlePieces(state?.jigsaw?.pieceCount||puzzlePiecePreference);
  return `<div class="in-game-settings puzzle-settings compact-settings"><label for="puzzle-size-game">🧩 صعوبة البازل</label><div class="puzzle-level-row">${PUZZLE_LEVELS.map(n=>`<button class="puzzle-level ${chosen===n?'selected':''}" data-puzzle-level="${n}">${arabicDigits(n)}</button>`).join('')}</div><small>كل لاعب له بازل مستقل بنفس الصورة.</small></div>`;
}
function numberSettingsInsideGame(gameKey) {
  if (role !== 'host' || !['count','math','numberline','compare'].includes(gameKey)) return '';
  const cfg=currentNumberTraining();
  const mathMode=gameKey==='math'?`<label for="math-mode-game">نوع مسائل الحساب</label><select id="math-mode-game" class="input"><option value="addition" ${cfg.mode==='addition'?'selected':''}>➕ جمع عادي</option><option value="doubles" ${cfg.mode==='doubles'?'selected':''}>🟰 جمع المتماثلات فقط (١+١، ٢+٢…)</option><option value="mixed" ${cfg.mode==='mixed'?'selected':''}>➕➖ جمع وطرح</option></select>`:'';
  const rangeHint=gameKey==='compare'?'اختار مدى فيه ٣ أرقام على الأقل عشان تظهر أسئلة التصاعدي والتنازلي والمقارنة.':'اختار أي مدى من ١ إلى ٢٠. الإعداد يفضل محفوظ على جهاز بابا.';
  return `<div class="in-game-settings number-settings compact-settings">
    <label>🔢 اختار الأرقام اللي هنتدرّب عليها</label>
    <div class="number-range-row rtl-numbers"><label>من <input id="number-min-game" class="input number-input" type="text" inputmode="numeric" maxlength="2" value="${arabicDigits(cfg.min)}" aria-label="أول رقم في التدريب"></label><label>إلى <input id="number-max-game" class="input number-input" type="text" inputmode="numeric" maxlength="2" value="${arabicDigits(cfg.max)}" aria-label="آخر رقم في التدريب"></label></div>
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
    <div class="draw-prompt-compact"><strong>${drawer?'✏️ دورك ترسم':'👀 دورك تخمّن'}</strong><span>${drawer?`${item.name} ${item.emoji}`:caption}</span></div>
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
    ${numberSettingsInsideGame(key)}${key==='english'?englishSettingsInsideGame():''}
    <h2 class="game-title center">${q.prompt}</h2>
    <div class="${['math','numberline','compare'].includes(key)?'rtl-math-zone':''}">${renderQuestionDisplay(q)}</div>
    <p class="status">${state.phase==='finished'?'الجولة خلصت 🎉':canAnswer?'دورك دلوقتي! ✨':`دور ${nameOf(quiz.turn)} ⏳`}</p>
    <div class="quiz-options ${q.visual==='photos'?'photo-options':q.visual==='odd-hard'?'odd-hard-options':q.visual==='number-compare'?'number-compare-options':q.visual==='sizes'&&q.options.length===2?'two-size-options':''}">${buttons}</div>
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
function coloringPage(){return COLORING_PAGES[(state?.coloring?.pageIndex||0)%COLORING_PAGES.length]||COLORING_PAGES[0];}
function coloringHexToRgb(hex){const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[239,83,80];}
function floodFillColoring(ctx,x,y,color){
  const w=ctx.canvas.width,h=ctx.canvas.height;if(x<0||y<0||x>=w||y>=h)return;
  const img=ctx.getImageData(0,0,w,h),d=img.data,idx=(y*w+x)*4;
  const sr=d[idx],sg=d[idx+1],sb=d[idx+2];
  // Do not paint black outlines or already strongly colored pixels.
  if(sr+sg+sb<210)return;
  const [rr,rg,rb]=coloringHexToRgb(color),stack=[[x,y]],seen=new Uint8Array(w*h),tol=52;
  let filled=0;
  while(stack.length&&filled<w*h*.42){const [cx,cy]=stack.pop(),pos=cy*w+cx;if(seen[pos])continue;seen[pos]=1;const i=pos*4;const dr=Math.abs(d[i]-sr)+Math.abs(d[i+1]-sg)+Math.abs(d[i+2]-sb);if(dr>tol||d[i]+d[i+1]+d[i+2]<260)continue;d[i]=rr;d[i+1]=rg;d[i+2]=rb;d[i+3]=255;filled++;if(cx>0)stack.push([cx-1,cy]);if(cx<w-1)stack.push([cx+1,cy]);if(cy>0)stack.push([cx,cy-1]);if(cy<h-1)stack.push([cx,cy+1]);}
  if(filled>20)ctx.putImageData(img,0,0);
}
async function initColoringCanvas(){
  const canvas=document.querySelector('#coloring-canvas'),page=coloringPage();if(!canvas||!page)return;
  const img=new Image();img.decoding='async';img.src=page.src;
  try{await img.decode();}catch(_){await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});}
  const max=900,scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const op of state?.coloring?.ops||[])floodFillColoring(ctx,Math.round(op.x*canvas.width),Math.round(op.y*canvas.height),op.color);
  canvas.onclick=async ev=>{if(state?.game!=='coloring'||state.phase!=='playing')return;const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width,y=(ev.clientY-r.top)/r.height;if(x<0||y<0||x>1||y>1)return;await colorAt(x,y);};
}
function renderColoring(){
  const page=coloringPage();
  const palette=COLOR_PALETTE.map(color=>`<button class="palette-color ${color===coloringSelectedColor?'selected':''}" data-color-pick="${color}" style="--palette:${color}" aria-label="اختيار لون"></button>`).join('');
  screen.innerHTML=`<div class="panel coloring-panel">${gameHeading('🎨','كتاب التلوين')}<div class="coloring-title-row"><div><h2 class="game-title">${page.name}</h2><small>${page.level}</small></div>${role==='host'?'<button class="btn soft" data-action="next-coloring">🖼️ صورة جديدة</button>':''}</div><div class="color-palette">${palette}</div><div class="coloring-wrap raster"><canvas id="coloring-canvas" aria-label="صورة تلوين"></canvas></div><p class="rule center">اختاري لون واضغطي داخل المساحة البيضاء • التلوين يظهر عندكم أنتم الاتنين</p></div>`;
  initColoringCanvas().catch(()=>info('تعذر تحميل صورة التلوين. جرّب تحديث الصفحة.'));
}
async function colorAt(x,y){
  await mutateState(old=>{if(old.game!=='coloring'||old.phase!=='playing'||!old.coloring)return;const ops=[...(old.coloring.ops||[])];ops.push({x:Math.round(x*10000)/10000,y:Math.round(y*10000)/10000,color:coloringSelectedColor});if(ops.length>260)ops.shift();return {...old,feedback:addFeedback(old,'tap'),coloring:{...old.coloring,ops}};});
}
function puzzleSceneSvg(id){
  const common=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`;
  if(id==='pond')return `${common}<defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9be0ff"/><stop offset="1" stop-color="#e9fbff"/></linearGradient></defs><rect width="512" height="512" fill="url(#sky)"/><rect y="315" width="512" height="197" fill="#8fd46a"/><ellipse cx="267" cy="331" rx="187" ry="82" fill="#56bfe7"/><ellipse cx="266" cy="337" rx="130" ry="54" fill="#8ae6ff"/><circle cx="90" cy="83" r="38" fill="#ffd45f"/><g fill="#fff"><ellipse cx="186" cy="84" rx="52" ry="22"/><ellipse cx="370" cy="88" rx="60" ry="25"/></g><g fill="#2ea56d"><circle cx="91" cy="266" r="53"/><circle cx="140" cy="248" r="42"/><circle cx="426" cy="272" r="47"/><circle cx="376" cy="282" r="34"/></g><g><ellipse cx="258" cy="331" rx="98" ry="49" fill="#ffb342"/><circle cx="217" cy="320" r="10" fill="#fff"/><circle cx="217" cy="320" r="5" fill="#2a355f"/><path d="M348 334Q327 310 304 334Q327 359 348 334Z" fill="#ff8d2f"/><path d="M210 366Q258 388 307 366" stroke="#d57f27" stroke-width="12" fill="none" stroke-linecap="round"/></g><g fill="#ff78a0"><circle cx="126" cy="415" r="17"/><circle cx="153" cy="416" r="17"/><circle cx="426" cy="406" r="17"/><circle cx="453" cy="408" r="17"/></g></svg>`;
  if(id==='garden')return `${common}<rect width="512" height="512" fill="#dff8ff"/><rect y="344" width="512" height="168" fill="#90d96b"/><circle cx="428" cy="91" r="41" fill="#ffd966"/><g fill="#fff"><ellipse cx="122" cy="94" rx="61" ry="24"/><ellipse cx="244" cy="60" rx="56" ry="20"/></g><g><ellipse cx="181" cy="232" rx="94" ry="72" fill="#ff96b5"/><ellipse cx="331" cy="232" rx="94" ry="72" fill="#9bb8ff"/><ellipse cx="210" cy="324" rx="70" ry="58" fill="#ffb45f"/><ellipse cx="305" cy="324" rx="70" ry="58" fill="#8de28d"/><ellipse cx="257" cy="271" rx="34" ry="108" fill="#6a4d3a"/><circle cx="257" cy="222" r="30" fill="#ffe3a5"/><circle cx="247" cy="217" r="5" fill="#2a355f"/><circle cx="268" cy="217" r="5" fill="#2a355f"/><path d="M244 232Q257 246 270 232" stroke="#2a355f" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M239 177Q220 146 195 160" stroke="#6a4d3a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M275 177Q293 146 319 160" stroke="#6a4d3a" stroke-width="6" fill="none" stroke-linecap="round"/></g><g fill="#ff79ae"><circle cx="86" cy="426" r="19"/><circle cx="118" cy="426" r="19"/><circle cx="101" cy="396" r="19"/></g><circle cx="101" cy="418" r="10" fill="#ffd966"/><g fill="#89c36b"><rect x="98" y="418" width="7" height="62"/></g></svg>`;
  if(id==='castle')return `${common}<defs><linearGradient id="castleSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfe9ff"/><stop offset="1" stop-color="#fff4fb"/></linearGradient></defs><rect width="512" height="512" fill="url(#castleSky)"/><rect y="357" width="512" height="155" fill="#97d87b"/><path d="M123 352H389V210H123Z" fill="#f7b3d3"/><path d="M105 218H164V128H105Z" fill="#d783c3"/><path d="M348 218H407V128H348Z" fill="#d783c3"/><path d="M218 209H293V111H218Z" fill="#ef98ca"/><path d="M105 128L134 94L164 128M218 111L256 72L293 111M348 128L377 94L407 128" fill="#8b63d8" stroke="#4c2f9f" stroke-width="6" stroke-linejoin="round"/><rect x="230" y="271" width="52" height="81" rx="24" fill="#7c53d6"/><rect x="148" y="246" width="44" height="44" rx="13" fill="#fff0fa"/><rect x="322" y="246" width="44" height="44" rx="13" fill="#fff0fa"/><circle cx="86" cy="84" r="35" fill="#ffd966"/><g fill="#fff"><ellipse cx="172" cy="86" rx="55" ry="22"/><ellipse cx="325" cy="71" rx="60" ry="23"/></g><path d="M55 357Q130 330 208 357T360 357T512 357V512H0V357Z" fill="#66bc63"/><g fill="#ff88b1"><circle cx="60" cy="414" r="17"/><circle cx="92" cy="414" r="17"/><circle cx="76" cy="386" r="17"/><circle cx="430" cy="423" r="17"/><circle cx="460" cy="423" r="17"/><circle cx="445" cy="396" r="17"/></g></svg>`;
  if(id==='dino')return `${common}<rect width="512" height="512" fill="#dcf4ff"/><rect y="338" width="512" height="174" fill="#98da71"/><circle cx="429" cy="90" r="36" fill="#ffd966"/><g fill="#fff"><ellipse cx="143" cy="83" rx="57" ry="23"/><ellipse cx="273" cy="60" rx="52" ry="20"/></g><g><path d="M160 303Q128 149 283 138Q386 132 405 228Q420 300 367 337Q323 368 262 357Q186 344 160 303Z" fill="#7fd278" stroke="#2e6b4a" stroke-width="10"/><path d="M110 290Q67 272 66 229Q74 194 130 219" fill="#7fd278" stroke="#2e6b4a" stroke-width="10" stroke-linejoin="round"/><circle cx="307" cy="187" r="13" fill="#fff"/><circle cx="311" cy="186" r="7" fill="#243058"/><path d="M343 220Q314 249 286 220" stroke="#243058" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M228 354V420M319 355V420" stroke="#2e6b4a" stroke-width="18" stroke-linecap="round"/><path d="M390 284Q426 279 441 303Q428 326 392 319" fill="#7fd278" stroke="#2e6b4a" stroke-width="10" stroke-linejoin="round"/><g fill="#f7f3ff"><path d="M195 146L210 113L228 147Z"/><path d="M233 138L249 102L267 140Z"/><path d="M274 136L289 102L307 139Z"/></g></g><g fill="#ff87aa"><circle cx="81" cy="421" r="15"/><circle cx="109" cy="421" r="15"/><circle cx="95" cy="396" r="15"/></g></svg>`;
  return `${common}<defs><linearGradient id="roadSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b8ecff"/><stop offset="1" stop-color="#f7fdff"/></linearGradient></defs><rect width="512" height="512" fill="url(#roadSky)"/><rect y="322" width="512" height="190" fill="#8fd16a"/><path d="M0 510Q158 386 318 406Q430 418 512 374V512Z" fill="#55566a"/><path d="M198 443L266 425M316 408L388 391M428 378L480 362" stroke="#fff3b0" stroke-width="15" stroke-linecap="round"/><circle cx="412" cy="85" r="41" fill="#ffd966"/><g fill="#fff"><ellipse cx="118" cy="81" rx="63" ry="25"/><ellipse cx="241" cy="112" rx="51" ry="21"/></g><g><rect x="92" y="221" width="295" height="111" rx="53" fill="#ff6b62"/><path d="M160 221Q205 145 299 145Q350 145 387 221Z" fill="#ff7f72"/><rect x="190" y="165" width="90" height="72" rx="18" fill="#b8ecff"/><rect x="286" y="165" width="72" height="72" rx="18" fill="#b8ecff"/><circle cx="176" cy="329" r="41" fill="#30344f"/><circle cx="318" cy="329" r="41" fill="#30344f"/><circle cx="176" cy="329" r="20" fill="#f2f2fb"/><circle cx="318" cy="329" r="20" fill="#f2f2fb"/><circle cx="350" cy="255" r="9" fill="#fff"/><circle cx="193" cy="255" r="9" fill="#fff"/><path d="M240 279Q274 302 307 279" stroke="#813734" stroke-width="10" fill="none" stroke-linecap="round"/></g><g fill="#53af63"><circle cx="440" cy="241" r="47"/><rect x="432" y="241" width="17" height="74" fill="#86664d"/></g></svg>`;
}
function puzzlePicture(id){return PUZZLE_PICTURES.find(x=>x.id===id)||PUZZLE_PICTURES[0];}
function puzzleImageUrl(id){return puzzlePicture(id).src;}
function puzzleGridFor(total){if(total===4)return [2,2];if(total===10)return [2,5];if(total===20)return [4,5];return [5,10];}
function puzzleEdgeSign(r,c,edge){
  if(edge==='top')return r===0?0:(((r-1)*17+c*11)%2?1:-1);
  if(edge==='bottom')return r===state?.jigsaw?.rows-1?0:((r*17+c*11)%2?-1:1);
  if(edge==='left')return c===0?0:((r*13+(c-1)*7)%2?1:-1);
  if(edge==='right')return c===state?.jigsaw?.cols-1?0:((r*13+c*7)%2?-1:1);
  return 0;
}
function jigsawPath(piece,rows,cols){
  const r=Math.floor(piece/cols),c=piece%cols,edge=(where)=>{if(where==='top')return r===0?0:(((r-1)*17+c*11)%2?1:-1);if(where==='bottom')return r===rows-1?0:((r*17+c*11)%2?-1:1);if(where==='left')return c===0?0:((r*13+(c-1)*7)%2?1:-1);return c===cols-1?0:((r*13+c*7)%2?-1:1);};
  const bumpH=(sign,y)=>sign===0?`L100 ${y}`:`L62 ${y} C58 ${y} 58 ${y+sign*16} 50 ${y+sign*16} C42 ${y+sign*16} 42 ${y} 38 ${y} L0 ${y}`;
  const top=edge('top'),right=edge('right'),bottom=edge('bottom'),left=edge('left');
  let d='M0 0 ';
  d+=top===0?'L100 0 ':`L38 0 C42 0 42 ${top*16} 50 ${top*16} C58 ${top*16} 58 0 62 0 L100 0 `;
  d+=right===0?'L100 100 ':`L100 38 C100 42 ${100+right*16} 42 ${100+right*16} 50 C${100+right*16} 58 100 58 100 62 L100 100 `;
  d+=bottom===0?'L0 100 ':`L62 100 C58 100 58 ${100+bottom*16} 50 ${100+bottom*16} C42 ${100+bottom*16} 42 100 38 100 L0 100 `;
  d+=left===0?'L0 0 Z':`L0 62 C0 58 ${left*16} 58 ${left*16} 50 C${left*16} 42 0 42 0 38 L0 0 Z`;
  return d;
}
function puzzleTile(id,piece,rows,cols,extra=''){
  const x=piece%cols,y=Math.floor(piece/cols),path=jigsawPath(piece,rows,cols),url=puzzleImageUrl(id);
  return `<svg class="puzzle-tile jigsaw-svg ${extra}" viewBox="-18 -18 136 136" aria-hidden="true"><defs><clipPath id="clip-${piece}-${rows}-${cols}"><path d="${path}"/></clipPath></defs><g clip-path="url(#clip-${piece}-${rows}-${cols})"><image href="${url}" x="${-x*100}" y="${-y*100}" width="${cols*100}" height="${rows*100}" preserveAspectRatio="none"/></g><path d="${path}" fill="none" stroke="rgba(89,63,148,.45)" stroke-width="1.7"/></svg>`;
}
function renderJigsaw(){
  const g=state.jigsaw;if(!g)return;const total=g.pieceCount||g.rows*g.cols,placed=(g.placedBy?.[role]||{}),order=(g.orderBy?.[role]||g.order||[]),mineDone=Boolean(g.completed?.[role]);
  const hostPlaced=Object.keys(g.placedBy?.host||{}).length,guestPlaced=Object.keys(g.placedBy?.guest||{}).length;
  const slots=Array.from({length:total},(_,i)=>`<button class="puzzle-slot ${placed[i]?'filled':''}" data-puzzle-slot="${i}" ${placed[i]||mineDone?'disabled':''} aria-label="مكان القطعة ${i+1}">${placed[i]?puzzleTile(g.pictureId,i,g.rows,g.cols):'<span>＋</span>'}</button>`).join('');
  const tray=order.filter(i=>!placed[i]).map(i=>`<button class="puzzle-piece ${puzzleSelectedPiece===i?'selected':''}" data-puzzle-piece="${i}" ${mineDone?'disabled':''} aria-label="قطعة بازل">${puzzleTile(g.pictureId,i,g.rows,g.cols)}</button>`).join('');
  screen.innerHTML=`<div class="panel jigsaw-panel">${gameHeading('🧩','البازل')}${puzzleSettingsInsideGame()}<div class="jigsaw-head"><div><h2 class="game-title">${g.pictureName||'بازل ممتع'} • ${arabicDigits(total)} قطعة</h2><p class="hint">بازلِك مستقل عن بازل ${role==='host'?childName():'بابا'}.</p></div><img class="puzzle-reference" src="${puzzleImageUrl(g.pictureId)}" alt="الصورة المرجعية"></div><div class="puzzle-progress-duo"><span>👨 ${arabicDigits(hostPlaced)}/${arabicDigits(total)}</span><span>👧 ${arabicDigits(guestPlaced)}/${arabicDigits(total)}</span></div><div class="puzzle-board jigsaw-board pieces-${total}" style="--pcols:${g.cols};--piece-aspect:${g.rows}/${g.cols}">${slots}</div><div class="puzzle-tray premium">${tray||(mineDone?'<strong>✅ خلصت بازلِك!</strong>':'<span class="hint">كل القطع اتركبت ✅</span>')}</div>${mineDone&&state.phase==='playing'?'<div class="finish mini-finish">🎉 ممتاز! استنى اللاعب التاني يكمّل.</div>':''}${state.phase==='finished'?celebration('اكتمل البازلين! 🧩'):''}${role==='host'&&state.phase==='finished'?'<div class="btn-row"><button class="btn primary" data-action="restart">🧩 بازل جديد</button></div>':''}</div>`;
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
  renderVoiceCallControls();
  if(state?.game!==lastScreenGame){lastScreenGame=state?.game;try{window.scrollTo(0,0);}catch(_){}}
  setConn(!uid?'wait':connected?'on':'off');
  const hubMode=!roomCode||Boolean(state&&HUB_GAMES.has(state.game));
  document.body.classList.toggle('v2-hub-view',hubMode);
  document.body.classList.toggle('playing-game',Boolean(roomCode&&state&&!HUB_GAMES.has(state.game)&&state.game!=='lobby'));
  document.body.classList.toggle('v2-lobby-view',Boolean(roomCode&&state&&state.game==='lobby'));
  document.body.classList.toggle('school-frame-view',Boolean(roomCode&&state&&state.game==='school-arabic'));
  if(state?.game!=='phonics'&&alphabetMusicTimer)stopAlphabetMusic();
  if (!roomCode) { renderHome(); return; }
  if (!meta || !state) { screen.innerHTML = '<div class="panel center"><div class="big-emoji">🏫</div><h2>جاري دخول مدرسة رقية…</h2></div>'; return; }
  if (state.game === 'school-gate') return renderSchoolGate();
  if (state.game === 'corridor') return renderCorridor();
  if (['school-arabic-gate','school-math','school-english','school-quran'].includes(state.game)) return renderSubjectGate(state.game);
  if (state.game === 'school-arabic') return renderSchoolArabic();
  if (state.game === 'world-gate') return renderWorldGate();
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
  const common={childAge,childName:normalizeChildName(old?.childName)||'رقية',...(old?.call?{call:old.call}:{})};
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
    return {...common,game:which,phase:'playing',scores,round,coloring:{pageIndex,ops:[]}};
  }
  if (which === 'jigsaw') {
    const pieceCount=normalizePuzzlePieces(puzzlePiecePreference),[rows,cols]=puzzleGridFor(pieceCount),total=pieceCount;
    const oldPic=old?.game==='jigsaw'?old.jigsaw?.pictureId:null;
    const choices=PUZZLE_PICTURES.filter(x=>x.id!==oldPic),picture=choices[Math.floor(Math.random()*choices.length)]||PUZZLE_PICTURES[0];
    return {...common,game:which,phase:'playing',scores,round,jigsaw:{pictureId:picture.id,pictureName:picture.name,pieceCount,rows,cols,orderBy:{host:shuffle(Array.from({length:total},(_,i)=>i)),guest:shuffle(Array.from({length:total},(_,i)=>i))},placedBy:{host:{},guest:{}},completed:{host:false,guest:false}}};
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
async function colorPart(index){ return; }
async function placePuzzle(piece,slot,source){
  if(!Number.isInteger(piece)||!Number.isInteger(slot))return;
  if(piece!==slot){sound('bad');source?.classList.add('shake');setTimeout(()=>source?.classList.remove('shake'),420);return;}
  puzzleSelectedPiece=null;
  await mutateState(old=>{
    if(old.game!=='jigsaw'||old.phase!=='playing'||!old.jigsaw)return;const g=old.jigsaw,total=g.pieceCount||g.rows*g.cols,placed={...(g.placedBy?.[role]||{})};if(piece<0||piece>=total||placed[piece]||g.completed?.[role])return;
    placed[piece]=true;const mineDone=Object.keys(placed).length>=total,placedBy={...(g.placedBy||{}),[role]:placed},completed={...(g.completed||{}),[role]:mineDone};const both=Boolean(completed.host&&completed.guest);const scores={...old.scores};if(mineDone)scores[role]=(scores[role]||0)+3;
    return {...old,scores,feedback:addFeedback(old,both?'win':'good'),phase:both?'finished':'playing',...(both?{result:'complete'}:{}),jigsaw:{...g,placedBy,completed}};
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
  cleanupVoicePeer();
  for (const unsub of unsubs) try { unsub(); } catch(e) { console.warn(e); }
  unsubs=[];presenceBound=false;meta=null;state=null;presence={};strokes={};role='';lastAudioFeedback=null;snakeRollVisualKey='';snakeMoveVisualKey='';if(snakeRollVisualTimer){clearInterval(snakeRollVisualTimer);snakeRollVisualTimer=null;}
  renderVoiceCallControls();
}
function trackPresence() {
  if (presenceBound || !role || !uid) return;
  presenceBound=true;
  const ownRef=ref(db,`rooms/${roomCode}/presence/${uid}`);
  unsubs.push(onValue(ref(db,'.info/connected'),snapshot=>{
    connected=snapshot.val()===true;
    setConn(connected?'on':'off');
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
  unsubs.push(onValue(ref(db,`${base}/state`),snap=>{const oldState=state;state=snap.val();feedbackSignal(oldState,state);maybeWelcomeOnSync(oldState,state);syncVoiceCall(oldState,state);render();},e=>info(humanError(e))));
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
    await set(ref(db,`rooms/${code}/state`),{game:'school-gate',phase:'hub',scores:{host:0,guest:0},round:0,childAge:agePreference,childName:enteredName,metrics:{v:1,days:{}}});
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
  const hubTarget=button.dataset.hubTarget;
  if(hubTarget)return navigateHub(hubTarget);
  const action=button.dataset.action;
  if (action==='welcome') {
    if(!welcomeToGame(state?.game,state?.childName)) info(soundEnabled?'المتصفح الحالي لا يتيح النطق الصوتي. جرّب فتح اللعبة في Google Chrome.':'شغّل الصوت من الزر العلوي أولًا.');
    return;
  }
  if (action==='create') return createRoom();
  if (action==='join') return joinRoom();
  if (action==='copy') return copyLink();
  if (action==='share') return shareInvite();
  if (button.dataset.lobbyFilter) {lobbyFilter=button.dataset.lobbyFilter;applyLobbyFilter();return;}
  if (action==='lobby') return goLobby();
  if (action==='roll-dice') return rollDice();
  if (action==='move-snakes') return startSnakeMove();
  if (action==='reset-coloring'&&role==='host'&&state?.game==='coloring') return mutateState(old=>old.game==='coloring'?{...old,phase:'playing',coloring:{...old.coloring,ops:[]}}:undefined);
  if (action==='next-coloring'&&role==='host'&&state?.game==='coloring') return mutateState(old=>old.game==='coloring'?newGame('coloring',old):undefined);
  if (action==='alphabet-music') {toggleAlphabetMusic();render();return;}
  if (button.dataset.colorPick) {coloringSelectedColor=button.dataset.colorPick;document.querySelectorAll('.palette-color').forEach(x=>x.classList.toggle('selected',x.dataset.colorPick===coloringSelectedColor));return;}
  if (button.dataset.puzzleLevel!==undefined) {
    if(role!=='host'||state?.game!=='jigsaw')return;
    puzzlePiecePreference=normalizePuzzlePieces(button.dataset.puzzleLevel);savePuzzlePieces();info(`🧩 مستوى ${arabicDigits(puzzlePiecePreference)} قطعة`);
    return mutateState(old=>old.game==='jigsaw'?newGame('jigsaw',old):undefined);
  }
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
  if (action==='apply-english-settings') {
    if(role!=='host'||state?.game!=='english')return;
    englishWordLimitPreference=normalizeEnglishLimit(document.querySelector('#english-limit-game')?.value||20);saveEnglishLimit();info('✅ تم تحديث مجموعة الكلمات');
    return mutateState(old=>old.game==='english'?newGame('english',old):undefined);
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
  if (button.dataset.game) {rememberGame(button.dataset.game);return startGame(button.dataset.game);}
  if (button.dataset.memory!==undefined) return chooseCard(Number(button.dataset.memory));
  if (button.dataset.cell!==undefined) return chooseCell(Number(button.dataset.cell));
  if (button.dataset.guess!==undefined) return chooseGuess(Number(button.dataset.guess));
  if (button.dataset.quiz!==undefined) return chooseQuiz(Number(button.dataset.quiz));
  if (button.dataset.treasure!==undefined) return chooseTreasure(Number(button.dataset.treasure));
});
document.querySelector('#call-controls')?.addEventListener('click',async e=>{
  const button=e.target.closest('button[data-call-action]');if(!button||button.disabled)return;
  const action=button.dataset.callAction;
  if(action==='start')return startVoiceCall();
  if(action==='accept')return acceptVoiceCall();
  if(action==='reject')return rejectVoiceCall();
  if(action==='end')return endVoiceCall();
  if(action==='mic')return toggleVoiceMic();
  if(action==='speaker')return toggleVoiceSpeaker();
  if(action==='ptt')return toggleVoicePushToTalk();
  if(action==='retry')return retryVoiceCall();
  if(action==='devices'){voiceDevicePanelOpen=!voiceDevicePanelOpen;if(voiceDevicePanelOpen)await refreshVoiceAudioDevices();return renderVoiceCallControls();}
  if(action==='devices-refresh'){await refreshVoiceAudioDevices();return renderVoiceCallControls();}
  if(action==='devices-close'){voiceDevicePanelOpen=false;return renderVoiceCallControls();}
});
const callControls=document.querySelector('#call-controls');
callControls?.addEventListener('change',async e=>{
  const select=e.target.closest?.('select[data-call-device]');if(!select)return;
  if(select.dataset.callDevice==='input')return switchVoiceInput(select.value);
  if(select.dataset.callDevice==='output')return switchVoiceOutput(select.value);
});
navigator.mediaDevices?.addEventListener?.('devicechange',()=>{refreshVoiceAudioDevices().then(()=>{if(voiceDevicePanelOpen)renderVoiceCallControls();});});
callControls?.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-call-ptt="hold"]');if(!b)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);setVoicePttTalking(true);});
for(const eventName of ['pointerup','pointercancel','lostpointercapture'])callControls?.addEventListener(eventName,e=>{if(e.target.closest?.('[data-call-ptt="hold"]')||voicePttTalking)setVoicePttTalking(false);});
screen.addEventListener('keydown',e=>{
  if (e.key==='Enter'&&e.target?.id==='room-input') {e.preventDefault();joinRoom();}
});
async function initialize() {
  soundControl();
  renderVoiceCallControls();
  document.querySelector('.brand p')?.append(` • V${APP_VERSION}`);
  personalizeUi();
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('PASTE_') || firebaseConfig.databaseURL.includes('PASTE_')) {
    setConn('cfg');
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
      setConn(connected?'on':'off');
    }));
    render();
  } catch(e) {
    info(humanError(e));
    screen.innerHTML='<div class="panel center"><div class="big-emoji">🔌</div><h2>الاتصال مش جاهز</h2><p>راجع إعدادات Firebase والإنترنت، وبعدها اعمل تحديث للصفحة.</p></div>';
  }
}
initialize();
