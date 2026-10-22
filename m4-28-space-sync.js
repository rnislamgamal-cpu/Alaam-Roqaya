import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

/* M4.28 — «مغامرة أرقام الفضاء» — نسخة مشتركة بالتناوب
 * - اللعبة في space-numbers-game.html: مولّدة من الـseed على الجهازين (§2) — مفيش توليد مشترك.
 * - الدور في Firebase: `turn` = 'host' | 'guest' — صاحب الدور بس هو اللي يقدر يقلب كارت.
 * - الكارت الصح → الدور يفضل معاك (هدف بيتقدّم) · الكارت الغلط → الدور يروح للخصم.
 * - الفائز = اللي يخلّص كل الأرقام (١..N) الأول.
 * - ممنوع auto-advance: كل تغيير في الحالة بييجي من فعل لاعب.
 * - بابا بس: عدد الكروت + الوضع + جولة جديدة + الرجوع للمدينة (§4).
 * - لا PeerJS. لا نظام غرف جديد. لا تعديل Firebase Rules.
 * - المكافأة تُقيَّد بـ awarded لمنع التكرار عند Refresh (§10).
 */
const screen = document.getElementById('screen');
let db = null, auth = null, uid = '', roomCode = '', meta = null, shared = null, role = '', serverOffset = 0;
let unsubMeta = null, unsubState = null, unsubOffset = null, overlay = null, frame = null;
let observerBusy = false, startBusy = false, lastConfigSig = '';
const MAX_CARDS = 20, MIN_CARDS = 3;

const currentRoom = () => location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
const childName = () => String(shared?.childName || 'رقية');
const hostName = () => 'بابا';
/* اسم اللاعب التاني: بابا (للبنت) / رقية (للبابا) */
const otherName = () => (role === 'host' ? childName() : hostName());
/* الطرف التاني: host <-> guest */
const otherRole = () => (role === 'host' ? 'guest' : 'host');
const now = () => Date.now() + (Number(serverOffset) || 0);

/* حالة الجولة كاملة (§3) */
function freshMatch(roundId) {
  return {
    v: 1, roundId,
    seed: 1 + Math.floor(Math.random() * 1e6),
    totalCards: 10,
    target: 1,              // الرقم المطلوب دلوقتي (١..totalCards+1)
    turn: 'host',           // صاحب الدور
    mode: 'keep',           // 'keep' = غلط يرجع مكانه (الدور يروح) | 'reset' = كل الكروت ترجع
    scores: { host: 0, guest: 0 },
    champion: null,
    awarded: false,
    /* آخر كارت اتفتح (عشان الجهاز التاني يشوف نفس الحركة) */
    flipSeq: 0, flipNum: 0, flipOk: false, flipBy: ''
  };
}

function cleanup() {
  for (const fn of [unsubMeta, unsubState, unsubOffset]) try { fn?.() } catch { }
  unsubMeta = unsubState = unsubOffset = null; meta = null; shared = null; role = ''; lastConfigSig = '';
}
function updateRole() { role = meta?.hostUid === uid ? 'host' : meta?.guestUid === uid ? 'guest' : ''; }
async function mutate(transform) {
  if (!db || !roomCode || !role) return;
  try { return await runTransaction(ref(db, `rooms/${roomCode}/state`), cur => { if (!cur) return; return transform(cur) }, { applyLocally: false }) }
  catch (e) { console.error('space sync', e); }
}

async function startGame() {
  if (startBusy || role !== 'host' || !meta?.guestUid) return;
  startBusy = true;
  try {
    await mutate(old => {
      if (old.game !== 'lobby') return;
      const rr = (Number(old.round) || 0) + 1;
      return { ...old, game: 'space-v1', phase: 'playing', round: rr, result: null, spaceV1: freshMatch(rr) };
    });
  } finally { startBusy = false }
}

/* ===== 4.1 — كارت صح: الهدف بيتقدّم والدور يفضل معاك (ممنوع auto-advance) ===== */
async function hit(msg) {
  const num = Number(msg.num);
  if (!Number.isInteger(num) || num < 1) return;
  await mutate(s => {
    const g = s.spaceV1;
    if (s.game !== 'space-v1' || s.phase !== 'playing' || !g || g.champion) return;
    if (g.turn !== role) return;                        // مش دورك → نتجاهل (§4)
    const nextTarget = Number(g.target) + 1;
    const done = nextTarget > Number(g.totalCards);
    if (done) {
      /* 🎉 اللي خلّص كل الأعداد هو الفائز */
      const scores = { ...(g.scores || { host: 0, guest: 0 }) };
      scores[role] = (Number(scores[role]) || 0) + 1;
      const global = { ...(s.scores || { host: 0, guest: 0 }) };
      global[role] = (Number(global[role]) || 0) + 1;
      return {
        ...s, scores: global, phase: 'finished', result: role,
        spaceV1: { ...g, target: nextTarget, turn: role, scores, champion: role, awarded: true,
          flipSeq: (Number(g.flipSeq) || 0) + 1, flipNum: num, flipOk: true, flipBy: role }
      };
    }
    /* flipSeq/flipNum/flipOk: عشان الجهاز التاني يشوف الكارت اتفتح (§3) */
    return { ...s, spaceV1: { ...g, target: nextTarget, flipSeq: (Number(g.flipSeq) || 0) + 1, flipNum: num, flipOk: true, flipBy: role } };
  });
}

