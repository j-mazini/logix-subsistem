import type { ScheduleDay, ShiftStatus } from "../types";

/**
 * Mock stand-in for a "my roster" endpoint. No backend, so each week's
 * assignments are generated deterministically from the Monday of that week
 * (same seeded-PRNG scheme as MyDeliveries' mock data) — the same week
 * always renders the same schedule until the driver navigates elsewhere.
 */

const ROUTE_NAMES = ["R101", "R102", "R103", "R104"];
const VEHICLES = [
  { vehicle: "Ford Transit", plate: "AT19 XLR" },
  { vehicle: "Mercedes Sprinter", plate: "AT68 KPX" },
  { vehicle: "Iveco Daily", plate: "AT21 GHB" },
];
const NOTES_POOL = [
  "Cover shift for team leader",
  "Extra stop confirmed by depot",
  "Vehicle swap in the morning",
  "Report to depot 15 min early",
];

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return function next() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return h;
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday-based start of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fetchScheduleForWeek(weekStart: Date): ScheduleDay[] {
  const rand = seededRandom(hashSeed(toISODate(weekStart)));
  const days: ScheduleDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateISO = toISODate(d);

    const roll = rand();
    let status: ShiftStatus = "Working";
    if (roll < 0.12) status = "Day Off";
    else if (roll < 0.16) status = "Holiday";
    else if (roll < 0.19) status = "Sick";

    const isWorking = status === "Working";
    const isTeamLeader = isWorking && rand() < 0.15;
    const route = ROUTE_NAMES[Math.floor(rand() * ROUTE_NAMES.length)];
    const vehicleChoice = VEHICLES[Math.floor(rand() * VEHICLES.length)];
    const hasNotes = isWorking && rand() < 0.2;

    days.push({
      date: dateISO,
      status,
      isTeamLeader,
      route: isWorking ? (isTeamLeader ? "Team Leader" : route) : null,
      vehicle: isWorking ? vehicleChoice.vehicle : null,
      registrationPlate: isWorking ? vehicleChoice.plate : null,
      notes: hasNotes ? NOTES_POOL[Math.floor(rand() * NOTES_POOL.length)] : "",
    });
  }

  return days;
}
