import type { Averages, Vendor } from '../VendorPerformance';

/* =====================================================
   VendorsOverviewTable — ported from the Next.js source's
   components/VendorsTable.tsx + components/MobileVendorCard.tsx.

   Lists every vendor visible under the current Service Partner filter with
   their averages for the period shown in the general (all-vendors) view, and
   lets the user open a vendor's full month breakdown via the "View" action
   (see VendorPerformanceModal, ported from PerformanceModal.tsx).
   Mock-data SPA: averages are computed by the parent from the same
   deterministic generator used everywhere else on this page.
   ===================================================== */

export interface VendorOverviewRow {
  vendor: Vendor;
  averages: Averages;
  hasData: boolean;
}

interface VendorsOverviewTableProps {
  rows: VendorOverviewRow[];
  onViewPerformance: (vendor: Vendor) => void;
}

function twClass(value: string): string {
  if (value === '--:--' || value === 'N/A') return 'vp-cell-muted';
  const pct = parseFloat(value.replace('%', ''));
  if (isNaN(pct)) return 'vp-cell-muted';
  if (pct >= 90) return 'vp-tw-success';
  if (pct >= 80) return 'vp-tw-warning';
  if (pct >= 70) return 'vp-tw-orange';
  return 'vp-tw-danger';
}

function sporHClass(value: string): string {
  if (value === '--:--' || value === 'N/A') return 'vp-cell-muted';
  const v = parseFloat(value);
  if (isNaN(v)) return 'vp-cell-muted';
  return v >= 18 ? 'vp-tw-success' : 'vp-tw-danger';
}

function afdClass(value: string): string {
  if (value === '--:--' || value === 'N/A') return 'vp-cell-muted';
  const v = parseFloat(value.replace('%', ''));
  if (!isNaN(v) && v > 4) return 'vp-tw-danger';
  return '';
}

export function VendorsOverviewTable({ rows, onViewPerformance }: VendorsOverviewTableProps) {
  if (rows.length === 0) {
    return (
      <div className="vp-empty-inline">
        <p>No vendors match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="vp-table-scroll">
      <table className="vp-table vp-vendors-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Avg TW</th>
            <th>Avg SPR</th>
            <th>Avg SPOR-H</th>
            <th>Avg AFD</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ vendor, averages, hasData }) => (
            <tr key={vendor.id}>
              <td>
                <strong className="vp-vendor-name">{vendor.firstName} {vendor.lastName}</strong>
                {vendor.email && <span className="vp-vendor-email">{vendor.email}</span>}
              </td>
              <td className={twClass(averages.avgTw)}>{averages.avgTw}</td>
              <td className={hasData ? '' : 'vp-cell-muted'}>{averages.avgSpr}</td>
              <td className={sporHClass(averages.avgSporH)}>{averages.avgSporH}</td>
              <td className={afdClass(averages.avgAfd)}>{averages.avgAfd}</td>
              <td>
                <button
                  type="button"
                  className="vp-view-btn"
                  onClick={() => onViewPerformance(vendor)}
                  aria-label={`View performance for ${vendor.firstName} ${vendor.lastName}`}
                  title="View performance"
                >
                  <i className="bi bi-graph-up" /> View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
