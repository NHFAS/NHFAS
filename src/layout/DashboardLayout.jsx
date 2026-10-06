import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import { supabase } from '../lib/supabase';

const DashboardLayout = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isClientMode, setIsClientMode] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!isCurrent) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setIsClientMode(localStorage.getItem('nhfas-dashboard-mode:guest') === 'client');
          return;
        }

        const { data, error: profileLoadError } = await supabase
          .from('profiles')
          .select('full_name, phone, role, preferred_language, low_literacy_mode, avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileLoadError) throw profileLoadError;
        if (!isCurrent) return;

        const resolvedProfile = {
          full_name: data?.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Account',
          phone: data?.phone || '',
          role: data?.role || 'client',
          preferred_language: data?.preferred_language || 'en',
          low_literacy_mode: data?.low_literacy_mode || false,
          avatar_url: data?.avatar_url || '',
          email: currentUser.email || '',
        };
        setProfile(resolvedProfile);

        const savedMode = localStorage.getItem(`nhfas-dashboard-mode:${currentUser.id}`);
        setIsClientMode(savedMode ? savedMode === 'client' : resolvedProfile.role === 'client');
      } catch {
        if (isCurrent) setProfileError('Your profile could not be loaded from NHFAS.');
      } finally {
        if (isCurrent) setIsProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      isCurrent = false;
    };
  }, []);

  const toggleMode = () => {
    setIsClientMode((currentMode) => {
      const nextMode = !currentMode;
      localStorage.setItem(`nhfas-dashboard-mode:${user?.id || 'guest'}`, nextMode ? 'client' : 'provider');
      return nextMode;
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Sidebar
        fullName={profile?.full_name || 'Your account'}
        isClientMode={isClientMode}
        onToggleMode={toggleMode}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar fullName={profile?.full_name || 'Your account'} isClientMode={isClientMode} onToggleMode={toggleMode} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet context={{
            user,
            profile,
            setProfile,
            profileError,
            isProfileLoading,
            isClientMode,
            toggleMode,
          }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
