const toggle=document.querySelector('.nav-toggle');
const nav=document.querySelector('#site-nav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));nav.classList.toggle('open',!open)});nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{toggle.setAttribute('aria-expanded','false');nav.classList.remove('open')}))}
const search=document.querySelector('#article-search');
const cards=[...document.querySelectorAll('[data-article]')];
const filters=[...document.querySelectorAll('[data-filter]')];
const status=document.querySelector('#search-status');
const empty=document.querySelector('#no-results');
let category='all';
function update(){const query=(search?.value||'').trim().toLowerCase();let shown=0;for(const card of cards){const matchText=!query||card.dataset.search.includes(query);const matchCategory=category==='all'||card.dataset.category===category;const visible=matchText&&matchCategory;card.hidden=!visible;if(visible)shown++}if(status)status.textContent=`${shown} article${shown===1?'':'s'}`;if(empty)empty.hidden=shown!==0}
search?.addEventListener('input',update);
filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;filters.forEach(item=>item.classList.toggle('active',item===button));update()}));
