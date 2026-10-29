/* M4.5 — Replace the old in-app jigsaw UI with the supplied "لعبة تكوين الصور".
   The supplied game runs locally inside a persistent same-origin iframe, so بابا
   and رقية each have an independent board and cannot corrupt each other's pieces.
*/
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return;

  let overlay = null;
  let iframe = null;
  let observer = null;
  let fitting = false;

  function cardUpgrade() {
    const card = screen.querySelector('.game-card-jigsaw');
    if (!card) return;
    const title = card.querySelector('strong');
    const desc = card.querySelector('small');
    if (title && title.textContent !== 'لعبة تكوين الصور') title.textContent = 'لعبة تكوين الصور';
    if (desc && desc.textContent !== '٩ / ١٦ / ٢٥ قطعة • Jigsaw حقيقي') desc.textContent = '٩ / ١٦ / ٢٥ قطعة • Jigsaw حقيقي';
  }

  function hostCanReturn() {
    return Boolean(screen.querySelector('.jigsaw-panel [data-action="lobby"]'));
  }

  function fitFrame() {
    if (!iframe?.contentDocument || fitting) return;
    fitting = true;
    try {
      const doc = iframe.contentDocument;
      const body = doc.body;
      if (!body) return;
      let style = doc.getElementById('roqaya-embed-style');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'roqaya-embed-style';
        style.textContent = `
          html,body{min-height:0!important}
          body{justify-content:flex-start!important;padding-top:10px!important}
        `;
        doc.head.append(style);
      }
      const height = Math.max(620, Math.ceil(doc.documentElement.scrollHeight || body.scrollHeight || 620) + 8);
      iframe.style.height = height + 'px';
    } catch (_) {
      iframe.style.height = '900px';
    } finally {
      fitting = false;
    }
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('section');
    overlay.id = 'jigsaw-v2-overlay';
    overlay.className = 'jigsaw-v2-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="jigsaw-v2-toolbar">
        <strong>🧩 لعبة تكوين الصور</strong>
        <div class="jigsaw-v2-toolbar-actions">
          <span class="jigsaw-v2-independent">لوح مستقل لكل لاعب</span>
          <button type="button" class="btn soft jigsaw-v2-city">🎡 المدينة</button>
        </div>
      </div>
      <iframe
        class="jigsaw-v2-frame"
        src="jigsaw-game.html?v=1"
        title="لعبة تكوين الصور"
        loading="eager"
        allow="fullscreen"
      ></iframe>
    `;
    screen.insertAdjacentElement('afterend', overlay);
    iframe = overlay.querySelector('.jigsaw-v2-frame');

    overlay.querySelector('.jigsaw-v2-city').addEventListener('click', () => {
      const original = screen.querySelector('.jigsaw-panel [data-action="lobby"]');
      if (original) original.click();
    });

    iframe.addEventListener('load', () => {
      fitFrame();
      try {
        const doc = iframe.contentDocument;
        if (doc?.body && 'ResizeObserver' in window) {
          new ResizeObserver(fitFrame).observe(doc.body);
        }
      } catch (_) {}
    });
    return overlay;
  }

  function activate() {
    ensureOverlay();
    document.body.classList.add('jigsaw-v2-active');
    screen.setAttribute('aria-hidden', 'true');
    overlay.hidden = false;

    const city = overlay.querySelector('.jigsaw-v2-city');
    const independent = overlay.querySelector('.jigsaw-v2-independent');
    const host = hostCanReturn();
    city.hidden = !host;
    if (independent) {
      independent.textContent = host
        ? '👨 بابا: لوح مستقل • رقية: لوح مستقل'
        : '👧 بازلِك مستقل عن بازل بابا';
    }
    requestAnimationFrame(fitFrame);
  }

  function deactivate() {
    document.body.classList.remove('jigsaw-v2-active');
    screen.removeAttribute('aria-hidden');
    if (overlay) overlay.hidden = true;
  }

  function sync() {
    cardUpgrade();
    if (screen.querySelector('.jigsaw-panel')) activate();
    else deactivate();
  }

  observer = new MutationObserver(() => queueMicrotask(sync));
  observer.observe(screen, {childList:true, subtree:true});
  window.addEventListener('pageshow', sync);
  window.addEventListener('resize', () => {
    if (document.body.classList.contains('jigsaw-v2-active')) fitFrame();
  });
  sync();
})();
