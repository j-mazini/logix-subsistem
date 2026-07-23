import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/auth/useAuth';

interface GoogleOAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

export const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  onSuccess,
  onError,
  className,
}) => {
  const { loginWithGoogle } = useAuth();
  const googleButtonRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.error('Google Client ID is not configured');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
          });
        }
      }
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      await loginWithGoogle(response);
      onSuccess?.();
    } catch (error) {
      console.error('Google login error:', error);
      onError?.(error instanceof Error ? error : new Error('Google login failed'));
    }
  };

  return (
    <div
      ref={googleButtonRef}
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
      }}
    />
  );
};
