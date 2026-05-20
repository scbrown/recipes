import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// Update `site` and `base` when you know the GitHub Pages URL.
// For project pages: site = 'https://<user>.github.io', base = '/<repo>'.
export default defineConfig({
  site: 'https://scbrown.github.io',
  base: '/recipes',
  trailingSlash: 'ignore',
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
  },
});
