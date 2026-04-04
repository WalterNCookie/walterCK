// script.js ----------------------------------------------------

// ── Slug helper (Featured pages + banner) ─────────────────────────────────
function toSlug(title) {
  return title
    .replace(/➶/g, '')
    .replace(/[→↗↑▶►]/g, '')
    .replace(/\([^)]*\)/g, '')   // strip (sm), (wip), etc.
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Copy link (global, used by both regular & featured cards) ──────────────
function copyLink(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    btn.textContent = 'Failed';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}
window.copyLink = copyLink;

// ── Featured sub-page existence check ─────────────────────────────────────
const _fpCache = {};
async function featuredPageExists(slug) {
  if (slug in _fpCache) return _fpCache[slug];
  try {
    const r = await fetch(`/toolkit/${slug}/`, { method: 'HEAD' });
    _fpCache[slug] = r.ok;
  } catch { _fpCache[slug] = false; }
  return _fpCache[slug];
}

window.openFeatured = async function(slug, fallbackLink) {
  if (await featuredPageExists(slug)) {
    window.location.href = `/toolkit/${slug}/`;
  } else {
    window.open(fallbackLink, '_blank');
  }
};

window.copyFeaturedOrLink = async function(btn, slug, fallbackLink) {
  const exists = await featuredPageExists(slug);
  copyLink(btn, exists ? `https://walterck.com/toolkit/${slug}/` : fallbackLink);
};

// ── Toolkit Grid ───────────────────────────────────────────────────────────
const gridContainer = document.getElementById('grid-container');

