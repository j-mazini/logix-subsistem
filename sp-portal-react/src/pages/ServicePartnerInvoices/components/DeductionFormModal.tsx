// Ported from the Next.js source's DeductionFormModal.tsx. The `SearchableSelect`
// dependency doesn't exist in this repo (no equivalent component ported yet),
// so the service-partner picker is a plain `<select>` — same options/values,
// just without fuzzy search. "Daily ServiceCharge" quantity is computed from
// the local mock invoice preview instead of a `useServicePartnerInvoicesTable`
// query.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import {
  createDeduction,
  getServicePartners,
  previewInvoice,
  updateDeduction,
  type Deduction,
} from '../../../data/servicePartnerInvoicesData';
import { formatDeductionReference, formatGbp } from '../utils/format';

interface Props {
  deduction: Deduction | null;
  deductions: Deduction[];
  defaultServicePartnerId?: number;
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

type AmountType = 'deduction' | 'reimbursement' | 'daily-service-charge';

function normalizeDateToYYYYMMDD(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export function DeductionFormModal({ deduction, deductions, defaultServicePartnerId, month, year, onClose, onSuccess }: Props) {
  useModalBehavior(onClose, true);
  const isEdit = !!deduction;
  const servicePartners = getServicePartners();

  const [selectedSpId, setSelectedSpId] = useState('');
  const [amountType, setAmountType] = useState<AmountType>('deduction');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [reimbursementsAmount, setReimbursementsAmount] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nextDeductionId = useMemo(() => {
    const maxId = deductions.reduce((max, item) => Math.max(max, item.service_partner_deduction_id || 0), 0);
    return maxId + 1;
  }, [deductions]);

  const deductionAmountValue = Number.parseFloat(deductionAmount);
  const reimbursementAmountValue = Number.parseFloat(reimbursementsAmount);
  const selectedAmountValue = amountType === 'deduction' ? deductionAmountValue : reimbursementAmountValue;

  const isDailyServiceCharge = amountType === 'daily-service-charge';
  const selectedSp = useMemo(
    () => servicePartners.find((sp) => String(sp.servicePartnerId) === selectedSpId) ?? null,
    [servicePartners, selectedSpId],
  );

  const dailyServiceChargeQuantity = useMemo(() => {
    if (!isDailyServiceCharge || !selectedSp) return 0;
    const preview = previewInvoice(selectedSp.servicePartnerId, month, year);
    return preview?.itens.reduce((s, item) => s + item.totalStops, 0) ?? 0;
  }, [isDailyServiceCharge, selectedSp, month, year]);

  const dailyServiceChargeRate = selectedSp?.dailyServiceCharge || 0;
  const congestionReimbursementRate = selectedSp?.reimbursement || 0;
  const dailyServiceChargeAmount = dailyServiceChargeQuantity * dailyServiceChargeRate;
  const congestionReimbursementAmount = dailyServiceChargeQuantity * congestionReimbursementRate;
  const dailyServiceChargeDescription = `Daily ServiceCharge - ${dailyServiceChargeQuantity} x £${dailyServiceChargeRate}`;
  const congestionReimbursementDescription = `Congestion Charge Reimbursement - ${dailyServiceChargeQuantity} x £${congestionReimbursementRate}`;

  const generatedReferenceNumber = useMemo(() => {
    if (isEdit) return referenceNumber;
    return formatDeductionReference({ service_partner_deduction_id: nextDeductionId });
  }, [isEdit, referenceNumber, nextDeductionId]);

  useEffect(() => {
    setError(null);
    if (deduction) {
      setSelectedSpId(String(deduction.service_partner_id));
      setAmountType((deduction.reimbursements_amount || 0) > 0 ? 'reimbursement' : 'deduction');
      setReferenceNumber(deduction.reference_number ?? '');
      setDescription(deduction.description ?? '');
      setDeductionAmount(String(deduction.deduction_amount ?? ''));
      setReimbursementsAmount(String(deduction.reimbursements_amount ?? ''));
      setIncidentDate(normalizeDateToYYYYMMDD(deduction.incident_date));
      setEntryDate(normalizeDateToYYYYMMDD(deduction.entry_date));
    } else {
      setSelectedSpId(defaultServicePartnerId ? String(defaultServicePartnerId) : '');
      setAmountType('deduction');
      setDescription('');
      setDeductionAmount('');
      setReimbursementsAmount('');
      setIncidentDate('');
      setEntryDate(new Date().toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deduction, defaultServicePartnerId]);

  useEffect(() => {
    if (!isEdit) setReferenceNumber(generatedReferenceNumber);
  }, [isEdit, generatedReferenceNumber]);

  const canSave = isDailyServiceCharge
    ? !!selectedSp && dailyServiceChargeQuantity > 0 && dailyServiceChargeRate > 0
    : !!selectedSpId && !Number.isNaN(selectedAmountValue) && selectedAmountValue > 0;

  const handleSave = () => {
    setError(null);
    try {
      if (isDailyServiceCharge && !isEdit) {
        if (!selectedSp) throw new Error('Select a service partner');
        if (dailyServiceChargeQuantity <= 0) {
          throw new Error('No operations found for this service partner in the selected period');
        }

        createDeduction({
          reference_number: formatDeductionReference({ service_partner_deduction_id: nextDeductionId }),
          description: dailyServiceChargeDescription,
          deduction_amount: dailyServiceChargeAmount,
          reimbursements_amount: 0,
          incident_date: incidentDate || null,
          entry_date: entryDate || null,
          company_id: selectedSp.companyId,
          service_partner_id: selectedSp.servicePartnerId,
        });
        createDeduction({
          reference_number: formatDeductionReference({ service_partner_deduction_id: nextDeductionId + 1 }),
          description: congestionReimbursementDescription,
          deduction_amount: 0,
          reimbursements_amount: congestionReimbursementAmount,
          incident_date: incidentDate || null,
          entry_date: entryDate || null,
          company_id: selectedSp.companyId,
          service_partner_id: selectedSp.servicePartnerId,
        });

        onSuccess();
        onClose();
        return;
      }

      if (Number.isNaN(selectedAmountValue) || selectedAmountValue <= 0) {
        throw new Error('Enter an amount greater than zero');
      }

      const payloadDeductionAmount = amountType === 'deduction' ? selectedAmountValue : 0;
      const payloadReimbursementAmount = amountType === 'reimbursement' ? selectedAmountValue : 0;

      if (isEdit && deduction) {
        updateDeduction(deduction.service_partner_deduction_id, {
          reference_number: referenceNumber.trim() || deduction.reference_number,
          description: description.trim() || undefined,
          deduction_amount: payloadDeductionAmount,
          reimbursements_amount: payloadReimbursementAmount,
          incident_date: incidentDate || null,
          entry_date: entryDate || null,
        });
      } else {
        const sp = servicePartners.find((s) => String(s.servicePartnerId) === selectedSpId);
        if (!sp) throw new Error('Select a service partner');
        createDeduction({
          reference_number: generatedReferenceNumber,
          description: description.trim() || '',
          deduction_amount: payloadDeductionAmount,
          reimbursements_amount: payloadReimbursementAmount,
          incident_date: incidentDate || null,
          entry_date: entryDate || null,
          company_id: sp.companyId,
          service_partner_id: sp.servicePartnerId,
        });
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save deduction');
    }
  };

  return createPortal(
    <div className="spi-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="spi-modal spi-modal--form" role="dialog" aria-modal="true">
        <div className="spi-modal-header">
          <h2>{isEdit ? 'Edit Deduction' : 'Add Deduction'}</h2>
          <button type="button" className="spi-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="spi-modal-body spi-form-grid">
          <label className="spi-field">
            <span>Service Partner</span>
            <select value={selectedSpId} onChange={(e) => setSelectedSpId(e.target.value)} disabled={isEdit}>
              <option value="">Select a service partner…</option>
              {servicePartners.map((sp) => (
                <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                  {sp.partnerName}
                </option>
              ))}
            </select>
          </label>

          <div className="spi-field">
            <span>Amount Type</span>
            <div className={`spi-segmented ${isEdit ? 'spi-segmented--2' : 'spi-segmented--3'}`}>
              <button
                type="button"
                className={`spi-segmented-btn ${amountType === 'deduction' ? 'spi-segmented-btn--active-blue' : ''}`}
                onClick={() => setAmountType('deduction')}
              >
                Deduction
              </button>
              <button
                type="button"
                className={`spi-segmented-btn ${amountType === 'reimbursement' ? 'spi-segmented-btn--active-green' : ''}`}
                onClick={() => setAmountType('reimbursement')}
              >
                Reimbursement
              </button>
              {!isEdit && (
                <button
                  type="button"
                  className={`spi-segmented-btn ${amountType === 'daily-service-charge' ? 'spi-segmented-btn--active-purple' : ''}`}
                  onClick={() => setAmountType('daily-service-charge')}
                >
                  Daily ServiceCharge
                </button>
              )}
            </div>
          </div>

          {isDailyServiceCharge ? (
            <div className="spi-dsc-box">
              {!selectedSp ? (
                <p className="spi-muted">Select a service partner to calculate this charge.</p>
              ) : dailyServiceChargeQuantity === 0 ? (
                <p className="spi-warning-text">No operations found for {selectedSp.partnerName} in the selected period.</p>
              ) : (
                <>
                  <div className="spi-dsc-row">
                    <span>Daily ServiceCharge</span>
                    <span className="fw-semibold">
                      {dailyServiceChargeDescription} = {formatGbp(dailyServiceChargeAmount)}
                    </span>
                  </div>
                  <div className="spi-dsc-row">
                    <span>Congestion Charge Reimbursement (auto)</span>
                    <span className="fw-semibold spi-text-green">
                      {congestionReimbursementDescription} = {formatGbp(congestionReimbursementAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : amountType === 'deduction' ? (
            <label className="spi-field">
              <span>Deduction Amount</span>
              <input type="number" step="0.01" min="0" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} placeholder="0.00" />
            </label>
          ) : (
            <label className="spi-field">
              <span>Reimbursement Amount</span>
              <input type="number" step="0.01" min="0" value={reimbursementsAmount} onChange={(e) => setReimbursementsAmount(e.target.value)} placeholder="0.00" />
            </label>
          )}

          {!isDailyServiceCharge && (
            <label className="spi-field">
              <span>Reference Number</span>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} readOnly={!isEdit} disabled={!isEdit} />
            </label>
          )}

          {!isDailyServiceCharge && (
            <label className="spi-field">
              <span>Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </label>
          )}

          <div className="spi-form-row-2">
            <label className="spi-field">
              <span>Incident Date</span>
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </label>
            <label className="spi-field">
              <span>Entry Date</span>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </label>
          </div>

          {error && <div className="spi-form-error">{error}</div>}
        </div>

        <div className="spi-modal-footer">
          <button type="button" className="spi-btn spi-btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`spi-btn ${isDailyServiceCharge ? 'spi-btn--purple' : amountType === 'deduction' ? 'spi-btn--primary' : 'spi-btn--green'}`}
            disabled={!canSave}
            onClick={handleSave}
          >
            {isEdit
              ? 'Save Changes'
              : isDailyServiceCharge
                ? 'Add Daily ServiceCharge + Reimbursement'
                : amountType === 'deduction'
                  ? 'Add Deduction'
                  : 'Add Reimbursement'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
