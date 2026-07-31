import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Alert, AlertDescription } from "./ui/Alert";
import { fetchAllDayOffItems, type DayOffItem } from "../mock/mockRequestsData";
import { VendorsOffWeekView } from "./VendorsOffWeekView";

interface VendorsOffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getVendorName?: (userId: number) => string;
}

export function VendorsOffModal({
  open,
  onOpenChange,
  getVendorName,
}: VendorsOffModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [allDayOffItems, setAllDayOffItems] = useState<DayOffItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date();
      setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [open]);

  const monthLabel = useMemo(
    () => selectedMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
    [selectedMonth]
  );

  const getWeeksOfMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weeks: Date[] = [];
    let currentDate = new Date(firstDay);

    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    currentDate = new Date(currentDate.setDate(diff));

    while (currentDate <= lastDay) {
      weeks.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
  }, []);

  const weeks = useMemo(() => getWeeksOfMonth(selectedMonth), [selectedMonth, getWeeksOfMonth]);

  const loadDayOffData = useCallback(async () => {
    if (weeks.length === 0) return;

    const firstDay = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    const lastDay = new Date(lastWeek);
    lastDay.setDate(lastDay.getDate() + 6);

    const startDate = firstDay.toISOString().split("T")[0];
    const endDate = lastDay.toISOString().split("T")[0];

    setLoading(true);
    try {
      const items = await fetchAllDayOffItems(startDate, endDate);
      setAllDayOffItems(items);
    } catch {
      setAllDayOffItems([]);
    } finally {
      setLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    if (open && weeks.length > 0) {
      void loadDayOffData();
    }
  }, [open, weeks, loadDayOffData]);

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Vendors Off</DialogTitle>
          <DialogDescription>
            View all vendors/operators with time off, organized by week and month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button type="button" onClick={handlePrevMonth} variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <h2 className="text-lg font-semibold text-slate-900 min-w-fit">{monthLabel}</h2>

            <Button type="button" onClick={handleNextMonth} variant="outline" size="sm">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading day-off data...</span>
            </div>
          )}

          {!loading && allDayOffItems.length === 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                No vendors with time off found for this month.
              </AlertDescription>
            </Alert>
          )}

          {!loading && (
            <div className="space-y-6">
              {weeks.map((weekStart, idx) => {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const weekDateStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const endDateStr = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                const weekItems = allDayOffItems.filter((item) => {
                  const itemDate = new Date(item.date);
                  const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                  const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
                  const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
                  return itemDateOnly >= weekStartOnly && itemDateOnly <= weekEndOnly;
                });

                return (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Week {idx + 1}: {weekDateStr} – {endDateStr}
                    </h3>
                    {weekItems.length > 0 && (
                      <VendorsOffWeekView weekStart={weekStart} dayOffItems={weekItems} getVendorName={getVendorName} />
                    )}
                    {weekItems.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-4">No vendors off this week</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
