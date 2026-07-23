import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { GoogleOAuthButton } from '../../components/auth/GoogleOAuthButton';
import './styles/login.css';
import { ArrowLeft } from 'lucide-react';

export const DriverLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isEmailLogin, setIsEmailLogin] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/vetting/dashboard';

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleGoogleSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleGoogleError = (error: Error) => {
    setError(error.message);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <button
          className="back-button"
          onClick={() => navigate('/')}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <div className="login-card">
          <div className="login-header">
            <h1>Driver Login</h1>
            <p>Access your vetting dashboard</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {!isEmailLogin ? (
            <div className="login-methods">
              <GoogleOAuthButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                className="google-button-container"
              />

              <div className="divider">
                <span>or</span>
              </div>

              <button
                className="email-login-btn"
                onClick={() => setIsEmailLogin(true)}
              >
                Login with Email
              </button>

              <p className="login-hint">
                Don't have an account?{' '}
                <button
                  className="text-link"
                  onClick={() => navigate('/vetting/register')}
                >
                  Register here
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                className="back-to-oauth-btn"
                onClick={() => setIsEmailLogin(false)}
              >
                Back to Google Login
              </button>

              <p className="login-hint">
                Don't have an account?{' '}
                <button
                  className="text-link"
                  onClick={() => navigate('/vetting/register')}
                >
                  Register here
                </button>
              </p>
            </form>
          )}
        </div>

        <div className="login-footer">
          <p>By logging in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
      `}</style>
    </div>
  );
};
