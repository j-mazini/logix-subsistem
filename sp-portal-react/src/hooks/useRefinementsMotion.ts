import { useEffect } from 'react';

/**
 * Port of refinements-v3-motion.js: cascade reveal (IntersectionObserver),
 * KPI count-up, and hover hairline glow. A no-op on pages with none of the
 * matched selectors (e.g. SP Profile today), but ported now so pages that
 * do use dashboard/table/card markup get the same behavior once migrated.
 * With prefers-reduced-motion or no IntersectionObserver support, this does
 * nothing — the page stays fully visible, same as the original script.
 */
const REVEAL_SELECTORS = [
  '.dashboard-header',
  '.admin-header',
  '.sp-vendor-header',
  '.vendor-page-header',
  '.dashboard-kpi-card',
  '.vendor-page-metric',
  '.dashboard-section',
  '.dashboard-block',
  '.dashboard-compliance-card',
  '.sp-folder-panel',
  '.sp-dashboard-carousel-block',
  '.vendor-table-wrap',
  '.comm-item',
  '.sop-post-card',
  '.access-select-card',
  '.card',
].join(',');

const GLOW_SELECTORS = [
  '.dashboard-kpi-card',
  '.dashboard-compliance-card',
  '.dashboard-block',
  '.sp-folder-panel',
  '.vendor-table-wrap',
  '.access-select-card',
  '.card',
].join(',');

const COUNT_SELECTORS = ['.dashboard-kpi-value', '.vendor-page-metric-value', '.sp-live-kpi-value', '.sfb-stat-val'].join(',');

const REVEAL_DURATION = 650;
const STAGGER_STEP = 65;
const STAGGER_CAP = 8;

const NUMERIC_RE = /^([^\d-]*)(-?[\d.,]+)(.*)$/;

interface NumericSpec {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  grouped: boolean;
}

function parseNumeric(text: string): NumericSpec | null {
  const match = NUMERIC_RE.exec(text.trim());
  if (!match) return null;
  const raw = match[2];
  const normalized = raw.replace(/,/g, '');
  const value = parseFloat(normalized);
  if (!isFinite(value)) return null;
  const decimalPart = normalized.split('.')[1];
  return {
    prefix: match[1],
    suffix: match[3],
    value,
    decimals: decimalPart ? decimalPart.length : 0,
    grouped: raw.indexOf(',') !== -1,
  };
}

function formatNumeric(value: number, spec: NumericSpec): string {
  let fixed = value.toFixed(spec.decimals);
  if (spec.grouped) {
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    fixed = parts.join('.');
  }
  return spec.prefix + fixed + spec.suffix;
}

function countUp(el: HTMLElement) {
  if (el.dataset.v3Counted) return;
  const original = el.textContent || '';
  const spec = parseNumeric(original);
  if (!spec || spec.value === 0) return;

  el.dataset.v3Counted = '1';
  el.classList.add('v3-counting');

  const duration = 850;
  let start: number | null = null;
  let lastWritten: string | null = null;

  function frame(ts: number) {
    if (lastWritten !== null && el.textContent !== lastWritten) {
      el.classList.remove('v3-counting');
      return;
    }
    if (start === null) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    lastWritten = progress < 1 ? formatNumeric(spec!.value * eased, spec!) : original;
    el.textContent = lastWritten;
    if (progress < 1) requestAnimationFrame(frame);
    else el.classList.remove('v3-counting');
  }

  requestAnimationFrame(frame);
}

export function useRefinementsMotion(): void {
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    document.body.classList.add('v3-motion');

    const cleanups: Array<() => void> = [];

    // Reveal in cascade
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS));
    const targets = candidates.filter((el) => {
      let parent = el.parentElement;
      while (parent) {
        if (candidates.includes(parent as HTMLElement)) return false;
        parent = parent.parentElement;
      }
      return true;
    });

    if (targets.length) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          visible.forEach((entry, i) => {
            const el = entry.target as HTMLElement;
            revealObserver.unobserve(el);
            const idx = Math.min(i, STAGGER_CAP);
            el.style.setProperty('--v3-i', String(idx));
            requestAnimationFrame(() => el.classList.add('v3-in'));
            window.setTimeout(() => {
              el.classList.add('v3-done');
              el.classList.remove('v3-reveal', 'v3-in');
              el.style.removeProperty('--v3-i');
            }, REVEAL_DURATION + idx * STAGGER_STEP + 150);
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
      );

      targets.forEach((el) => {
        el.classList.add('v3-reveal');
        revealObserver.observe(el);
      });
      cleanups.push(() => revealObserver.disconnect());
    }

    // Count-up
    const values = document.querySelectorAll<HTMLElement>(COUNT_SELECTORS);
    if (values.length) {
      const countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            if (parseNumeric(el.textContent || '')) {
              countObserver.unobserve(el);
              countUp(el);
            } else if (!el.dataset.v3CountWatch) {
              el.dataset.v3CountWatch = '1';
              const mo = new MutationObserver(() => {
                if (parseNumeric(el.textContent || '')) {
                  mo.disconnect();
                  countObserver.unobserve(el);
                  countUp(el);
                }
              });
              mo.observe(el, { childList: true, characterData: true, subtree: true });
              window.setTimeout(() => mo.disconnect(), 6000);
            }
          });
        },
        { threshold: 0.4 },
      );
      values.forEach((el) => countObserver.observe(el));
      cleanups.push(() => countObserver.disconnect());
    }

    // Hover hairline glow
    if (finePointer) {
      document.querySelectorAll<HTMLElement>(GLOW_SELECTORS).forEach((el) => {
        if (el.classList.contains('v3-glow')) return;
        if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.classList.add('v3-glow');
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);
}
