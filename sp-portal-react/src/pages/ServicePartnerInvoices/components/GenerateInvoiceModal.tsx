// Ported from the Next.js source's GenerateInvoiceModal.tsx (623 lines). The
// source streamed previews per service partner from a real BFF
// (`fetchServicePartnerInvoices`) with per-id loading/error state; this SPA's
// `previewInvoice` is a synchronous local computation, so the async
// PreviewState/loadedPreviewsRef machinery collapses into a plain memoized
// lookup — same UX (single vs. multi mode, review-and-approve carousel,
// select-all), no network latency to model.
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import {
  generateInvoices,
  getUninvoicedPartners,
  previewInvoice,
  type GenerateResult,
  type Invoice,
} from '../../../data/servicePartnerInvoicesData';
import { formatGbp, formatItemDate, monthYearLabel } from '../utils/format';
import { DeductionsBlock, VatBlock } from './InvoiceBlocks';

interface Props {
  mode: 'single' | 'multi';
  initialMonth: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateInvoiceModal({ mode, initialMonth, onClose, onSuccess }: Props) {
  useModalBehavior(onClose, true);

  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth);
  const [selectedSpId, setSelectedSpId] = useState('');
  const [selectedSpIds, setSelectedSpIds] = useState<Set<number>>(new Set());
  const [approvedSpIds, setApprovedSpIds] = useState<Set<number>>(new Set());
  const [reviewIndex, setReviewIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();
  const done = !!result;

  const changeMonth = (delta: number) => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedSpId('');
    setSelectedSpIds(new Set());
    setApprovedSpIds(new Set());
    setReviewIndex(0);
  };

  const uninvoicedSPs = useMemo(() => getUninvoicedPartners(month, year), [month, year]);

