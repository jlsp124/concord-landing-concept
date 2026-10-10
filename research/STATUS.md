# Windows redesign checkpoint

Updated: 10 October 2026.

- Latest main `06972a8`; clean baseline preserved by annotated tag `baseline/windows-handoff-2026-10-10`.
- Branch `redesign/windows-spatial-experience`.
- Baseline: 4 Vitest tests and TypeScript/Vite build passed. Browser screenshots and mobile inspection captured under ignored `qa-artifacts/windows-baseline/`.
- Full redesign brief received; direction and acceptance are in PLAN.md.
- Primary workflow, planning, GIS, brand and reference research completed; detailed notes will be retained in RESEARCH.md.
- City 2022 LAS downloads returned 403. Twenty accessible GeoBC 2025 one-metre DSM/DEM tiles cover the expanded, cropped context; EPSG:6653 raster CRS / EPSG:3157 horizontal CRS are read from the source. Isolated Python tooling is installed locally.
- Generated City orthophoto, shoreline, road and park context. Relative roof heights sampled for 4,624 / 4,681 footprints; 57 explicitly use a 9m fallback. Roof bands are generalized, not survey geometry.
- Continuous native-scroll narrative, perspective camera score, reversible transformation, deferred exploration and local 2D fallback implemented. Eight meaningful tests and the production build passed before final lifecycle refinements.
- Desktop and phone visual iteration completed; final interaction QA and shorter phone layout checks remain. Write final research / source / QA records, capture sharing image, commit and package a reopenable preview.
- Owned baseline preview process: session 72176, loopback port 4173. Stop owned servers during final teardown.
