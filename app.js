/* 宋如一 · 竞选手札 —— PPT 式点击翻页 */
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var pages = document.getElementById('pages');
  var dock = document.getElementById('dock');
  var counter = document.getElementById('counter');
  var topIdx = document.getElementById('top-idx');
  var progress = document.getElementById('progress');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');
  var flipPrev = document.getElementById('flip-prev');
  var flipNext = document.getElementById('flip-next');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var turning = false;
  var current = 0;
  var TOTAL = slides.length;
  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* 内容分级浮现：为每个 data-rv 分配序号 */
  var rvTimers = new Array(TOTAL).fill(null);
  slides.forEach(function (slide) {
    var rv = slide.querySelectorAll('[data-rv]');
    rv.forEach(function (el, i) { el.style.setProperty('--i', i); });
  });

  function resetReveal(i) {
    if (rvTimers[i]) { clearTimeout(rvTimers[i]); rvTimers[i] = null; }
    slides[i].classList.remove('rv-on', 'rv-final');
  }
  function playReveal(i) {
    var slide = slides[i];
    slide.classList.remove('rv-final');
    slide.classList.add('rv-on');
    if (rvTimers[i]) clearTimeout(rvTimers[i]);
    if (reduceMotion) { slide.classList.add('rv-final'); return; }
    var count = slide.querySelectorAll('[data-rv]').length;
    /* 最晚一个元素：延迟 0.34s + 序号*85ms + 动画 0.7s，再留 150ms 余量 */
    var wait = 340 + Math.max(0, count - 1) * 85 + 850;
    rvTimers[i] = setTimeout(function () {
      slide.classList.add('rv-final');
      rvTimers[i] = null;
    }, wait);
  }

  /* 章节导航点 */
  slides.forEach(function (slide, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = pad(i + 1);
    b.setAttribute('aria-label', '第 ' + (i + 1) + ' 页：' + slide.dataset.title);
    b.addEventListener('click', function () { goTo(i); });
    dock.appendChild(b);
  });
  var dockBtns = Array.prototype.slice.call(dock.children);

  /* 翻页高光层 */
  var sheen = document.createElement('div');
  sheen.className = 'sheen';
  pages.appendChild(sheen);

  function render(skipReveal) {
    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === current);
      if (skipReveal) return;
      if (i === current) playReveal(i);
      else resetReveal(i);
    });
    dockBtns.forEach(function (b, i) {
      b.setAttribute('aria-current', String(i === current));
    });
    counter.textContent = pad(current + 1) + ' / ' + pad(TOTAL);
    topIdx.textContent = current + 1;
    progress.style.width = ((current + 1) / TOTAL * 100) + '%';
    btnPrev.disabled = current === 0;
    btnNext.disabled = current === TOTAL - 1;
    flipPrev.disabled = current === 0;
    flipNext.disabled = current === TOTAL - 1;
  }

  function goTo(target) {
    if (turning || target === current || target < 0 || target > TOTAL - 1) return;
    var dir = target > current ? 'next' : 'prev';

    if (reduceMotion) {
      current = target;
      history.replaceState(null, '', '#' + (current + 1));
      render();
      return;
    }

    turning = true;
    var from = slides[current];
    var to = slides[target];

    from.classList.add('leaving', 'turn-out-' + dir);
    to.classList.add('active', 'turn-in-' + dir);
    playReveal(target);
    pages.classList.remove('sheening');
    void pages.offsetWidth; /* 重启动画 */
    pages.classList.add('sheening');

    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      from.classList.remove('active', 'leaving', 'turn-out-next', 'turn-out-prev');
      to.classList.remove('turn-in-next', 'turn-in-prev');
      current = target;
      turning = false;
      history.replaceState(null, '', '#' + (current + 1));
      render(true);
      /* 入场在翻页开始时已播放，rv-final 由其自身定时器兜底落定 */
    };
    to.addEventListener('animationend', function h(e) {
      if (e.target === to) { to.removeEventListener('animationend', h); finish(); }
    });
    setTimeout(finish, 1100); /* 兜底 */
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  flipNext.addEventListener('click', next);
  flipPrev.addEventListener('click', prev);

  /* 键盘 */
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End': e.preventDefault(); goTo(TOTAL - 1); break;
      case 'f': case 'F':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
        break;
    }
  });

  /* 触摸滑动 */
  var tx = 0, ty = 0;
  pages.addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  pages.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  /* 鼠标滚轮（横向翻页，带节流） */
  var wheelLock = false;
  pages.addEventListener('wheel', function (e) {
    if (wheelLock) return;
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 34) return;
    wheelLock = true;
    d > 0 ? next() : prev();
    setTimeout(function () { wheelLock = false; }, 850);
  }, { passive: true });

  /* 初始页码（支持 #3 分享直达） */
  var h = parseInt((location.hash || '#1').slice(1), 10);
  if (h >= 1 && h <= TOTAL) current = h - 1;
  window.addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '#1').slice(1), 10);
    if (n >= 1 && n <= TOTAL) goTo(n - 1);
  });
  render();

  /* 触屏端点一下右侧边缘区域给个提示（仅首次） */
  if (!reduceMotion) {
    setTimeout(function () { flipNext.classList.add('show'); }, 1400);
    setTimeout(function () { flipNext.classList.remove('show'); }, 3600);
  }

  /* ============ 像素粒子（金色花粉 / 萤火） ============ */
  var canvas = document.getElementById('atmosphere');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, particles = [];
  var COLORS = ['#ffe298', '#fff0b5', '#eebd67', '#f3c98f', '#cfe0a0', '#f0b08f'];
  var hidden = document.hidden;
  document.addEventListener('visibilitychange', function () { hidden = document.hidden; });

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function spawn(initial) {
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 8,
      s: 3 + Math.floor(Math.random() * 5),
      vx: (Math.random() - .5) * .25,
      vy: -.12 - Math.random() * .35,
      sway: Math.random() * Math.PI * 2,
      a: .25 + Math.random() * .55,
      tw: .004 + Math.random() * .012,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
  }
  var COUNT = window.innerWidth < 700 ? 22 : 40;
  for (var i = 0; i < COUNT; i++) particles.push(spawn(true));

  var last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (hidden || reduceMotion) return;
    if (t - last < 33) return; /* 约 30fps */
    last = t;
    ctx.clearRect(0, 0, W, H);
    particles.forEach(function (p) {
      p.sway += .012;
      p.x += p.vx + Math.sin(p.sway) * .18;
      p.y += p.vy;
      p.a += (Math.random() - .5) * p.tw * 10;
      p.a = Math.max(.12, Math.min(.85, p.a));
      if (p.y < -10 || p.x < -10 || p.x > W + 10) {
        var n = spawn(false);
        Object.keys(n).forEach(function (k) { p[k] = n[k]; });
      }
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.c;
      /* 像素方块：禁用抗锯齿感的硬边小方块 */
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    });
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(frame);

  /* ============ 鼠标视差 ============ */
  var px = 0, py = 0, tx2 = 0, ty2 = 0;
  document.addEventListener('pointermove', function (e) {
    if (reduceMotion) return;
    tx2 = (e.clientX / window.innerWidth - .5);
    ty2 = (e.clientY / window.innerHeight - .5);
    document.documentElement.style.setProperty('--pointer-x', (e.clientX / window.innerWidth * 100) + '%');
    document.documentElement.style.setProperty('--pointer-y', (e.clientY / window.innerHeight * 100) + '%');
  });
  (function parallax() {
    requestAnimationFrame(parallax);
    px += (tx2 - px) * .05;
    py += (ty2 - py) * .05;
    document.documentElement.style.setProperty('--parallax-x', (-px * 22) + 'px');
    document.documentElement.style.setProperty('--parallax-y', (-py * 14) + 'px');
  })();
})();
