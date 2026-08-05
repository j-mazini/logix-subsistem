/**
 * v2.0 driver visual identity: each of the 8 driver sections gets its own
 * accent color, applied consistently to its PageHeroCard icon badge and its
 * nav bar icon when active. Tailwind's JIT scanner only picks up class names
 * it can find literally in source, so these must stay full literal strings
 * (not built with template interpolation) or the utilities never get generated.
 */
export type AccentKey =
  | "blue"
  | "violet"
  | "rose"
  | "amber"
  | "emerald"
  | "cyan"
  | "indigo"
  | "fuchsia"
  | "teal"
  | "slate"
  | "orange";

export const ACCENT_BADGE: Record<AccentKey, string> = {
  blue: "bg-blue-500/15 text-blue-600",
  violet: "bg-violet-500/15 text-violet-600",
  rose: "bg-rose-500/15 text-rose-600",
  amber: "bg-amber-500/15 text-amber-600",
  emerald: "bg-emerald-500/15 text-emerald-600",
  cyan: "bg-cyan-500/15 text-cyan-600",
  indigo: "bg-indigo-500/15 text-indigo-600",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-600",
  teal: "bg-teal-500/15 text-teal-600",
  slate: "bg-slate-500/15 text-slate-600",
  orange: "bg-orange-500/15 text-orange-600",
};

export const ACCENT_TEXT: Record<AccentKey, string> = {
  blue: "text-blue-600",
  violet: "text-violet-600",
  rose: "text-rose-600",
  amber: "text-amber-600",
  emerald: "text-emerald-600",
  cyan: "text-cyan-600",
  indigo: "text-indigo-600",
  fuchsia: "text-fuchsia-600",
  teal: "text-teal-600",
  slate: "text-slate-600",
  orange: "text-orange-600",
};

export const ACCENT_DOT: Record<AccentKey, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  cyan: "bg-cyan-500",
  indigo: "bg-indigo-500",
  fuchsia: "bg-fuchsia-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
  orange: "bg-orange-500",
};

export const ACCENT_GLOW: Record<AccentKey, string> = {
  blue: "from-blue-500/15 via-sky-400/10 to-transparent",
  violet: "from-violet-500/15 via-purple-400/10 to-transparent",
  rose: "from-rose-500/15 via-pink-400/10 to-transparent",
  amber: "from-amber-500/15 via-yellow-400/10 to-transparent",
  emerald: "from-emerald-500/15 via-teal-400/10 to-transparent",
  cyan: "from-cyan-500/15 via-sky-400/10 to-transparent",
  indigo: "from-indigo-500/15 via-blue-400/10 to-transparent",
  fuchsia: "from-fuchsia-500/15 via-pink-400/10 to-transparent",
  teal: "from-teal-500/15 via-cyan-400/10 to-transparent",
  slate: "from-slate-500/15 via-slate-400/10 to-transparent",
  orange: "from-orange-500/15 via-amber-400/10 to-transparent",
};
