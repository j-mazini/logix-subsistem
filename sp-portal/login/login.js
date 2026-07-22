/**
 * DHL Subsystem – Login
 * Redireciona para o dashboard independente das credenciais.
 */
(function () {
  'use strict';

  const REDIRECT_URL = 'dashboard.html';

  function initParticles() {
    if (typeof tsParticles === 'undefined') return;
    tsParticles.load({
      id: 'tsparticles',
      options: {
        background: { color: { value: 'transparent' } },
        fpsLimit: 30,
        interactivity: {
          events: {
            onHover: { enable: false },
            onClick: { enable: false },
            resize: true
          }
        },
        particles: {
          color: { value: ['#00d4ff', '#0099cc', '#5dade2'] },
          links: {
            color: '#00d4ff',
            distance: 150,
            enable: true,
            opacity: 0.4,
            width: 1
          },
          collisions: { enable: false },
          move: {
            enable: true,
            speed: 0.5,
            direction: 'none',
            outModes: 'out',
            random: false,
            straight: false
          },
          number: { density: { enable: true, area: 800 }, value: 30 },
          opacity: { value: 0.6 },
          shape: { type: 'circle' },
          size: { value: { min: 2, max: 4 } }
        },
        detectRetina: false
      }
    }).catch(function () {});
  }

  function handleSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('loginForm');
    const button = document.getElementById('loginButton');
    const card = document.querySelector('.login-card');
    const overlay = document.getElementById('loadingOverlay');
    const spinner = document.getElementById('loadingSpinner');
    const welcome = document.getElementById('welcomeMessage');

    button.disabled = true;
    button.textContent = 'Signing in...';

    card.classList.add('login-card--exiting');
    overlay.classList.add('login-overlay--visible');
    overlay.setAttribute('aria-hidden', 'false');
    spinner.classList.add('login-overlay__loader--visible');

    setTimeout(function () {
      spinner.classList.remove('login-overlay__loader--visible');
      spinner.classList.add('login-overlay__loader--exit');
      welcome.classList.add('login-overlay__welcome--visible');
    }, 2200);

    setTimeout(function () {
      window.location.href = REDIRECT_URL;
    }, 3500);
  }

  function init() {
    initParticles();
    document.getElementById('loginForm').addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
