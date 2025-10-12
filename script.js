// ---------- MOBILE NAV ----------
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('show')));
}

// ---------- TOOLS PAGE ----------
const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
const q = document.getElementById('q');
const sortSelect = document.getElementById('sort'); // hidden select
const empty = document.getElementById('empty');

let items = [];
let activeTag = null;

// ******** FETCH DATA ********
async function fetchData() {
  const r = await fetch('/tools/tools.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('tools.json not found');
  return await r.json();
}

// ******** NORMALIZE ITEMS ********
function normalizeItems(raw){
  return (raw||[]).map(it=>{
    const detected = [];
    const t = String(it.tags || '').toLowerCase();

    if (t.includes('scriptable')) detected.push('Scriptable');
    if (t.includes('shortcut')) detected.push('Shortcuts');

    // leave empty if nothing detected
    return {
      title: it.title || (it.path ? it.path.split('/').pop().replace(/\.js$/i,'') : 'Untitled'),
      desc: it.desc || '',
      tags: detected, // 0,1, or 2 tags
      link: it.link || ''
    };
  });
}

function escapeHtml(s){ 
  if(!s && s !== 0) return ''; 
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

function makeIcon(title, type) {
  // Decide gradient background based on type
  let bgStyle = '';
  if (type === 'Shortcuts') {
    bgStyle = 'background: linear-gradient(180deg, rgba(91,224,192,0.12), rgba(107,140,255,0.04));';
  } else if (type === 'Scriptable') {
    bgStyle = 'background: linear-gradient(180deg, rgba(107,140,255,0.12), rgba(91,224,192,0.04));';
  } else {
    bgStyle = 'background: rgba(255,255,255,0.02);';
  }

  // Use first letter as fallback
  const initial = title && title[0] ? title[0].toUpperCase() : '?';

  return `<div class="icon" style="${bgStyle}">
            <span class="icon-letter">${initial}</span>
          </div>`;
}



function renderCard(item){
  const tagsHtml = (item.tags || []).map(tag => `<div class="tag-pill">${escapeHtml(tag)}</div>`).join('');
  const desc = escapeHtml(item.desc || '');
  const link = escapeHtml(item.link || '#');

  return `<article class="tool-card" data-title="${escapeHtml(item.title)}" data-desc="${escapeHtml(item.desc)}" data-tags="${escapeHtml(item.tags.join(','))}">
    <div class="card-top">
      ${makeIcon(item.title,item.tags[0] || '')}
      <div style="min-width:0;flex:1;">
        <h3 style="margin:0 0 6px 0;">${escapeHtml(item.title)}</h3>
        <p class="card-desc">${desc}</p>
        <div class="card-tags">${tagsHtml}</div>
      </div>
    </div>
    <div class="card-actions">
      <a class="btn small primary" href="${link}" target="_blank" rel="noopener noreferrer">Open</a>
      <button class="btn small ghost copy-btn" data-link="${link}">Copy link</button>
    </div>
  </article>`;
}

function attachCopyButtons(){
  document.querySelectorAll('.copy-btn').forEach(b=>{
    b.removeEventListener('click', copyHandler);
    b.addEventListener('click', copyHandler);
  });
}

async function copyHandler(e){
  const link = e.currentTarget.getAttribute('data-link') || '';
  if (!link) { showToast('No link available'); return; }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
    } else {
      const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    showToast('Link copied');
  } catch (err){ showToast('Copy failed'); }
}

function showToast(msg){
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._to);
  t._to = setTimeout(()=> t.classList.remove('show'), 1600);
}

function renderList(list){
  if (!list || list.length === 0) {
    grid.innerHTML = ''; empty.style.display = 'block'; return;
  }
  empty.style.display = 'none';
  grid.innerHTML = list.map(renderCard).join('');
  attachCopyButtons();
}

function gatherTags(list){
  const s = new Set();
  list.forEach(it => (it.tags || []).forEach(tag => s.add(tag)));
  return Array.from(s).sort();
}

function buildChips(allTags){
  chips.innerHTML = '';

  const btnAll = document.createElement('button');
  btnAll.className = 'chip' + (activeTag === null ? ' active' : '');
  btnAll.textContent = 'All';
  btnAll.addEventListener('click', ()=>{ activeTag = null; applyFilters(); updateChips(); });
  chips.appendChild(btnAll);

  allTags.forEach(t=>{
    const b = document.createElement('button');
    b.className = 'chip' + (activeTag === t ? ' active' : '');
    b.textContent = t;
    b.addEventListener('click', ()=> {
      activeTag = (activeTag === t) ? null : t;
      applyFilters();
      updateChips();
    });
    chips.appendChild(b);
  });
}

function updateChips(){
  document.querySelectorAll('.chip').forEach(el=>{
    el.classList.remove('active');
    if ((activeTag === null && el.textContent === 'All') || (activeTag !== null && el.textContent === activeTag)) el.classList.add('active');
  });
}

function applyFilters(){
  const qv = (q.value || '').trim().toLowerCase();
  let filtered = items.slice();

  if (activeTag) {
    filtered = filtered.filter(it => (it.tags || []).some(tag => tag.toLowerCase() === activeTag.toLowerCase()));
  }
  if (qv) {
    filtered = filtered.filter(it => ((it.title||'') + ' ' + (it.desc||'') + ' ' + (it.tags||[]).join(' ')).toLowerCase().includes(qv));
  }

  if (sortSelect.value === 'alpha') filtered.sort((a,b)=>a.title.localeCompare(b.title));
  else if (sortSelect.value === 'alpha-desc') filtered.sort((a,b)=>b.title.localeCompare(a.title));
  else if (sortSelect.value === 'type-first') filtered.sort((a,b)=> a.tags.join(',').localeCompare(b.tags.join(',')) || a.title.localeCompare(b.title));

  renderList(filtered);
}

// ---------- LOAD DATA ----------
async function loadAll(){
  try {
    const raw = await fetchData();
    items = normalizeItems(raw);
    const tags = gatherTags(items);
    buildChips(tags);
    applyFilters();
  } catch(err){
    grid.innerHTML = `<div style="color:var(--muted); padding:18px;">Failed to load data.<br><small>${escapeHtml(String(err))}</small></div>`;
    empty.style.display='none';
    console.error(err);
  }
}

// ---------- SEARCH ----------
let debounce;
q.addEventListener('input', ()=>{ clearTimeout(debounce); debounce = setTimeout(applyFilters, 200);});

// ---------- CUSTOM DROPDOWN ----------
const dropdown = document.getElementById('sort-dropdown');
const button = dropdown.querySelector('.custom-select-button');
const options = dropdown.querySelectorAll('.custom-select-option');

options.forEach(opt => {
  opt.addEventListener('click', () => {
    const value = opt.dataset.value;
    button.textContent = opt.textContent + ' ▾';
    dropdown.querySelector('.custom-select-options').classList.add('hidden');

    sortSelect.value = value;
    applyFilters();
  });
});

button.addEventListener('click', () => {
  dropdown.querySelector('.custom-select-options').classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!dropdown.contains(e.target)) {
    dropdown.querySelector('.custom-select-options').classList.add('hidden');
  }
});

// ---------- INIT ----------
loadAll();
