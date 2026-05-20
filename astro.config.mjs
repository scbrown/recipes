import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// In CI on GitHub Pages, `actions/configure-pages` sets SITE and BASE_PATH.
// Locally we fall back to a sensible default for the project page.
const site = process.env.SITE ?? 'https://scbrown.github.io';
const base = process.env.BASE_PATH ?? '/recipes';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
  },
});
