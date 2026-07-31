export const requestsStyles = {
  pageContent: "space-y-4",

  // Month carousel (same shape as Deductions'/CurrentMonth's own copy)
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
} as const;
