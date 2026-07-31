import type { ShiftStatus } from "./types";

export const STATUS_DOT_CLASS: Record<ShiftStatus, string> = {
  Working: "bg-emerald-500",
  "Day Off": "bg-slate-400",
  Holiday: "bg-sky-500",
  Sick: "bg-rose-500",
};

export const STATUS_ICON: Record<ShiftStatus, string> = {
  Working: "bi-truck",
  "Day Off": "bi-cup-hot",
  Holiday: "bi-airplane",
  Sick: "bi-bandaid",
};
