import React from "react";
import type { DayOffItem } from "../mock/mockRequestsData";

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface VendorsOffWeekViewProps {
  weekStart: Date;
  dayOffItems: DayOffItem[];
  getVendorName?: (userId: number) => string;
}

export function VendorsOffWeekView({
  weekStart,
  dayOffItems,
  getVendorName,
}: VendorsOffWeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const itemsByDate = new Map<string, DayOffItem[]>();
  dayOffItems.forEach((item) => {
    const dateKey = String(item.date).split("T")[0];
    const list = itemsByDate.get(dateKey) || [];
    list.push(item);
    itemsByDate.set(dateKey, list);
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="grid grid-cols-7 gap-0 border-b border-slate-200 bg-slate-50">
        {weekDays.map((date, idx) => {
          const dateStr = toDateStr(date);
          const isWeekend = idx >= 5;
          return (
            <div
              key={dateStr}
              className={`px-3 py-2 text-center ${isWeekend ? "bg-slate-100" : ""}`}
            >
              <div className="text-xs font-semibold text-slate-600">{dayNames[idx]}</div>
              <div className="text-sm font-medium text-slate-800">{date.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {weekDays.map((date, idx) => {
          const dateStr = toDateStr(date);
          const items = itemsByDate.get(dateStr) || [];
          const isWeekend = idx >= 5;

          return (
            <div
              key={dateStr}
              className={`border-r border-slate-200 p-2 min-h-[120px] ${isWeekend ? "bg-slate-50" : "bg-white"}`}
            >
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-xs text-slate-400">—</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map((item, i) => (
                    <div
                      key={`${item.userId}-${i}`}
                      className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700 font-medium truncate"
                      title={getVendorName ? getVendorName(item.userId) : `#${item.userId}`}
                    >
                      {getVendorName ? getVendorName(item.userId) : `#${item.userId}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
