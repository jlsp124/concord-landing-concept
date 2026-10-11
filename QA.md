# Redesign verification

Windows / local production preview, 10 October 2026. This supersedes the prior prototype's verification. Publication checks for the subsequently authorized release are recorded below.

## Place-focused camera and variable phone pacing — 10 October 2026

This follow-up supersedes the camera / phone pacing details in the earlier polish sections below. The existing design remains intact. Primary City policies and diagrams ground close views of 6C's viaduct edge, the Dunsmuir / Carrall connections, Georgia Landing, the Creekside Park extension north of Science World, and the conceptual neighbourhood / park relationship. Route / park transformation timing is aligned with those views.

PASS: all 22 tests in four files and the TypeScript / production build. Regressions cover location-based focus, scene-space subject framing on desktop / phone, continuous camera velocity, reverse traversal, distinct distance / angle changes, reversible monotonic phone pacing, smooth pacing-window boundaries, geographic reveal timing, stable viewport projection and existing geometry checks.

Production-preview browser checks passed at 1440 × 900, 390 × 844 and 375 × 667. Existing site, connections, landing, park and future views were inspected; native reverse travel returned to the landing. Full-width label bounds prevent the cropped Dunsmuir label observed during the closer phone framing. No horizontal overflow or captured application console warnings / errors were observed.

At 390 × 844 the native range is 12,660px (15 small-viewport heights), down from 17,724px / 21 heights. Four screens / 3,376px reached score 0.349 at the site. The landing close-up was at score 0.565 / scrollY 6,717px. A 211px scroll advanced 0.565 → 0.573 there; the same travel advanced 0.620 → 0.645 between close views. These are browser input / viewport measurements, not physical swipe tests.

Height-only resize at the settled park view, 390 × 844 → 390 × 720, retained scrollY 8,655, score 0.700, camera `1036.1,524.8,569.3` and Science World projection `47.6,566.1`; vertical field of view adjusted 43° → 37.15°. Width changes to the compact phone retained score 0.700, and phone-to-desktop resizing retained the current story position. Continue from reconnection reached score 0.642 using the inverse pace mapping. Exploration / public-realm selection worked. About focus / Escape return worked; manual reduced motion retained camera `730,680,980` across two beats; the 2D alternative and restored WebGL scene worked.

Physical iPhone Safari / Chrome iOS and real touch momentum remain NOT RUN on this Windows machine. Live release evidence is added to the calling workspace's outputs after deployment.

## Mobile pacing and camera clarification — 10 October 2026

Mobile native scroll travel is now 21 small-viewport heights instead of 6.8 (about 3.1×). At 390 × 844, total travel measured 17,724px; an 8-screen / 6,752px scroll reached progress 0.381, within the existing-site beat, rather than exploration. Continue still reached exploration. Desktop scroll distance is unchanged.

Camera distance variation is restored alongside a broader orbit and changes in viewing height: close approach to the existing site, higher / wider street-network view, lower / closer waterfront view, then a higher future overview. The established opening / exploration views and focal anchors remain intact. The camera regression now checks meaningful wide / close subject changes, bounded site focus, stronger angle variation and the existing continuity / reverse traversal requirements.

PASS: all 18 tests, TypeScript / production build, phone camera review at 390 × 844, desktop at 1440 × 900, native forward / reverse traversal and Continue. No console warnings / errors captured. Physical iPhone momentum remains NOT RUN; the long-scroll check is a Windows browser viewport override.

## Focused iPhone polish — 10 October 2026

The existing composition, typography, geographic data, story timings and exploration remain intact. This follow-up replaces symbol controls with inline SVG, directs the camera around the site after the initial approach, adds restrained environmental colour, and tidies route joins / tree placement. Conceptual framing remains in About & sources; persistent concept notices have been removed from the main experience.

| Check                      | Result / evidence                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests                      | PASS; 18 tests across four files, including the existing narrative tests, monotonic camera distance, site-scale orbit, continuous camera velocity, reverse traversal, equivalent 60 / 120Hz interpolation, viewport scoring / projection and route geometry    |
| Production build           | PASS; TypeScript and Vite, no chunk warning                                                                                                                                                                                                                    |
| Desktop                    | PASS at 1440 × 900; opening, continuous traversal, public realm, future and exploration / connection selection inspected                                                                                                                                       |
| Phone layout               | PASS at 390 × 844, 375 × 667 and 320 × 640; opening, story / exploration and the longest connection copy inspected; no horizontal overflow observed                                                                                                            |
| Height-only phone resize   | PASS at 390 × 844 → 390 × 720 → 390 × 844; scrollY 2532, progress 0.441, main height 6583 and projected landmark positions retained. Camera coordinates settled within 0.1m; projection adjusted field of view from 43° to 37.15° without changing world scale |
| Width / orientation resize | PASS; reverse traversal followed by phone-to-desktop resizing retained normalized progress 0.706                                                                                                                                                               |
| Icons / factual framing    | PASS; top-right arrow is an SVG path, all graphical Unicode controls replaced, visible concept notices removed, complete independence / future uncertainty retained in About                                                                                   |
| Accessibility regression   | PASS; About focus / Escape / focus return, stationary camera across scroll in manual reduced-motion mode, and geographic 2D alternative                                                                                                                        |
| Application console        | PASS; no warnings / errors captured during the production-preview desktop and phone checks                                                                                                                                                                     |
| Sharing image              | Updated from the actual polished desktop opening capture; JPEG 1430 × 894                                                                                                                                                                                      |

