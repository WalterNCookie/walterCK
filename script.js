// script.js (updated) ----------------------------------------------------

// Check if we are on the Tools page before running Tools logic
const gridContainer = document.getElementById('grid-container');

if (gridContainer) {
  // TOOLS PAGE LOGIC
  
  const emptyState = document.getElementById('empty');
  const searchInput = document.getElementById('q');
  const filterContainer = document.getElementById('filters');

  let items = [];
  let categoryMap = {};
  let activeFilter = 'All';

  // ---- Highlight logic for Script/Scripts categories/filters ----
  function isScriptLabel(text) {
    if (!text) return false;
    const t = text.trim().toLowerCase();
    // match exact 'script' or 'scripts' or contain the word 'script'
    return t === 'script' || t === 'scripts' || /\bscript(s)?\b/.test(t);
  }

  function highlightScripts() {
    const hero = document.querySelector('.tools-hero');
    const filters = document.getElementById('filters');
    let found = false;

    // Mark category titles
    document.querySelectorAll('.category-title').forEach(el => {
      if (isScriptLabel(el.textContent)) {
        el.classList.add('script-highlight');
        found = true;
      } else {
        el.classList.remove('script-highlight');
      }
    });

    // Mark filter chips
    document.querySelectorAll('.filter-chip').forEach(el => {
      if (isScriptLabel(el.textContent) || isScriptLabel(el.dataset.cat)) {
        el.classList.add('script-highlight', 'pulse');
        el.setAttribute('aria-label', (el.getAttribute('aria-label') || el.textContent) + ' — script category');
        found = true;
      } else {
        el.classList.remove('script-highlight', 'pulse');
      }
    });

    // Add overall container state
    if (found) {
      hero && hero.classList.add('script-found');
      filters && filters.classList.add('script-found');
    } else {
      hero && hero.classList.remove('script-found');
      filters && filters.classList.remove('script-found');
    }

    return found;
  }

  // Optional: observe DOM changes to catch dynamically-added filters/categories
  function installHighlightObserver() {
    const observeTargets = [ filterContainer, gridContainer ].filter(Boolean);
    if (!observeTargets.length) return;

    const mo = new MutationObserver((mutations) => {
      let changed = false;
      for (const m of mutations) {
        if (m.type === 'childList' || m.type === 'characterData' || m.type === 'attributes') {
          changed = true;
          break;
        }
      }
      if (changed) {
        // microtask debounce
        Promise.resolve().then(highlightScripts);
      }
    });

    observeTargets.forEach(target => mo.observe(target, { childList: true, subtree: true, characterData: true, attributes: true }));
  }

  // ---- End highlight logic ----

  // Fetch JSON data and initialize
  async function loadAll() {
    try {
      // Fetching from tools.json. Because script is requested from tools/index.html, 
      // the relative path 'tools.json' works perfectly.
      const res = await fetch('tools.json', { cache: 'no-store' });
      const raw = await res.json();

      // Find the object that maps categories to order values (e.g. { "System Monitoring": 1 })
      const mapObj = raw.find(it => !it.title);
      if (mapObj) categoryMap = mapObj;

      // Extract valid tool items
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

      // start observing for dynamically added items (if any)
      installHighlightObserver();
    } catch (err) { 
      console.error("Failed to load tools.json", err); 
    }
  }

  // Generate category filter buttons
  function renderFilters() {
    // Sort categories based on the categoryMap logic found in the JSON
    const categories = ['All', ...Object.keys(categoryMap).sort(
      (a, b) => (parseInt(categoryMap[a]) || 999) - (parseInt(categoryMap[b]) || 999)
    )];

    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-chip ${activeFilter === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>
    `).join('');

    // Attach click listeners to new filter buttons
    filterContainer.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.cat;
        renderFilters();
        applyFilters();
      });
    });

    // run highlight after filters have been rendered
    highlightScripts();
  }

  // Create HTML structure for a single card
  function renderCard(item) {
    return `
      <div class="card">
        <div style="color:${item.color}; margin-bottom:12px;">
          <i data-lucide="${item.icon}" size="28"></i>
        </div>
        <h3>${item.title}</h3>
        <p class="tags">${item.tag}</p>
        <div class="tool-actions">
          <button onclick="window.open('${item.link}','_blank')">Open</button>
          <button onclick="navigator.clipboard.writeText('${item.link}')">Copy</button>
        </div>
      </div>
    `;
  }

  // Group items by category and render them to the grid
  function renderList(list) {
    if (!list.length) {
      gridContainer.innerHTML = '';
      emptyState.style.display = 'block';
      // ensure highlight reset
      highlightScripts();
      return;
    }
    emptyState.style.display = 'none';

    // Group items
    const groups = list.reduce((acc, it) => { 
      (acc[it.category] ??= []).push(it); 
      return acc; 
    }, {});
    
    // Sort category headers
    const sortedCats = Object.keys(groups).sort(
      (a, b) => (parseInt(categoryMap[a]) || 999) - (parseInt(categoryMap[b]) || 999)
    );

    // Build grid output
    gridContainer.innerHTML = sortedCats.map(cat => `
      <div class="category-section">
        <h2 class="category-title">${cat}</h2>
        <div class="grid">${groups[cat].map(renderCard).join('')}</div>
      </div>
    `).join('');

    // Re-initialize Lucide icons for the newly generated elements
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // run highlight after list renders
    highlightScripts();
  }

  // Run search and category filters
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

  // Listen to search bar typing
  searchInput.addEventListener('input', applyFilters);
  
  // Start execution
  loadAll();
}

// hamburger nav logic (unchanged)
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('show')));
}
