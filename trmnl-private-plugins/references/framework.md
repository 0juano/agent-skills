# Framework 3.1 geometry, CSS, and e-ink lessons

Everything here was learned on a live device (TRMNL X, framework 3.1.1); each
rule exists because breaking it produced a visible defect.

## Rendering geometry (the things that clip)

- **Author at OG 800x480, always.** The TRMNL X panel is 1040x780, 4-bit
  (16 grays), but the server renders your 800x480 markup with
  `scale_factor: 1.8` (visible in plugin logs, `palette gray-16`). Hardcoding
  1040x780 breaks the scaling math.
- The framework's `.screen` is the 800x480 canvas **with a 10 px bezel
  padding**. It sizes `.layout` children to `screen-h − 2×gap` = **460 px**
  (less again when a `title_bar` is present).
- If you use a custom root element instead of `.layout`, it must copy that
  height itself:

  ```css
  .my-root { height: calc(var(--screen-h, 480px) - var(--gap, 10px) * 2); }
  ```

  `height: 100%` resolves to 480 px inside a 460 px content box and **clips the
  bottom ~20 px**. This bug ships silently — browser previews with slightly
  different wrappers can hide it.
- A `title_bar` costs ~35 px of content height. Omitting it is legal; the save
  warning ("Missing title_bar include") is cosmetic.
- One `.layout` per view. Never nest `.layout` in `.layout`. Grid, Flex, or
  Columns go inside it.
- Public/offline examples include `.screen` and `.view` wrappers — those are
  for self-hosted preview only; never paste them into the TRMNL editor.

## CSS cascade layers — you cannot win a specificity fight

`plugins.css` uses CSS cascade layers. A **layered `!important` beats your
unlayered `!important` and inline-style `!important`** (layer order inverts for
important declarations). Consequences:

- You cannot out-specify the framework's sizing rules. Don't try.
- Instead, adopt its custom properties (`--screen-h`, `--gap`, `--full-w`) and
  its classes, or scope your design so it doesn't collide.

## Custom `<style>` blocks vs the in-app AI agent

Private-plugin markup **does** allow custom `<style>` blocks and custom
classes. But TRMNL's in-app AI agent enforces a hard "no `<style>`, no inline
styles" rule and will rewrite your markup into framework classes — flattening a
custom design — if you ask it to "improve" anything. Keep a local template file
as the source of truth so any such rewrite is recoverable, and change styling
approaches deliberately, not by accident.

## Framework runtime helpers

- `data-clamp` clamps line counts, but its measurement can truncate an
  already-short line to one line. For short, curated content, natural wrapping
  beats the clamp.
- Data attributes take breakpoint suffixes: `data-overflow-max-cols-{sm,md,lg,portrait}`,
  `data-clamp-{sm,md,lg,portrait}`.
- Responsive helpers: container-query units `cqw`/`cqh`; arbitrary sizing
  `w--[Npx]` / `h--[Npx]` (max 800 px); grid `col--span-*`.
- Charts (Highcharts/Chartkick via CDN): **disable animations** so the
  server-side screenshot captures the final frame.

## Type and texture on e-ink

- Large display sizes exist natively: Value sizes `mega` (170 px), `giga`
  (220 px), `tera` (290 px), `peta` (380 px); Title sizes up to `xxlarge` (40 px).
- Grayscale: prefer the new `gray-10` … `gray-75` scale (14 shades) over the
  deprecated `gray-1`…`gray-7`. Semantic/chromatic tokens resolve to grays on
  grayscale devices — design in contrast, not color.
- Explicit font fallbacks matter:
  `"Inter Variable", Inter, "Helvetica Neue", Arial, sans-serif` plus
  `font-feature-settings: "tnum" 1` so time columns align.
- Big `°` glyphs: above ~100 px, render the number and a smaller
  `<span>°</span>` separately — the raw glyph renders as a giant ring.
- 1 px hairline rules vanish at distance on e-ink; use 2 px.
- **Trust the physical device over any browser preview.** E-ink loses contrast
  and tightness that Chrome renders fine. When in doubt: bigger type, wider
  columns, thicker rules.

## Density: degrade by design, not by shrinking

A pattern that works for any list-style screen (agendas, feeds, queues):

1. Survey your real data (e.g. weeks of history) and set capacity = busiest
   real case + 1. Don't guess.
2. Build a **density ladder** instead of shrink-to-fit: large type at low item
   counts, medium type at moderate counts, and a **two-column headline mode**
   (one clamped line per item) at high counts. If the screen is read from a
   distance, never let body type fall below ~19 px — two columns beat smaller
   type.
3. Equal-height rows (`grid-auto-rows: 1fr`) so a sparse screen fills the zone
   instead of clumping at the top.
4. Beyond capacity, always render an honest `+ N more` overflow label. Keep
   template loop limits ≥ generator caps, or items vanish silently.
5. The payload generator should auto-shed rows when a payload would exceed the
   webhook byte limit, degrading to the overflow label instead of failing.
