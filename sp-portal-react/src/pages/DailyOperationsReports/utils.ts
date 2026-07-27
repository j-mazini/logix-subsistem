// @ts-nocheck
﻿import { DEPOT_SORT_HOURS, parseWorkedHoursToDecimal, getVendorExtraHoursOnly } from '@/lib/performance-utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats date for display (system format: dd MMM yyyy, e.g. 30 Jan 2025)
 * Parses the YYYY-MM-DD part directly (no Date object), so a UTC ISO string
 * like "2026-07-03T00:00:00.000Z" isn't shifted by the browser's local timezone.
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const datePart = dateString.split('T')[0].split(' ')[0];
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
  if (!monthName) return '';
  return `${day} ${monthName} ${year}`;
};

/**
 * Formata valor para exibição
 */
export const formatValue = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') {
    if (value % 1 === 0) return value.toString();
    return value.toFixed(2);
  }
  return value.toString();
};

/**
 * Retorna classe Tailwind para TW baseado no valor
 */
export const getTWClass = (twValue: number | null | undefined): string => {
  if (twValue === null || twValue === undefined) return 'text-[#8491a1]';
  const percentage = twValue * 100;
  if (percentage >= 90 && percentage <= 100) return 'text-[#28a745] font-semibold';
  if (percentage >= 80 && percentage < 90) return 'text-[#ffc107] font-semibold';
  if (percentage < 80) return 'text-[#dc3545] font-semibold';
  return 'text-[#8491a1]';
};

/**
 * Formata TW para exibição
 */
export const formatTW = (twValue: number | null | undefined): string => {
  if (twValue === null || twValue === undefined) return '---';
  const percentage = twValue * 100;
  return `${percentage.toFixed(2)}%`;
};

/**
 * Verifica se a rota é FLEX
 */
export const isFlexRoute = (route: string | null | undefined): boolean => {
  return route ? route.toUpperCase().includes('FLEX') : false;
};

/**
 * Converte string de tempo para minutos
 */
export const timeToMinutes = (timeStr: string | null | undefined): number | null => {
  if (!timeStr) return null;
  const time = String(timeStr).trim().toUpperCase();
  
  // Formato 24h (ex: "17:00", "17:30")
  const match24h = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    return parseInt(match24h[1], 10) * 60 + parseInt(match24h[2], 10);
  }
  
  // Formato 12h com AM/PM (ex: "5PM", "5:30PM")
  const match12h = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match12h) {
    let hours = parseInt(match12h[1], 10);
    const minutes = match12h[2] ? parseInt(match12h[2], 10) : 0;
    const period = match12h[3];
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  
  return null;
};

/**
 * Converte valor de break para minutos
 */
export const breakToMinutes = (breakValue: string | number | null | undefined): number | null => {
  if (!breakValue) return null;
  const breakStr = String(breakValue).trim().toLowerCase();
  
  // Formato "30 min" ou "30min"
  const matchMin = breakStr.match(/^(\d+)\s*min/);
  if (matchMin) return parseInt(matchMin[1], 10);
  
  // Formato "0:30" ou "1:15" (horas:minutos)
  const matchTime = breakStr.match(/^(\d+):(\d+)$/);
  if (matchTime) {
    return parseInt(matchTime[1], 10) * 60 + parseInt(matchTime[2], 10);
  }
  
  // Apenas número (assume minutos)
  const matchNumber = breakStr.match(/^(\d+)$/);
  if (matchNumber) return parseInt(matchNumber[1], 10);
  
  return null;
};

/**
 * Extrai loop da rota
 * Remove o prefixo "Flex " se existir antes de extrair o loop
 */
export const extractLoop = (route: string | null | undefined): string => {
  if (!route) return '';
  // Remove o prefixo "Flex " se existir
  const cleanedRoute = route.replace(/^Flex\s+/i, '');
  const match = cleanedRoute.match(/^([A-Z]{2}\d+)/);
  return match ? match[1] : '';
};

/**
 * Formata horas de trabalho
 */
