/**
 * Subset of Logixsphere's `src/constants/businessRules.ts` needed by the Daily Game
 * Plan port — the fixed IDs the original backend uses for DHOC/NotAllocated routes,
 * the BAOP deposit, and status/user-type labels. Ported verbatim (values only, the
 * long "why this ID" comments live in the original repo).
 */
export const BUSINESS_RULES = Object.freeze({
  ROUTE: Object.freeze({
    DAY_OFF: 48,
    BRTE: 55,
    DHOC: 57,
    NOT_ALLOCATED: 159,
  }),
  VEHICLE: Object.freeze({
    DAY_OFF_PLACEHOLDER: 37,
    BAOP_DEFAULT_PLACEHOLDER: 55,
  }),
  DEPOSIT: Object.freeze({
    LCY: 1,
    MSE: 2,
    LSE: 3,
    DAY_OFF: 4,
    BAOP_DEFAULT: 7,
  }),
  USER_TYPE: Object.freeze({
    ADMIN: 1,
    DRIVER: 2,
    SUPERVISOR: 3,
    SERVICE_PARTNER: 5,
  }),
  WORKING_STATUS: Object.freeze({
    OFF: 'OFF',
    NOT_ALLOCATED: 'NotAllocated',
    WORKING: 'Working',
  }),
});
