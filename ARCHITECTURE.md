# Logix Subsystem - Architecture Context

> **Living document.** Update this file in the same change whenever the subsystem gains, removes, renames, moves, or materially changes a route, shared UI primitive, data contract, browser-storage key, asset source, or user flow.

## Purpose and boundary

`logix-subsistem` is a local, static mock of Logixsphere for presentation and demonstration. It models DHL operational administration and the Service Provider experience, currently with **TBX as the sole Service Provider**.

- It is browser-first: HTML, CSS and plain browser JavaScript.
- There is no application server, API client, package manager, build step, or authentication backend in this directory.
- Browser state is intentionally local (`localStorage` and `sessionStorage`). Refreshing and clearing browser storage changes the simulated experience.
- The `pages-schema/` TypeScript files are integration metadata for the external Next.js product; they do not run the static mock itself.
- Do not modify the external Logixsphere app from this subsystem unless a task explicitly expands the scope.

## Quick start

Open the static entry page [index.html](index.html). Canonical screens are in subdirectories and their legacy root-level aliases redirect to them. A local static server is recommended so module-like browser restrictions and relative assets behave consistently.

Primary entry paths:

- `index.html` -> access selection
- `dhl/access-select/index.html` -> choose DHL Administration or the TBX portal
- `dhl/dashboard/index.html` -> DHL Administration
- `sp-portal/dashboard/index.html?sp=TBX` -> TBX Service Provider portal

## Product roles and permissions

| Area | Audience | Scope | Main capabilities |
| --- | --- | --- | --- |
| DHL Administration | DHL operator | Network-wide mock data | Dashboard, TBX oversight, vendors, vehicles, contract targets, announcements, SOP management |
| TBX Service Provider Portal | TBX user | TBX-filtered mock data | Own dashboard, profile, drivers, vehicles, contracts, read-only SOP feed |

The UI is permission-oriented, not security-oriented. Client-side visibility is only a presentation rule; there is no server-side authorization.

## Information architecture

### Canonical routes

| Route | Role | Screen | Primary implementation |
| --- | --- | --- | --- |
| `dhl/login/index.html` | Entry | DHL login mock | `dhl/login/index.html` |
| `dhl/access-select/index.html` | Entry | Choose administration or provider portal | `dhl/access-select/index.html` |
| `dhl/dashboard/index.html` | DHL Admin | Operations dashboard, notices and network delays | `dhl/dashboard/index.html` |
| `service-providers/index.html` | DHL Admin | Service Provider list (TBX only) | `service-providers/index.html` |
| `service-providers/profile.html` | DHL Admin | TBX details | `service-providers/profile.html` |
| `dhl/vendor-admin-view/index.html` | DHL Admin | Vendor / driver administration | `dhl/vendor-admin-view/index.html` |
| `dhl/vehicles-admin-view/index.html` | DHL Admin | Vehicle administration | `dhl/vehicles-admin-view/index.html` |
| `dhl/contract-management/index.html` | DHL Admin | Contracts, depots, loops, route targets | `dhl/contract-management/index.html` |
| `dhl/standard-operating-procedures/index.html` | DHL Admin | SOP feed creation and management | `dhl/standard-operating-procedures/index.html` |
| `sp-portal/select/index.html` | TBX Portal | Select provider; currently TBX only | `sp-portal/select/index.html` |
| `sp-portal/login/index.html` | TBX Portal | Portal login mock | `sp-portal/login/index.html`, `login.js` |
| `sp-portal/dashboard/index.html` | TBX Portal | Operational home/dashboard | `sp-portal/dashboard/index.html`, `dashboard.js`, `live-service.js` |
| `sp-portal/profile/index.html` | TBX Portal | Company profile | `sp-portal/profile/index.html`, `profile.js` |
| `sp-portal/drivers/index.html` | TBX Portal | Drivers | `sp-portal/drivers/index.html`, `drivers.js` |
| `sp-portal/vehicles/index.html` | TBX Portal | Vehicles | `sp-portal/vehicles/index.html`, `vehicles.js` |
| `sp-portal/contracts/index.html` | TBX Portal | Contracts (read-only presentation) | `sp-portal/contracts/index.html`, `contracts.js` |
| `sp-portal/sop-feed/index.html` | TBX Portal | SOP feed (read-only presentation) | `sp-portal/sop-feed/index.html`, `sop-feed.js` |

### Redirect aliases

The root HTML files and the short files inside `sp-portal/` are compatibility redirects to the canonical folders. Keep those aliases in sync when a canonical route changes:

