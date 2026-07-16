'use client';

import { useEffect } from 'react';

/**
 * Port of logix-subsistem/refinements-v3-motion.js — scroll-reveal cascade,
 * KPI count-up, and card hover glow. Pure DOM class/style toggling, safe to
 * run once after each page's content mounts.
 */
export function useMotionRefinements(deps: React.DependencyList = []) {
  useEffect(() => {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const REVEAL_SELECTORS = [
      '.dashboard-header', '.admin-header', '.sp-vendor-header', '.vendor-page-header',
      '.dashboard-kpi-card', '.vendor-page-metric', '.dashboard-section', '.dashboard-block',
      '.dashboard-compliance-card', '.sp-folder-panel', '.sp-dashboard-carousel-block',
      '.vendor-table-wrap', '.comm-item', '.sop-post-card', '.access-select-card', '.card',
    ].join(',');

    const GLOW_SELECTORS = [
      '.dashboard-kpi-card', '.dashboard-compliance-card', '.dashboard-block',
      '.sp-folder-panel', '.vendor-table-wrap', '.access-select-card', '.card',
    ].join(',');

    const COUNT_SELECTORS = ['.dashboard-kpi-value', '.vendor-page-metric-value', '.sp-live-kpi-value', '.sfb-stat-val'].join(',');

    const REVEAL_DURATION = 650;
    const STAGGER_STEP = 65;
    const STAGGER_CAP = 8;

    const cleanups: (() => void)[] = [];

    function setupReveal() {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS));
      const targets = candidates.filter((el) => {
        let parent = el.parentElement;
        while (parent) {
          if (candidates.indexOf(parent) !== -1) return false;
          parent = parent.parentElement;
        }
        return true;
      });
      if (!targets.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          visible.forEach((entry, i) => {
            const el = entry.target as HTMLElement;
            observer.unobserve(el);
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
        observer.observe(el);
      });
      cleanups.push(() => observer.disconnect());
    }

    const NUMERIC_RE = /^([^\d-]*)(-?[\d.,]+)(.*)$/;
    function parseNumeric(text: string) {
      const match = NUMERIC_RE.exec(text.trim());
      if (!match) return null;
      const raw = match[2];
      const normalized = raw.replace(/,/g, '');
      const value = parseFloat(normalized);
      if (!isFinite(value)) return null;
      const decimalPart = normalized.split('.')[1];
      return { prefix: match[1], suffix: match[3], value, decimals: decimalPart ? decimalPart.length : 0, grouped: raw.indexOf(',') !== -1 };
    }

    function formatNumeric(value: number, spec: ReturnType<typeof parseNumeric>) {
      if (!spec) return String(value);
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
        lastWritten = progress < 1 ? formatNumeric(spec.value * eased, spec) : original;
        el.textContent = lastWritten;
        if (progress < 1) requestAnimationFrame(frame);
        else el.classList.remove('v3-counting');
      }
      requestAnimationFrame(frame);
    }

    function setupCountUp() {
      const values = document.querySelectorAll<HTMLElement>(COUNT_SELECTORS);
      if (!values.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            if (parseNumeric(el.textContent || '')) {
              observer.unobserve(el);
              countUp(el);
            } else if (!el.dataset.v3CountWatch) {
              el.dataset.v3CountWatch = '1';
              const mo = new MutationObserver(() => {
                if (parseNumeric(el.textContent || '')) {
                  mo.disconnect();
                  observer.unobserve(el);
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

      values.forEach((el) => observer.observe(el));
      cleanups.push(() => observer.disconnect());
    }

    function setupGlow() {
      if (!finePointer) return;
      document.querySelectorAll<HTMLElement>(GLOW_SELECTORS).forEach((el) => {
        if (el.classList.contains('v3-glow')) return;
        if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.classList.add('v3-glow');
      });
    }

    document.body.classList.add('v3-motion');
    setupReveal();
    setupCountUp();
    setupGlow();

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
