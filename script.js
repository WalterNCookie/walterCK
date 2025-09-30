// tiny interactivity: theme toggle + mobile nav
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

function setTheme(t){
  if(t === 'dark') {
    root.setAttribute('data-theme','dark');
    localStorage.theme = 'dark';
    themeToggle.textContent = 'Light';
  } else {
    root.removeAttribute('data-theme');
    localStorage.theme = 'light';
    themeToggle.textContent = 'Dark';
  }
}

themeToggle.addEventListener('click', ()=>{
  const current = localStorage.theme === 'dark' ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
});

if(localStorage.theme === 'dark') setTheme('dark');

hamburger.addEventListener('click', ()=> nav.classList.toggle('show'));

// close nav on link click (mobile)
nav.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> nav.classList.remove('show')));
