interface Metric {
  label: string;
  value: number;
}

interface VehiclePageHeaderProps {
  title: string;
  subtitle: string;
  metrics: Metric[];
}

export function VehiclePageHeader({ title, subtitle, metrics }: VehiclePageHeaderProps) {
  return (
    <div className="vp-header">
      <div className="vp-header-titles">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="vp-header-metrics" aria-label="Vehicle counts">
        {metrics.map((m) => (
          <div className="vp-header-metric" key={m.label}>
            <span className="vp-header-metric-value">{m.value}</span>
            <span className="vp-header-metric-label">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
