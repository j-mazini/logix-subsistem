/*
 * Class maps for the driver profile, in the same shape the other driver pages
 * use (one exported object of literal Tailwind strings — the JIT scanner reads
 * the file as text, so composing from the fragments below is safe).
 *
 * Colours are not written here: every value is a `--pi-*` token from
 * styles/paper-ink.css, referenced through Tailwind's arbitrary-value syntax.
 * That is what makes this screen a pilot rather than a fork — re-tuning the
 * paper & ink finish means editing the token file, not this one.
 *
 * Two rules keep it readable as it grows:
 *  - every control shares FIELD_SURFACE / FIELD_FOCUS, so a field can't drift
 *    into its own border or focus colour;
 *  - only the section header carries a tone (SECTION_TONE), and the tone never
 *    reaches the inputs — the form stays one colour to fill in.
 */

const CARD =
  "rounded-[var(--pi-radius-lg)] border border-[var(--pi-rule)] bg-[var(--pi-surface)] shadow-[var(--pi-shadow-card)] overflow-hidden relative";

const FIELD_SURFACE =
  "w-full min-w-0 rounded-[var(--pi-radius-sm)] border border-[var(--pi-rule-strong)] bg-[var(--pi-surface)] text-sm text-[var(--pi-ink)] transition-colors placeholder:text-[var(--pi-ink-faint)]";
const FIELD_FOCUS =
  "outline-none focus:border-[var(--pi-accent)] focus:shadow-[var(--pi-focus-ring)]";

/** Section header badge tone. Muted on purpose: on paper, ink does the work. */
export const SECTION_TONE = {
  accent: "bg-[var(--pi-accent-soft)] text-[var(--pi-accent-ink)]",
  ok: "bg-[var(--pi-ok-soft)] text-[var(--pi-ok)]",
  warn: "bg-[var(--pi-warn-soft)] text-[var(--pi-warn)]",
  neutral: "bg-[var(--pi-pending-soft)] text-[var(--pi-pending)]",
};

export type SectionTone = keyof typeof SECTION_TONE;

/** Uppercase, spaced, small — the way a ledger heads a column. */
const LABEL =
  "text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-[var(--pi-ink-faint)]";

const DISPLAY = "font-[family-name:var(--pi-font-display)] tracking-[-0.01em] text-[var(--pi-ink)]";

