# Offline preview harness

Iterate on TRMNL markup locally — render the real Liquid template with sample
data inside TRMNL's official CSS/JS, screenshot it, and only push to the live
plugin when it looks right. No account round-trips, no burning webhook quota.

## HTML wrapper

TRMNL's editor supplies `.screen`/`.view` wrappers automatically; offline you
must add them yourself (and must NOT paste them back into the editor):

```html
<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://trmnl.com/css/latest/plugins.css">
<script src="https://trmnl.com/js/latest/plugins.js"></script>
<style>body{margin:0;background:#ddd} .screen{margin:0 auto}</style>
</head>
<body class="environment trmnl">
  <div class="screen"><div class="view view--full">
    <!-- rendered template output goes here -->
  </div></div>
</body></html>
```

## Render script (Node + liquidjs)

TRMNL templates are Shopify-flavored Liquid; `liquidjs` renders them
faithfully enough for layout work:

```js
// npm i -D liquidjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Liquid } from "liquidjs";

const engine = new Liquid();
const template = await readFile("template.liquid", "utf8");

const samples = {
  typical: { items: [/* a normal day */] },
  busy:    { items: [/* your worst real case: max rows, longest titles */] },
  empty:   { items: [] },
};

await mkdir("preview", { recursive: true });
for (const [name, data] of Object.entries(samples)) {
  const inner = await engine.parseAndRender(template, data);
  await writeFile(`preview/${name}.html`, wrap(inner)); // wrap = HTML above
}
```

Sample-data rules:

- Mirror the exact merge-variable shape the webhook sends (check with
  `MergeVariablesShowTool` if unsure).
- **Always include worst cases**: maximum item counts, longest real titles,
  every mode/state the template branches on. Layouts break on busy days, not
  calm ones.

## Screenshotting

- **Serve over local HTTP** (`npx serve preview/`, `python3 -m http.server`) —
  Playwright and friends block `file://` for the CDN assets.
- Screenshot the **`.screen` element**, not the viewport: `.screen` is exactly
  800x480; `.view--full` is 780 px wide (inside the 10 px bezel) and a viewport
  shot includes page background.

```js
// npx playwright screenshot won't target an element; use the API:
const el = page.locator(".screen");
await el.screenshot({ path: "preview/typical.png" });
```

## Fidelity caveats

- Browser previews are **optimistic**: real e-ink loses contrast, and 4-bit
  grayscale dithering changes texture. The final check is the physical panel
  (or at least the TRMNL editor's server-side previewer, which uses the real
  render pipeline).
- The framework's JS runtime helpers (`data-clamp`, overflow counters, fit
  value) run in this harness since `plugins.js` is loaded — give the page a
  moment to settle before screenshotting.
- Iterate here first; push markup only after the previews look right. Then
  verify once via the editor previewer and force-refresh the device.
