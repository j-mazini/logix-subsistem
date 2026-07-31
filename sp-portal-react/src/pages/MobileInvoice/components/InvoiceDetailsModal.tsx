import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '@/hooks/useModalBehavior';
import { downloadBlob } from '@/lib/pdf-utils';
import { generateInvoiceDetails, InvoiceDetailData } from '../mock/mockInvoiceData';
import { generateInvoicePdf } from '../lib/generateInvoicePdf';

interface InvoiceDetailsModalProps {
  invoiceId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface InvoiceDetailsModalRef {
  generatePDF: () => Promise<void>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

const InvoiceDetailsModal = forwardRef<InvoiceDetailsModalRef, InvoiceDetailsModalProps>(
  ({ invoiceId, open, onOpenChange }, ref) => {
    const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useModalBehavior(() => onOpenChange(false), open);

    useEffect(() => {
      if (!open) return;
      setIsLoading(true);
      const timer = setTimeout(() => {
        setInvoiceDetails(generateInvoiceDetails(invoiceId));
        setIsLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }, [invoiceId, open]);

    const totals = useMemo(() => {
      if (!invoiceDetails) return null;
      const subtotal = invoiceDetails.details.reduce((sum, d) => sum + d.total, 0);
      const vat = invoiceDetails.hasVat ? subtotal * 0.2 : 0;
      const total = subtotal + vat;
      const totalDeductions = Object.values(invoiceDetails.deductions).reduce((a, b) => a + b, 0);
      return { subtotal, vat, total, totalDeductions, balanceDue: total - totalDeductions };
    }, [invoiceDetails]);

    useImperativeHandle(ref, () => ({
      generatePDF: async () => {
        const data = invoiceDetails ?? generateInvoiceDetails(invoiceId);
        const blob = await generateInvoicePdf(data);
        downloadBlob(blob, `invoice-${data.invoiceNumber}.pdf`);
      },
    }), [invoiceDetails, invoiceId]);

    if (!open) return null;

    const { deductions } = invoiceDetails ?? { deductions: null };

    return createPortal(
      <div className="driver-tw-scope">
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-2 sm:p-6">
        <div className="relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-lg bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-800">Invoice Details</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-sm p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <i className="bi bi-arrow-repeat animate-spin text-xl text-slate-400" />
              <span className="ml-2 text-sm text-slate-600">Loading invoice details...</span>
            </div>
          )}

          {!isLoading && invoiceDetails && totals && deductions && (
            <div className="space-y-3 p-4">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-900">
                    <span className="text-base font-bold text-white">AT</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-indigo-900">{invoiceDetails.company.companyName}</h3>
                    <div className="flex flex-wrap gap-x-3 text-xs text-slate-600">
                      <span>{invoiceDetails.company.companyStreet}</span>
                      <span>{invoiceDetails.company.companyEmail}</span>
                      <span>VAT: {invoiceDetails.company.companyVatNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-indigo-100 p-2 sm:p-3">
                  <p className="text-[10px] font-bold uppercase text-indigo-900">Self Billing Invoice</p>
                  <p className="text-sm font-bold text-indigo-900">#{invoiceDetails.invoiceNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50">
                  <div className="flex items-center gap-1.5 bg-indigo-900 px-2 py-1.5">
                    <i className="bi bi-person-fill text-xs text-white" />
                    <h4 className="text-[10px] font-bold text-white">Vendor Details</h4>
                  </div>
                  <div className="space-y-1 p-2 text-[10px]">
                    <div><span>Name: </span><span className="font-semibold text-indigo-900">{invoiceDetails.vendor.name}</span></div>
                    <div><span>Vendor ID: </span><span className="font-semibold">{invoiceDetails.vendor.vendorCode}</span></div>
                    <div><span>Email: </span><span className="font-semibold text-indigo-900 underline">{invoiceDetails.vendor.vendorEmail}</span></div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50">
                  <div className="flex items-center gap-1.5 bg-indigo-900 px-2 py-1.5">
                    <i className="bi bi-calendar-fill text-xs text-white" />
                    <h4 className="text-[10px] font-bold text-white">Invoice Details</h4>
                  </div>
                  <div className="space-y-1 p-2 text-[10px]">
                    <div><span>Invoice Date: </span><span className="font-semibold text-indigo-900">{formatDate(invoiceDetails.invoiceDate)}</span></div>
                    <div><span>Due Date: </span><span className="font-semibold text-indigo-900">{formatDate(invoiceDetails.dueDate)}</span></div>
                    <div><span>Payment Terms: </span><span className="font-semibold text-indigo-900">{invoiceDetails.paymentTerms}</span></div>
                    <div><span>Total Stops: </span><span className="font-semibold text-indigo-900">{invoiceDetails.totalStops}</span></div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-indigo-900">
                        <th className="px-2 py-1 text-left font-bold uppercase text-white">Date</th>
                        <th className="px-2 py-1 text-left font-bold uppercase text-white">Route</th>
                        <th className="px-2 py-1 text-center font-bold uppercase text-white">VAT</th>
                        <th className="px-2 py-1 text-right font-bold uppercase text-white">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails.details.map((item, index) => (
                        <tr key={`${item.date}-${index}`} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                          <td className="px-2 py-1">{formatDate(item.date)}</td>
                          <td className="px-2 py-1">{item.route}</td>
                          <td className="px-2 py-1 text-center">{invoiceDetails.hasVat ? '20%' : 'no vat'}</td>
                          <td className="px-2 py-1 text-right font-semibold">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:flex-row">
                <div className="flex-1 rounded-lg border border-red-200 bg-red-100 p-2">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <i className="bi bi-exclamation-triangle-fill text-xs text-red-600" />
                    <h4 className="text-[10px] font-bold">Deductions</h4>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    {deductions.trafficPenalty > 0 && (
                      <div className="flex justify-between"><span>Traffic Penalties:</span><span className="font-bold">-{formatCurrency(deductions.trafficPenalty)}</span></div>
                    )}
                    {deductions.prePayment > 0 && (
                      <div className="flex justify-between"><span>Pre-Payments:</span><span className="font-bold">-{formatCurrency(deductions.prePayment)}</span></div>
                    )}
                    {deductions.other > 0 && (
                      <div className="flex justify-between"><span>Others:</span><span className="font-bold">-{formatCurrency(deductions.other)}</span></div>
                    )}
                    {deductions.liquidationDamage > 0 && (
                      <div className="flex justify-between"><span>Liquidation Damages:</span><span className="font-bold">-{formatCurrency(deductions.liquidationDamage)}</span></div>
                    )}
                    {deductions.fixDamage > 0 && (
                      <div className="flex justify-between"><span>Repair Damages:</span><span className="font-bold">-{formatCurrency(deductions.fixDamage)}</span></div>
                    )}
                    {totals.totalDeductions === 0 && <div className="text-slate-500">None</div>}
                    {totals.totalDeductions > 0 && (
                      <div className="mt-1.5 flex justify-between border-t border-slate-300 pt-1.5 font-bold text-red-600">
                        <span>Total Deductions:</span><span>-{formatCurrency(totals.totalDeductions)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>Invoice Subtotal:</span><span className="font-bold">{formatCurrency(totals.subtotal)}</span></div>
                    <div className="flex justify-between"><span>VAT:</span><span className="font-bold">{formatCurrency(totals.vat)}</span></div>
                    <div className="mt-1.5 flex justify-between border-t border-slate-300 pt-1.5 font-bold">
                      <span>Invoice Total:</span><span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-indigo-900 px-4 py-4">
                <span className="text-[10px] font-bold text-white">Balance Due:</span>
                <span className="text-base font-bold text-white">{formatCurrency(totals.balanceDue)}</span>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>,
      document.body
    );
  }
);

InvoiceDetailsModal.displayName = 'InvoiceDetailsModal';

export default InvoiceDetailsModal;
