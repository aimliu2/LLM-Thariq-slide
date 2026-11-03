// Minify a Marp theme without dependencies: keeps `/* @theme … */`-style directive
// comments (Marp reads them), drops other comments, collapses whitespace.
// Usage: bun minify-css.ts theme/ivory.css > dist/ivory.min.css
const src = await Bun.file(process.argv[2]).text()

const out = src
  .replace(/\/\*[\s\S]*?\*\//g, (c) => (/^\/\*\s*@\w+/.test(c) ? c : ''))
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};,>])\s*/g, '$1')
  .replace(/:\s+/g, ':')
  .replace(/;}/g, '}')
  .trim()

process.stdout.write(out + '\n')
