import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MobilePageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Search bar hidden unless both are provided. */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Extra elements (e.g. chip filters) between the title and content. */
  filters?: ReactNode;
  className?: string;
}

/**
 * Mobile layout for private-area pages: grouped content with a search/filter
 * bar. Visible only below `md` (`block md:hidden`) — pair with a `hidden
 * md:block` desktop version.
 */
export function MobilePageShell({
  children,
  title,
  subtitle,
  searchPlaceholder,
  searchValue = "",
  onSearchChange,
  filters,
  className,
}: MobilePageShellProps) {
  const showSearch = searchPlaceholder != null && onSearchChange != null;

  return (
    <main className={cn("block md:hidden pt-4 pb-20 px-3 sm:px-4 space-y-3 min-h-screen", className)}>
      <div className="h-[env(safe-area-inset-top,0px)] min-h-[env(safe-area-inset-top,0px)]" aria-hidden />

      {(title || subtitle) && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl px-4 py-3 shadow-md shadow-black/5">
          {title && <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      {showSearch && (
        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <i className="bi bi-search text-sm" aria-hidden />
            </span>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 h-9 text-sm bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
              aria-label={searchPlaceholder}
            />
          </div>
        </div>
      )}

      {filters && <div className="flex flex-wrap gap-2">{filters}</div>}

      <div className="space-y-3">{children}</div>

      <div className="h-[env(safe-area-inset-bottom,0px)] min-h-[env(safe-area-inset-bottom,0px)]" aria-hidden />
    </main>
  );
}
