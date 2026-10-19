import { getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

/* M4.26 — «لاقوا الاختلافات سوا» (Spot the difference)
 * لعبة تعاونية: الاتنان يدوّران معاً، وأي اختلاف يلقيه أحدهما يُحتسب له ويظهر عند الاثنين فوراً.
 * - المضيف فقط يبني الاختلافات من Seed ويحرسها (نفس الصورة/التوزيع على الجهازين — §2).
 * - لا نظام غرف جديد: نفس غرفة عالم رقية + نفس الحالة (state.spotV1).
 * - لا PeerJS. لا تعديل قواعد Firebase.
 * - التلميح والمستوى وعدد الاختلافات والرجوع للمدينة = عند بابا فقط (§4).
 * - المكافأة العامة (state.scores) تُقيَّد بـawarded لمنع التكرار عند Refresh (§10).
 */
const screen = document.getElementById('screen');
let db = null, auth = null, uid = '', roomCode = '', meta = null, shared = null, role = '', serverOffset = 0;
let unsubMeta = null, unsubState = null, unsubOffset = null, overlay = null, frame = null;
let observerBusy = false, startBusy = false, readyBusy = false;
const WIN_SCORE = 10, MAX_DIFFS = 12, LEVELS_COUNT = 10;

const currentRoom = () => location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
const childName = () => String(shared?.childName || 'رقية');
const otherName = () => (role === 'host' ? 'اللاعب التاني' : childName());
const now = () => Date.now() + (Number(serverOffset) || 0);

function seed() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] & 0x7fffffff } catch { return Math.floor(Math.random() * 0x7fffffff) } }

function freshRound(n, lvl, level, count) {
  return { n, lvl, level, count, d: null, found: Array(count).fill(0), hints: 3, startAt: now() + 2500, doneAt: 0 };
}
function freshMatch(roundId) {
  return { v: 1, roundId, winScore: WIN_SCORE, level: 1, count: 5, lvl: 0, seed: seed(),
           scores: { host: 0, guest: 0 }, champion: null, awarded: false, foundTotal: 0, round: null };
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
      return { ...old, game: 'spot-v1', phase: 'playing', round: rr, result: null, spotV1: freshMatch(rr) };
    });
  } finally { startBusy = false }
}

/* [المضيف] يجهّز الصورة التالية. الاختلافات تُبنى في الـiframe (لأنها تحتاج البكسلات) ثم تُحرَّس هنا. */
async function commitRound(roundId, o) {
  if (role !== 'host') return;
  if (!o || !Number.isInteger(o.n) || !Number.isInteger(o.lvl) || o.lvl < 0 || o.lvl >= LEVELS_COUNT) return;
  if (!Number.isInteger(o.level) || o.level < 0 || o.level > 3) return;
  if (!Array.isArray(o.d) || o.d.length < 1 || o.d.length > MAX_DIFFS) return;
  await mutate(old => {
    const g = old.spotV1;
    if (old.game !== 'spot-v1' || old.phase !== 'playing' || !g || g.champion) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    const cur = g.round;
    if (cur && Number(o.n) < Number(cur.n)) return;                 // جولة قديمة وصلت متأخرة
    if (cur && Number(o.n) === Number(cur.n) && Array.isArray(cur.d)) return;   // مكرر
    const count = o.d.length;
    const r = { n: o.n, lvl: o.lvl, level: o.level, count, d: o.d, found: Array(count).fill(0), hints: 3, startAt: now() + 1500, doneAt: 0 };
    return { ...old, spotV1: { ...g, level: o.level, count, lvl: o.lvl, round: r } };
  });
}

