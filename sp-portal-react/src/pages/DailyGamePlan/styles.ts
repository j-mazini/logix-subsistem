export const dailyGamePlanStyles = {
  pageContainer: "relative z-0 min-h-screen",

  tableRow: "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group",
  tableCell: "px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm",
  tableCellCenter: "px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 whitespace-nowrap text-center text-xs sm:text-sm",
  tableCellLeft: "px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 whitespace-nowrap text-left align-middle text-xs sm:text-sm",

  routeBadge: "inline-flex max-w-full px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold text-xs sm:text-sm border border-blue-200",
  routeBadgeText: "truncate",

  vendorName: "text-xs sm:text-sm font-bold text-gray-900",
  vendorType: "text-[10px] sm:text-xs text-gray-500",

  statusBadge: "inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-sm border",
  statusBadgeWorking: "bg-green-100 text-green-800 border-green-300",
  statusBadgeOff: "bg-red-100 text-red-800 border-red-300",
  statusBadgePending: "bg-yellow-100 text-yellow-800 border-yellow-300",

  notesField: "font-sans w-[min(9rem,38vw)] sm:w-[min(11rem,42vw)] min-h-[42px] sm:min-h-[50px] rounded-lg border border-yellow-200/60 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-[0_8px_18px_rgba(0,0,0,0.06)] bg-[linear-gradient(135deg,#FFFBEB_0%,#FEF9E7_82%,#FEF3C7_82%,#FEF3C7_100%)] rotate-[-1deg] text-left overflow-hidden cursor-pointer hover:border-yellow-300/70 hover:shadow-[0_10px_22px_rgba(0,0,0,0.1)] transition",
  notesFieldWrapper: "flex flex-col items-start justify-center h-full",
  notesFieldText: "font-sans line-clamp-2 whitespace-pre-wrap text-xs sm:text-sm",
  notesFieldPlaceholder: "text-slate-400 text-xs sm:text-sm",

  actionButton: "p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
  actionButtonEdit: "text-blue-600 hover:bg-blue-100",
  actionButtonDelete: "text-red-600 hover:bg-red-100",
  actionButtonIcon: "w-5 h-5",

  depositHeaderContainer: "relative overflow-hidden rounded-3xl p-5 w-full group cursor-default border border-slate-200/60 bg-gradient-to-b from-white to-indigo-50/70 backdrop-blur-sm shadow-lg shadow-slate-200/40",
  depositHeaderContainerEmbedded: "relative overflow-hidden rounded-t-xl p-4 w-full group cursor-default bg-gradient-to-b from-white to-indigo-50/70 backdrop-blur-sm border-b border-slate-200/60",
  depositHeaderRounded: "rounded-3xl",
  depositHeaderRoundedEmbedded: "rounded-t-xl",
  depositHeaderHighlight: "absolute inset-0 pointer-events-none",
  depositHeaderGradientOverlay: "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(135deg,rgba(99,102,241,0.14)_0%,rgba(139,92,246,0.14)_50%,rgba(236,72,153,0.14)_100%)]",
  depositHeaderLightEffect: "absolute rounded-full opacity-30 blur-3xl pointer-events-none",
  depositHeaderSheen: "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(800px_200px_at_20%_0%,rgba(255,255,255,0.35),transparent_55%)]",
  depositHeaderContent: "relative z-10 flex items-center justify-between",
  depositHeaderLeft: "flex items-center gap-3",
  depositHeaderIcon: "flex items-center justify-center w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm",
  depositHeaderIconSvg: "w-6 h-6 text-slate-700",
  depositHeaderTitle: "text-2xl font-semibold text-slate-900 tracking-tight mb-1 antialiased",
  depositHeaderTitleEmbedded: "text-xl font-semibold text-slate-900 tracking-tight mb-1 antialiased",
  depositHeaderBadge: "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700",
  depositHeaderBadgeDot: "h-1.5 w-1.5 rounded-full bg-slate-500",
  depositHeaderRight: "flex flex-wrap items-center justify-end gap-3",
  depositHeaderCollapseButton: "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white",
  depositHeaderCollapseIcon: "h-5 w-5",
  depositHeaderActionButton: "relative rounded-2xl px-6 py-2.5",
  depositHeaderActionButtonContent: "relative z-10 inline-flex items-center gap-2.5",
  depositHeaderActionButtonIcon: "w-5 h-5 text-slate-700",
  depositHeaderAccentBar: "absolute bottom-0 left-0 right-0 h-1 bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.35),rgba(139,92,246,0.35),rgba(236,72,153,0.35),transparent)]",
  depositHeaderAccentBarEmbedded: "absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.35),rgba(139,92,246,0.35),rgba(236,72,153,0.35),transparent)]",

  depositNotesField: "font-sans w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none",
  depositNotesButton: "font-sans px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",

  selectWrapper: "daily-game-plan-select-wrapper",
} as const;
