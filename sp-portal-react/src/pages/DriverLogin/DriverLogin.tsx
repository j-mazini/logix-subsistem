import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTsParticles } from '../../hooks/useTsParticles';
import { setDriverSession } from '../Driver/context/DriverSessionContext';
import { MOCK_DRIVER } from '../Driver/data/driverMockData';
import styles from './DriverLogin.module.css';

/** Cosmetic/mocked login for the Driver Portal — mirrors LoginScreenBody.tsx's
 *  fake-delay-then-navigate flow, with its own sessionStorage key. */
export function DriverLogin() {
  useTsParticles('driver-login-particles');
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setCardExiting(true);
    setOverlayVisible(true);
    setDriverSession();

    setTimeout(() => {
      navigate('/driver/insights');
    }, 1400);
  }

  return (
    <div className={styles.page}>
      <div id="driver-login-particles" className={styles.particles} />

      <section className={`${styles.card}${cardExiting ? ` ${styles.cardExiting}` : ''}`}>
        <div className={styles.icon}>
          <i className="bi bi-person-badge" />
        </div>
        <h1 className={styles.title}>Driver Portal</h1>
        <p className={styles.subtitle}>Sign in to view earnings, deductions and requests.</p>

        <form noValidate onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="driver-email">
              <i className="bi bi-envelope" />
              Email
            </label>
            <input id="driver-email" type="email" className={styles.input} placeholder="your@email.com" autoComplete="email" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="driver-password">
              <i className="bi bi-lock" />
              Password
            </label>
            <input id="driver-password" type="password" className={styles.input} placeholder="••••••••" autoComplete="current-password" />
          </div>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>

          <p className={styles.footer}>
            <a
              href="#"
              className={styles.link}
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              Back to access selection
            </a>
          </p>
        </form>
      </section>

      <div className={`${styles.overlay}${overlayVisible ? ` ${styles.overlayVisible}` : ''}`} aria-hidden={!overlayVisible}>
        Welcome, {MOCK_DRIVER.fullName}
      </div>
    </div>
  );
}
