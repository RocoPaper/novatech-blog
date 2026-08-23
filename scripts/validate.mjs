import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const posts = JSON.parse(await readFile(path.join(root,'content/posts.json'),'utf8'));
const site = JSON.parse(await readFile(path.join(root,'config/site.json'),'utf8'));
const errors = [];
const assert = (condition,message) => { if (!condition) errors.push(message); };
const dateRx = /^\d{4}-\d{2}-\d{2}$/;
const urlRx = /^https:\/\/[A-Za-z0-9.-]+(?:[/:?#][^\s]*)?$/;
const wordCount = post => post.blocks.map(b=>[b.text,...(b.items||[]).flatMap(i=>typeof i==='string'?[i]:[i.title,i.text,i.question,i.answer]),...(b.rows||[]).flat()].filter(Boolean).join(' ')).join(' ').replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;

assert(site.name && site.baseUrl && site.author && site.tagline && site.description,'site.json is missing required fields');
assert(urlRx.test(site.baseUrl),'site.baseUrl must be an HTTPS URL');
assert(Array.isArray(posts) && posts.length > 0,'posts.json must contain at least one post');
const slugs = new Set();
for (const [index,post] of posts.entries()) {
  const p = `post[${index}]`;
  for (const key of ['title','slug','description','excerpt','published','updated','author','category']) assert(post[key],`${p} missing ${key}`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug),`${p} slug is invalid`);
  assert(!slugs.has(post.slug),`${p} slug is duplicated: ${post.slug}`); slugs.add(post.slug);
  assert(post.description?.length >= 120 && post.description?.length <= 170,`${p} description should be 120–170 characters`);
  assert(dateRx.test(post.published) && !Number.isNaN(Date.parse(post.published)),`${p} published date is invalid`);
  assert(dateRx.test(post.updated) && !Number.isNaN(Date.parse(post.updated)),`${p} updated date is invalid`);
  assert(new Date(post.updated) >= new Date(post.published),`${p} updated date precedes published date`);
  assert(Array.isArray(post.tags) && post.tags.length >= 2,`${p} needs at least two tags`);
  assert(Array.isArray(post.blocks) && post.blocks.length > 0,`${p} has no blocks`);
  assert(wordCount(post) >= 1200,`${p} has only ${wordCount(post)} words; minimum is 1200`);
  const headings = post.blocks.filter(b=>b.type==='heading');
  assert(headings.some(h=>h.level===2),`${p} needs level-2 headings`);
  let previous = 1;
  for (const h of headings) { assert([2,3].includes(h.level),`${p} has unsupported heading level ${h.level}`); assert(h.level <= previous+1,`${p} skips heading level before “${h.text}”`); previous=h.level; }
  const faq = post.blocks.find(b=>b.type==='faq');
  assert(faq && Array.isArray(faq.items) && faq.items.length >= 3,`${p} needs an FAQ with at least three questions`);
  assert(Array.isArray(post.sources) && post.sources.length >= 3,`${p} needs at least three sources`);
  for (const source of post.sources||[]) assert(source.title && source.publisher && urlRx.test(source.url),`${p} has an invalid source`);
}

let hasDist = true;
try { await stat(path.join(root,'dist')); } catch { hasDist = false; }
if (hasDist) {
  const required = ['index.html','blog/index.html','about/index.html','404.html','sitemap.xml','robots.txt','rss.xml','feed.json','static/styles.css','static/app.js','static/favicon.svg','static/social-card.svg'];
  for (const file of required) { try { await stat(path.join(root,'dist',file)); } catch { errors.push(`generated file missing: dist/${file}`); } }
  let sitemap=''; try { sitemap=await readFile(path.join(root,'dist/sitemap.xml'),'utf8'); } catch {}
  for (const post of posts) {
    const rel=`blog/${post.slug}/index.html`; let html='';
    try { html=await readFile(path.join(root,'dist',rel),'utf8'); } catch { errors.push(`generated article missing: dist/${rel}`); continue; }
    assert(html.includes(`<title>${post.title} | ${site.name}</title>`),`${rel} has incorrect title`);
    assert(html.includes(`<meta name="description" content="${post.description.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">`),`${rel} missing meta description`);
    assert(html.includes(`<link rel="canonical" href="${site.baseUrl}/blog/${post.slug}/">`),`${rel} missing canonical`);
    assert(html.includes('"@type":"BlogPosting"'),`${rel} missing BlogPosting schema`);
    assert(html.includes('"@type":"BreadcrumbList"'),`${rel} missing BreadcrumbList schema`);
    assert(html.includes('<article>') && html.includes('<h1>') && html.includes('Sources and further reading'),`${rel} lacks crawlable article body`);
    assert(sitemap.includes(`${site.baseUrl}/blog/${post.slug}/`),`sitemap missing ${post.slug}`);
  }
}
if (errors.length) { console.error(`Validation failed (${errors.length}):\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Validated ${posts.length} post (${posts.map(wordCount).join(', ')} words).${hasDist?' Generated SEO files verified.':' Source validation only; dist not built yet.'}`);
