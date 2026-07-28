import React from 'react';

type VrnPlateProps = {
    vrn?: string | null;
    className?: string;
    size?: 'xs' | 'sm' | 'md';
    showBadge?: boolean;
    badgeVariant?: 'blue' | 'green';
};

function formatUkVrn(input?: string | null): string {
    const raw = String(input ?? '').trim();
    if (!raw) return 'N/A';
    if (raw.toUpperCase() === 'NOVEHICLE') return 'NOVEHICLE';
    if (/\s/.test(raw)) return raw.toUpperCase().replace(/\s+/g, ' ');
    const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length >= 6) return `${s.slice(0, s.length - 3)} ${s.slice(-3)}`;
    return s;
}

/** Faithful port of the Next.js app's `VrnPlate` (yellow UK-plate chip). */
export function VrnPlate({ vrn, className = '', size = 'md', showBadge = true, badgeVariant = 'blue' }: VrnPlateProps) {
    const text = formatUkVrn(vrn);
    const sizeClass = size === 'xs' ? 'dgp-vrn--xs' : size === 'sm' ? 'dgp-vrn--sm' : 'dgp-vrn--md';

    return (
        <span className={`dgp-vrn ${sizeClass} ${className}`} title={text} aria-label={`VRN ${text}`}>
            {showBadge && (
                <span className={`dgp-vrn__badge ${badgeVariant === 'green' ? 'is-green' : 'is-blue'}`}>UK</span>
            )}
            <span className="dgp-vrn__text">{text}</span>
        </span>
    );
}

export default VrnPlate;
