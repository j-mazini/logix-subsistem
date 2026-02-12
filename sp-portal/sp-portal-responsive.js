/**
 * Componente de redimensionamento – adapta o conteúdo ao tamanho da tela.
 * Define data-viewport no root (sm | md | lg | xl) e atualiza em resize.
 */
(function () {
  'use strict';
  var BREAKPOINTS = { sm: 576, md: 768, lg: 992, xl: 1200 };
  var resizeTimeout = null;

  function getViewportSize() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (w >= BREAKPOINTS.xl) return 'xl';
    if (w >= BREAKPOINTS.lg) return 'lg';
    if (w >= BREAKPOINTS.md) return 'md';
    if (w >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }

  function applyViewport() {
    var root = document.documentElement;
    var v = getViewportSize();
    if (root.getAttribute('data-viewport') !== v) {
      root.setAttribute('data-viewport', v);
    }
  }

  function onResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      applyViewport();
      resizeTimeout = null;
    }, 100);
  }

  applyViewport();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () {
    setTimeout(applyViewport, 50);
  });
})();
