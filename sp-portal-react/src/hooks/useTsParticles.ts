import { useEffect } from 'react';

declare global {
  interface Window {
    tsParticles?: { load: (opts: unknown) => Promise<unknown> };
  }
}

const SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/tsparticles-slim/2.12.0/tsparticles.slim.bundle.min.js';

function loadScript(): Promise<void> {
  if (window.tsParticles) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load tsParticles'));
    document.body.appendChild(script);
  });
}

/** Port of login.js's initParticles(): loads tsParticles from CDN (same version as the static pages) and starts the same background link/dot animation into the given container id. */
export function useTsParticles(containerId: string): void {
  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !window.tsParticles) return;
        return window.tsParticles.load({
          id: containerId,
          options: {
            background: { color: { value: 'transparent' } },
            fpsLimit: 30,
            interactivity: {
              events: {
                onHover: { enable: false },
                onClick: { enable: false },
                resize: true,
              },
            },
            particles: {
              color: { value: ['#00d4ff', '#0099cc', '#5dade2'] },
              links: {
                color: '#00d4ff',
                distance: 150,
                enable: true,
                opacity: 0.4,
                width: 1,
              },
              collisions: { enable: false },
              move: {
                enable: true,
                speed: 0.5,
                direction: 'none',
                outModes: 'out',
                random: false,
                straight: false,
              },
              number: { density: { enable: true, area: 800 }, value: 30 },
              opacity: { value: 0.6 },
              shape: { type: 'circle' },
              size: { value: { min: 2, max: 4 } },
            },
            detectRetina: false,
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [containerId]);
}
