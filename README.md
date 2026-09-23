# CN_Visualizer

An interactive, fully-animated Computer Networks visualizer for **21CSC302J**.
Every process moves, every algorithm steps, and every network can be broken on
purpose.

**Unit 1 (Network Fundamentals) is complete** — 30 interactive visualizers
across 7 categories under `app/topics/` (fundamentals, data-link, addressing,
routing, transport-application, capstone). Master prompt/specs:
[`UNIT_1_MASTER_PROMPT.md`](UNIT_1_MASTER_PROMPT.md).

Architecture and build plan: [`ARCHITECTURE.md`](ARCHITECTURE.md).
Full syllabus mapping: [`plan.md`](plan.md).

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | Does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Static export into `./out` |
| `npx serve out` | Serve the built static site locally |
| `npm test` | Engine correctness checks (paths, cuts, delay maths) |
| `npm run lint` | ESLint |

The app makes **no network requests at runtime**. Kalam and JetBrains Mono are
vendored by `next/font` at build time, and icons are Phosphor SVG components
bundled with the app. It works with wifi off.

---

## Deploy

`npm run build` writes a fully static site to `./out`. There is no server
component, so any static host will do.

**Vercel** — `npx vercel deploy --prod` from the repo root, or connect the repo
in the dashboard and let it build. It reads `next.config.mjs` and does the
right thing.

**Netlify / Cloudflare Pages** — build command `npm run build`, publish
directory `out`.

**GitHub Pages** — push `out/` to a `gh-pages` branch. If the site is served
from a subpath (`user.github.io/cn_visualizer`), add `basePath` to
`next.config.mjs` first:

```js
const nextConfig = { output: "export", basePath: "/cn_visualizer" };
```

**Any web server** — copy `out/` into the document root.

---

## Recording a lesson

Built for screen-recording a course. Press **P** on any visualizer, or the
**Record** button in the header.

Record mode strips the sidebar, breadcrumb and step list, grows the animation to
fill the frame, and leaves a caption bar plus controls that fade out a couple of
seconds after you stop moving the mouse. **Nothing autoplays** — you step as you
talk, so the animation never races your narration.

### Keyboard

| Key | Does |
| --- | --- |
| `Space` | play / pause |
| `←` `→` | step back / forward |
| `Home` `End` | first / last step |
| `R` | reset to the start |
| `N` | captions on / off |
| `G` | 16:9 framing guide |
| `P` | record mode on / off |
| `F` | fullscreen |

Keys are ignored while a sidebar field has focus, so typing a message or an IP
address does not scrub the animation.

### Pre-configured links

Any topic can be bookmarked already in record mode:

```
/topics/fundamentals/topologies/failure-comparison?record=1
/topics/fundamentals/layering/encapsulation?record=1&captions=0
/topics/fundamentals/performance/bandwidth-vs-latency?record=1&guide=1
```

### Notes for a clean take

- Record at **1920×1080 or larger**. Use `G` once to align the crop, then turn
  it off — the guide is a screen overlay and would otherwise be captured.
- Set the browser to **fullscreen (`F`)** so no tab bar or bookmarks appear.
- Fonts are licensed for commercial use: Kalam and JetBrains Mono under SIL OFL
  1.1, Phosphor Icons under MIT.

---

## Layout of the code

```
app/topics/**/page.tsx   Hub + leaf pages — the folder tree IS the route map
engines/                 Pure frame compilers (net, layer, signal)
lib/                     Player store factory, per-engine stores, palette
components/visualizer/   Canvases, sidebars, LessonShell, RecordShell
components/topic/        Hubs, cards, breadcrumbs, leaf navigation
data/curriculum.ts       Titles, blurbs, icons, build status, leaf ordering
types/visualization.ts   The shared frame contract
tests/                   Engine checks (`npm test`)
```

Adding a topic is three steps — an engine operation, a curriculum entry, and a
one-line page. See [`ARCHITECTURE.md`](ARCHITECTURE.md) §9.
