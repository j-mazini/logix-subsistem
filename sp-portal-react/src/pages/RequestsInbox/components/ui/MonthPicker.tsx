import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  date: Date;
  setDate: (date: Date) => void;
}

/** Simplified stand-in for the Next.js app's shadcn/Popover-based `MonthPicker` — prev/next + label, no calendar popover. */
export function MonthPicker({ date, setDate }: MonthPickerProps) {
  const label = date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const shift = (delta: number) => {
    setDate(new Date(date.getFullYear(), date.getMonth() + delta, 1));
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1 shadow-sm">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[9rem] px-2 text-center text-sm font-semibold text-slate-800">{label}</span>
      <button
        type="button"
        onClick={() => shift(1)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default MonthPicker;
