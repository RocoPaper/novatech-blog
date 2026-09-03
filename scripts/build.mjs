import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const site = JSON.parse(await readFile(path.join(root, 'config/site.json'), 'utf8'));
const posts = JSON.parse(await readFile(path.join(root, 'content/posts.json'), 'utf8'));

const cleanDashes = value => String(value).replace(/[—–]/g, '-');
const esc = value => cleanDashes(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));
const url = pathname => `${site.baseUrl}${pathname}`;
const coverPath = post => `/static/images/${post.slug}.jpg`;
const coverAlt = post => `${post.title} editorial cover`;
const headingId = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const words = post => post.blocks
  .map(block => [
    block.text,
    ...(block.items || []).flatMap(item => typeof item === 'string'
      ? [item]
      : [item.title, item.text, item.question, item.answer]),
    ...(block.rows || []).flat()
  ].filter(Boolean).join(' '))
  .join(' ')
  .replace(/<[^>]+>/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .length;
const reading = post => Math.max(1, Math.ceil(words(post) / 220));
const fmt = date => new Intl.DateTimeFormat('en-SA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
}).format(new Date(`${date}T00:00:00Z`));

function brandLogo(className = '') {
  return `<picture class="brand-logo ${className}"><source media="(prefers-color-scheme: dark)" srcset="/static/brand/novatech-horizontal-dark.svg"><img src="/static/brand/novatech-horizontal-light.svg" width="1200" height="320" alt="Novatech Digital Solutions"></picture>`;
}

