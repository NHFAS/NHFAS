import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import { supabase } from '../lib/supabase';

const DashboardLayout = () => {
  const location = useLocation();
  const [authState, setAuthState] = useState('loading');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setAuthState(session ? 'signed-in' : 'signed-out');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthState(session ? 'signed-in' : 'signed-out');
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authState === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking your session...</div>;
  }
  if (authState === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      <Sidebar mobileOpen={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen((open) => !open)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
