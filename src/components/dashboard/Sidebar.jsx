import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  Star, 
  Settings,
  Repeat
} from 'lucide-react';
import logo from '../../assets/logo.png';

const Sidebar = () => {
  const location = useLocation();
  const [isClientMode, setIsClientMode] = useState(false);

  const providerLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Services', href: '/dashboard/services', icon: Briefcase },
    { name: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
    { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const clientLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Saved Services', href: '/dashboard/saved', icon: Star },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const links = isClientMode ? clientLinks : providerLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col hidden lg:flex shrink-0">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img src={logo} alt="NHFAS Logo" className="h-12 w-auto object-contain" />
          <span className="font-extrabold text-xl text-brand-navy tracking-tight">NHFAS</span>
        </Link>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold">
            JD
          </div>
          <div>
            <h3 className="font-bold text-sm text-brand-navy">John Doe</h3>
            <p className="text-xs text-slate-500 font-medium transition-all">{isClientMode ? 'Customer' : 'Premium Provider'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              to={link.href}
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
        <button 
          onClick={() => setIsClientMode(!isClientMode)}
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
  );
};

export default Sidebar;
