// script.js — mobile nav only
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', ()=> nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=> nav.classList.remove('show')));
}
