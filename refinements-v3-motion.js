/**
 * Refinements v3.0 – Motion engine
 * Reveal em cascata (IntersectionObserver), count-up dos KPIs e hairline
 * de hover nos cards. Par de refinements-v3-motion.css.
 * Carregar com defer, depois dos scripts da página.
 *
 * Segurança: com prefers-reduced-motion ou sem IntersectionObserver o script
 * não altera nada — a página fica estática e totalmente visível.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var REVEAL_SELECTORS = [
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
    '.card'
  ].join(',');

  var GLOW_SELECTORS = [
    '.dashboard-kpi-card',
    '.dashboard-compliance-card',
    '.dashboard-block',
    '.sp-folder-panel',
    '.vendor-table-wrap',
    '.access-select-card',
    '.card'
  ].join(',');

  var COUNT_SELECTORS = [
    '.dashboard-kpi-value',
    '.vendor-page-metric-value',
    '.sp-live-kpi-value',
    '.sfb-stat-val'
  ].join(',');

  var REVEAL_DURATION = 650;
  var STAGGER_STEP = 65;
  var STAGGER_CAP = 8;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* ---------- Reveal em cascata ---------- */
  function setupReveal() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SELECTORS));

    // Evitar animação dupla: descartar elementos com um antepassado já animado.
    var targets = candidates.filter(function (el) {
      var parent = el.parentElement;
      while (parent) {
        if (candidates.indexOf(parent) !== -1) return false;
        parent = parent.parentElement;
      }
      return true;
    });

    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });

      visible.forEach(function (entry, i) {
        var el = entry.target;
        observer.unobserve(el);
        var idx = Math.min(i, STAGGER_CAP);
        el.style.setProperty('--v3-i', idx);
        requestAnimationFrame(function () {
          el.classList.add('v3-in');
        });
        window.setTimeout(function () {
          el.classList.add('v3-done');
          el.classList.remove('v3-reveal', 'v3-in');
          el.style.removeProperty('--v3-i');
        }, REVEAL_DURATION + idx * STAGGER_STEP + 150);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

    targets.forEach(function (el) {
      el.classList.add('v3-reveal');
      observer.observe(el);
    });
  }

  /* ---------- Count-up dos valores numéricos ---------- */
  var NUMERIC_RE = /^([^\d\-]*)(-?[\d.,]+)(.*)$/;

  function parseNumeric(text) {
    var match = NUMERIC_RE.exec(text.trim());
    if (!match) return null;
    var raw = match[2];
    var normalized = raw.replace(/,/g, '');
    var value = parseFloat(normalized);
    if (!isFinite(value)) return null;
    var decimalPart = normalized.split('.')[1];
    return {
      prefix: match[1],
      suffix: match[3],
      value: value,
      decimals: decimalPart ? decimalPart.length : 0,
      grouped: raw.indexOf(',') !== -1
    };
  }

  function formatNumeric(value, spec) {
    var fixed = value.toFixed(spec.decimals);
    if (spec.grouped) {
      var parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      fixed = parts.join('.');
    }
    return spec.prefix + fixed + spec.suffix;
  }

  function countUp(el) {
    if (el.dataset.v3Counted) return;
    var original = el.textContent;
    var spec = parseNumeric(original);
    if (!spec || spec.value === 0) return;

    el.dataset.v3Counted = '1';
    el.classList.add('v3-counting');

    var duration = 850;
    var start = null;
    var lastWritten = null;

    function frame(ts) {
      // Se a página reescreveu o valor durante a animação, ceder imediatamente.
      if (lastWritten !== null && el.textContent !== lastWritten) {
        el.classList.remove('v3-counting');
        return;
      }
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      lastWritten = progress < 1 ? formatNumeric(spec.value * eased, spec) : original;
      el.textContent = lastWritten;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.classList.remove('v3-counting');
      }
    }

    requestAnimationFrame(frame);
  }

  function setupCountUp() {
    var values = document.querySelectorAll(COUNT_SELECTORS);
    if (!values.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (parseNumeric(el.textContent || '')) {
          observer.unobserve(el);
          countUp(el);
        } else if (!el.dataset.v3CountWatch) {
          // Valor ainda não preenchido pela página: animar no primeiro preenchimento.
          el.dataset.v3CountWatch = '1';
          var mo = new MutationObserver(function () {
            if (parseNumeric(el.textContent || '')) {
              mo.disconnect();
              observer.unobserve(el);
              countUp(el);
            }
          });
          mo.observe(el, { childList: true, characterData: true, subtree: true });
          window.setTimeout(function () { mo.disconnect(); }, 6000);
        }
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(values, function (el) {
      observer.observe(el);
    });
  }

  /* ---------- Hairline de hover no topo dos cards ---------- */
  function setupGlow() {
    if (!finePointer) return;

    Array.prototype.forEach.call(document.querySelectorAll(GLOW_SELECTORS), function (el) {
      if (el.classList.contains('v3-glow')) return;
      if (window.getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      el.classList.add('v3-glow');
    });
  }

  ready(function () {
    document.body.classList.add('v3-motion');
    setupReveal();
    setupCountUp();
    setupGlow();
  });
})();
