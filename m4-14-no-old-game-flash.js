/* M4.14 — hides legacy renderers during hand-off to replacement games.
   Loaded before app.js so the old UI never reaches a painted frame. */
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return;

  const body = document.body;
  const ACTIVE_CLASSES = [
    'memory-v2-active',
    'snakes-v2-active',
    'jigsaw-sync-active',
    'draw-v2-active'
  ];

  let pending = '';
  let safetyTimer = null;

  const cover = document.createElement('div');
  cover.id = 'game-switch-cover';
  cover.className = 'game-switch-cover';
  cover.setAttribute('aria-live', 'polite');
  cover.innerHTML = '<div class="game-switch-cover-card"><span>🎮</span><strong>بنجهّز اللعبة…</strong><small>لحظة واحدة</small></div>';
  screen.insertAdjacentElement('afterend', cover);

  function anyReplacementActive() {
    return ACTIVE_CLASSES.some(cls => body.classList.contains(cls));
  }

  function clearGuard() {
    pending = '';
    screen.classList.remove('external-game-transition');
    cover.classList.remove('show');
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
  }

  function guard(kind) {
    if (anyReplacementActive()) {
      clearGuard();
      return;
    }
    pending = kind;
    screen.classList.add('external-game-transition');
    cover.classList.add('show');

    if (safetyTimer) clearTimeout(safetyTimer);
    // Never trap the user if a replacement module genuinely fails to start.
    safetyTimer = setTimeout(() => {
      if (!anyReplacementActive() && pending === kind) clearGuard();
    }, 2500);
  }

  function inspect() {
    // The number puzzle is rendered directly into #screen rather than an iframe.
    if (screen.querySelector('.number-puzzle-panel')) {
      clearGuard();
      return;
    }

    // Once an iframe replacement is active, body CSS owns visibility.
    if (anyReplacementActive()) {
      clearGuard();
      return;
    }

    // Legacy renderers that have replacement versions.
    if (screen.querySelector('.memory-grid')) {
      guard('memory');
      return;
    }
    if (screen.querySelector('.snakes-panel')) {
      guard('snakes');
      return;
    }
    if (screen.querySelector('.jigsaw-panel')) {
      guard('jigsaw');
      return;
    }
    if (screen.querySelector('.drawing-wrap') || screen.querySelector('#drawing')) {
      guard('draw');
      return;
    }

    // Core app does not know the externally-added number puzzle and briefly
    // renders its generic "unknown game" message. Hide that hand-off too.
    const text = screen.textContent || '';
    if (text.includes('اللعبة غير معروفة')) {
      guard('number-puzzle');
      return;
    }

    // Normal hub/lobby/school screens should always remain visible.
    if (
      screen.querySelector('.lobby-panel') ||
      screen.querySelector('.hub-stage') ||
      screen.querySelector('.school-frame-shell')
    ) {
      clearGuard();
    }
  }

  const screenObserver = new MutationObserver(inspect);
  screenObserver.observe(screen, {childList:true, subtree:true});

  const bodyObserver = new MutationObserver(() => {
    if (anyReplacementActive()) clearGuard();
    else inspect();
  });
  bodyObserver.observe(body, {attributes:true, attributeFilter:['class']});

  addEventListener('pageshow', inspect);
  inspect();
})();
