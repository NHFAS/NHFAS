import React from 'react';
import { Shield, CheckCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const getPageContent = (title) => {
  const contentMap = {
    'About Us': 'NHFAS is a browser-based marketplace for service requests, skilled artisan work, and heavy-haul transport workflows. It supports clients, independent providers, logistics operators, and platform administrators.',
    'Careers': 'There are no published openings on this page. For general questions about working with NHFAS, use the help center and include the kind of role or partnership you are interested in.',
    'Blog': 'NHFAS does not have published articles yet. You can explore service categories, search for providers, or visit the help center for guidance on using the current platform.',
    'Contact': 'For help with an existing request, sign in and open the job from My Bookings so the support team can review its details. For general questions, visit the Help Center.',
    'FAQ': 'Post a job from your dashboard, include the location and timing, then review provider details and job updates from My Bookings. Provider availability and service coverage may vary.',
    'Help Center': 'For a booking, open My Bookings and select the job to review its status, chat, tracking, and available actions. For account help, visit Settings. Safety concerns can be reported from an active job.',
    'Terms of Service': 'Please read these terms carefully before using our platform. By accessing NHFAS, you agree to be bound by these terms, which govern your use of our services, user responsibilities, and our liability limitations.',
    'Privacy Policy': 'Your privacy is critically important to us. This policy outlines how we collect, use, and protect your personal data when you use the NHFAS platform. We are committed to maintaining the highest standards of data security.',
    'Trust & Safety': 'Review provider verification information before agreeing to work. Keep job communication in the job chat and use the incident-reporting action on the active job screen for urgent safety concerns. Verification and payment capabilities depend on the current rollout.'
  };

  return contentMap[title] || 'Explore available NHFAS services, search provider listings, or sign in to manage a job request.';
};

const PlaceholderPage = ({ title }) => {
  const primaryAction = title === 'Careers' || title === 'Contact'
    ? { label: 'Open Help Center', to: '/help-center' }
    : title === 'Blog' || title === 'About Us'
      ? { label: 'Explore services', to: '/services/handyman' }
      : { label: 'Go to My Bookings', to: '/dashboard/bookings' };

  return (
    <div className="flex-1 bg-brand-softBlue py-16 lg:py-24 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-brand-navy mb-6 tracking-tight">
            {title}
          </h1>
          <div className="w-24 h-1.5 bg-brand-green mx-auto rounded-full"></div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          <p className="text-lg text-slate-600 leading-relaxed mb-10">
            {getPageContent(title)}
          </p>
          <div className="mb-8 flex flex-wrap gap-3">
            <Button as={Link} to={primaryAction.to} className="gap-2">
              {primaryAction.label}
            </Button>
            <Button as={Link} to="/search" variant="outline">
              Search NHFAS
            </Button>
          </div>

          {/* Decorative Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-100">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-brand-green" />
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">Clear requests</h3>
              <p className="text-sm text-slate-500">Share the job details and location providers need to understand the work.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">Review before agreeing</h3>
              <p className="text-sm text-slate-500">Check job details and provider information before moving forward.</p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">Account tools</h3>
              <p className="text-sm text-slate-500">Manage your profile and follow job updates from your dashboard.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlaceholderPage;
