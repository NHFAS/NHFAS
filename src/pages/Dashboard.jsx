import React from 'react';
import { ArrowRight, BriefcaseBusiness, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-green">Workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Your NHFAS activity</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Bookings, offers, and payments will appear here as you use the platform.</p>
        </div>
        <Button as={Link} to="/dashboard/bookings" variant="primary" className="inline-flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Start a booking
        </Button>
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-brand-green">
          <BriefcaseBusiness className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-brand-navy">No activity yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
          Connect with a service provider or create a request to begin building your workspace.
        </p>
        <Button as={Link} to="/services/handyman" variant="outline" className="mt-6 inline-flex items-center gap-2">
          Browse services
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
};

export default Dashboard;