`access-select.html`, `dashboard.html`, `login.html`, `service-providers.html`, `service-provider-profile.html`, `vendor-admin-view.html`, `vehicles-admin-view.html`, `contract-management-admin-view.html`, `standard-operating-procedures.html`, and the `sp-portal/*.html` aliases.

### Service Provider dashboard structure

`sp-portal/dashboard/index.html` is the active presentation homepage. It preserves older dashboard data blocks in `dashboard.js` for later reuse while foregrounding:

1. Header with **Announcements** and user/notification context.
2. **Live Service** at Depot MSE. `live-service.js` renders the MSE route set (`MD7A`, `MD7B`, `MD7C`, `MD7D`, `MD7E`, `MD7X`, `MD7Q`, `MD9A`, `MD9B`, `MD9C`, `MD9D`, `MD9X`) as a dispatch carousel. KPIs and delivery progress are calculated for the selected route only. The third panel surfaces SLA warnings, including pending Pre-12 deliveries approaching the 12:00 deadline, instead of a delivery queue. It advances every 7 seconds unless `prefers-reduced-motion` is enabled.
3. Category navigation for Planning & Operations, Setup, Feed & Announcements, Compliance, Billing, Performance, Vendor Requests, and Trace & Queries.

Some navigation cards intentionally have no destination and display **Soon**. They are product placeholders, not missing broken links. Before creating one of these screens, replace its `href: null` in `sp-portal/dashboard/live-service.js` with the real canonical route and document it here.

## Data architecture

### Primary browser globals

| Global | Source | Purpose |
| --- | --- | --- |
| `window.DHL_MOCK_DATA` | `dhl-mock-data.js` | Primary mock source: vendors, vehicles, TBX contract hierarchy, Service Provider profile, SOP posts, summary KPIs, bands, operations notifications |
| `window.DISCO_DATA` | `assets/disco-data.js` and/or `dhl-embedded-data.js` | Route/stop-level DISCO data |
| `window.OPMS_EMBEDDED_DATA` | `dhl-embedded-data.js`, extended by `dhl-lastday-pdf-data.js` | OPMS and last-day operational data by date |
| `window.DHL_EMBEDDED_DATA` | `dhl-embedded-data.js` | Embedded financial and liquidation-damages data |
| `window.AvisosStorage` | `avisos-storage.js` | Shared announcement CRUD wrapper |

`dhl-mock-data.js` is the default source of truth for entity data. It exports:

- `vendors`: people/vendor records, compliance dates, depot and provider association
- `vehicles`: fleet records and provider association
- `contracts`: `Service Provider -> Depot -> Loop -> Route` hierarchy
- `serviceProviders`: **one record only, TBX**
- `digressiveBands`, `dashboardSummary`, `lastDayRoutes`, `lastDayLoops`, `spmsOverview`, `dailyOperationsNotifications`, `sopPosts`, and the mock period

### Data invariants

- Keep `serviceProviders`, `contracts`, `vendors`, and `vehicles` aligned on the same provider name: `TBX`.
- Contract hierarchy is the source for depot, loop, route, driver and subpostcode relationships.
- Include data scripts before the page script that consumes them. Typical order: mock/embedded data -> `avisos-storage.js` when needed -> `beam-sidebar.js` -> page JavaScript.
- The project contains historical provider logo/background assets. They are not active TBX data. Do not reintroduce those providers through fallbacks, selectors, or mock records.

## Browser persistence

| Key | Storage | Owner | Meaning |
| --- | --- | --- | --- |
| `dhl_sp_portal_current_sp` | sessionStorage | portal login/select and portal pages | Selected provider, currently TBX |
| `dhl_avisos` | localStorage | `avisos-storage.js` | Shared announcements |
| `dhl_network_delay` | localStorage | DHL dashboard and portal dashboard | Network delay notices |
| `dhl_subsystem_sidebar_state` | localStorage | admin screens | Open/closed beam sidebar preference |
| `dhl_contract_route_targets` | localStorage | contract management and portal contracts/dashboard | Per-route delivery target overrides |
| `dhl_opms_uploaded_data` | localStorage | portal dashboard | Uploaded/overridden OPMS data |
| `dhl_sp_daily_ops_card` | localStorage | portal dashboard | Daily Operations Management card state |
| `dhl_sp_profile_cover` | localStorage | portal profile | Per-provider cover image overrides |
| `dhl_sp_profile_avatar` | localStorage | portal profile | Per-provider avatar overrides |
| SOP cache key | localStorage | SOP pages | Locally edited mock SOP content |

When introducing persistent state, document the key, owner, data shape and reset behavior here.

## Shared UI and styling

### Design language

