export type ShiftStatus = "Working" | "Day Off" | "Holiday" | "Sick";

export interface ScheduleDay {
  /** ISO yyyy-MM-dd */
  date: string;
  status: ShiftStatus;
  isTeamLeader: boolean;
  route: string | null;
  vehicle: string | null;
  registrationPlate: string | null;
  notes: string;
}

export type ScheduleViewMode = "day" | "week";
