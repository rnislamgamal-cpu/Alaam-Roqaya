import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

/* M4.27 — «افهم الأعداد» (Numbers) — نسخة مبسّطة
 * - اللعبة في numbers-game.html: مولّدة بالكامل من الـseed على الجهازين (§2) — مفيش توليد مشترك.
 * - الدور مشتق من turnIndex: فردي = host، زوجي = guest. ممنوع خانة turn (§2/a).
 * - النشاط الحالي مش متخزّن — بيتشتق من seed + turnIndex على الجهازين بنفس النتيجة.
 * - ممنوع auto-advance: النقاط مش بتزوّد الدور؛ الدور من roqaya-numbers-next بس (§5).
 * - بابا بس: «السؤال التالي» + «أعِد» + المستوى + جولة جديدة + الرجوع للمدينة (§4).
 * - لا PeerJS. لا نظام غرف جديد. لا تعديل Firebase Rules.
 * - المكافأة تُقيَّد بـ awarded لمنع التكرار عند Refresh (§10).
 */
const screen = document.getElementById('screen');
let db = null, auth = null, uid = '', roomCode = '', meta = null, shared = null, role = '', serverOffset = 0;
let unsubMeta = null, unsubState = null, unsubOffset = null, overlay = null, frame = null;
let observerBusy = false, startBusy = false;
/* آخر redoTick اتبعت للـiframe — عشان نعرف إن الـhost ضغط «أعِد» (§4.6) */
let lastRedoTick = -1;
/* آخر مصفوفة نقاط اتبعتت — عشان نغيّر النقاط من غير ما نعيد توليد السؤال (§4.7) */
let lastScoresKey = '';
/* إجمالي الأدوار: ٢٣ نشاطاً في البنك → كل نشاط مرة واحدة بالضبط (§3.1) */
const TOTAL_TURNS = 23;

const currentRoom = () => location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
const childName = () => String(shared?.childName || 'رقية');
const otherName = () => (role === 'host' ? 'اللاعب التاني' : childName());
const now = () => Date.now() + (Number(serverOffset) || 0);

/* حالة الجولة كاملة (§3) */
function freshMatch(roundId) {
  return {
    v: 1, roundId,
    seed: 1 + Math.floor(Math.random() * 1e6),
    level: 1,
    turnIndex: 1,
    totalTurns: TOTAL_TURNS,
    scores: { host: 0, guest: 0 },
    champion: null,
    awarded: false,
    redoTick: 0
  };
}

function cleanup() {
  for (const fn of [unsubMeta, unsubState, unsubOffset]) try { fn?.() } catch { }
  unsubMeta = unsubState = unsubOffset = null; meta = null; shared = null; role = '';
  lastRedoTick = -1; lastScoresKey = '';
}
function updateRole() { role = meta?.hostUid === uid ? 'host' : meta?.guestUid === uid ? 'guest' : ''; }
async function mutate(transform) {
  if (!db || !roomCode || !role) return;
  try { return await runTransaction(ref(db, `rooms/${roomCode}/state`), cur => { if (!cur) return; return transform(cur) }, { applyLocally: false }) }
  catch (e) { console.warn('numbers sync', e) }
}

async function startGame() {
  if (startBusy || role !== 'host' || !meta?.guestUid) return;
  startBusy = true;
  try {
    await mutate(old => {
      if (old.game !== 'lobby') return;
      const rr = (Number(old.round) || 0) + 1;
      return { ...old, game: 'numbers-v1', phase: 'playing', round: rr, result: null, numbersV1: freshMatch(rr) };
    });
  } finally { startBusy = false }
}

/* ===== ٥ دوال بدل requestNext/claim/rematch (§4.6) ===== */

/* 4.1 — «السؤال التالي»: host بس، والتحقق من from === turnIndex يمنع القفز المزدوج */
async function advance(msg) {
  if (role !== 'host') return;
  await mutate(s => {
    const g = s.numbersV1;
    if (s.game !== 'numbers-v1' || s.phase !== 'playing' || !g) return;
    if (Number(msg.from) !== Number(g.turnIndex)) return;
    const next = Number(g.turnIndex) + 1;
    if (next > Number(g.totalTurns)) {          // آخر دور خلص → احسب الكاسب (§3.1)
      const h = Number(g.scores?.host) || 0, v = Number(g.scores?.guest) || 0;
      const champion = h > v ? 'host' : v > h ? 'guest' : null;   // تعادل → null
      return { ...s, phase: 'finished', result: champion, numbersV1: { ...g, turnIndex: next, champion, awarded: true } };
    }
    return { ...s, numbersV1: { ...g, turnIndex: next, redoTick: 0 } };
  });
}

