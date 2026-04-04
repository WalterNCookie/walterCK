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

      // Reveal the custom scrollbar now that content is painted
      document.body.classList.add('loaded');
    } catch (err) {
      console.error("Failed to load toolkit.json", err);
      document.body.classList.add('loaded');
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


// ── Helper: detect back/forward navigation ─────────────────────────────────
function isBackForwardNav() {
  try {
    const entries = performance.getEntriesByType('navigation');
    if (entries && entries.length > 0) return entries[0].type === 'back_forward';
  } catch (e) {}
  try {
    return performance.navigation.type === 2;
  } catch (e) {}
  return false;
}


// ── Main Page Intro: Orb Sweep → Clip-path Reveal ────────────────────────────
(function () {
  if (!document.querySelector('.hero-main')) return;
  if (window.scrollY > 1) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── Guard 1: browser back/forward navigation API ───────────────────────────
  if (isBackForwardNav()) return;

  // ── Guard 2: sessionStorage — animation already played this tab session ────
  const SS_KEY = 'walterck_intro_played';
  if (sessionStorage.getItem(SS_KEY)) return;

  // ── Guard 3: localStorage TTL — belt-and-suspenders for mobile browsers
  //    where the performance API or sessionStorage can be unreliable on back
  //    navigation. If the animation played within the last 2 minutes, skip it.
  const LS_KEY = 'walterck_intro_at';
  const TTL    = 120_000; // 2 minutes in ms
  const lastAt = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  if (Date.now() - lastAt < TTL) return;

  // Mark as played before any async work so concurrent loads can't double-fire
  sessionStorage.setItem(SS_KEY, '1');
  localStorage.setItem(LS_KEY, String(Date.now()));

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Lock scroll only during the orb flight — released the moment reveal starts
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';

  const cvs   = document.createElement('canvas');
  cvs.id      = 'intro-canvas';
  cvs.width   = window.innerWidth;
  cvs.height  = window.innerHeight;

  const orb   = document.createElement('div');
  orb.id      = 'intro-orb';

  document.body.append(overlay, cvs, orb);

  const ctx2d = cvs.getContext('2d');

  // ── Wait for fonts before measuring layout ─────────────────────────────────
  // Oxanium (loaded via Google Fonts) shifts layout metrics until it's active.
  // Measuring getBoundingClientRect() before that makes the orb target the
  // FOUT-shifted position instead of the true centre — causes the left-miss bug
  // on first mobile boot.
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => {
      const pfp = document.querySelector('.profile-pfp');
      if (!pfp) { cleanup(); return; }

      const rect = pfp.getBoundingClientRect();
      const tx   = rect.left + rect.width  / 2;
      const ty   = rect.top  + rect.height / 2;

      const sx  = -18;
      const sy  = window.innerHeight * 0.5;

      const cpx = window.innerWidth  * 0.36;
      const cpy = ty - Math.min(105, window.innerHeight * 0.15);

      function quad(p0, p1, p2, t) {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
      }
      function easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
      function lerp(a, b, t) { return a + (b - a) * t; }

      const ORB_MS = isMobile ? 480 : 800;
      let orbStart = null;
      let prevX = sx, prevY = sy;

      orb.style.opacity = '1';
      orb.style.left    = sx + 'px';
      orb.style.top     = sy + 'px';

      function tickOrb(ts) {
        if (!orbStart) orbStart = ts;
        const raw = Math.min((ts - orbStart) / ORB_MS, 1);
        const e   = easeInOut(raw);

        const x = quad(sx, cpx, tx, e);
        const y = quad(sy, cpy, ty, e);

        // Skip canvas trail on mobile — too expensive on lower-end hardware
        if (!isMobile) {
          ctx2d.beginPath();
          ctx2d.moveTo(prevX, prevY);
          ctx2d.lineTo(x, y);
          ctx2d.lineWidth   = lerp(2.5, 0.4, e);
          ctx2d.strokeStyle = `rgba(107,140,255,${lerp(0.45, 0.06, e)})`;
          ctx2d.shadowColor = '#6b8cff';
          ctx2d.shadowBlur  = 10;
          ctx2d.stroke();
          ctx2d.shadowBlur  = 0;
        }
        prevX = x; prevY = y;

        const scale = lerp(0.55, 2.6, e);
        orb.style.left      = x + 'px';
        orb.style.top       = y + 'px';
        orb.style.transform = `translate(-50%,-50%) scale(${scale})`;

        if (raw < 1) {
          requestAnimationFrame(tickOrb);
        } else {
          startReveal(tx, ty);
        }
      }

      requestAnimationFrame(tickOrb);

      function startReveal(cx, cy) {
        // Unlock scroll immediately — clip-path handles the visual containment
        // from here, no reason to block the user through the 2-5s reveal.
        document.body.style.overflow = '';

        const mainEl = document.querySelector('main');

        // Promote to GPU compositor layer before animating clip-path
        mainEl.style.willChange = 'clip-path';
        mainEl.style.clipPath   = `circle(0px at ${cx}px ${cy}px)`;

        // Impact flash: orb blooms then vanishes
        orb.style.transition = 'transform 0.13s ease-out, opacity 0.13s ease-out';
        orb.style.transform  = 'translate(-50%,-50%) scale(6)';
        orb.style.opacity    = '0';

        requestAnimationFrame(() => {
          overlay.remove();
          cvs.style.transition = 'opacity 0.12s';
          cvs.style.opacity    = '0';

          const revealDuration = isMobile ? '2s'  : '5s';
          const revealEase     = isMobile
            ? 'cubic-bezier(0.16, 1, 0.3, 1)'
            : 'cubic-bezier(0.22, 1, 0.36, 1)';

          requestAnimationFrame(() => {
            mainEl.style.transition = `clip-path ${revealDuration} ${revealEase}`;
            mainEl.style.clipPath   = `circle(200vmax at ${cx}px ${cy}px)`;

            // Only need to remove the clip-path styles after the transition ends
            const cleanupDelay = isMobile ? 2100 : 5200;
            setTimeout(cleanup, cleanupDelay);
          });
        });
      }

      function cleanup() {
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.style.transition = '';
          mainEl.style.clipPath   = '';
          mainEl.style.willChange = '';
        }
        [overlay, cvs, orb].forEach(el => el?.remove());
      }
    });
  });
})();


// ── Global Strip Animation (All Pages EXCEPT Main Page) ──────────────────────
(function () {
  if (document.querySelector('.hero-main')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Lock scroll for the duration of the strip animation
  document.body.style.overflow = 'hidden';

  const intro = document.createElement('div');
  intro.id = 'site-intro';
  document.body.appendChild(intro);

  const STRIPS    = 11;
  const DURATION  = 1;
  const MIN_DELAY = 0.3;
  const MAX_DELAY = 0.9;

  for (let i = 0; i < STRIPS; i++) {
    const strip = document.createElement('div');
    strip.className = 'intro-strip';
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    const pct   = 100 / STRIPS;
    strip.style.cssText = `
      top: calc(${i * pct}% - 0.5px);
      height: calc(${pct}% + 1px);
      animation: stripWipe ${DURATION}s cubic-bezier(0.16, 1, 0.3, 1) forwards ${delay.toFixed(3)}s;
    `;
    intro.appendChild(strip);
  }

  const totalDone = (MAX_DELAY + DURATION + 0.15) * 1000;
  setTimeout(() => {
    intro.remove();
    document.body.style.overflow = '';
  }, totalDone);
})();
