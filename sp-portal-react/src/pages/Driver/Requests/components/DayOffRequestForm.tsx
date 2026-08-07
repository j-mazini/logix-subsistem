import { memo } from 'react';
import { getTomorrowISODate } from '../utils';

interface DayOffRequestFormProps {
  date: string;
  reason: string;
  notes: string;
  submitting: boolean;
  onChangeDate: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onSubmit: () => void;
}

function DayOffRequestFormComponent({
  date,
  reason,
  notes,
  submitting,
  onChangeDate,
  onChangeReason,
  onChangeNotes,
  onSubmit,
}: DayOffRequestFormProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
          <i className="bi bi-calendar3 text-lg" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Day Off Request</h3>
          <p className="text-xs text-slate-600">Request a day off from work</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="dayOffStartDate" className="text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="dayOffStartDate"
            type="date"
            min={getTomorrowISODate()}
            value={date}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="dayOffReason" className="text-sm font-medium text-slate-700">
            Reason
          </label>
          <input
            id="dayOffReason"
            type="text"
            placeholder="e.g., medical appointment"
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="dayOffNotes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="dayOffNotes"
            placeholder="Details for supervisor/admin…"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
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

export const DayOffRequestForm = memo(DayOffRequestFormComponent);
