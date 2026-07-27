// @ts-nocheck
﻿import { useState, useEffect, useCallback } from 'react';
import { Filters } from '../types';
import { DepositWithServiceTypesAndRoutesDTO } from '@/lib/serviceTypes';
import { fetchAllDailyOperationsReportsWithFilters } from '@/lib/daily-operations-api';

/** Busca todos os reports do período (visualização diária, sem paginação). */
export const useReportsData = (
  currentFilters: Filters,
  depositsData: DepositWithServiceTypesAndRoutesDTO[],
  currentPage: number = 1,
  itemsPerPage: number = 50,
  servicePartnerId?: number
) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Lógica: se apenas dateTo preenchido, usar dateTo; se ambos, usar range; se apenas dateFrom, usar dateFrom
      let effectiveDateFrom: string;
      let effectiveFinalDate: string;
      
      if (currentFilters.dateTo?.trim() && !currentFilters.dateFrom?.trim()) {
        // Apenas dateTo preenchido: usar dateTo para ambos
        effectiveDateFrom = currentFilters.dateTo.trim();
        effectiveFinalDate = currentFilters.dateTo.trim();
      } else if (currentFilters.dateFrom?.trim() && currentFilters.dateTo?.trim()) {
        // Ambos preenchidos: usar range
        effectiveDateFrom = currentFilters.dateFrom.trim();
        effectiveFinalDate = currentFilters.dateTo.trim();
      } else if (currentFilters.dateFrom?.trim()) {
        // Apenas dateFrom preenchido: usar dateFrom para ambos
        effectiveDateFrom = currentFilters.dateFrom.trim();
        effectiveFinalDate = currentFilters.dateFrom.trim();
      } else {
        // Nenhum preenchido: não fazer busca
        setLoading(false);
        setReports([]);
        return;
      }

      const searchTerm = currentFilters.search.trim();

      // No backend is available in this subsystem — served from a deterministic
      // in-memory mock pool instead (same pattern as VendorPerformance / the
      // other ported sp-portal pages, no auth/API_BASE_URL required).
      const data = await fetchAllDailyOperationsReportsWithFilters(
        { dateFrom: effectiveDateFrom, dateTo: effectiveFinalDate, depot: currentFilters.depot, search: searchTerm },
        depositsData,
        currentPage,
        itemsPerPage,
        servicePartnerId
      );
      setReports(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to fetch reports');
      setReports([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage,
      });
    } finally {
      setLoading(false);
    }
  }, [currentFilters, depositsData, currentPage, itemsPerPage, servicePartnerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { reports, loading, error, setError, pagination };
};



