import React from 'react';

type ServicePartnerBadgeProps = {
    partnerName?: string | null;
    size?: 'xs' | 'sm' | 'md';
    className?: string;
};

/**
 * Port of the Next.js app's `ServicePartnerBadge`. The original uses a Radix
 * `Tooltip` for the hover card; this subsystem has no Radix dependency (same as the
 * rest of this port), so it falls back to the native `title` attribute — same
 * information, shown by the browser on hover, no extra dependency.
 */
export function ServicePartnerBadge({ partnerName, size = 'xs', className = '' }: ServicePartnerBadgeProps) {
    const tooltipText = (partnerName ?? '').trim() || 'Service Partner';
    const sizeClass = size === 'md' ? 'dgp-sp-badge--md' : size === 'sm' ? 'dgp-sp-badge--sm' : 'dgp-sp-badge--xs';

    return (
        <span
            role="img"
            aria-label={`Service Partner: ${tooltipText}`}
            title={tooltipText}
            className={`dgp-sp-badge ${sizeClass} ${className}`}
        >
            SP
        </span>
    );
}

export default ServicePartnerBadge;
