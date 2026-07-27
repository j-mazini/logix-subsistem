// @ts-nocheck
import React, { memo } from 'react';
import ExportButton from '@/components/export-button';
import { PeriodPicker } from '@/components/period-picker';
import { dailyOperationsReportsStyles } from '../styles';

interface MobileFiltersProps {
  dateFrom: string;
  dateTo: string;
  search: string;
  depotFilter: string;
  loopFilter: string;
  uniqueDepots: string[];
  uniqueLoops: string[];
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFilter: (key: 'depot' | 'loop', value: string) => void;
  exportUrl: string;
  exportFilename: string;
  exportQueryParams: Record<string, string | string[]>;
  onExportError: (error: Error) => void;
  onExport: (format: 'xlsx' | 'pdf' | 'csv') => Promise<Blob | null>;
}

export const MobileFilters = memo<MobileFiltersProps>(({
  dateFrom,
  dateTo,
  search,
  depotFilter,
  loopFilter,
  uniqueDepots,
  uniqueLoops,
  onDateChange,
  onSearchChange,
  onToggleFilter,
  exportUrl,
  exportFilename,
  exportQueryParams,
  onExportError,
  onExport,
}) => {
  return (
    <div className={dailyOperationsReportsStyles.mobileFiltersCard}>
      {/* Period */}
      <div className={dailyOperationsReportsStyles.mobileFiltersGroup}>
        <PeriodPicker
          variant="range"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={onDateChange}
          labelPeriod="Period"
          labelTo="to"
          mobileLayout
        />
      </div>

      {/* Search + Export */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={onSearchChange}
            className={dailyOperationsReportsStyles.mobileFiltersSearchInput}
          />
        </div>
        <div className="shrink-0">
          <ExportButton
            exportUrl={exportUrl}
            filename={exportFilename}
            format="xlsx"
            queryParams={exportQueryParams}
            onExport={onExport}
            className={`btn btn-outline-secondary d-flex align-items-center gap-1.5 ${dailyOperationsReportsStyles.mobileFiltersExportBtn}`}
            variant="outline"
            size="sm"
            label="Export"
            onError={onExportError}
            showOnlyExcelAndPdf={true}
            hasActiveFilters={depotFilter !== 'All' || loopFilter !== 'All' || search !== ''}
          />
        </div>
      </div>

      {/* Depot Filter */}
      <div className={dailyOperationsReportsStyles.mobileFiltersGroup}>
        <label className={dailyOperationsReportsStyles.mobileFiltersLabel}>Depot</label>
        <div className={dailyOperationsReportsStyles.mobileFiltersButtons}>
          <button
            className={`${dailyOperationsReportsStyles.mobileFiltersButton} ${
              depotFilter === 'All'
                ? dailyOperationsReportsStyles.mobileFiltersButtonActive
                : dailyOperationsReportsStyles.mobileFiltersButtonInactive
            }`}
            onClick={() => onToggleFilter('depot', 'All')}
          >
            All
          </button>
          <button
            className={`${dailyOperationsReportsStyles.mobileFiltersButton} ${
              depotFilter === 'Off'
                ? dailyOperationsReportsStyles.mobileFiltersButtonActive
                : dailyOperationsReportsStyles.mobileFiltersButtonInactive
            }`}
            onClick={() => onToggleFilter('depot', 'Off')}
          >
            Off
          </button>
          {uniqueDepots.filter(d => d.toUpperCase() !== 'OFF').slice(0, 3).map(depot => (
            <button
              key={depot}
              className={`${dailyOperationsReportsStyles.mobileFiltersButton} ${
                depotFilter === depot
                  ? dailyOperationsReportsStyles.mobileFiltersButtonActive
                  : dailyOperationsReportsStyles.mobileFiltersButtonInactive
              }`}
              onClick={() => onToggleFilter('depot', depot)}
            >
              {depot}
            </button>
          ))}
        </div>
      </div>

      {/* Loop Filter */}
      <div className={dailyOperationsReportsStyles.mobileFiltersGroup}>
        <label className={dailyOperationsReportsStyles.mobileFiltersLabel}>Loop</label>
        <div className={dailyOperationsReportsStyles.mobileFiltersButtons}>
          <button
            className={`${dailyOperationsReportsStyles.mobileFiltersButton} ${
              loopFilter === 'All'
                ? dailyOperationsReportsStyles.mobileFiltersButtonActive
                : dailyOperationsReportsStyles.mobileFiltersButtonInactive
            }`}
            onClick={() => onToggleFilter('loop', 'All')}
          >
            All
          </button>
          {uniqueLoops.slice(0, 4).map(loop => (
            <button
              key={loop}
              className={`${dailyOperationsReportsStyles.mobileFiltersButton} ${
                loopFilter === loop
                  ? dailyOperationsReportsStyles.mobileFiltersButtonActive
                  : dailyOperationsReportsStyles.mobileFiltersButtonInactive
              }`}
              onClick={() => onToggleFilter('loop', loop)}
            >
              {loop}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

MobileFilters.displayName = 'MobileFilters';

