import { getFullNameFromToken } from "../mockAuth";

interface WelcomeHeaderProps {
  className?: string;
}

export function WelcomeHeader({ className = "" }: WelcomeHeaderProps) {
  const fullName = getFullNameFromToken();

  if (!fullName) {
    return null;
  }

  return (
    <div className={`mb-4 ${className}`}>
      <p className="text-sm text-base text-gray-600">
        Welcome
      </p>
    </div>
  );
}
