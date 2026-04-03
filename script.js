// script.js ----------------------------------------------------

const gridContainer = document.getElementById('grid-container');

if (gridContainer) {
  const emptyState = document.getElementById('empty');
  const searchInput = document.getElementById('q');
  const filterContainer = document.getElementById('filters');

  let items = [];
  let categoryMap = {};
  let activeFilter = 'All';

  function isScriptLabel(text) {
    if (!text) return false;
    const t = text.trim().toLowerCase();
    return t === 'script' || t === 'scripts' || /\bscript(s)?\b/.test(t);
  }

  function highlightScripts() {
    const hero = document.querySelector('.toolkit-hero');
    const filters = document.getElementById('filters');
    let found = false;

    document.querySelectorAll('.category-title').forEach(el => {
      if (isScriptLabel(el.textContent)) {
        el.classList.add('script-highlight');
        found = true;
      } else {
        el.classList.remove('script-highlight');
      }
    });

    document.querySelectorAll('.filter-chip').forEach(el => {
      if (isScriptLabel(el.textContent) || isScriptLabel(el.dataset.cat)) {
        el.classList.add('script-highlight');
        found = true;
      } else {
        el.classList.remove('script-highlight');
      }
    });

    if (found) {
      filters && filters.classList.add('script-found');
    } else {
      filters && filters.classList.remove('script-found');
    }

    return found;
  }

  async function loadAll() {
    try {
      const res = await fetch('toolkit.json', { cache: 'no-store' });
      const raw = await res.json();

      const mapObj = raw.find(it => !it.title);
      if (mapObj) categoryMap = mapObj;

      items = raw.filter(it => it.title).map(it => ({
        id: parseInt(it.id) || 999,
        title: it.title,
        tag: it.tags || '',
        category: it.category || 'General',
        icon: it.icon || 'box',
        color: it.color || '#007AFF',
        link: it.link || '#'
      }));

      renderFilters();
      applyFilters();
    } catch (err) {
      console.error("Failed to load toolkit.json", err);
    }
  }

  function renderFilters() {
    const categories = ['All', ...Object.keys(categoryMap).sort(
      (a, b) => (parseInt(categoryMap[a]) || 999) - (parseInt(categoryMap[b]) || 999)
    )];

    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-chip ${activeFilter === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>
    `).join('');

    filterContainer.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.cat;
        renderFilters();
        applyFilters();
      });
    });

    highlightScripts();
  }

  function copyLink(btn, url) {
    navigator.clipboard.writeText(url).then(() => {
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
  }

  window.copyLink = copyLink;

  function renderCard(item) {
    return `
      <div class="card">
        <div style="color:${item.color}; margin-bottom:12px;">
          <i data-lucide="${item.icon}" size="28"></i>
        </div>
        <h3>${item.title}</h3>
        <p class="tags">${item.tag}</p>
        <div class="toolkit-actions">
          <button onclick="window.open('${item.link}','_blank')">Open</button>
          <button onclick="copyLink(this, '${item.link}')">Copy</button>
        </div>
      </div>
    `;
  }

  function renderList(list) {
    if (!list.length) {
      gridContainer.innerHTML = '';
      emptyState.style.display = 'block';
      highlightScripts();
      return;
    }
    emptyState.style.display = 'none';

    const groups = list.reduce((acc, it) => {
      (acc[it.category] ??= []).push(it);
      return acc;
    }, {});

    const sortedCats = Object.keys(groups).sort(
      (a, b) => (parseInt(categoryMap[a]) || 999) - (parseInt(categoryMap[b]) || 999)
    );

    gridContainer.innerHTML = sortedCats.map(cat => `
      <div class="category-section">
        <h2 class="category-title">${cat}</h2>
        <div class="grid">${groups[cat].map(renderCard).join('')}</div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    highlightScripts();
  }

  function applyFilters() {
    const val = searchInput.value.toLowerCase();

    const filtered = items.filter(it => {
      const matchesSearch = it.title.toLowerCase().includes(val) ||
                            it.category.toLowerCase().includes(val) ||
                            it.tag.toLowerCase().includes(val);
      const matchesCategory = activeFilter === 'All' || it.category === activeFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.id - b.id);

    renderList(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  loadAll();
}

// hamburger nav
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('show')));
}


// ── Intro Star Animation (main page only) ────────────────────────────────────
if (document.querySelector('.hero-main')) {
  initIntroAnimation();
}

function initIntroAnimation() {
  // ── Inject styles ──
  const style = document.createElement('style');
  style.textContent = `
    #intro-overlay {
      position: fixed;
      inset: 0;
      background: #05070a;
      z-index: 9000;
      pointer-events: all;
      transition: opacity 0.55s ease;
    }
    #intro-canvas {
      position: fixed;
      inset: 0;
      z-index: 9001;
      pointer-events: none;
    }
    #intro-star {
      position: fixed;
      z-index: 9002;
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -50%);
      font-size: 22px;
      line-height: 1;
      will-change: left, top, transform, opacity;
      filter:
        drop-shadow(0 0 6px rgba(107,140,255,1))
        drop-shadow(0 0 18px rgba(107,140,255,0.7))
        drop-shadow(0 0 35px rgba(107,140,255,0.4));
    }
    #intro-burst {
      position: fixed;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 9001;
      pointer-events: none;
      opacity: 0;
      width: 0;
      height: 0;
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM elements ──
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';

  const canvas = document.createElement('canvas');
  canvas.id = 'intro-canvas';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const starEl = document.createElement('div');
  starEl.id = 'intro-star';
  starEl.textContent = '★';

  const burst = document.createElement('div');
  burst.id = 'intro-burst';

  document.body.append(overlay, canvas, starEl, burst);

  const ctx = canvas.getContext('2d');

  // ── Wait one frame so layout is complete ──
  requestAnimationFrame(() => {
    const pfp  = document.querySelector('.profile-pfp');
    if (!pfp) { cleanup(); return; }

    const r  = pfp.getBoundingClientRect();
    const tx = r.left + r.width  / 2;   // profile pic centre X
    const ty = r.top  + r.height / 2;   // profile pic centre Y

    // Star start: far-left edge, roughly 48% down the viewport
    const sx  = -28;
    const sy  = window.innerHeight * 0.48;

    // Bezier control point: creates a graceful upward swoop
    const cpx = window.innerWidth  * 0.38;
    const cpy = ty - Math.min(130, window.innerHeight * 0.18);

    // ── Helpers ──
    const lerp = (a, b, t) => a + (b - a) * t;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }
    function bezierPt(p0, p1, p2, t) {
      return (1-t)*(1-t)*p0 + 2*(1-t)*t*p1 + t*t*p2;
    }

    // ── Phase 1 — Star sweeps to profile pic ──
    const STAR_MS = 820;
    let starStart = null;
    let prevX = sx, prevY = sy;

    starEl.style.opacity = '1';

    function tickStar(ts) {
      if (!starStart) starStart = ts;
      const raw = Math.min((ts - starStart) / STAR_MS, 1);
      const e   = easeInOutCubic(raw);

      const x = bezierPt(sx, cpx, tx, e);
      const y = bezierPt(sy, cpy, ty, e);

      // Trailing glow line
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.lineWidth   = lerp(2.5, 0.8, e);
      ctx.strokeStyle = `rgba(107,140,255,${lerp(0.75, 0.25, e)})`;
      ctx.shadowColor = '#6b8cff';
      ctx.shadowBlur  = 14;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Gently fade the earliest parts of the trail as we near the end
      if (raw > 0.55) {
        const fade = (raw - 0.55) / 0.45;
        ctx.fillStyle = `rgba(5,7,10,${fade * 0.18})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      prevX = x; prevY = y;

      // Scale + spin the star slightly as it moves
      const scale = lerp(0.7, 1.9, e);
      const spin  = e * 180;
      starEl.style.left      = x + 'px';
      starEl.style.top       = y + 'px';
      starEl.style.transform = `translate(-50%,-50%) scale(${scale}) rotate(${spin}deg)`;

      if (raw < 1) {
        requestAnimationFrame(tickStar);
      } else {
        // ── Star arrived — brief flash, then burst ──
        starEl.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
        starEl.style.opacity    = '0';
        starEl.style.transform  = `translate(-50%,-50%) scale(3.5) rotate(200deg)`;
        setTimeout(() => startBurst(tx, ty), 90);
      }
    }

    requestAnimationFrame(tickStar);

    // ── Phase 2 — Burst expands from profile pic centre ──
    function startBurst(cx, cy) {
      const maxDim  = Math.hypot(window.innerWidth, window.innerHeight);
      const maxSize = maxDim * 2.4;
      const BURST_MS = 680;
      let burstStart = null;

      burst.style.left       = cx + 'px';
      burst.style.top        = cy + 'px';
      burst.style.background = 'radial-gradient(circle, rgba(107,140,255,0.95) 0%, rgba(107,140,255,0.5) 25%, rgba(107,140,255,0.12) 60%, transparent 100%)';
      burst.style.opacity    = '1';

      function tickBurst(ts) {
        if (!burstStart) burstStart = ts;
        const raw = Math.min((ts - burstStart) / BURST_MS, 1);
        const e   = easeOutQuart(raw);

        const size = maxSize * e;
        burst.style.width   = size + 'px';
        burst.style.height  = size + 'px';
        burst.style.opacity = String(1 - e * 0.97);

        if (raw < 1) {
          requestAnimationFrame(tickBurst);
        } else {
          revealPage();
        }
      }

      requestAnimationFrame(tickBurst);
    }

    // ── Phase 3 — Dissolve everything, page is revealed ──
    function revealPage() {
      // Fade trail canvas
      canvas.style.transition = 'opacity 0.35s ease';
      canvas.style.opacity    = '0';

      // Fade overlay — page content shows through underneath
      overlay.style.opacity = '0';

      setTimeout(cleanup, 580);
    }

    function cleanup() {
      [overlay, canvas, starEl, burst, style].forEach(el => el?.remove());
    }
  });
}
