import { memo } from 'react';

interface HolidayRequestFormProps {
  startDate: string;
  endDate: string;
  reason: string;
  notes: string;
  submitting: boolean;
  onChangeStartDate: (value: string) => void;
  onChangeEndDate: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onSubmit: () => void;
}

function HolidayRequestFormComponent({
  startDate,
  endDate,
  reason,
  notes,
  submitting,
  onChangeStartDate,
  onChangeEndDate,
  onChangeReason,
  onChangeNotes,
  onSubmit,
}: HolidayRequestFormProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
          <i className="bi bi-calendar2-week text-lg" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Holiday Request</h3>
          <p className="text-xs text-slate-600">Request a holiday period</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="holidayStartDate" className="text-sm font-medium text-slate-700">
              Start Date
            </label>
            <input
              id="holidayStartDate"
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="holidayEndDate" className="text-sm font-medium text-slate-700">
              End Date
            </label>
            <input
              id="holidayEndDate"
              type="date"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="holidayReason" className="text-sm font-medium text-slate-700">
            Reason
          </label>
          <input
            id="holidayReason"
            type="text"
            placeholder="e.g., annual leave"
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="holidayNotes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="holidayNotes"
            placeholder="Details for supervisor/admin…"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50 md:w-auto md:min-w-[160px]"
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}

export const HolidayRequestForm = memo(HolidayRequestFormComponent);
