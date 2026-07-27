// @ts-nocheck
import { useMemo, useState } from 'react';
import { transformReportData, filterReportData, calculateTotalStops, addWorkHoursWithSortAndTotal } from '../dataProcessor';
import { Filters } from '../types';

export const useDataProcessing = (
  reports: any[],
  currentFilters: Filters,
  debouncedSearch: string
) => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const transformedData = useMemo(() => transformReportData(reports), [reports]);

  const filtersWithDebouncedSearch = useMemo(() => ({
    ...currentFilters,
    search: debouncedSearch
  }), [currentFilters, debouncedSearch]);

  const baseFilteredData = useMemo(() => {
    return filterReportData(transformedData, filtersWithDebouncedSearch);
  }, [transformedData, currentFilters.dateFrom, currentFilters.dateTo, currentFilters.depot, currentFilters.loop, debouncedSearch]);

  const enriched = useMemo(() => addWorkHoursWithSortAndTotal(baseFilteredData), [baseFilteredData]);

  const filteredData = useMemo(() => {
    if (!sortField) return enriched.rows;
    const sorted = [...enriched.rows].sort((a, b) => {
      let aValue: any = sortField === 'workHours' ? a.workHoursWithSort : a[sortField as keyof typeof a];
      let bValue: any = sortField === 'workHours' ? b.workHoursWithSort : b[sortField as keyof typeof b];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (sortField === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'tw' || sortField === 'stops') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === 'workHours') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase().trim();
        bValue = bValue.toLowerCase().trim();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        // already numbers
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [enriched.rows, sortField, sortDirection]);

  const totalStopsCount = useMemo(() => calculateTotalStops(filteredData), [filteredData]);
  const totalWorkHoursIncludingSort = enriched.totalWorkHoursIncludingSort;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return {
    transformedData,
    filteredData,
    totalStopsCount,
    totalWorkHoursIncludingSort,
    sortField,
    sortDirection,
    handleSort
  };
};
