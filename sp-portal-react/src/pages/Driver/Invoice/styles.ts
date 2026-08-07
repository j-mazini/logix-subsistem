/**
 * Ported from the reference `mobile-invoice/styles.ts`. The reference's
 * blue/green accents are swapped for this Driver Portal's emerald brand
 * accent (see task brief: "prefer emerald for primary active/accent UI").
 */
export const mobileInvoiceStyles = {
  sectionPadding: 'pb-4',
  listCard:
    'bg-white border border-slate-100 rounded-2xl py-4 px-[clamp(1rem,4vw,1.25rem)] sm:px-5 shadow-sm hover:shadow-lg transition-all duration-300',

  monthHeader:
    'font-bold text-[clamp(0.9375rem,4vw,1rem)] text-slate-800 pt-4 pb-2 border-b-2 border-emerald-500 mb-2 first:mt-0 first:pt-2 flex items-center gap-2',
  monthHeaderIcon: 'bi bi-calendar-month text-emerald-600',
  monthHeaderMonthWrap: 'flex flex-col',
  monthHeaderYear: 'text-[0.7rem] sm:text-xs opacity-90',

  invoiceRow:
    'flex items-center justify-between min-h-[48px] py-3.5 px-2 sm:px-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors duration-300 cursor-pointer touch-manipulation',
  invoiceTitle: 'font-semibold text-[0.875rem] sm:text-sm text-slate-800 flex items-center gap-2 min-w-0 truncate',
  invoiceTitleIcon: 'bi bi-receipt text-emerald-600 flex-shrink-0',
  invoiceSubtitle: 'text-[0.7rem] sm:text-xs text-slate-500',
  invoiceRightSide: 'flex items-center gap-2 sm:gap-4 flex-shrink-0',
  invoiceAmount: 'font-bold text-[clamp(0.875rem,3.5vw,1rem)] text-emerald-600',
  invoiceActionsWrap: 'flex gap-2 sm:gap-3',
} as const;
