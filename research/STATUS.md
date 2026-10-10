# Windows redesign checkpoint

Updated: 10 October 2026. Requested local redesign complete.

- Main / preserved baseline: `06972a8`, annotated tag `baseline/windows-handoff-2026-10-10`. Redesign branch: `redesign/windows-spatial-experience`.
- Continuous native-scroll geographic film implemented: place, eight neighbourhoods / final piece, existing site, reconnection, public space, schematic future and deferred exploration.
- Cropped City geography / 2022 aerial imagery plus GeoBC 2025 relative height estimates: 4,624 / 4,681 footprint parts sampled; 57 fallbacks. Raster WKT equivalence to EPSG:6653 and horizontal EPSG:3157 verified. Raw inputs / isolated Python environment remain local and ignored.
- Original landmark models, reversible infrastructure / paths / park / future forms, guided phone composition, still-camera mode, readable story and 2D fallback delivered.
- Eight tests, production build, Python syntax checks, desktop / three phone sizes and interaction checks pass. Resize retains story position. Current shadow setting emits no application warning in the fresh package.
- All 23 portable assets return HTTP 200 and match dist byte for byte. Actual Windows launcher verified. Sharing image and screenshot format / dimensions verified.
- Primary research and design decisions: RESEARCH.md. Data / licence / interpretation inventory: ../SOURCES.md. Actual verification and limits: ../QA.md.
- Deliverables are in the calling workspace's outputs/ folder: compiled preview / launcher, screenshots, research, verification and source history bundle. See its Delivery.md for the final revision and launch instructions.
- Main was not pushed or deployed. Physical phones, Safari / Firefox, GPU benchmark, system reduced-motion preference and forced GPU loss remain explicitly NOT RUN.
- QA used loopback ports 4173 / 4174. Reopen deliberately with Start-Preview.cmd; no automatic startup service is configured.
- No remaining implementation work for this request. Future releases or additional architecture / inventory require a separate scope and current source review.
