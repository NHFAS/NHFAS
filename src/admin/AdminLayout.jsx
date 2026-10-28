import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Building2,
  Gavel,
  LayoutDashboard,
  Landmark,
  Lock,
  LogOut,
  Menu,
  MessageSquareText,
  Scale,
  ShieldCheck,
  Truck,
  Umbrella,
  Users,
  Wallet,
  X,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const ADMIN_BASE = '/admin12login/panel';

export const adminMenu = [
  {
    heading: 'General',
    items: [
      { label: 'Overview', href: ADMIN_BASE, icon: LayoutDashboard, end: true },
      { label: 'Users', href: `${ADMIN_BASE}/users`, icon: Users },
      { label: 'Organizations', href: `${ADMIN_BASE}/organizations`, icon: Building2 },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Jobs', href: `${ADMIN_BASE}/jobs`, icon: Briefcase },
      { label: 'Fleet', href: `${ADMIN_BASE}/fleet`, icon: Truck },
      { label: 'Messages', href: `${ADMIN_BASE}/messages`, icon: MessageSquareText },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { label: 'Payments', href: `${ADMIN_BASE}/payments`, icon: Wallet },
      { label: 'Finance', href: `${ADMIN_BASE}/finance`, icon: Landmark },
      { label: 'Auctions', href: `${ADMIN_BASE}/auctions`, icon: Gavel },
      { label: 'Insurance', href: `${ADMIN_BASE}/insurance`, icon: Umbrella },
      { label: 'Pricing', href: `${ADMIN_BASE}/pricing`, icon: TrendingUp },
    ],
  },
  {
    heading: 'Trust & safety',
    items: [
      { label: 'Disputes', href: `${ADMIN_BASE}/disputes`, icon: Scale },
      { label: 'Credentials', href: `${ADMIN_BASE}/credentials`, icon: Award },
      { label: 'Verification queue', href: `${ADMIN_BASE}/verifications`, icon: ShieldCheck },
    ],
  },
];

// Renders an admin section wired to this layout's outlet context
// (user, profile, notify) so every section keeps a plain prop API.
export const AdminSection = ({ Section }) => {
  const context = useOutletContext();
  return <Section {...context} />;
};

const flashToneClasses = {
  red: 'border-red-200 bg-red-50 text-red-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | ready | denied
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [flash, setFlash] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const flashTimer = useRef(null);

  const activeItem = adminMenu
    .flatMap((section) => section.items)
    .find((item) => (item.end
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)));
  const activeLabel = activeItem ? activeItem.label : 'Overview';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session) { setStatus('denied'); return; }
        const { data: row } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', session.user.id)
          .single();
        if (!active) return;
        if (!row || row.role !== 'admin') { setStatus('denied'); return; }
        setUser(session.user);
        setProfile(row);
        setStatus('ready');
      } catch {
        if (active) setStatus('denied');
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${activeLabel} · NHFAS Admin`;
    return () => { document.title = previousTitle; };
  }, [activeLabel]);

  const notify = useCallback((message, tone = 'success') => {
    setFlash({ message: String(message || ''), tone });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 6000);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin12login', { replace: true });
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0E17]">
        <ShieldCheck className="h-8 w-8 animate-pulse text-red-500" aria-label="Loading admin console" />
      </div>
    );
  }
  if (status === 'denied') return <Navigate to="/admin12login" replace />;

  const initials = (profile?.full_name || user?.email || 'Admin')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const flashClass = flash ? (flashToneClasses[flash.tone] || flashToneClasses.success) : '';
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {navOpen && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0A0E17] transition-transform duration-200 lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-md shadow-red-600/30">
            <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-extrabold tracking-tight text-white">
              NHFAS <span className="text-red-500">Admin</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Control center</p>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {adminMenu.map((section) => (
            <div key={section.heading}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {section.heading}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.end
                    ? location.pathname === item.href
                    : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.label}>
                      <Link
                        to={item.href}
                        end={item.end}
                        onClick={() => setNavOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                            : 'text-slate-400 transition hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}
                          aria-hidden="true"
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600/15 text-xs font-bold text-red-400">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{profile?.full_name || 'Administrator'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Admin <span className="mx-1 text-slate-300">/</span> {activeLabel}
            </p>
            <h1 className="truncate text-base font-bold text-slate-900">{activeLabel}</h1>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
            Administrator
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
          {flash && (
            <div className={`mb-5 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${flashClass}`} role="status">
              <span>{flash.message}</span>
              <button
                type="button"
                onClick={() => setFlash(null)}
                aria-label="Dismiss message"
                className="shrink-0 opacity-60 transition hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <Outlet context={{ user, profile, notify }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;