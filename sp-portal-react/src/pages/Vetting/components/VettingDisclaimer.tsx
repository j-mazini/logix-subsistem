'use client';

interface VettingDisclaimerProps {
  isDismissed: boolean;
  onDismiss: () => void;
}

export function VettingDisclaimer({ isDismissed, onDismiss }: VettingDisclaimerProps) {
  if (isDismissed) return null;

  return (
    <div className="vetting-disclaimer" role="alert" aria-live="polite">
      <div className="disclaimer-header">
        <span className="warning-icon">⚠️</span>
        <h3>Demo Mode — Not Secure</h3>
      </div>

      <div className="disclaimer-content">
        <p>
          <strong>This is a prototype vetting system for internal demo use only.</strong>
        </p>
        <ul>
          <li>
            <strong>No authentication is enforced.</strong> Officer selection is self-reported and not
            verified.
          </li>
          <li>
            <strong>Not production-ready.</strong> Audit trails use browser fingerprinting, not official
            authentication.
          </li>
          <li>
            <strong>Data attribution is unreliable.</strong> Any user can claim to be any officer. Do not
            use for official vetting decisions.
          </li>
          <li>
            <strong>For demonstration purposes only.</strong> Future versions will include proper
            authentication.
          </li>
        </ul>
        <p className="disclaimer-note">
          Actions are logged with browser fingerprint and IP address for audit purposes. See "Audit Log"
          in settings.
        </p>
      </div>

      <button onClick={onDismiss} className="dismiss-button" aria-label="Dismiss disclaimer">
        I Understand
      </button>

      <style>{`
        .vetting-disclaimer {
          background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
          border-left: 4px solid #ff6b6b;
          border-radius: 4px;
          padding: 16px 20px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
        }

        .disclaimer-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .warning-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .disclaimer-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cc0000;
        }

        .disclaimer-content ul {
          margin: 12px 0;
          padding-left: 20px;
        }

        .disclaimer-content li {
          margin: 8px 0;
        }

        .disclaimer-note {
          font-style: italic;
          color: #666;
          margin: 12px 0 0 0;
        }

        .dismiss-button {
          background-color: #ff6b6b;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-top: 12px;
          transition: background-color 0.2s;
        }

        .dismiss-button:hover {
          background-color: #ff5252;
        }

        .dismiss-button:active {
          background-color: #ff1744;
        }

        @media (max-width: 768px) {
          .vetting-disclaimer {
            padding: 12px 16px;
          }

          .disclaimer-header {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
