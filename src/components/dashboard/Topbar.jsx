import React from 'react';
import { Search, Bell, Mail, Menu } from 'lucide-react';

const Topbar = () => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex flex-1 items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-brand-navy rounded-md hover:bg-slate-100">
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:text-brand-navy rounded-full hover:bg-slate-100 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 text-slate-500 hover:text-brand-navy rounded-full hover:bg-slate-100">
          <Mail className="w-5 h-5" />
        </button>
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        <button className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-sm">
            JD
          </div>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
