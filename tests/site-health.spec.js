// @ts-check
const { test, expect } = require('@playwright/test');
const http = require('http');
const { parse } = require('node-html-parser');

const BASE = 'http://localhost:3199';

/**
 * All HTML pages in the site.
 */
const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/mission/', name: 'Mission' },
  { path: '/focus/', name: 'Focus Index' },
  { path: '/focus/accessibility.html', name: 'Focus: Accessibility' },
  { path: '/focus/applied-research.html', name: 'Focus: Applied Research' },
  { path: '/focus/indigenous-communities.html', name: 'Focus: Indigenous Communities' },
  { path: '/focus/linguistic-tuning.html', name: 'Focus: Linguistic Tuning' },
  { path: '/focus/society-culture.html', name: 'Focus: Society & Culture' },
  { path: '/focus/sovereign-ai.html', name: 'Focus: Sovereign AI' },
  { path: '/research/', name: 'Research Index' },
  { path: '/research/ai-landscape-2026.html', name: 'Research: AI Landscape 2026' },
  { path: '/research/seniors-ai.html', name: 'Research: Seniors & AI' },
  { path: '/research/sovereign-ai.html', name: 'Research: Sovereign AI' },
];

/**
 * Fetch a URL following redirects. Returns { status, body }.
 */
function fetch(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const next = new URL(res.headers.location, url).href;
        res.resume();
        resolve(fetch(next, maxRedirects - 1));
        return;
      }
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

/**
 * HEAD request following redirects — returns final status code.
 */
function head(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'HEAD' }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const next = new URL(res.headers.location, url).href;
        res.resume();
        resolve(head(next, maxRedirects - 1));
        return;
      }
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
}

test.describe('Page loads — HTTP 200', () => {
  for (const page of PAGES) {
    test(`${page.name} (${page.path}) returns 200`, async () => {
      const { status } = await fetch(`${BASE}${page.path}`);
      expect(status).toBe(200);
    });
  }
});

test.describe('CSS and JS assets load (no 404s)', () => {
  for (const page of PAGES) {
    test(`${page.name} — all CSS/JS assets resolve`, async () => {
      const { body } = await fetch(`${BASE}${page.path}`);
      const root = parse(body);

      // Collect local CSS links
      const cssLinks = root
        .querySelectorAll('link[rel="stylesheet"]')
        .map((el) => el.getAttribute('href'))
        .filter((href) => href && !href.startsWith('http'));

      // Collect local JS scripts
      const jsLinks = root
        .querySelectorAll('script[src]')
        .map((el) => el.getAttribute('src'))
        .filter((src) => src && !src.startsWith('http'));

      const assets = [...cssLinks, ...jsLinks];
      const failures = [];

      for (const asset of assets) {
        const url = new URL(asset, `${BASE}${page.path}`).href;
        const status = await head(url);
        if (status >= 400) {
          failures.push({ asset, status });
        }
      }

      expect(failures, `Failed assets on ${page.name}`).toEqual([]);
    });
  }
});

test.describe('Images load (no 404s)', () => {
  for (const page of PAGES) {
    test(`${page.name} — all images resolve`, async () => {
      const { body } = await fetch(`${BASE}${page.path}`);
      const root = parse(body);

      // <img src="...">
      const imgSrcs = root
        .querySelectorAll('img[src]')
        .map((el) => el.getAttribute('src'))
        .filter((src) => src && !src.startsWith('http') && !src.startsWith('data:'));

      // CSS background images in inline styles
      const bgImages = root
        .querySelectorAll('[style]')
        .map((el) => {
          const style = el.getAttribute('style') || '';
          const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
          return match ? match[1] : null;
        })
        .filter((src) => src && !src.startsWith('http') && !src.startsWith('data:'));

      // <link rel="icon" ...>
      const iconLinks = root
        .querySelectorAll('link[rel*="icon"]')
        .map((el) => el.getAttribute('href'))
        .filter((href) => href && !href.startsWith('http'));

      const allImages = [...new Set([...imgSrcs, ...bgImages, ...iconLinks])];
      const failures = [];

      for (const img of allImages) {
        const url = new URL(img, `${BASE}${page.path}`).href;
        const status = await head(url);
        if (status >= 400) {
          failures.push({ image: img, status });
        }
      }

      expect(failures, `Failed images on ${page.name}`).toEqual([]);
    });
  }
});

test.describe('Internal links resolve (no broken links)', () => {
  for (const page of PAGES) {
    test(`${page.name} — all internal links return < 400`, async () => {
      const { body } = await fetch(`${BASE}${page.path}`);
      const root = parse(body);

      const links = root
        .querySelectorAll('a[href]')
        .map((el) => el.getAttribute('href'))
        .filter(
          (href) =>
            href &&
            !href.startsWith('http') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.startsWith('#') &&
            !href.startsWith('javascript:')
        );

      const uniqueLinks = [...new Set(links)];
      const failures = [];

      for (const link of uniqueLinks) {
        const url = new URL(link, `${BASE}${page.path}`).href;
        const status = await head(url);
        if (status >= 400) {
          failures.push({ link, status });
        }
      }

      expect(failures, `Broken links on ${page.name}`).toEqual([]);
    });
  }
});

test.describe('No missing resources on any page (comprehensive 404 scan)', () => {
  for (const page of PAGES) {
    test(`${page.name} — all referenced local resources exist`, async () => {
      const { body } = await fetch(`${BASE}${page.path}`);
      const root = parse(body);

      // Gather every local resource reference
      const refs = new Set();

      // link[href] (stylesheets, icons, etc.)
      root.querySelectorAll('link[href]').forEach((el) => {
        const href = el.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('data:')) refs.add(href);
      });

      // script[src]
      root.querySelectorAll('script[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (src && !src.startsWith('http')) refs.add(src);
      });

      // img[src]
      root.querySelectorAll('img[src]').forEach((el) => {
        const src = el.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) refs.add(src);
      });

      // source[srcset]
      root.querySelectorAll('source[srcset]').forEach((el) => {
        const srcset = el.getAttribute('srcset') || '';
        srcset.split(',').forEach((entry) => {
          const src = entry.trim().split(/\s+/)[0];
          if (src && !src.startsWith('http') && !src.startsWith('data:')) refs.add(src);
        });
      });

      const failures = [];

      for (const ref of refs) {
        const url = new URL(ref, `${BASE}${page.path}`).href;
        const status = await head(url);
        if (status >= 400) {
          failures.push({ resource: ref, status });
        }
      }

      expect(failures, `Missing resources on ${page.name}`).toEqual([]);
    });
  }
});
