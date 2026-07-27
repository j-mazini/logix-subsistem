// @ts-nocheck
import React, { memo } from 'react';
import { TransformedReportData } from '../types';
import { formatDate, formatValue, getTWClass, formatTW, isFlexRoute } from '../utils';
import VrnPlate from '@/components/vrn-plate';
import ServicePartnerBadge from '@/components/service-partner-badge';
import { useServicePartnerNameByVendorName, normalizeVendorName } from '@/hooks/useServicePartnerNameByVendorName';
import { hasSortY } from '@/lib/performance-utils';

interface MobileCardProps {
  row: TransformedReportData;
  index: number;
  onVendorClick?: (vendorName: string) => void;
}

export const MobileCard = memo<MobileCardProps>(({ row, index, onVendorClick }) => {
  const servicePartnerMap = useServicePartnerNameByVendorName();
  const spName = servicePartnerMap.get(normalizeVendorName(row.vendor)) ?? null;

  const handleCardClick = () => {
    if (onVendorClick) {
      onVendorClick(row.vendor);
    }
  };

  const handleVendorButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que dispare o clique do card também
    if (onVendorClick) {
      onVendorClick(row.vendor);
    }
  };

  return (
    <div 
      key={`${row.date}-${row.route}-${row.vrn}-${index}`} 
      onClick={handleCardClick}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${onVendorClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-700 text-sm mb-0.5">
            {formatDate(row.date)}
          </h3>
          <p className="text-[10px] text-blue-600 font-medium truncate flex items-center gap-1">
            <span
              className={`shrink-0 w-2 h-2 rounded-full border border-gray-300 ${hasSortY(row.routeSort) ? 'bg-green-500' : 'bg-red-500'}`}
              title={hasSortY(row.routeSort) ? 'Sort: Yes' : 'Sort: No'}
            />
            {isFlexRoute(row.route) && !row.route.trim().toUpperCase().startsWith('FLEX')
              ? `Flex ${row.route}`
              : row.route}
          </p>
        </div>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-gray-500">Vendor:</span>
          <span className="flex items-center gap-1.5 ml-2 min-w-0 justify-end">
            {onVendorClick ? (
              <button
                onClick={handleVendorButtonClick}
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium truncate text-right"
                title={`View all records for ${row.vendor}`}
              >
                {row.vendor}
              </button>
            ) : (
              <span className="text-gray-700 font-medium truncate">{row.vendor}</span>
            )}
            {spName !== null && (
              <ServicePartnerBadge partnerName={spName} size="xs" className="flex-shrink-0" />
            )}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">VRN:</span>
          <span className="text-gray-700">
            <VrnPlate vrn={row.vrn} size="sm" showBadge={false} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">TW:</span>
          <span className={getTWClass(row.tw)}>
            {row.tw !== null && row.tw !== undefined ? formatTW(row.tw) : '---'}
          </span>
        </div>
        <div className={`flex justify-between ${row.isSpms === false ? 'bg-orange-100 px-1 rounded' : ''}`}>
          <span className="text-gray-500">Stops:</span>
          <span className="text-gray-700 font-medium">{formatValue(row.stops)}</span>
        </div>
      </div>
    </div>
  );
});

MobileCard.displayName = 'MobileCard';

