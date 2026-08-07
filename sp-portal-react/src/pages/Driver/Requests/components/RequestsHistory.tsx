import { memo, useCallback, useMemo } from 'react';
import { MonthCarousel } from '../MonthCarousel';
import { formatDate, formatDateTime, getStatusClass, type DriverRequest } from '../../data/driverMockData';

interface RequestsHistoryProps {
  selectedMonth: string;
  onSelectedMonthChange: (value: string) => void;
  dayOffRequests: DriverRequest[];
  holyDayRequests: DriverRequest[];
  prePaymentRequests: DriverRequest[];
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[getStatusClass(status)];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="py-8 text-center text-xs text-slate-500">No {label} requests in this month.</div>;
}

function RequestsHistoryComponent({
  selectedMonth,
  onSelectedMonthChange,
  dayOffRequests,
  holyDayRequests,
  prePaymentRequests,
}: RequestsHistoryProps) {
  const monthsCarousel = useMemo(() => {
    const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(selectedYear, selectedMonthNumber - 1, 1);
    const months: { year: number; month: number; label: string; isSelected: boolean }[] = [];

    for (let i = 6; i >= 1; i--) {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
      months.push({ year: date.getFullYear(), month: date.getMonth() + 1, label: `${monthName}/${date.getFullYear()}`, isSelected: false });
    }

    const currentMonthName = selectedDate.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
    months.push({
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
      label: `${currentMonthName}/${selectedDate.getFullYear()}`,
      isSelected: true,
    });

    for (let i = 1; i <= 6; i++) {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
      months.push({ year: date.getFullYear(), month: date.getMonth() + 1, label: `${monthName}/${date.getFullYear()}`, isSelected: false });
    }

    return months;
  }, [selectedMonth]);

  const handleMonthClick = useCallback(
    (year: number, month: number) => {
      onSelectedMonthChange(`${year}-${String(month).padStart(2, '0')}`);
    },
    [onSelectedMonthChange],
  );

  return (
    <div className="space-y-4">
      <MonthCarousel months={monthsCarousel} onMonthClick={handleMonthClick} />

      {/* Day Off */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <i className="bi bi-calendar3 text-lg" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Day Off Requests</h3>
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            {dayOffRequests.length}
          </span>
        </div>
        {dayOffRequests.length === 0 ? (
          <EmptyRow label="Day Off" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Date</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Reason</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Notes</th>
                  <th className="whitespace-nowrap py-2 pr-3 text-center font-semibold text-slate-700">Status</th>
                  <th className="whitespace-nowrap py-2 font-semibold text-slate-700">Created At</th>
                </tr>
              </thead>
              <tbody>
                {dayOffRequests.map((r) => (
                  <tr key={r.vendorRequestId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-900">{formatDate(r.startDate)}</td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-slate-700" title={r.reason || ''}>
                      {r.reason || '-'}
                    </td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-slate-700" title={r.notes || ''}>
                      {r.notes || '-'}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap py-2 text-xs text-slate-600">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Holiday */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <i className="bi bi-calendar2-week text-lg" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Holiday Requests</h3>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {holyDayRequests.length}
          </span>
        </div>
        {holyDayRequests.length === 0 ? (
          <EmptyRow label="Holiday" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Start Date</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">End Date</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Reason</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Notes</th>
                  <th className="whitespace-nowrap py-2 pr-3 text-center font-semibold text-slate-700">Status</th>
                  <th className="whitespace-nowrap py-2 font-semibold text-slate-700">Created At</th>
                </tr>
              </thead>
              <tbody>
                {holyDayRequests.map((r) => (
                  <tr key={r.vendorRequestId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-900">{formatDate(r.startDate)}</td>
                    <td className="py-2 pr-3 text-slate-900">{formatDate(r.endDate)}</td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-slate-700" title={r.reason || ''}>
                      {r.reason || '-'}
                    </td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-slate-700" title={r.notes || ''}>
                      {r.notes || '-'}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap py-2 text-xs text-slate-600">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pre-Payment */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <i className="bi bi-wallet2 text-lg" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Pre-Payment Requests</h3>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {prePaymentRequests.length}
          </span>
        </div>
        {prePaymentRequests.length === 0 ? (
          <EmptyRow label="Pre-Payment" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Amount</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Reason</th>
                  <th className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">Notes</th>
                  <th className="whitespace-nowrap py-2 pr-3 text-center font-semibold text-slate-700">Status</th>
                  <th className="whitespace-nowrap py-2 font-semibold text-slate-700">Created At</th>
                </tr>
              </thead>
              <tbody>
                {prePaymentRequests.map((r) => (
                  <tr key={r.vendorRequestId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-900">
                      {r.prePaymentValue != null ? `£${Number(r.prePaymentValue).toFixed(2)}` : '-'}
                    </td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-slate-700" title={r.reason || ''}>
                      {r.reason || '-'}
                    </td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-slate-700" title={r.notes || ''}>
                      {r.notes || '-'}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap py-2 text-xs text-slate-600">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export const RequestsHistory = memo(RequestsHistoryComponent);
