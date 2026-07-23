import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTsParticles } from '../../hooks/useTsParticles';

const SP_NAME = 'TBX';

type SpinnerState = 'idle' | 'visible' | 'exit';

/** Port of login/login.js + select/login.js — identical logic in both originals, only the page background CSS differs (see Login.tsx / Select.tsx). */
export function LoginScreenBody({ variant }: { variant: 'login' | 'select' }) {
  useTsParticles('tsparticles');
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [spinnerState, setSpinnerState] = useState<SpinnerState>('idle');
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setCardExiting(true);
    setOverlayVisible(true);
    setSpinnerState('visible');

    try {
      sessionStorage.setItem('dhl_sp_portal_current_sp', SP_NAME);
    } catch {
      /* ignore */
    }

    setTimeout(() => {
      setSpinnerState('exit');
      setWelcomeVisible(true);
    }, 2200);

    setTimeout(() => {
      navigate('/dashboard');
    }, 3500);
  }

  return (
    <div className="login-page">
      <div className={`login-page__background login-page__background--${variant}`}>
        <div id="tsparticles" className="login-page__particles" />
      </div>

      <main className="login-page__main">
        <section className={`login-card${cardExiting ? ' login-card--exiting' : ''}`}>
          <form id="loginForm" className="login-card__form" noValidate onSubmit={handleSubmit}>
            <div id="feedbackMessage" className="login-card__feedback" role="alert" aria-live="polite" hidden />

            <div className="login-card__field">
              <label htmlFor="email" className="login-card__label">
                <i className="bi bi-envelope" />
                Email
              </label>
              <div className="login-card__input-wrap">
                <input type="email" id="email" name="email" className="login-card__input" placeholder="your@email.com" autoComplete="email" />
              </div>
            </div>

            <div className="login-card__field">
              <label htmlFor="password" className="login-card__label">
                <i className="bi bi-lock" />
                Password
              </label>
              <div className="login-card__input-wrap">
                <input type="password" id="password" name="password" className="login-card__input" placeholder="••••••••" autoComplete="current-password" />
              </div>
            </div>

            <div className="login-card__options">
              <label className="login-card__checkbox">
                <input type="checkbox" id="rememberMe" name="rememberMe" />
                <span>Remember me</span>
              </label>
            </div>

            <button type="submit" id="loginButton" className="login-card__submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="login-card__footer">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/select'); }} className="login-card__link">Back to access selection</a>
            </p>
          </form>
        </section>
      </main>

      <div id="loadingOverlay" className={`login-overlay${overlayVisible ? ' login-overlay--visible' : ''}`} aria-hidden={!overlayVisible}>
        <div id="loadingSpinner" className={`login-overlay__loader${spinnerState === 'visible' ? ' login-overlay__loader--visible' : ''}${spinnerState === 'exit' ? ' login-overlay__loader--exit' : ''}`}>
          <div className="loader">
            <div className="loader__grid" />
            <div className="loader__ring loader__ring--outer" />
            <div className="loader__ring loader__ring--mid" />
            <div className="loader__ring loader__ring--inner" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div className={`loader__orbit loader__orbit--${i}`} key={i}>
                <span className="loader__dot" />
              </div>
            ))}
            <div className="loader__core">
              <div className="loader__core-pulse" />
              <div className="loader__core-glow" />
            </div>
          </div>
        </div>
        <div id="welcomeMessage" className={`login-overlay__welcome${welcomeVisible ? ' login-overlay__welcome--visible' : ''}`}>
          <span className="login-overlay__text">Welcome, {SP_NAME}</span>
        </div>
      </div>
    </div>
  );
}
