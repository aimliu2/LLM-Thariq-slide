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
const rendered = marp.render(md)
const { css } = rendered
const { html, shared } = dedupSrcdocCss(rendered.html)
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
${shared}${html}
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

// Iframe pages inlined into srcdoc (e.g. charts) often each carry the same <style>
// (theme, chart CSS). Emit every body repeated across iframes once in the parent as an
// inert text/plain script, and have each srcdoc document.write it back in place —
// synchronous during parse, so cascade order is unchanged. Works because srcdoc
// iframes without `sandbox` are same-origin with the parent. The .md decks stay
// self-contained; only this HTML output is deduplicated.
function dedupSrcdocCss(html) {
  const decode = (s) => s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
  // Same escaping the decks' srcdoc uses (one line, attribute-safe).
  const encode = (s) => s
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '&#10;')
  const SRCDOC = / srcdoc="([^"]*)"/g
  const STYLE = /<style>([\s\S]*?)<\/style>/g

  const counts = new Map()
  for (const [, attr] of html.matchAll(SRCDOC)) {
    for (const [, body] of decode(attr).matchAll(STYLE)) counts.set(body, (counts.get(body) ?? 0) + 1)
  }
  const ids = new Map()
  for (const [body, n] of counts) {
    // Skip anything that could end or confuse the host <script> element.
    if (n >= 2 && !/<\/script|<!--/i.test(body)) ids.set(body, `srcdoc-css-${ids.size + 1}`)
  }
  if (!ids.size) return { html, shared: '' }

  const rewritten = html.replace(SRCDOC, (tag, attr) => {
    const doc = decode(attr)
    let hit = false
    const next = doc.replace(STYLE, (block, body) => {
      const id = ids.get(body)
      if (!id) return block
      hit = true
      return `<script>document.write('<style>'+parent.document.getElementById('${id}').textContent+'<\\/style>')</script>`
    })
    return hit ? ` srcdoc="${encode(next)}"` : tag
  })
  const shared = [...ids].map(([body, id]) => `<script type="text/plain" id="${id}">${body}</script>\n`).join('')
  return { html: rewritten, shared }
}

const dest = out ?? join(dirname(input), basename(input, extname(input)) + '.html')
writeFileSync(dest, page)
console.log(`${input} => ${resolve(dest)}`)
