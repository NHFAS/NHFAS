import React, { useState, useEffect } from 'react';
import { Search, Menu, X, Truck, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import logo from '../assets/logo.png';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/#services' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav 
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled ? "bg-white shadow-sm py-4" : "bg-white/95 backdrop-blur-sm py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0 cursor-pointer gap-2" onClick={() => setActiveLink('Home')}>
            <img src={logo} alt="NHFAS Logo" className="h-14 w-auto object-contain" />
            <span className="font-extrabold text-2xl text-brand-navy tracking-tight">NHFAS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className={cn(
            "hidden md:flex items-center space-x-8 transition-all duration-300",
            isSearchOpen ? "opacity-0 -translate-x-4 pointer-events-none absolute" : "opacity-100 translate-x-0 relative"
          )}>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setActiveLink(link.name)}
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-brand-green whitespace-nowrap",
                  activeLink === link.name ? "text-brand-navy border-b-2 border-brand-green pb-1" : "text-slate-500"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4 flex-1 justify-end">
            <form onSubmit={handleSearch} role="search" className="relative flex h-10 w-full max-w-[400px] items-center justify-end">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search services, artisans..."
                aria-label="Search services and providers"
                className={cn(
                  "absolute right-0 h-full bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all duration-300 ease-in-out",
                  isSearchOpen ? "w-full pl-5 pr-12 opacity-100" : "w-10 px-0 opacity-0 border-transparent pointer-events-none"
                )}
                autoFocus={isSearchOpen}
                tabIndex={isSearchOpen ? 0 : -1}
              />
              <button 
                type="button"
                aria-label={isSearchOpen ? 'Close search' : 'Open search'}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  "p-2 transition-colors rounded-full relative z-10 flex-shrink-0",
                  isSearchOpen ? "text-brand-navy hover:bg-slate-200 mr-1" : "text-slate-500 hover:text-brand-navy hover:bg-slate-100"
                )}
              >
                {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </form>
            
            <div className={cn(
              "flex items-center space-x-4 transition-all duration-300 origin-right flex-shrink-0",
              isSearchOpen ? "opacity-0 w-0 overflow-hidden pointer-events-none scale-x-0 ml-0 space-x-0" : "opacity-100 w-auto scale-x-100"
            )}>
              <Button variant="outline" size="sm" className="font-semibold px-6 whitespace-nowrap" onClick={() => navigate('/login')}>
                Log In
              </Button>
              <Button variant="primary" size="sm" className="font-semibold px-6 whitespace-nowrap" onClick={() => navigate('/signup')}>
                Sign Up
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-brand-navy p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-slate-100">
          <div className="px-4 pt-2 pb-6 space-y-1">
            <form onSubmit={handleSearch} role="search" className="relative px-3 pb-2">
              <Search aria-hidden="true" className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search services or providers"
                aria-label="Search services and providers"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              />
              <button type="submit" aria-label="Search" className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green">
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => {
                  setActiveLink(link.name);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "block px-3 py-3 rounded-md text-base font-medium",
                  activeLink === link.name ? "text-brand-green bg-green-50" : "text-slate-700 hover:bg-slate-50 hover:text-brand-navy"
                )}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-3 px-3">
              <Button variant="outline" className="w-full justify-center" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>Log In</Button>
              <Button variant="primary" className="w-full justify-center" onClick={() => { navigate('/signup'); setIsMobileMenuOpen(false); }}>Sign Up</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
