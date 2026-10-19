import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlaceholderPage from './pages/PlaceholderPage';
import LegalPage from './pages/LegalPage';
import NotFound from './pages/NotFound';
import CookieConsentBanner from './components/CookieConsentBanner';

import PublicLayout from './layout/PublicLayout';
import DashboardLayout from './layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Reviews from './pages/Reviews';
import SettingsPage from './pages/Settings';
import SearchResults from './pages/SearchResults';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import FindMe from './pages/FindMe';
import Verification from './pages/Verification';
import VerificationQueue from './pages/VerificationQueue';
import MyBookings from './pages/MyBookings';
import PostJob from './pages/PostJob';
import JobDetail from './pages/JobDetail';
import CostEstimator from './pages/CostEstimator';
import PublicProvider from './pages/PublicProvider';
import ServiceLandingPage from './pages/ServiceLandingPage';
import AuctionLandingPage from './pages/AuctionLandingPage';
import AuctionPage from './pages/AuctionPage';
import ProviderServices from './pages/ProviderServices';
import Earnings from './pages/Earnings';
import Marketplace from './pages/Marketplace';
import Notifications from './pages/Notifications';
import Payments from './pages/Payments';
import Messages from './pages/Messages';

// Dedicated admin console (standalone — not part of the public site shell).
import AdminLogin from './admin/AdminLogin';
import AdminLayout, { AdminSection } from './admin/AdminLayout';
import OverviewTab from './admin/sections/OverviewTab';
import UsersTab from './admin/sections/UsersTab';
import OrganizationsTab from './admin/sections/OrganizationsTab';
import JobsTab from './admin/sections/JobsTab';
import PaymentsTab from './admin/sections/PaymentsTab';
import DisputesTab from './admin/sections/DisputesTab';
import AuctionsTab from './admin/sections/AuctionsTab';
import InsuranceTab from './admin/sections/InsuranceTab';
import FinanceTab from './admin/sections/FinanceTab';
import CredentialsTab from './admin/sections/CredentialsTab';
import FleetTab from './admin/sections/FleetTab';
import MessagesTab from './admin/sections/MessagesTab';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading for Skeleton
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const isAdminApp = window.location.pathname.startsWith('/admin12login');
  if (loading && !isAdminApp) {
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
          <Route path="/search" element={<SearchResults />} />
          <Route path="/about" element={<PlaceholderPage title="About Us" />} />
          <Route path="/careers" element={<PlaceholderPage title="Careers" />} />
          <Route path="/blog" element={<PlaceholderPage title="Blog" />} />
          <Route path="/contact" element={<PlaceholderPage title="Contact" />} />
          <Route path="/services/handyman" element={<ServiceLandingPage serviceId="handyman" />} />
          <Route path="/services/artisans" element={<ServiceLandingPage serviceId="artisans" />} />
          <Route path="/services/heavy-haulage" element={<ServiceLandingPage serviceId="heavy-haulage" />} />
          <Route path="/services/equipment" element={<ServiceLandingPage serviceId="equipment" />} />
          <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
          <Route path="/help-center" element={<PlaceholderPage title="Help Center" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/cookies" element={<LegalPage type="cookies" />} />
          <Route path="/trust-safety" element={<PlaceholderPage title="Trust & Safety" />} />
          <Route path="/services/auction" element={<AuctionLandingPage />} />
          <Route path="/auction/:auctionId" element={<AuctionPage />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Dashboard Routes with Sidebar and Topbar */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="post-job" element={<PostJob />} />
          <Route path="jobs/:jobId" element={<JobDetail />} />
          <Route path="jobs/:jobId/estimate" element={<CostEstimator />} />
          <Route path="messages" element={<Messages />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="payments" element={<Payments />} />
          <Route path="cost-estimator" element={<CostEstimator />} />
          <Route path="services" element={<ProviderServices />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="find-me" element={<FindMe />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="verification" element={<Verification />} />
          <Route path="provider/:userId" element={<PublicProvider />} />
        </Route>

        {/* Dedicated admin console — the only way in is typing /admin12login */}
        <Route path="/admin12login" element={<AdminLogin />} />
        <Route path="/admin12login/panel" element={<AdminLayout />}>
          <Route index element={<AdminSection Section={OverviewTab} />} />
          <Route path="users" element={<AdminSection Section={UsersTab} />} />
          <Route path="organizations" element={<AdminSection Section={OrganizationsTab} />} />
          <Route path="jobs" element={<AdminSection Section={JobsTab} />} />
          <Route path="payments" element={<AdminSection Section={PaymentsTab} />} />
          <Route path="disputes" element={<AdminSection Section={DisputesTab} />} />
          <Route path="auctions" element={<AdminSection Section={AuctionsTab} />} />
          <Route path="insurance" element={<AdminSection Section={InsuranceTab} />} />
          <Route path="finance" element={<AdminSection Section={FinanceTab} />} />
          <Route path="credentials" element={<AdminSection Section={CredentialsTab} />} />
          <Route path="fleet" element={<AdminSection Section={FleetTab} />} />
          <Route path="messages" element={<AdminSection Section={MessagesTab} />} />
          <Route path="verifications" element={<VerificationQueue />} />
        </Route>
        {/* Legacy admin URLs now lead only to the dedicated admin login */}
        <Route path="/dashboard/admin" element={<Navigate to="/admin12login" replace />} />
        <Route path="/dashboard/admin/verifications" element={<Navigate to="/admin12login" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieConsentBanner />
    </Router>
  );
}

export default App;