export const driverProfileStyles = {
  /* ---- Masthead. Replaces PageHeroCard here: the shared hero is a glass card
     with a coloured glow, which on paper reads as a sticker. A rule and a
     serif title do the same job in the finish. ---- */
  /* Sides zeroed explicitly: this Tailwind build runs with preflight off, so
     `border-solid` alone turns on all four edges at the browser's default
     width and the masthead becomes a box. */
  masthead: "mb-5 border-solid border-x-0 border-t-0 border-b-2 border-[var(--pi-ink)] pb-3",
  mastheadEyebrow: `${LABEL} text-[var(--pi-accent-ink)]`,
  mastheadTitle: `mt-1 text-2xl sm:text-3xl leading-none ${DISPLAY}`,
  mastheadSubtitle: "mt-1.5 text-sm text-[var(--pi-ink-soft)]",

  /* ---- Page frame: identity on the left, form on the right from lg up ---- */
  layout: "lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-5 lg:items-start",
  identityColumn: "mb-4 lg:mb-0 lg:sticky lg:top-4",
  formColumn: "space-y-4 pb-4",

  /* ---- Identity card ---- */
  identityCard: CARD,
  coverWrap: "relative h-24 w-full border-b border-[var(--pi-rule)] bg-[var(--pi-surface-sunken)]",
  coverImage: "absolute inset-0 h-full w-full object-cover",
  coverButton:
    "absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-[var(--pi-radius-sm)] border border-[var(--pi-rule-strong)] bg-[var(--pi-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--pi-ink-soft)] transition-colors hover:text-[var(--pi-accent-ink)]",
  identityBody: "relative px-4 pb-4",
  avatarWrap: "relative -mt-11 mb-3 h-20 w-20",
  avatarImage:
    "h-20 w-20 rounded-[var(--pi-radius)] border-4 border-[var(--pi-surface)] bg-[var(--pi-surface-2)] object-cover shadow-[var(--pi-shadow-card)]",
  avatarFallback: `flex h-20 w-20 items-center justify-center rounded-[var(--pi-radius)] border-4 border-[var(--pi-surface)] bg-[var(--pi-accent-soft)] text-xl text-[var(--pi-accent-ink)] shadow-[var(--pi-shadow-card)] ${DISPLAY}`,
  avatarButton:
    "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-[var(--pi-radius-sm)] bg-[var(--pi-accent)] text-[var(--pi-ink-inverse)] shadow-[var(--pi-shadow-card)] transition-colors hover:bg-[var(--pi-accent-ink)]",
  identityName: `text-xl leading-tight truncate ${DISPLAY}`,
  identityMeta: `mt-1 truncate ${LABEL}`,

  /* Contact lines read as a list, not as pills — a pill row wrapped badly
     once the email was longer than the card. */
  identityList: "mt-3 space-y-1.5 border-t border-[var(--pi-rule)] pt-3",
  identityListRow: "flex items-center gap-2 text-xs text-[var(--pi-ink-soft)] min-w-0",
  identityListIcon: "shrink-0 text-[var(--pi-ink-faint)]",
  identityListValue: "truncate font-[family-name:var(--pi-font-mono)]",
  identityRemovePhoto:
    "mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pi-ink-faint)] transition-colors hover:text-[var(--pi-danger)]",

  /* ---- Form sections ---- */
  sectionCard: `${CARD} p-4 sm:p-5`,
  sectionHeader: "flex items-start gap-2.5 border-b border-[var(--pi-rule)] pb-3 mb-4",
  sectionIcon: "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--pi-radius-sm)]",
  sectionTitle: `text-base leading-tight ${DISPLAY}`,
  sectionSubtitle: "mt-0.5 text-xs text-[var(--pi-ink-soft)]",

  fieldGrid: "grid gap-4 sm:grid-cols-2",
  fieldFullWidth: "sm:col-span-2",
  fieldWrap: "grid gap-1.5 min-w-0",
  fieldLabel: LABEL,
  fieldInput: `h-10 px-3 font-[family-name:var(--pi-font-mono)] ${FIELD_SURFACE} ${FIELD_FOCUS}`,
  fieldTextarea: `resize-y px-3 py-2 ${FIELD_SURFACE} ${FIELD_FOCUS}`,
  fieldHint: "text-[0.68rem] italic text-[var(--pi-ink-faint)]",

  /* Read-only values are not inputs: showing them as greyed-out fields kept
     inviting clicks. Rendered as a plain value with a lock instead. */
  fieldReadOnlyRow:
    "flex h-10 items-center gap-2 rounded-[var(--pi-radius-sm)] border border-dashed border-[var(--pi-rule-strong)] bg-[var(--pi-surface-2)] px-3",
  fieldReadOnlyValue:
    "min-w-0 flex-1 truncate font-[family-name:var(--pi-font-mono)] text-sm text-[var(--pi-ink-soft)]",
  fieldReadOnlyIcon: "shrink-0 text-xs text-[var(--pi-ink-faint)]",

  /* ---- Save bar ---- */
  actionBar: `sticky bottom-[92px] md:bottom-28 z-20 flex flex-wrap items-center justify-end gap-2 ${CARD} p-3`,
  actionNote: `mr-auto flex items-center gap-1.5 ${LABEL} text-[var(--pi-warn)]`,
  actionNoteSaved: `mr-auto flex items-center gap-1.5 ${LABEL}`,
  resetButton:
    "inline-flex items-center gap-2 rounded-[var(--pi-radius-sm)] border border-[var(--pi-rule-strong)] bg-[var(--pi-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--pi-ink-soft)] transition-colors hover:bg-[var(--pi-surface-2)] disabled:cursor-not-allowed disabled:opacity-40",
  saveButton:
    "inline-flex items-center gap-2 rounded-[var(--pi-radius-sm)] bg-[var(--pi-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--pi-ink-inverse)] shadow-[var(--pi-shadow-card)] transition-colors hover:bg-[var(--pi-accent-ink)] disabled:cursor-not-allowed disabled:opacity-50",

  toast:
    "fixed left-1/2 bottom-[160px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-[var(--pi-radius-sm)] px-4 py-2.5 text-sm font-semibold shadow-[var(--pi-shadow-modal)] md:bottom-32",
  toastSuccess: "bg-[var(--pi-ok)] text-[var(--pi-ink-inverse)]",
  toastError: "bg-[var(--pi-danger)] text-[var(--pi-ink-inverse)]",
};
