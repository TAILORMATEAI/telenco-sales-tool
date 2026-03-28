import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import AdminDashboard from './pages/AdminDashboard';
import TelenetWizard from './pages/TelenetWizard';
import App from './App';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  if (localStorage.getItem('mustChangePassword') === 'true') {
    return <Navigate to="/wachtwoord#type=recovery" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  
  if (localStorage.getItem('mustChangePassword') === 'true') {
    return <Navigate to="/wachtwoord#type=recovery" replace />;
  }

  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PageTransition({ children, ...rest }: React.PropsWithChildren<{ key?: string }>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default function AppRouter() {
  const location = useLocation();

  const hash = window.location.hash;
  if ((hash.includes('type=invite') || hash.includes('type=recovery')) && location.pathname !== '/wachtwoord') {
    return <Navigate to={`/wachtwoord${hash}`} replace />;
  }

  return (
    <>
      {/* White overlay that covers during transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <Routes location={location}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/wachtwoord" element={<ResetPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute><App /></ProtectedRoute>} />
            <Route path="/telenet" element={<ProtectedRoute><TelenetWizard /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
