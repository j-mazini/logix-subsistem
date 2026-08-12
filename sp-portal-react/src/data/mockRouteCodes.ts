/**
 * Single source of truth for the route codes used across every Dashboard
 * mock surface — Live Service (Dashboard.tsx's LIVE_ROUTES), Deductions
 * (DeductionsDisbursementsRecharges.tsx), and Trace & Queries
 * (traceQueryCaseService.ts). Previously each of these declared its own
 * route-name pool, so the same AWB/case could show a route in one block
 * that never appeared in another.
 */
export const ROUTE_CODES = ['MD7A', 'MD7B', 'MD7C', 'MD7D', 'MD7E', 'MD7F'];
