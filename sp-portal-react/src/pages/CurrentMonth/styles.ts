export const currentMonthStyles = {
  card:
    "bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 mb-4 border border-slate-100",

  sectionTitle:
    "text-lg font-bold text-slate-800 mb-3 uppercase text-sm flex items-center gap-2",
  sectionTitleIcon: "bi bi-calendar-check text-blue-600",

  scrollList: "max-h-[clamp(12rem,35vh,16rem)] overflow-y-auto pr-1",

  emptyStateWrap: "text-center text-slate-500 py-5",
  emptyStateIcon: "bi bi-inbox text-3xl mb-2 text-slate-300",

  rowBase:
    "flex justify-between items-center px-3 py-3 cursor-pointer transition-all duration-300 rounded-xl hover:bg-blue-50 hover:shadow-sm",
  rowEven: "bg-slate-50",
  rowOdd: "bg-transparent",

  rowLeft: "flex flex-col items-start leading-tight",
  rowTitle: "text-sm font-semibold text-slate-800",
  rowSubtitle: "text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5",
  rowAmount: "text-sm font-bold text-green-600",

  // Day details "modal" view
  dayDetailsRoot:
    "bg-slate-100 text-slate-800 p-3 min-h-screen pb-[clamp(3.5rem,8vh,4.375rem)]",
  dayDetailsBackButton:
    "mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-slate-800 transition-colors",
  dayDetailsBackIcon: "bi bi-arrow-left text-xs",
  dayDetailsScroll:
    "max-h-[clamp(22rem,70vh,44rem)] overflow-y-auto pb-5 space-y-4",
  dayDetailsCard:
    "bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden",

  routeHeader:
    "bg-blue-600 px-4 py-3 flex justify-between items-center rounded-t-2xl",
  routeHeaderTitle: "text-lg font-semibold text-white",
  routeHeaderBadge:
    "bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold",

  metricsGrid: "grid grid-cols-3 gap-3 p-4",
  metricsCard:
    "bg-slate-50 border border-slate-200 rounded-lg p-3 text-center",
  metricsLabel:
    "text-[0.7rem] font-semibold text-slate-500 mb-1 uppercase tracking-wide",
  metricsValue: "text-xl font-bold text-slate-800",

  workHoursCard:
    "mx-4 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4",
  workHoursLabel:
    "text-sm font-medium text-slate-500 mb-2 min-h-[clamp(2rem,6vh,2.5rem)] flex items-center justify-center",
  workHoursValue:
    "text-lg font-bold text-slate-800 mt-auto min-h-[clamp(1.25rem,4vh,1.5rem)] flex items-center justify-center",
  workHoursTotalLabel: "text-sm font-medium text-slate-500 mb-1",
  workHoursTotalValue: "text-2xl font-bold text-blue-600",

  stopsSectionTitle:
    "text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide",
  stopsGrid: "grid grid-cols-4 gap-2",
  stopsCard:
    "bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-2 text-center",
  stopsLabel:
    "text-[0.7rem] font-semibold text-slate-500 mb-1 uppercase tracking-wide",
  stopsValue: "text-base font-bold text-slate-800",

  paymentSectionTitle:
    "text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide",
  paymentRow:
    "flex justify-between items-center py-3 border-b border-slate-200 last:border-b-0",
  paymentLabel: "text-sm font-medium text-slate-700",
  paymentBaseValue: "text-base font-semibold text-emerald-600",
  paymentAdhocValue: "text-base font-semibold text-amber-500",

  noteCard:
    "px-4 pb-4",
  noteInner:
    "bg-amber-50 rounded-lg p-3 border-l-4 border-amber-200",
  noteTitle:
    "text-sm font-bold text-amber-800 mb-2 uppercase tracking-wide",
  noteText: "text-sm text-amber-800 leading-relaxed",

  // Month carousel
  monthCarouselSection:
    "bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 mb-4 border border-slate-100",
  monthCarouselScroll:
    "overflow-x-auto py-2.5 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
  monthCarouselItems: "flex flex-nowrap gap-2 px-4 items-center",
  monthCarouselButtonBase:
    "flex-shrink-0 px-4 py-2.5 rounded-[20px] font-semibold text-sm text-center cursor-pointer border-2 uppercase transition-all duration-300",
  monthCarouselButtonActive:
    "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400/50 shadow-lg shadow-blue-500/30",
  monthCarouselButtonInactive:
    "bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100 hover:border-slate-200",
  monthCarouselButtonLabel: "relative z-10 flex flex-col items-center",
  monthCarouselButtonYear: "text-xs opacity-90",

  // Summary card
  summaryCardSection:
    "relative bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 mb-4 text-center border border-slate-100 overflow-hidden",
  summaryCardBgPattern: "absolute inset-0 opacity-5",
  summaryCardLabel:
    "text-sm font-medium text-slate-600 mb-2 relative z-10 flex items-center justify-center gap-2",
  summaryCardLabelIcon: "bi bi-currency-pound text-green-600",
  summaryCardValue: "text-4xl font-bold text-green-600 leading-tight relative z-10",
  summaryCardAccentBar:
    "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-400 to-green-500 rounded-b-2xl",

  // Info grid
  infoGridSection:
    "bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 mb-4 border border-slate-100",
  infoGridGrid: "grid grid-cols-2 gap-3 text-center",
  infoGridCard:
    "bg-gradient-to-br from-slate-50 to-white rounded-xl p-3 border border-slate-100 hover:shadow-md transition-all duration-300",
  infoGridLabel: "text-xs font-medium text-slate-600 block mb-1",
  infoGridValueBase: "text-lg font-bold",
  infoValueSuccess: "text-green-600",
  infoValueWarning: "text-orange-600",
  infoValueAccent: "text-red-600",
  infoValueNeutral: "text-slate-700",

  // Loading / error / empty
  loadingContainer: "text-center py-5",
  loadingSpinner:
    "inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent",
  loadingText: "mt-2 text-slate-500",

  errorContainer: "text-center py-5 text-red-500",
  errorIcon: "bi bi-exclamation-triangle text-3xl mb-2 block",
  errorText: "font-medium",

  noDataSection:
    "bg-slate-50 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] mb-4",
  noDataText: "text-center text-slate-500 py-5",
} as const;
