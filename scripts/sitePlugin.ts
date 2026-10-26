import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
import { games } from '../src/games/registry';

/**
 * Site-wide extras that every HTML page needs, generated from the game registry so nothing is listed twice:
 * meta/SEO tags, the web app manifest, sitemap + robots and an offline service worker
 * that precaches every built file (except the large Scrabble word list, which is cached when first used).
 */
export function sitePlugin(siteUrl: string): Plugin[] {
  const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const main: Plugin = {
    name: 'turntable-site',
    transformIndexHtml(html, ctx) {
      const game = /allgames\/([^/]+)\//.exec(ctx.path);
      const meta = game ? games.find((g) => g.id === game[1]) : undefined;
      const up = game ? '../../' : './';
      const title = meta ? `${meta.title} — TurnTable` : 'TurnTable — two-player games on one screen';
      const description = meta
        ? `Play ${meta.title} free in your browser with a friend or the computer. ${meta.objective}`
        : `${games.length} two-player games for one shared screen: chess, checkers, Connect Four, Go, Backgammon and more. Play with a friend or the computer, free, no sign-up.`;
      const url = game ? `${base}allgames/${game[1]}/` : base;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const ld = {
        '@context': 'https://schema.org',
        '@type': game ? 'VideoGame' : 'WebSite',
        name: meta ? meta.title : 'TurnTable',
        url,
        description,
        ...(game ? { gamePlatform: 'Web browser', numberOfPlayers: { '@type': 'QuantitativeValue', value: 2 } } : {}),
      };
      const tags = [
        { tag: 'meta', attrs: { name: 'description', content: esc(description) }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#2b2016' }, injectTo: 'head' as const },
        { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' as const },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: `${up}favicon.svg` }, injectTo: 'head' as const },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${up}icons/icon-192.png` }, injectTo: 'head' as const },
        { tag: 'link', attrs: { rel: 'manifest', href: `${up}manifest.webmanifest` }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'TurnTable' }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:title', content: esc(title) }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:description', content: esc(description) }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:url', content: url }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:image', content: `${base}og-image.png` }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' as const },
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(ld), injectTo: 'head' as const },
      ];
      // Preload the two fonts the first screen uses (their file names carry a content hash, so look them up in the bundle).
      if (ctx.bundle) {
        for (const name of Object.keys(ctx.bundle)) {
          if (/(alfa-slab-one|figtree)-latin.*\.woff2$/.test(name)) {
            tags.push({
              tag: 'link',
              attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `${up}${name}` },
              injectTo: 'head',
            } as (typeof tags)[number]);
          }
        }
      }
      if (!ctx.server) {
        tags.push({
          tag: 'script',
          children: `if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('${up}sw.js').catch(function(){})})`,
          injectTo: 'body' as const,
        } as (typeof tags)[number]);
      }
      // App shell: real text and the right background in the first HTML bytes, so the page paints before any script or stylesheet arrives.
      const heading = meta ? meta.title : 'TurnTable';
      const critical = game
        ? 'html,body{background:#2b2016}body{margin:0;min-height:100vh;color:#ede1c8;background:radial-gradient(1100px 700px at 12% -10%,rgba(201,144,63,.17),transparent 55%),#2b2016}.boot{max-width:980px;margin:0 auto;padding:64px 16px;text-align:center}.boot h1{font:italic 600 clamp(34px,5vw,56px)/1.1 Georgia,serif;margin:0 0 12px}.boot p{margin:0;opacity:.8;font:16px system-ui,sans-serif}'
        : 'body{margin:0;min-height:100vh;color:#4a3520;background:linear-gradient(180deg,#fffaf0,#f6ecd6)}.boot{padding:72px 16px;text-align:center}.boot h1{font:700 clamp(48px,8vw,84px)/1 system-ui,sans-serif;color:#c05a12;margin:0 0 12px}.boot p{margin:0;opacity:.75;font:16px system-ui,sans-serif}';
      tags.push({ tag: 'style', children: critical, injectTo: 'head-prepend' } as (typeof tags)[number]);
      const shell = `<div id="root"><div class="boot"><h1>${esc(heading)}</h1><p>${game ? 'Setting up the board…' : `${games.length} two-player games, one shared screen.`}</p></div></div>`;
      return {
        html: html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`).replace('<div id="root"></div>', shell),
        tags,
      };
    },
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle);
      const precache = files.filter((f) => !/(^|\/)words-/.test(f));
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      const extra = ['favicon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'og-image.png'];
      const pages = ['./', ...games.filter((g) => g.ready).map((g) => `allgames/${g.id}/`)];
      const list = [...new Set([...pages, ...precache, ...extra])];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// Generated at build time. Precaches the whole site so every game works offline.
const CACHE = 'turntable-${version}';
const PRECACHE = ${JSON.stringify(list)};
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('turntable-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }),
    ),
  );
});
`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
          base,
          ...games.filter((g) => g.ready).map((g) => `${base}allgames/${g.id}/`),
        ]
          .map((u) => `  <url><loc>${u}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n` });
    },
  };
  // Stylesheets load without blocking the first paint (the inline critical CSS above covers it).
  const asyncCss: Plugin = {
    name: 'turntable-async-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const total = (html.match(/<link rel="stylesheet"/g) ?? []).length;
        if (total === 0) return html;
        const out = html.replace(
          /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g,
          (_m, a: string, href: string, b: string) => {
            const attrs = `${a}href="${href}"${b}`;
            return `<link rel="stylesheet"${attrs} media="print" onload="this.media='all';var d=document.documentElement;d.dataset.css=(+d.dataset.css||0)+1"><noscript><link rel="stylesheet"${attrs}></noscript>`;
          },
        );
        // Until every stylesheet is in, keep the app hidden (the boot text stays visible) so there is no unstyled flash.
        const hide = `<style>html:not([data-css="${total}"]) #root>:not(.boot){visibility:hidden}</style>`;
        return out.replace('</head>', `${hide}</head>`);
      },
    },
  };
  return [main, asyncCss];
}
