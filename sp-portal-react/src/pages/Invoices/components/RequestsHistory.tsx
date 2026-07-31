import React, { useCallback, useMemo } from "react";
import { RefreshCw, Calendar, CalendarDays, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/Table";
import { type VendorRequest } from "@/lib/vendor-requests-api";
import { MonthCarousel } from "./MonthCarousel";

interface RequestsHistoryProps {
  selectedMonth: string;
  onSelectedMonthChange: (value: string) => void;
  loading: boolean;
  onReload: () => void;
  dayOffRequests: VendorRequest[];
  holyDayRequests: VendorRequest[];
  prePaymentRequests: VendorRequest[];
  dayOffCount: number;
  holidayCount: number;
  prePaymentCount: number;
}

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "rejected" || s === "reproved") return "bg-red-100 text-red-800 border-red-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
};

const formatDate = (dateStr: string) => {
  // Parse ISO date string directly to avoid timezone offset issues
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function RequestsHistoryComponent({
  selectedMonth,
  onSelectedMonthChange,
  loading,
  dayOffRequests,
  holyDayRequests,
  prePaymentRequests,
  dayOffCount,
  holidayCount,
  prePaymentCount,
}: RequestsHistoryProps) {
  const monthsCarousel = useMemo(() => {
    const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);
    const selectedDate = new Date(selectedYear, selectedMonthNumber - 1, 1);
    const months: { year: number; month: number; label: string; isSelected: boolean }[] = [];

    for (let i = 6; i >= 1; i--) {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString("en-US", { month: "short" }).replace(".", "").toUpperCase();
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${monthName}/${date.getFullYear()}`,
        isSelected: false,
      });
    }

    const currentMonthName = selectedDate.toLocaleString("en-US", { month: "short" }).replace(".", "").toUpperCase();
    months.push({
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
      label: `${currentMonthName}/${selectedDate.getFullYear()}`,
      isSelected: true,
    });

    for (let i = 1; i <= 6; i++) {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleString("en-US", { month: "short" }).replace(".", "").toUpperCase();
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${monthName}/${date.getFullYear()}`,
        isSelected: false,
      });
    }

    return months;
  }, [selectedMonth]);

  const handleMonthClick = useCallback((year: number, month: number) => {
    onSelectedMonthChange(`${year}-${String(month).padStart(2, "0")}`);
  }, [onSelectedMonthChange]);

  return (
    <div className="space-y-[3%] md:space-y-4">

      <MonthCarousel months={monthsCarousel} onMonthClick={handleMonthClick} />

      {loading ? (
        <div className="rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading requests...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Block: Day Off */}
          <div className="liquid-glass-surface rounded-2xl overflow-hidden relative group">
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 p-[3%] md:p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Day Off Requests</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {dayOffCount}
                </span>
              </div>
              {dayOffRequests.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No Day Off requests in this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="font-semibold text-slate-700">Date</TableHead>
                        <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                        <TableHead className="font-semibold text-slate-700">Notes</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayOffRequests.map((r) => (
                        <TableRow key={r.vendorRequestId} className="border-slate-100">
                          <TableCell className="text-slate-900">
                            {r.startDate ? formatDate(r.startDate) : "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-700" title={r.reason || ""}>
                            {r.reason || "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-700" title={r.notes || ""}>
                            {r.notes || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(r.status)}`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDateTime(r.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Block: Holiday */}
          <div className="liquid-glass-surface rounded-2xl overflow-hidden relative group">
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 p-[3%] md:p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Holiday Requests</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {holidayCount}
                </span>
              </div>
              {holyDayRequests.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No Holiday requests in this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="font-semibold text-slate-700">Start Date</TableHead>
                        <TableHead className="font-semibold text-slate-700">End Date</TableHead>
                        <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                        <TableHead className="font-semibold text-slate-700">Notes</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holyDayRequests.map((r) => (
                        <TableRow key={r.vendorRequestId} className="border-slate-100">
                          <TableCell className="text-slate-900">
                            {r.startDate ? formatDate(r.startDate) : "-"}
                          </TableCell>
                          <TableCell className="text-slate-900">
                            {r.endDate ? formatDate(r.endDate) : "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-700" title={r.reason || ""}>
                            {r.reason || "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-700" title={r.notes || ""}>
                            {r.notes || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(r.status)}`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDateTime(r.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Block: Pre-Payments */}
          <div className="liquid-glass-surface rounded-2xl overflow-hidden relative group">
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 p-[3%] md:p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Pre-Payment Requests</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {prePaymentCount}
                </span>
              </div>
              {prePaymentRequests.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No Pre-Payment requests in this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                        <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                        <TableHead className="font-semibold text-slate-700">Notes</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prePaymentRequests.map((r) => (
                        <TableRow key={r.vendorRequestId} className="border-slate-100">
                          <TableCell className="font-medium text-slate-900">
                            {r.prePaymentValue ? `£${Number(r.prePaymentValue).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-700" title={r.reason || ""}>
                            {r.reason || "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-700" title={r.notes || ""}>
                            {r.notes || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(r.status)}`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDateTime(r.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const RequestsHistory = React.memo(RequestsHistoryComponent);