/* ===== 4.2 — كارت غلط: الدور يروح للخصم ===== */
async function miss(msg) {
  const num = Number(msg.num);
  if (!Number.isInteger(num) || num < 1) return;
  const mode = msg.mode === 'reset' ? 'reset' : 'keep';
  await mutate(s => {
    const g = s.spaceV1;
    if (s.game !== 'space-v1' || s.phase !== 'playing' || !g || g.champion) return;
    if (g.turn !== role) return;                        // مش دورك → نتجاهل (§4)
    /* في وضع «تحدي» الكروت كلها ترجع والهدف يرجع ١ */
    const reset = mode === 'reset';
    return {
      ...s,
      spaceV1: {
        ...g,
        turn: otherRole(),                            // ✅ الدور يروح للخصم
        target: reset ? 1 : Number(g.target),
        mode,
        /* flipSeq/flipNum/flipOk: عشان الجهاز التاني يشوف الغلط (§3) */
        flipSeq: (Number(g.flipSeq) || 0) + 1, flipNum: num, flipOk: false, flipBy: role
      }
    };
  });
}

/* ===== 4.3 — عدد الكروت: بابا بس (جولة جديدة) ===== */
async function setCount(msg) {
  if (role !== 'host') return;
  const count = Number(msg.count);
  if (!Number.isInteger(count) || count < MIN_CARDS || count > MAX_CARDS) return;
  await mutate(s => {
    const g = s.spaceV1;
    if (s.game !== 'space-v1' || !g) return;
    if (Number(g.totalCards) === count) return;
    return { ...s, spaceV1: { ...g, totalCards: count, target: 1, turn: 'host' } };
  });
}

/* ===== 4.4 — الوضع (مبسّط / تحدي): بابا بس ===== */
async function setMode(msg) {
  if (role !== 'host') return;
  const mode = msg.mode === 'reset' ? 'reset' : 'keep';
  await mutate(s => {
    const g = s.spaceV1;
    if (s.game !== 'space-v1' || !g || g.champion) return;
    if (g.mode === mode) return;
    return { ...s, spaceV1: { ...g, mode } };
  });
}

/* ===== 4.5 — جولة جديدة: بابا بس → seed جديد و turnIndex:1 ===== */
async function newRound() {
  if (role !== 'host') return;
  await mutate(s => {
    const g = s.spaceV1;
    if (s.game !== 'space-v1' || !g) return;
    const rr = (Number(s.round) || 0) + 1;
    const m = freshMatch(rr);
    /* نحافظ على عدد الكروت والوضع المختارين */
    m.totalCards = Number(g.totalCards) || 10;
    m.mode = g.mode || 'keep';
    m.seed = 1 + Math.floor(Math.random() * 1e6);
    return { ...s, phase: 'playing', round: rr, result: null, spaceV1: m };
  });
  /* إعادة بناء اللوحة عند الجهازين بتيجي من الـconfig (الـseed اتغيّر) — مش رسالة منفصلة */
}

/* ===== 4.6 — الرجوع للمدينة: بابا بس ===== */
async function goCity() {
  if (role !== 'host') return;
  await mutate(old => old.game === 'space-v1' ? { ...old, game: 'lobby', phase: 'lobby' } : old);
}

