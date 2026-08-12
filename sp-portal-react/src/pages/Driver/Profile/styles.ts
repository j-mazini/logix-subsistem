/** Ported verbatim from the reference app's subcontractor/styles.ts. */
export const profileStyles = {
  // Page layout
  pageContent: 'space-y-4 pb-4',

  // Month selector
  monthSelectorContainer:
    'flex items-center justify-between gap-[clamp(0.5rem,2vw,0.75rem)] font-semibold text-slate-700 text-sm min-w-0 px-[clamp(0.75rem,3vw,1rem)] py-[clamp(0.625rem,2.5vw,0.75rem)] bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300',
  monthSelectorNavButton:
    'w-[clamp(1.75rem,7vw,2rem)] h-[clamp(1.75rem,7vw,2rem)] rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-blue-100 hover:text-blue-600 transition-all duration-300 flex-shrink-0',
  monthSelectorMonth:
    'text-[clamp(0.95rem,3.6vw,1.125rem)] font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis',
  monthSelectorYear: 'text-[clamp(0.7rem,2.6vw,0.75rem)] text-slate-500 font-medium',

  // Days carousel
  daysCarouselWrapper: 'mb-4 sm:mb-5 relative -mx-1 px-1',
  daysCarouselBackground:
    'absolute inset-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl -z-10',
  daysCarouselScroll:
    'flex overflow-x-auto gap-2 sm:gap-3 py-3 pb-4 snap-x-mandatory touch-pan-x scrollbar-hide px-2 [-webkit-overflow-scrolling:touch]',

  // Operations list
  operationsListRoot: 'flex-1 flex flex-col min-h-0',
  operationsListScroll: 'flex-1 overflow-y-auto overflow-x-visible',
  operationsListInner: 'pb-4',
  operationsDividerWrapper: 'relative mt-6 mb-6 flex items-center justify-center',
  operationsDividerLine: 'absolute w-full h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent',
  operationsDividerDot: 'w-2 h-2 rounded-full bg-blue-500',

  // Operation card
  operationCardWrapper: 'relative overflow-visible',
  operationCardAccent:
    'absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full opacity-0',
  operationCardMain:
    'bg-white rounded-2xl p-[clamp(0.875rem,4vw,1rem)] sm:p-4 shadow-sm hover:shadow-lg transition-all duration-300 mb-3 box-border overflow-hidden border border-slate-100',

  // Route header
  routeHeader:
    'relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white p-[clamp(0.75rem,2.6vw,0.95rem)] rounded-2xl flex justify-between items-center text-[clamp(1.1rem,4.2vw,1.5rem)] font-bold mb-3 shadow-lg hover:shadow-xl transition-all duration-300 w-full box-border overflow-hidden min-w-0',
  routeHeaderPattern: 'absolute inset-0 opacity-10',
  routeHeaderShimmer: 'absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent',
  routeHeaderTitle: 'relative z-10 drop-shadow-sm',

  // Metrics
  metricsGrid: 'grid grid-cols-3 gap-2 sm:gap-2.5 mb-3 sm:mb-3.5',
  metricsCard:
    'text-center bg-slate-50 border border-slate-100 p-2.5 sm:p-3 rounded-xl hover:shadow-md transition-all duration-300 min-w-0',
  metricsLabel: 'text-[0.65rem] sm:text-[0.7rem] text-slate-600 font-semibold uppercase mb-1 tracking-wide',
  metricsValueBase: 'text-[clamp(1.1rem,4vw,1.5rem)] font-bold',

  // Stops section
  stopsSectionWrapper: 'mt-3 pt-3',
  stopsSectionTitle:
    'text-[0.7rem] sm:text-[0.75rem] font-bold mb-2.5 text-slate-600 uppercase tracking-wide flex items-center gap-2',
  stopsSectionTitleIcon: 'bi bi-stop-circle text-blue-600',
  stopsGrid: 'grid grid-cols-2 sm:grid-cols-4 gap-2',
  stopsCard: 'text-center bg-slate-50 p-2 rounded-xl transition-all duration-300 group relative overflow-hidden min-w-0',
  stopsOverlay:
    'absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl',
  stopsIcon: 'text-base mb-1 transition-all duration-300',
  stopsValue: 'text-[clamp(1rem,3.6vw,1.125rem)] font-bold leading-none transition-all duration-300',
  stopsLabel: 'text-[0.6rem] text-slate-500 font-semibold uppercase mt-0.5',

  // Payment breakdown
  paymentCard:
    'relative bg-white rounded-2xl p-[clamp(0.875rem,4vw,1rem)] sm:p-4 shadow-sm hover:shadow-lg transition-all duration-300 mb-3 box-border overflow-hidden border border-slate-100',
  paymentCornerTop: 'absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full',
  paymentCornerBottom: 'absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-tr-full',
  paymentTitle: 'text-[0.85rem] font-bold mb-3.5 text-slate-800 uppercase flex items-center gap-2 relative z-10',
  paymentTitleIcon: 'bi bi-cash-stack text-green-600',
  paymentGrid: 'grid grid-cols-2 gap-3 sm:gap-5 pb-4 relative z-10',
  paymentBaseCard: 'text-center bg-gradient-to-br from-green-50 to-white p-3 rounded-xl border border-green-100',
  paymentAdhocCard: 'text-center bg-gradient-to-br from-orange-50 to-white p-3 rounded-xl border border-orange-100',
  paymentBaseLabel: 'text-sm text-slate-600 font-medium mb-1 block',
  paymentBaseValue: 'text-[clamp(1.75rem,6vw,2.25rem)] font-bold leading-none text-green-600',
  paymentAdhocLabel: 'text-sm text-slate-600 font-medium mb-1 block',
  paymentAdhocValue: 'text-[clamp(1.75rem,6vw,2.25rem)] font-bold leading-none text-orange-600',

  // Notes
  noteCard: 'relative bg-amber-50 border-l-4 border-amber-200 p-3 rounded-xl mb-3 overflow-visible',
  notePattern:
    'absolute inset-0 opacity-5 rounded-xl overflow-hidden bg-[radial-gradient(circle_at_2px_2px,#f5e6a3_1px,transparent_0)] bg-[length:15px_15px]',
  noteTitle: 'text-[0.7rem] font-bold text-amber-800 uppercase mb-1.5 tracking-wide flex items-center gap-2 relative z-10',
  noteTitleIcon: 'bi bi-sticky text-amber-700',
  noteText:
    'text-sm text-amber-800 font-medium relative z-10 break-words whitespace-pre-wrap overflow-visible word-break break-word',

  // Loading / error
  loadingContainer: 'flex justify-center items-center flex-1 min-h-[200px]',
  loadingText: 'text-slate-700 text-lg',

  errorContainer: 'flex justify-center items-center flex-1 min-h-[200px]',
  errorText: 'text-slate-700 text-lg',
} as const;
