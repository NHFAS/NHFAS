import React from 'react';
import { Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-8 h-8 text-white" />
              <span className="font-extrabold text-2xl tracking-tight text-white">NHFAS</span>
            </div>
            <p className="text-slate-400 text-sm max-w-xs">
              Connecting customers with skilled professionals, artisans, and heavy haulage operators for real solutions.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Services</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><Link to="/services/handyman" className="hover:text-white transition-colors">Handyman Services</Link></li>
              <li><Link to="/services/artisans" className="hover:text-white transition-colors">Skilled Artisans</Link></li>
              <li><Link to="/services/heavy-haulage" className="hover:text-white transition-colors">Heavy Haulage</Link></li>
              <li><Link to="/services/equipment" className="hover:text-white transition-colors">Equipment Rental</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link to="/trust-safety" className="hover:text-white transition-colors">Trust & Safety</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} HandiCraft & HeavyHaul. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <a href="https://www.facebook.com/profile.php?id=61594481709392" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-green hover:text-white transition-colors" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@nhfas0?_r=1&_t=ZS-99jb2FKxWWv" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-green hover:text-white transition-colors" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
