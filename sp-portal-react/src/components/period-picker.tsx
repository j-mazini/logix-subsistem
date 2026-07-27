// @ts-nocheck
export function PeriodPicker({ dateFrom = '', dateTo = '', onDateChange, labelPeriod = 'Period', labelTo = 'to' }) {
  return (
    <div className="dor-filter-group">
      <label className="filters-label">{labelPeriod}</label>
      <div className="dfi-period-group">
        <input type="date" name="dateFrom" value={dateFrom} onChange={onDateChange} className="date-nav-input" aria-label={`${labelPeriod} from`} />
        <span className="dfi-period-sep">{labelTo}</span>
        <input type="date" name="dateTo" value={dateTo} onChange={onDateChange} className="date-nav-input" aria-label={`${labelPeriod} to`} />
      </div>
    </div>
  );
}

export default PeriodPicker;
