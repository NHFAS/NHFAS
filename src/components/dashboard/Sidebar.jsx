import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  Star, 
  Settings,
  Repeat,
  MapPin,
  Wrench,
  BadgeCheck,
  PlusCircle,
  MessageSquareText,
  Calculator,
  Bell,
  Wallet,
  User,
  Truck,
  ShieldCheck,
  FileText,
  CreditCard,
  Leaf,
  Gavel,
} from 'lucide-react';
import logo from '../../assets/logo.png';

  const Sidebar = ({ fullName, isClientMode, onToggleMode, role, open, onClose }) => {
  const location = useLocation();

  // Any navigation closes the mobile drawer.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const providerSections = [
    {
      label: 'Work',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquareText },
        { name: 'Find Me', href: '/dashboard/find-me', icon: MapPin },
      ],
    },
    {
      label: 'Grow',
      items: [
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
        { name: 'Payouts', href: '/dashboard/payouts', icon: CreditCard },
        { name: 'Auctions', href: '/dashboard/auctions', icon: Gavel },
        { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
        { name: 'Verification', href: '/dashboard/verification', icon: BadgeCheck },
        { name: 'Fleet', href: '/dashboard/fleet', icon: Truck },
        { name: 'Emissions', href: '/dashboard/emissions', icon: Leaf },
        { name: 'Certificates', href: '/dashboard/certificates', icon: ShieldCheck },
      ],
    },
    {
      label: 'Account',
      items: [
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  const clientSections = [
    {
      label: 'Hire',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Post a Job', href: '/dashboard/post-job', icon: PlusCircle },
        { name: 'Bid on Auctions', href: '/dashboard/auctions', icon: Gavel },
        { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
        { name: 'Browse Services', href: '/dashboard/marketplace', icon: Wrench },
      ],
    },
    {
      label: 'Tools',
      items: [
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
        { name: 'Cost Estimator', href: '/dashboard/cost-estimator', icon: Calculator },
        { name: 'Insurance', href: '/dashboard/insurance', icon: FileText },
        { name: 'Emissions', href: '/dashboard/emissions', icon: Leaf },
        { name: 'Payments', href: '/dashboard/payments', icon: Wallet },
      ],
    },
    {
      label: 'Account',
      items: [
        { name: 'Profile', href: '/dashboard/profile', icon: User },
        { name: 'Certificates', href: '/dashboard/certificates', icon: ShieldCheck },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  const sections = isClientMode ? clientSections : providerSections;
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      )}>
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img src="/brand/logo.svg" alt="NHFAS Logo" className="h-10 w-auto object-contain" />
          <span className="font-extrabold text-xl text-brand-navy tracking-tight">NHFAS</span>
        </Link>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold">
            {initials || '?'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-brand-navy">{fullName}</h3>
            <p className="text-xs text-slate-500 font-medium transition-all">{isClientMode ? 'Client workspace' : 'Provider workspace'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{section.label}</p>
            <div className="mt-2 space-y-1">
              {section.items.map((link) => {
                const isActive = location.pathname === link.href || (link.href !== '/dashboard' && location.pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-brand-navy text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-brand-navy"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-brand-green" : "text-slate-400")} />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={onToggleMode}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors group"
        >
          <Repeat className={cn(
            "w-4 h-4 text-slate-500 transition-transform duration-500",
            isClientMode ? "rotate-180" : "rotate-0"
          )} />
          {isClientMode ? 'Switch to Provider' : 'Switch to Client'}
        </button>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
