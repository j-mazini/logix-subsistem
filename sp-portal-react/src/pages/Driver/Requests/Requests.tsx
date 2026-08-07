import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverRequests } from '../context/DriverRequestsContext';
import type { SubmitRequestInput } from '../context/DriverRequestsContext';
import { getRequestTypeLabel, type RequestType } from '../data/driverMockData';
import styles from './Requests.module.css';

const REQUEST_TYPES: RequestType[] = ['DayOff', 'HolyDay', 'PrePayment'];

export function DriverRequests() {
  const navigate = useNavigate();
  const { submitRequest } = useDriverRequests();

  const [requestType, setRequestType] = useState<RequestType>('DayOff');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prePaymentValue, setPrePaymentValue] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = reason.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const input: SubmitRequestInput = {
      requestType,
      startDate: requestType === 'DayOff' || requestType === 'HolyDay' ? startDate || null : null,
      endDate: requestType === 'HolyDay' ? endDate || null : null,
      prePaymentValue: requestType === 'PrePayment' ? (prePaymentValue ? Number(prePaymentValue) : null) : null,
      reason: reason.trim(),
      notes: notes.trim(),
    };

    submitRequest(input);
    setSubmitted(true);

    setTimeout(() => {
      navigate('/driver/history');
    }, 700);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>New Request</h1>
        <p>Submit a day off, holiday or pre-payment request.</p>
      </header>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="requestType">Request Type</label>
          <select
            id="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as RequestType)}
          >
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {getRequestTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        {(requestType === 'DayOff' || requestType === 'HolyDay') && (
          <div className={styles.field}>
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        )}

        {requestType === 'HolyDay' && (
          <div className={styles.field}>
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        {requestType === 'PrePayment' && (
          <div className={styles.field}>
            <label htmlFor="prePaymentValue">Amount (£)</label>
            <input
              id="prePaymentValue"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={prePaymentValue}
              onChange={(e) => setPrePaymentValue(e.target.value)}
            />
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="reason">Reason</label>
          <input
            id="reason"
            type="text"
            placeholder="Brief reason for this request"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            placeholder="Any additional details"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={!canSubmit}>
          Submit Request
        </button>

        {submitted && <p className={styles.successMessage}>Request submitted — redirecting to history…</p>}
      </form>
    </div>
  );
}