/* 4.2 — إجابة صحيحة: من الطرفين، مرة واحدة بس (awarded)، ولا يزوّد الدور أبداً (§5) */
async function score(msg) {
  const player = msg.player === 'guest' ? 'guest' : 'host';
  if (!msg.ok) return;
  await mutate(s => {
    const g = s.numbersV1;
    if (s.game !== 'numbers-v1' || s.phase !== 'playing' || !g || g.awarded) return;
    return {
      ...s,
      numbersV1: { ...g, awarded: true, scores: { ...g.scores, [player]: (Number(g.scores?.[player]) || 0) + 1 } }
    };
  });
  /* نعرض الحل فوراً على الجهاز المحلي (نفس رسالة اللعبة) */
  frame?.contentWindow?.postMessage(
    { type: 'roqaya-numbers-answer', player, turnIndex: Number(msg.turnIndex) || 0, activity: msg.activity || '', ok: true },
    location.origin
  );
}

/* 4.3 — مستوى جديد: host بس */
async function setLevel(msg) {
  if (role !== 'host') return;
  const lvl = Number(msg.level);
  if (![1, 2, 3].includes(lvl)) return;
  await mutate(s => {
    const g = s.numbersV1;
    if (s.game !== 'numbers-v1' || !g || g.champion) return;
    return { ...s, numbersV1: { ...g, level: lvl } };
  });
}

/* 4.4 — جولة جديدة: host بس → seed جديد و turnIndex:1 (رسالة new مش config) */
async function newRound() {
  if (role !== 'host') return;
  await mutate(s => {
    const g = s.numbersV1;
    if (s.game !== 'numbers-v1' || !g) return;
    const rr = (Number(s.round) || 0) + 1;
    const m = freshMatch(rr);
    return { ...s, phase: 'playing', round: rr, result: null, numbersV1: { ...m, roundId: Number(g.roundId) || rr } };
  });
}

/* 4.6 — «أعِد»: host بس → نزوّد redoTick و onValue هتتصرف */
async function redo(msg) {
  if (role !== 'host') return;
  await mutate(s => {
    const g = s.numbersV1;
    if (s.game !== 'numbers-v1' || s.phase !== 'playing' || !g || g.champion) return;
    return { ...s, numbersV1: { ...g, redoTick: (Number(g.redoTick) || 0) + 1 } };
  });
}

/* 4.5 — الرجوع للمدينة: host بس (زي spot) */
async function goCity() {
  if (role !== 'host') return;
  await mutate(old => old.game === 'numbers-v1' ? { ...old, game: 'lobby', phase: 'lobby' } : old);
}

