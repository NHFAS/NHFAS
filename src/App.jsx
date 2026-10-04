import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlaceholderPage from './pages/PlaceholderPage';
import LegalPage from './pages/LegalPage';
import NotFound from './pages/NotFound';
import CookieConsentBanner from './components/CookieConsentBanner';

import PublicLayout from './layout/PublicLayout';
import DashboardLayout from './layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Settings from './pages/Settings';
import Reviews from './pages/Reviews';
import Notifications from './pages/Notifications';
import VerificationQueue from './pages/VerificationQueue';
import AuctionMarketplace from './pages/AuctionMarketplace';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading for Skeleton
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy p-4 md:p-8 space-y-8 animate-pulse flex flex-col">
        {/* Navbar Skeleton */}
        <div className="flex justify-between items-center mb-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="w-32 h-8 bg-slate-700/50 rounded"></div>
          <div className="hidden md:flex space-x-8">
             <div className="w-16 h-4 bg-slate-700/50 rounded"></div>
             <div className="w-16 h-4 bg-slate-700/50 rounded"></div>
             <div className="w-16 h-4 bg-slate-700/50 rounded"></div>
             <div className="w-16 h-4 bg-slate-700/50 rounded"></div>
          </div>
          <div className="hidden md:flex space-x-4">
            <div className="w-24 h-10 bg-slate-700/50 rounded-full"></div>
            <div className="w-24 h-10 bg-brand-green/30 rounded-full"></div>
          </div>
        </div>
        
        {/* Hero Skeleton */}
        <div className="flex flex-col lg:flex-row items-center gap-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-10">
          <div className="w-full lg:w-1/2 space-y-6">
            <div className="w-1/3 h-4 bg-slate-700/50 rounded"></div>
            <div className="w-full h-16 bg-slate-700/50 rounded"></div>
            <div className="w-3/4 h-16 bg-slate-700/50 rounded"></div>
            <div className="w-5/6 h-24 bg-slate-700/50 rounded mt-4"></div>
          </div>
          <div className="w-full lg:w-1/2 h-[400px] lg:h-[500px] bg-slate-700/30 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes with Navbar and Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<PlaceholderPage title="About Us" />} />
          <Route path="/careers" element={<PlaceholderPage title="Careers" />} />
          <Route path="/blog" element={<PlaceholderPage title="Blog" />} />
          <Route path="/contact" element={<PlaceholderPage title="Contact" />} />
          <Route path="/services/handyman" element={<PlaceholderPage title="Handyman Services" />} />
          <Route path="/services/artisans" element={<PlaceholderPage title="Skilled Artisans" />} />
          <Route path="/services/heavy-haulage" element={<PlaceholderPage title="Heavy Haulage" />} />
          <Route path="/services/equipment" element={<PlaceholderPage title="Equipment Rental" />} />
          <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
          <Route path="/help-center" element={<PlaceholderPage title="Help Center" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/cookies" element={<LegalPage type="cookies" />} />
          <Route path="/trust-safety" element={<PlaceholderPage title="Trust & Safety" />} />
          <Route path="/services/auction" element={<AuctionMarketplace />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Dashboard Routes with Sidebar and Topbar */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="services" element={<PlaceholderPage title="Services" />} />
          <Route path="earnings" element={<PlaceholderPage title="Payments" />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="verification" element={<VerificationQueue />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieConsentBanner />
    </Router>
  );
}

export default App;
