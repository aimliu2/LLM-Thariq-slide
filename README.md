# slide-note — Marp markdown → Thariq HTML

Converts a Marp deck (`.md`) into a single self-contained HTML page in the
format of [`example/example.html`](example/example.html): one full-screen
slide per viewport, scroll-snap, keyboard navigation. Slides are rendered by
Marp itself with the themes in [`theme/`](theme/), so the output matches the
VS Code Marp preview.

## Quick start

Build the binary once (see [Rebuilding the binary](#rebuilding-the-binary)),
then run it from anywhere:

```sh
dist/slide-note example/slide.md                 # → example/slide.html
dist/slide-note example/slide.md -o deck.html    # custom output path
```

The binary includes Marp and the Bun runtime, so it doesn't need `node_modules`.
At run time it needs only a `theme/` folder in the parent of the binary's own folder:

```
any-folder/
├── dist/slide-note      # the binary (it can be any folder name)
└── theme/*.css          # every .css here is loaded; `theme:` in the deck picks one
```

Without that `theme/` folder, the binary crashes. Deck paths are resolved from
your current directory, not from the binary's location.

Open the HTML in a browser. Keys: `→` `↓` `Space` `PageDown` next ·
`←` `↑` `PageUp` previous · `Home` / `End` first / last.

Or run the source directly from this folder, after `bun install`:
`bun marp2html.mjs example/slide.md` (Node works too).

## Writing the deck

```markdown
---
marp: true
theme: ivory
paginate: true
---

<!-- _class: lead invert -->

# Title slide

---

###### Eyebrow label

## Slide heading

- clay-dash bullet
  - olive-dot sub-bullet

> Decision card — first paragraph is the question
>
> Second paragraph is the context
```

| Markdown | Renders as |
|---|---|
| `class: invert` (front matter) | every slide dark |
| `<!-- _class: invert -->` | this slide only dark |
| `<!-- _class: lead invert -->` | combine classes — space-separated, one directive |
| `###### text` | mono uppercase eyebrow |
| `> text` | clay-bordered decision card |
| table | metric-style table |
| `paginate: true` | `n / N` page number, bottom right |

HTML tags inside the markdown are rendered.

### Shared iframe CSS

Decks that embed pages as `<iframe srcdoc>` (for example charts that each inline
the ivory theme) usually repeat the same `<style>` in every iframe. The converter
emits each `<style>` body that appears in two or more iframes **once** in the
output, as an inert `<script type="text/plain" id="srcdoc-css-N">`, and each
iframe writes it back in place with `document.write` while parsing, so the
cascade order is unchanged. This works because a `srcdoc` iframe without
`sandbox` is same-origin with its parent page.

- Only the output HTML is deduplicated. Each iframe in the `.md` deck keeps its own
  copy of the CSS, so the VS Code Marp preview still works.
- Decks with no repeated styles produce exactly the same output as before.
- Don't add `sandbox` to these iframes. It blocks access to the parent page, and
  the shared styles won't load.

## Themes

Every `.css` in [`theme/`](theme/) is loaded; pick one with `theme:` in the
front matter. Edit or add themes freely — no rebuild needed. The binary looks
for `theme/` in the parent of its own folder (`dist/../theme`), so keep them
side by side.

For the VS Code preview, the theme is registered in the workspace
`.vscode/settings.json` under `markdown.marp.themes`.

> **Note:** `theme/ivory.min.css` is generated from the readable source
> [`assets/ivory.css`](assets/ivory.css). Make edits in `assets/`, then
> regenerate the minified file:
> `bun tools/minify-css.ts assets/ivory.css > theme/ivory.min.css`.
> See [`tools/README.md`](tools/README.md) for how it works and what it can't handle.

## Rebuilding the binary

This folder is the source. The skill folder in OneDrive holds only the built
binary plus `theme/` and `example/`. At run time the binary reads `theme/` from
the parent of its own folder. Build here, outside OneDrive — `node_modules` inside
OneDrive times out:

```sh
bun install
bun build marp2html.mjs --compile --outfile dist/slide-note
```

`dist/` is git-ignored. To ship the binary, copy `dist/slide-note` into the skill
folder. The skill's `theme/` is a symlink to this repo's `theme/`, so theme
changes need no rebuild and no copying.

The binary is ~63 MB (it bundles the Bun runtime) and targets the machine it
was built on (macOS arm64 here). Cross-compile with
`--target=bun-linux-x64` or `bun-windows-x64`.
