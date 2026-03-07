/* ==========================================================================
   WALTER CK - GLOBAL SCRIPT
   ========================================================================== */

// Check if we are on the Tools page before running Tools logic
const gridContainer = document.getElementById('grid-container');

if (gridContainer) {
  // ---------- TOOLS PAGE LOGIC ----------
  
  const emptyState = document.getElementById('empty');
  const searchInput = document.getElementById('q');
  const filterContainer = document.getElementById('filters');

  let items = [];
  let categoryMap = {};
  let activeFilter = 'All';

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

// ---------- MOBILE NAV (Placeholder) ----------
// If you ever re-add the hamburger menu to your HTML, this will handle it automatically.
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('show')));
}
