# Redesign verification

Windows / local production preview, 10 October 2026. This supersedes the prior prototype's verification; public deployment remains the baseline.

## Completed checks

| Check                     | Result / evidence                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript / Vite build   | PASS; local production build                                                                                                                                                |
| Narrative / camera tests  | PASS; eight tests cover ordering, endpoints, traversal independence, overshoot and continuous desktop / portrait camera paths                                               |
| Phone story / exploration | PASS at 390 × 844, 375 × 667 and 320 × 640; six beats, four lenses, comparison, reset and independent notice inspected                                                      |
| Desktop composition       | PASS at 1440 × 900 and 1100 × 720; opening, site, transformation and exploration inspected                                                                                  |
| Sources dialog            | PASS; opening focus, Escape dismissal, focus return, page scroll restoration and readable-story disclosure                                                                  |
| 2D alternative            | PASS; local aerial geography, narrative, lenses and comparison remain available                                                                                             |
| Horizontal overflow       | PASS; none observed at checked phone sizes                                                                                                                                  |
| Guided playback           | PASS; reaches progress 1.000 / exploration automatically; pause and native wheel input stop playback                                                                        |
| Native / reverse scroll   | PASS; forward journey, reverse scrolling, Control+Home / End and return-to-story restore the same world                                                                     |
| Desktop camera            | PASS; drag, arrows and plus change the geographic camera; Home resets; Control+Home retains browser scrolling                                                               |
| Resize                    | PASS after repair; normalized story position retained across desktop / phone sizes, including exploration                                                                   |
| Reduced motion            | PASS manually; camera stationary across story beats, immediate transitions and autoplay absent                                                                              |
| Skip link                 | PASS; keyboard activation reaches exploration and focuses its region                                                                                                        |
| WebGL lifecycle           | PASS for manual 2D replacement / restoration; canvas count changes 1 → 0 → 1 and scene is restored                                                                          |
| Application console       | PASS on fresh packaged build; no warnings / errors captured. Replaced the removed PCFSoftShadowMap setting with PCFShadowMap                                                |
| Geographic integrity      | PASS; 4,681 distinct polygon footprints across 4,670 City object IDs, coverage / fallback totals, finite roof geometry, 20 source hash entries and CRS equivalence verified |
| Portable preview / assets | PASS; actual Windows launcher started loopback port 4174. All 23 assets HTTP 200 and byte-identical to dist; missing files 404 and paths outside dist 403                   |
| Sharing image             | PASS; actual desktop capture, JPEG 1430 × 894, matches metadata and MIME type                                                                                               |

## Size and rendering

Complete dist: 6,040,978 bytes, including both aerial resolutions, fallback fonts, licences and sharing image. JavaScript plus JSON total 1,018,837 bytes gzipped; this is a compression calculation, not a measured phone-network transfer. Desktop aerial: 1,451,684 bytes. Phone aerial: 545,616 bytes. Main / lazy engine JavaScript gzip sizes are approximately 78 / 152 KB. No build chunk warning.

The inspected model returns to its DOM-reported idle state after transitions. DPR caps, merged context geometry, instanced trees, static desktop shadows, hidden-page suspension and sustained-frame quality reduction are implemented. This is not an FPS or battery benchmark.

Screenshots are actual browser captures. Viewport dimensions above describe the emulation settings; captured image dimensions are separate. Desktop opening / future: 1430 × 894 JPEG. Phone opening: 380 × 822 JPEG. No pixel-golden comparison is claimed.

## Limits

Physical phone hardware, Safari, Firefox, GPU benchmarking, an actual device reduced-motion preference and forced GPU-loss recovery are **NOT RUN**. Manual accessibility controls and 2D mode were verified separately. Historical geography / coarse roof bands are not survey geometry; future overlays remain schematic. No production deployment was performed. Main and its public demo retain the baseline implementation.
