import { memo } from 'react';

interface PrePaymentRequestFormProps {
  value: string;
  reason: string;
  notes: string;
  submitting: boolean;
  onChangeValue: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onSubmit: () => void;
}

function PrePaymentRequestFormComponent({
  value,
  reason,
  notes,
  submitting,
  onChangeValue,
  onChangeReason,
  onChangeNotes,
  onSubmit,
}: PrePaymentRequestFormProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
          <i className="bi bi-wallet2 text-lg" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Pre-Payment Request</h3>
          <p className="text-xs text-slate-600">Request an advance payment</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="prePaymentValue" className="text-sm font-medium text-slate-700">
            Amount (£)
          </label>
          <input
            id="prePaymentValue"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="e.g., 100"
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              // Allow only numbers and a decimal point
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                onChangeValue(val);
              }
            }}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
              }
            }}
            className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="prePaymentReason" className="text-sm font-medium text-slate-700">
            Reason
          </label>
          <input
            id="prePaymentReason"
            type="text"
            placeholder="e.g., emergency"
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="prePaymentNotes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="prePaymentNotes"
            placeholder="Details for supervisor/admin…"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
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

export const PrePaymentRequestForm = memo(PrePaymentRequestFormComponent);
