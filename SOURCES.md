# Sources, assets, and interpretation

Research checked **9 October 2026**. This is an independent conceptual exploration, not an official Concord Pacific representation. Public planning material describes different points in a long-running process; it is not a guarantee of current approvals or future delivery.

## Factual and planning sources

| Source | Used for | Status / treatment |
| --- | --- | --- |
| [Concord Pacific Place](https://www.concordpacificplace.com/) | Concord Landing as the remaining / culminating chapter; present events and interim use; broader False Creek story | Official developer storytelling. Paraphrased selectively; no photos, logos, financial claims, or assertions about viaduct safety redistributed. |
| [City: Northeast False Creek](https://vancouver.ca/home-property-development/northeast-false-creek.aspx) | Area-plan intent, parks, public realm, mixed community, viaduct replacement | Long-term policy vision. No timetable or numerical delivery promises used. |
| [City: rezoning and development](https://vancouver.ca/home-property-development/rezoning-and-development.aspx) | Distinguishing an area plan from site-specific rezoning | Linked as background. |
| [City / Shape Your City: 811 Carrall St / Sub-area 6C](https://www.shapeyourcity.ca/811-carrall-st) | Current publicly stated application status; mixed-use proposal; public plaza and park extension | Page says **application on hold**, last updated 11 March 2026. Historic proposal heights and quantities are not reproduced. |
| [City: urban design](https://vancouver.ca/home-property-development/urban-design.aspx) | Georgia Landing, active lanes, park frontage, Carrall Greenway, Dunsmuir Connection, and city / water relationships | Historic policy highlights, not an approved current architectural design. |
| [City: streets and connectivity](https://vancouver.ca/home-property-development/streetscape-design.aspx) | Existing raised viaducts versus planned ground-level streets; walking and cycling connections | This page includes outdated milestone dates. Only spatial policy intent is used, with no schedule. |
| [City: parks](https://vancouver.ca/home-property-development/northeast-false-creek-parks.aspx) | Park extension, waterfront access, habitat, public gathering, continuous seawall intent | Policy intent; original abstract landscape illustration. |
| [City: park design](https://vancouver.ca/home-property-development/park-design.aspx) | Belonging, local Nations, cultural connections, flexible spaces, living shoreline | Contains historic process information. Not treated as a current construction update or final park layout. |
| [Northeast False Creek Plan (2018)](https://guidelines.vancouver.ca/policy-plan-northeast-false-creek.pdf) | Public area-plan reference, accessible from the sources panel | Referenced, not redistributed. Exact planning diagrams and renderings are not embedded. |
| [Concord commercial: Northeast False Creek](https://commercial.concordpacific.com/building/northeast-false-creek) | Residential / office / retail mix in the neighbourhood concept | Official developer description. No inventory or availability claims used. |

## Visual reference inventory

| Asset / reference | Purpose | Redistribution |
| --- | --- | --- |
| [City sub-area map](https://vancouver.ca/images/cov/feature/nefc-sub-area-map-landing.jpg) | Geographic relationship of 6B, 6C, 6D, and 10C | Reference only. |
| [City preliminary 6C sketch](https://vancouver.ca/images/cov/content/nefc-sub-area-6c-sketch.jpg) | Relationship of Georgia Landing, public lanes, and park edge | Reference only; not copied as a future skyline. |
| [City proposed street diagram](https://vancouver.ca/images/cov/content/nefc-after-map.jpg) | Approximate alignment and role of new connections | Reference only. Overlays are original schematic illustrations. |
| [City existing street diagram](https://vancouver.ca/images/cov/content/nefc-before-map.jpg) | Existing viaduct context | Reference only. |
| [City orthophoto imagery 2022](https://opendata.vancouver.ca/explore/dataset/orthophoto-imagery-2022/) | Assessed as geographic / aerial source | Not needed in the final composition; not redistributed. |
| [Alche Studio](https://alche.studio/) | Interaction principle: the site embodies its subject through spatial manipulation | Studied in a browser. No code, imagery, or visual identity copied. |
| [RECPLACE](https://recplace.ca/) | Existing project experience context supplied by the author | Studied as background. No assets reused. |

## Open geographic data

The localized map extract contains information licensed under the **Open Government Licence – Vancouver**. Source: **City of Vancouver**. [Licence](https://opendata.vancouver.ca/pages/licence/).

| Dataset | Purpose | Limitations / processing |
| --- | --- | --- |
| [Shoreline 2002](https://opendata.vancouver.ca/explore/dataset/shoreline-2002/) | Recognizable False Creek water / land relationship | Approximate 2002 shoreline, not updated by the publisher. Cropped, simplified, and projected into a local scene. Not a survey or an exact present-day seawall. |
| [Building footprints 2015](https://opendata.vancouver.ca/explore/dataset/building-footprints-2015/) | Existing urban grain and landmark context | 2015 outline snapshot. Simplified footprints; elevations are symbolic and do not represent measured building heights. Not a complete 2026 building inventory. |
| [Public streets](https://opendata.vancouver.ca/explore/dataset/public-streets/) | Context street network | Cropped and simplified. No navigation or traffic information. |
| [Parks — polygon representation](https://opendata.vancouver.ca/explore/dataset/parks-polygon-representation/) | Existing parks in context | Cropped and simplified. Future park illustration is an original conceptual overlay, not this dataset. |

The source-data preparation script and final extract are included for reproducibility. Only the necessary geographic features are included; no personal information is collected or published.

## Original assets and fonts

- Model styling, interface mark, landscape treatment, future zones, narrative routes, icons, fallback map, and sharing image are original work for this concept.
- Future development is represented as **abstract areas and symbolic forms**. These are not approved footprints, architecture, building heights, dimensions, parcel boundaries, or inventory.
- [Instrument Serif](https://github.com/google/fonts/tree/main/ofl/instrumentserif) and [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans) are bundled through Fontsource under the SIL Open Font License. Licence copies are included in `public/licenses/`.

## Implementation references

- [Three.js documentation](https://threejs.org/docs/) — orthographic camera, geometry, materials, and resource disposal.
- [Vite GitHub Pages deployment guide](https://vite.dev/guide/static-deploy#github-pages) — base path and Actions deployment.
