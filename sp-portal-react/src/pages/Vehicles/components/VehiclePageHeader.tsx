interface Metric {
  label: string;
  value: number;
}

interface VehiclePageHeaderProps {
  subtitle: string;
  metrics: Metric[];
}

/**
 * Fleet counts card.
 *
 * Uses the `vendor-page-*` classes from legacy/shared-pages.css — the same
 * ones the Vendors page renders — rather than the dark gradient banner this
 * page used to have, so both dashboards read identically. The class prefix
 * says "vendor" only because Vendors was the first page to use the pattern;
 * the rules live in the shared stylesheet, not in a vendors-specific one.
 */
export function VehiclePageHeader({ subtitle, metrics }: VehiclePageHeaderProps) {
  return (
    <div className="vendor-page-header mb-4">
      <div className="vendor-page-header-inner">
        <div className="vendor-page-header-row">
          <div className="vendor-page-header-title-block">
            <p className="vendor-page-subtitle">{subtitle}</p>
            <div className="vendor-page-metrics" aria-label="Vehicle counts">
              {metrics.map((m) => (
                <div className="vendor-page-metric" key={m.label}>
                  <span className="vendor-page-metric-label">{m.label}</span>
                  <span className="vendor-page-metric-value">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
