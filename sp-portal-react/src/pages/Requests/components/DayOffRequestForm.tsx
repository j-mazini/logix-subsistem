import React from "react";
import { Calendar } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Textarea } from "./ui/Textarea";
import { getTomorrowISODate } from "../utils";

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
    <div className="liquid-glass-surface rounded-2xl overflow-hidden relative group">
      {/* Glass highlight overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
      </div>
      <div className="relative z-10 p-[3%] md:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Day Off Request</h3>
            <p className="text-xs text-slate-600">Request a day off from work</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dayOffStartDate" className="text-sm font-medium text-slate-700">Date</Label>
            <Input
              id="dayOffStartDate"
              type="date"
              min={getTomorrowISODate()}
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dayOffReason" className="text-sm font-medium text-slate-700">Reason</Label>
            <Input
              id="dayOffReason"
              placeholder="e.g., medical appointment"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              className="bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dayOffNotes" className="text-sm font-medium text-slate-700">Notes</Label>
            <Textarea
              id="dayOffNotes"
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

export const DayOffRequestForm = React.memo(DayOffRequestFormComponent);
