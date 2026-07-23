import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import './styles/landing.css';
import { CheckCircle, Users, Shield, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'driver') {
      navigate('/vetting/dashboard');
    } else if (isAuthenticated && (user?.role === 'admin' || user?.role === 'vetting_officer')) {
      navigate('/vetting-admin');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container">
          <div className="logo">
            <h1>BA Express Vetting</h1>
          </div>
          <nav className="nav-links">
            {isAuthenticated ? (
              <button onClick={() => navigate('/profile')} className="btn btn-primary">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn btn-outline">
                  Driver Login
                </button>
                <button onClick={() => navigate('/vetting-admin')} className="btn btn-primary">
                  Admin
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h2>Professional Driver Vetting System</h2>
            <p>Comprehensive vetting platform for BA Express driver candidates</p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg">
                Start Vetting Process
              </button>
              <button onClick={() => navigate('/vetting-admin')} className="btn btn-outline btn-lg">
                For Administrators
              </button>
            </div>
          </div>
          <div className="hero-image">
            <div className="illustration">
              <Shield size={120} />
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h3>Why Our Vetting System?</h3>
          <div className="features-grid">
            <div className="feature-card">
              <CheckCircle className="icon" />
              <h4>Comprehensive Checks</h4>
              <p>Multi-stage vetting process with background checks, interviews, and documentation verification</p>
            </div>
            <div className="feature-card">
              <Users className="icon" />
              <h4>Experienced Team</h4>
              <p>Our vetting officers ensure thorough evaluation of all candidates</p>
            </div>
            <div className="feature-card">
              <Zap className="icon" />
              <h4>Fast Processing</h4>
              <p>Streamlined workflow for quick onboarding of qualified drivers</p>
            </div>
            <div className="feature-card">
              <Shield className="icon" />
              <h4>Data Security</h4>
              <p>Enterprise-grade security for all sensitive driver information</p>
            </div>
          </div>
        </div>
      </section>

      <section className="process">
        <div className="container">
          <h3>Vetting Process</h3>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Application</h4>
              <p>Submit personal and work information</p>
            </div>
            <div className="step-divider"></div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>Assessment</h4>
              <p>Complete online tests and interviews</p>
            </div>
            <div className="step-divider"></div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Verification</h4>
              <p>Background and document verification</p>
            </div>
            <div className="step-divider"></div>
            <div className="step">
              <div className="step-number">4</div>
              <h4>Approval</h4>
              <p>Final approval and contract signing</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h3>Ready to Join BA Express?</h3>
          <p>Start your vetting process today and become part of our team</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg">
            Begin Application
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2026 BA Express. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