/* أي لاعب يلاقي اختلافاً → يُسجَّل له في الحالة المشتركة (يعمل من الجهازين) */
async function claim(index, roundId) {
  if (!Number.isInteger(index)) return;
  await mutate(old => {
    const g = old.spotV1, r = g?.round;
    if (old.game !== 'spot-v1' || old.phase !== 'playing' || !g || g.champion || !r) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    if (!Array.isArray(r.d) || index < 0 || index >= r.d.length) return;
    if (now() < Number(r.startAt || 0)) return;                      // لا تحتسب قبل بدء الجولة
    if (r.found?.[index]) return;                                   // محسوب بالفعل (§10)
    const found = [...(r.found || Array(r.d.length).fill(0))];
    const me = role === 'host' ? 1 : 2;
    found[index] = me;
    const scores = { ...(g.scores || { host: 0, guest: 0 }) };
    const global = { ...(old.scores || { host: 0, guest: 0 }) };
    scores[role] = (Number(scores[role]) || 0) + 1;
    global[role] = (Number(global[role]) || 0) + 1;
    const foundTotal = Number(g.foundTotal || 0) + 1;
    const all = found.every(Boolean);
    const champion = scores[role] >= Number(g.winScore || WIN_SCORE) ? role : null;
    const award = !!(champion && !g.awarded);
    return {
      ...old,
      scores: global,
      phase: champion ? 'finished' : 'playing',
      ...(champion ? { result: champion } : {}),
      spotV1: {
        ...g, scores, foundTotal, champion,
        awarded: g.awarded || !!(champion || all),
        round: { ...r, found, doneAt: all && !r.doneAt ? now() : r.doneAt }
      }
    };
  });
}

/* [المضيف] تلميح: يستهلك تلميحاً ويُعلن رقم الاختلاف للطرفين */
async function useHint(roundId) {
  if (role !== 'host') return;
  await mutate(old => {
    const g = old.spotV1, r = g?.round;
    if (old.game !== 'spot-v1' || old.phase !== 'playing' || !g || g.champion || !r) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    if (Number(r.hints || 0) <= 0) return;
    return { ...old, spotV1: { ...g, round: { ...r, hints: Number(r.hints) - 1 } } };
  });
}

async function requestNext(roundId, lvl) {
  if (role !== 'host') return;
  if (!Number.isInteger(lvl) || lvl < 0 || lvl >= LEVELS_COUNT) return;
  await mutate(old => {
    const g = old.spotV1, r = g?.round;
    if (old.game !== 'spot-v1' || old.phase !== 'playing' || !g || !r) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    return { ...old, spotV1: { ...g, lvl, round: { ...r, pendingLvl: lvl } } };
  });
}

async function setConfig(roundId, level, count) {
  if (role !== 'host') return;
  if (!Number.isInteger(level) || level < 0 || level > 3) return;
  if (!Number.isInteger(count) || count < 3 || count > MAX_DIFFS) return;
  await mutate(old => {
    const g = old.spotV1;
    if (old.game !== 'spot-v1' || !g) return;
    if (Number(g.roundId) !== Number(roundId)) return;
    return { ...old, spotV1: { ...g, level, count } };
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
    return { ...old, phase: 'playing', round: rr, result: null, spotV1: freshMatch(rr) };
  });
}

/* ===== الواجهة ===== */
function upgradeCard() {
  const card = screen?.querySelector('.game-card-spot'); if (!card) return;
  card.setAttribute('data-spot-v1-start', '');
  const title = card.querySelector('strong'), desc = card.querySelector('small');
  if (title && title.textContent !== 'لاقوا الاختلافات سوا') title.textContent = 'لاقوا الاختلافات سوا';
  const wanted = 'دوّروا معاً • اللي يلاقي ياخد نقطة • ١٠ صور';
  if (desc && desc.textContent !== wanted) desc.textContent = wanted;
}
function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('section');
  overlay.id = 'spot-v1-overlay'; overlay.className = 'spot-v1-overlay'; overlay.hidden = true;
  overlay.innerHTML = '<iframe class="spot-v1-frame" src="spot-game.html?v=1" title="لاقوا الاختلافات سوا" loading="eager"></iframe>';
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
      level: Number(g.level) || 1,
      count: Number(g.count) || 5,
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
  if (d.type === 'roqaya-spot-new') { commitRound(Number(d.roundId), d); return }
  if (d.type === 'roqaya-spot-find') { claim(Number(d.index), Number(d.roundId)); return }
  if (d.type === 'roqaya-spot-hint') { useHint(Number(d.roundId)); return }
  if (d.type === 'roqaya-spot-request') { requestNext(Number(d.roundId), Number(d.lvl)); return }
  if (d.type === 'roqaya-spot-config') { setConfig(Number(d.roundId), Number(d.level), Number(d.count)); return }
  if (d.type === 'roqaya-spot-rematch') { rematch(Number(d.roundId)); return }
  if (d.type === 'roqaya-spot-city') { goCity(); return }
});

const observer = new MutationObserver(() => {
  if (observerBusy) return; observerBusy = true;
  queueMicrotask(() => { observerBusy = false; if (shared?.game === 'lobby') upgradeCard(); if (shared?.game === 'spot-v1' && shared?.spotV1) sendConfig() });
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