export const formatWorkHours = (workHours: string | number | null | undefined): number | null => {
  if (!workHours) return null;
  
  // Se for string no formato "HH:MM", converter para horas decimais
  if (typeof workHours === 'string' && workHours.includes(':')) {
    const [hours, minutes] = workHours.split(':').map(Number);
    return hours + minutes / 60;
  }
  
  if (typeof workHours === 'number') return workHours;
  
  const parsed = parseFloat(String(workHours));
  return isNaN(parsed) ? null : parsed;
};

/**
 * Normaliza data para formato YYYY-MM-DD (remove componente de tempo)
 */
export const normalizeDateString = (dateStr: string): string => {
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  if (dateStr.includes(' ')) {
    return dateStr.split(' ')[0];
  }
  return dateStr;
};

/**
 * Obtém o nome do depósito de uma linha (uppercase)
 * Verifica depositName e depot properties
 */
export const getDepositNameFromRow = (row: { depositName?: string; depot?: string }): string => {
  return (row.depositName || row.depot || '').trim().toUpperCase();
};

/**
 * Calcula horas de sort para uma linha baseado no depósito e routeSort
 * Retorna 0 se não houver sort ou depósito inválido
 */
export const calculateSortHoursForRow = (
  routeSort: number | string | null | undefined,
  depositName: string
): number => {
  const routeSortNum = typeof routeSort === 'number' 
    ? routeSort 
    : typeof routeSort === 'string' 
      ? parseFloat(routeSort) 
      : 0;
  
  if (routeSortNum <= 0) return 0;
  
  const normalizedDeposit = depositName.trim().toUpperCase();
  if (normalizedDeposit !== 'LSE' && normalizedDeposit !== 'LCY' && normalizedDeposit !== 'MSE') {
    return 0;
  }
  
  const sortHours = DEPOT_SORT_HOURS[normalizedDeposit];
  return typeof sortHours === 'number' ? sortHours : 0;
};

/**
 * Calcula workHoursWithSort para uma linha individual
 * Retorna base + sort hours quando routeSort > 0
 */
export const calculateWorkHoursWithSort = (
  workHours: string | number | null | undefined,
  routeSort: number | string | null | undefined,
  depositName: string
): number => {
  const base = Math.max(0, parseWorkedHoursToDecimal(workHours));
  const sortAdded = calculateSortHoursForRow(routeSort, depositName);
  return base + sortAdded;
};

/**
 * Calcula total de horas trabalhadas incluindo sort e vendor extra
 * 
 * Fórmula:
 *   Total = Î£ (base hours per row)
 *         + Î£ (sort time for each operation with routeSort > 0: LSE 2:45, LCY 2:00, MSE 1:45)
 *         + Î£ per day (15 min × unique vendors that day)
 * 
 * @param rows Array de linhas com propriedades: workHours, routeSort, depositName/depot, date, vendor
 * @returns Total de horas trabalhadas incluindo sort e vendor extra
 */
export const calculateTotalWorkHoursIncludingSort = <T extends {
  workHours: string | number | null | undefined;
  routeSort?: number | string | null;
  depositName?: string;
  depot?: string;
  date: string;
  vendor?: string | null;
}>(rows: T[]): number => {
  // Usar calculateWorkHoursWithSort para cada linha (base + sort)
  let workHoursWithSortTotal = 0;
  for (const row of rows) {
    const depositName = getDepositNameFromRow(row);
    const workHoursWithSort = calculateWorkHoursWithSort(
      row.workHours,
      row.routeSort,
      depositName
    );
    workHoursWithSortTotal += workHoursWithSort;
  }

  // Agrupar por data para calcular extra de vendor (15 min por vendor único por dia)
  const byDate = new Map<string, T[]>();
  for (const row of rows) {
    const dateOnly = normalizeDateString(row.date);
    if (!byDate.has(dateOnly)) byDate.set(dateOnly, []);
    byDate.get(dateOnly)!.push(row);
  }

  let vendorExtraTotal = 0;
  for (const dayRows of byDate.values()) {
    vendorExtraTotal += getVendorExtraHoursOnly(
      dayRows.map((r) => ({ vendorKey: r.vendor ?? null }))
    );
  }

  return workHoursWithSortTotal + vendorExtraTotal;
};




