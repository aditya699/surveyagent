import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function PlatformAdminRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.email_verified === false) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />;
  }

  if (!user?.is_platform_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
