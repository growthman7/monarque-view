import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { initTilt } from './animations/interactionAnimations';

export default function App() {
  useEffect(() => initTilt(), []);
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
