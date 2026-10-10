# Concord Landing — The final chapter

A cinematic, native-scroll interaction study of Northeast False Creek becoming a neighbourhood. One continuous geographic world moves from city context to the site, infrastructure, reconnection, public space and an explicitly schematic future. Exploration follows the story.

**Independent concept.** Not an official Concord Pacific representation or an approved development visualization. The [811 Carrall / Sub-area 6C application](https://www.shapeyourcity.ca/811-carrall-st) was **on hold** when checked on 10 October 2026. No construction schedule, approved tower design, homes for sale or availability is implied.

## Experience

- Scroll normally, use the editorial Continue control, or choose the optional 68-second guided journey. Direct scroll / navigation input stops autoplay. There is no wheel capture.
- A choreographed perspective camera maintains orientation while changing scale. Viaducts recede, routes appear, the waterfront / park expands and pale conceptual zones emerge. Reverse scrolling reverses the same changes.
- After the story, explore waterfront, public realm, connections and neighbourhood. Compare existing context with the possible future in the same world.
- Desktop exploration supports bounded dragging, arrows, plus / minus and Home reset. Phones retain a guided composition and simpler controls.
- About & sources contains provenance, a readable story, still-camera / reduced-motion mode and a 2D geographic alternative. System reduced-motion preference is respected. WebGL failure also falls back to 2D.

The real city context uses cropped City of Vancouver geography and 2022 aerial imagery, plus generalized GeoBC 2025 relative roof-height estimates. Dataset dates differ; this is not a complete current survey. The pale future material is intentionally distinct from existing city forms. See [SOURCES.md](SOURCES.md).

## Run locally

Node 24 was used for this Windows build. Use a Node release supported by the locked Vite version.

```powershell
npm ci
npm run dev
```

Open the printed loopback URL with `/concord-landing-concept/`. Both development and preview default to `127.0.0.1`.

```powershell
npm test
npm run build
npm run preview
```

Production assets are local: no map-service requests, account, secrets, telemetry or backend. Node / Python tools and GIS intermediates remain project-local. Python is only needed to regenerate geography, not to build or view the committed scene.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r scripts/requirements-gis.txt
.\.venv\Scripts\python.exe scripts/prepare-geography.py
.\.venv\Scripts\python.exe scripts/prepare-context.py
```

The preparation scripts crop before generating assets, bound download / tile sizes and check free space. Raw files go to ignored `source-assets/raw/`. The context manifest records source tile hashes, CRS and algorithm. Review dataset dates and live planning status before refreshing public claims.

## Structure and decisions

| File                                         | Responsibility                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/scene-score.ts`                         | Pure geographic camera score, editorial beats and story-change timing                |
| `src/narrative.ts`                           | Conceptual zones / paths, exploration lenses and reversible layer timing             |
| `src/atlas-engine.ts`                        | Three.js world, materials, demand rendering, quality scaling and bounded exploration |
| `src/SpatialScene.tsx`                       | Lazy model lifecycle, HTML place labels and 2D geographic fallback                   |
| `src/App.tsx`, `src/style.css`               | Native scroll, sparse editorial composition, responsive exploration and sources      |
| `public/data/`                               | Committed local geographic / height / aerial derivatives and provenance              |
| [PLAN.md](PLAN.md)                           | Creative thesis, acceptance and implementation choices                               |
| [research/RESEARCH.md](research/RESEARCH.md) | Primary-source research, reference observations and decisions                        |
| [research/STATUS.md](research/STATUS.md)     | Resumable work checkpoint                                                            |
| [QA.md](QA.md)                               | Actual verification and untested limits                                              |

Direct Three.js WebGL fits the custom materials and fallback needs. Context geometry is merged; trees are instanced; DPR is capped and can decrease under sustained frame pressure. Rendering stops when idle or hidden. Future detailed architectural assets can enter through an optimized glTF pipeline without replacing the narrative system.

## Git and publication

The previous implementation is preserved at annotated tag `baseline/windows-handoff-2026-10-10`, commit `06972a8`. The redesign lives on `redesign/windows-spatial-experience`.

The [existing public demo](https://jlsp124.github.io/concord-landing-concept/) remains the prior implementation until a deliberate release. This redesign does not change the live site. Pushing to `main` triggers the existing Pages deployment workflow; pull requests validate without publishing. Vite's base is `/concord-landing-concept/`.

HTML includes `noindex, nofollow`; this discourages indexing and does not provide access control. Original code is MIT licensed. City data, GeoBC data and local fonts retain their respective licences and attribution.
