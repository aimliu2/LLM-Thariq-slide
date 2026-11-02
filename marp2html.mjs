#!/usr/bin/env node
// Convert a Marp markdown deck into a self-contained scroll-snap HTML page
// (the example/example.html format): one full-screen slide per viewport,
// arrow/space keys to move, themes from theme/ applied by Marp itself.
//
// Usage: bun run marp2html.mjs <deck.md> [-o out.html]   (node works too)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marp } from '@marp-team/marp-core'

const args = process.argv.slice(2)
const oIdx = args.indexOf('-o')
const out = oIdx >= 0 ? args.splice(oIdx, 2)[1] : null
const input = args[0]

if (!input || (oIdx >= 0 && !out)) {
  console.error('Usage: marp2html <deck.md> [-o out.html]')
  process.exit(1)
}

// Compiled binary: import.meta.url is virtual ($bunfs), so resolve theme/ next to the
// executable's bin/ folder; run as a script, theme/ sits beside this file.
const themeDir = /\$bunfs|~BUN/.test(import.meta.url)
  ? join(dirname(process.execPath), '..', 'theme')
  : join(dirname(fileURLToPath(import.meta.url)), 'theme')
const marp = new Marp({ html: true })
for (const f of readdirSync(themeDir).filter((f) => f.endsWith('.css'))) {
  marp.themeSet.add(readFileSync(join(themeDir, f), 'utf8'))
}

const md = readFileSync(input, 'utf8')
const { html, css } = marp.render(md)
const title = md.match(/^#\s+(.+)$/m)?.[1].replace(/[*_`]/g, '').trim() ?? basename(input, extname(input))

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<style>
${css}
</style>
<style>
  /* ------------------------------------------------------------------
     Scroll-snap shell — each Marp slide fills one viewport
     ------------------------------------------------------------------ */
  html, body { margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: #141413;
    scroll-snap-type: y mandatory;
    overflow-x: hidden;
  }
  div.marpit > svg[data-marpit-svg] {
    display: block;
    width: 100vw;
    height: 100vh;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
</style>
</head>
<body>
${html}
<script>
  (function () {
    const slides = Array.from(document.querySelectorAll('div.marpit > svg[data-marpit-svg]'));
    let current = 0;

    // Letterbox each slide in its own background colour
    slides.forEach(function (s) {
      const sec = s.querySelector('section');
      if (sec) s.style.background = getComputedStyle(sec).backgroundColor;
    });

    function go(i) {
      current = Math.max(0, Math.min(slides.length - 1, i));
      slides[current].scrollIntoView({ behavior: 'smooth' });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp'   || e.key === 'PageUp')                    { e.preventDefault(); go(current - 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End')  { e.preventDefault(); go(slides.length - 1); }
    });

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) current = slides.indexOf(en.target);
      });
    }, { threshold: 0.6 });

    slides.forEach(function (s) { obs.observe(s); });
  })();
</script>
</body>
</html>
`

const dest = out ?? join(dirname(input), basename(input, extname(input)) + '.html')
writeFileSync(dest, page)
console.log(`${input} => ${resolve(dest)}`)
