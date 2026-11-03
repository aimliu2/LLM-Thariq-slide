# tools

## minify-css.ts

Turns the readable Marp theme in `assets/` into the compact version in `theme/`.

```sh
# from the repo root
bun tools/minify-css.ts assets/ivory.css > theme/ivory.min.css
```

The script prints to stdout, so the `>` redirect is what writes the file. It needs only Bun, with no npm dependencies.

### What it does

The source is processed in this order:

1. **Comments.** Comments that start with `@`, such as `/* @theme ivory */` and `/* @size 16:9 1280px 720px */`, are kept because Marp reads them as theme metadata. All other comments are removed.
2. **Whitespace.** Each run of whitespace, including newlines, becomes a single space.
3. **Punctuation.** Spaces around `{ } ; , >` are removed.
4. **Declarations.** Spaces after `:` are removed. A `;` right before `}` is dropped.

```css
/* before (assets/ivory.css) */
/* @theme ivory */
/* --- Ivory — Marp theme ... --- */
:root {
  --ivory:   #FAF9F5;
  --slate:   #141413;
}

/* after (theme/ivory.min.css) */
/* @theme ivory */ :root{--ivory:#FAF9F5;--slate:#141413}
```

For `ivory.css`, this takes the file from about 6.4 KB to about 3.7 KB.

### Workflow

- Edit `assets/ivory.css` only. Treat `theme/ivory.min.css` as generated output and don't edit it by hand.
- Re-run the command after each change, then commit both files.

### Limitations

The script uses regular expressions and does not parse CSS. It works for this theme but is not a general-purpose minifier:

- Whitespace inside quoted strings, such as `content: "a  b"`, is collapsed too.
- A `/*` inside a string is read as the start of a comment.
- Every `: ` loses its space, including ones inside selectors and strings.

If the theme starts using any of these, switch to a real minifier such as `lightningcss` or `csso`.
