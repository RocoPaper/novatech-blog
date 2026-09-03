const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');

function closeMenu() {
  if (!toggle || !nav) return;
  toggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(willOpen));
    nav.classList.toggle('open', willOpen);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
}

const search = document.querySelector('#article-search');
const cards = [...document.querySelectorAll('[data-article]')];
const filters = [...document.querySelectorAll('[data-filter]')];
const status = document.querySelector('#search-status');
const empty = document.querySelector('#no-results');
const clear = document.querySelector('#clear-search');
let category = 'all';

function updateArticles() {
  const query = (search?.value || '').trim().toLowerCase();
  let shown = 0;

  for (const card of cards) {
    const matchesText = !query || card.dataset.search.includes(query);
    const matchesCategory = category === 'all' || card.dataset.category === category;
    const visible = matchesText && matchesCategory;
    card.hidden = !visible;
    if (visible) shown += 1;
  }

  if (status) status.textContent = `${shown} article${shown === 1 ? '' : 's'}`;
  if (empty) empty.hidden = shown !== 0;
}

search?.addEventListener('input', updateArticles);
filters.forEach(button => button.addEventListener('click', () => {
  category = button.dataset.filter;
  filters.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  updateArticles();
}));
clear?.addEventListener('click', () => {
  category = 'all';
  if (search) search.value = '';
  filters.forEach(button => {
    const active = button.dataset.filter === 'all';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateArticles();
  search?.focus();
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = [...document.querySelectorAll('[data-reveal]')];

if (revealItems.length && !reduceMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('reveal-ready');
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealItems.forEach(item => revealObserver.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

const articleHeadings = [...document.querySelectorAll('.prose > h2[id]')];
const tocLinks = [...document.querySelectorAll('.article-rail a')];

if (articleHeadings.length && tocLinks.length && 'IntersectionObserver' in window) {
  const tocObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    tocLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
  }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
  articleHeadings.forEach(heading => tocObserver.observe(heading));
}