function header(active = '') {
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="shell nav-wrap">
      <a class="brand" href="/" aria-label="Novatech home">${brandLogo('brand-logo-header')}</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
        <span class="sr-only">Toggle menu</span><span aria-hidden="true"></span><span aria-hidden="true"></span>
      </button>
      <nav id="site-nav" aria-label="Primary navigation">
        <a ${active === 'home' ? 'aria-current="page"' : ''} href="/">Home</a>
        <a ${active === 'blog' ? 'aria-current="page"' : ''} href="/blog/">Blog</a>
        <a ${active === 'about' ? 'aria-current="page"' : ''} href="/about/">About</a>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="shell footer-main">
      <div class="footer-brand">
        <a class="brand" href="/" aria-label="Novatech home">${brandLogo('brand-logo-footer')}</a>
        <p>${esc(site.tagline)}</p>
      </div>
      <nav class="footer-links" aria-label="Footer navigation">
        <div><strong>Explore</strong><a href="/blog/">All articles</a><a href="/about/">About</a></div>
        <div><strong>Follow</strong><a href="/rss.xml">RSS feed</a><a href="/feed.json">JSON feed</a></div>
      </nav>
    </div>
    <div class="shell footer-base">
      <span>© ${new Date().getUTCFullYear()} ${esc(site.name)}.</span>
      <span>Independent, evidence-led technology publishing.</span>
    </div>
  </footer>`;
}

function layout({
  title,
  description,
  canonical,
  body,
  active = '',
  image = '/static/social-card.svg',
  type = 'website',
  jsonLd = [],
  pageClass = '',
  preloadImage = ''
}) {
  const fullTitle = title === site.name ? `${site.name} - ${site.tagline}` : `${title} | ${site.name}`;
  const page = `<!doctype html>
  <html lang="en-SA">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${esc(fullTitle)}</title>
      <meta name="description" content="${esc(description)}">
      <meta name="theme-color" content="#f6f9fc" media="(prefers-color-scheme: light)">
      <meta name="theme-color" content="#07111f" media="(prefers-color-scheme: dark)">
      <link rel="canonical" href="${esc(canonical)}">
      <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
      ${preloadImage ? `<link rel="preload" as="image" href="${esc(preloadImage)}" fetchpriority="high">` : ''}
      <link rel="stylesheet" href="/static/styles.css">
      <link rel="alternate" type="application/rss+xml" title="Novatech RSS" href="/rss.xml">
      <meta property="og:type" content="${type}">
      <meta property="og:site_name" content="${esc(site.name)}">
      <meta property="og:title" content="${esc(fullTitle)}">
      <meta property="og:description" content="${esc(description)}">
      <meta property="og:url" content="${esc(canonical)}">
      <meta property="og:image" content="${url(image)}">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${esc(fullTitle)}">
      <meta name="twitter:description" content="${esc(description)}">
      <meta name="twitter:image" content="${url(image)}">
      ${jsonLd.map(data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`).join('')}
    </head>
    <body class="${esc(pageClass)}">
      ${header(active)}
      ${body}
      ${footer()}
      <script src="/static/app.js" defer></script>
    </body>
  </html>`;
  return cleanDashes(page);
}

function renderBlock(block) {
  switch (block.type) {
    case 'paragraph':
      return `<p>${cleanDashes(block.text)}</p>`;
    case 'heading': {
      const level = block.level === 3 ? 3 : 2;
      return `<h${level} id="${headingId(block.text)}">${esc(block.text)}</h${level}>`;
    }
    case 'callout':
      return `<aside class="callout"><strong>${esc(block.title)}</strong><p>${esc(block.text)}</p></aside>`;
    case 'list':
      return `<ul class="${block.style === 'check' ? 'check-list' : ''}">${block.items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
    case 'steps':
      return `<ol class="steps">${block.items.map((item, index) => `<li><span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div></li>`).join('')}</ol>`;
    case 'table':
      return `<div class="table-wrap" tabindex="0"><table><thead><tr>${block.headers.map(headerText => `<th>${esc(headerText)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'faq':
      return `<div class="faq-list">${block.items.map(item => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</div>`;
    default:
      throw new Error(`Unknown block type: ${block.type}`);
  }
}

function storyCard(post, { variant = '', headingLevel = 2, eager = false } = {}) {
  const Heading = `h${headingLevel}`;
  return `<article class="story-card ${variant}" data-article data-category="${esc(post.category.toLowerCase())}" data-search="${esc(`${post.title} ${post.excerpt} ${post.tags.join(' ')}`.toLowerCase())}">
    <a class="card-link" href="/blog/${post.slug}/">
      <figure class="story-card-media"><img src="${coverPath(post)}" width="1536" height="1024" loading="${eager ? 'eager' : 'lazy'}" decoding="async" alt="${esc(coverAlt(post))}"></figure>
      <div class="story-card-copy">
        <span class="story-category">${esc(post.category)}</span>
        <${Heading}>${esc(post.title)}</${Heading}>
        <p>${esc(post.excerpt)}</p>
        <span class="card-meta"><time datetime="${post.published}">${fmt(post.published)}</time><span>${reading(post)} min read</span></span>
      </div>
    </a>
  </article>`;
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'static'), path.join(dist, 'static'), { recursive: true });
await cp(path.join(root, 'new-brand', 'logos'), path.join(dist, 'static', 'brand'), { recursive: true });
await cp(path.join(root, 'new-brand', 'logos', 'novatech-favicon.svg'), path.join(dist, 'static', 'favicon.svg'));

const featured = posts.find(post => post.featured) || posts[0];
const latest = posts.filter(post => post.slug !== featured.slug).slice(0, 3);
const categories = [...new Set(posts.map(post => post.category))];

const homeBody = `<main id="main">
  <section class="home-hero shell">
    <div class="hero-copy" data-reveal>
      <h1>Ideas you can put to work.</h1>
      <p>${esc(site.tagline)} Clear guides for builders and businesses in Saudi Arabia.</p>
      <div class="hero-actions"><a class="button button-primary" href="/blog/">Browse articles</a><a class="button button-secondary" href="/about/">About Novatech</a></div>
    </div>
    <figure class="hero-media" data-reveal><img src="${coverPath(featured)}" width="1536" height="1024" fetchpriority="high" decoding="async" alt="${esc(coverAlt(featured))}"></figure>
  </section>
  <section class="signal-strip" aria-label="Novatech editorial principles">
    <div class="shell signal-grid">
      <p><strong>Clear sources</strong><span>Claims anchored in evidence.</span></p>
      <p><strong>Practical constraints</strong><span>Time, cost, security, and people.</span></p>
      <p><strong>Saudi perspective</strong><span>Guidance grounded in the region.</span></p>
    </div>
  </section>
  <section class="section shell feature-section" data-reveal>
    <div class="section-intro"><span class="section-kicker">Featured guide</span><h2>Start with a practical playbook.</h2></div>
    <article class="featured-story">
      <a class="featured-media" href="/blog/${featured.slug}/"><img src="${coverPath(featured)}" width="1536" height="1024" loading="lazy" decoding="async" alt="${esc(coverAlt(featured))}"></a>
      <div class="featured-copy">
        <span class="story-category">${esc(featured.category)}</span>
        <h3><a href="/blog/${featured.slug}/">${esc(featured.title)}</a></h3>
        <p>${esc(featured.excerpt)}</p>
        <div class="article-meta"><span>By ${esc(featured.author)}</span><time datetime="${featured.published}">${fmt(featured.published)}</time><span>${reading(featured)} min read</span></div>
        <a class="text-link" href="/blog/${featured.slug}/">Read the guide</a>
      </div>
    </article>
  </section>
  <section class="section topic-section">
    <div class="shell">
      <div class="section-intro" data-reveal><h2>Technology, explained for use.</h2><p>Four areas, one standard: useful context before confident action.</p></div>
      <div class="topic-grid">
        <article class="topic topic-ai" data-reveal><h3>Practical AI</h3><p>Workflows, agents, and adoption without magical thinking.</p></article>
        <article class="topic topic-tools" data-reveal><h3>Useful tools</h3><p>Software worth learning, with its limits clearly stated.</p></article>
        <article class="topic topic-emerging" data-reveal><h3>Emerging tech</h3><p>Signals that matter beyond launch-day noise.</p></article>
        <article class="topic topic-business" data-reveal><h3>Tech business</h3><p>Building durable products and companies in the region.</p></article>
      </div>
    </div>
  </section>
  <section class="section shell latest-section">
    <div class="section-intro" data-reveal><span class="section-kicker">Latest articles</span><h2>New thinking, grounded.</h2><a class="text-link" href="/blog/">Browse articles</a></div>
    <div class="latest-grid">${latest.map((post, index) => storyCard(post, { variant: index === 0 ? 'story-card-lead' : '', headingLevel: 3 })).join('')}</div>
  </section>
  <section class="section shell newsletter" data-reveal>
    <div class="newsletter-copy"><h2>A useful signal, occasionally.</h2><p>One considered note when there is something worth saying.</p></div>
    <div class="newsletter-preview" aria-labelledby="newsletter-status">
      <p id="newsletter-status">Subscriptions will open soon.</p>
      <div class="field"><label for="newsletter-email">Work email</label><div class="field-row"><input id="newsletter-email" type="email" placeholder="name@company.com" disabled><button class="button button-primary" type="button" disabled>Subscribe</button></div></div>
    </div>
  </section>
  <section class="section mission-section">
    <div class="shell mission-grid" data-reveal>
      <img src="/static/brand/novatech-mark.svg" width="512" height="512" loading="lazy" alt="" aria-hidden="true">
      <div><h2>Useful over noisy.</h2><p>Grounded explanations for founders, operators, and curious professionals navigating technology in Saudi Arabia.</p><a class="text-link" href="/about/">About Novatech</a></div>
    </div>
  </section>
</main>`;

await writeFile(path.join(dist, 'index.html'), layout({
  title: site.name,
  description: site.description,
  canonical: url('/'),
  body: homeBody,
  active: 'home',
  pageClass: 'home-page',
  preloadImage: coverPath(featured)
}));

const blogBody = `<main id="main">
  <header class="page-hero shell" data-reveal><h1>Practical technology, carefully explained.</h1><p>Guides, operating notes, and honest evaluations for ambitious teams.</p></header>
  <section class="shell listing">
    <div class="filters" aria-label="Article filters">
      <div class="search-field"><label for="article-search">Search articles</label><input id="article-search" type="search" placeholder="Title, topic, or keyword" autocomplete="off"></div>
      <div class="filter-buttons" aria-label="Filter by category"><button class="active" data-filter="all" aria-pressed="true">All</button>${categories.map(category => `<button data-filter="${esc(category.toLowerCase())}" aria-pressed="false">${esc(category)}</button>`).join('')}</div>
    </div>
    <p id="search-status" class="search-status" aria-live="polite">${posts.length} article${posts.length === 1 ? '' : 's'}</p>
    <div class="cards-list">${posts.map((post, index) => storyCard(post, { variant: index === 0 ? 'story-card-featured' : '', eager: index === 0 })).join('')}</div>
    <div id="no-results" class="no-results" hidden><img src="/static/brand/novatech-mark.svg" width="512" height="512" alt=""><h2>No matching articles</h2><p>Try a broader search or reset the filters.</p><button id="clear-search" class="button button-secondary" type="button">Reset filters</button></div>
  </section>
</main>`;

await mkdir(path.join(dist, 'blog'), { recursive: true });
await writeFile(path.join(dist, 'blog', 'index.html'), layout({
  title: 'Blog',
  description: `Browse ${site.name} guides on practical AI, emerging technology, useful tools, and technology business.`,
  canonical: url('/blog/'),
  body: blogBody,
  active: 'blog',
  pageClass: 'blog-page',
  preloadImage: coverPath(posts[0])
}));

for (const post of posts) {
  const postUrl = url(`/blog/${post.slug}/`);
  const faq = post.blocks.find(block => block.type === 'faq');
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: cleanDashes(post.title),
    description: cleanDashes(post.description),
    datePublished: post.published,
    dateModified: post.updated,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: { '@type': 'ImageObject', url: url('/static/favicon.svg') }
    },
    mainEntityOfPage: postUrl,
    image: url(coverPath(post)),
    inLanguage: 'en-SA',
    keywords: post.tags.join(', '),
    ...(faq ? {
      mainEntity: faq.items.map(item => ({
        '@type': 'Question',
        name: cleanDashes(item.question),
        acceptedAnswer: { '@type': 'Answer', text: cleanDashes(item.answer) }
      }))
    } : {})
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: url('/') },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: url('/blog/') },
      { '@type': 'ListItem', position: 3, name: cleanDashes(post.title), item: postUrl }
    ]
  };
  const related = posts.filter(candidate => candidate.slug !== post.slug).slice(0, 2);
  const content = post.blocks.map(renderBlock).join('');
  const articleBody = `<main id="main">
    <article>
      <header class="article-header">
        <div class="shell article-heading" data-reveal>
          <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span>${esc(post.category)}</span></nav>
          <span class="story-category">${esc(post.category)}</span>
          <h1>${esc(post.title)}</h1>
          <p class="dek">${esc(post.description)}</p>
          <div class="article-meta"><span>By <strong>${esc(post.author)}</strong></span><time datetime="${post.published}">${fmt(post.published)}</time><span>${reading(post)} min read</span></div>
        </div>
        <figure class="shell article-cover" data-reveal><img src="${coverPath(post)}" width="1536" height="1024" fetchpriority="high" decoding="async" alt="${esc(coverAlt(post))}"></figure>
      </header>
      <div class="article-layout shell">
        <aside class="article-rail">
          <strong>In this guide</strong>
          <nav>${post.blocks.filter(block => block.type === 'heading' && block.level === 2).map(block => `<a href="#${headingId(block.text)}">${esc(block.text)}</a>`).join('')}</nav>
        </aside>
        <div class="prose">${content}
          <section class="sources"><h2 id="sources">Sources and further reading</h2><ol>${post.sources.map(source => `<li><a href="${esc(source.url)}" rel="noopener noreferrer">${esc(source.title)}</a><span>${esc(source.publisher)}</span></li>`).join('')}</ol></section>
          <section class="share"><strong>Share this guide</strong><div><a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}" rel="noopener noreferrer">LinkedIn</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(cleanDashes(post.title))}" rel="noopener noreferrer">X / Twitter</a><a href="mailto:?subject=${encodeURIComponent(cleanDashes(post.title))}&body=${encodeURIComponent(postUrl)}">Email</a></div></section>
        </div>
      </div>
      <section class="section related shell"><div class="section-intro"><h2>${related.length ? 'Continue reading' : 'More from Novatech'}</h2></div>${related.length ? `<div class="related-grid">${related.map(relatedPost => storyCard(relatedPost, { headingLevel: 3 })).join('')}</div>` : `<p>New practical guides are on the way. Browse the journal or follow the RSS feed.</p><a class="button button-primary" href="/blog/">Browse articles</a>`}</section>
    </article>
  </main>`;
  const dir = path.join(dist, 'blog', post.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), layout({
    title: post.title,
    description: post.description,
    canonical: postUrl,
    body: articleBody,
    active: 'blog',
    type: 'article',
    image: coverPath(post),
    jsonLd: [articleLd, breadcrumbLd],
    pageClass: 'article-page',
    preloadImage: coverPath(post)
  }));
}

const aboutBody = `<main id="main">
  <header class="page-hero about-hero shell" data-reveal>
    <div><h1>Clarity for people building what is next.</h1><p>Novatech is an independent, English-first publication for Saudi Arabia's builders, operators, and technology-curious professionals.</p></div>
    <figure><img src="/static/brand/novatech-mark.svg" width="512" height="512" alt="Novatech blue N mark"></figure>
  </header>
  <section class="section shell about-layout">
    <aside><p>Independent. Practical. Evidence-led.</p></aside>
    <div class="about-copy prose">
      <h2>Our purpose</h2><p>Technology coverage often sits at two unhelpful extremes: breathless prediction or dense specialist detail. Novatech takes a third path. We explain what a technology does, where it is useful, what can go wrong, and how a thoughtful team can try it responsibly.</p>
      <h2>Our editorial standard</h2><p>We prefer primary sources, conservative claims, visible limitations, and useful next steps. We do not invent certainty, statistics, customers, or results. When an article touches legal, medical, financial, or regulatory questions, it is a starting point for qualified advice, not a substitute for it.</p>
      <h2>Who writes Novatech</h2><p>Novatech is written and edited by ${esc(site.author)} with a focus on practical AI, emerging technology, useful tools, and the craft of building technology businesses in Saudi Arabia.</p>
      <h2>Stay connected</h2><p>A public contact channel and the Novatech newsletter are coming soon. Until then, every published guide remains available through the journal and RSS feed.</p>
    </div>
  </section>
  <section class="section shell about-principles" data-reveal>
    <h2>How we work</h2>
    <div><article><h3>Start with evidence</h3><p>Primary sources come before confident claims.</p></article><article><h3>Show the limits</h3><p>Tradeoffs and failure modes belong in the explanation.</p></article><article><h3>End with action</h3><p>Readers should know what to test next.</p></article></div>
  </section>
</main>`;

await mkdir(path.join(dist, 'about'), { recursive: true });
await writeFile(path.join(dist, 'about', 'index.html'), layout({
  title: 'About',
  description: `About ${site.name}, an independent practical technology publication for an English-first Saudi audience.`,
  canonical: url('/about/'),
  body: aboutBody,
  active: 'about',
  pageClass: 'about-page'
}));

const notFound = `<main id="main" class="not-found shell"><div data-reveal><span class="error-code">404</span><h1>This page is off the grid.</h1><p>The address may have changed, or the page may never have existed.</p><a class="button button-primary" href="/">Return home</a></div><img src="/static/brand/novatech-mark.svg" width="512" height="512" alt="" aria-hidden="true"></main>`;
await writeFile(path.join(dist, '404.html'), layout({
  title: 'Page not found',
  description: 'The requested Novatech page could not be found.',
  canonical: url('/404.html'),
  body: notFound,
  pageClass: 'not-found-page'
}));

const entries = posts.map(post => ({ loc: `/blog/${post.slug}/`, lastmod: post.updated }));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
  { loc: '/', lastmod: posts[0]?.updated },
  { loc: '/blog/', lastmod: posts[0]?.updated },
  { loc: '/about/', lastmod: posts[0]?.updated },
  ...entries
].map(entry => `<url><loc>${url(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod></url>`).join('')}</urlset>`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n`);

const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.name)}</title><link>${site.baseUrl}</link><description>${esc(site.description)}</description><language>${site.language}</language>${posts.map(post => `<item><title>${esc(post.title)}</title><link>${url(`/blog/${post.slug}/`)}</link><guid>${url(`/blog/${post.slug}/`)}</guid><pubDate>${new Date(`${post.published}T00:00:00Z`).toUTCString()}</pubDate><description>${esc(post.description)}</description></item>`).join('')}</channel></rss>`;
await writeFile(path.join(dist, 'rss.xml'), rss);
await writeFile(path.join(dist, 'feed.json'), JSON.stringify({
  version: 'https://jsonfeed.org/version/1.1',
  title: site.name,
  home_page_url: site.baseUrl,
  feed_url: url('/feed.json'),
  description: site.description,
  authors: [{ name: site.author }],
  items: posts.map(post => ({
    id: url(`/blog/${post.slug}/`),
    url: url(`/blog/${post.slug}/`),
    title: cleanDashes(post.title),
    summary: cleanDashes(post.description),
    image: url(coverPath(post)),
    date_published: `${post.published}T00:00:00Z`,
    date_modified: `${post.updated}T00:00:00Z`,
    tags: post.tags
  }))
}, null, 2));

console.log(`Built ${posts.length} article and ${4 + posts.length} HTML pages in dist/`);
