/* Villa Naya · page behaviour
   Languages, the bar and the index, the hero (film + the name setting behind
   the pool edge), the glass act (day into night), gallery, enquiry, map. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = (doc.querySelector('meta[name="vn-email"]') || {}).content || '';
  var DICT = window.VN_I18N || {};
  var LANGS = ['hr', 'en', 'de', 'it'];
  var lang = 'hr';

  root.classList.add('js');

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ------------------------------------------------------------ i18n -- */
  var origText = new WeakMap();
  var origAttr = new WeakMap();

  // A key's text in the current language. Croatian lives in the markup; the
  // few strings only JavaScript writes have their Croatian in DICT.hr.
  function t(key) {
    var d = DICT[lang] || {};
    if (d[key] != null) return d[key];
    if (DICT.hr && DICT.hr[key] != null) return DICT.hr[key];
    return key;
  }

  function applyLang(next) {
    lang = LANGS.indexOf(next) > -1 ? next : 'hr';
    var d = DICT[lang] || {};
    root.lang = lang;
    $$('[data-i18n]').forEach(function (el) {
      if (!origText.has(el)) origText.set(el, el.textContent);
      var k = el.getAttribute('data-i18n');
      el.textContent = lang === 'hr' ? origText.get(el) : (d[k] != null ? d[k] : origText.get(el));
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      if (!origAttr.has(el)) origAttr.set(el, {});
      var o = origAttr.get(el);
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':'), a = bits[0].trim(), k = (bits[1] || '').trim();
        if (!(a in o)) o[a] = el.getAttribute(a) || '';
        var v = lang === 'hr' ? o[a] : (d[k] != null ? d[k] : (DICT.hr && DICT.hr[k]) || o[a]);
        el.setAttribute(a, v);
      });
    });
    // photo alt text is composed from the group and the room
    $$('img[data-cap]').forEach(function (img) {
      if (img.hasAttribute('data-i18n-attr')) return;
      var c = img.getAttribute('data-cap').split('.');
      if (!origAttr.has(img)) origAttr.set(img, { alt: img.alt });
      img.alt = lang === 'hr' ? origAttr.get(img).alt : t('g.' + c[0] + '.name') + ': ' + t('cap.' + c[1]);
    });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    store('vn-lang', lang);
    doc.dispatchEvent(new CustomEvent('vn:lang'));
  }

  function firstLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.indexOf(q) > -1) return q;
    var saved = store('vn-lang');
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var nav = (navigator.languages || [navigator.language || 'hr']);
    for (var i = 0; i < nav.length; i++) {
      var two = String(nav[i]).slice(0, 2).toLowerCase();
      if (two === 'hr' || two === 'sr' || two === 'bs' || two === 'sl') return 'hr';
      if (LANGS.indexOf(two) > -1) return two;
    }
    return 'en';
  }

  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });

  /* ------------------------------------------------------------ small bits */
  $$('[data-email]').forEach(function (a) {
    a.href = 'mailto:' + EMAIL;
    a.textContent = EMAIL;
    if (/\.example$/.test(EMAIL)) a.classList.add('placeholder');
  });
  $$('[data-year]').forEach(function (s) { s.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------ the index (menu) --
     A full-screen list of the house's spaces; the photo of each space sits
     behind it and changes as the pointer or the focus moves down the list. */
  var bar = $('[data-bar]');
  var menuBtn = $('[data-menu-btn]');
  var menu = $('[data-menu]');
  var pics = menu ? $$('.index__pics img', menu) : [];
  var closing;

  function showPic(name) {
    pics.forEach(function (im) { im.classList.toggle('is-on', im.getAttribute('data-pic') === name); });
  }
  function setMenu(open) {
    clearTimeout(closing);
    menuBtn.setAttribute('aria-expanded', String(open));
    doc.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      var cur = $('a[aria-current="page"]', menu) || $('a', menu);
      showPic(cur.getAttribute('data-pic'));
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
      cur.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      closing = setTimeout(function () { menu.hidden = true; }, reduce ? 0 : 560);
    }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    $$('.index__nav a', menu).forEach(function (a) {
      var on = function () { showPic(a.getAttribute('data-pic')); };
      a.addEventListener('pointerenter', on);
      a.addEventListener('focus', on);
      a.addEventListener('click', function () { setMenu(false); });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
      // keep Tab inside the open index: the bar (language, CTA, close) and the list
      if (e.key === 'Tab' && menuBtn.getAttribute('aria-expanded') === 'true') {
        var f = $$('a, button', bar).concat($$('a, button', menu)).filter(function (x) { return x.offsetParent !== null; });
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ------------------------------------------------------------ hero -----
     The frame is the 16:9 film covering the stage. The letters stand on the
     pool edge inside a mask cut to the edge and the two glass railings, so
     moving them down sets them behind the water. Pin progress p:
       0.02 – 0.27  the line and the button leave
       0.04 – 0.66  the name sets behind the edge; the frame leans in 7 %
       0.50 – 0.70  "Above Opatija" rises in the sky                         */
  var hero = $('[data-hero]');
  var hFrame = hero && $('[data-hero-frame]', hero);
  var hWord = hero && $('[data-hero-word]', hero);
  var hMirror = hero && $('[data-hero-mirror]', hero);
  var hCopy = hero && $('[data-hero-copy]', hero);
  var hSecond = hero && $('[data-hero-second]', hero);
  var hLast = -1;

  function drawHero() {
    var r = hero.getBoundingClientRect();
    var travel = r.height - innerHeight;
    var p = travel > 1 ? clamp(-r.top / travel, 0, 1) : 0;
    if (bar) {
      bar.classList.toggle('is-over', r.bottom > bar.offsetHeight && !doc.body.classList.contains('menu-open'));
      bar.classList.toggle('show-mark', p > 0.62);
    }
    if (Math.abs(p - hLast) < 0.0005) return;
    hLast = p;
    var leave = smooth((p - 0.02) / 0.25);
    hCopy.style.opacity = (1 - leave).toFixed(3);
    hCopy.style.transform = 'translate3d(0,' + (-24 * leave).toFixed(1) + 'px,0)';
    hCopy.style.visibility = leave > 0.99 ? 'hidden' : '';
    var rise = smooth((p - 0.5) / 0.2);
    hSecond.style.opacity = rise.toFixed(3);
    hSecond.style.transform = 'translate3d(0,' + ((1 - rise) * 18).toFixed(1) + 'px,0)';
    if (reduce) return;
    var set = smooth((p - 0.04) / 0.62);
    hWord.style.setProperty('--set', set.toFixed(4));
    hMirror.style.setProperty('--set', set.toFixed(4));
    hFrame.style.transform = 'scale(' + (1 + 0.07 * smooth(p)).toFixed(4) + ')';
  }

  // The film: one 9 s loop made from the real pool photo (camera locked, the
  // ship and a boat cross the bay). It plays only on screen, never under
  // reduced motion or Save-Data, and the visitor can stop it.
  var film = hero && $('[data-hero-film]', hero);
  var pauseBtn = hero && $('[data-hero-pause]', hero);
  var saveData = navigator.connection && navigator.connection.saveData;
  if (film && !reduce && !saveData) {
    var stage = film.closest('.sc-stage');
    // the phone cut covers the centre 608 of 1920 columns of the frame, which
    // is enough while the window is at most 0.56 as wide as it is tall
    var shape = function () { return stage.clientWidth / Math.max(1, stage.clientHeight) <= 0.56 ? 'p' : 'l'; };
    var portrait = shape() === 'p';
    var stopped = store('vn-film-paused') === '1';
    var inView = true, ready = false;
    var sync = function () {
      if (ready && inView && !stopped && !doc.hidden) { var pr = film.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else film.pause();
      pauseBtn.setAttribute('aria-pressed', String(stopped));
    };
    film.addEventListener('playing', function () { hero.classList.add('is-playing'); });
    pauseBtn.hidden = false;
    pauseBtn.addEventListener('click', function () { stopped = !stopped; store('vn-film-paused', stopped ? '1' : '0'); sync(); });
    doc.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; sync(); }).observe(hero);
    // Cloudflare Pages answers without byte ranges and iOS Safari will not play
    // an mp4 it cannot range-request, so the file arrives whole as a Blob.
    var load = function () {
      hero.classList.toggle('is-portrait-clip', portrait);
      return fetch(film.getAttribute(portrait ? 'data-src-mobile' : 'data-src'))
        .then(function (r) { if (!r.ok) throw r; return r.blob(); })
        .then(function (b) {
          if (film.src) URL.revokeObjectURL(film.src);
          film.src = URL.createObjectURL(b); ready = true; sync();
        });
    };
    var start = function () { load().catch(function () {}); };
    if (doc.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', function () { setTimeout(start, 300); });
    var reshape;
    addEventListener('resize', function () {
      clearTimeout(reshape);
      reshape = setTimeout(function () {
        if ((shape() === 'p') === portrait) return;
        portrait = !portrait; ready = false; hero.classList.remove('is-playing');
        load().catch(function () {});
      }, 250);
    });
  }

  /* ------------------------------------------------------------ facts line */
  var line = $('[data-line]');
  if (line && 'IntersectionObserver' in window) {
    var lo = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { line.classList.add('is-drawn'); lo.disconnect(); }
    }, { threshold: 1 });
    lo.observe(line);
  } else if (line) line.classList.add('is-drawn');

  /* ------------------------------------------------------------ the glass --
     Two photographs of the living room, day and night, warped onto the same
     pixels. Night comes down the frame as a soft front: a wrapper with a
     feathered lower edge slides down while the night photo inside it slides
     up by the same amount, so the photo stays put and only the edge moves.
     Transforms only, nothing repaints. Pin progress p:
       0.00 – 0.34  "By day this wall is the sea." (leaves 0.24 – 0.34)
       0.18 – 0.48  the room cools toward blue hour
       0.30 – 0.76  night comes down the glass
       0.74 – 1.00  "At night it becomes a mirror."                          */
  var glass = $('[data-glass]');
  var gFrame = glass && $('[data-glass-frame]', glass);
  var gDusk = glass && $('[data-glass-dusk]', glass);
  var gFront = glass && $('[data-glass-front]', glass);
  var gNight = glass && $('[data-glass-night]', glass);
  var gDay = glass && $('[data-glass-day]', glass);
  var gNightCopy = glass && $('[data-glass-night-copy]', glass);
  var gScrimD = glass && $('.glass__scrim--day', glass);
  var gScrimN = glass && $('.glass__scrim--night', glass);
  var gH = 0, gLast = -1;

  function measureGlass() { gH = gFrame.offsetHeight; gLast = -1; }

  function drawGlass() {
    var r = glass.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    var travel = r.height - innerHeight;
    var p = travel > 1 ? clamp(-r.top / travel, 0, 1) : 0;
    if (Math.abs(p - gLast) < 0.0004) return;
    gLast = p;
    var day = 1 - smooth((p - 0.24) / 0.1);
    gDay.style.opacity = day.toFixed(3);
    gDay.style.transform = 'translate3d(0,' + ((1 - day) * -16).toFixed(1) + 'px,0)';
    gScrimD.style.opacity = day.toFixed(3);
    gDusk.style.opacity = (0.4 * smooth((p - 0.18) / 0.3)).toFixed(3);
    var f = smooth((p - 0.3) / 0.46);
    if (reduce) {
      gFront.style.transform = 'none';
      gNight.style.transform = 'none';
      gFront.style.opacity = f.toFixed(3);
    } else {
      var y = (-1.25 + 1.25 * f) * gH;
      gFront.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      gNight.style.transform = 'translate3d(0,' + (-y).toFixed(1) + 'px,0)';
    }
    var night = smooth((p - 0.74) / 0.1);
    gNightCopy.style.opacity = night.toFixed(3);
    gNightCopy.style.transform = 'translate3d(0,' + ((1 - night) * 18).toFixed(1) + 'px,0)';
    gScrimN.style.opacity = night.toFixed(3);
  }
  if (glass) {
    if (reduce) gFront.classList.add('is-fade');
    measureGlass();
    addEventListener('resize', measureGlass);
  }

  /* ------------------------------------------------------------ one loop */
  var ticking = false;
  function frame() {
    ticking = false;
    if (hero) drawHero();
    else if (bar) bar.classList.remove('is-over');
    if (glass) drawGlass();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', function () { hLast = -1; request(); });
  if (menuBtn) menuBtn.addEventListener('click', request);

  /* ------------------------------------------------------------ the dates (home) */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(v) { if (!v) return null; var b = v.split('-'); return new Date(+b[0], b[1] - 1, +b[2]); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var dates = $('[data-dates]');
  if (dates) {
    var a = $('#d-od', dates), b = $('#d-do', dates);
    a.min = iso(today);
    a.addEventListener('change', function () {
      var d = parse(a.value); if (!d) return;
      d.setDate(d.getDate() + 1); b.min = iso(d);
      if (b.value && parse(b.value) <= parse(a.value)) b.value = '';
    });
  }

  /* ------------------------------------------------------------ gallery -- */
  var grid = $('[data-grid]');
  if (grid) {
    var tiles = $$('a', grid);
    var buttons = $$('[data-filters] button');
    var filter = 'all';

    buttons.forEach(function (bt) {
      var f = bt.getAttribute('data-f');
      var n = f === 'all' ? tiles.length : tiles.filter(function (x) { return x.getAttribute('data-group') === f; }).length;
      $('.n', bt).textContent = n;
      bt.addEventListener('click', function () { setFilter(f, true); });
    });

    var setFilter = function (f, push) {
      filter = buttons.some(function (bt) { return bt.getAttribute('data-f') === f; }) ? f : 'all';
      buttons.forEach(function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-f') === filter)); });
      tiles.forEach(function (x) { x.hidden = filter !== 'all' && x.getAttribute('data-group') !== filter; });
      if (push) history.replaceState(null, '', filter === 'all' ? location.pathname : '#' + filter);
    };
    setFilter((location.hash || '').slice(1) || 'all', false);
    addEventListener('hashchange', function () { setFilter(location.hash.slice(1), false); });

    var lb = $('[data-lightbox]');
    var lbImg = $('[data-lb-img]', lb);
    var lbCap = $('[data-lb-cap]', lb);
    var lbCount = $('[data-lb-count]', lb);
    var shown = [], at = 0, opener = null;

    var show = function (i) {
      at = (i + shown.length) % shown.length;
      var el = shown[at], thumb = $('img', el);
      lbImg.src = el.getAttribute('href');
      lbImg.alt = thumb.alt;
      lbCap.textContent = thumb.alt;
      lbCount.textContent = (at + 1) + ' / ' + shown.length;
      var next = shown[(at + 1) % shown.length];
      if (next) { var pre = new Image(); pre.src = next.getAttribute('href'); }
    };
    tiles.forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (!lb.showModal) return;
        e.preventDefault();
        opener = el;
        shown = tiles.filter(function (x) { return !x.hidden; });
        show(shown.indexOf(el));
        lb.showModal();
      });
    });
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(at - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(at + 1); });
    $('[data-lb-close]', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('close', function () { if (opener) opener.focus(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === $('[data-lb-stage]', lb)) lb.close(); });
    var x0 = null;
    $('[data-lb-stage]', lb).addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    $('[data-lb-stage]', lb).addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
    });
    doc.addEventListener('vn:lang', function () { if (lb.open) show(at); });
  }

  /* ------------------------------------------------------------ enquiry -- */
  var form = $('[data-form]');
  if (form) {
    var q = new URLSearchParams(location.search);
    var od = $('#f-od'), dd = $('#f-do'), ad = $('#f-odrasli'), kd = $('#f-djeca'), heat = $('#f-grijanje');
    var warn = $('[data-warn]'), status = $('[data-status]');
    od.min = iso(today);
    if (q.get('od')) od.value = q.get('od');
    if (q.get('do')) dd.value = q.get('do');
    if (q.get('g')) ad.value = String(clamp(parseInt(q.get('g'), 10) || 2, 1, 10));

    var fmt = function (d) { return new Intl.DateTimeFormat(lang === 'hr' ? 'hr-HR' : lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(d); };
    // the pool is heated on request from October to May
    var offSeason = function (a, b) {
      for (var d = new Date(a); d < b; d.setDate(d.getDate() + 1)) { var m = d.getMonth(); if (m >= 9 || m <= 4) return true; }
      return false;
    };

    var update = function () {
      var a = parse(od.value), b = parse(dd.value);
      if (a) { var m = new Date(a); m.setDate(m.getDate() + 1); dd.min = iso(m); }
      var S = function (k, v) { $('[data-s="' + k + '"]').textContent = v; };
      S('dates', a && b ? fmt(a) + ' – ' + fmt(b) : (a ? fmt(a) : '–'));
      var n = a && b ? Math.round((b - a) / 864e5) : 0;
      S('nights', n > 0 ? String(n) : '–');
      var adults = +ad.value, kids = +kd.value;
      S('guests', t('s.adults') + ' ' + adults + (kids ? ', ' + t('s.kids') + ' ' + kids : ''));
      S('pool', heat.checked ? t('s.heated') : (a && b && n > 0 && offSeason(a, b) ? t('s.unheated') : t('s.normal')));
      var msgs = [];
      if (adults + kids > 10) msgs.push(t('w.cap'));
      if (a && a < today) msgs.push(t('w.past'));
      if (a && b && n <= 0) msgs.push(t('w.order'));
      warn.hidden = !msgs.length;
      warn.textContent = msgs.join(' ');
      return { a: a, b: b, n: n, adults: adults, kids: kids, ok: !msgs.length };
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    doc.addEventListener('vn:lang', update);

    var err = function (name, key) {
      var box = $('[data-err="' + name + '"]');
      var field = { od: od, 'do': dd, ime: $('#f-ime'), email: $('#f-email'), privola: $('[data-consent]') }[name];
      if (box) box.textContent = key ? t(key) : '';
      if (field) field.setAttribute('aria-invalid', key ? 'true' : 'false');
      return key ? field : null;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = update();
      var bad = [];
      bad.push(err('od', !s.a ? 'e.need' : (s.a < today ? 'w.past' : null)));
      bad.push(err('do', !s.b ? 'e.need' : (s.n <= 0 ? 'w.order' : null)));
      var name = $('#f-ime').value.trim(), mail = $('#f-email').value.trim();
      bad.push(err('ime', name ? null : 'e.need'));
      bad.push(err('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? null : 'e.mail'));
      bad.push(err('privola', $('[data-consent]').checked ? null : 'e.consent'));
      bad = bad.filter(Boolean);
      if (bad.length) { bad[0].focus(); return; }

      var lines = [
        t('m.hello'), '',
        t('book.dates') + ': ' + fmt(s.a) + ' – ' + fmt(s.b) + ' (' + s.n + ' ' + t('m.nights') + ')',
        t('book.guests') + ': ' + t('s.adults') + ' ' + s.adults + (s.kids ? ', ' + t('s.kids') + ' ' + s.kids : '')
      ];
      if (heat.checked) lines.push(t('book.pool') + ': ' + t('s.heated'));
      lines.push('', t('book.name') + ': ' + name, t('book.email') + ': ' + mail);
      var tel = $('#f-tel').value.trim();
      if (tel) lines.push(t('book.phone') + ': ' + tel);
      var msg = $('#f-poruka').value.trim();
      if (msg) lines.push('', msg);
      if (!s.ok) lines.push('', '(' + warn.textContent + ')');
      var body = lines.join('\n');
      var subject = t('m.subject') + ': ' + fmt(s.a) + ' – ' + fmt(s.b);

      status.hidden = false;
      status.innerHTML = '';
      var p = doc.createElement('p');
      p.textContent = t('st.ok') + ' ' + EMAIL + '.';
      var copy = doc.createElement('button');
      copy.type = 'button'; copy.className = 'btn btn--line'; copy.style.marginTop = '0.9rem';
      copy.textContent = t('st.copy');
      copy.addEventListener('click', function () {
        (navigator.clipboard ? navigator.clipboard.writeText(subject + '\n\n' + body) : Promise.reject())
          .then(function () { copy.textContent = t('st.copied'); })
          .catch(function () { copy.textContent = t('st.copyFail'); });
      });
      var pr = doc.createElement('pre'); pr.textContent = body;
      status.appendChild(p); status.appendChild(copy); status.appendChild(pr);
      location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ------------------------------------------------------------ map ------ */
  var map = $('[data-map]');
  if (map) {
    $('[data-map-load]', map).addEventListener('click', function () {
      var la = +map.getAttribute('data-lat'), lo = +map.getAttribute('data-lon');
      var f = doc.createElement('iframe');
      f.title = t('map.title');
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer';
      f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        (lo - 0.012).toFixed(5) + '%2C' + (la - 0.0065).toFixed(5) + '%2C' + (lo + 0.012).toFixed(5) + '%2C' + (la + 0.0065).toFixed(5) +
        '&layer=mapnik&marker=' + la + '%2C' + lo;
      map.innerHTML = '';
      map.appendChild(f);
    });
  }

  /* ------------------------------------------------------------ start ---- */
  applyLang(firstLang());
  if (window.ScrollCraft) ScrollCraft.mount(doc.body);
  if (form) form.dispatchEvent(new Event('change'));
  frame();
})();
