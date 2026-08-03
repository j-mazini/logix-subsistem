import React, { useState } from 'react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

export interface StaffOption {
  id: number;
  name: string;
}
export interface ManagementFunctionOption {
  id: number;
  title: string;
}

interface AddManagementSupportModalProps {
  onClose: () => void;
  onSave: (data: { userId: number; functionId: number; dates: string[]; notes: string }) => void;
  staff: StaffOption[];
  functions: ManagementFunctionOption[];
  weekDates: Date[];
  currentDay: Date;
}

function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isWeekendDate(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Add Management & Support — ported from Next.js week-planner's Modals/ManagementSupportModal.tsx, simplified for mock/in-memory data. */
const AddManagementSupportModal: React.FC<AddManagementSupportModalProps> = ({ onClose, onSave, staff, functions, weekDates, currentDay }) => {
  const [userId, setUserId] = useState('');
  const [functionId, setFunctionId] = useState(() => (functions[0] ? String(functions[0].id) : ''));
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => new Set([formatISO(currentDay)]));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useModalBehavior(onClose);

  const allDayValues = weekDates.map(formatISO);
  const allSelected = allDayValues.length > 0 && allDayValues.every((d) => selectedDays.has(d));

  function toggleDay(dateISO: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateISO)) next.delete(dateISO);
      else next.add(dateISO);
      return next;
    });
  }

  function toggleAll() {
    setSelectedDays(allSelected ? new Set() : new Set(allDayValues));
  }

  function handleSave() {
    setError('');
    if (!userId) {
      setError('Select a staff member.');
      return;
    }
    if (!functionId) {
      setError('Select a function.');
      return;
    }
    if (selectedDays.size === 0) {
      setError('Select at least one day.');
      return;
    }
    try {
      onSave({ userId: Number(userId), functionId: Number(functionId), dates: Array.from(selectedDays).sort(), notes: notes.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add management & support assignment. Please try again.');
    }
  }

  return (
    <div className="wp-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="addManagementModalTitle">
      <div className="wp-modal-header">
        <h2 className="wp-modal-title" id="addManagementModalTitle">
          <i className="bi bi-person-badge me-2" />
          Add Management &amp; Support
        </h2>
        <button type="button" className="dom-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="wp-modal-body">
        <div className="dom-form-grid">
          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="managementStaff">
              Staff Member
            </label>
            <select id="managementStaff" className="form-select" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={staff.length === 0}>
              <option value="">{staff.length === 0 ? 'No staff available' : 'Select a staff member'}</option>
              {staff.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="managementFunction">
              Function
            </label>
            <select
              id="managementFunction"
              className="form-select"
              value={functionId}
              onChange={(e) => setFunctionId(e.target.value)}
              disabled={functions.length === 0}
            >
              {functions.length === 0 && <option value="">No functions configured</option>}
              {functions.map((f) => (
                <option value={f.id} key={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="managementNotes">
              Notes
            </label>
            <textarea id="managementNotes" rows={2} placeholder="Optional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="wp-adhoc-days">
          <div className="wp-adhoc-days-header">
            <label className="dom-form-label">Select Days</label>
            <label className="wp-types-checkbox-label wp-adhoc-select-all">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Select all
            </label>
          </div>
          <div className="wp-adhoc-day-grid">
            {weekDates.map((date) => {
              const dateISO = formatISO(date);
              const isSelected = selectedDays.has(dateISO);
              return (
                <label
                  key={dateISO}
                  className={`wp-adhoc-day-chip${isSelected ? ' is-selected' : ''}${isWeekendDate(date) ? ' is-weekend' : ''}`}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggleDay(dateISO)} />
                  <span className="wp-adhoc-day-name">{date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</span>
                  <span className="wp-adhoc-day-date">
                    {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedDays.size > 0 && (
            <p className="wp-adhoc-days-count">
              {selectedDays.size} day{selectedDays.size === 1 ? '' : 's'} selected
            </p>
          )}
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
        <button type="button" className="styled-button styled-button--primary" onClick={handleSave} disabled={staff.length === 0 || functions.length === 0}>
          Add
        </button>
      </div>
    </div>
  );
};

export default AddManagementSupportModal;