Native scroll remains uncaptured. Phone scroll geometry is measured against the stable small viewport and retained during height-only changes; only width / orientation changes rescore it. Rendering adjusts to the visible canvas height while preserving geographic scale and vertical anchors. Touch pointers cannot initiate desktop orbit input, including landscape touch devices. The camera uses one time-based progress filter rather than a second Cartesian position filter; its opening reveal is monotonic when the visitor scrolls immediately.

The viewport choice follows [WebKit's viewport-unit documentation](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/). Refresh-rate-independent interpolation follows the timestamp guidance in [MDN's requestAnimationFrame documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). These are implementation choices, not evidence of physical Safari testing.

**NOT RUN:** physical iPhone Safari / Chrome iOS, actual browser-toolbar animation, real touch momentum / high-refresh hardware, landscape touch gesture routing on a device, battery / FPS benchmarks, Firefox and forced GPU loss. Phone checks use browser viewport overrides on Windows. The user supplied the real iPhone observations; no hardware validation is claimed here. Final release SHA, Pages workflow and live asset / browser evidence are recorded in the calling workspace's outputs/Delivery.md after publication.

## Original redesign checks

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

## Original redesign size and rendering

Complete dist: 6,040,978 bytes, including both aerial resolutions, fallback fonts, licences and sharing image. JavaScript plus JSON total 1,018,837 bytes gzipped; this is a compression calculation, not a measured phone-network transfer. Desktop aerial: 1,451,684 bytes. Phone aerial: 545,616 bytes. Main / lazy engine JavaScript gzip sizes are approximately 78 / 152 KB. No build chunk warning.

The inspected model returns to its DOM-reported idle state after transitions. DPR caps, merged context geometry, instanced trees, static desktop shadows, hidden-page suspension and sustained-frame quality reduction are implemented. This is not an FPS or battery benchmark.

Screenshots are actual browser captures. Viewport dimensions above describe the emulation settings; captured image dimensions are separate. Desktop opening / future: 1430 × 894 JPEG. Phone opening: 380 × 822 JPEG. No pixel-golden comparison is claimed.

## Limits

Physical phone hardware, Safari, Firefox, GPU benchmarking, an actual device reduced-motion preference and forced GPU-loss recovery are **NOT RUN**. Manual accessibility controls and 2D mode were verified separately. Historical geography / coarse roof bands are not survey geometry; future overlays remain schematic.

## Authorized publication — 10 October 2026

Origin was verified as `jlsp124/concord-landing-concept`, then fetched before integration. Remote main had no newer commits. Main fast-forwarded from the preserved baseline to completed redesign `511c8cb4459cd23e23e8033a07d1c77f3baa5e4e`; normal push succeeded without force. The build and all eight tests passed again locally and in GitHub Actions.

[Pages run 38097084093](https://github.com/jlsp124/concord-landing-concept/actions/runs/38097084093) completed with both build and deployment successful for that exact commit. The `github-pages` deployment also reported success with the correct public URL.

All 23 live assets returned HTTP 200 and matched the downloaded GitHub Actions Pages artifact byte for byte. Comparing with the Windows dist first found only line-ending differences in the two font licence files; the Linux artifact confirmed the deployed bytes exactly. No production asset failure was found.

The [live site](https://jlsp124.github.io/concord-landing-concept/) was opened in the browser. The new `CONCORD LANDING / The final chapter` opening and real False Creek model appeared. Native forward and reverse scrolling changed the camera and editorial story within the same world. Desktop connection selection, existing / possible-future comparison and reset worked. Phone checks at viewport overrides 390 × 844 and 320 × 640 confirmed the opening, narrative and responsive composition; exploration and comparison were exercised at 390 × 844. The page had no horizontal overflow at either phone size. Captured application console warnings / errors were empty.

The calling workspace's outputs folder includes live desktop / future / phone screenshots and `Live-Asset-Verification.json`. Follow-up publication documentation does not change the application or assets. Physical phone and alternate-browser limitations above still apply.
