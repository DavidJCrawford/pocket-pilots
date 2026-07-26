---
type: Tech Decision
title: GitHub Pages Deployment
description: Ship Pocket Pilots as a static site — Vite build with base path set to the repo name, published to GitHub Pages via a CI Action.
tags: [tech, deployment, github-pages, vite, ci, decision]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
sources:
  - id: vite-pages
    resource: https://sbcode.net/threejs/github-pages-vite/
    title: Deploying a Three.js + Vite project to GitHub Pages
  - id: base-404
    resource: https://github.com/orgs/community/discussions/156595
    title: GitHub Pages sub-path base 404 discussion
---

# Decision

Build with **Vite** and deploy the static `dist/` to **GitHub Pages** via a GitHub
Action. Vite gives bundling, minification, tree-shaking, GLB asset handling, and dev HMR —
worth the small tooling cost for a real game. [^vite-pages]

(The zero-build alternative — ES modules + an **importmap** loading Three.js from a CDN —
is viable for a no-tooling single-folder prototype, but forgoes minification/bundling of
our own code. Prefer Vite for the shipped game.)

# ⚠️ The one critical gotcha — base path

GitHub Pages serves a project site from `https://<user>.github.io/<reponame>/` — a
**sub-path**. You **must** set the Vite `base` to the repo name or every asset 404s in
production while working fine in `npm run dev`. This is the single most common
"works locally, broken on Pages" failure. [^base-404]

```js
// vite.config.js
export default {
  base: '/pocket-pilots/', // MUST match the repo name (or use './' for relative)
};
```

# CI — publish dist/ to Pages

Use a GitHub Action that builds on push to `main` and deploys with the official Pages
actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Then enable Pages → "GitHub Actions" as the source in repo settings.

# Constraints to respect

- **Static only:** no server code, no custom response headers. That rules out engines
  needing COOP/COEP for WASM threads (a reason Godot web is awkward here — see
  [Three.js rendering](threejs-rendering.md)).
- **Keep first load small:** the whole point of the [Three.js](threejs-rendering.md)
  choice — lean bundle, low-poly GLBs, few textures.
- All asset paths must be relative to `base`; load models/textures via Vite imports or
  `import.meta.env.BASE_URL`, not absolute `/` paths.
