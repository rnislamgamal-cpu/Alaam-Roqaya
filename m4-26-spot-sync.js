import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

/* M4.26 — «لاقوا الاختلافات سوا» (Spot the difference) — نسخة مبسّطة
 * - الصور جاهزة (10 أزواج أصلية/معدّلة) → مفيش توليد على الجهاز، مفيش صفحة بيضاء.
 * - الإحداثيات ثابتة في spots-data.js → نفس الإحداثيات على الجهازين بالظبط (§2).
 * - الاتنان يشوفوا نفس الصورتين ويدوّروا في نفس الوقت؛ اللي يلاقي ياخد نقطة (§3).
 * - بابا بس: الصورة اللي بعدها + الرجوع للمدينة (§4).
 * - لا PeerJS. لا نظام غرف جديد. لا تعديل Firebase Rules.
 * - المكافأة تُقيَّد بـ awarded لمنع التكرار عند Refresh (§10).
 */
const screen = document.getElementById('screen');
let db = null, auth = null, uid = '', roomCode = '', meta = null, shared = null, role = '', serverOffset = 0;
let unsubMeta = null, unsubState = null, unsubOffset = null, overlay = null, frame = null;
let observerBusy = false, startBusy = false;
const WIN_SCORE = 5, PAIRS = 10;
/* عدد الاختلافات لكل صورة (مطابق للدليل الرسمي) */
const SPOT_COUNTS = [5, 6, 7, 8, 9, 10, 12, 12, 14, 15];

const currentRoom = () => location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
const childName = () => String(shared?.childName || 'رقية');
const otherName = () => (role === 'host' ? 'اللاعب التاني' : childName());
const now = () => Date.now() + (Number(serverOffset) || 0);

function freshMatch(roundId) {
  return {
    v: 2, roundId, winScore: WIN_SCORE,
    scores: { host: 0, guest: 0 },
    champion: null, awarded: false, foundTotal: 0,
    lvl: 0, round: null
  };
}
/* جولة جديدة: الصورة رقم lvl (0-based). الإحداثيات تُقرأ في الـiframe من spots-data.js */
function freshRound(n, lvl, count) {
  return { n, lvl, count, spots: null, found: Array(count).fill(0), startAt: now() + 1200, doneAt: 0 };
}

function cleanup() {
  for (const fn of [unsubMeta, unsubState, unsubOffset]) try { fn?.() } catch { }
  unsubMeta = unsubState = unsubOffset = null; meta = null; shared = null; role = '';
}
function updateRole() { role = meta?.hostUid === uid ? 'host' : meta?.guestUid === uid ? 'guest' : ''; }
async function mutate(transform) {
  if (!db || !roomCode || !role) return;
  try { return await runTransaction(ref(db, `rooms/${roomCode}/state`), cur => { if (!cur) return; return transform(cur) }, { applyLocally: false }) }
  catch (e) { console.warn('spot sync', e) }
}

async function startGame() {
  if (startBusy || role !== 'host' || !meta?.guestUid) return;
  startBusy = true;
  try {
    await mutate(old => {
      if (old.game !== 'lobby') return;
      const rr = (Number(old.round) || 0) + 1;
      const m = freshMatch(rr);
      // ابدأ بأول صورة (٥ اختلافات)
      m.lvl = 0;
      m.round = freshRound(1, 0, SPOT_COUNTS[0]);
      return { ...old, game: 'spot-v1', phase: 'playing', round: rr, result: null, spotV1: m };
    });
  } finally { startBusy = false }
}

/* [المضيف] الصورة التالية */
async function requestNext(roundId, lvl) {
  if (role !== 'host') return;
  if (!Number.isInteger(lvl) || lvl < 0 || lvl >= PAIRS) return;
  const count = SPOT_COUNTS[lvl];
  await mutate(old => {
    const g = old.spotV1, r = g?.round;
    if (old.game !== 'spot-v1' || old.phase !== 'playing' || !g || g.champion || !r) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    const n = Number(r.n) + 1;
    return {
      ...old,
      spotV1: { ...g, lvl, round: freshRound(n, lvl, count) }
    };
  });
}

/* أي لاعب يلاقي اختلافاً → يُسجَّل له في الحالة المشتركة */
async function claim(index, roundId) {
  if (!Number.isInteger(index) || index < 0) return;
  await mutate(old => {
    const g = old.spotV1, r = g?.round;
    if (old.game !== 'spot-v1' || old.phase !== 'playing' || !g || g.champion || !r) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    if (index >= Number(r.count || 0)) return;
    if (r.found?.[index]) return;                    // محسوب بالفعل (§10)
    const found = [...(r.found || Array(r.count).fill(0))];
    const who = role === 'host' ? 1 : 2;
    found[index] = who;
    const scores = { ...(g.scores || { host: 0, guest: 0 }) };
    const global = { ...(old.scores || { host: 0, guest: 0 }) };
    scores[role] = (Number(scores[role]) || 0) + 1;
    global[role] = (Number(global[role]) || 0) + 1;
    const all = found.every(Boolean);
    const champion = scores[role] >= Number(g.winScore || WIN_SCORE) ? role : null;
    return {
      ...old,
      scores: global,
      phase: champion ? 'finished' : 'playing',
      ...(champion ? { result: champion } : {}),
      spotV1: {
        ...g, scores, foundTotal: Number(g.foundTotal || 0) + 1, champion,
        awarded: g.awarded || !!(champion || all),
        round: { ...r, found, doneAt: all && !r.doneAt ? now() : r.doneAt }
      }
    };
  });
}

