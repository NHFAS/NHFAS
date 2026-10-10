import React from 'react';
import { ArrowRight, Search, Bell, Mail, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = ({ fullName, isClientMode, onToggleMode }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/dashboard/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex flex-1 items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleMode}
          aria-label={`Switch to ${isClientMode ? 'provider' : 'client'} workspace`}
          title={`Switch to ${isClientMode ? 'provider' : 'client'} workspace`}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-brand-navy rounded-md hover:bg-slate-100"
        >
          <Repeat className="w-5 h-5" />
        </button>
        
        <form onSubmit={handleSearch} role="search" className="relative w-full max-w-md">
          <Search aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search providers or services"
            aria-label="Search providers or services"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-11 text-sm transition-all focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/50"
          />
          <button type="submit" aria-label="Search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green">
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
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
        <button className="flex items-center gap-2" aria-label={fullName} title={fullName}>
          <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-sm">
            {initials || '?'}
          </div>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
