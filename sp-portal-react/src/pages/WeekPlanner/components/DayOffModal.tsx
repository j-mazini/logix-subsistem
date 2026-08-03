import React, { useEffect, useMemo, useState } from 'react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

export interface DayOffEntry {
  id: string;
  userId: number;
  date: string;
  reason: string;
  notes: string;
}

export interface DayOffVendor {
  id: number;
  name: string;
}

interface DayOffModalProps {
  onClose: () => void;
  onSave: (data: { userId: number; dates: string[]; reason: string; notes: string }) => void;
  vendors: DayOffVendor[];
  currentDate: Date;
}

function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return dates;
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(formatISO(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Register Day Off — ported from Next.js week-planner's DayOffModal.tsx (mock/no-backend). */
const DayOffModal: React.FC<DayOffModalProps> = ({ onClose, onSave, vendors, currentDate }) => {
  const tomorrow = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t;
  }, []);
  const tomorrowStr = formatISO(tomorrow);

  const [userId, setUserId] = useState('');
  const [mode, setMode] = useState<'single' | 'period'>('single');
  const [startDate, setStartDate] = useState(() => {
    const weekStart = getWeekStart(currentDate);
    return weekStart >= tomorrow ? formatISO(weekStart) : tomorrowStr;
  });
  const [endDate, setEndDate] = useState(startDate);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useModalBehavior(onClose);

  useEffect(() => {
    if (mode === 'single') {
      setEndDate(startDate);
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    setEndDate(formatISO(end));
  }, [mode, startDate]);

  const sortedVendors = useMemo(
    () => [...vendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [vendors],
  );

  function handleSave() {
    setError('');
    if (!userId) {
      setError('Select a vendor to register the day off.');
      return;
    }
    if (!startDate) {
      setError('Select the start date of the day off.');
      return;
    }
    const dates = mode === 'single' ? [startDate] : expandDateRange(startDate, endDate);
    if (dates.length === 0) {
      setError('The specified period is invalid.');
      return;
    }
    if (dates.some((d) => d < tomorrowStr)) {
      setError('Day off cannot be created for today or past dates. Only dates from tomorrow onwards are allowed.');
      return;
    }
    try {
      onSave({ userId: Number(userId), dates, reason: reason.trim(), notes: notes.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register day off. Please try again.');
    }
  }

  return (
    <div className="wp-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="dayOffModalTitle">
      <div className="wp-modal-header">
        <h2 className="wp-modal-title" id="dayOffModalTitle">
          <i className="bi bi-person-x me-2" />
          Register Day Off
        </h2>
        <button type="button" className="dom-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="wp-modal-body">
        <p className="wp-modal-meta">Register a day off for a vendor. Choose a single day or a period.</p>

        <div className="dom-form-grid">
          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="dayOffVendor">
              Vendor
            </label>
            <select
              id="dayOffVendor"
              className="form-select"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={sortedVendors.length === 0}
            >
              <option value="">{sortedVendors.length === 0 ? 'No vendors available' : 'Select a vendor'}</option>
              {sortedVendors.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="dom-form-field span-2">
            <label className="dom-form-label">Day Off Mode</label>
            <div className="wp-mode-toggle">
              <button
                type="button"
                className={`styled-button ${mode === 'single' ? 'styled-button--primary' : 'styled-button--outline'}`}
                onClick={() => setMode('single')}
              >
                Single Day
              </button>
              <button
                type="button"
                className={`styled-button ${mode === 'period' ? 'styled-button--primary' : 'styled-button--outline'}`}
                onClick={() => setMode('period')}
              >
                Period
              </button>
            </div>
          </div>

          <div className="dom-form-field">
            <label className="dom-form-label" htmlFor="dayOffStart">
              Start Date (from tomorrow)
            </label>
            <input id="dayOffStart" type="date" value={startDate} min={tomorrowStr} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="dom-form-field" style={mode === 'single' ? { opacity: 0.5 } : undefined}>
            <label className="dom-form-label" htmlFor="dayOffEnd">
              End Date
            </label>
            <input
              id="dayOffEnd"
              type="date"
              value={endDate}
              min={startDate}
              disabled={mode === 'single'}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="dom-form-field">
            <label className="dom-form-label" htmlFor="dayOffReason">
              Reason
            </label>
            <input
              id="dayOffReason"
              type="text"
              placeholder="e.g. Sick leave, Holiday"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="dayOffNotes">
              Notes
            </label>
            <textarea
              id="dayOffNotes"
              rows={3}
              placeholder="Additional context (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="wp-form-error">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </div>
        )}
      </div>
      <div className="dom-form-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="styled-button styled-button--danger" onClick={handleSave} disabled={sortedVendors.length === 0}>
          Save Day Off
        </button>
      </div>
    </div>
  );
};

export default DayOffModal;
