// script.js — theme toggle + mobile nav (robust)
const root = document.documentElement;
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
const themeToggle = document.getElementById('theme-toggle');

function setTheme(t){
  if(t === 'dark') {
    root.setAttribute('data-theme','dark');
    try { localStorage.theme = 'dark'; } catch(e){}
    if (themeToggle) themeToggle.textContent = 'Light';
  } else {
    root.removeAttribute('data-theme');
    try { localStorage.theme = 'light'; } catch(e){}
    if (themeToggle) themeToggle.textContent = 'Dark';
  }
}

// initialize theme safely
try {
  const saved = (typeof localStorage !== 'undefined' && localStorage.theme) ? localStorage.theme : null;
  if (saved === 'dark') setTheme('dark');
  else setTheme('light');
} catch (e) {
  // fallback
  setTheme('light');
}

if (themeToggle) {
  themeToggle.addEventListener('click', ()=>{
    const current = (typeof localStorage !== 'undefined' && localStorage.theme === 'dark') ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// mobile nav
if (hamburger && nav) {
  hamburger.addEventListener('click', ()=> nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=> nav.classList.remove('show')));
}
