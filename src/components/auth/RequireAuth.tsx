/**
 * RequireAuth Component
 * Protects routes that require authentication
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@/store/authStore';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to onboarding, but save the location they were trying to go to
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}