The visual base is a restrained operations UI: Inter / Plus Jakarta Sans, light surfaces, dark slate text, blue/indigo accents and the existing glass/beam treatment. Preserve these foundations when restyling shared screens.

Core CSS layers:

| File | Responsibility |
| --- | --- |
| `base-system-reference.css` | Common tokens and base visual reference |
| `liquid-glass.css` | Shared glass surfaces and background treatment; imports the base reference |
| `modern-ui.css` | Modern system components, typography and shadows |
| `refinements-v2.css` | V2 refinement overrides, loaded after liquid-glass/modern-ui |
| `refinements-v3-motion.css` + `refinements-v3-motion.js` | Final shared motion/polish layer: staggered scroll reveal, table-row cascade, animated gradient page titles, card hover hairline, KPI count-up, beam/button/modal micro-interactions. Loaded last on every canonical page; degrades to a fully static page without JS or with `prefers-reduced-motion` |
| `sidebar-beam.css` + `beam-sidebar.js` | Collapsible beam sidebar behavior and visual pattern |
| `shared-pages.css` | Common admin-page layout rules |
| `vendor-admin-view.css` | Shared administration shell/header/table styling |
| `sp-portal/sp-portal.css` | Shared Service Provider portal layout and modules |
| `sp-portal/dashboard/*.css` | Dashboard-local layers; `live-service.css` owns the Live Service and navigation modules |

Avoid introducing a competing design system. Prefer the closest existing class, token and component rule. Load page-specific CSS after shared layers; keep `refinements-v2.css` as the final shared override when it is already present on the page.

### Navigation contract

- The beam sidebar is a global navigation primitive. Any new canonical screen in the same role should be considered for the matching sidebar.
- Route Balance is currently represented by the Live Service/route-stop data, but has no standalone canonical route and is not yet present in the current beam sidebars. Create the screen and add the item consistently across the relevant sidebars when that feature is implemented.
- Preserve relative link correctness from each nested route. Test a link from the actual folder in which its HTML runs.
- Use Bootstrap Icons already loaded by the screens rather than adding a second icon library.

## External dependencies

The static pages load browser CDNs directly:

- Bootstrap 5.3.2 CSS/JS
- Bootstrap Icons 1.11.3
- Google Fonts (Inter and Plus Jakarta Sans, depending on page)
- `qrcodejs` on the drivers screen

There is no lockfile. Avoid adding dependencies without an explicit reason; any CDN added to a page is a runtime dependency and should be noted in this document.

## Integration metadata

`pages-schema/manifest.ts` and `pages-schema/routes/**/page.schema.json` describe an integration-facing route list for an external Next.js frontend. They currently cover DHL dashboard, DHL shipments and the Service Provider portal set. They may lag behind the static HTML implementation.

When adding, removing or renaming a canonical product route, update both the static page links and the manifest/schema if the route belongs to the integration surface.

## Scripts and generated data

`scripts/` contains one-off or repeatable generators/importers for operational mock data. Examples include DISCO import/generation, OPMS processing, date/month generation and Last Day PDF embedding. `assets/disco.json`, `assets/disco-data.js`, `dhl-embedded-data.js`, and `dhl-lastday-pdf-data.js` are generated or embedded datasets; do not hand-edit large generated payloads unless a task specifically calls for it.

If a generator changes its output contract, update this document and every consumer that reads the corresponding browser global.

## Change checklist

Before considering any subsystem change complete:

- Update this document when architecture/context changed.
- Keep TBX as the single provider unless the product direction explicitly changes.
- Update redirect aliases, beam navigation and `pages-schema` when a route changes.
- Verify data script order and relative asset/link paths.
- Check desktop and mobile layouts, interactive states and `prefers-reduced-motion` for new animations.
- Verify that no stale provider name, slug or logo fallback was reintroduced.

## Architecture change log

| Date | Change |
| --- | --- |
| 2026-07-10 | Created this living architecture context. Recorded the static mock boundary, TBX-only provider model, active canonical routes, browser data/storage contracts, shared styling system, and Live Service homepage architecture. |
| 2026-07-10 | Restyled Live Service as a route-by-route dispatch carousel with current delivery, assigned driver, vehicle and delivery queue. |
| 2026-07-10 | Updated the MSE route taxonomy to the MD7/MD9 route set in the central mock and Live Service carousel. |
| 2026-07-10 | Removed the Compliance and Vehicles blocks from the TBX homepage; Live Service and system navigation remain the visible operational surface. |
| 2026-07-10 | Changed Live Service KPIs, progress and the third panel to selected-route delivery and warning data. |
