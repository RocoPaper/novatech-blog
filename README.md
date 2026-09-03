# Novatech

A dependency-free static editorial site for practical AI and technology, written for an English-first Saudi audience. The build uses Node.js standard library only and outputs fully rendered, crawlable pages.

## Local commands

Requires Node.js 22 or newer.

```bash
pnpm check     # validate source, build, then verify generated SEO output
pnpm build     # generate dist/
pnpm validate  # validate source and, when present, generated output
pnpm dev       # serve dist/ at http://localhost:3000 (builds if missing)
```

In PowerShell, `$env:PORT=4000; pnpm dev` selects another port.

## Project structure

- `config/site.json` — publication identity and canonical base URL.
- `content/posts.json` — structured article source used by automation.
- `scripts/build.mjs` — static page, feed, sitemap, and asset generator.
- `scripts/validate.mjs` — source and generated SEO checks.
- `scripts/server.mjs` — small local static server.
- `static/` — shared CSS, progressive-enhancement JavaScript, and artwork.
- `dist/` — generated deployment output; ignored by Git.

## Content schema

`content/posts.json` is an array. Every post requires:

- `title`, unique kebab-case `slug`, `description`, and `excerpt`
- ISO `published` and `updated` dates (`YYYY-MM-DD`)
- `author`, `category`, and at least two `tags`
- `featured` boolean (optional)
- ordered `blocks`
- at least three `sources` with `title`, `publisher`, and HTTPS `url`

Supported blocks are:

- `paragraph`: `{ "type": "paragraph", "text": "..." }` (trusted inline links are supported)
- `heading`: `{ "type": "heading", "level": 2, "text": "..." }` (levels 2–3)
- `callout`: `title` and `text`
- `list`: string `items`, with optional `style: "check"`
- `steps`: object `items` containing `title` and `text`
- `table`: `headers` and `rows`
- `faq`: object `items` containing `question` and `answer`

Articles must contain at least 1,200 words, correctly ordered headings, and an FAQ with at least three entries. The initial editorial target is more substantial than the validator floor.

## Daily automation path

A daily cron or publishing job should:

1. Read `config/site.json` and `content/posts.json`.
2. Append one complete post object to the JSON array without changing existing slugs.
3. Preserve source URLs and only make conservative, supportable claims.
4. Run `pnpm check`.
5. Publish only if the command exits successfully.

Use a temporary file plus an atomic rename when updating `posts.json`; never stream a partial JSON document into place. The generator sorts nothing implicitly, so place newest posts first if that is the desired listing order. Because pages contain complete article HTML, search crawlers and feed readers do not depend on client-side JavaScript.

## Deployment on Netlify

Connect this repository to Netlify. `netlify.toml` specifies `pnpm build`, publishes `dist`, requests Node 22, enables clean URLs, and applies security and cache headers. There is deliberately no SPA catch-all redirect. The production URL configured in `site.json` is `https://novatech-ar.netlify.app`; update it before deploying to another domain, then run `pnpm check` again.

The newsletter UI is intentionally disabled and labeled **Coming soon**. It does not submit data or claim a subscription succeeded.
