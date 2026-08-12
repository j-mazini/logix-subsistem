/** Ported near-verbatim from the reference's daily-performance-insight/styles.ts. */
export const dailyPerformanceInsightStyles = {
  // Page layout
  pageContent: "space-y-4 pb-4",

  // Loading & Error states
  loadingContainer: "flex justify-center items-center min-h-[300px] font-medium text-slate-500",
  loadingSpinner: "bi bi-arrow-repeat animate-spin text-base text-slate-400",
  loadingText: "text-slate-500",
  emptyStateContainer: "flex flex-col justify-center items-center min-h-[300px] font-medium text-slate-500",
  emptyStateIcon: "bi bi-info-circle text-2xl mb-3 text-slate-300",
  emptyStateText: "text-slate-500",

  // Month Selector
  monthSelectorContainer: "flex items-center justify-between gap-[clamp(0.5rem,2vw,0.75rem)] font-semibold text-slate-700 text-sm flex-1 min-w-0 max-w-full px-[clamp(0.75rem,3vw,1rem)] py-[clamp(0.625rem,2.5vw,0.75rem)] bg-white border border-slate-100 rounded-xl min-h-[44px] shadow-sm hover:shadow-md transition-all duration-300",
  monthSelectorNavButton: "min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] w-[max(2.5rem,6vw)] h-[max(2.5rem,6vw)] sm:w-[max(2.75rem,7vw)] sm:h-[max(2.75rem,7vw)] rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center cursor-pointer hover:shadow-md transition-all duration-300 flex-shrink-0 touch-manipulation",
  monthSelectorNavIcon: "bi bi-chevron-left text-[clamp(0.75rem,3vw,0.875rem)]",
  monthSelectorNavIconRight: "bi bi-chevron-right text-[clamp(0.75rem,3vw,0.875rem)]",
  monthSelectorText: "flex-1 text-center text-[clamp(0.8rem,3.2vw,1.125rem)] font-bold text-slate-800 min-w-0 overflow-visible",

  // Days Carousel
  daysCarouselWrapper: "mb-4 sm:mb-5 -mx-1 px-1",
  daysCarouselScroll: "flex overflow-x-auto gap-2 sm:gap-3 py-2 pb-3 scroll-snap-type-x-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  dayCardBase: "min-w-[clamp(2.75rem,11vw,3.5rem)] min-h-[44px] h-[clamp(3.5rem,15vw,4.25rem)] rounded-xl flex flex-col items-center justify-center transition-all duration-300 flex-shrink-0 snap-center cursor-pointer border touch-manipulation",
  dayCardSelected: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white border-blue-400/30 shadow-lg scale-105",
  dayCardUnselected: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md",
  dayCardNumber: "text-[clamp(1.25rem,4.6vw,1.5rem)] font-bold leading-none",
  dayCardNumberSelected: "drop-shadow-sm",
  dayCardWeekday: "text-[0.7rem] mt-1 font-semibold uppercase tracking-wide",
  dayCardWeekdaySelected: "opacity-90",
  dayCardWeekdayUnselected: "opacity-70",

  // Operation Card
  operationCardRoot: "space-y-4",
  operationCardDivider: "border-none border-t border-slate-200 my-6",

  // Verified Card
  verifiedCard: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white p-[clamp(1rem,2.2vw,1.25rem)] rounded-2xl text-[clamp(1.25rem,4.6vw,1.5rem)] font-bold mx-auto shadow-lg hover:shadow-xl transition-all duration-300 flex justify-between items-center w-full max-w-[min(92%,28rem)] border border-blue-400/20",
  verifiedCardText: "drop-shadow-sm",

  // Vehicle Info
  vehicleInfoContainer: "text-center text-sm font-medium text-slate-600 -mt-1 mb-4 flex items-center justify-center gap-2",
  vehicleInfoIconWrapper: "w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center",
  vehicleInfoIcon: "text-base text-slate-700",
  vehicleInfoText: "font-semibold",

  // Card Base
  cardBase: "bg-white border border-slate-100 rounded-2xl p-[clamp(0.875rem,2.2vw,1.25rem)] shadow-sm hover:shadow-lg transition-all duration-300",

  // Metrics Card
  metricsCardGrid: "grid grid-cols-2 gap-2 sm:gap-[clamp(0.875rem,2.8vw,1.25rem)]",
  metricsCardItem: "text-center",
  metricsCardHeader: "flex items-center justify-center gap-2 mb-2",
  metricsCardIconWrapper: "w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md",
  metricsCardIcon: "text-lg",
  metricsCardLabel: "text-xs uppercase tracking-wide text-slate-500 font-semibold",
  metricsCardValue: "text-[clamp(1.5rem,4.8vw,1.875rem)] font-bold leading-none",
  metricsCardValueDefault: "text-slate-800",
  metricsCardValueSuccess: "text-green-600",
  metricsCardValueWarning: "text-yellow-500",
  metricsCardValueOrange: "text-orange-500",
  metricsCardValueDanger: "text-red-600",
  metricsCardValueAfd: "text-red-600",
  metricsCardValueNeutral: "text-slate-700",

  // Timeline
  timelineContainer: "flex justify-between relative px-2.5 py-3",
  timelineLine: "absolute top-6 left-[12%] right-[12%] h-1 bg-gradient-to-r from-blue-200 via-amber-200 to-emerald-200 rounded-full z-[1]",
  timelineItem: "flex flex-col items-center z-[2] relative bg-white px-2",
  timelineDot: "w-5 h-5 rounded-full bg-gradient-to-br mb-2 border-[3px] border-white shadow-lg flex items-center justify-center",
  timelineDotIcon: "bi text-xs text-white",
  timelineLabel: "text-xs text-center font-semibold leading-tight",
  timelineLabelDefault: "text-slate-700",
  timelineLabelHighlighted: "text-red-600 font-bold",

  // Failed Deliveries Card
  failedDeliveriesHeader: "flex items-center gap-2 mb-3 sm:mb-4",
  failedDeliveriesAccent: "h-1 w-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500",
  failedDeliveriesTitle: "text-[0.7rem] sm:text-xs font-bold text-slate-600 text-center uppercase tracking-wider",
  failedDeliveriesGrid: "grid grid-cols-3 gap-2 sm:gap-4",
  failedDeliveriesItem: "text-center min-w-0",
  failedDeliveriesIconWrapper: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-md",
  failedDeliveriesIcon: "text-xs sm:text-sm",
  failedDeliveriesLabel: "text-[0.65rem] sm:text-[0.7rem] text-slate-500 font-semibold mb-1 block uppercase tracking-wide",
  failedDeliveriesValue: "text-[clamp(1rem,3.5vw,1.25rem)] font-bold leading-none text-slate-800",

  // Notes Section
  notesCard: "bg-[#fffef0] border-l-4 border-[#f5e6a3] p-[clamp(1rem,2.2vw,1.25rem)] rounded-xl mb-3 break-words shadow-sm hover:shadow-md transition-all duration-300",
  notesHeader: "flex items-center gap-2 mb-3",
  notesIconWrapper: "w-8 h-8 rounded-lg bg-[#f5e6a3]/30 flex items-center justify-center",
  notesIcon: "bi bi-sticky text-[#b8941f] text-sm",
  notesTitle: "text-xs font-bold text-[#8b6914] uppercase tracking-wider",
  notesText: "text-[clamp(0.875rem,3.4vw,1rem)] text-[#8b6914] font-medium break-words whitespace-pre-wrap leading-relaxed",
} as const;
