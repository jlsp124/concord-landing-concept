# Concord Landing — concept

An interactive 3D concept for Northeast False Creek in Vancouver. I made it as a way to explore the area, move through the site, and show how the waterfront and surrounding connections could change over time.

**Independent concept.** This is not an official Concord Pacific project or an approved development visualization. The 811 Carrall / Sub-area 6C application was on hold when I last checked it on October 10, 2026, so the future buildings shown here are intentionally schematic.

[Open the live project](https://jlsp124.github.io/concord-landing-concept/)

## What it does

- Scroll through a continuous 3D view of Northeast False Creek.
- Move from the wider city context into the site and waterfront.
- Explore public space, connections, and the possible future layout.
- Switch to a simpler 2D view if WebGL is unavailable.
- Respect reduced-motion settings and work on both desktop and mobile.

The existing-city context uses City of Vancouver geographic data, aerial imagery, and GeoBC height estimates. The future material is separate from the real city data and should not be read as an approved design. See [SOURCES.md](SOURCES.md) for the source list.

## Run locally

```powershell
npm ci
npm run dev
```

Then open the local URL printed by Vite. To run the checks and production build:

```powershell
npm test
npm run build
npm run preview
```

Python is only needed if you want to regenerate the geographic data:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r scripts/requirements-gis.txt
.\.venv\Scripts\python.exe scripts/prepare-geography.py
.\.venv\Scripts\python.exe scripts/prepare-context.py
```

## Project structure

- `src/atlas-engine.ts` — Three.js world and rendering
- `src/SpatialScene.tsx` — scene lifecycle and 2D fallback
- `src/scene-score.ts` — camera/story timing
- `src/narrative.ts` — paths, zones, and exploration states
- `src/App.tsx` — interface and interaction
- `public/data/` — local geographic data used by the project

More detail is in [PLAN.md](PLAN.md), [SOURCES.md](SOURCES.md), and [QA.md](QA.md).

The site is published through GitHub Pages. Original code is MIT licensed; source datasets and fonts keep their own licences and attribution.
