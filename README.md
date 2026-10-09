# Concord Landing — An open chapter

An independent, interactive spatial concept for the final chapter of Concord Pacific Place in Northeast False Creek, Vancouver.

**[Explore the public demo](https://jlsp124.github.io/concord-landing-concept/)**

The place becomes the interface. A continuous transformation reveals how infrastructure, city connections, the waterfront, public space, and neighbourhood life relate. An optional short guided journey introduces the idea; four spatial lenses invite deeper exploration.

This is a speculative concept, **not an official Concord Pacific project**. It is not commissioned, approved, or endorsed by Concord Pacific or the City of Vancouver. Public proposals may change. The City’s 811 Carrall / Sub-area 6C application page marked the rezoning application as **on hold** when researched on 9 October 2026.

## Experience

- Scrub **Today → Reconnection → A possible future** with the timeline or scroll over the model. The sequence expresses planning relationships, not construction phases or a delivery schedule.
- Drag to look around, zoom, or switch between perspective and a north-up plan. In plan view, dragging pans.
- Select the waterfront, public realm, connections, or neighbourhood lens through the layer controls or numbered spatial markers.
- Open About for the product’s evolution, Sources for factual grounding, and the help button for keyboard controls. Motion off gives immediate transitions; device reduced-motion preferences are respected.

Future development appears as abstract zones and symbolic forms. There are no proposed tower designs, measured heights, residence plans, unit databases, or availability claims. Existing context uses historic City geography: shoreline 2002 and footprints 2015. Elevations and landscape are illustrative. This is not a survey, navigation map, or complete 2026 inventory.

## Develop

Node.js **22.12+**, **24**, or newer supported by Vite; Node 24 is used in CI.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/concord-landing-concept/`.

```sh
npm test
npm run build
npm run preview
```

React, TypeScript, Vite, and direct Three.js. HTML controls and labels sit over an orthographic architectural model. Geometry is merged or instanced, pixel ratio is capped, and WebGL renders only during interaction and transitions. A lightweight SVG plan preserves the story if WebGL is unavailable. All geographic data and fonts are local; there are no runtime map services, accounts, API keys, analytics, or backend.

## Maintain

- `src/narrative.ts`: editorial copy, source links, conceptual zones, routes, and transformation timing.
- `src/atlas-engine.ts`: geography, model construction, camera, rendering, and direct manipulation.
- `src/SpatialScene.tsx`: model lifecycle, accessible markers, labels, and fallback.
- `src/App.tsx` / `src/style.css`: interface, modal, journey, and responsive composition.
- `src/data/geography.json`: localized and simplified City GIS extract.
- [PLAN.md](PLAN.md): research conclusions and design rationale.
- [SOURCES.md](SOURCES.md): complete source, asset, status, and attribution inventory.
- [QA.md](QA.md): verification record and practical limitations.

To regenerate the optional geographic extract, use Python 3 with Shapely in an isolated environment:

```sh
python -m venv .venv
.venv/bin/pip install shapely
.venv/bin/python scripts/prepare-geography.py
```

The production build uses the committed extract and does not need Python or network access to the City API. Review dataset dates and planning status before changing factual copy. Future overlays are deliberately original schematic interpretations rather than approved geometry.

## Deployment

GitHub Pages uses the Actions workflow in `.github/workflows/pages.yml`. A push to `main` installs locked dependencies, tests, builds, and deploys `dist/`. Pull requests test and build without publishing. The repository’s Pages publishing source is **GitHub Actions**.

Vite’s base is `/concord-landing-concept/`. Keep it consistent if the repository or hosting path changes. The site is one page and needs no history-routing fallback. The HTML includes **noindex, nofollow**; this discourages indexing and does not restrict access to the public link.

## Attribution

Contains information licensed under the **Open Government Licence – Vancouver**. Source: City of Vancouver. Font licence copies are in `public/licenses/`. No official renderings, third-party photographs, or Concord logo assets are redistributed. See [SOURCES.md](SOURCES.md) for links and processing details.

Original code is MIT licensed; City data and fonts retain their respective licences. Nothing in this repository grants rights to Concord Pacific’s name or branding, or implies their endorsement.
