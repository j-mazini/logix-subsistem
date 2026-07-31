export const myScheduleStyles = {
  pageContent: "pb-4",

  viewToggleWrap: "flex rounded-xl bg-white/80 border border-slate-200/70 p-1 gap-1 mb-4",
  viewToggleButton:
    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors",
  viewToggleButtonActive: "bg-teal-600 text-white shadow-sm",
  viewToggleButtonInactive: "text-slate-500 hover:text-slate-700",

  weekNavCard: "liquid-glass-surface rounded-2xl overflow-hidden relative p-3 sm:p-4 mb-4",
  weekNavRow: "flex items-center justify-between gap-2",
  weekNavArrow:
    "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors",
  weekNavCenter: "flex flex-col items-center min-w-0",
  weekNavLabel: "text-sm font-bold text-slate-900 truncate",
  weekNavTodayButton:
    "text-[0.65rem] font-semibold uppercase tracking-wide text-teal-600 hover:text-teal-700 mt-0.5",

  weekStripRow: "flex gap-1.5 sm:gap-2 mt-3",
  dayChipBase:
    "relative flex-1 flex flex-col items-center justify-center rounded-xl py-2 border transition-all duration-200 cursor-pointer touch-manipulation",
  dayChipSelected: "bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 text-white border-teal-400/30 shadow-lg",
  dayChipUnselected: "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
  dayChipWeekday: "text-[0.6rem] font-semibold uppercase tracking-wide opacity-80",
  dayChipNumber: "text-base font-bold leading-none mt-0.5",
  dayChipDot: "h-1.5 w-1.5 rounded-full mt-1",

  detailCard: "liquid-glass-surface rounded-2xl overflow-hidden relative p-4 sm:p-5",
  detailHeaderRow: "flex items-start justify-between gap-2 mb-4",
  detailDateLabel: "text-lg font-bold text-slate-900",
  detailWeekdayLabel: "text-xs text-slate-500 mt-0.5",

  statusBadgeBase: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0",
  statusWorking: "bg-emerald-100 text-emerald-700 border-emerald-200",
  statusDayOff: "bg-slate-100 text-slate-600 border-slate-200",
  statusHoliday: "bg-sky-100 text-sky-700 border-sky-200",
  statusSick: "bg-rose-100 text-rose-700 border-rose-200",

  teamLeaderBadge:
    "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200",

  detailInfoGrid: "grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4",
  infoTile: "rounded-xl bg-slate-50 border border-slate-100 p-3",
  infoTileLabel: "text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400",
  infoTileValue: "text-sm font-bold text-slate-900 mt-0.5",

  offDayWrap: "flex flex-col items-center justify-center text-center py-6",
  offDayIcon: "text-3xl mb-2 block",
  offDayText: "text-sm font-semibold text-slate-600",

  notesBox: "mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 flex items-start gap-2",
  notesIcon: "bi bi-sticky text-amber-500 mt-0.5",

  weekListWrap: "liquid-glass-surface rounded-2xl overflow-hidden relative p-1.5 sm:p-2",
  weekListRow: "flex items-center gap-3 rounded-xl bg-white/90 border border-slate-100 p-3 mb-1.5 last:mb-0 transition-shadow",
  weekListRowToday: "ring-2 ring-teal-400/60",
  weekListDateBlock: "flex flex-col items-center justify-center w-11 flex-shrink-0",
  weekListDateWeekday: "text-[0.6rem] font-semibold uppercase text-slate-400",
  weekListDateNumber: "text-lg font-bold text-slate-900 leading-none mt-0.5",
  weekListBody: "flex-1 min-w-0",
  weekListRouteRow: "flex items-center gap-2",
  weekListRoute: "text-sm font-semibold text-slate-900 truncate",
  weekListMeta: "text-xs text-slate-500 truncate mt-0.5",
} as const;
