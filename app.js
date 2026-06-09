/* ============================================================
   StakeUp — interactions & live motion
   ============================================================ */
(function () {
  'use strict';
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e, i) {
      if (e.isIntersecting) {
        e.target.style.transitionDelay = (Math.min(i, 5) * 0.07) + 's';
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* headline reveals via pure CSS (.hero-title .line) — robust without JS */

  /* ---------- sticky header glass ---------- */
  var header = document.querySelector('header');
  if (header) {
    var onHeaderScroll = function () { header.classList.toggle('scrolled', scrollY > 24); };
    addEventListener('scroll', onHeaderScroll, { passive: true });
    onHeaderScroll();
  }

  /* ---------- scroll progress + phone tilt ---------- */
  if (!reduceMotion) {
    var bar = document.querySelector('.scroll-progress');
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var max = (document.documentElement.scrollHeight - innerHeight) || 1;
        var r = Math.min(1, Math.max(0, scrollY / max));
        if (bar) bar.style.transform = 'scaleX(' + r + ')';
        ticking = false;
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var phone = document.querySelector('.phone-stage .phone');
    if (phone) {
      var stageEl = phone.parentElement, raf = 0;
      stageEl.addEventListener('mousemove', function (e) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var rb = phone.getBoundingClientRect();
          var dx = (e.clientX - (rb.left + rb.width / 2)) / (rb.width / 2);
          var dy = (e.clientY - (rb.top + rb.height / 2)) / (rb.height / 2);
          phone.style.transform = 'perspective(1500px) rotateY(' + (dx * 6) + 'deg) rotateX(' + (-dy * 5) + 'deg)';
        });
      });
      stageEl.addEventListener('mouseleave', function () { cancelAnimationFrame(raf); phone.style.transform = ''; });
    }
  }

  /* ---------- marquee ticker ---------- */
  (function () {
    var track = document.getElementById('tick-1');
    if (!track) return;
    var items = [
      ['💪', 'Gym 3×', 'ok', 'VERIFIED'],
      ['🏃', 'Run 5km', 'ok', 'VERIFIED'],
      ['🍳', 'Skipped meal prep', 'bad', 'PAYS UP'],
      ['📚', 'Read 30 min', 'ok', 'VERIFIED'],
      ['🐔', 'Loser wears the chicken suit', 'bad', 'FORFEIT'],
      ['🧊', 'Cold plunge', 'ok', 'VERIFIED'],
      ['😴', 'Slept through alarm', 'bad', 'PAYS UP'],
      ['🥗', 'No takeout', 'ok', 'VERIFIED'],
      ['📵', 'Skipped leg day', 'bad', 'FORFEIT'],
      ['🔥', '12-day streak', 'ok', 'BONUS +10']
    ];
    function build() {
      var html = '';
      items.forEach(function (it) {
        html += '<span class="tick-item"><span class="em">' + it[0] + '</span>' + it[1] +
          ' <span class="' + it[2] + '">' + it[3] + '</span><span class="dv">/</span></span>';
      });
      return html;
    }
    // duplicate for seamless loop
    track.innerHTML = build() + build();
  })();

  /* ---------- count-up stats ---------- */
  (function () {
    var els = document.querySelectorAll('.big[data-count]');
    var seen = new WeakSet();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || seen.has(e.target)) return;
        seen.add(e.target);
        var el = e.target;
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduceMotion) { el.textContent = target + suffix; return; }
        var dur = 1400, start = performance.now();
        function frame(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(frame);
          else el.textContent = target + suffix;
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { obs.observe(el); });
  })();

  /* ---------- confetti burst ---------- */
  function confettiBurst(x, y) {
    if (reduceMotion) return;
    var colors = ['#c8ff42', '#34e07f', '#54a6ff', '#ffb23e', '#c573ff', '#ff6aa0'];
    for (var i = 0; i < 36; i++) {
      var c = document.createElement('div');
      c.className = 'confetti';
      c.style.background = colors[i % colors.length];
      c.style.left = x + 'px';
      c.style.top = y + 'px';
      document.body.appendChild(c);
      var ang = Math.random() * Math.PI * 2;
      var vel = 120 + Math.random() * 220;
      var dx = Math.cos(ang) * vel;
      var dy = Math.sin(ang) * vel - 140;
      var rot = (Math.random() * 720 - 360);
      c.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + (dy + 320) + 'px) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: 1100 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.3,1)' });
      setTimeout((function (node) { return function () { node.remove(); }; })(c), 1800);
    }
  }

  /* =========================================================
     HERO PHONE — auto-playing app flow
     chat → typing → check-in card → squad votes → verified
     → +pts pop + confetti → streak fills → leaderboard → loop
     ========================================================= */
  (function () {
    var phone = document.querySelector('.phone-stage .phone');
    if (!phone) return;

    var steps = phone.querySelectorAll('.anim[data-step]');
    var typingRow = document.getElementById('typing-row');
    var pill = document.getElementById('ph-pill');
    var voters = document.querySelectorAll('#ph-voters .vv');
    var tally = document.getElementById('ph-tally');
    var reward = document.getElementById('ph-reward');
    var streakNum = document.getElementById('ph-streak');
    var todayDot = document.getElementById('ph-today');
    var ptsMini = document.getElementById('ph-pts');
    var lbScreen = document.getElementById('lb-screen');
    var lbYouPts = document.getElementById('lb-you-pts');
    var lbList = document.getElementById('lb-list');
    var jordanRow = lbList ? lbList.querySelector('[data-id="jordan"]') : null;
    var youRow = lbList ? lbList.querySelector('[data-id="you"]') : null;
    var tabs = phone.querySelectorAll('.tabbar .tab');
    var timers = [];

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

    function setTab(name) {
      tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === name); });
    }

    /* Slide-swap Jordan (rank 2, 16pts) and You (rank 3, 18pts) once
       You overtakes. The .lb-row already has `transition:transform .4s steps(4)`
       so we get a chunky pixel-stepped slide for free. */
    function swapYouAboveJordan() {
      if (!jordanRow || !youRow || !lbList) return;
      // Only run if still in original DOM order (jordan before you)
      if (youRow.previousElementSibling !== jordanRow) return;
      var jR = jordanRow.getBoundingClientRect();
      var yR = youRow.getBoundingClientRect();
      var dist = yR.top - jR.top;
      if (!dist) return;
      jordanRow.style.transform = 'translateY(' + dist + 'px)';
      youRow.style.transform = 'translateY(' + (-dist) + 'px)';
      timers.push(setTimeout(function () {
        // freeze transitions, swap DOM + rank labels, then restore transitions
        jordanRow.style.transition = 'none';
        youRow.style.transition = 'none';
        jordanRow.style.transform = '';
        youRow.style.transform = '';
        lbList.insertBefore(youRow, jordanRow);
        var youRank = youRow.querySelector('.rank');
        var jordanRank = jordanRow.querySelector('.rank');
        if (youRank) youRank.textContent = '2';
        if (jordanRank) jordanRank.textContent = '3';
        requestAnimationFrame(function () {
          jordanRow.style.transition = '';
          youRow.style.transition = '';
        });
      }, 480));
    }

    function resetLeaderboardOrder() {
      if (!jordanRow || !youRow || !lbList) return;
      jordanRow.style.transition = 'none';
      youRow.style.transition = 'none';
      jordanRow.style.transform = '';
      youRow.style.transform = '';
      // restore original DOM order if currently swapped
      if (youRow.previousElementSibling !== jordanRow) {
        lbList.insertBefore(jordanRow, youRow);
      }
      var youRank = youRow.querySelector('.rank');
      var jordanRank = jordanRow.querySelector('.rank');
      if (jordanRank) jordanRank.textContent = '2';
      if (youRank) youRank.textContent = '3';
      requestAnimationFrame(function () {
        jordanRow.style.transition = '';
        youRow.style.transition = '';
      });
    }

    function reset() {
      steps.forEach(function (s) { s.classList.remove('in'); });
      pill.className = 'pill pill-pending';
      pill.textContent = 'PENDING';
      voters.forEach(function (v) { v.classList.remove('on'); });
      tally.innerHTML = '<svg width="13" height="13" viewBox="0 0 14 14"><path d="M2 7l3 4 7-7"/></svg>0/3';
      reward.classList.remove('on');
      streakNum.textContent = '2';
      todayDot.className = 'sd today';
      todayDot.textContent = 'W';
      ptsMini.textContent = '⚡ 18';
      if (lbScreen) lbScreen.classList.remove('on');
      if (lbYouPts) lbYouPts.textContent = '13';
      resetLeaderboardOrder();
      setTab('chat');
    }

    function bumpNumber(el, from, to, dur, prefix) {
      prefix = prefix || '';
      var start = performance.now();
      function f(now) {
        var p = Math.min(1, (now - start) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    }

    function play() {
      reset();
      // Act 1 — Alex's bubble
      at(400, function () { steps[0].classList.add('in'); });
      // Act 2 — Jordan typing
      at(1300, function () { steps[1].classList.add('in'); });
      // Act 3 — check-in card + system line (typing turns into submission)
      at(2600, function () {
        if (typingRow) typingRow.classList.remove('in');
      });
      at(2850, function () { steps[2].classList.add('in'); steps[3].classList.add('in'); });
      // Act 4 — streak card
      at(3600, function () { steps[4].classList.add('in'); });
      // Act 5 — squad votes roll in one by one
      at(4400, function () { voters[0].classList.add('on'); setTallyText('1/3'); });
      at(4750, function () { voters[1].classList.add('on'); setTallyText('2/3'); });
      at(5100, function () { voters[2].classList.add('on'); setTallyText('3/3'); });
      // Act 6 — verified flip + reward pop + confetti + points bump
      at(5550, function () {
        pill.className = 'pill pill-verified';
        pill.textContent = 'VERIFIED';
        reward.classList.add('on');
        // confetti from the pill location
        var r = pill.getBoundingClientRect();
        confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
      });
      at(5900, function () {
        bumpNumber(ptsMini, 18, 23, 700, '⚡ ');
        streakNum.textContent = '3';
        todayDot.className = 'sd done';
      });
      // Act 7 — switch to leaderboard
      at(7400, function () { setTab('board'); if (lbScreen) lbScreen.classList.add('on'); });
      at(8000, function () { if (lbYouPts) bumpNumber(lbYouPts, 13, 18, 800); });
      // Act 7b — You overtakes Jordan (18 > 16): slide-swap rows 2 and 3
      at(8900, function () { swapYouAboveJordan(); });
      // Act 8 — hold on the new standings, then loop
      at(11800, function () { play(); });
    }

    function setTallyText(txt) {
      // keep the leading svg, replace trailing text
      tally.innerHTML = '<svg width="13" height="13" viewBox="0 0 14 14"><path d="M2 7l3 4 7-7"/></svg>' + txt;
    }

    if (reduceMotion) {
      // show a sensible final-ish state without looping motion
      steps.forEach(function (s) { s.classList.add('in'); });
      voters.forEach(function (v) { v.classList.add('on'); });
      pill.className = 'pill pill-verified'; pill.textContent = 'VERIFIED';
      setTallyText('3/3'); reward.classList.add('on');
      streakNum.textContent = '3'; todayDot.className = 'sd done';
      // Final standings: You (18) overtook Jordan (16)
      if (lbYouPts) lbYouPts.textContent = '18';
      if (jordanRow && youRow && lbList && youRow.previousElementSibling === jordanRow) {
        lbList.insertBefore(youRow, jordanRow);
        var yr = youRow.querySelector('.rank');
        var jr = jordanRow.querySelector('.rank');
        if (yr) yr.textContent = '2';
        if (jr) jr.textContent = '3';
      }
      return;
    }

    // start when the hero phone is on-screen; pause when off-screen
    var running = false;
    var heroObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) { running = true; play(); }
        else if (!e.isIntersecting && running) { running = false; clearTimers(); }
      });
    }, { threshold: 0.25 });
    heroObs.observe(phone);
  })();

  /* =========================================================
     WAITLIST FORM — ported behaviour (Formspree, honeypot,
     throttle, validation, solo/squad toggle, success state)
     ========================================================= */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validEmail(v) { v = (v || '').trim(); return v.length <= 254 && EMAIL_RE.test(v); }
  function flash(el) {
    el.style.borderColor = '#ff5757';
    el.style.boxShadow = '0 0 0 4px rgba(255,87,87,.2)';
    setTimeout(function () { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1600);
  }

  function wireForm(form) {
    var busy = false, lastSubmit = 0;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var success = form.querySelector('.success-msg');
      var row = form.querySelector('.signup-row');
      var note = form.querySelector('.form-note');
      var squadFields = form.querySelector('.squad-fields');
      var toggle = form.querySelector('.wl-toggle');
      var original = btn.textContent;
      var showSuccess = function () {
        row.style.display = 'none';
        if (note) note.style.display = 'none';
        if (squadFields) squadFields.style.display = 'none';
        if (toggle) toggle.style.display = 'none';
        success.classList.add('show');
        var r = success.getBoundingClientRect();
        confettiBurst(r.left + r.width / 2, r.top + 10);
      };

      var hp = form.querySelector('input[name="_gotcha"]');
      if (hp && hp.value) { showSuccess(); return; }

      var now = Date.now();
      if (busy || now - lastSubmit < 3000) return;

      var email = form.querySelector('input[name="email"]');
      if (!validEmail(email.value)) { email.focus(); flash(email); return; }
      var teammates = form.querySelector('textarea[name="teammate_emails"]');
      if (teammates && form.querySelector('.squad-fields.show') && teammates.value.trim()) {
        var list = teammates.value.split(/[,\n;]/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (list.length > 25 || list.some(function (e) { return !validEmail(e); })) { teammates.focus(); flash(teammates); return; }
      }

      if (form.action.indexOf('YOUR_FORM_ID') !== -1) { showSuccess(); return; }

      busy = true; lastSubmit = now;
      btn.textContent = 'Joining…'; btn.disabled = true;
      var reset = function () { btn.textContent = original; btn.disabled = false; busy = false; };
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (res) {
          if (res.ok) { showSuccess(); return; }
          return res.json().then(function (d) {
            var msg = 'Something went wrong. Please try again.';
            if (d && Array.isArray(d.errors) && d.errors.length) msg = d.errors.map(function (e) { return e.message; }).join(' ');
            reset(); alert(msg);
          }).catch(function () { reset(); alert('Something went wrong. Please try again.'); });
        })
        .catch(function () { reset(); alert('Network error. Please check your connection and try again.'); });
    });
  }
  document.querySelectorAll('#hero-form, #cta-form').forEach(wireForm);

  /* ---------- solo / squad toggle ---------- */
  document.querySelectorAll('.wl-toggle').forEach(function (tg) {
    var form = tg.closest('form');
    var squad = form.querySelector('.squad-fields');
    var typeField = form.querySelector('input[name=signup_type]');
    var submitBtn = form.querySelector('button[type=submit]');
    var note = form.querySelector('#cta-note');
    tg.querySelectorAll('.wl-mode').forEach(function (b) {
      b.addEventListener('click', function () {
        tg.querySelectorAll('.wl-mode').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var squadMode = b.dataset.mode === 'squad';
        if (squad) squad.classList.toggle('show', squadMode);
        if (typeField) typeField.value = squadMode ? 'Squad' : 'Solo';
        if (submitBtn) submitBtn.textContent = squadMode ? 'Reserve our spots' : 'Claim my spot';
        if (note) note.textContent = squadMode
          ? "Add your crew — we'll save your whole group a spot."
          : "One email when StakeUp is ready. That's it.";
      });
    });
  });

  /* ---------- live clock in phone status bars ---------- */
  function tick() {
    var d = new Date(), h = d.getHours() % 12 || 12, m = String(d.getMinutes()).padStart(2, '0');
    document.querySelectorAll('.sb-time').forEach(function (el) { el.textContent = h + ':' + m; });
  }
  tick(); setInterval(tick, 30000);
})();
