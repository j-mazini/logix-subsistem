// @ts-nocheck
import React, { memo } from 'react';
import { TransformedReportData } from '../types';
import { formatDate, formatValue, getTWClass, formatTW, isFlexRoute } from '../utils';
import { TableCellArrive } from './TableCellArrive';
import { TableCellBreak } from './TableCellBreak';
import { TableCellWorkHours } from './TableCellWorkHours';
import { NoteIcon } from './NoteIcon';
import VrnPlate from '@/components/vrn-plate';
import ServicePartnerBadge from '@/components/service-partner-badge';
import { useServicePartnerNameByVendorName, normalizeVendorName } from '@/hooks/useServicePartnerNameByVendorName';
import { hasSortY } from '@/lib/performance-utils';
import { dailyOperationsReportsStyles } from '../styles';

interface TableRowProps {
  row: TransformedReportData;
  index: number;
  totalWorkHoursIncludingSort?: number;
  onVendorClick?: (vendorName: string) => void;
}

export const TableRow = memo<TableRowProps>(({ row, index, totalWorkHoursIncludingSort, onVendorClick }) => {
  const servicePartnerMap = useServicePartnerNameByVendorName();
  const spName = servicePartnerMap.get(normalizeVendorName(row.vendor)) ?? null;

  return (
    <tr
      className={`${dailyOperationsReportsStyles.tableRow} ${
        index % 2 === 0 ? dailyOperationsReportsStyles.tableRowEven : dailyOperationsReportsStyles.tableRowOdd
      } ${dailyOperationsReportsStyles.tableRowHover}`}
    >
      <td className={dailyOperationsReportsStyles.tableCell}>
        {formatDate(row.date)}
      </td>
      <td className={dailyOperationsReportsStyles.tableCell}>
        <span className={dailyOperationsReportsStyles.tableCellRouteContent}>
          <span
            className={`${dailyOperationsReportsStyles.tableCellRouteDot} ${hasSortY(row.routeSort) ? dailyOperationsReportsStyles.tableCellRouteDotYes : dailyOperationsReportsStyles.tableCellRouteDotNo}`}
            title={hasSortY(row.routeSort) ? 'Sort: Yes' : 'Sort: No'}
          />
          <a 
            href="#" 
            onClick={e => e.preventDefault()} 
            className={dailyOperationsReportsStyles.tableCellRouteLink}
          >
            {isFlexRoute(row.route) && !row.route.trim().toUpperCase().startsWith('FLEX')
              ? `Flex ${row.route}`
              : row.route}
          </a>
        </span>
      </td>
      <td className={`${dailyOperationsReportsStyles.tableCell} ${dailyOperationsReportsStyles.tableCellNormal}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {onVendorClick ? (
            <button
              onClick={() => onVendorClick(row.vendor)}
              className="dor-vendor-link cursor-pointer"
              title={`View all records for ${row.vendor}`}
            >
              {row.vendor}
            </button>
          ) : (
            <span>{row.vendor}</span>
          )}
          {spName !== null && (
            <ServicePartnerBadge partnerName={spName} size="xs" />
          )}
        </div>
      </td>
      <td className={dailyOperationsReportsStyles.tableCell}>
        <div className={dailyOperationsReportsStyles.tableCellVrnWrapper}>
          <VrnPlate vrn={row.vrn} size="sm" showBadge={false} />
        </div>
      </td>
      <td className={dailyOperationsReportsStyles.tableCell}>
        <span className={getTWClass(row.tw)}>
          {row.tw !== null && row.tw !== undefined ? formatTW(row.tw) : '---'}
        </span>
      </td>
      <td className={dailyOperationsReportsStyles.tableCell}>
        {formatValue(row.depart)}
      </td>
      <td className={dailyOperationsReportsStyles.tableCell}>
        <TableCellArrive
          arrive={row.arrive}
          route={row.route}
          depot={row.depot}
        />
      </td>
      <td className={dailyOperationsReportsStyles.tableCell}>
        <TableCellBreak breakTime={row.breakTime} />
      </td>
      <td className={`${dailyOperationsReportsStyles.tableCell} ${dailyOperationsReportsStyles.tableCellVisible}`} style={{ overflow: 'visible' }}>
        <TableCellWorkHours
          workHours={row.workHours}
          workHoursWithSort={row.workHoursWithSort}
          depart={row.depart}
          arrive={row.arrive}
          routeSort={row.routeSort}
          route={row.route}
          totalWorkHoursIncludingSort={totalWorkHoursIncludingSort}
        />
      </td>
      <td className={`${dailyOperationsReportsStyles.tableCell} ${row.isSpms === false ? 'bg-orange-100' : ''}`}>
        {formatValue(row.stops)}
      </td>
      <td className={`${dailyOperationsReportsStyles.tableCell} ${dailyOperationsReportsStyles.tableCellRelative}`} style={{ overflow: 'visible', position: 'relative' }}>
        <NoteIcon note={row.note} />
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

