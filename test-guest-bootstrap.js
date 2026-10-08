/* test-guest bootstrap — runs the SAME app.js as a second Firebase client. */
(async () => {
  const status = document.getElementById('test-guest-status');

  function fail(text, error){
    console.error(error || text);
    if (status) status.innerHTML = `<strong>⚠️ ${text}</strong><small>اقفل التاب وجرّب وضع الاختبار من شاشة بابا مرة تانية.</small>`;
  }

  try {
    const response = await fetch(`app.js?v=m4-test-${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error(`app.js HTTP ${response.status}`);
    let source = await response.text();

    const authImport = "import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';";
    const testAuthImport = "import { getAuth, signInAnonymously, initializeAuth, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';";
    if (!source.includes(authImport)) throw new Error('Firebase auth import signature changed');
    source = source.replace(authImport, testAuthImport);

    const configAbs = new URL('firebase-config.js', location.href).href;
    source = source.replace("from './firebase-config.js';", `from '${configAbs}';`);

    const initOriginal = "const app=initializeApp(firebaseConfig);\\n    auth=getAuth(app);db=getDatabase(app);";
    const initTest = "const app=initializeApp(firebaseConfig,'roqaya-test-guest');\\n    auth=initializeAuth(app,{persistence:browserLocalPersistence});db=getDatabase(app);";
    if (!source.includes(initOriginal)) throw new Error('Firebase initialization signature changed');
    source = source.replace(initOriginal, initTest);

    const blob = new Blob([source], {type:'text/javascript'});
    const blobUrl = URL.createObjectURL(blob);
    await import(blobUrl);

    // Load the two additive upgrades after the main app initialized its named Firebase app.
    await import('./m4-4-number-puzzle.js?v=1');

    let tries = 0;
    const autoJoin = setInterval(() => {
      const invitation = location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1];
      if (!invitation) {
        clearInterval(autoJoin);
        fail('رابط غرفة الاختبار ناقص.');
        return;
      }

      // If the main app already entered the room, the join button disappears.
      if (document.querySelector('.scoreboard') || document.body.classList.contains('lobby-view')) {
        clearInterval(autoJoin);
        if (status) {
          status.innerHTML = '<strong>🧪 رقية التجريبية</strong><small>دي شاشة رقية الحقيقية للاختبار • بدّل لتاب بابا وقت ما تحب</small>';
        }
        return;
      }

      const input = document.getElementById('room-input');
      const join = document.querySelector('[data-action="join"]');
      if (input && join && !join.disabled) {
        input.value = invitation;
        join.click();
      }

      if (++tries > 180) {
        clearInterval(autoJoin);
        fail('رقية التجريبية ماقدرتش تدخل الغرفة. ممكن تكون الغرفة فيها لاعب تاني.');
      }
    }, 100);

    addEventListener('beforeunload', () => URL.revokeObjectURL(blobUrl), {once:true});
  } catch (error) {
    fail('تعذر تشغيل رقية التجريبية.', error);
  }
})();
