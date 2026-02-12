/**
 * Beam Sidebar – inicialização única para todas as páginas com has-beam-sidebar.
 * Garante que o botão abre/fecha o menu e o overlay fecha ao clicar fora.
 */
(function () {
  'use strict';

  function initBeamSidebar() {
    var beam = document.getElementById('beamSidebar');
    var trigger = document.getElementById('beamTrigger');
    var overlay = document.getElementById('beamOverlay');
    if (!beam || !trigger) return;

    function openBeam() {
      beam.setAttribute('data-state', 'open');
      trigger.setAttribute('aria-expanded', 'true');
      if (overlay) {
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');
      }
    }

    function closeBeam() {
      beam.setAttribute('data-state', 'closed');
      trigger.setAttribute('aria-expanded', 'false');
      if (overlay) {
        overlay.classList.remove('visible');
        overlay.setAttribute('aria-hidden', 'true');
      }
    }

    function toggleBeam() {
      var isOpen = beam.getAttribute('data-state') === 'open';
      if (isOpen) closeBeam();
      else openBeam();
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleBeam();
    });

    if (overlay) {
      overlay.addEventListener('click', function () {
        closeBeam();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && beam.getAttribute('data-state') === 'open') {
        closeBeam();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleBeam();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBeamSidebar);
  } else {
    initBeamSidebar();
  }
})();
