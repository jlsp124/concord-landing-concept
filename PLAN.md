# Concord Landing — the last piece of the waterfront

## Creative thesis

A blue-hour architectural film moves through the real grain of False Creek; measured city context gives way to luminous, explicitly unresolved future space.

## Content plan

One continuous world, with a native-scroll score rather than stacked page sections:

1. **Place.** Water, the skyline and recognizable anchors establish Northeast False Creek. `CONCORD LANDING / THE FINAL CHAPTER` is the opening poster.
2. **Context.** Expo lands became Concord Pacific Place; eight neighbourhoods are built and one remains. The camera reads the shoreline before approaching 6C.
3. **Today.** Show the gap between downtown and the water: surface land, viaducts, surrounding blocks and Creekside Park.
4. **Reconnection.** Infrastructure recedes, a street network reaches the water, and paths physically trace the relationships envisioned in City policy.
5. **Public life.** The park extension and waterfront take precedence over buildings.
6. **An open future.** Restrained translucent volumes suggest mixed uses, not approved architecture. State the application is on hold and the image is conceptual.
7. **Explore.** Four spatial lenses reveal waterfront, public realm, connections and neighbourhood. Comparison returns the same world to its existing state. A small closing line explains that this map can deepen as the place takes shape.

## Interaction thesis

- A perspective film camera changes scale slowly while maintaining geographic orientation. Scroll controls position; the page never captures the wheel.
- Change happens in the city: viaducts recede, routes draw on the ground, public space expands and conceptual areas emerge. Reverse scrolling reverses the change.
- After the story, selecting a subject reframes and accents its location. Touch stays guided; desktop dragging is bounded. Avoid a floating control dashboard.

## Art direction

Charcoal, midnight blue water, concrete and warm architectural white. Blue traces connections. Green means vegetation only. Locally licensed Instrument Serif and DM Sans remain the two fonts. Sparse editorial lines sit in deliberately calm camera space. No corporate logo, stock renderings, autoplay sound or decorative particles.

## Geographic evidence

The cropped City shoreline (2002), footprints (2015), roads, parks and 2022 orthophoto establish the real urban grain. GeoBC's 2025 one-metre DSM / DEM rasters supply generalized relative roof heights for 4,624 of 4,681 footprints; 57 use an explicit 9m fallback. The City 2022 LAS host returned 403 to both HEAD and a bounded range GET. Historical basemaps are not a complete present-day survey. Height coverage, algorithm, source CRS and tile hashes are recorded. Science World and BC Place use original simplified landmark geometry.

Future park, routes and massing remain original schematic policy illustrations. The City application page says 6C is **on hold**, checked 10 October 2026. No construction schedule is supplied.

## Implementation choices

React / TypeScript / Vite and Three.js WebGL. The current Three.js manual describes WebGPURenderer as experimental; the scene uses a custom water shader and needs broad graceful fallback. Native scroll plus a small pure camera score is sufficient. Merge context geometry, instance trees, use a lightweight facade shader, cap pixel ratio, stop rendering when idle/hidden, and lower quality under sustained frame pressure. Keep preprocessing reproducible and production assets small.

Blender and glTF remain valid for later architectural assets. An installation is unnecessary for footprint extrusion and procedural landmarks; preserve source geometry before Meshopt / Draco / KTX2 optimization when detailed models arrive.

## Milestones and acceptance

1. Preserve main and record source/reference/workflow findings.
2. Produce cropped geographic assets and provenance.
3. Build the continuous story, camera, transformed world and quiet exploration.
4. Review opening / today / reconnection / future / exploration on desktop and phone. Revise weak compositions.
5. Verify reverse scroll, keyboard navigation, lenses, comparison, focus management, reduced motion, WebGL fallback, resize and resource lifecycle. Record PASS / FAIL / NOT RUN honestly.
6. Commit a clean result on the redesign branch and provide a concise delivery report. Publish only with explicit user direction; that direction was received and the completed redesign was released on 10 October 2026.