async function goCity() {
  if (role !== 'host') return;
  await mutate(old => old.game === 'spot-v1' ? { ...old, game: 'lobby', phase: 'lobby' } : old);
}
async function rematch(roundId) {
  if (role !== 'host') return;
  await mutate(old => {
    const g = old.spotV1;
    if (old.game !== 'spot-v1' || !g || !g.champion) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    const rr = (Number(old.round) || 0) + 1;
    const m = freshMatch(rr);
    m.round = freshRound(1, 0, SPOT_COUNTS[0]);
    return { ...old, phase: 'playing', round: rr, result: null, spotV1: m };
  });
}

/* ===== الواجهة ===== */
function upgradeCard() {
  const card = screen?.querySelector('.game-card-spot'); if (!card) return;
  card.setAttribute('data-spot-v1-start', '');
  const title = card.querySelector('strong'), desc = card.querySelector('small');
  if (title && title.textContent !== 'لاقوا الاختلافات') title.textContent = 'لاقوا الاختلافات';
  const wanted = 'دوّروا معاً • اللي يلاقي ياخد نقطة';
  if (desc && desc.textContent !== wanted) desc.textContent = wanted;
}
function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('section');
  overlay.id = 'spot-v1-overlay'; overlay.className = 'spot-v1-overlay'; overlay.hidden = true;
  overlay.innerHTML = '<iframe class="spot-v1-frame" src="spot-game.html?v=2" title="لاقوا الاختلافات" loading="eager"></iframe>';
  screen.insertAdjacentElement('afterend', overlay);
  frame = overlay.querySelector('iframe'); frame.addEventListener('load', sendConfig);
  return overlay;
}
function sendConfig() {
  const g = shared?.spotV1;
  if (!frame?.contentWindow || shared?.game !== 'spot-v1' || !g || !role) return;
  frame.contentWindow.postMessage({
    type: 'roqaya-spot-config',
    config: {
      role, childName: childName(), otherName: otherName(),
      roundId: Number(g.roundId) || Number(shared.round) || 0,
      round: g.round || null,
      scores: g.scores || { host: 0, guest: 0 },
      champion: g.champion || null,
      winScore: Number(g.winScore) || WIN_SCORE,
      serverOffset: Number(serverOffset) || 0
    }
  }, location.origin);
}
function activate() {
  ensureOverlay();
  document.body.classList.add('spot-v1-active');
  screen.setAttribute('aria-hidden', 'true');
  overlay.hidden = false; sendConfig();
}
function deactivate() {
  document.body.classList.remove('spot-v1-active');
  screen?.removeAttribute('aria-hidden');
  if (overlay) overlay.hidden = true;
}
function syncUi() {
  if (shared?.game === 'lobby') { deactivate(); upgradeCard(); return }
  if (shared?.game === 'spot-v1' && shared?.spotV1 && role) { activate(); return }
  deactivate();
}
function bindRoom() {
  const next = currentRoom();
  if (next === roomCode && unsubMeta && unsubState) return;
  cleanup(); roomCode = next;
  if (!db || !uid || !roomCode) { syncUi(); return }
  unsubMeta = onValue(ref(db, `rooms/${roomCode}/meta`), snap => { meta = snap.val(); updateRole(); syncUi() });
  unsubState = onValue(ref(db, `rooms/${roomCode}/state`), snap => { shared = snap.val(); updateRole(); syncUi() });
  unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), snap => { serverOffset = Number(snap.val()) || 0; sendConfig() });
}

document.addEventListener('click', e => {
  const card = e.target.closest?.('.game-card-spot,[data-spot-v1-start]');
  if (!card) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
  startGame();
}, true);

addEventListener('message', e => {
  if (e.origin !== location.origin) return;
  const d = e.data || {};
  if (d.type === 'roqaya-spot-ready') { sendConfig(); return }
  if (d.type === 'roqaya-spot-find') { claim(Number(d.index), Number(d.roundId)); return }
  if (d.type === 'roqaya-spot-request') { requestNext(Number(d.roundId), Number(d.lvl)); return }
  if (d.type === 'roqaya-spot-rematch') { rematch(Number(d.roundId)); return }
  if (d.type === 'roqaya-spot-city') { goCity(); return }
});

const observer = new MutationObserver(() => {
  if (observerBusy) return; observerBusy = true;
  queueMicrotask(() => {
    observerBusy = false;
    if (shared?.game === 'lobby') upgradeCard();
    if (shared?.game === 'spot-v1' && shared?.spotV1) sendConfig();
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
