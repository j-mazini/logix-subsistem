// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PortalLayout } from '@/layout/PortalLayout';
import './tailwind.css';

type Metric = { label: string; value: string | number };
import { format, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FilterBar } from './components/FilterBar';
import { FilterToggles } from './components/FilterToggles';
import { ErrorAlert } from './components/ErrorAlert';
import { DataTable } from './components/DataTable';
import { Pagination } from './components/Pagination';
import { MobileFilters } from './components/MobileFilters';
import { MobileView } from './components/MobileView';
import { VendorDetailsModal } from './components/VendorDetailsModal';
import { useReportsData } from './hooks/useReportsData';
import { useFiltersData } from './hooks/useFiltersData';
import { useDataProcessing } from './hooks/useDataProcessing';
import { extractLoop } from './utils';
import { DepositWithServiceTypesAndRoutesDTO } from '@/lib/serviceTypes';
import { dailyOperationsReportsStyles } from './styles';
import { TransformedReportData, Filters } from './types';
import { fetchAllDailyOperationsReportsWithFilters } from '@/lib/daily-operations-api';
import { transformReportData, filterReportData } from './dataProcessor';
import './daily-operations-reports.css';
import { useServicePartners } from '@/hooks/useServicePartners';

export default function Page() {
    const SINGLE_DAY_ITEMS_PER_PAGE = 500;
    const RANGE_ITEMS_PER_PAGE = 50;
    // Filter state (single day or date range view, no pagination)
    const [currentFilters, setCurrentFilters] = useState<Filters>(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return {
            dateFrom: today,
            dateTo: '',
            depot: 'All',
            loop: 'All',
            search: ''
        };
    });
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(RANGE_ITEMS_PER_PAGE);
    const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
    const { servicePartners } = useServicePartners();
    const hasEndDate = Boolean(currentFilters.dateTo?.trim());
    const effectiveItemsPerPage = hasEndDate ? RANGE_ITEMS_PER_PAGE : SINGLE_DAY_ITEMS_PER_PAGE;
    
    // Verificar se há pelo menos uma data preenchida antes de buscar
    const hasValidDate = useMemo(() => {
        return !!(currentFilters.dateFrom?.trim() || currentFilters.dateTo?.trim());
    }, [currentFilters.dateFrom, currentFilters.dateTo]);

    // Inicializar Font Awesome
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const existingLink = document.querySelector('link[href*="font-awesome"]');
            if (!existingLink) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
                document.head.appendChild(link);
            }
        }
    }, []);

    // Debounce for search (optimization)
    const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.search);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(currentFilters.search);
        }, currentFilters.search ? 300 : 0);
        
        return () => clearTimeout(timer);
    }, [currentFilters.search]);

    // Hook para buscar dados de filtros
    const { depositsData, uniqueDepots, uniqueLoops } = useFiltersData(
        [], // será atualizado após buscar reports
        currentFilters.depot
    );

    // Hook to fetch reports (paginated)
    const { reports, loading, error, setError, pagination } = useReportsData(
        currentFilters,
        depositsData,
        currentPage,
        effectiveItemsPerPage,
        selectedServicePartnerId !== '' ? Number(selectedServicePartnerId) : undefined
    );

    // Hook para processar e filtrar dados
    const {
        transformedData,
        filteredData,
        totalStopsCount,
        totalWorkHoursIncludingSort,
        sortField,
        sortDirection,
        handleSort
    } = useDataProcessing(reports, currentFilters, debouncedSearch);

    // Update uniqueDepots and uniqueLoops from transformed data
    const { uniqueDepots: finalUniqueDepots, uniqueLoops: finalUniqueLoops } = useFiltersData(
        transformedData,
        currentFilters.depot
    );

    const spFilteredData = filteredData;

    // Calcular métricas para o header
    const headerMetrics: Metric[] = useMemo(() => {
        const totalRecords = spFilteredData.length;
        const uniqueRoutes = new Set(spFilteredData.map(r => r.route)).size;
        const uniqueVendors = new Set(spFilteredData.map(r => r.vendor)).size;
        return [
            { label: 'Total Records', value: totalRecords },
            { label: 'Total Stops', value: totalStopsCount || 0 },
            { label: 'Routes', value: uniqueRoutes },
            { label: 'Total Hours (incl. sort)', value: totalWorkHoursIncludingSort || 0 },
        ];
    }, [spFilteredData, totalStopsCount, totalWorkHoursIncludingSort]);

    // Subtitle: single date or period
    const subtitle = useMemo(() => {
        // Se apenas dateTo estiver preenchido, mostrar dateTo
        if (!currentFilters.dateFrom?.trim() && currentFilters.dateTo?.trim()) {
            return `Date: ${format(parseISO(currentFilters.dateTo), 'dd MMM yyyy', { locale: enUS })}`;
        }
        // Se apenas dateFrom estiver preenchido, mostrar dateFrom
        if (currentFilters.dateFrom?.trim() && !currentFilters.dateTo?.trim()) {
            return `Date: ${format(parseISO(currentFilters.dateFrom), 'dd MMM yyyy', { locale: enUS })}`;
        }
        // Se ambos estiverem preenchidos, mostrar range
        if (currentFilters.dateFrom?.trim() && currentFilters.dateTo?.trim()) {
            return `Period: ${format(parseISO(currentFilters.dateFrom), 'dd MMM yyyy', { locale: enUS })} – ${format(parseISO(currentFilters.dateTo), 'dd MMM yyyy', { locale: enUS })}`;
        }
        return undefined;
    }, [currentFilters.dateFrom, currentFilters.dateTo]);

    // Handlers para atualizar o estado dos filtros
    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentFilters(prev => {
            if (name === 'dateFrom') {
                // Se dateTo existe e a nova dateFrom é maior que dateTo, ajustar dateTo
                if (prev.dateTo && value > prev.dateTo) {
                    return { ...prev, dateFrom: value, dateTo: value };
                }
                return { ...prev, dateFrom: value };
            }
            if (name === 'dateTo') {
                // Se dateFrom existe e a nova dateTo é menor que dateFrom, ajustar dateFrom
                if (prev.dateFrom && value < prev.dateFrom) {
                    return { ...prev, dateFrom: value, dateTo: value };
                }
                return { ...prev, dateTo: value };
            }
            return prev;
        });
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCurrentFilters(prev => ({
            ...prev,
            search: value
        }));
    }, []);

    const handleToggleFilter = useCallback((key: keyof Filters, value: string) => {
        setCurrentFilters(prev => {
            if (key === 'depot') {
                return {
                    ...prev,
                    depot: value,
                    loop: 'All'
                };
            }
            return {
                ...prev,
                [key]: value
            };
        });
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    }, [pagination.totalPages]);

    const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    }, []);

    // Regra igual ao Daily Financial Insights:
    // - dia único: 500 itens
    // - período com data final: 50 itens
    useEffect(() => {
        const hasAtLeastOneDate = Boolean(currentFilters.dateFrom?.trim() || currentFilters.dateTo?.trim());
        if (!hasAtLeastOneDate) return;

        if (itemsPerPage !== effectiveItemsPerPage) {
            setItemsPerPage(effectiveItemsPerPage);
            setCurrentPage(1);
        }
    }, [currentFilters.dateFrom, currentFilters.dateTo, itemsPerPage, effectiveItemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [currentFilters.dateFrom, currentFilters.dateTo, currentFilters.depot, currentFilters.loop, currentFilters.search]);

    // Build export query params (same as GET)
    const buildExportParams = useCallback((
        filters: Filters,
        deposits: DepositWithServiceTypesAndRoutesDTO[]
    ): Record<string, string | string[]> => {
        // Se apenas dateTo estiver preenchido, usar dateTo; se ambos, usar range; se apenas dateFrom, usar dateFrom
        const effectiveDateFrom = filters.dateFrom?.trim() ? filters.dateFrom : (filters.dateTo?.trim() ? filters.dateTo : '');
        const effectiveDateTo = filters.dateTo?.trim() ? filters.dateTo : (filters.dateFrom?.trim() ? filters.dateFrom : '');
        const params: Record<string, string | string[]> = {
            initialDate: effectiveDateFrom,
            finalDate: effectiveDateTo,
        };

        // Mapear depot para depositId
        let depositId: number | undefined = undefined;
        if (filters.depot !== 'All') {
            const foundDeposit = deposits.find(d => d.depositName === filters.depot);
            if (foundDeposit?.depositId !== undefined) {
                depositId = foundDeposit.depositId;
                params.depositId = depositId.toString();
            }
        }

        // Collect serviceTypeIds from loop filter
        let serviceTypeIds: number[] = [];

        if (filters.loop !== 'All') {
            const foundServiceTypeIds = new Set<number>();

            if (deposits.length > 0) {
                for (const deposit of deposits) {
                    if (filters.depot !== 'All' && depositId !== undefined && deposit.depositId !== depositId) {
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
                                if (routeLoop === filters.loop || baseLoop === filters.loop) {
                                    matches = true;
                                    break;
                                }
                            }
                        }

                        if (!matches && baseLoop === filters.loop) {
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
            }

            serviceTypeIds = Array.from(foundServiceTypeIds);
        } else if (filters.depot !== 'All' && depositId !== undefined) {
            const selectedDeposit = deposits.find(d => d.depositId === depositId);
            if (selectedDeposit && selectedDeposit.serviceTypes) {
                const serviceTypeIdsSet = new Set<number>();
                const processedServiceTypes = new Set<number>();

                selectedDeposit.serviceTypes.forEach(serviceType => {
                    if (processedServiceTypes.has(serviceType.serviceTypeId)) {
                        return;
                    }

                    serviceTypeIdsSet.add(serviceType.serviceTypeId);
                    processedServiceTypes.add(serviceType.serviceTypeId);

                    const isFlexServiceType = serviceType.name?.includes('_FLEX') || serviceType.name?.includes('FLEX');
                    const baseName = serviceType.name?.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim() || '';

                    if (baseName) {
                        selectedDeposit.serviceTypes.forEach(otherServiceType => {
                            if (otherServiceType.serviceTypeId !== serviceType.serviceTypeId &&
                                !processedServiceTypes.has(otherServiceType.serviceTypeId)) {
                                const otherIsFlex = otherServiceType.name?.includes('_FLEX') || otherServiceType.name?.includes('FLEX');
                                const otherBaseName = otherServiceType.name?.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim() || '';

                                if (baseName === otherBaseName && isFlexServiceType !== otherIsFlex) {
                                    serviceTypeIdsSet.add(otherServiceType.serviceTypeId);
                                    processedServiceTypes.add(otherServiceType.serviceTypeId);
                                }
                            }
                        });
                    }
                });

                serviceTypeIds = Array.from(serviceTypeIdsSet);
            }
        }

        // Adicionar serviceTypeIds como array para suportar múltiplos valores
        if (serviceTypeIds.length > 0) {
            params.serviceTypeId = serviceTypeIds.map(id => id.toString());
        }

        // Add search params if present
        const searchTerm = filters.search.trim();
        if (searchTerm && searchTerm !== '') {
            params.registrationPlate = searchTerm;
            params.routeName = searchTerm;
            params.vendorName = searchTerm;
        }

        return params;
    }, []);

    // Export query params
    const exportQueryParams = useMemo(() => {
        return buildExportParams(currentFilters, depositsData);
    }, [currentFilters, depositsData, buildExportParams]);

    const handleExportError = useCallback((error: Error) => {
        console.error('Error downloading report:', error);
        setError(error.message || 'Failed to download report');
    }, [setError]);

    // Export handler (PDF + Excel/CSV) — usado no desktop (FilterBar) e no mobile (MobileFilters)
    const handleExport = useCallback(async (format: 'xlsx' | 'pdf' | 'csv'): Promise<Blob | null> => {
        if (format === 'pdf') {
            try {
                const { dateFrom, dateTo, depot: depotFilter, loop: loopFilter, search: searchTerm } = currentFilters;
                let depositId: number | undefined = undefined;
                if (depotFilter !== 'All' && depositsData.length > 0) {
                    const foundDeposit = depositsData.find(d => d.depositName === depotFilter);
                    if (foundDeposit?.depositId !== undefined) depositId = foundDeposit.depositId;
                }
                let serviceTypeIds: number[] = [];
                if (loopFilter !== 'All' && depositsData.length > 0) {
                    const foundServiceTypeIds = new Set<number>();
                    for (const deposit of depositsData) {
                        if (depotFilter !== 'All' && depositId !== undefined && deposit.depositId !== depositId) continue;
                        for (const serviceType of deposit.serviceTypes) {
                            const serviceTypeName = serviceType.name || '';
                            const baseLoopFromName = serviceTypeName.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim();
                            const baseLoop = extractLoop(baseLoopFromName) || extractLoop(serviceTypeName);
                            let matches = false;
                            for (const route of serviceType.routes) {
                                if (route.routeName && (extractLoop(route.routeName) === loopFilter || baseLoop === loopFilter)) {
                                    matches = true;
                                    break;
                                }
                            }
                            if (!matches && baseLoop === loopFilter) matches = true;
                            if (matches) {
                                foundServiceTypeIds.add(serviceType.serviceTypeId);
                                const isFlex = serviceType.name?.includes('_FLEX') || serviceType.name?.includes('FLEX');
                                const baseName = serviceTypeName.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim();
                                if (baseName) {
                                    for (const other of deposit.serviceTypes) {
                                        if (other.serviceTypeId !== serviceType.serviceTypeId) {
                                            const otherIsFlex = other.name?.includes('_FLEX') || other.name?.includes('FLEX');
                                            const otherBase = other.name?.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim() || '';
                                            if (baseName === otherBase && isFlex !== otherIsFlex) foundServiceTypeIds.add(other.serviceTypeId);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    serviceTypeIds = Array.from(foundServiceTypeIds);
                }
                const term = searchTerm.trim();
                const finalDateFrom = dateFrom?.trim() ? dateFrom : (dateTo?.trim() ? dateTo : '');
                const finalDateTo = dateTo?.trim() ? dateTo : (dateFrom?.trim() ? dateFrom : '');
                const allReports = await fetchAllDailyOperationsReportsWithFilters(
                    finalDateFrom, finalDateTo, depositId,
                    serviceTypeIds.length > 0 ? serviceTypeIds : undefined, false, term || undefined, term || undefined, term || undefined
                );
                const transformed = transformReportData(allReports);
                const filters: Filters = { dateFrom: finalDateFrom, dateTo: finalDateTo, depot: depotFilter, loop: loopFilter, search: term };
                const filtered = filterReportData(transformed, filters);
                const exportDateFrom = dateFrom?.trim() ? dateFrom : (dateTo?.trim() ? dateTo : '');
                const exportDateTo = dateTo?.trim() ? dateTo : (dateFrom?.trim() ? dateFrom : '');
                const { exportDailyOperationsToPDF } = await import('./utils/pdfExport');
                return await exportDailyOperationsToPDF(filtered, exportDateFrom, exportDateTo, depotFilter, loopFilter, searchTerm);
            } catch (err) {
                console.error('Error exporting PDF:', err);
                handleExportError(err instanceof Error ? err : new Error('Error exporting PDF'));
                return null;
            }
        }
        return null;
    }, [currentFilters, depositsData, handleExportError]);

    // Vendor Details Modal state
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

    // Filter data by selected vendor
    const vendorData = useMemo(() => {
        if (!selectedVendor) return [];
        return transformedData.filter(row => row.vendor === selectedVendor);
    }, [selectedVendor, transformedData]);

    // Handle vendor click
    const handleVendorClick = useCallback((vendorName: string) => {
        setSelectedVendor(vendorName);
        setIsVendorModalOpen(true);
    }, []);

    // Handle modal close
    const handleCloseVendorModal = useCallback(() => {
        setIsVendorModalOpen(false);
        setSelectedVendor(null);
    }, []);

    return (
        <PortalLayout mainClassName="daily-operations-reports-main" title="Operations Insights">
            <div className={`daily-ops-tw-scope w-full min-w-0 ${dailyOperationsReportsStyles.pageContainer}`}>
                <div id="main-content" className={dailyOperationsReportsStyles.mainContent}>
                        {/* Desktop Version */}
                        <main className={dailyOperationsReportsStyles.desktopMain}>
                            <div className="page-header-section">
                                <div className="page-header-welcome-text">
                                    {subtitle && <p className="page-header-date">{subtitle}</p>}
                                </div>
                                <div className="dor-metrics">
                                    {headerMetrics.map((m) => (
                                        <div className="dor-metric-card" key={m.label}>
                                            <p className="dor-metric-label">{m.label}</p>
                                            <p className="dor-metric-value">{m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        {servicePartners.length > 0 && (
                            <div className="flex justify-start px-1 pb-2">
                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                                    value={selectedServicePartnerId}
                                    onChange={(e) => setSelectedServicePartnerId(e.target.value)}
                                >
                                    <option value="">All Service Partners</option>
                                    {servicePartners.map((sp) => (
                                        <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                                            {sp.partnerName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Filters (Period/Search/Export + Depot/Loop) */}
                        <div className={dailyOperationsReportsStyles.filtersContainer}>
                            <div className={dailyOperationsReportsStyles.filtersInner}>
                                <FilterBar
                                    variant="embedded"
                                    dateFrom={currentFilters.dateFrom}
                                    dateTo={currentFilters.dateTo}
                                    search={currentFilters.search}
                                    onDateChange={handleDateChange}
                                    onSearchChange={handleSearchChange}
                                    // exportUrl removed - not available in browser
                                    exportFilename={(() => {
                                        const effectiveDateFrom = currentFilters.dateFrom?.trim() 
                                            ? currentFilters.dateFrom 
                                            : (currentFilters.dateTo?.trim() ? currentFilters.dateTo : '');
                                        const effectiveDateTo = currentFilters.dateTo?.trim() 
                                            ? currentFilters.dateTo 
                                            : (currentFilters.dateFrom?.trim() ? currentFilters.dateFrom : '');

                                        if (!effectiveDateFrom || !effectiveDateTo) return 'daily-operations-reports';
                                        
                                        const from = format(parseISO(effectiveDateFrom), 'dd-MM-yyyy');
                                        const to = format(parseISO(effectiveDateTo), 'dd-MM-yyyy');

                                        return from === to
                                            ? `daily-operations-reports-${from}`
                                            : `daily-operations-reports-${from}-to-${to}`;
                                    })()}
                                    exportQueryParams={exportQueryParams}
                                    onExportError={handleExportError}
                                    onExport={handleExport}
                                    data={spFilteredData}
                                    depotFilter={currentFilters.depot}
                                    loopFilter={currentFilters.loop}
                                    depositsData={depositsData}
                                />
                            </div>

                            <div className={dailyOperationsReportsStyles.filtersTogglesContainer}>
                                <FilterToggles
                                    variant="embedded"
                                    depotFilter={currentFilters.depot}
                                    loopFilter={currentFilters.loop}
                                    uniqueDepots={finalUniqueDepots}
                                    uniqueLoops={finalUniqueLoops}
                                    onToggleFilter={handleToggleFilter}
                                />
                            </div>
                        </div>

                        <ErrorAlert error={error} />

                        <DataTable
                            data={spFilteredData}
                            loading={loading}
                            sortField={sortField}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            totalStops={totalStopsCount}
                            totalWorkHoursIncludingSort={totalWorkHoursIncludingSort}
                            onVendorClick={handleVendorClick}
                        />
                        <Pagination
                            pagination={pagination}
                            itemsPerPage={effectiveItemsPerPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                            loading={loading}
                        />
                    </main>

                    {/* Mobile Version */}
                    <main className={dailyOperationsReportsStyles.mobileMain}>
                        <div className="page-header-section">
                            <div className="page-header-welcome-text">
                                {subtitle && <p className="page-header-date">{subtitle}</p>}
                            </div>
                            <div className="dor-metrics">
                                {headerMetrics.map((m) => (
                                    <div className="dor-metric-card" key={m.label}>
                                        <p className="dor-metric-label">{m.label}</p>
                                        <p className="dor-metric-value">{m.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <MobileFilters
                            dateFrom={currentFilters.dateFrom}
                            dateTo={currentFilters.dateTo}
                            search={currentFilters.search}
                            depotFilter={currentFilters.depot}
                            loopFilter={currentFilters.loop}
                            uniqueDepots={finalUniqueDepots}
                            uniqueLoops={finalUniqueLoops}
                            onDateChange={handleDateChange}
                            onSearchChange={handleSearchChange}
                            onToggleFilter={handleToggleFilter}
                            // exportUrl removed - not available in browser
                            exportFilename={(() => {
                                const effectiveDateFrom = currentFilters.dateFrom?.trim() ? currentFilters.dateFrom : (currentFilters.dateTo?.trim() ? currentFilters.dateTo : '');
                                const effectiveDateTo = currentFilters.dateTo?.trim() ? currentFilters.dateTo : (currentFilters.dateFrom?.trim() ? currentFilters.dateFrom : '');
                                if (!effectiveDateFrom || !effectiveDateTo) return 'daily-operations-reports';
                                const from = format(parseISO(effectiveDateFrom), 'dd-MM-yyyy');
                                const to = format(parseISO(effectiveDateTo), 'dd-MM-yyyy');
                                return from === to ? `daily-operations-reports-${from}` : `daily-operations-reports-${from}-to-${to}`;
                            })()}
                            exportQueryParams={exportQueryParams}
                            onExportError={handleExportError}
                            onExport={handleExport}
                        />

                        <ErrorAlert error={error} />

                        {servicePartners.length > 0 && (
                            <div className="flex justify-start px-1 pb-2">
                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                                    value={selectedServicePartnerId}
                                    onChange={(e) => setSelectedServicePartnerId(e.target.value)}
                                >
                                    <option value="">All Service Partners</option>
                                    {servicePartners.map((sp) => (
                                        <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                                            {sp.partnerName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <MobileView
                            data={spFilteredData}
                            loading={loading}
                            totalStops={totalStopsCount}
                            totalWorkHoursIncludingSort={totalWorkHoursIncludingSort}
                            onVendorClick={handleVendorClick}
                        />
                        <Pagination
                            pagination={pagination}
                            itemsPerPage={effectiveItemsPerPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                            loading={loading}
                        />
                    </main>
                    </div>

                {/* Vendor Details Modal */}
                {selectedVendor && (
                    <VendorDetailsModal
                        isOpen={isVendorModalOpen}
                        vendorName={selectedVendor}
                        vendorData={vendorData}
                        onClose={handleCloseVendorModal}
                        totalWorkHoursIncludingSort={totalWorkHoursIncludingSort}
                    />
                )}
            </div>
        </PortalLayout>
    );
}


