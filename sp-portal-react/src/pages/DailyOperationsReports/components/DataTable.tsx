// @ts-nocheck
import React, { memo } from 'react';
import { TransformedReportData } from '../types';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { LoadingOverlay } from './LoadingOverlay';
import { dailyOperationsReportsStyles } from '../styles';

interface DataTableProps {
  data: TransformedReportData[];
  loading: boolean;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  totalStops: number;
  totalWorkHoursIncludingSort: number;
  onVendorClick?: (vendorName: string) => void;
}

const COLUMNS = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'route', label: 'Route', sortable: true },
  { key: 'vendor', label: 'Vendor', sortable: true, className: 'whitespace-normal break-words' },
  { key: 'vrn', label: 'VRN', sortable: true },
  { key: 'tw', label: 'TW\n(%)', sortable: true },
  { key: 'depart', label: 'Depart', sortable: true },
  { key: 'arrive', label: 'Arrive', sortable: true },
  { key: 'breakTime', label: 'Break', sortable: true },
  { key: 'workHours', label: 'Work\nHours', sortable: true },
  { key: 'stops', label: 'Stops', sortable: true },
  { key: 'note', label: 'Note', sortable: false },
];

function formatTotalWorkHours(hours: number): string {
  if (hours <= 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export const DataTable = memo<DataTableProps>(({
  data,
  loading,
  sortField,
  sortDirection,
  onSort,
  totalStops,
  totalWorkHoursIncludingSort = 0,
  onVendorClick,
}) => {
  return (
    <div className={dailyOperationsReportsStyles.dataTableContainer} style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <LoadingOverlay loading={loading} />

      {loading ? (
        <div className={dailyOperationsReportsStyles.dataTableLoadingContainer}>
          <div className={dailyOperationsReportsStyles.dataTableLoadingSpinner}></div>
          <p className={dailyOperationsReportsStyles.dataTableLoadingText}>Loading operations...</p>
        </div>
      ) : (
        <div className={dailyOperationsReportsStyles.dataTableScroll} style={{ maxWidth: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' }}>
          <table className={dailyOperationsReportsStyles.dataTable} style={{ minWidth: '100%', tableLayout: 'auto', width: 'max-content' }}>
            <TableHeader
              columns={COLUMNS}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={11} className={dailyOperationsReportsStyles.dataTableEmptyCell}>
                    No records found for the selected filters.
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <TableRow
                    key={`${row.date}-${row.route}-${row.vendor}-${index}`}
                    row={row}
                    index={index}
                    totalWorkHoursIncludingSort={totalWorkHoursIncludingSort}
                    onVendorClick={onVendorClick}
                  />
                ))
              )}
              {data.length > 0 && (
                <>
                  <tr className={dailyOperationsReportsStyles.dataTableTotalRow}>
                    <td colSpan={8} className={dailyOperationsReportsStyles.dataTableTotalCell}>
                      <span className={dailyOperationsReportsStyles.dataTableTotalLabel}>Total Work Hours:</span>
                    </td>
                    <td
                      className={dailyOperationsReportsStyles.dataTableTotalCellCenter}
                    >
                      {formatTotalWorkHours(totalWorkHoursIncludingSort)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                  <tr className={dailyOperationsReportsStyles.dataTableTotalRow}>
                    <td colSpan={10} className={dailyOperationsReportsStyles.dataTableTotalCell}>
                      <span className={dailyOperationsReportsStyles.dataTableTotalLabel}>Total Stops:</span>
                    </td>
                    <td className="py-2.5 px-2 text-sm align-middle text-center font-semibold text-gray-700">
                      {totalStops || '0'}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

DataTable.displayName = 'DataTable';

