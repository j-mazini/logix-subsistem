import { useSyncExternalStore } from 'react';

/**
 * Mock stand-in for the Next.js source's `lib/date-store.ts` (a zustand store
 * with persist middleware). Same public API (`selectedDate`/`setSelectedDate`,
 * localStorage-backed, shared across every page that reads it) implemented
 * with a plain external store so this app doesn't need to add zustand as a
 * dependency for one small piece of shared state.
 */

const STORAGE_KEY = 'shared-date-storage';

// Monday (1): current day - 3; Sunday (0): current day - 2; Tue-Sat: current day - 1
export function getDefaultDate(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();

  let daysToSubtract = 1;
  if (dayOfWeek === 1) {
    daysToSubtract = 3;
  } else if (dayOfWeek === 0) {
    daysToSubtract = 2;
  }

  const defaultDate = new Date(today);
  defaultDate.setDate(today.getDate() - daysToSubtract);
  defaultDate.setHours(0, 0, 0, 0);

  return defaultDate;
}

function loadInitialDate(): Date {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDate();

    const parsed = JSON.parse(raw);
    const storedDate = new Date(parsed.selectedDate);
    const daysDiff = Math.abs(Date.now() - storedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (isNaN(storedDate.getTime()) || daysDiff > 7) return getDefaultDate();
    return storedDate;
  } catch {
    return getDefaultDate();
  }
}

let state = { selectedDate: loadInitialDate() };
const listeners = new Set<() => void>();

function setSelectedDate(date: Date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  state = { selectedDate: normalizedDate };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedDate: normalizedDate.toISOString() }));
  } catch {
    // Storage unavailable (e.g. private browsing) — in-memory state still updates.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useDateStore(): { selectedDate: Date; setSelectedDate: (date: Date) => void } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { selectedDate: snapshot.selectedDate, setSelectedDate };
}
