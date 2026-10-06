import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Bell, LayoutDashboard, Calendar, Briefcase, Settings, ShieldCheck, Truck, LogOut, Star, X, Wallet } from 'lucide-react';
import logo from '../../assets/logo.png';
import { supabase } from '../../lib/supabase';

const Sidebar = ({ mobileOpen, onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
      if (mounted) setProfile(data || { full_name: user.email, role: 'client' });
    };
    loadProfile();
    return () => { mounted = false; };
  }, []);

  const role = profile?.role || 'client';
  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: role === 'client' ? 'My requests' : 'Job marketplace', href: '/dashboard/bookings', icon: role === 'client' ? Calendar : Briefcase },
    { name: 'Payments', href: '/dashboard/earnings', icon: Wallet },
    { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ...(role === 'admin' ? [{ name: 'Verification queue', href: '/dashboard/verification', icon: ShieldCheck }] : []),
    { name: role === 'heavy_operator' ? 'Fleet & profile' : 'Profile & settings', href: '/dashboard/settings', icon: role === 'heavy_operator' ? Truck : Settings },
  ];

  const fullName = profile?.full_name || 'NHFAS member';
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const roleLabel = { client: 'Client', service_provider: 'Service provider', heavy_operator: 'Heavy operator', fleet_manager: 'Fleet manager', admin: 'Administrator' }[role] || role;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" onClick={onNavigate} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:z-auto lg:w-64 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img src={logo} alt="NHFAS Logo" className="h-12 w-auto object-contain" />
          <span className="font-extrabold text-xl text-brand-navy tracking-tight">NHFAS</span>
        </Link>
        <button aria-label="Close navigation" onClick={onNavigate} className="absolute right-4 top-7 p-2 text-slate-500 lg:hidden"><X size={19} /></button>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold">
            {initials || 'NH'}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-sm text-brand-navy">{fullName}</h3>
            <p className="text-xs text-slate-500 font-medium">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
        {links.map((link) => {
          const isActive = link.href === '/dashboard' ? location.pathname === link.href : location.pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-brand-navy text-white" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-navy"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-brand-green" : "text-slate-400")} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button onClick={signOut} className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-navy">
          <LogOut size={18} /> Sign out
        </button>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
