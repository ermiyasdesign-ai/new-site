// ════════════════════════════════════════
// ERMA DESIGN — Script
// ════════════════════════════════════════

// Enable JS-dependent animations
document.body.classList.add('js-active');

// ── Language ──────────────────────────────────────────────
const htmlEl = document.documentElement;
function applyLang(l) {
  htmlEl.setAttribute('data-lang', l);
  localStorage.setItem('erma-lang', l);
  document.querySelectorAll('[data-en]').forEach(el => {
    const t = l === 'am' ? (el.getAttribute('data-am') || el.getAttribute('data-en')) : el.getAttribute('data-en');
    if(t) el.textContent = t;
    el.classList.toggle('am', l === 'am');
  });
  document.querySelectorAll('.lang-pill').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
}
document.querySelectorAll('.lang-pill').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
applyLang(localStorage.getItem('erma-lang') || 'en');

// ── Theme ─────────────────────────────────────────────────
function applyTheme(t) {
  htmlEl.setAttribute('data-theme', t);
  localStorage.setItem('erma-theme', t);
}
document.getElementById('theme-btn').addEventListener('click', () =>
  applyTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
applyTheme(localStorage.getItem('erma-theme') || 'dark');

// ── Mobile menu ───────────────────────────────────────────
const mMenu = document.getElementById('mobile-menu');
document.getElementById('menu-btn').addEventListener('click', () => mMenu.classList.add('open'));
document.getElementById('menu-close').addEventListener('click', () => mMenu.classList.remove('open'));

// ── Smooth scroll nav + active highlight ─────────────────
const SECTIONS = ['projects','softwares','skills','work','contact'];
document.querySelectorAll('[data-section]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const el = document.getElementById(a.dataset.section);
    if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    mMenu.classList.remove('open');
  });
});

// ── Nav hide/show on scroll ───────────────────────────────
const topNav  = document.getElementById('top-nav');
const sideNav = document.getElementById('side-nav');
let lastY = 0, ticking = false;
function onScroll() {
  const y = window.scrollY;
  const heroH = (document.getElementById('hero') || {}).offsetHeight || 800;
  const inHero = y < heroH - 80;
  const goingDown = y > lastY;
  if (inHero || y < 80 || !goingDown) {
    topNav.classList.remove('hidden');
    sideNav.classList.remove('hidden');
  } else {
    topNav.classList.add('hidden');
    sideNav.classList.add('hidden');
  }
  // active link
  let active = SECTIONS[0];
  SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if(el && el.offsetTop <= y + window.innerHeight * 0.35) active = id;
  });
  document.querySelectorAll('[data-section]').forEach(a => a.classList.toggle('active', a.dataset.section === active));
  lastY = y;
  ticking = false;
}
window.addEventListener('scroll', () => { if(!ticking){ requestAnimationFrame(onScroll); ticking=true; } }, {passive:true});

// ── Scroll reveal ─────────────────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('in'); });
}, { threshold:0.1 });
function initReveal() {
  document.querySelectorAll('.reveal').forEach(el => {
    const r = el.getBoundingClientRect();
    if(r.top < window.innerHeight * 0.95) el.classList.add('in');
    else revealObs.observe(el);
  });
}
window.addEventListener('load', initReveal);

// ── Software bar animation ────────────────────────────────
const swSection = document.getElementById('softwares');
const swObs = new IntersectionObserver(entries => {
  if(entries[0].isIntersecting) {
    document.querySelectorAll('.sw-fill').forEach(b => { b.style.width = b.dataset.pct + '%'; });
    swObs.disconnect();
  }
}, { threshold:0.2 });
if(swSection) swObs.observe(swSection);

