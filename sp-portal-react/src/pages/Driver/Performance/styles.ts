/**
 * Ported from the reference app's app/(private)/current-performance/styles.ts.
 * The reference hardcodes a blue accent; swapped to emerald to match this
 * Driver Portal's established brand color (see MOCK_DRIVER-era pages / other
 * Driver/** tabs).
 */
export const currentPerformanceStyles = {
  // Layout / cards
  monthCarouselSection:
    'bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 mb-4 border border-slate-100',
  monthCarouselScroll:
    'overflow-x-auto py-2.5 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden',
  monthCarouselItems: 'flex flex-nowrap gap-2 px-3 sm:px-4',
  monthCarouselButtonBase:
    'flex-shrink-0 min-h-[44px] px-3 sm:px-4 py-2.5 rounded-full font-semibold text-xs sm:text-sm text-center cursor-pointer transition-all duration-300 border-2 touch-manipulation',
  monthCarouselButtonActive:
    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/30',
  monthCarouselButtonInactive:
    'bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-200',
  monthCarouselButtonLabel: 'relative z-10 flex flex-col items-center',
  monthCarouselButtonYear: 'text-xs opacity-90',

  monthlyCard:
    'bg-white rounded-2xl p-[clamp(0.875rem,4vw,1rem)] sm:p-4 shadow-sm hover:shadow-lg transition-all duration-300 mb-4 border border-slate-100',

  // Monthly averages
  monthlyHeader: 'flex justify-between items-center mb-3 sm:mb-3.5',
  monthlyTitle: 'text-[clamp(1.25rem,5vw,1.5rem)] font-bold text-slate-800 flex items-center gap-2',
  monthlyTitleIcon: 'bi bi-bar-chart text-emerald-600',
  monthlyMetricsGrid: 'grid grid-cols-3 gap-2 sm:gap-2.5',
  monthlyMetricCard:
    'text-center bg-gradient-to-br from-slate-50 to-white p-2.5 sm:p-3 rounded-xl border border-slate-100 hover:shadow-md transition-all duration-300 min-w-0',
  monthlyMetricLabel:
    'block text-[0.65rem] sm:text-[0.7rem] text-slate-600 font-semibold uppercase tracking-wide mb-1',

  // Daily table
  dailySection:
    'bg-white rounded-2xl p-[clamp(0.875rem,4vw,1rem)] sm:p-4 shadow-sm hover:shadow-lg transition-all duration-300 mb-4 border border-slate-100 overflow-hidden',
  dailyHeader: 'font-bold text-[clamp(1rem,4vw,1.125rem)] text-slate-800 mb-3 flex items-center gap-2',
  dailyHeaderIcon: 'bi bi-table text-emerald-600',
  dailyScroll: 'max-h-[50vh] overflow-auto rounded-lg [-webkit-overflow-scrolling:touch]',
  dailyTable:
    'w-full min-w-[480px] border-collapse border-separate border-spacing-0 text-[0.7rem] sm:text-xs',
  dailyThead: 'sticky top-0 bg-gradient-to-r from-emerald-50 to-white z-10',
  dailyTh:
    'py-2.5 px-2 sm:px-1.5 text-center font-semibold text-emerald-600 border-b-2 border-emerald-500 whitespace-nowrap',

  // Table rows / cells
  rowEven: 'bg-white',
  rowOdd: 'bg-slate-50',
  dayCell: 'py-2.5 px-2 sm:px-1.5 text-center align-middle border-b border-slate-200 font-bold',
  weekdayPillBase:
    'font-semibold text-[0.65rem] sm:text-[0.7rem] py-1 px-1 sm:px-1.5 rounded-md inline-block min-w-[28px] sm:min-w-[30px] ml-1',
  weekdayPillSaturday: 'bg-emerald-100 text-emerald-600',
  weekdayPillWeekday: 'bg-slate-200 text-slate-600',
  valueCellBase: 'py-2.5 px-2 sm:px-1.5 text-center align-middle border-b border-slate-200 font-bold',
  valueStopsNA: 'text-slate-400 italic text-[0.7rem] sm:text-xs',
  valueStopsNormal: 'text-slate-700',

  // Semantic value colors
  valueNA: 'text-slate-400 italic text-[0.7rem] sm:text-xs',
  valuePositive: 'text-green-600 font-semibold',
  valueWarning: 'text-orange-600 font-semibold',
  valueNegative: 'text-red-600 font-semibold',
  valueNeutral: 'text-slate-600 font-medium',

  emptyStateCell: 'py-5 text-center text-slate-400 italic text-xs',
  emptyStateIcon: 'bi bi-inbox text-2xl mb-2 block',

  // Misc states
  loadingText: 'py-5 text-center text-gray-500',
  errorText: 'py-5 text-center text-red-600',
} as const;
