import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sitePlugin } from './scripts/sitePlugin.ts';
import { games } from './src/games/registry.ts';

const root = import.meta.dirname;

// One HTML entry per ready game, generated from the registry, plus the homepage.
const input: Record<string, string> = { home: resolve(root, 'index.html') };
for (const g of games) {
  if (g.ready) input[g.id] = resolve(root, `allgames/${g.id}/index.html`);
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    sitePlugin(process.env.SITE_URL ?? 'https://muhit-1.github.io/TurnTable/'),
  ],
  build: { rollupOptions: { input } },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