// ── Slideshow factory ─────────────────────────────────────
function makeSlideshow(tabsEl, stageId, trackId, prevId, nextId, dotsId, counterId) {
  const stage   = document.getElementById(stageId);
  const track   = document.getElementById(trackId);
  const dotsEl  = document.getElementById(dotsId);
  const counter = document.getElementById(counterId);
  if(!stage) return;

  let cat = 'brand-identity', idx = 0;

  function buildSlide(c, p, i) {
    const hasBg = !!p.img;
    const hasVideo = !!p.video;
    const bgStyle = hasBg
      ? `background-image:url('${p.img}');background-size:cover;background-position:center center;`
      : `background:${CAT_GRAD[c]};`;
    const meta = [p.client, p.year].filter(Boolean).join(' · ');
    const playBtn = hasVideo
      ? `<div class="slide-play-icon">▶</div>`
      : '';
    return `<div class="slide">
      <div class="slide-bg" style="${bgStyle}"></div>
      ${playBtn}
      <div class="slide-grad"></div>
      <div class="slide-content">
        <span class="slide-cat">${CAT_LABEL[c]}${meta ? ' · ' + meta : ''}</span>
        <div class="slide-title display">${p.title}</div>
        <p class="slide-desc">${p.desc}</p>
        <button class="slide-more" data-cat="${c}" data-idx="${i}">${hasVideo ? 'Watch Film →' : 'View More →'}</button>
      </div>
    </div>`;
  }

  function render() {
    const list = PROJECTS[cat] || [];
    track.innerHTML = list.length ? list.map((p,i) => buildSlide(cat,p,i)).join('') : `<div class="slide"><div class="slide-empty">Upload images to assets/projects/${cat}/ to see projects here.</div></div>`;
    dotsEl.innerHTML = list.map((_,i) => `<div class="slide-dot${i===idx?' on':''}" data-i="${i}"></div>`).join('');
    dotsEl.querySelectorAll('.slide-dot').forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
    track.querySelectorAll('.slide-more').forEach(b => b.addEventListener('click', () => openDetail(b.dataset.cat, +b.dataset.idx)));
    update();
  }
  function update() {
    const list = PROJECTS[cat] || [];
    track.style.transform = `translateX(-${idx*100}%)`;
    counter.textContent = `${String(idx+1).padStart(2,'0')} / ${String(Math.max(list.length,1)).padStart(2,'0')}`;
    dotsEl.querySelectorAll('.slide-dot').forEach((d,i) => d.classList.toggle('on', i===idx));
  }
  function go(n) { const l=(PROJECTS[cat]||[]).length; if(!l)return; idx=((n%l)+l)%l; update(); }

  document.getElementById(prevId).addEventListener('click', () => go(idx-1));
  document.getElementById(nextId).addEventListener('click', () => go(idx+1));

  // swipe
  let tx=0;
  stage.addEventListener('touchstart', e => tx=e.touches[0].clientX, {passive:true});
  stage.addEventListener('touchend',   e => { const d=e.changedTouches[0].clientX-tx; if(d>50)go(idx-1); else if(d<-50)go(idx+1); }, {passive:true});
  // keyboard
  document.addEventListener('keydown', e => {
    const r=stage.getBoundingClientRect(); if(r.top>window.innerHeight||r.bottom<0)return;
    if(e.key==='ArrowRight')go(idx+1); if(e.key==='ArrowLeft')go(idx-1);
  });

  if(tabsEl) tabsEl.querySelectorAll('.cat-tab').forEach(t => t.addEventListener('click', () => {
    tabsEl.querySelectorAll('.cat-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); cat=t.dataset.cat; idx=0; render();
  }));

  render();
}

makeSlideshow(
  document.querySelector('#projects .cat-tabs'), 'slideshow1','track1','prev1','next1','dots1','count1'
);

// ── Project Detail Overlay ────────────────────────────────
const overlay     = document.getElementById('detail-overlay');
const dHeroImg    = document.getElementById('d-hero-img');
const dCat        = document.getElementById('d-cat');
const dTitle      = document.getElementById('d-title');
const dDesc       = document.getElementById('d-desc');
const dGallery    = document.getElementById('d-gallery');

function openDetail(cat, i) {
  const p = PROJECTS[cat]?.[i]; if(!p) return;
  dCat.textContent   = CAT_LABEL[cat];
  dTitle.textContent = p.title;
  dDesc.textContent  = p.desc;

  // ── Hero: video or image ──────────────────────────────────
  const heroSection = document.querySelector('.detail-hero');
  // Remove any existing video player
  const oldVideo = document.getElementById('d-video-player');
  if(oldVideo) oldVideo.remove();
  dHeroImg.style.display = '';

  if(p.video) {
    // Build the right embed
    let videoHTML = '';
    const yt = p.video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
    const vm = p.video.match(/vimeo\.com\/(\d+)/);

    if(yt) {
      videoHTML = `<iframe id="d-video-player"
        src="https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0"
        frameborder="0" allow="autoplay; fullscreen"
        style="position:absolute;inset:0;width:100%;height:100%;border:none;z-index:2;">
      </iframe>`;
    } else if(vm) {
      videoHTML = `<iframe id="d-video-player"
        src="https://player.vimeo.com/video/${vm[1]}?autoplay=1"
        frameborder="0" allow="autoplay; fullscreen"
        style="position:absolute;inset:0;width:100%;height:100%;border:none;z-index:2;">
      </iframe>`;
    } else {
      // Local mp4
      videoHTML = `<video id="d-video-player" autoplay controls
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;">
        <source src="${p.video}" type="video/mp4">
      </video>`;
    }

    // Show poster image behind video while it loads
    if(p.img) { dHeroImg.src = p.img; dHeroImg.style.background=''; dHeroImg.classList.add('zoomed'); }
    else { dHeroImg.style.display='none'; }
    heroSection.insertAdjacentHTML('beforeend', videoHTML);
  } else {
    // Image only
    if(p.img) { dHeroImg.src=p.img; dHeroImg.style.background=''; }
    else { dHeroImg.removeAttribute('src'); dHeroImg.style.background=CAT_GRAD[cat]; }
    dHeroImg.classList.remove('zoomed');
    requestAnimationFrame(()=>requestAnimationFrame(()=>dHeroImg.classList.add('zoomed')));
  }

  // ── Gallery ───────────────────────────────────────────────
  const gall = p.gallery && p.gallery.length ? p.gallery : [null,null,null,null];
  dGallery.innerHTML = gall.map((s,j) => `<div class="gallery-item${j===0?' wide':''}">
    ${s ? `<img src="${s}" alt="${p.title} ${j+1}">` : `<div style="width:100%;height:100%;background:${CAT_GRAD[cat]};opacity:0.2;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;color:#666;padding:20px;text-align:center">Add images to gallery[] in projects.js</div>`}
  </div>`).join('');

  overlay.classList.add('open');
  document.body.style.overflow='hidden';
  overlay.scrollTop=0;
  dGallery.querySelectorAll('.gallery-item').forEach((el,j)=>setTimeout(()=>el.classList.add('visible'),650+j*110));
}
function closeDetail() {
  overlay.classList.remove('open');
  document.body.style.overflow='';
  // Stop any playing video
  const vp = document.getElementById('d-video-player');
  if(vp) vp.remove();
}
document.getElementById('detail-close').addEventListener('click', closeDetail);
document.addEventListener('keydown', e => { if(e.key==='Escape') closeDetail(); });

// ── Slide text auto-hide after 3s of no cursor movement ──
(function() {
  const IDLE_MS = 3000;
  let idleTimer = null;

  function setIdle() {
    document.querySelectorAll('.slideshow').forEach(s => s.classList.add('slide-idle'));
  }
  function setActive() {
    document.querySelectorAll('.slideshow').forEach(s => s.classList.remove('slide-idle'));
    clearTimeout(idleTimer);
    idleTimer = setTimeout(setIdle, IDLE_MS);
  }

  document.addEventListener('mousemove', setActive);
  document.addEventListener('touchstart', setActive, {passive:true});
  idleTimer = setTimeout(setIdle, IDLE_MS);
})();
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.btn-send');
  const formspreeId = SITE_CONFIG.formspreeId;

  if(!formspreeId || formspreeId === 'YOUR_FORMSPREE_ID') {
    alert('Contact form not yet configured. Set your Formspree ID in the site editor (Shift+E+D → Site Info).');
    return;
  }

  // Accept either a bare ID ("xqevyvvv") or a full URL
  // ("https://formspree.io/f/xqevyvvv") — whatever got pasted in.
  const formspreeUrl = /^https?:\/\//.test(formspreeId)
    ? formspreeId
    : `https://formspree.io/f/${formspreeId.replace(/^\/?f\//, '')}`;

  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    const res = await fetch(formspreeUrl, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    });
    if(res.ok) {
      btn.textContent = 'Message Sent ✓';
      btn.style.opacity = '0.6';
      form.reset();
      setTimeout(() => { btn.textContent = 'Send Message'; btn.style.opacity = ''; btn.disabled = false; }, 4000);
    } else {
      throw new Error('Server error');
    }
  } catch(err) {
    btn.textContent = 'Failed — Try Again';
    btn.disabled = false;
    setTimeout(() => { btn.textContent = 'Send Message'; }, 3000);
  }
}