/* ===== الواجهة ===== */
function upgradeCard() {
  const card = screen?.querySelector('.game-card-numbers'); if (!card) return;
  card.setAttribute('data-numbers-v1-start', '');
  const title = card.querySelector('strong'), desc = card.querySelector('small');
  if (title && title.textContent !== 'افهم الأعداد') title.textContent = 'افهم الأعداد';
  const wanted = 'بالتناوب • كل دور نشاط جديد';
  if (desc && desc.textContent !== wanted) desc.textContent = wanted;
}
function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('section');
  overlay.id = 'numbers-v1-overlay'; overlay.className = 'numbers-v1-overlay'; overlay.hidden = true;
  overlay.innerHTML = '<iframe class="numbers-v1-frame" src="numbers-game.html?v=1" title="افهم الأعداد" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend', overlay);
  frame = overlay.querySelector('iframe'); frame.addEventListener('load', sendConfig);
  return overlay;
}
function sendConfig() {
  const g = shared?.numbersV1;
  if (!frame?.contentWindow || shared?.game !== 'numbers-v1' || !g || !role) return;
  const scores = g.scores || { host: 0, guest: 0 };
  lastScoresKey = `${scores.host}|${scores.guest}`;
  lastRedoTick = Number(g.redoTick) || 0;
  frame.contentWindow.postMessage({
    type: 'roqaya-numbers-config',
    config: {
      role, childName: childName(), otherName: otherName(),
      roundId: Number(g.roundId) || Number(shared.round) || 0,
      seed: Number(g.seed) || 1,
      level: Number(g.level) || 1,
      turnIndex: Number(g.turnIndex) || 1,
      totalTurns: Number(g.totalTurns) || TOTAL_TURNS,
      scores,
      champion: g.champion || null
    }
  }, location.origin);
}
/* 4.7 — النقاط لوحدها بتتغيّر: نبعت answer بدل config عشان ما نعيدش توليد السؤال */
function sendScores() {
  const g = shared?.numbersV1;
  if (!frame?.contentWindow || !g) return;
  const s = g.scores || { host: 0, guest: 0 };
  const key = `${s.host}|${s.guest}`;
  if (key === lastScoresKey) return;
  lastScoresKey = key;
  frame.contentWindow.postMessage({ type: 'roqaya-numbers-answer', player: null, ok: false, scores: s, turnIndex: Number(g.turnIndex) || 1 }, location.origin);
  frame.contentWindow.postMessage({ type: 'roqaya-numbers-config', config: { scores: s } }, location.origin);
}
function activate() {
  ensureOverlay();
  document.body.classList.add('numbers-v1-active');
  screen.setAttribute('aria-hidden', 'true');
  overlay.hidden = false; sendConfig();
}
function deactivate() {
  document.body.classList.remove('numbers-v1-active');
  screen?.removeAttribute('aria-hidden');
  if (overlay) overlay.hidden = true;
}
function syncUi() {
  if (shared?.game === 'lobby') { deactivate(); upgradeCard(); return }
  if (shared?.game === 'numbers-v1' && shared?.numbersV1 && role) { activate(); return }
  deactivate();
}
function bindRoom() {
  const next = currentRoom();
  if (next === roomCode && unsubMeta && unsubState) return;
  cleanup(); roomCode = next;
  if (!db || !uid || !roomCode) { syncUi(); return }
  unsubMeta = onValue(ref(db, `rooms/${roomCode}/meta`), snap => { meta = snap.val(); updateRole(); syncUi() });
  unsubState = onValue(ref(db, `rooms/${roomCode}/state`), snap => {
    const before = shared?.numbersV1;
    shared = snap.val(); updateRole();
    const g = shared?.numbersV1;
    /* 4.6 — الـhost ضغط «أعِد» → reset ثم config (نفس السؤال بالظبط) */
    if (g && Number(g.redoTick) > lastRedoTick && frame?.contentWindow) {
      lastRedoTick = Number(g.redoTick);
      frame.contentWindow.postMessage({ type: 'roqaya-numbers-reset' }, location.origin);
      sendConfig();
      return;
    }
    syncUi();
    /* النقاط بس اتغيّرت → نبعت answer بدل config (§4.7) */
    if (g && before && g.roundId === before.roundId && g.turnIndex === before.turnIndex && g.level === before.level && g.seed === before.seed) sendScores();
  });
  unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), snap => { serverOffset = Number(snap.val()) || 0; sendConfig() });
}

document.addEventListener('click', e => {
  const card = e.target.closest?.('.game-card-numbers,[data-numbers-v1-start]');
  if (!card) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
  startGame();
}, true);

addEventListener('message', e => {
  if (e.origin !== location.origin) return;
  const d = e.data || {};
  if (d.type === 'roqaya-numbers-ready') { sendConfig(); return }
  if (d.type === 'roqaya-numbers-answer') { score(d); return }
  if (d.type === 'roqaya-numbers-next') { advance(d); return }
  if (d.type === 'roqaya-numbers-redo') { redo(d); return }
  if (d.type === 'roqaya-numbers-level') { setLevel(d); return }
  if (d.type === 'roqaya-numbers-new') { newRound(); return }
  if (d.type === 'roqaya-numbers-city') { goCity(); return }
});

const observer = new MutationObserver(() => {
  if (observerBusy) return; observerBusy = true;
  queueMicrotask(() => {
    observerBusy = false;
    if (shared?.game === 'lobby') upgradeCard();
    if (shared?.game === 'numbers-v1' && shared?.numbersV1) sendConfig();
  });
});
if (screen) observer.observe(screen, { childList: true, subtree: true });
addEventListener('hashchange', bindRoom);
addEventListener('pageshow', () => { bindRoom(); syncUi() });

async function boot() {
  for (let i = 0; i < 120 && getApps().length === 0; i++) await new Promise(r => setTimeout(r, 50));
  const app = getApps()[0]; if (!app) return;
  auth = getAuth(app); db = getDatabase(app);
  onAuthStateChanged(auth, user => { uid = user?.uid || ''; bindRoom() });
  bindRoom();
}
boot();
