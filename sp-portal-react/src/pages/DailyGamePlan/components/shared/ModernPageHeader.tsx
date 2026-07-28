import React from 'react';

type ModernPageHeaderProps = {
    title: string;
    gradientFrom?: string;
    gradientTo?: string;
};

/**
 * Trimmed port of the Next.js app's `ModernPageHeader` — only the title/gradient
 * props Daily Game Plan actually passes were kept (no metrics/dashboard/actions).
 * `showUserCard` was dropped entirely: `PortalLayout` (this subsystem's shared page
 * chrome) already renders the admin user pill in its header row, so reusing
 * `UserCard` here would show it twice.
 */
export const ModernPageHeader: React.FC<ModernPageHeaderProps> = ({
    title,
    gradientFrom = 'slate-900',
    gradientTo = 'indigo-600',
}) => {
    const gradientClass =
        gradientFrom === 'slate-900' && gradientTo === 'blue-600'
            ? 'bg-gradient-to-br from-slate-900 to-blue-600'
            : 'bg-gradient-to-br from-slate-900 to-indigo-600';

    return (
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-4 shadow-md shadow-black/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-900/20 to-transparent opacity-60" />
            <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.14),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.10),transparent_50%)]" />
            </div>
            <h1 className="relative z-10 m-0 text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight">
                <span className={`${gradientClass} bg-clip-text text-transparent`}>{title}</span>
            </h1>
        </div>
    );
};

export default ModernPageHeader;
