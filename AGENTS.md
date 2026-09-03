# Repository Guidelines

## Project Structure & Module Organization

This repository builds a dependency-free static editorial site with Node.js 22. Publication metadata lives in `config/site.json`; articles are stored as structured records in `content/posts.json`. Build, validation, and local-server logic live in `scripts/`. Shared browser assets are in `static/`. The build generates deployable pages, feeds, and SEO files under `dist/`; this directory is ignored and must not be edited by hand. Netlify behavior and security headers are defined in `netlify.toml`.

## Build, Test, and Development Commands

Use `pnpm` for all JavaScript commands.

- `pnpm validate` checks site configuration, article schema, dates, sources, word counts, headings, and any existing generated output.
- `pnpm build` recreates `dist/` from the configuration, content, and static assets.
- `pnpm dev` builds when needed and serves the site at `http://localhost:3000`.
- `pnpm validate && pnpm build && pnpm validate` runs the complete pre-PR quality gate.

Set a different local port in PowerShell with `$env:PORT=4000; pnpm dev`.

## Coding Style & Naming Conventions

Use ECMAScript modules and Node standard-library APIs; avoid adding dependencies without a clear need. Follow the existing JavaScript style: two-space indentation, single quotes, semicolons, `camelCase` variables and functions, and `const` by default. Keep JSON formatted with two spaces. Use kebab-case for article slugs and generated URL paths, for example `choose-business-password-manager`. Preserve accessible semantic HTML and kebab-case CSS class names.

## Content & Testing Guidelines

There is no separate unit-test framework. Treat validation plus a clean build as the test suite. Every post must have a unique slug, ISO dates, a 120–170 character description, at least 1,200 words, two tags, three HTTPS sources, level 2–3 headings, and an FAQ with at least three entries. After visual or client-side changes, run `pnpm dev` and check the home page, blog listing, one article, search/filter behavior, and the 404 page at narrow and wide widths.

## Commit & Pull Request Guidelines

Follow the concise history convention: `content: add <slug>` for articles and Conventional Commit-style prefixes such as `feat:`, `fix:`, or `docs:` for other work. Keep commits focused. Pull requests should summarize the change, list validation performed, link relevant issues, and include screenshots for visible UI changes. Call out updates to `config/site.json`, canonical URLs, Netlify headers, or content schema explicitly.
