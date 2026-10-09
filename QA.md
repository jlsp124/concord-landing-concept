# Verification record

Checked 9 October 2026 in Chromium through the Codex browser. Visual inspection used the actual interface and production preview, not only component tests.

## Local checks

| Check                                     | Result                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript + Vite production build | Pass                                                                                                                |
| Transformation tests                      | Four pass: endpoints, layer ordering, bounded input, reversibility / history independence, and editorial thresholds |
| Desktop visual inspection                 | 1280 × 720, 1440 × 900, 1920 × 1080; opening, transformation, focused lenses, and plan                              |
| Phone visual inspection                   | 390 × 844; opening, future, public realm, and information dialog                                                    |
| Timeline                                  | Native slider pointer and keyboard; End / Home endpoints and arrow adjustment; reversible chapter selection         |
| Guided journey                            | Reaches the future endpoint and restores play control; direct interaction stops it                                  |
| Spatial layers                            | All four selectable; map marker and layer navigation; return to whole composition                                   |
| Camera                                    | Pointer orbit, north-up plan, bounded pan / zoom, keyboard arrows / plus / minus / Home, reset                      |
| Reduced motion                            | Manual toggle; immediate model transitions; guided control advances chapters without autoplay                       |
| Dialog                                    | Opening focus, Escape dismissal, focus return, sourced content, and phone layout                                    |
| Layout                                    | No horizontal document overflow at 390 px; independent notice remains visible; small phone heights can scroll       |
| Production assets                         | All generated files respond successfully beneath the configured project base path                                   |
| Console                                   | No errors or warnings in inspected production interactions                                                          |
| Credentials                               | Pattern scan of source and all unique Git-history blobs found no credential patterns; no environment files tracked  |
| Dependencies                              | npm audit reported no vulnerabilities                                                                               |

## Publication

- Repository created at [jlsp124/concord-landing-concept](https://github.com/jlsp124/concord-landing-concept), with complete source and meaningful Git history.
- [Pages workflow](https://github.com/jlsp124/concord-landing-concept/actions/workflows/pages.yml) builds and deploys successfully using Node 24. Future pushes to `main` publish automatically.
- Public URL verified: **https://jlsp124.github.io/concord-landing-concept/**. HTTPS is enforced; the page returns HTTP 200.
- All 18 published files were fetched successfully, including JavaScript, CSS, fonts, favicon, licences, and sharing image. Project-base asset references are correct.
- Live desktop and 390 × 844 phone views were inspected, including model interaction, source overlay, reset, and disclaimer. No serious console errors or warnings were captured.
- Production HTML has the intended title, sharing metadata, and `noindex, nofollow`.

## Practical limits

- Phone inspection uses an emulated viewport in Chromium, not a physical iPhone or Android hardware test. Safari / Firefox are not part of this verification run.
- Reduced-motion device preference support is implemented with `matchMedia`; the manual equivalent was exercised. Browser zoom and native keyboard controls are retained.
- The SVG fallback and resource cleanup were reviewed in source. Forced WebGL failure was not part of browser testing. The fallback retains timeline and layer stories; it has no 3D orbit.
- Geographic accuracy is limited to the stated historic datasets. Heights, future landscape, zones, and connections are illustrative. The public application’s on-hold status is disclosed; there is no promised completion date.
- `noindex, nofollow` discourages search indexing. The demo and repository remain intentionally public and have no authentication.

Screenshots are saved locally in the ignored `qa-artifacts/` directory. `public/preview.jpg` is an actual screenshot of the original model and interface, used for link previews.
