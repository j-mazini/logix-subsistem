// @ts-nocheck
import React, { memo } from 'react';
import { TransformedReportData } from '../types';
import { MobileCard } from './MobileCard';
import { LoadingOverlay } from './LoadingOverlay';
import { dailyOperationsReportsStyles } from '../styles';

function formatTotalWorkHours(hours: number): string {
  if (hours <= 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

interface MobileViewProps {
  data: TransformedReportData[];
  loading: boolean;
  totalStops: number;
  totalWorkHoursIncludingSort: number;
  onVendorClick?: (vendorName: string) => void;
}

export const MobileView: React.FC<MobileViewProps> = memo(({
  data,
  loading,
  totalStops,
  totalWorkHoursIncludingSort,
  onVendorClick,
}) => {
  return (
    <div className={dailyOperationsReportsStyles.mobileViewContainer}>
      <LoadingOverlay loading={loading} message="Loading..." />

      {data.length === 0 && !loading ? (
        <div className={dailyOperationsReportsStyles.mobileViewEmpty}>
          No records found.
        </div>
      ) : (
        <div className={`${dailyOperationsReportsStyles.mobileViewList} ${loading ? dailyOperationsReportsStyles.mobileViewListLoading : dailyOperationsReportsStyles.mobileViewListLoaded}`}>
          {data.map((row, index) => (
            <MobileCard key={`${row.date}-${row.route}-${row.vrn}-${index}`} row={row} index={index} onVendorClick={onVendorClick} />
          ))}
          {data.length > 0 && (
            <div className={dailyOperationsReportsStyles.mobileViewTotals}>
              <div className={dailyOperationsReportsStyles.mobileViewTotalsRow}>
                <span className={dailyOperationsReportsStyles.mobileViewTotalsLabel}>Total Work Hours:</span>
                <span className={dailyOperationsReportsStyles.mobileViewTotalsValue}>{formatTotalWorkHours(totalWorkHoursIncludingSort)}</span>
              </div>
              <div className={dailyOperationsReportsStyles.mobileViewTotalsRow}>
                <span className={dailyOperationsReportsStyles.mobileViewTotalsLabel}>Total Stops:</span>
                <span className={dailyOperationsReportsStyles.mobileViewTotalsValue}>{totalStops || '0'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MobileView.displayName = 'MobileView';

