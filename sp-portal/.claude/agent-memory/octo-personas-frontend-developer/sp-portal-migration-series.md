---
name: sp-portal-migration-series
description: Conventions for porting Logixsphere Next.js pages to static sp-portal HTML/CSS/JS pages (9-page series, page 3 of 9 done)
metadata:
  type: project
---

Migrating pages from `Logixsphere - cópia/logix-sphere-frontend-nextjs/app/(private)/*` (read-only source)
into `sp-portal/<page-slug>/` as static HTML/CSS/vanilla-JS (Bootstrap 5 + Bootstrap Icons CDN, no build step,
no backend — mock data generated in JS). Page 1 (`daily-operations-management`), page 2 (`requests-admin`,
mapped from source's `requests-admin` / "Vendor Requests"), and page 3 (`adhoc-invoice-management`, mapped
from source's `adhoc-works-invoice-management` / "Ad-hoc Invoice System") are done. 6 more pages remain.

**Why:** Product wants a static/no-framework twin of the Logixsphere private app inside the SP portal,
one page at a time, each page's "Soon" sidebar placeholder gets promoted to a real link only when that
page's port lands.

**How to apply for pages 3-9:**
- Each new page's `index.html`/`style.css`/`script.js` should closely mirror
  `sp-portal/daily-operations-management/` structure: beam sidebar markup + `page-header-section` header +
  `filters-bar` + tables + `styled-button` classes + a modal pattern (`.dom-modal-backdrop`/`.dom-modal` in
  daily-operations-management; renamed to `.va-modal-backdrop`/`.va-modal` in requests-admin) + toast pattern
  (`.app-toast`, `#toastContainer`, `showToast(message, type)` with 3200ms auto-dismiss).
- Mock data: use the deterministic PRNG helpers (`hashStringToSeed` + `mulberry32` + `rngForSeed(seed)`) so
  reloading/switching filters doesn't reshuffle data. Copy these three functions verbatim into each page's
  script.js — they're not shared/imported anywhere.
- CSS design tokens (`--bg-body`, `--card-bg`, `--primary-blue`, `--success-green`, `--danger-red`, `--radius`,
  etc.) are duplicated per-page in each page's own style.css `:root` block — not extracted to a shared file.
  Copy the same token block into each new page's CSS for visual consistency.
- **Integration is mandatory and easy to miss** (it was missed on page 1 and had to be fixed after the fact):
  1. Every sp-portal page's beam sidebar has a `<span class="beam-plate beam-plate--soon">...</span>`
     placeholder for each not-yet-built page. When a page ships, replace that exact span (same icon class)
     with `<a href="../<new-page>/index.html" class="beam-plate">` in **all** sp-portal pages' sidebars,
     including the new page's own sidebar where it should carry `class="beam-plate active"` and
     `href="index.html"`.
  2. `sp-portal/navigation-menu.js` has a matching entry per feature (matched by `id:`) with `soon: true`;
     change it to `link: '../<new-page>/index.html'` (remove the `soon` line) once shipped.
  3. Never edit anything under `Logixsphere - cópia/` — it's the read-only source spec.
- Verification checklist per page: `node --check script.js`, parse `index.html` with Python's
  `html.parser`, grep every touched `index.html` for exactly one `active` beam-plate (its own page),
  confirm the promoted placeholder's `beam-plate--soon` span is gone, and confirm the *other* still-unbuilt
  placeholders (there were 7 remaining after page 2, 6 remaining after page 3) are untouched.
- Page 3 (`adhoc-invoice-management`) added two patterns worth reusing: (a) a week-based nav bar
  (`.week-nav`/`.week-nav-controls` in its style.css) with prev/next + month/year `<select>`s + a "Today"
  button, built on Monday-start `getWeekStart`/`getWeekEnd` helpers — same shape as the day-nav in
  daily-operations-management but stepping by 7 days; (b) a single responsive `<table>` (not two DOM
  trees) that collapses into stacked cards under `max-width: 700px` via `data-label` attrs on every `<td>`
  plus a `::before { content: attr(data-label) }` — avoids duplicating desktop-table/mobile-card markup.
  Real XLSX export reuses the SheetJS CDN tag (`https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`,
  same as [[route-balance-page]]) with `XLSX.utils.json_to_sheet` + `XLSX.writeFile`; PDF export opens a
  `window.open()` print-formatted document and calls `.print()` on it after a short timeout (no real PDF lib) —
  both are real file/print outputs, not stub buttons.
- See also [[logix-subsistem-structure]] and [[route-balance-page]] (existing project-root memories on this
  codebase's page layout and the standalone light-theme route-balance page).
