/* M4.21 — targeted UI fixes
   1) Math Kids: counting numbers sit below the objects instead of covering them.
   2) Math Kids: persistent host-only "city" button.
   3) Arabic Reading: child reads independently — no sentence/word read-aloud button or TTS.
*/
(() => {
  'use strict';

  const ORIGIN = location.origin;
  const installed = new WeakSet();

  function addStyle(doc, id, css) {
    if (!doc || doc.getElementById(id)) return;
    const style = doc.createElement('style');
    style.id = id;
    style.textContent = css;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function installMath(frame) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win || installed.has(frame)) return;
    installed.add(frame);

    addStyle(doc, 'm421-math-style', `
      body.m421-counting .itw{
        aspect-ratio:auto!important;
        min-height:calc(clamp(34px,10vw,49px) + 24px)!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:flex-start!important;
        overflow:visible!important;
      }
      body.m421-counting .itw img{
        width:clamp(34px,10vw,49px)!important;
        height:clamp(34px,10vw,49px)!important;
        flex:0 0 auto!important;
        object-fit:contain!important;
      }
      body.m421-counting .itw .bd{
        position:static!important;
        inset:auto!important;
        margin-top:2px!important;
        width:22px!important;
        height:22px!important;
        flex:0 0 22px!important;
        font-size:.72rem!important;
        line-height:22px!important;
        box-shadow:0 2px 5px rgba(43,35,80,.16)!important;
        z-index:2!important;
      }
      body.m421-counting .itw.gone::after{
        bottom:24px!important;
      }

      .m421-citybar{
        display:flex;
        justify-content:center;
        margin:0 0 8px;
      }
      .m421-citybtn{
        border:2px solid #cfc6f3;
        border-radius:12px;
        background:#fff;
        color:#3f327a;
        padding:7px 15px;
        font:inherit;
        font-size:.72rem;
        font-weight:900;
        cursor:pointer;
        box-shadow:0 2px 0 #d1c9ee;
      }
      .m421-citybtn:active{transform:translateY(1px)}
      .m421-citybar[hidden]{display:none!important}
    `);

    let bar = doc.getElementById('m421-citybar');
    if (!bar) {
      bar = doc.createElement('div');
      bar.id = 'm421-citybar';
      bar.className = 'm421-citybar';
      bar.innerHTML = '<button type="button" class="m421-citybtn">🎡 المدينة</button>';
      const duo = doc.querySelector('.duo');
      if (duo) duo.insertAdjacentElement('afterend', bar);
      else (doc.querySelector('main') || doc.body).prepend(bar);

      bar.querySelector('button')?.addEventListener('click', () => {
        win.parent.postMessage({type:'roqaya-math-city'}, ORIGIN);
      });
    }

    const sync = () => {
      // "me" on hostBox is the reliable role indicator already maintained by the game.
      if (bar) bar.hidden = !doc.querySelector('#hostBox.me');
      doc.body?.classList.toggle('m421-counting', Boolean(doc.querySelector('.itw .bd')));
    };

    const obs = new win.MutationObserver(sync);
    obs.observe(doc.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
    sync();
  }

  function installReading(frame) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win || installed.has(frame)) return;
    installed.add(frame);

    addStyle(doc, 'm421-reading-style', `
      .sent .say,
      button[data-act="say"]{
        display:none!important;
      }
    `);

    function removeReadButtons() {
      doc.querySelectorAll('.sent .say, button[data-act="say"]').forEach(btn => btn.remove());
    }

    // The purpose of this game is independent reading. Keep game SFX,
    // but prevent the browser from reading the displayed word/sentence aloud.
    try {
      const synth = win.speechSynthesis;
      if (synth) {
        synth.cancel?.();
        try {
          Object.defineProperty(synth, 'speak', {
            configurable: true,
            value: function () {}
          });
        } catch (_) {
          try { synth.speak = function () {}; } catch (_) {}
        }
      }
    } catch (_) {}

    const obs = new win.MutationObserver(removeReadButtons);
    obs.observe(doc.body, {childList:true, subtree:true});
    removeReadButtons();
  }

  function inspectFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    const cls = frame.className || '';
    try {
      if (cls.includes('math-kids-v1-frame')) installMath(frame);
      if (cls.includes('reading-v1-frame')) installReading(frame);
    } catch (_) {
      // Same-origin pages should be accessible. If the iframe is still loading,
      // the load listener below will retry.
    }
  }

  function scan() {
    document.querySelectorAll('iframe.math-kids-v1-frame, iframe.reading-v1-frame').forEach(frame => {
      inspectFrame(frame);
      if (!frame.dataset.m421LoadBound) {
        frame.dataset.m421LoadBound = '1';
        frame.addEventListener('load', () => {
          installed.delete(frame);
          inspectFrame(frame);
        });
      }
    });
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  addEventListener('pageshow', scan);
  scan();
})();
