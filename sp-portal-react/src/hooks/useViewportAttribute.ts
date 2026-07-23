import { useEffect } from 'react';

/**
 * Port of sp-portal-responsive.js: sets data-viewport (xs|sm|md|lg|xl) on
 * <html>, which sp-portal.css reads for responsive padding. Runs once at
 * app root — matches the original's single global listener.
 */
const BREAKPOINTS = { sm: 576, md: 768, lg: 992, xl: 1200 };

function getViewportSize(): string {
  const w = window.innerWidth || document.documentElement.clientWidth || 0;
  if (w >= BREAKPOINTS.xl) return 'xl';
  if (w >= BREAKPOINTS.lg) return 'lg';
  if (w >= BREAKPOINTS.md) return 'md';
  if (w >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

export function useViewportAttribute(): void {
  useEffect(() => {
    const root = document.documentElement;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    function applyViewport() {
      const v = getViewportSize();
      if (root.getAttribute('data-viewport') !== v) {
        root.setAttribute('data-viewport', v);
      }
    }

    function onResize() {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        applyViewport();
        resizeTimeout = null;
      }, 100);
    }

    function onOrientationChange() {
      setTimeout(applyViewport, 50);
    }

    applyViewport();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientationChange);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);
}
