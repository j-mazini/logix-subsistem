// @ts-nocheck
﻿import React, { memo } from 'react';
import ExportButton from '@/components/export-button';
import { PeriodPicker } from '@/components/period-picker';
import type { TransformedReportData } from '../types';
import { fetchAllDailyOperationsReportsWithFilters } from '@/lib/daily-operations-api';
import { transformReportData, filterReportData } from '../dataProcessor';
import { DepositWithServiceTypesAndRoutesDTO } from '@/lib/serviceTypes';
import { extractLoop } from '../utils';
import type { Filters } from '../types';
import { dailyOperationsReportsStyles } from '../styles';

interface FilterBarProps {
  dateFrom: string;
  dateTo: string;
  search: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportUrl: string;
  exportFilename: string;
  exportQueryParams: Record<string, string | string[]>;
  onExportError: (error: Error) => void;
  data?: TransformedReportData[];
  depotFilter?: string;
  loopFilter?: string;
  depositsData?: DepositWithServiceTypesAndRoutesDTO[];
  variant?: 'standalone' | 'embedded';
  onExport?: (format: 'xlsx' | 'pdf' | 'csv') => Promise<Blob | null>;
}

export const FilterBar = memo<FilterBarProps>(({
  dateFrom,
  dateTo,
  search,
  onDateChange,
  onSearchChange,
  exportUrl,
  exportFilename,
  exportQueryParams,
  onExportError,
  data = [],
  depotFilter = 'All',
  loopFilter = 'All',
  depositsData = [],
  variant = 'standalone',
  onExport: onExportProp,
}) => {
  const handleExportInternal = async (format: 'xlsx' | 'pdf' | 'csv'): Promise<Blob | null> => {
    if (format === 'pdf') {
      try {
        // Fetch all records with applied filters (no pagination)
        let depositId: number | undefined = undefined;
        if (depotFilter !== 'All' && depositsData.length > 0) {
          const foundDeposit = depositsData.find(d => d.depositName === depotFilter);
          if (foundDeposit?.depositId !== undefined) {
            depositId = foundDeposit.depositId;
          }
        }

        // Coletar serviceTypeIds baseado no filtro de loop
        let serviceTypeIds: number[] = [];
        if (loopFilter !== 'All' && depositsData.length > 0) {
          const foundServiceTypeIds = new Set<number>();
          for (const deposit of depositsData) {
            if (depotFilter !== 'All' && depositId !== undefined && deposit.depositId !== depositId) {
              continue;
            }
            for (const serviceType of deposit.serviceTypes) {
              const serviceTypeName = serviceType.name || '';
              const baseLoopFromName = serviceTypeName.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim();
              const baseLoop = extractLoop(baseLoopFromName) || extractLoop(serviceTypeName);
              let matches = false;
              for (const route of serviceType.routes) {
                if (route.routeName) {
                  const routeLoop = extractLoop(route.routeName);
                  if (routeLoop === loopFilter || baseLoop === loopFilter) {
                    matches = true;
                    break;
                  }
                }
              }
              if (!matches && baseLoop === loopFilter) {
                matches = true;
              }
              if (matches) {
                foundServiceTypeIds.add(serviceType.serviceTypeId);
                const isFlexServiceType = serviceType.name?.includes('_FLEX') || serviceType.name?.includes('FLEX');
                const baseName = serviceTypeName.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim();
                if (baseName) {
                  for (const otherServiceType of deposit.serviceTypes) {
                    if (otherServiceType.serviceTypeId !== serviceType.serviceTypeId) {
                      const otherIsFlex = otherServiceType.name?.includes('_FLEX') || otherServiceType.name?.includes('FLEX');
                      const otherBaseName = otherServiceType.name?.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim() || '';
                      if (baseName === otherBaseName && isFlexServiceType !== otherIsFlex) {
                        foundServiceTypeIds.add(otherServiceType.serviceTypeId);
                      }
                    }
                  }
                }
              }
            }
          }
          serviceTypeIds = Array.from(foundServiceTypeIds);
        }

        // Search params
        const searchTerm = search.trim();
        const registrationPlate = searchTerm || undefined;
        const routeName = searchTerm || undefined;
        const vendorName = searchTerm || undefined;

        // Determinar datas efetivas: se apenas dateTo preenchido, usar dateTo; se ambos, usar range
        const finalDateFrom = dateFrom?.trim() ? dateFrom : (dateTo?.trim() ? dateTo : '');
        const finalDateTo = dateTo?.trim() ? dateTo : (dateFrom?.trim() ? dateFrom : '');
        
        // Buscar todos os registros
        const allReports = await fetchAllDailyOperationsReportsWithFilters(
          finalDateFrom,
          finalDateTo,
          depositId,
          serviceTypeIds.length > 0 ? serviceTypeIds : undefined,
          false,
          registrationPlate,
          routeName,
          vendorName
        );

        // Transform and filter data
        const transformedData = transformReportData(allReports);
        const filters: Filters = {
          dateFrom: finalDateFrom,
          dateTo: finalDateTo,
          depot: depotFilter,
          loop: loopFilter,
          search: searchTerm
        };
        const filteredData = filterReportData(transformedData, filters);

        // Determinar datas efetivas para exportação
        const exportDateFrom = dateFrom?.trim() ? dateFrom : (dateTo?.trim() ? dateTo : '');
        const exportDateTo = dateTo?.trim() ? dateTo : (dateFrom?.trim() ? dateFrom : '');
        
        // Exportar PDF com todos os dados filtrados
        const { exportDailyOperationsToPDF } = await import('../utils/pdfExport');
        return await exportDailyOperationsToPDF(filteredData, exportDateFrom, exportDateTo, depotFilter, loopFilter, search);
      } catch (error) {
        console.error('Error exporting PDF:', error);
        onExportError(error instanceof Error ? error : new Error('Error exporting PDF'));
        return null;
      }
    }
    // For Excel/CSV, return null to use exportUrl (backend)
    return null;
  };
  const handleExport = onExportProp ?? handleExportInternal;
  const isEmbedded = variant === 'embedded';

  return (
    <nav
      className={
        isEmbedded
          ? dailyOperationsReportsStyles.filterBarEmbedded
          : dailyOperationsReportsStyles.filterBarStandalone
      }
    >
      <PeriodPicker
        variant="range"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={onDateChange}
        labelPeriod="Period"
        labelTo="to"
      />

      <div className="dor-filter-group">
        <label htmlFor="searchInput" className="filters-label">Search (Route, Vehicle, Vendor)</label>
        <input
          type="text"
          id="searchInput"
          placeholder="Search by Route, Vehicle, or Vendor..."
          value={search}
          onChange={onSearchChange}
          className="form-control"
        />
      </div>

      <div className={dailyOperationsReportsStyles.filterBarActions}>
        <ExportButton
          exportUrl={exportUrl}
          filename={exportFilename}
          format="xlsx"
          queryParams={exportQueryParams}
          onExport={handleExport}
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          variant="outline"
          label="Export"
          onError={onExportError}
          showOnlyExcelAndPdf={true}
          hasActiveFilters={depotFilter !== 'All' || loopFilter !== 'All' || search !== ''}
        />
      </div>
    </nav>
  );
});

FilterBar.displayName = 'FilterBar';



