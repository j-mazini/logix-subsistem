// @ts-nocheck
﻿import { DailyOperationsReportDTO } from '@/lib/daily-operations-api';
import { TransformedReportData } from './types';
import { extractLoop, normalizeDateString, getDepositNameFromRow, calculateWorkHoursWithSort, calculateTotalWorkHoursIncludingSort } from './utils';
import { Filters } from './types';
import {
  parseWorkedHoursToDecimal,
} from '@/lib/performance-utils';

/**
 * Transforma dados do backend para o formato esperado
 */
export const transformReportData = (reports: DailyOperationsReportDTO[]): TransformedReportData[] => {
  return reports.map(report => {
    // Garantir que stops seja sempre um número
    const stopsValue = report.totalStops;
    let stopsNumber = 0;
    if (typeof stopsValue === 'string') {
      stopsNumber = parseInt(stopsValue, 10) || 0;
    } else if (typeof stopsValue === 'number') {
      stopsNumber = stopsValue || 0;
    }
    
    // Get loop from DB (priority: loopName > loop > loopCode); fallback: extract from route
    const loopFromDb = report.loopName || report.loop || report.loopCode;
    const loop = loopFromDb || extractLoop(report.routeName || '');
    
    return {
      date: report.operationDate,
      route: report.routeName || '',
      vendor: report.courierName || '',
      vrn: report.vrn || '',
      tw: report.percentageOtTwDl,
      depart: report.departTime,
      arrive: report.arriveTime,
      workHours: report.calculatedWorkHours || report.totalWorkHours,
      stops: stopsNumber,
      note: report.note || '',
      depot: report.depositName || '',
      breakTime: report.breakMinutes ? `${report.breakMinutes} min` : null,
      depositId: report.depositId,
      depositName: report.depositName || '',
      loop: loop || null,
      routeSort: report.routeSort ?? null,
      isSpms: report.isSpms,
    };
  });
};

/**
 * Filtra os dados transformados
 */
export const filterReportData = (
  transformedData: TransformedReportData[],
  filters: Filters
): TransformedReportData[] => {
  return transformedData.filter((row) => {
    // Filtro de Data: comparação por string YYYY-MM-DD (data-only), evitando que a
    // conversão de um ISO UTC (ex: "...T00:00:00.000Z") para o fuso local desloque o dia.
    const rowDateOnly = normalizeDateString(row.date);
    const effectiveDateTo = filters.dateTo?.trim() ? filters.dateTo : filters.dateFrom;

    if (rowDateOnly < filters.dateFrom || rowDateOnly > effectiveDateTo) return false;

    // Filtro de Busca
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesRoute = row.route.toLowerCase().includes(searchTerm);
      const matchesVehicle = row.vrn.toLowerCase().includes(searchTerm);
      const matchesVendor = row.vendor.toLowerCase().includes(searchTerm);
      if (!matchesRoute && !matchesVehicle && !matchesVendor) {
        return false;
      }
    }

    // Depot filter
    if (filters.depot !== 'All') {
      const rowDepot = (row.depot || '').trim().toUpperCase();
      const filterDepot = filters.depot.trim().toUpperCase();
      if (rowDepot !== filterDepot && !rowDepot.includes(filterDepot) && !filterDepot.includes(rowDepot)) {
        return false;
      }
    }

    // Loop filter (use DB loop)
    if (filters.loop !== 'All') {
      const rowLoop = row.loop || extractLoop(row.route);
      if (rowLoop !== filters.loop) return false;
    }

    return true;
  });
};

/**
 * Calcula total de stops
 */
export const calculateTotalStops = (filteredData: TransformedReportData[]): number => {
  return filteredData.reduce((acc, row) => {
    const stopsValue = row.stops;
    let stopsNumber = 0;
    if (typeof stopsValue === 'string') {
      stopsNumber = parseInt(stopsValue, 10) || 0;
    } else if (typeof stopsValue === 'number') {
      stopsNumber = stopsValue || 0;
    }
    return acc + stopsNumber;
  }, 0);
};

/**
 * Extract unique depots
 */
export const extractUniqueDepots = (transformedData: TransformedReportData[]): string[] => {
  const depots = new Set(transformedData.map(r => r.depot).filter(Boolean));
  // Exclude BAOP and GEN from depot list (OFF is now included)
  return Array.from(depots).filter(depot => depot !== 'BAOP' && depot !== 'GEN').sort();
};

/**
 * Extrai loops únicos do banco de dados
 */
export const extractUniqueLoops = (transformedData: TransformedReportData[]): string[] => {
  // Priorizar loop do banco de dados, usar fallback para extrair da rota se não houver
  const loops = new Set(
    transformedData
      .map(r => r.loop || extractLoop(r.route))
      .filter(Boolean)
  );
  return Array.from(loops).sort();
};

/**
 * Work hours total formula:
 *   Total = Σ (base hours per row)
 *         + Σ (sort time for each operation with routeSort > 0: LSE 2:45, LCY 2:00, MSE 1:45)
 *         + Σ per day (15 min × unique vendors that day)
 *
 * Enriches each row with workHoursWithSort = base + sort (for each row with routeSort > 0).
 * Sort time is based on depositName property (LSE, LCY, MSE) and only applied when routeSort > 0.
 * For total calculation, sort time is added for each individual operation with routeSort > 0.
 * 
 * Esta função usa métodos utilitários reutilizáveis de utils.ts
 */
export function addWorkHoursWithSortAndTotal(
  rows: TransformedReportData[]
): { rows: TransformedReportData[]; totalWorkHoursIncludingSort: number } {
  const result: TransformedReportData[] = [];

  // Enriquecer cada linha com workHoursWithSort usando método utilitário
  for (const row of rows) {
    const depositName = getDepositNameFromRow(row);
    const workHoursWithSort = calculateWorkHoursWithSort(
      row.workHours,
      row.routeSort,
      depositName
    );
    result.push({ ...row, workHoursWithSort });
  }

  // Calcular total usando método utilitário
  const totalWorkHoursIncludingSort = calculateTotalWorkHoursIncludingSort(rows);

  return { rows: result, totalWorkHoursIncludingSort };
}






