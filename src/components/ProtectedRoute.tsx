import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAssessment?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({
  children,
  requireAssessment = false,
  requireAdmin = false
}: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={requireAdmin ? "/admin/login" : "/auth"} replace />;
  }

  // Assessment is now optional for page access - checked at booking time instead
  // The requireAssessment prop is kept for backwards compatibility but no longer redirects

  if (requireAdmin) {
    const isAdmin = user?.roles?.some((r: any) =>
      r.role === 'admin' || r.role === 'super_admin'
    );
    if (!isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