/* ===== الواجهة ===== */
function upgradeCard() {
  const card = screen?.querySelector('.game-card-space'); if (!card) return;
  card.setAttribute('data-space-v1-start', '');
  const title = card.querySelector('strong'), desc = card.querySelector('small');
  if (title && title.textContent !== 'مغامرة أرقام الفضاء') title.textContent = 'مغامرة أرقام الفضاء';
  const wanted = 'بالتناوب • رتّب الأرقام من ١ للأكبر';
  if (desc && desc.textContent !== wanted) desc.textContent = wanted;
}
function ensureOverlay() {
  if (overlay && overlay.isConnected) return overlay;
  if (!overlay) {
    overlay = document.createElement('section');
    overlay.id = 'space-v1-overlay'; overlay.className = 'space-v1-overlay'; overlay.hidden = true;
    overlay.innerHTML = '<iframe class="space-v1-frame" src="space-numbers-game.html?v=2" title="مغامرة أرقام الفضاء" loading="eager"></iframe>';
    frame = overlay.querySelector('iframe'); frame.addEventListener('load', () => sendConfig(true));
  }
  /* لو الـDOM اتغيّر تحتنا (إعادة رسم الـhub) نعيد تثبيت الأوفرلاي تاني */
  if (screen?.isConnected) screen.insertAdjacentElement('afterend', overlay);
  else document.body.appendChild(overlay);
  return overlay;
}
function sendConfig(force) {
  const g = shared?.spaceV1;
  if (!frame?.contentWindow || shared?.game !== 'space-v1' || !g || !role) return;
  const cfg = {
    role, childName: childName(), hostName: hostName(), otherName: otherName(),
    roundId: Number(g.roundId) || Number(shared.round) || 0,
    seed: Number(g.seed) || 1,
    totalCards: Number(g.totalCards) || 10,
    target: Number(g.target) || 1,
    turn: g.turn === 'guest' ? 'guest' : 'host',
    mode: g.mode === 'reset' ? 'reset' : 'keep',
    scores: g.scores || { host: 0, guest: 0 },
    champion: g.champion || null,
    flipSeq: Number(g.flipSeq) || 0,
    flipNum: Number(g.flipNum) || 0,
    flipOk: !!g.flipOk,
    flipBy: g.flipBy || ''
  };
  /* مفيش رسالة فاضية: لو الـconfig واحد عن آخر مرة ما نبعتهوش تاني (§ شبكة ضعيفة) */
  const sig = JSON.stringify(cfg);
  if (!force && sig === lastConfigSig) return;
  lastConfigSig = sig;
  frame.contentWindow.postMessage({ type: 'roqaya-space-config', config: cfg }, location.origin);
}
function activate() {
  ensureOverlay();
  document.body.classList.add('space-v1-active');
  screen.setAttribute('aria-hidden', 'true');
  overlay.hidden = false; sendConfig();
}
function deactivate() {
  document.body.classList.remove('space-v1-active');
  screen?.removeAttribute('aria-hidden');
  if (overlay) overlay.hidden = true;
}
function syncUi() {
  if (shared?.game === 'lobby') { deactivate(); upgradeCard(); return }
  if (shared?.game === 'space-v1' && shared?.spaceV1 && role) { activate(); return }
  deactivate();
}
function bindRoom() {
  const next = currentRoom();
  if (next === roomCode && unsubMeta && unsubState) return;
  cleanup(); roomCode = next;
  if (!db || !uid || !roomCode) { syncUi(); return }
  unsubMeta = onValue(ref(db, `rooms/${roomCode}/meta`), snap => { meta = snap.val(); updateRole(); syncUi() });
  unsubState = onValue(ref(db, `rooms/${roomCode}/state`), snap => { shared = snap.val(); updateRole(); syncUi(); sendConfig(); });
  unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), snap => { serverOffset = Number(snap.val()) || 0; sendConfig() });
}

document.addEventListener('click', e => {
  const card = e.target.closest?.('.game-card-space,[data-space-v1-start]');
  if (!card) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
  startGame();
}, true);

addEventListener('message', e => {
  if (e.origin !== location.origin) return;
  const d = e.data || {};
  if (d.type === 'roqaya-space-ready') { sendConfig(true); return }
  if (d.type === 'roqaya-space-hit') { hit(d); return }
  if (d.type === 'roqaya-space-miss') { miss(d); return }
  if (d.type === 'roqaya-space-count') { setCount(d); return }
  if (d.type === 'roqaya-space-mode') { setMode(d); return }
  if (d.type === 'roqaya-space-new') { newRound(); return }
  if (d.type === 'roqaya-space-city') { goCity(); return }
});

const observer = new MutationObserver(() => {
  if (observerBusy) return; observerBusy = true;
  queueMicrotask(() => {
    observerBusy = false;
    if (shared?.game === 'lobby') upgradeCard();
    if (shared?.game === 'space-v1' && shared?.spaceV1) sendConfig();
  });
});
if (screen) observer.observe(screen, { childList: true, subtree: true });
addEventListener('hashchange', bindRoom);
addEventListener('pageshow', () => { bindRoom(); syncUi() });

/* ===== نبض ذاتي: لو الأوفرلاي اتشال أو الـhub اتعاد رسمه، نرجّعه تاني =====
 * مهم على شبكة ضعيفة وبعد Return من الخلفية. */
window.__space = { role: '', roomCode: '', game: '', target: '', turn: '', ready: false };
setInterval(() => {
  const g = shared?.spaceV1;
  window.__space.role = role; window.__space.roomCode = roomCode;
  window.__space.game = shared?.game || ''; window.__space.ready = !!g;
  if (g) { window.__space.target = g.target; window.__space.turn = g.turn; }
  if (shared?.game === 'space-v1' && g && role) {
    if (!overlay || !overlay.isConnected || overlay.hidden) { activate(); return; }
    /* نحدّث الإعدادات لو اتغيّرت (مثل عدد الكروت) */
    if (frame && !overlay.hidden) sendConfig();
  }
}, 1500);

async function boot() {
  for (let i = 0; i < 120 && getApps().length === 0; i++) await new Promise(r => setTimeout(r, 50));
  const app = getApps()[0]; if (!app) return;
  auth = getAuth(app); db = getDatabase(app);
  onAuthStateChanged(auth, user => { uid = user?.uid || ''; bindRoom() });
  bindRoom();
}
boot();
