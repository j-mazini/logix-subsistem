export const deductionsStyles = {
  card:
    "liquid-glass-surface rounded-2xl overflow-hidden relative p-[clamp(0.875rem,4vw,1rem)] sm:p-4 transition-all duration-300 mb-4",

  sectionTitle: "font-bold text-[clamp(1rem,4vw,1.125rem)] text-slate-800 mb-3 flex items-center gap-2",
  emptyWrap: "text-center text-slate-500 py-5 px-2",
  emptyIcon: "bi bi-inbox text-2xl sm:text-3xl mb-2 text-slate-300",

  listScroll: "max-h-[clamp(12rem,35vh,16rem)] overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]",

  // Page layout
  pageContent:
    "space-y-[clamp(1.25rem,3.2vw,1.5rem)] pb-4 relative",
  loadingBarWrapper:
    "absolute top-0 left-0 right-0 h-1 bg-slate-200 rounded-full overflow-hidden z-10",
  loadingBarInner: "h-full bg-indigo-500 animate-pulse",

  // Month carousel
  monthCarouselSection:
    "liquid-glass-surface rounded-2xl overflow-hidden relative mb-4 transition-all duration-300",
  monthCarouselScroll:
    "overflow-x-auto py-2.5 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
  monthCarouselItems: "flex flex-nowrap gap-2 px-3 sm:px-4 items-center",
  monthCarouselButtonBase:
    "flex-shrink-0 min-h-[44px] px-3 sm:px-4 py-2.5 rounded-[20px] font-semibold text-xs sm:text-sm text-center cursor-pointer border-2 uppercase transition-all duration-300 touch-manipulation",
  monthCarouselButtonActive:
    "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400/50 shadow-lg shadow-indigo-500/30",
  monthCarouselButtonInactive:
    "bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100 hover:border-slate-200",
  monthCarouselButtonLabel: "relative z-10 flex flex-col items-center",
  monthCarouselButtonYear: "text-xs opacity-90",

  // Summary card — kept red: this is the "Total Deductions" hero figure, a
  // negative monetary total (same semantic-red convention as CurrentPerformance's
  // valueNegative), not page-brand chrome.
  summaryCardSection:
    "liquid-glass-surface relative rounded-2xl overflow-hidden p-4 sm:p-5 transition-all duration-300 mb-4 text-center",
  summaryCardBgPattern: "absolute inset-0 opacity-5",
  summaryCardLabel:
    "text-xs sm:text-sm font-medium text-slate-600 mb-2 relative z-10 flex items-center justify-center gap-2",
  summaryCardLabelIcon: "bi bi-calculator text-red-600",
  summaryCardValue:
    "text-[clamp(1.75rem,8vw,2.25rem)] font-bold leading-tight text-red-600 relative z-10",
  summaryCardAccentBar:
    "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500 rounded-b-2xl",

  // Deduction item row
  deductionRow:
    "block py-3.5 px-3 sm:px-4 rounded-xl odd:bg-slate-50 hover:bg-red-50/50 transition-colors duration-300 min-h-[44px]",
  deductionRef:
    "text-[0.7rem] sm:text-xs text-slate-500 font-medium mb-1 flex items-center gap-1",
  deductionRefIcon: "bi bi-hash text-red-400",
  deductionDescription: "text-[0.875rem] sm:text-sm text-slate-800 font-semibold break-words",
  deductionAmount: "text-[clamp(1.125rem,5vw,1.25rem)] font-bold text-red-600 leading-none",
  deductionDate: "text-[0.65rem] sm:text-[0.7rem] text-slate-500 mt-0.5",

  // Progress list
  progressList: "space-y-0.5",
  progressRow:
    "py-3.5 px-3 sm:px-4 rounded-xl odd:bg-slate-50 hover:bg-indigo-50/50 transition-colors duration-300 min-h-[44px]",
  progressHeader:
    "text-[0.7rem] sm:text-xs text-slate-700 font-semibold flex items-center gap-1 break-words",
  progressHeaderIcon: "bi bi-arrow-repeat text-indigo-600 flex-shrink-0",
  progressAmount: "text-[clamp(1rem,4vw,1.125rem)] font-bold text-slate-800",
  progressTrack:
    "h-2 rounded-full bg-slate-200 overflow-hidden relative",
  progressFill:
    "h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full",

  // Loading / error
  loadingContainer:
    "flex justify-center items-center flex-1 min-h-[200px]",
  loadingText: "text-slate-700 text-lg",

  errorContainer:
    "flex justify-center items-center min-h-[200px]",
  errorText: "text-sm font-medium text-red-600",
} as const;
