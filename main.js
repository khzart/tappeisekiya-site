// GSAP, ScrollTrigger, and Lenis are loaded via CDN scripts in index.html to support file://
gsap.registerPlugin(ScrollTrigger);

const header = document.querySelector('.header');
const menuToggle = document.querySelector('.menu-toggle');

if (header && menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('is-menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('.nav-menu a').forEach((link) => {
    link.addEventListener('click', () => {
      header.classList.remove('is-menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Initialize Smooth Scroll (Lenis)
const lenis = new Lenis({
  // 🔴 09-17 オーナー指摘「全体的にスクロールが遅い」＝duration 1.2秒は指を離してから
  //    1.2秒かけて止まる設定。0.8へ縮め、ホイール1刻みの送り量を1.15倍にした（滑らかさは保つ）。
  duration: 0.8,
  wheelMultiplier: 1.15,
  touchMultiplier: 1.6,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Expo.easeOut
  smooth: true,
});

/* 09-17 追加＝「上へ戻る」。1画面ぶんスクロールしたら右下に出る。押すと先頭へ滑らかに戻る。
   戻す＝このブロックと style.css の .to-top、HTMLのボタンを削除 */
(() => {
  const btn = document.querySelector('.to-top');
  if (!btn) return;
  const toggle = () => btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.9);
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
  btn.addEventListener('click', () => {
    if (window.lenisInstance) window.lenisInstance.scrollTo(0, { duration: 1.1 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* 09-17 追加＝ヘッダー追従（KHZ ART型）。下へスクロールするとヘッダーが上に貼り付いてついてくる。
   🔴 PCの .header は overflow:hidden の .hero の中＝sticky が効かない。∴ fixed に切り替え、
      抜けた高さは直前に差し込む .header-spacer で埋める（版面は動かない）。
   スマホは元から position:fixed ＝クラスは色を薄くするためだけに付ける。
   戻す＝このブロックと style.css の「ヘッダー追従」ブロックを削除 */
(() => {
  const hdr = document.querySelector('.header');
  if (!hdr) return;
  const spacer = document.createElement('div');
  spacer.className = 'header-spacer';
  hdr.parentNode.insertBefore(spacer, hdr);
  let stuck = false, top = 0, h = 0, ticking = false;
  const update = () => {
    ticking = false;
    // スマホ＝CSSで既に fixed ＝座標は触らず、薄い色だけを付け外しする
    if (!stuck && getComputedStyle(hdr).position === 'fixed') {
      hdr.classList.toggle('is-stuck', window.scrollY > 24);
      return;
    }
    if (!stuck) {
      h = hdr.offsetHeight;
      top = spacer.getBoundingClientRect().top + window.scrollY;
    }
    const should = window.scrollY > top + 4;
    if (should === stuck) return;
    stuck = should;
    hdr.classList.toggle('is-stuck', stuck);
    spacer.style.height = stuck ? h + 'px' : '0px';
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    // 幅が変わると元の位置も高さも変わる＝一度外してから測り直す
    stuck = false; hdr.classList.remove('is-stuck'); spacer.style.height = '0px';
    onScroll();
  }, { passive: true });
  update();
})();

// Update ScrollTrigger on Lenis scroll ticks
window.lenisInstance = lenis;
lenis.on('scroll', ScrollTrigger.update);

// Synchronize Lenis with GSAP's ticker
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

// Disable lag smoothing to prevent syncing issue
gsap.ticker.lagSmoothing(0);

// Hero Animation
const tlHero = gsap.timeline();
if (document.querySelector('.hero-img')) {
  // 🔴 08-07：scale 1.2→1 を廃止。名前を画の外へ出して写真を全幅にした結果、
  //    1.2倍の間だけ写真が枠からはみ出し、下地の黒が帯になって動いて見えていた（オーナー指摘「黒帯が変に動く」）。
  //    導入は不透明度だけにする＝動かない。
  tlHero.fromTo('.hero-img',
    { opacity: 0 },
    { opacity: 1, duration: 1.2, ease: 'power2.out' }
  );
}
if (document.querySelector('.brand-title > *')) {
  tlHero.fromTo('.brand-title > *', 
    { y: 50, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 1.5, stagger: 0.2, ease: 'power3.out' }, 
    "-=1.5"
  );
}
if (document.querySelector('.hero-subtitle')) {
  tlHero.fromTo('.hero-subtitle', 
    { y: 20, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 1.5, ease: 'power3.out' }, 
    "-=1"
  );
}

// Lace Reveal Animation — layered images fade in and overlap on scroll
if (document.querySelector('.lace-section')) {
  // Initial hidden states
  gsap.set('#lace-wrapper-left', { opacity: 0, y: 40 });
  gsap.set('#lace-wrapper-center', { opacity: 0, y: 60 });
  gsap.set('#lace-wrapper-right', { opacity: 0, y: 30 });
  gsap.set('#lace-wrapper-final', { opacity: 0, xPercent: -50, y: 36 });

  const tlLace = gsap.timeline({
    scrollTrigger: {
      trigger: '.lace-section',
      start: 'top top',
      end: 'bottom bottom',
      pin: '.lace-sticky',
      pinSpacing: false,
      scrub: 1.2,
      anticipatePin: 1,
    }
  });

  tlLace
    // Left lace fades in from below
    .to('#lace-wrapper-left', { opacity: 1, y: 0, duration: 2, ease: 'power3.out' })
    // Center lace fades in, overlapping
    .to('#lace-wrapper-center', { opacity: 1, y: 0, duration: 2, ease: 'power3.out' }, '-=1.2')
    // Right lace fades in last
    .to('#lace-wrapper-right', { opacity: 1, y: 0, duration: 2, ease: 'power3.out' }, '-=1.5')
    // Final lace detail completes the layered composition
    .to('#lace-wrapper-final', { opacity: 1, y: 0, duration: 2, ease: 'power3.out' }, '-=0.8');
}


// Parallax and Reveal for Editorial Images
const parallaxImages = document.querySelectorAll('.parallax-img img');
parallaxImages.forEach((img) => {
  if (img.parentElement) {
    gsap.fromTo(img, 
      { yPercent: -15 },
      {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: img.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );
  }
});

// Text reveal animations
const textBlocks = document.querySelectorAll('.text-block');
textBlocks.forEach((block) => {
  gsap.fromTo(block,
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: block,
        start: 'top 85%',
      }
    }
  );
});

// Floating elements parallax (slower or faster)
const fastFloat = document.querySelectorAll('.parallax-fast');
fastFloat.forEach((el) => {
  gsap.to(el, {
    y: -150,
    ease: 'none',
    scrollTrigger: {
      trigger: el.parentElement,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.5
    }
  });
});

const slowFloat = document.querySelectorAll('.parallax-slow');
slowFloat.forEach((el) => {
  gsap.to(el, {
    y: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: el.parentElement,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  });
});

// Philosophy (Poetry) Section Entrance Animations
if (document.querySelector('.poetry-section')) {
  const tlPoetry = gsap.timeline({
    scrollTrigger: {
      trigger: '.poetry-section',
      start: 'top 92%',   /* 09-18＝'top bottom'より少し手前で走り出す */
      toggleActions: 'play none none none',
    }
  });

  if (document.querySelector('.giant-chapter')) {
    tlPoetry.fromTo('.giant-chapter',
      { opacity: 0, x: -60 },
      { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' } // 09-18＝1.2→0.7（オーナー「出るの遅い」）
    );
  }
  if (document.querySelector('.poetry-label')) {
    tlPoetry.fromTo('.poetry-label',
      { opacity: 0, y: -20 },
      { opacity: 0.8, y: 0, duration: 0.5, ease: 'power3.out' },
      '-=0.6'
    );
  }
  if (document.querySelector('.poetry-divider')) {
    tlPoetry.fromTo('.poetry-divider',
      { scaleY: 0 },
      { scaleY: 1, duration: 0.5, ease: 'power3.inOut' },
      '-=0.45'
    );
  }
  if (document.querySelector('.poetry-line')) {
    tlPoetry.fromTo('.poetry-line',
      { opacity: 0, y: 30, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, stagger: 0.07, ease: 'power4.out' },
      '-=0.4'
    );
  }
  if (document.querySelector('.philosophy-gallery .img-block')) {
    tlPoetry.fromTo('.philosophy-gallery .img-block',
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.65, stagger: 0.045, ease: 'power3.out' },
      '-=0.5'
    );
  }
}

// Dark Mode Toggle
if (document.querySelector('#dark-section')) {
  ScrollTrigger.create({
    trigger: '#dark-section',
    start: 'top 50%',
    end: 'bottom 50%',
    toggleClass: {targets: "body", className: "is-dark"},
    markers: false
  });
}

// Recalculate ScrollTrigger positions after all page resources are fully loaded
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
});

/* ── 2026-09-18 速度改修（見た目は1pxも変えない）────────────────────────
   実測＝スクロール中 61.3fps・落ちコマ15%・最悪233ms。原因の1つが
   **画面外でも動画をデコードし続けていること**（ヒーローは autoplay loop・preload="auto"）。
   ∴ 画面に入っていない <video> は止める。戻ってきたら再生を戻す。
   ⚠️ 手で止めた動画（MOTIONの再生ボタン）を勝手に再生し直さない＝自動再生のものだけ戻す。 */
(() => {
  const vids = [...document.querySelectorAll('video')];
  if (!vids.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.autoplay && v.paused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { rootMargin: '120px 0px', threshold: 0.01 });
  vids.forEach((v) => io.observe(v));
})();

/* ── 2026-09-18 コレクションの一着を「そのまま浮かび上がらせる」──────────
   オーナー指示＝「collectionの商品をクリックしたらそのまま浮かび上がるようにして」。
   設計＝**同じ絵が、いま在る場所から中央へ伸びる**（別の絵に差し替えない＝FLIP）。
   ・押した瞬間に元の位置・大きさを測り、中央へ置いた複製をその位置へ一度戻してから解く
   ・閉じるのは「もう一度押す」「Esc」「背景を押す」の3つ。どれでも元の位置へ吸い込まれて消える
   ・戻す＝このブロックと style.css の 09-18 lightbox ブロックを消すだけ */
(() => {
  const items = [...document.querySelectorAll('.collection-item')];
  if (!items.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<figure class="lightbox__figure">' +
    '<img class="lightbox__img" alt="" />' +
    '<figcaption class="lightbox__meta"><p class="lightbox__name"></p><p class="lightbox__note"></p></figcaption>' +
    '</figure>';
  document.body.appendChild(box);
  const big = box.querySelector('.lightbox__img');
  const nameEl = box.querySelector('.lightbox__name');
  const noteEl = box.querySelector('.lightbox__note');
  let origin = null;

  const flip = (from) => {
    const to = big.getBoundingClientRect();
    if (!to.width || !from.width) return;
    const sx = from.width / to.width, sy = from.height / to.height;
    big.style.transition = 'none';
    big.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
    requestAnimationFrame(() => {
      big.style.transition = 'transform .62s cubic-bezier(.22,.61,.36,1)';
      big.style.transform = 'none';
    });
  };

  const open = (item) => {
    const img = item.querySelector('img');
    if (!img) return;
    origin = img;
    const from = img.getBoundingClientRect();
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    nameEl.textContent = (item.querySelector('.collection-item__name') || {}).textContent || '';
    noteEl.textContent = (item.querySelector('.collection-item__note') || {}).textContent || '';
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (big.complete) flip(from);
    else big.addEventListener('load', () => flip(from), { once: true });
  };

  const close = () => {
    if (!box.classList.contains('is-open')) return;
    const to = origin ? origin.getBoundingClientRect() : null;
    const now = big.getBoundingClientRect();
    if (to && to.width) {
      const sx = to.width / now.width, sy = to.height / now.height;
      big.style.transition = 'transform .5s cubic-bezier(.4,0,.2,1)';
      big.style.transform = `translate(${to.left - now.left}px, ${to.top - now.top}px) scale(${sx}, ${sy})`;
    }
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  items.forEach((it) => {
    const media = it.querySelector('.collection-item__media') || it;
    media.addEventListener('click', () => open(it));
    media.setAttribute('tabindex', '0');
    media.setAttribute('role', 'button');
    media.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(it); }
    });
  });
  box.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();

/* ── 2026-09-18 サイト全体の「出方」（オーナー「もっとおしゃれに演出して」）─────────
   文法はMOTIONの映像と同じ＝**ぼけが解けながら静かに上がる**。1種類だけ。
   ・状態はここで付ける＝この処理が動かなければ**最初から全部見えている**（消えない）
   ・GSAPが既に動かしているもの（ヒーロー・poetry/philosophy・lace）には触らない＝二重に動かさない
   ・同じ節の中は 55ms ずつずらす＝順番に灯る。節をまたぐとリセットする
   ・一度出したら見張りを外す＝スクロール中の負荷を残さない */
(() => {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* 触らない場所＝GSAPが既に動かしている／固定で常に見えている */
  const SKIP = ['.hero', '.poetry-section', '.lace-section', '.giant-chapter', '.lightbox',
    '.header', '.header-nav', '.mobile-menu'];
  const inSkip = (el) => SKIP.some((s) => el.closest(s));

  /* 🔴 セレクタを列挙しない＝**書き忘れた場所が必ず出る**（09-18実測＝文字19・画像2が素通りしていた）。
     ∴「文字を自分で持つ末端」と「画像」を**全部**拾う。既に親が出る所は子を拾わない＝二重に動かさない。 */
  const BLOCK = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,dt,dd';
  const LEAF = 'span,a,div,strong,em,small,time,address';
  const MEDIA = 'img,.about-image,.motion-frame,picture';

  const marked = [];
  const take = (el, attr) => {
    if (inSkip(el)) return;
    if (el.closest('[data-rise],[data-fade]')) return;     /* 親が出るなら任せる */
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;                      /* 隠してある物は触らない */
    el.setAttribute(attr, '');
    marked.push(el);
  };
  const hasOwnText = (el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);

  /* ① 大きい単位から（段落・見出し）② 残った小さい文字（footerの屋号・ACCESS: MAP など） */
  document.querySelectorAll(BLOCK).forEach((e) => { if (hasOwnText(e)) take(e, 'data-rise'); });
  document.querySelectorAll(LEAF).forEach((e) => { if (hasOwnText(e)) take(e, 'data-rise'); });
  /* ③ 画像（親が文字で出る場合も、画像は画像の文法で出す＝先に外してから付け直す） */
  document.querySelectorAll(MEDIA).forEach((e) => {
    if (inSkip(e)) return;
    if (e.hasAttribute('data-rise') || e.hasAttribute('data-fade')) return;
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    if (e.closest('[data-fade]')) return;
    e.setAttribute('data-fade', '');
    marked.push(e);
  });
  if (!marked.length) return;

  /* 同じ親（節）ごとに順番をつける＝節が変われば 0 に戻る */
  const seen = new Map();
  marked.forEach((e) => {
    const key = e.closest('section, footer') || document.body;
    const i = (seen.get(key) || 0);
    seen.set(key, i + 1);
    e.style.transitionDelay = `${Math.min(i, 8) * 55}ms`;
  });

  const rest = new Set(marked);
  const show = (e) => { e.classList.add('is-in'); rest.delete(e); io.unobserve(e); };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) show(en.target); });
  }, { rootMargin: '0px 9999px -6% 0px', threshold: 0 });
  marked.forEach((e) => io.observe(e));

  /* 🔴 保険＝**文字が消えたままになる事故を絶対に起こさない**（09-18実測＝スマホで45箇所が出ないままだった）。
     交差の見張りは「通り過ぎた」を拾えない＝一気にスクロールされると素通りする。
     ページ下端に着いた時も、下6%を削っているせいで最後の1行が永久に出ない。
     ∴ スクロールのたびに**まだ出ていない物だけ**を見て、通り過ぎた物と下端の残りを出す。
     出し切ったら見張りを全部外す＝スクロール中に何も残さない。 */
  let timer = 0;
  const sweep = () => {
    timer = 0;
    const bottom = (innerHeight + scrollY) >= (document.documentElement.scrollHeight - 4);
    rest.forEach((e) => {
      if (bottom || e.getBoundingClientRect().top < innerHeight * 0.94) show(e);
    });
    if (!rest.size) { io.disconnect(); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); }
  };
  /* 毎コマは見ない＝見張りがスクロールを重くする（09-18実測＝毎コマだと96fpsが70.5fpsに落ちた）。
     交差の見張りが主・これは取りこぼしの受け皿＝1/8秒に1回で足りる。 */
  const onScroll = () => { if (!timer) timer = setTimeout(sweep, 125); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
})();

/* ── 09-28 速度改修＝ヒーロー動画(4.6MB)を最初の表示と取り合わせない ──────────
   動画の1コマ目と同じ静止画(poster)を先に出し、ページの読み込みが済んでから動画を読む。
   戻す＝index.html / en/index.html の hero の <source data-src> を src に戻し、このブロックを消す */
(() => {
  const v = document.querySelector('.hero-video');
  if (!v) return;
  const start = () => {
    // 09-28 スマホは中央を切り出した縦の動画（608×1080・1.4MB）だけ、PCは元の16:9（4.6MB）だけを残す
    const sp = matchMedia('(max-width: 600px)').matches;
    v.querySelectorAll('source[data-src]').forEach((s) => {
      if (s.hasAttribute('data-sp') !== sp) { s.remove(); return; }
      s.src = s.dataset.src; s.removeAttribute('data-src');
    });
    v.load();
    v.play().catch(() => {});
  };
  // 09-28③ 実測（スマホ5回ずつ）＝load前に始めると他の読み込みと取り合って遅い回が出た。load後に単独で読むのが最も安定
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();

/* ── 09-28② スマホで写真が「開くまで待つ」＝loading="lazy" は画面に近づいてから読み始める。
   ページが落ち着いたら、上から順に1枚ずつ先に読んでおく（見た目は同じ・通信が空いている時だけ）。
   ⚠️ 画面外で隠れている写真（display:none）は読まない。 */
(() => {
  const warm = () => {
    const imgs = [...document.querySelectorAll('img[loading="lazy"]')].filter((i) => i.offsetParent !== null || getComputedStyle(i).position === 'fixed');
    let k = 0;
    const next = () => {
      if (k >= imgs.length) return;
      const img = imgs[k++];
      if (img.complete && img.naturalWidth) { next(); return; }
      img.loading = 'eager';
      img.addEventListener('load', next, { once: true });
      img.addEventListener('error', next, { once: true });
    };
    // 2本並行で流す（1本ずつだと遅い・全部同時だと動画と取り合う）
    next(); next();
  };
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  // 動画を先に読み始めると load が動画待ちで遅れる＝load・動画の再生開始・4秒のうち早いもので始める
  let kicked = false;
  const kick = () => { if (!kicked) { kicked = true; idle(warm, { timeout: 2500 }); } };
  const hv = document.querySelector('.hero-video');
  if (hv) hv.addEventListener('playing', () => setTimeout(kick, 400), { once: true });
  setTimeout(kick, 4000);
  if (document.readyState === 'complete') kick();
  else window.addEventListener('load', kick, { once: true });
})();


// 09-29 紙目の継ぎ目をなくす（オーナー「ツギハギになってるところを全部滑らかに」）
// 各章が柄を自分の左上(0,0)から敷き直していた＝章の境で柄が切り替わって見えた。
// 柄の起点をページ全体の左上にそろえる＝全章が1枚の壁として続く（色・柄・大きさは同じ）。
(() => {
  const SEL = 'body, .hero, .ed-plate, .atelier-row, .positioning-statement, .page-hero, .ed-interlude, .lace-section, ' +
    '.images-section, .cloth-row, .stockist-section, .online-shop-section, .closing-editorial, .ed-sky, .motion-section, .collection-intro, .collection-category, .collection-back, .footer';
  let raf = 0;
  const align = () => {
    raf = 0;
    const sx = window.scrollX, sy = window.scrollY;
    document.querySelectorAll(SEL).forEach((el) => {
      const r = el.getBoundingClientRect();
      const x = -(r.left + sx), y = -(r.top + sy);   // 丸めない＝章の上端が0.5pxの半端でも柄がずれない
      el.style.setProperty('background-position', `${x}px ${y}px, ${x}px ${y}px, 0 0`, 'important');   // 3枚目＝境を溶かす層（章の上端に固定）
    });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(align); };
  queue();
  window.addEventListener('load', queue, { once: true });
  window.addEventListener('resize', queue);
  if ('ResizeObserver' in window) new ResizeObserver(queue).observe(document.body);
})();
