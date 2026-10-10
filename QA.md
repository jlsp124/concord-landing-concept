# Redesign verification

Windows / local production preview, 10 October 2026. This supersedes the prior prototype's verification; public deployment remains the baseline.

## Completed checks

| Check                         | Result / evidence                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript / Vite build       | PASS; local production build                                                                                                          |
| Narrative / camera tests      | PASS; eight tests cover ordering, endpoints, traversal independence, overshoot and continuous desktop / portrait camera paths         |
| Phone story and exploration   | PASS at 390 × 844 and 375 × 667; opening, six story beats, four lenses, comparison, reset and persistent independent notice inspected |
| Sources dialog                | PASS; opening focus, Escape dismissal, focus return and page scroll restoration                                                       |
| 2D alternative                | PASS; local aerial view, narrative and comparison remain available; 3D canvas removed on toggle                                       |
| Phone horizontal overflow     | PASS; none observed at checked viewports                                                                                              |
| Desktop / guided playback     | IN PROGRESS; final interaction record follows                                                                                         |
| Final asset / preview package | IN PROGRESS                                                                                                                           |

## Limits

Physical phone hardware, Safari, Firefox, GPU benchmarking and actual forced GPU-loss recovery are NOT RUN. The manual 2D mode is verified separately from hardware-loss handling. No synthetic screenshot-golden result is claimed. Historical geography / coarse roof bands are not survey geometry; future overlays remain schematic. No production deployment was performed.
