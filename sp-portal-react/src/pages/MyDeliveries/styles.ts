export const myDeliveriesStyles = {
  pageContent: "space-y-4 pb-4",

  headerCard:
    "liquid-glass-surface rounded-2xl overflow-hidden relative p-4 sm:p-5 mb-4",
  headerGlow: "absolute inset-0 bg-gradient-to-br from-fuchsia-500/15 via-pink-400/10 to-transparent pointer-events-none",
  headerTopRow: "relative z-10 flex items-center gap-3",
  headerIconBadge: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600",
  headerTitle: "text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate",
  headerTitleIcon: "bi bi-signpost-split-fill text-xl leading-none",
  headerSubtitle: "text-xs sm:text-sm text-slate-500 mt-0.5 truncate",
  headerStatsRow: "relative z-10 flex gap-3 mt-4",
  headerStat: "flex-1 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center",
  headerStatValue: "text-xl font-bold text-slate-900 leading-none",
  headerStatLabel: "text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 mt-1 block",

  hint: "flex items-center gap-2 text-xs text-slate-500 mb-2 px-1",
  hintIcon: "bi bi-info-circle text-indigo-500",

  groupSection: "mb-3 last:mb-0",
  groupHeader: "flex items-center justify-between gap-2 px-1 pb-1.5",
  groupHeaderCode: "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600",
  groupHeaderIcon: "bi bi-geo-alt-fill text-indigo-500 text-xs",
  groupHeaderActions: "flex items-center gap-1",
  groupMoveButton:
    "flex h-8 w-6 -my-1.5 items-center justify-center leading-none text-slate-300 hover:text-indigo-600 disabled:opacity-20 disabled:pointer-events-none transition-colors text-[0.75rem]",
  groupDragHandle:
    "flex h-8 w-7 -my-1.5 items-center justify-center rounded text-slate-300 hover:text-indigo-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing select-none touch-none text-sm",

  // "route-dash" style stat trio, same idea as Route Balance's own
  // per-route dash tiles (Deliveries / Pickups / Total Stops).
  groupStatsRow: "flex gap-1.5 px-1 pb-2",
  groupStatTile: "flex-1 rounded-lg bg-white/70 border border-slate-100 py-1 text-center",
  groupStatValue: "text-sm font-bold text-slate-900 leading-none block",
  groupStatLabel: "text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400 mt-0.5 block",

  groupListWrap: "rounded-2xl liquid-glass-surface overflow-hidden relative p-1.5",

  // No cursor-grab/touch-none on the row itself anymore — only the handle
  // button below captures drag gestures, so touching/scrolling the rest of
  // the row (postcode, badges, etc.) behaves like normal page content and
  // doesn't fight the list's vertical scroll on a phone.
  stopCard:
    "flex items-center gap-2 rounded-lg bg-white/95 border border-slate-100 py-1.5 px-2 mb-1 last:mb-0 shadow-sm",
  stopSequence:
    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[0.7rem] font-bold",
  stopDragHandleButton:
    "flex h-8 w-7 -my-1 flex-shrink-0 items-center justify-center rounded cursor-grab active:cursor-grabbing select-none touch-none hover:bg-slate-100",
  stopDragHandle: "bi bi-grip-vertical text-slate-300 text-base",
  stopBody: "flex-1 min-w-0 flex items-center gap-1.5",
  stopPostcode: "flex-1 min-w-0 text-[0.85rem] font-semibold text-slate-900 truncate",

  typeBadgeBase: "inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase",
  typeBadgeDel: "bg-blue-100 text-blue-700",
  typeBadgePu: "bg-emerald-100 text-emerald-700",

  tagDotsWrap: "flex items-center gap-0.5 flex-shrink-0",
  tagDotBase: "h-1.5 w-1.5 rounded-full",
  tagDotPre12: "bg-indigo-500",
  tagDotAsr: "bg-amber-500",
  tagDotDsr: "bg-purple-500",

  piecesBadge: "text-[0.7rem] font-semibold text-slate-400 flex-shrink-0 w-6 text-right",

  reorderButtons: "flex flex-col flex-shrink-0",
  reorderButton:
    "flex h-4 w-6 items-center justify-center leading-none text-slate-300 hover:text-indigo-600 disabled:opacity-20 disabled:pointer-events-none transition-colors text-[0.75rem]",

  emptyState: "text-center text-slate-500 py-10",
  emptyStateIcon: "bi bi-check-circle text-3xl mb-2 text-emerald-400 block",
} as const;
