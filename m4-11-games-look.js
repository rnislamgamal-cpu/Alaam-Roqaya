/* M4.11 — redesign game library from supplied mobile mockup */
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return;
  const ICONS = {"ttt":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fy\" x=\"6\" y=\"6\" width=\"52\" height=\"52\" rx=\"10\"></rect><path d=\"M23 8v48M41 8v48M8 23h48M8 41h48\"></path><path class=\"sr\" d=\"M12 12l9 9m0-9l-9 9\"></path><circle class=\"sb\" cx=\"48.5\" cy=\"48.5\" r=\"5\"></circle></svg>","snakes":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"sk\" d=\"M11 58V8M27 58V8\"></path><path class=\"sn\" d=\"M11 58V8M27 58V8\"></path><path class=\"sk\" style=\"stroke-width:9\" d=\"M11 20h16M11 32h16M11 44h16\"></path><path class=\"sn\" style=\"stroke-width:3.5\" d=\"M11 20h16M11 32h16M11 44h16\"></path><path class=\"sk\" d=\"M50 56c-12 0-16-8-8-12s14-4 12-12-12-6-8-16\"></path><path class=\"sg\" d=\"M50 56c-12 0-16-8-8-12s14-4 12-12-12-6-8-16\"></path><circle class=\"fg\" cx=\"46\" cy=\"13\" r=\"8\"></circle><circle class=\"fw\" cx=\"43\" cy=\"11\" r=\"2.6\" style=\"stroke-width:1.5\"></circle><circle class=\"fw\" cx=\"49\" cy=\"11\" r=\"2.6\" style=\"stroke-width:1.5\"></circle><circle class=\"fk\" cx=\"43.6\" cy=\"11.6\" r=\"1\" stroke=\"none\"></circle><circle class=\"fk\" cx=\"49.6\" cy=\"11.6\" r=\"1\" stroke=\"none\"></circle><path class=\"sr\" style=\"stroke-width:2.5\" d=\"M46 21v4m0 0l-2 3m2-3l2 3\"></path></svg>","treasure":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fn\" d=\"M6 32C6 18 18 9 32 9s26 9 26 23z\"></path><rect class=\"fn\" x=\"6\" y=\"32\" width=\"52\" height=\"24\" rx=\"3\"></rect><rect class=\"fy\" x=\"26\" y=\"9\" width=\"12\" height=\"47\"></rect><rect class=\"fy\" x=\"25\" y=\"28\" width=\"14\" height=\"13\" rx=\"3\"></rect><circle class=\"fk\" cx=\"32\" cy=\"33.5\" r=\"2\" stroke=\"none\"></circle><path d=\"M32 35v3\" style=\"stroke-width:2.5\"></path></svg>","animals":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fy\" x=\"10\" y=\"28\" width=\"44\" height=\"28\" rx=\"2\"></rect><path class=\"fr\" d=\"M4 31L32 8l28 23z\"></path><path d=\"M24 56V44a8 8 0 0 1 16 0v12z\" style=\"fill:#5a3a22\"></path><circle class=\"fs\" cx=\"32\" cy=\"50\" r=\"3.2\" stroke=\"none\"></circle><circle class=\"fs\" cx=\"27.5\" cy=\"45\" r=\"1.6\" stroke=\"none\"></circle><circle class=\"fs\" cx=\"32\" cy=\"43\" r=\"1.6\" stroke=\"none\"></circle><circle class=\"fs\" cx=\"36.5\" cy=\"45\" r=\"1.6\" stroke=\"none\"></circle></svg>","memory":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><g transform=\"rotate(-14 22 36)\"><rect class=\"fb\" x=\"8\" y=\"14\" width=\"26\" height=\"36\" rx=\"5\"></rect><path class=\"fy\" d=\"M21 24l2.6 5.2 5.8.8-4.2 4 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4 5.8-.8z\"></path></g><g transform=\"rotate(12 42 34)\"><rect class=\"fw\" x=\"30\" y=\"12\" width=\"26\" height=\"36\" rx=\"5\"></rect><path class=\"fr\" d=\"M43 41l-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6z\"></path></g></svg>","odd":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"sk\" d=\"M42 42l15 15\"></path><path class=\"sn\" d=\"M42 42l15 15\"></path><circle class=\"fl\" cx=\"27\" cy=\"27\" r=\"19\"></circle><circle class=\"fb\" cx=\"19\" cy=\"25\" r=\"4.5\"></circle><circle class=\"fb\" cx=\"31\" cy=\"19\" r=\"4.5\"></circle><circle class=\"fr\" cx=\"27\" cy=\"35\" r=\"4.5\"></circle></svg>","pattern":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><circle class=\"fr\" cx=\"11\" cy=\"19\" r=\"8\"></circle><rect class=\"fb\" x=\"22\" y=\"11\" width=\"16\" height=\"16\" rx=\"3\"></rect><path class=\"fy\" d=\"M42 27h16L50 11z\"></path><circle class=\"fr\" cx=\"11\" cy=\"45\" r=\"8\"></circle><rect class=\"fb\" x=\"22\" y=\"37\" width=\"16\" height=\"16\" rx=\"3\"></rect><path class=\"fw\" d=\"M42 53h16L50 37z\" style=\"stroke-dasharray:3 3\"></path></svg>","jigsaw":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fb\" transform=\"translate(4 24)\" d=\"M0 0h12a4 4 0 1 1 8 0h12v12a4 4 0 1 1 0 8v12H20a4 4 0 1 0-8 0H0V20a4 4 0 1 0 0-8z\"></path><path class=\"fy\" transform=\"translate(24 6)\" d=\"M0 0h12a4 4 0 1 1 8 0h12v12a4 4 0 1 1 0 8v12H20a4 4 0 1 0-8 0H0V20a4 4 0 1 0 0-8z\"></path></svg>","draw":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"sr\" style=\"stroke-width:4\" d=\"M6 58q5-7 10 0t10 0\"></path><g transform=\"rotate(40 32 30)\"><rect class=\"fp\" x=\"24\" y=\"2\" width=\"16\" height=\"9\" rx=\"2\"></rect><rect class=\"fb\" x=\"24\" y=\"11\" width=\"16\" height=\"5\"></rect><rect class=\"fy\" x=\"24\" y=\"16\" width=\"16\" height=\"26\"></rect><path class=\"fs\" d=\"M24 42h16l-8 14z\"></path><path class=\"fk\" d=\"M29.5 52h5l-2.5 4z\" stroke=\"none\"></path></g></svg>","colors":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><circle class=\"fy\" cx=\"32\" cy=\"32\" r=\"25\"></circle><path class=\"fr\" d=\"M32 7a25 25 0 0 1 25 25H32z\"></path><path class=\"fb\" d=\"M32 57A25 25 0 0 1 7 32h25z\"></path><ellipse class=\"fw\" cx=\"21\" cy=\"19\" rx=\"6\" ry=\"3.5\" transform=\"rotate(-40 21 19)\" stroke=\"none\"></ellipse><circle class=\"fw\" cx=\"32\" cy=\"32\" r=\"4.5\"></circle><circle cx=\"32\" cy=\"32\" r=\"25\"></circle></svg>","coloring":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fs\" d=\"M32 7C16 7 5 18 5 31s9 26 23 26c8 0 7-5 4-8s-1-8 5-8h8c8 0 14-5 14-13C59 15 47 7 32 7z\"></path><circle class=\"fr\" cx=\"17\" cy=\"30\" r=\"5\"></circle><circle class=\"fb\" cx=\"27\" cy=\"17\" r=\"5\"></circle><circle class=\"fg\" cx=\"42\" cy=\"17\" r=\"5\"></circle><circle class=\"fy\" cx=\"50\" cy=\"30\" r=\"5\"></circle><circle class=\"fw\" cx=\"20\" cy=\"45\" r=\"4.5\"></circle></svg>","sorting":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fy\" d=\"M6 17l26 11v31L6 48z\"></path><path class=\"fo\" d=\"M58 17L32 28v31l26-11z\"></path><path class=\"fg\" d=\"M32 6l26 11-26 11L6 17z\"></path><ellipse class=\"fk\" cx=\"32\" cy=\"17\" rx=\"8.5\" ry=\"3.8\" stroke=\"none\"></ellipse><path class=\"fg\" d=\"M18 33l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z\"></path><path class=\"fg\" d=\"M45 35l8 13H37z\"></path></svg>","count":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fb\" x=\"5\" y=\"36\" width=\"25\" height=\"25\" rx=\"4\"></rect><rect class=\"fr\" x=\"34\" y=\"36\" width=\"25\" height=\"25\" rx=\"4\"></rect><rect class=\"fy\" x=\"19.5\" y=\"7\" width=\"25\" height=\"25\" rx=\"4\"></rect><text class=\"tx\" x=\"17.5\" y=\"56\" font-size=\"20\" text-anchor=\"middle\">1</text><text class=\"tx\" x=\"46.5\" y=\"56\" font-size=\"20\" text-anchor=\"middle\">2</text><text class=\"tx\" x=\"32\" y=\"27\" font-size=\"20\" text-anchor=\"middle\">3</text></svg>","math":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><circle class=\"fb\" cx=\"32\" cy=\"37\" r=\"22\"></circle><ellipse cx=\"32\" cy=\"10\" rx=\"13\" ry=\"4.5\" style=\"stroke:#f2b705;stroke-width:5\"></ellipse><path d=\"M32 26v22M21 37h22\" style=\"stroke-width:13\"></path><path d=\"M32 26v22M21 37h22\" style=\"stroke:#fff;stroke-width:7\"></path></svg>","compare":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><ellipse class=\"fr\" cx=\"32\" cy=\"52\" rx=\"24\" ry=\"8\"></ellipse><ellipse class=\"fy\" cx=\"32\" cy=\"42\" rx=\"19\" ry=\"7\"></ellipse><ellipse class=\"fg\" cx=\"32\" cy=\"32\" rx=\"14\" ry=\"6.5\"></ellipse><ellipse class=\"fb\" cx=\"32\" cy=\"23\" rx=\"10\" ry=\"5.5\"></ellipse><circle class=\"fr\" cx=\"32\" cy=\"12\" r=\"6\"></circle></svg>","numberline":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fb\" x=\"8\" y=\"14\" width=\"11\" height=\"16\" rx=\"2\"></rect><rect class=\"fr\" x=\"5\" y=\"9\" width=\"17\" height=\"7\" rx=\"3\"></rect><rect class=\"fg\" x=\"4\" y=\"28\" width=\"36\" height=\"20\" rx=\"5\"></rect><rect class=\"fb\" x=\"36\" y=\"17\" width=\"23\" height=\"31\" rx=\"3\"></rect><rect class=\"fr\" x=\"33\" y=\"10\" width=\"29\" height=\"9\" rx=\"3\"></rect><rect class=\"fw\" x=\"41\" y=\"24\" width=\"13\" height=\"13\" rx=\"2\"></rect><text x=\"47.5\" y=\"35\" font-size=\"12\" font-weight=\"800\" text-anchor=\"middle\" style=\"fill:#2b1b17;stroke:none\">؟</text><circle class=\"fr\" cx=\"17\" cy=\"52\" r=\"8\"></circle><circle class=\"fy\" cx=\"17\" cy=\"52\" r=\"3\" style=\"stroke-width:2\"></circle><circle class=\"fr\" cx=\"48\" cy=\"52\" r=\"8\"></circle><circle class=\"fy\" cx=\"48\" cy=\"52\" r=\"3\" style=\"stroke-width:2\"></circle></svg>","number-puzzle":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fr\" x=\"6\" y=\"6\" width=\"25\" height=\"25\" rx=\"5\"></rect><rect class=\"fb\" x=\"33\" y=\"6\" width=\"25\" height=\"25\" rx=\"5\"></rect><rect class=\"fg\" x=\"6\" y=\"33\" width=\"25\" height=\"25\" rx=\"5\"></rect><rect class=\"fw\" x=\"33\" y=\"33\" width=\"25\" height=\"25\" rx=\"5\" style=\"stroke-dasharray:4 4\"></rect><text class=\"tx\" x=\"18.5\" y=\"26\" font-size=\"19\" text-anchor=\"middle\">1</text><text class=\"tx\" x=\"45.5\" y=\"26\" font-size=\"19\" text-anchor=\"middle\">2</text><text class=\"tx\" x=\"18.5\" y=\"53\" font-size=\"19\" text-anchor=\"middle\">3</text></svg>","read":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fb\" d=\"M3 17l29 5 29-5v39l-29 5-29-5z\"></path><path class=\"fw\" d=\"M7 12c9-3 18-2 25 3v40c-7-5-16-6-25-3z\"></path><path class=\"fw\" d=\"M57 12c-9-3-18-2-25 3v40c7-5 16-6 25-3z\"></path><path class=\"fr\" d=\"M30 3h7v21l-3.5-3.5L30 24z\"></path><path d=\"M12 22c4-1 9 0 14 2M12 31c4-1 9 0 14 2M38 24c5-2 10-3 14-2M38 33c5-2 10-3 14-2\" style=\"stroke-width:2\"></path></svg>","english":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><path class=\"fo\" d=\"M6 10h30a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H20l-8 7v-7H6a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5z\"></path><path class=\"fb\" d=\"M28 28h30a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-4v7l-8-7H28a5 5 0 0 1-5-5V33a5 5 0 0 1 5-5z\"></path><text class=\"tx\" x=\"21\" y=\"31\" font-size=\"22\" text-anchor=\"middle\">ع</text><text class=\"tx\" x=\"43\" y=\"47\" font-size=\"20\" text-anchor=\"middle\">A</text></svg>","phonics":"<svg class=\"ic\" viewBox=\"0 0 64 64\"><rect class=\"fy\" x=\"4\" y=\"20\" width=\"31\" height=\"31\" rx=\"5\"></rect><text class=\"tx\" x=\"19.5\" y=\"45\" font-size=\"26\" text-anchor=\"middle\">أ</text><circle class=\"fr\" cx=\"47\" cy=\"39\" r=\"14\"></circle><path class=\"sn\" style=\"stroke-width:3\" d=\"M47 26c0-4 1-7 3-9\"></path><path class=\"fg\" d=\"M50 21c3-6 8-6 11-4-2 5-7 6-11 4z\"></path><ellipse class=\"fw\" cx=\"41.5\" cy=\"34\" rx=\"2.5\" ry=\"4\" transform=\"rotate(25 41.5 34)\" stroke=\"none\"></ellipse></svg>"};
  const CATEGORIES = {"ttt":"games","snakes":"games","treasure":"games","animals":"games","memory":"smart","odd":"smart","pattern":"smart","jigsaw":"smart","draw":"art","colors":"art","coloring":"art","sorting":"art","count":"numbers","math":"numbers","compare":"numbers","numberline":"numbers","number-puzzle":"numbers","read":"letters","english":"letters","phonics":"letters"};
  const ORDER = [['all','الكل'],['numbers','أرقام'],['letters','حروف'],['art','ألوان ورسم'],['smart','ذكاء'],['games','ألعاب']];
  let active = 'all', queued = false;

  function keyFor(card) {
    if (card.classList.contains('roqaya-number-puzzle-card')) return 'number-puzzle';
    return card.dataset.game || '';
  }
  function catFor(key) { return CATEGORIES[key] || 'games'; }

  function enhanceCard(card) {
    const key = keyFor(card);
    if (!key || !ICONS[key]) return;
    const cat = catFor(key);
    card.classList.add('rg-game-tile', `rg-cat-${cat}`);
    card.dataset.rgCategory = cat;
    const art = card.querySelector('.game-card-art');
    if (art && art.dataset.rgIcon !== key) {
      art.innerHTML = ICONS[key];
      art.dataset.rgIcon = key;
    }
    card.querySelector('strong')?.classList.add('rg-game-label');
  }

  function cards(grid) { return [...grid.querySelectorAll('.game-choice')]; }

  function ensureFilters(grid) {
    const panel = grid.closest('.lobby-panel');
    if (!panel) return null;
    let nav = panel.querySelector('.rg-game-filters');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'rg-game-filters';
      nav.setAttribute('aria-label','أقسام الألعاب');
      nav.innerHTML = ORDER.map(([key,label]) => `<button type="button" class="rg-filter ${key==='all'?'active':''}" data-rg-filter="${key}">${key==='all'?`<span>${label}</span><span class="rg-filter-count"></span>`:`<i class="rg-dot"></i><span>${label}</span>`}</button>`).join('');
      grid.before(nav);
      nav.addEventListener('click', e => {
        const btn = e.target.closest('[data-rg-filter]');
        if (!btn) return;
        active = btn.dataset.rgFilter || 'all';
        apply(grid, nav);
      });
    }
    return nav;
  }

  function apply(grid, nav) {
    const all = cards(grid);
    let visible = 0;
    const present = new Set();
    for (const card of all) {
      const cat = card.dataset.rgCategory || catFor(keyFor(card));
      present.add(cat);
      const show = active === 'all' || cat === active;
      card.hidden = !show;
      if (show) visible++;
    }
    for (const btn of nav.querySelectorAll('[data-rg-filter]')) {
      const key = btn.dataset.rgFilter;
      btn.classList.toggle('active', key === active);
      if (key !== 'all') btn.hidden = !present.has(key);
    }
    const count = nav.querySelector('.rg-filter-count');
    if (count) count.textContent = `(${all.length.toLocaleString('ar-EG')})`;
    const badge = grid.closest('.lobby-panel')?.querySelector('.games-heading-row span');
    if (badge) {
      const wanted = `${visible.toLocaleString('ar-EG')} لعبة`;
      if (badge.textContent !== wanted) badge.textContent = wanted;
    }
  }

  function enhanceLobby() {
    const grid = screen.querySelector('.lobby-game-grid');
    if (!grid) return;
    cards(grid).forEach(enhanceCard);
    const nav = ensureFilters(grid);
    if (nav) apply(grid, nav);
    const heading = grid.closest('.lobby-panel')?.querySelector('.games-heading-row h3');
    if (heading && heading.textContent !== 'اختار لعبتك 🎮') heading.textContent = 'اختار لعبتك 🎮';
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhanceLobby(); });
  }

  new MutationObserver(schedule).observe(screen, {childList:true,subtree:true});
  addEventListener('pageshow', schedule);
  schedule();
})();
