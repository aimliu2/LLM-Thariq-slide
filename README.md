# slide-note — Marp markdown → Thariq HTML

Converts a Marp deck (`.md`) into a single self-contained HTML page in the
format of [`example/example.html`](example/example.html): one full-screen
slide per viewport, scroll-snap, keyboard navigation. Slides are rendered by
Marp itself with the themes in [`theme/`](theme/), so the output matches the
VS Code Marp preview.

## Quick start

From the skill folder (OneDrive `slide-note/`):

```sh
bin/slide-note example/slide.md                 # → example/slide.html
bin/slide-note example/slide.md -o deck.html    # custom output path
```

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

## Themes

Every `.css` in [`theme/`](theme/) is loaded; pick one with `theme:` in the
front matter. Edit or add themes freely — no rebuild needed. The binary looks
for `theme/` next to its own `bin/` folder, so keep them side by side.

For the VS Code preview, the theme is registered in the workspace
`.vscode/settings.json` under `markdown.marp.themes`.

## Rebuilding the binary

This folder is the source; the skill folder in OneDrive holds only the built
binary plus `theme/` and `example/` (the binary reads `theme/` next to its
`bin/` folder at run time). Build here, outside OneDrive — `node_modules` inside
OneDrive times out:

```sh
SN=~/Library/CloudStorage/OneDrive-Personal/_CODE/agents-skills/skills-universal/slide-note
bun install
bun build marp2html.mjs --compile --outfile "$SN/bin/slide-note"
```

Copy edited themes to `$SN/theme/` — no rebuild needed for theme changes.

The binary is ~63 MB (it bundles the Bun runtime) and targets the machine it
was built on (macOS arm64 here). Cross-compile with
`--target=bun-linux-x64` or `bun-windows-x64`.
