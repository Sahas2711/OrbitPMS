import { Navigate } from 'react-router-dom';
import { LuLoader } from 'react-icons/lu';

import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-bg-page">
        <div className="flex flex-col items-center gap-3">
          <LuLoader className="w-8 h-8 text-brand animate-spin" />
          <p className="text-small text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
