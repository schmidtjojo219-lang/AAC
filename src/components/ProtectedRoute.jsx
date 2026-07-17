import { Navigate } from 'react-router-dom';
import { supabaseConfigured } from '../lib/supabase';

export default function ProtectedRoute({ session, children }) {
  if (!supabaseConfigured) {
    return <Navigate to="/login" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
