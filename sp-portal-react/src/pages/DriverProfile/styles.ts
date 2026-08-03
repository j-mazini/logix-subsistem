/*
 * Class maps for the driver profile, in the same shape the other driver pages
 * use (one exported object of literal Tailwind strings — the JIT scanner reads
 * the file as text, so composing from the fragments below is safe).
 *
 * Two rules keep this readable as it grows:
 *  - every control shares FIELD_SURFACE / FIELD_FOCUS, so a field can't drift
 *    into its own border or focus colour;
 *  - only the section header carries a tone (SECTION_TONE), and the tone never
 *    reaches the inputs — the form stays one colour to fill in.
 */

const CARD = "liquid-glass-surface rounded-2xl overflow-hidden relative";

const FIELD_SURFACE =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white/80 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400";
const FIELD_FOCUS = "outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40";

/** Per-section colour, applied to the header badge only. */
export const SECTION_TONE = {
  violet: "bg-violet-500/10 text-violet-600",
  sky: "bg-sky-500/10 text-sky-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  slate: "bg-slate-500/10 text-slate-600",
};

export type SectionTone = keyof typeof SECTION_TONE;

export const driverProfileStyles = {
  /* ---- Page frame: identity on the left, form on the right from lg up ---- */
  layout: "lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-5 lg:items-start",
  identityColumn: "mb-4 lg:mb-0 lg:sticky lg:top-4",
  formColumn: "space-y-4 pb-4",

  /* ---- Identity card ---- */
  identityCard: CARD,
  coverWrap: "relative h-24 w-full bg-gradient-to-br from-violet-500/25 via-indigo-400/15 to-transparent",
  coverImage: "absolute inset-0 h-full w-full object-cover",
  coverButton:
    "absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white",
  identityBody: "relative px-4 pb-4",
  avatarWrap: "relative -mt-11 mb-3 h-20 w-20",
  avatarImage: "h-20 w-20 rounded-2xl border-4 border-white bg-slate-100 object-cover shadow-md",
  avatarFallback:
    "flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-violet-500/15 text-xl font-bold text-violet-600 shadow-md",
  avatarButton:
    "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition-colors hover:bg-violet-700",
  identityName: "text-lg font-bold leading-tight text-slate-900 truncate",
  identityMeta: "mt-0.5 text-xs text-slate-500 truncate",

  /* Contact lines read as a list, not as pills — a pill row wrapped badly
     once the email was longer than the card. */
  identityList: "mt-3 space-y-1.5 border-t border-slate-200/70 pt-3",
  identityListRow: "flex items-center gap-2 text-xs text-slate-600 min-w-0",
  identityListIcon: "shrink-0 text-slate-400",
  identityListValue: "truncate",
  identityRemovePhoto:
    "mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-rose-600",

  /* ---- Form sections ---- */
  sectionCard: `${CARD} p-4 sm:p-5`,
  sectionHeader: "flex items-start gap-2.5 border-b border-slate-200/70 pb-3 mb-4",
  sectionIcon: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
  sectionTitle: "text-base font-semibold leading-tight text-slate-900",
  sectionSubtitle: "mt-0.5 text-xs text-slate-500",

  fieldGrid: "grid gap-4 sm:grid-cols-2",
  fieldFullWidth: "sm:col-span-2",
  fieldWrap: "grid gap-1.5 min-w-0",
  fieldLabel: "text-sm font-medium text-slate-700",
  fieldInput: `h-10 px-3 ${FIELD_SURFACE} ${FIELD_FOCUS}`,
  fieldTextarea: `resize-y px-3 py-2 ${FIELD_SURFACE} ${FIELD_FOCUS}`,
  fieldHint: "text-[0.68rem] text-slate-400",

  /* Read-only values are not inputs: showing them as greyed-out fields kept
     inviting clicks. Rendered as a plain value with a lock instead. */
  fieldReadOnlyRow: "flex h-10 items-center gap-2 rounded-lg bg-slate-500/5 px-3",
  fieldReadOnlyValue: "min-w-0 flex-1 truncate text-sm font-medium text-slate-600",
  fieldReadOnlyIcon: "shrink-0 text-xs text-slate-400",

  /* ---- Save bar ---- */
  actionBar: `sticky bottom-[92px] md:bottom-28 z-20 flex flex-wrap items-center justify-end gap-2 ${CARD} p-3`,
  actionNote: "mr-auto flex items-center gap-1.5 text-xs font-medium text-amber-600",
  actionNoteSaved: "mr-auto flex items-center gap-1.5 text-xs font-medium text-slate-400",
  resetButton:
    "inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40",
  saveButton:
    "inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50",

  toast:
    "fixed left-1/2 bottom-[160px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg md:bottom-32",
  toastSuccess: "bg-emerald-600 text-white",
  toastError: "bg-rose-600 text-white",
};
