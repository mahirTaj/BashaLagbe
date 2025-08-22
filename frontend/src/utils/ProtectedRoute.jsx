import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}