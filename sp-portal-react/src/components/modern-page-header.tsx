// @ts-nocheck
export function ModernPageHeader({ title, subtitle = '', metrics = [], dashboard = null, actions = null, gradientFrom = 'slate-900', gradientTo = 'indigo-600' }) {
  return (
    <div className="p-6 rounded-lg bg-gradient-to-r from-slate-900 to-indigo-600 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {metrics.map((metric, idx) => (
            <div key={idx} className="p-4 bg-white bg-opacity-10 rounded-md">
              <p className="text-xs font-semibold opacity-75 uppercase">{metric.label}</p>
              <p className="text-2xl font-bold mt-2">{metric.value}</p>
            </div>
          ))}
        </div>
      )}
      {dashboard && (
        <div className="mt-4 border-t border-white/20 pt-4 text-slate-900">
          {dashboard}
        </div>
      )}
    </div>
  );
}

export default ModernPageHeader;
