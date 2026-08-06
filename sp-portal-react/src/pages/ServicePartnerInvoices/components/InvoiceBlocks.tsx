// Consolidates the Next.js source's InvoiceSummaryStats, PartnerInvoiceBlock,
// DeductionsBlock, VatBlock and GrandTotalBar (5 small presentation
// components) into one file, following this repo's single-file-per-concern
// convention (see FinancialInvoices.tsx). Rendered logic and markup are
// ported 1:1, Tailwind classes swapped for the page's plain `spi-` CSS.
import type { Deduction, InvoiceItem } from '../../../data/servicePartnerInvoicesData';
import { formatDeductionReference, formatGbp, formatItemDate } from '../utils/format';

export interface StatCard {
  label: string;
  value: string;
  positive?: boolean;
}

export function InvoiceSummaryStats({ cards }: { cards: StatCard[] }) {
  return (
    <div className="spi-stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="spi-stat-card">
          <p className="spi-stat-label">{card.label}</p>
          <p className={`spi-stat-value${card.positive ? ' spi-stat-value--positive' : ''}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PartnerInvoiceBlock({
  partnerName,
  issuerLabel,
  items,
  subtotal,
}: {
  partnerName: string;
  issuerLabel: string;
  items: InvoiceItem[];
  subtotal: number;
}) {
  return (
    <div className="spi-block">
      <div className="spi-block-header">
        <span className="spi-block-title">{partnerName}</span>
        <span className="spi-block-subtitle">{issuerLabel}</span>
      </div>
      <div className="spi-block-body">
        <div className="spi-table-scroll">
          <table className="spi-table">
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="spi-table-empty">No invoices for this period</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.operationId}>
                    <td className="fw-semibold">{item.routeName || '-'}</td>
                    <td>{item.note || '—'}</td>
                    <td className="text-end">{item.totalStops}</td>
                    <td className="text-end fw-semibold">{formatGbp(item.amount)}</td>
                    <td>{formatItemDate(item.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="spi-subtotal-strip">
          <span>Subtotal: {formatGbp(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

export function DeductionsBlock({
  deductions,
  totalDeductions,
  totalReimbursements,
}: {
  deductions: Deduction[];
  totalDeductions: number;
  totalReimbursements: number;
}) {
  if (deductions.length === 0) return null;

  return (
    <div className="spi-block">
      <div className="spi-block-header">
        <span className="spi-block-title">Deductions &amp; Reimbursements</span>
      </div>
      <div className="spi-block-body">
        <div className="spi-table-scroll">
          <table className="spi-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Description</th>
                <th>Incident</th>
                <th>Entry</th>
                <th className="text-end">Deduction</th>
                <th className="text-end">Reimbursement</th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((d) => (
                <tr key={d.service_partner_deduction_id}>
                  <td className="fw-semibold">
                    {formatDeductionReference({
                      service_partner_deduction_id: d.service_partner_deduction_id,
                      deduction_amount: d.deduction_amount,
                      reimbursements_amount: d.reimbursements_amount,
                    })}
                  </td>
                  <td>{d.description || '—'}</td>
                  <td>{d.incident_date ? formatItemDate(d.incident_date) : '—'}</td>
                  <td>{d.entry_date ? formatItemDate(d.entry_date) : '—'}</td>
                  <td className="text-end spi-text-red">{d.deduction_amount > 0 ? formatGbp(d.deduction_amount) : '—'}</td>
                  <td className="text-end spi-text-green">
                    {d.reimbursements_amount > 0 ? formatGbp(d.reimbursements_amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="spi-subtotal-strip spi-subtotal-strip--split">
          <span className="spi-text-red fw-bold">Deductions: {formatGbp(totalDeductions)}</span>
          <span className="spi-text-green fw-bold">Reimbursements: {formatGbp(totalReimbursements)}</span>
        </div>
      </div>
    </div>
  );
}

export function VatBlock({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <div className="spi-vat-strip">
      <span>VAT (20%)</span>
      <span>{formatGbp(amount)}</span>
    </div>
  );
}

export function GrandTotalBar({ total, caption }: { total: number; caption: string }) {
  return (
    <div className="spi-grand-total">
      <div>
        <p className="spi-grand-total-label">Grand Total</p>
        <p className="spi-grand-total-caption">({caption})</p>
      </div>
      <p className="spi-grand-total-value">{formatGbp(total)}</p>
    </div>
  );
}
