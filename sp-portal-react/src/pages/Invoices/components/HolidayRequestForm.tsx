import React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Textarea } from "./ui/Textarea";

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
    <div className="liquid-glass-surface rounded-2xl overflow-hidden relative group">
      {/* Glass highlight overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
      </div>
      <div className="relative z-10 p-[3%] md:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Holiday Request</h3>
            <p className="text-xs text-slate-600">Request a holiday period</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="holidayStartDate" className="text-sm font-medium text-slate-700">Start Date</Label>
              <Input
                id="holidayStartDate"
                type="date"
                value={startDate}
                onChange={(e) => onChangeStartDate(e.target.value)}
                className="bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="holidayEndDate" className="text-sm font-medium text-slate-700">End Date</Label>
              <Input
                id="holidayEndDate"
                type="date"
                value={endDate}
                onChange={(e) => onChangeEndDate(e.target.value)}
                className="bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="holidayReason" className="text-sm font-medium text-slate-700">Reason</Label>
            <Input
              id="holidayReason"
              placeholder="e.g., annual leave"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              className="bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="holidayNotes" className="text-sm font-medium text-slate-700">Notes</Label>
            <Textarea
              id="holidayNotes"
              placeholder="Details for supervisor/admin…"
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              rows={3}
              className="bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 resize-none"
            />
          </div>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full md:w-auto min-w-[160px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const HolidayRequestForm = React.memo(HolidayRequestFormComponent);