if (gridContainer) {
  const emptyState      = document.getElementById('empty');
  const searchInput     = document.getElementById('q');
  const filterContainer = document.getElementById('filters');

  let items       = [];
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
      if (isScriptLabel(el.textContent)) { el.classList.add('script-highlight'); found = true; }
      else el.classList.remove('script-highlight');
    });

    document.querySelectorAll('.filter-chip').forEach(el => {
      if (isScriptLabel(el.textContent) || isScriptLabel(el.dataset.cat)) {
        el.classList.add('script-highlight'); found = true;
      } else { el.classList.remove('script-highlight'); }
    });

    if (found) filters && filters.classList.add('script-found');
    else       filters && filters.classList.remove('script-found');

    return found;
  }

  async function loadAll() {
    try {
      const res = await fetch('toolkit.json', { cache: 'no-store' });
      const raw = await res.json();

      const mapObj = raw.find(it => !it.title);
      if (mapObj) categoryMap = mapObj;

      items = raw.filter(it => it.title).map(it => ({
        id:       parseInt(it.id) || 999,
        title:    it.title,
        tag:      it.tags  || '',
        category: it.category || 'General',
        icon:     it.icon  || 'box',
        color:    it.color || '#007AFF',
        link:     it.link  || '#',
        slug:     it.slug  || null,     // optional override in JSON
        isNew:    it.new   === true
      }));

      renderFilters();
      applyFilters();
      document.body.classList.add('loaded');
    } catch (err) {
      console.error('Failed to load toolkit.json', err);
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

  function renderCard(item) {
    const isFeatured = item.category === 'Featured';
    // Use explicit slug from JSON, or auto-generate from title
    const slug     = item.slug || toSlug(item.title);
    const safeLink = item.link.replace(/'/g, '%27');

    const actions = isFeatured
      ? `<button onclick="openFeatured('${slug}','${safeLink}')">Open</button>
         <button onclick="copyFeaturedOrLink(this,'${slug}','${safeLink}')">Copy</button>`
      : `<button onclick="window.open('${item.link}','_blank')">Open</button>
         <button onclick="copyLink(this,'${item.link}')">Copy</button>`;

    return `
      <div class="card">
        <div style="color:${item.color}; margin-bottom:12px;">
          <i data-lucide="${item.icon}" size="28"></i>
        </div>
        <h3>${item.title}</h3>
        <p class="tags">${item.tag}</p>
        <div class="toolkit-actions">
          ${actions}
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

    if (typeof lucide !== 'undefined') lucide.createIcons();
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

// ── Back button: flag toolkit → home navigation ────────────────────────────
// When the back button on the toolkit page is clicked we set a flag so the
// main-page intro animation is suppressed for that one navigation only.
const backBtn = document.querySelector('.back-btn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    sessionStorage.setItem('walterck_toolkit_back', '1');
  });
}

// ── Hamburger nav ──────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const nav       = document.getElementById('nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('show')));
}


// ══════════════════════════════════════════════════════════════════════════
// ── Main Page Intro: Orb Sweep → Clip-path Reveal ─────────────────────────
// Always plays — EXCEPT when the user pressed the toolkit page back button.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (!document.querySelector('.hero-main')) return;
  if (window.scrollY > 1) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── Only guard: toolkit back button ───────────────────────────────────
  const BACK_KEY = 'walterck_toolkit_back';
  if (sessionStorage.getItem(BACK_KEY)) {
    sessionStorage.removeItem(BACK_KEY);
    window._walterck_intro_skipped = true;   // tell banner to appear sooner
    return;
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Lock scroll only during the orb flight
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id    = 'intro-overlay';
  const cvs     = document.createElement('canvas');
  cvs.id        = 'intro-canvas';
  cvs.width     = window.innerWidth;
  cvs.height    = window.innerHeight;
  const orb     = document.createElement('div');
  orb.id        = 'intro-orb';

  document.body.append(overlay, cvs, orb);
  const ctx2d = cvs.getContext('2d');

  // Wait for fonts before measuring layout (prevents FOUT-shifted positions)
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
        return (1-t)*(1-t)*p0 + 2*(1-t)*t*p1 + t*t*p2;
      }
      function easeInOut(t) {
        return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      }
      function lerp(a, b, t) { return a + (b-a)*t; }

      const ORB_MS   = isMobile ? 480 : 800;
      let   orbStart = null;
      let   prevX = sx, prevY = sy;

      orb.style.opacity = '1';
      orb.style.left    = sx + 'px';
      orb.style.top     = sy + 'px';

      function tickOrb(ts) {
        if (!orbStart) orbStart = ts;
        const raw = Math.min((ts - orbStart) / ORB_MS, 1);
        const e   = easeInOut(raw);
        const x   = quad(sx, cpx, tx, e);
        const y   = quad(sy, cpy, ty, e);

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

        if (raw < 1) requestAnimationFrame(tickOrb);
        else         startReveal(tx, ty);
      }

      requestAnimationFrame(tickOrb);

      function startReveal(cx, cy) {
        // Unlock scroll — clip-path handles containment from here
        document.body.style.overflow = '';

        const mainEl = document.querySelector('main');
        mainEl.style.willChange = 'clip-path';
        mainEl.style.clipPath   = `circle(0px at ${cx}px ${cy}px)`;

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


// ══════════════════════════════════════════════════════════════════════════
// ── Global Strip Animation (All Pages EXCEPT Main Page) ───────────────────
// Scroll is NOT frozen — strips are decorative and users can scroll freely.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (document.querySelector('.hero-main')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const intro = document.createElement('div');
  intro.id    = 'site-intro';
  document.body.appendChild(intro);

  const STRIPS    = 11;
  const DURATION  = 1;
  const MIN_DELAY = 0.3;
  const MAX_DELAY = 0.9;

  for (let i = 0; i < STRIPS; i++) {
    const strip     = document.createElement('div');
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
  setTimeout(() => { intro.remove(); }, totalDone);
})();


// ══════════════════════════════════════════════════════════════════════════
// ── Homepage "New" Banner ─────────────────────────────────────────────────
// Reads toolkit.json on the homepage and shows a ticket-shaped banner for
// any item that has "new": true in its JSON properties.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (!document.querySelector('.hero-main')) return;

  fetch('/toolkit/toolkit.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(raw => {
      const newItem = raw.find(it => it.title && it.new === true);
      if (!newItem) return;

      const banner    = document.createElement('div');
      banner.id       = 'new-banner';
      banner.tabIndex = 0;
      banner.setAttribute('role', 'button');
      banner.setAttribute('aria-label', `New shortcut: ${newItem.title}`);
      banner.style.setProperty('--b-color', newItem.color || '#6b8cff');

      const cleanTitle = newItem.title.replace(/[➶→↗▶►]/g, '').trim();
      // Use explicit slug from JSON or auto-generate
      const slug = newItem.slug || toSlug(newItem.title);

      banner.innerHTML = `
        <div class="banner-inner">
          <div class="banner-stub">NEW</div>
          <div class="banner-body">
            <span class="banner-icon"><i data-lucide="${newItem.icon}" width="13" height="13"></i></span>
            <span class="banner-title">${cleanTitle}</span>
          </div>
          <div class="banner-notch"></div>
        </div>
      `;

      document.body.appendChild(banner);

      // Render lucide icon inside the banner
      if (typeof lucide !== 'undefined') lucide.createIcons();

      // Appear after the intro animation has had a moment to establish.
      // If intro was skipped (toolkit back nav), appear quickly.
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const delay    = window._walterck_intro_skipped
        ? 500
        : (isMobile ? 2400 : 5600);

      setTimeout(() => banner.classList.add('visible'), delay);

      // Navigate on click
      const navigate = async () => {
        const exists = await featuredPageExists(slug);
        window.location.href = exists ? `/toolkit/${slug}/` : '/toolkit/';
      };

      banner.addEventListener('click', navigate);
      banner.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); }
      });
    })
    .catch(() => {}); // silently fail — banner is decorative
})();
