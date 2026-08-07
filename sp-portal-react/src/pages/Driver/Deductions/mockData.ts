import { useEffect, useMemo, useState } from 'react';
import { MOCK_DRIVER } from '../data/driverMockData';
import type { DeductionItem } from './types';

/**
 * No backend here (this is a static Vite SPA) — the reference's useDeductions
 * hit `/bff/deductions/:userId/:month/:year`. This module replaces that call
 * with a deterministic seeded PRNG so navigating the month carousel always
 * regenerates the same "server response" for a given month, instead of
 * re-rolling random data on every render.
 */
function hashStringToSeed(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

const DEDUCTION_TYPES: DeductionItem['deductionType'][] = [
  'FIX_DAMAGE',
  'OTHER',
  'LIQUIDATION_DAMAGE',
  'PRE_PAYMENT',
  'TRAFFIC_PENALTY',
];

const TYPE_DESCRIPTIONS: Record<DeductionItem['deductionType'], string[]> = {
  FIX_DAMAGE: ['Rear bumper repair', 'Windscreen chip repair', 'Side mirror replacement', 'Wing panel dent repair'],
  OTHER: ['Uniform replacement', 'Fuel card admin fee', 'Lost equipment charge', 'Parking fine recharge'],
  LIQUIDATION_DAMAGE: ['Vehicle liquidation damage assessment', 'End-of-lease damage settlement'],
  PRE_PAYMENT: ['Pre-payment recovery instalment', 'Salary advance recovery'],
  TRAFFIC_PENALTY: ['Speeding penalty recharge', 'Bus lane infringement', 'Congestion charge recharge'],
};

interface PlanTemplate {
  deductionId: number;
  deductionType: DeductionItem['deductionType'];
  description: string;
  referenceNumber: string;
  totalInstallments: number;
  monthlyAmount: number;
  /** Absolute "year*12+month" index the first instalment lands in. */
  startMonthIndex: number;
  invoiceId: number | null;
}

/** Builds a handful of multi-instalment plans once per session, anchored
 *  around "now" so the carousel's default window always has some plans
 *  mid-way through. Stable across re-renders/navigation since it's seeded. */
function buildPlans(): PlanTemplate[] {
  const rng = rngForSeed('deductions-plans-v1');
  const now = new Date();
  const nowMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const count = 4;
  const plans: PlanTemplate[] = [];
  for (let i = 0; i < count; i++) {
    const deductionType = DEDUCTION_TYPES[Math.floor(rng() * DEDUCTION_TYPES.length)];
    const descPool = TYPE_DESCRIPTIONS[deductionType];
    const description = descPool[Math.floor(rng() * descPool.length)];
    const totalInstallments = 3 + Math.floor(rng() * 4); // 3-6
    const startOffset = -3 + Math.floor(rng() * 5); // -3..+1 months from now
    const monthlyAmount = Math.round((40 + rng() * 260) * 100) / 100;
    const deductionId = 5000 + i;
    plans.push({
      deductionId,
      deductionType,
      description,
      referenceNumber: `DED-${deductionType.slice(0, 3)}-${deductionId}`,
      totalInstallments,
      monthlyAmount,
      startMonthIndex: nowMonthIndex + startOffset,
      invoiceId: 9000 + i,
    });
  }
  return plans;
}

const PLANS = buildPlans();

/** Generates the "raw" (already month-scoped, one row per instalment)
 *  deduction records the reference API would have returned for this
 *  year/month — deterministic per month key, so revisiting a month is stable
 *  while different months differ. */
function generateDeductionsForMonth(year: number, month: number): DeductionItem[] {
  const monthIndex = year * 12 + month;
  const items: DeductionItem[] = [];

  // Multi-instalment plans that happen to have a payment due this month.
  for (const plan of PLANS) {
    const current = monthIndex - plan.startMonthIndex + 1;
    if (current >= 1 && current <= plan.totalInstallments) {
      items.push({
        deductionId: plan.deductionId,
        description: plan.description,
        amount: plan.monthlyAmount.toFixed(2),
        date: new Date(Date.UTC(year, month, 12)).toISOString(),
        deductionType: plan.deductionType,
        totalInstallments: plan.totalInstallments,
        currentInstallment: current,
        uniqueId: `${plan.deductionType}-${plan.deductionId}`,
        invoiceId: plan.invoiceId,
        referenceNumber: plan.referenceNumber,
        totalAmount: (plan.monthlyAmount * plan.totalInstallments).toFixed(2),
        userId: MOCK_DRIVER.userId,
      });
    }
  }

  // A small number of one-off deductions, varying (but stable) per month.
  const rng = rngForSeed(`deductions-${year}-${month}`);
  const oneOffCount = Math.floor(rng() * 3); // 0-2
  for (let i = 0; i < oneOffCount; i++) {
    const deductionType = DEDUCTION_TYPES[Math.floor(rng() * DEDUCTION_TYPES.length)];
    const descPool = TYPE_DESCRIPTIONS[deductionType];
    const description = descPool[Math.floor(rng() * descPool.length)];
    const amount = Math.round((15 + rng() * 180) * 100) / 100;
    const day = 1 + Math.floor(rng() * 27);
    const deductionId = 9000 + Math.abs(year) * 100 + month * 10 + i;
    items.push({
      deductionId,
      description,
      amount: amount.toFixed(2),
      date: new Date(Date.UTC(year, month, day, 12)).toISOString(),
      deductionType,
      uniqueId: `${deductionType}-${deductionId}`,
      invoiceId: null,
      referenceNumber: `DED-${deductionType.slice(0, 3)}-${deductionId}`,
      totalAmount: amount.toFixed(2),
      userId: MOCK_DRIVER.userId,
    });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Mock stand-in for the reference's `useDeductions(selectedDate, servicePartnerId)`.
 * The service-partner filter is dropped — this Driver Portal only ever shows
 * the signed-in driver's own deductions. Data is computed synchronously (it's
 * already deterministic), with a short simulated `isLoading` flash on month
 * change so the carousel/loading-bar UX still reads the same as the reference.
 */
export function useDeductions(selectedDate: Date) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const [isLoading, setIsLoading] = useState(false);

  const deductions = useMemo(() => generateDeductionsForMonth(year, month), [year, month]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 260);
    return () => clearTimeout(timer);
  }, [year, month]);

  return { deductions, error: null as string | null, isLoading };
}
