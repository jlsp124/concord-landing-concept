# Concord Landing — An open chapter

## Product direction

An independent interactive architectural atlas of Northeast False Creek. The final chapter of Concord Pacific Place becomes a place to explore. A single persistent spatial composition replaces a conventional scrolling marketing page.

## Research conclusions

- Concord calls Concord Landing the culminating neighbourhood of Concord Pacific Place.
- City planning centres on reconnecting downtown, the historic neighbourhoods, parks, and False Creek through a replacement street network and a richer public realm.
- Georgia Landing, the Dunsmuir Connection, Carrall Greenway, and the Creekside Park extension provide concrete spatial stories.
- The City's 811 Carrall / Sub-area 6C page states that the rezoning application is on hold (page updated 11 March 2026; checked 9 October 2026). Historic policy and proposal material must not be presented as final architecture, an approved current scheme, or a construction programme.
- Residential, commercial, social housing, active pedestrian lanes, public space, and waterfront activity belong in the neighbourhood story. Exact quantities are unnecessary for this demo.

## Information architecture and interaction

1. Opening: place visible immediately, minimal editorial introduction, invitation to explore.
2. One continuous temporal control: **Today → Reconnection → A possible future**. This is a narrative sequence, without dates or construction phases. Viaducts recede; connections and public realm become legible; abstract neighbourhood zones emerge.
3. A short optional guided journey demonstrates the thesis in under 40 seconds; any direct interaction stops it.
4. Four spatial lenses: waterfront, parks, connections, neighbourhood life. Selecting a lens highlights its geography, moves the camera deliberately, and displays a short sourced explanation.
5. Direct manipulation: bounded camera drag, zoom controls, plan/perspective toggle, keyboard control, reset. Spatial markers are real buttons with accessible names.
6. About / sources: independent status, historical planning context, attribution, and a restrained diagram showing how the interface could deepen as a project becomes defined.

## Visual system

- Architectural maquette, actual shoreline and context footprints, symbolic elevations.
- Deep estuary ink, pale limestone, sage landscape, warm ochre connections.
- Instrument Serif for editorial moments; DM Sans for navigation and labels. Locally bundled, open-licensed fonts.
- Fullscreen, generous negative space, fine rules, precise labels, soft directional light. No stock real-estate photography, corporate logo reproduction, or speculative photorealism.
- Future zones are intentionally abstract, with no unit plans, tower heights, availability, ownership survey, or detailed design implied.

## Assets and data

Use a small, localized extract of City open GIS: shoreline 2002, building footprints 2015, public streets, and park polygons. Their dates and generalization are disclosed. Original conceptual overlays are informed by City policy and public diagrams, not traced as a final approved site plan. Official renderings and photos are references only and will not be redistributed. See SOURCES.md.

## Implementation

React + TypeScript + Vite; direct Three.js for an orthographic architectural model; HTML controls and labels. No backend, tracking, remote runtime APIs, or map token. Reduced-motion support, WebGL fallback, mobile composition, scoped resource cleanup, bounded pixel ratio and merged geometry.

## Delivery and quality

- Meaningful Git commits: research/data; spatial experience; polish/verification; deployment.
- Test production build and relevant interaction logic. Inspect several desktop and phone sizes in a browser; verify keyboard operation, timeline, lenses, drag, view modes, modal focus, reduced motion, fallback, assets, and console.
- Public repository: jlsp124/concord-landing-concept. GitHub Actions deploys main to GitHub Pages with correct base path.
- Verify the deployed public page and asset URLs. Keep noindex/nofollow, a persistent independent-concept label, and the full disclaimer in the experience and README.
