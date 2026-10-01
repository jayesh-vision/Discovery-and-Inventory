# Node view — source handover

The node view as source, to be built into an independent React application.
Nine files, three dependencies, no build step of its own.

```
src/
  components/NodeDetails.jsx   the view itself — header, tabs, every panel
  components/NodeTwin.jsx      the domain twin (RAN / DWDM / PON / IP stages)
  components/NodeCharts.jsx    traffic chart, KPI wheel, timeline, path, heatmap
  components/IncidentMap.jsx   "Show on map" (Leaflet)
  components/Icons.jsx         the icon set those four use
  nodeView.jsx                 NodeViewProvider · useNodeView · NodeLink
  pages/NodePage.jsx           the same view at /node/<element>
  data.js                      the element model the view reads   ← your seam
  twin.js                      the twin model NodeTwin draws
  index.css                    the stylesheet
  styles/nst/                  the NST / VisionWaves design system (tokens)
example/
  App.jsx                      how to mount it, both ways
  openFromCode.jsx             opening it from your own handler
```

## Dependencies

```
react ^18.3  react-dom ^18.3  react-router-dom ^6.26  leaflet ^1.9
```

`react-router-dom` is needed only by `pages/NodePage.jsx` (the `/node/:ref`
route). Drop that file and the dependency goes with it. `leaflet` is needed
only by `IncidentMap.jsx` — drop the "Show on map" button in `NodeDetails.jsx`
and that goes too.

## Mounting it

Copy `src/` into your app, import the stylesheet once, then either:

**As an overlay** — wrap the app once, and anything that names an element
opens the view:

```jsx
import { NodeViewProvider, NodeLink, useNodeView } from './nodeView.jsx'
import './index.css'

<NodeViewProvider>
  <YourApp />          {/* <NodeLink name="KOL-CRT-008" /> anywhere inside */}
</NodeViewProvider>
```

**At an address of its own** — add one route:

```jsx
<Route path="/node/:ref" element={<NodePage />} />
```

`example/App.jsx` shows both together.

## The seam: connecting it to your own inventory

The view reads exactly four functions from `data.js`. Everything else in that
file is the seeded estate this demo ships with — replace it with your own
inventory by re-implementing these four and deleting the rest.

| Function | Returns | Used by |
|---|---|---|
| `nodeDetailFor(name, external?)` | the whole element: identity, facts, KPIs, groups, modules, ports, entities, links, env, posture, series, alerts, history, counts | the view |
| `resolveElement(ref)` | the canonical element name for a name **or** a management IP, else `null` | `NodeLink`, `NodePage` |
| `externalElement(ref, info)` | an element your estate does not hold, drawn from a description (`equipment`, `domain`, `vendor`, `city`, `region`, `ip`, `tech`, `source`) | `NodePage` |
| `elementTopology(name)` / `incidentTopology(rows)` | the element and what it is wired to, for the map | `IncidentMap` |

Plus `NOW` (the reference instant every timestamp is derived from) and
`twinFor(detail)` in `twin.js`, which turns one element into the twin drawing —
it reads only what `nodeDetailFor` returned, so it needs no changes.

Start by running it as shipped: it works standalone against the seeded estate,
so you can see every panel filled before you wire your own data in. Then swap
`nodeDetailFor` last — it is the only function that has to produce real depth.

## Notes

* Every colour, size, radius and shadow comes from `styles/nst/`. Nothing in
  `index.css` states a literal, so your own theme can replace the tokens
  without touching the view.
* Light and dark both work; the view follows `:root[data-theme]`, and falls
  back to the system preference.
* `index.css` is the whole Alert Management stylesheet. The node view uses the
  `.nv-*`, `.tw-*`, `.nk-*`, `.nd-*` and `.imap-*` blocks; the rest is harmless
  if you keep it, and safe to delete once you have the view rendering.
