import { ACCENT_BADGE, ACCENT_GLOW, type AccentKey } from "./accentColors";

interface PageHeroCardProps {
  /** Bootstrap icon class, e.g. "bi-calendar-event" — kept the same as this page's MobileNavBar/DesktopNavBar tab icon so the identity matches. */
  icon: string;
  title: string;
  subtitle?: string;
  /** Per-section color identity — matches this page's nav tab accent. Defaults to the original indigo look. */
  accent?: AccentKey;
}

/** Shared page-identity card (icon badge + title + subtitle) for the driver pages — same liquid-glass treatment as My Route's own header, colored per-section. */
export function PageHeroCard({ icon, title, subtitle, accent = "indigo" }: PageHeroCardProps) {
  return (
    <div className="liquid-glass-surface rounded-2xl overflow-hidden relative mb-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${ACCENT_GLOW[accent]} pointer-events-none`} aria-hidden="true" />
      <div className="relative z-10 flex items-center gap-3 p-4 sm:p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT_BADGE[accent]}`}>
          <i className={`bi ${icon} text-xl leading-none`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
