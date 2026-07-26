import { defineConfig } from 'vite';

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/ — a sub-path.
// `base` MUST match the repo name or every asset 404s in production (works in dev, breaks
// on Pages). See knowledge/pocket-pilots/tech-stack/deployment-github-pages.md.
export default defineConfig({
  base: '/pocket-pilots/',
  // Force a single `three` instance so core and `three/addons` share it (otherwise the dev
  // dependency optimiser can load two copies, breaking cross-module checks like mergeGeometries).
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three'] },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