  const toggleSP = (spId: number) => {
    setSelectedSpIds((prev) => {
      const next = new Set(prev);
      if (next.has(spId)) {
        next.delete(spId);
        setApprovedSpIds((approved) => {
          if (!approved.has(spId)) return approved;
          const nextApproved = new Set(approved);
          nextApproved.delete(spId);
          return nextApproved;
        });
      } else {
        next.add(spId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSpIds.size === uninvoicedSPs.length) {
      setSelectedSpIds(new Set());
      setApprovedSpIds(new Set());
    } else {
      setSelectedSpIds(new Set(uninvoicedSPs.map((sp) => sp.servicePartnerId)));
    }
  };

  const toggleApproved = (spId: number) => {
    setApprovedSpIds((prev) => {
      const next = new Set(prev);
      if (next.has(spId)) next.delete(spId);
      else next.add(spId);
      return next;
    });
  };

  const selectedIds = useMemo(
    () =>
      mode === 'single'
        ? selectedSpId
          ? [Number(selectedSpId)]
          : []
        : uninvoicedSPs.filter((sp) => selectedSpIds.has(sp.servicePartnerId)).map((sp) => sp.servicePartnerId),
    [mode, selectedSpId, selectedSpIds, uninvoicedSPs],
  );

  const previews = useMemo(() => {
    const map = new Map<number, Invoice | null>();
    selectedIds.forEach((id) => map.set(id, previewInvoice(id, month, year)));
    return map;
  }, [selectedIds, month, year]);

  const previewRows = useMemo(() => {
    const rows: { key: string; item: Invoice['itens'][number] }[] = [];
    selectedIds.forEach((id) => {
      previews.get(id)?.itens.forEach((item) => rows.push({ key: `${id}-${item.operationId}`, item }));
    });
    return rows;
  }, [selectedIds, previews]);

  const hasUsableSpData = (spId: number | undefined) => {
    if (spId === undefined) return false;
    const data = previews.get(spId);
    if (!data) return false;
    return data.itens.length > 0 || data.deductions.length > 0 || data.amountTotal > 0;
  };

  const safeReviewIndex = Math.min(reviewIndex, Math.max(selectedIds.length - 1, 0));
  const currentSpId: number | undefined = mode === 'multi' ? selectedIds[safeReviewIndex] : undefined;
  const currentSp = uninvoicedSPs.find((sp) => sp.servicePartnerId === currentSpId);
  const currentPreview = currentSpId !== undefined ? previews.get(currentSpId) : undefined;
  const currentApproved = currentSpId !== undefined && approvedSpIds.has(currentSpId);
  const currentUsable = hasUsableSpData(currentSpId);

  const singlePreview = selectedSpId ? previews.get(Number(selectedSpId)) : undefined;

  const canGenerate = !generating && (mode === 'single' ? !!selectedSpId : approvedSpIds.size > 0);

  const handleGenerate = () => {
    setGenerating(true);
    setGenerateError(null);
    setResult(null);
    const ids = mode === 'single' ? [Number(selectedSpId)] : Array.from(approvedSpIds);
    try {
      const res = generateInvoices(ids, month, year);
      setResult(res);
      if (res.created > 0) onSuccess();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  };

  const allSelected = uninvoicedSPs.length > 0 && selectedSpIds.size === uninvoicedSPs.length;

  return createPortal(
    <div className="spi-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`spi-modal ${mode === 'multi' ? 'spi-modal--lg' : 'spi-modal--md'}`} role="dialog" aria-modal="true">
        <div className="spi-modal-header">
          <h2>{mode === 'single' ? 'Generate Invoice' : 'Generate Invoices'}</h2>
          <button type="button" className="spi-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="spi-modal-body spi-generate-body">
          <div className="spi-field">
            <span>Period</span>
            <div className="spi-period-nav">
              <button type="button" className="spi-icon-btn" disabled={done} onClick={() => changeMonth(-1)}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="spi-period-label">{monthYearLabel(month, year)}</span>
              <button type="button" className="spi-icon-btn" disabled={done} onClick={() => changeMonth(1)}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>

          <div className="spi-field">
            <span>{mode === 'single' ? 'Service Partner' : 'Service Partners'}</span>
            {uninvoicedSPs.length === 0 ? (
              <p className="spi-muted-box">All service partners already have an invoice for this period.</p>
            ) : mode === 'single' ? (
              <select value={selectedSpId} onChange={(e) => setSelectedSpId(e.target.value)} disabled={done}>
                <option value="">Select a service partner…</option>
                {uninvoicedSPs.map((sp) => (
                  <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                    {sp.partnerName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="spi-checklist">
                <button type="button" className="spi-checklist-all" onClick={toggleAll} disabled={done}>
                  <i className={allSelected ? 'bi bi-check-square-fill' : 'bi bi-square'} />
                  Select all ({uninvoicedSPs.length})
                </button>
                <div className="spi-checklist-items">
                  {uninvoicedSPs.map((sp) => {
                    const checked = selectedSpIds.has(sp.servicePartnerId);
                    return (
                      <button
                        key={sp.servicePartnerId}
                        type="button"
                        className="spi-checklist-item"
                        disabled={done}
                        onClick={() => toggleSP(sp.servicePartnerId)}
                      >
                        <i className={checked ? 'bi bi-check-square-fill' : 'bi bi-square'} />
                        {sp.partnerName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {!done && mode === 'single' && selectedIds.length > 0 && (
            <div className="spi-generate-preview">
              <div className="spi-field">
                <span>Stops Preview</span>
                {previewRows.length === 0 ? (
                  <p className="spi-muted-box">No billable stops found for this period.</p>
                ) : (
                  <div className="spi-mini-table-card">
                    <div className="spi-table-scroll spi-table-scroll--sm">
                      <table className="spi-table spi-table--mini">
                        <thead>
                          <tr>
                            <th>Route</th>
                            <th>Note</th>
                            <th className="text-end">Stops</th>
                            <th className="text-end">Amount</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row) => (
                            <tr key={row.key}>
                              <td className="fw-semibold">{row.item.routeName || '-'}</td>
                              <td>{row.item.note || '—'}</td>
                              <td className="text-end">{row.item.totalStops}</td>
                              <td className="text-end fw-semibold">{formatGbp(row.item.amount)}</td>
                              <td>{formatItemDate(row.item.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="spi-mini-table-footer">
                      <span>
                        {previewRows.length} stop{previewRows.length !== 1 ? 's' : ''}
                      </span>
                      <span>Subtotal: {formatGbp(singlePreview?.amountTotal ?? 0)}</span>
                    </div>
                  </div>
                )}
              </div>

              {singlePreview && (
                <>
                  <DeductionsBlock
                    deductions={singlePreview.deductions}
                    totalDeductions={singlePreview.totalDeductions}
                    totalReimbursements={singlePreview.totalReimbursements}
                  />
                  <VatBlock amount={singlePreview.totalVat} />
                  <div className="spi-mini-table-footer spi-mini-table-footer--standalone">
                    <span>Net Total</span>
                    <span>{formatGbp(singlePreview.netTotal)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {!done && mode === 'multi' && selectedIds.length > 0 && currentSpId !== undefined && (
            <div className="spi-field">
              <span>Review &amp; Approve</span>
              <div className="spi-review-card">
                <div className="spi-review-head">
                  <div>
                    <h4>{currentSp?.partnerName ?? `Service Partner #${currentSpId}`}</h4>
                    <p className="spi-muted">
                      Service Partner {safeReviewIndex + 1} of {selectedIds.length}
                    </p>
                  </div>
                  <span
                    className={`spi-badge ${
                      currentApproved ? 'spi-badge--green' : !currentUsable ? 'spi-badge--gray' : 'spi-badge--amber'
                    }`}
                  >
                    {currentApproved ? '✓ Approved' : !currentUsable ? 'No Data Available' : 'Pending Approval'}
                  </span>
                </div>

                {!currentPreview || !currentUsable ? (
                  <p className="spi-muted-box">No billable stops or deductions found for this period.</p>
                ) : (
                  <>
                    {currentPreview.itens.length > 0 && (
                      <div className="spi-mini-table-card">
                        <div className="spi-table-scroll spi-table-scroll--sm">
                          <table className="spi-table spi-table--mini">
                            <thead>
                              <tr>
                                <th>Route</th>
                                <th>Note</th>
                                <th className="text-end">Stops</th>
                                <th className="text-end">Amount</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentPreview.itens.map((item) => (
                                <tr key={item.operationId}>
                                  <td className="fw-semibold">{item.routeName || '-'}</td>
                                  <td>{item.note || '—'}</td>
                                  <td className="text-end">{item.totalStops}</td>
                                  <td className="text-end fw-semibold">{formatGbp(item.amount)}</td>
                                  <td>{formatItemDate(item.date)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="spi-mini-table-footer">
                          <span>
                            {currentPreview.itens.length} stop{currentPreview.itens.length !== 1 ? 's' : ''}
                          </span>
                          <span>Subtotal: {formatGbp(currentPreview.amountTotal)}</span>
                        </div>
                      </div>
                    )}

                    <DeductionsBlock
                      deductions={currentPreview.deductions}
                      totalDeductions={currentPreview.totalDeductions}
                      totalReimbursements={currentPreview.totalReimbursements}
                    />
                    <VatBlock amount={currentPreview.totalVat} />
                    <div className="spi-mini-table-footer spi-mini-table-footer--standalone">
                      <span>Net Total</span>
                      <span>{formatGbp(currentPreview.netTotal)}</span>
                    </div>
                  </>
                )}

                <div className="spi-review-footer">
                  <div className="spi-review-nav">
                    <button
                      type="button"
                      className="spi-icon-btn"
                      disabled={safeReviewIndex === 0}
                      onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                    <button
                      type="button"
                      className="spi-icon-btn"
                      disabled={safeReviewIndex === selectedIds.length - 1}
                      onClick={() => setReviewIndex((i) => Math.min(selectedIds.length - 1, i + 1))}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                  <div className="spi-review-approve">
                    <span className="spi-muted">
                      {approvedSpIds.size} of {selectedIds.length} approved
                    </span>
                    {currentApproved ? (
                      <button type="button" className="spi-btn spi-btn--outline-danger spi-btn--sm" onClick={() => toggleApproved(currentSpId)}>
                        Unapprove
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="spi-btn spi-btn--primary spi-btn--sm"
                        disabled={!currentUsable}
                        onClick={() => toggleApproved(currentSpId)}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className={`spi-result-banner ${result.failed > 0 && result.created === 0 ? 'spi-result-banner--error' : result.failed > 0 ? 'spi-result-banner--warn' : 'spi-result-banner--ok'}`}>
              <p className="fw-semibold">
                {result.created} invoice{result.created !== 1 ? 's' : ''} generated
                {result.failed > 0 && `, ${result.failed} failed`}
              </p>
              {result.errors.length > 0 && (
                <ul>
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      SP {e.service_partner_id}: {e.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {generateError && <div className="spi-form-error">{generateError}</div>}
        </div>

        <div className="spi-modal-footer">
          <button type="button" className="spi-btn spi-btn--outline" onClick={onClose}>
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button type="button" className="spi-btn spi-btn--primary" disabled={!canGenerate} onClick={handleGenerate}>
              {generating ? 'Generating…' : mode === 'single' ? 'Generate' : `Generate (${approvedSpIds.size})`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
