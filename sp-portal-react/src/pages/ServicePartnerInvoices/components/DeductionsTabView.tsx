// Ported from the Next.js source's DeductionsTabView.tsx. No isLoading/
// isError props needed here — the local mock store reads are synchronous.
import type { Deduction } from '../../../data/servicePartnerInvoicesData';
import { formatDeductionReference, formatGbp, formatItemDate } from '../utils/format';

interface Props {
  deductions: Deduction[];
  canManage: boolean;
  onEdit: (deduction: Deduction) => void;
  onDelete: (deduction: Deduction) => void;
}

export function DeductionsTabView({ deductions, canManage, onEdit, onDelete }: Props) {
  const totalDeductions = deductions.reduce((sum, d) => sum + d.deduction_amount, 0);
  const totalReimbursements = deductions.reduce((sum, d) => sum + d.reimbursements_amount, 0);

  return (
    <div className="spi-tab-panel">
      <div className="spi-stats-grid spi-stats-grid--two">
        <div className="spi-card">
          <p className="spi-card-label">Total Deductions</p>
          <p className="spi-card-value spi-text-red">{formatGbp(totalDeductions)}</p>
        </div>
        <div className="spi-card">
          <p className="spi-card-label">Total Reimbursements</p>
          <p className="spi-card-value spi-text-green">{formatGbp(totalReimbursements)}</p>
        </div>
      </div>

      <div className="spi-table-card">
        <div className="spi-table-scroll">
          <table className="spi-table spi-table--main">
            <thead>
              <tr>
                <th>Service Partner</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Incident Date</th>
                <th>Entry Date</th>
                <th className="text-end">Deduction</th>
                <th className="text-end">Reimbursement</th>
                <th>Status</th>
                {canManage && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {deductions.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="spi-table-empty">No deductions for this period</td>
                </tr>
              ) : (
                deductions.map((d) => {
                  const isPaid = !!d.service_partner_invoice_id;
                  return (
                    <tr key={d.service_partner_deduction_id}>
                      <td className="fw-semibold">{d.service_partner_name || '—'}</td>
                      <td>
                        {formatDeductionReference({
                          service_partner_deduction_id: d.service_partner_deduction_id,
                          deduction_amount: d.deduction_amount,
                          reimbursements_amount: d.reimbursements_amount,
                        })}
                      </td>
                      <td className="spi-truncate">{d.description || '—'}</td>
                      <td>{d.incident_date ? formatItemDate(d.incident_date) : '—'}</td>
                      <td>{d.entry_date ? formatItemDate(d.entry_date) : '—'}</td>
                      <td className="text-end fw-semibold spi-text-red">{formatGbp(d.deduction_amount)}</td>
                      <td className="text-end fw-semibold spi-text-green">{formatGbp(d.reimbursements_amount)}</td>
                      <td>
                        <span className={`spi-badge ${isPaid ? 'spi-badge--green' : 'spi-badge--amber'}`}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="text-end">
                          <div className="spi-row-actions spi-row-actions--end">
                            <button
                              type="button"
                              className="spi-icon-btn"
                              disabled={isPaid}
                              title={isPaid ? 'Paid items cannot be edited' : 'Edit deduction'}
                              aria-label="Edit deduction"
                              onClick={() => onEdit(d)}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="spi-icon-btn spi-icon-btn--danger"
                              disabled={isPaid}
                              title={isPaid ? 'Paid items cannot be deleted' : 'Delete deduction'}
                              aria-label="Delete deduction"
                              onClick={() => onDelete(d)}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
