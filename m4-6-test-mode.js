/* M4.6 — Papa Solo Test Mode
   Creates a normal host room, then opens a real second Firebase anonymous client
   in test-guest.html. This lets one person test both بابا and رقية flows on one device.
*/
(() => {
  if (/\/test-guest\.html$/i.test(location.pathname)) return;

  const screen = document.getElementById('screen');
  const message = document.getElementById('message');
  if (!screen) return;

  const TEST_KEY = 'roqaya-solo-test-host';
  const TEST_WINDOW = 'roqayaTestGuest';
  let opening = false;
  let timer = null;

  const roomCode = () => location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
  const isTestHost = () => sessionStorage.getItem(TEST_KEY) === '1';

  function note(text, ms=3200){
    if (!message) return;
    message.hidden = !text;
    message.textContent = text || '';
    if (text && ms) setTimeout(() => {
      if (message.textContent === text) {
        message.hidden = true;
        message.textContent = '';
      }
    }, ms);
  }

  function guestUrl(code){
    const u = new URL('test-guest.html', location.href);
    u.search = '';
    u.hash = `room=${code}`;
    return u.href;
  }

  function openBlankGuest(){
    const w = window.open('about:blank', TEST_WINDOW);
    if (w) {
      try {
        w.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;background:#f8effb;text-align:center;padding:40px 14px"><h2>🧪 بنجهّز رقية التجريبية…</h2><p>سيتم فتح الغرفة تلقائيًا.</p></body></html>`);
        w.document.close();
      } catch (_) {}
    }
    return w;
  }

  function navigateGuestWindow(w, code){
    if (!code) return false;
    const url = guestUrl(code);
    try {
      if (w && !w.closed) w.location.replace(url);
      else window.open(url, TEST_WINDOW);
      return true;
    } catch (_) {
      window.open(url, TEST_WINDOW);
      return true;
    }
  }

  function waitForRoom(w){
    clearInterval(timer);
    let tries = 0;
    timer = setInterval(() => {
      const code = roomCode();
      if (code) {
        clearInterval(timer);
        timer = null;
        opening = false;
        navigateGuestWindow(w, code);
        note('🧪 اتفتحت شاشة رقية التجريبية في تاب تاني. بدّل بين التابين واختبر براحتك.', 5200);
        sync();
        return;
      }
      if (++tries > 120) {
        clearInterval(timer);
        timer = null;
        opening = false;
        try { if (w && !w.closed) w.close(); } catch (_) {}
        note('ماقدرتش أنشئ غرفة الاختبار. تأكد من الاسم والإنترنت وجرب تاني.', 5000);
      }
    }, 100);
  }

  function startSoloTest(){
    if (opening) return;
    opening = true;
    sessionStorage.setItem(TEST_KEY, '1');

    const current = roomCode();
    const w = openBlankGuest();

    if (current) {
      opening = false;
      navigateGuestWindow(w, current);
      sync();
      return;
    }

    const create = screen.querySelector('[data-action="create"]');
    if (!create || create.disabled) {
      opening = false;
      try { if (w && !w.closed) w.close(); } catch (_) {}
      note('ارجع لشاشة البداية واضغط وضع الاختبار من هناك.', 4000);
      return;
    }

    create.click();
    waitForRoom(w);
  }

  function openGuestForCurrentRoom(){
    const code = roomCode();
    if (!code) return startSoloTest();
    sessionStorage.setItem(TEST_KEY, '1');
    const w = openBlankGuest();
    navigateGuestWindow(w, code);
    sync();
  }

  function stopSoloTest(){
    sessionStorage.removeItem(TEST_KEY);
    const u = new URL(location.href);
    u.hash = '';
    u.search = '';
    location.replace(u.href);
  }

  function injectHomeButton(){
    if (roomCode()) return;
    const actions = screen.querySelector('.hub-entry-actions');
    if (!actions || actions.querySelector('[data-solo-test-start]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn soft solo-test-start';
    button.dataset.soloTestStart = '1';
    button.innerHTML = '🧪 <strong>اختبار لوحدي</strong><small>يفتح بابا + رقية التجريبية على نفس الجهاز</small>';
    actions.append(button);
  }

  function injectWaitingButton(){
    const code = roomCode();
    if (!code || isTestHost()) return;
    const roomLine = screen.querySelector('.hub-room-line');
    if (!roomLine) return;
    const card = roomLine.closest('.hub-stage-caption,.hub-stage-caption-static');
    if (!card || card.querySelector('[data-solo-test-open]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn soft solo-test-open';
    button.dataset.soloTestOpen = '1';
    button.textContent = '🧪 افتح رقية التجريبية بدل ما تبعت الدعوة';
    roomLine.after(button);
  }

  function ensureBadge(){
    let badge = document.getElementById('solo-test-badge');
    if (!isTestHost() || !roomCode()) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'solo-test-badge';
      badge.className = 'solo-test-badge';
      badge.innerHTML = `
        <span>🧪 وضع اختبار بابا</span>
        <button type="button" data-solo-test-open>👧 شاشة رقية</button>
        <button type="button" data-solo-test-stop>✕ إنهاء</button>
      `;
      document.body.append(badge);
    }
  }

  function sync(){
    injectHomeButton();
    injectWaitingButton();
    ensureBadge();
  }

  document.addEventListener('click', e => {
    const start = e.target.closest?.('[data-solo-test-start]');
    if (start) {
      e.preventDefault();
      e.stopPropagation();
      startSoloTest();
      return;
    }
    const open = e.target.closest?.('[data-solo-test-open]');
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      openGuestForCurrentRoom();
      return;
    }
    const stop = e.target.closest?.('[data-solo-test-stop]');
    if (stop) {
      e.preventDefault();
      e.stopPropagation();
      stopSoloTest();
    }
  }, true);

  new MutationObserver(() => queueMicrotask(sync)).observe(screen, {childList:true,subtree:true});
  addEventListener('hashchange', sync);
  addEventListener('pageshow', sync);
  sync();
})();
