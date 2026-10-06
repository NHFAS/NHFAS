import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Hammer,
  MapPin,
  Settings2,
  Star,
  Truck,
  Wrench,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../components/Button';

const serviceCategories = [
  {
    title: 'Home repairs',
    description: 'Everyday fixes, plumbing, and electrical work.',
    href: '/services/handyman',
    icon: Wrench,
    iconClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Skilled artisans',
    description: 'Find makers for custom and specialist work.',
    href: '/services/artisans',
    icon: Hammer,
    iconClass: 'bg-orange-50 text-orange-700',
  },
  {
    title: 'Heavy haulage',
    description: 'Transport for machinery and oversized loads.',
    href: '/services/heavy-haulage',
    icon: Truck,
    iconClass: 'bg-sky-50 text-sky-700',
  },
  {
    title: 'Equipment rental',
    description: 'Tools and machinery for your next job.',
    href: '/services/equipment',
    icon: Settings2,
    iconClass: 'bg-amber-50 text-amber-700',
  },
];

const Dashboard = () => {
  const { profile, isClientMode } = useOutletContext();
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there';

  const providerTools = [
    {
      title: 'Your services',
      description: 'Review the services clients can find you for.',
      href: '/dashboard/services',
      icon: BriefcaseBusiness,
      iconClass: 'bg-sky-50 text-sky-700',
    },
    {
      title: 'Location visibility',
      description: 'Choose whether to appear for nearby requests.',
      href: '/dashboard/find-me',
      icon: MapPin,
      iconClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Client reviews',
      description: 'Read feedback from clients you have worked with.',
      href: '/dashboard/reviews',
      icon: Star,
      iconClass: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">{isClientMode ? 'Client workspace' : 'Provider workspace'} · {today}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Welcome, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            {isClientMode
              ? 'Find trusted professionals and keep your service requests in one place.'
              : 'Manage your services, location visibility, and client relationships.'}
          </p>
        </div>
        {isClientMode ? (
          <Button as={Link} to="/services/handyman" variant="primary" className="inline-flex items-center gap-2 self-start sm:self-auto">
            Find a service
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button as={Link} to="/dashboard/find-me" variant="primary" className="inline-flex items-center gap-2 self-start sm:self-auto">
            Set availability
            <MapPin className="h-4 w-4" />
          </Button>
        )}
      </header>

      {isClientMode ? (
        <>
          <section className="rounded-xl border-l-4 border-brand-green bg-brand-navy px-6 py-8 text-white sm:px-9 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">What do you need done?</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold text-white sm:text-3xl">Find the right help for your next project.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">Explore service categories and get your request moving.</p>
            <Button as={Link} to="/services/handyman" variant="white" className="mt-6 inline-flex items-center gap-2">
              Browse services
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
            <section aria-labelledby="services-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Browse the marketplace</p>
                  <h2 id="services-heading" className="mt-1 text-xl font-bold text-brand-navy">Service categories</h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {serviceCategories.map(({ title, description, href, icon: Icon, iconClass }) => (
                  <Link
                    key={title}
                    to={href}
                    className="group flex min-h-36 items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 hover:bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-bold text-brand-navy">
                        {title}
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-green" />
                      </span>
                      <span className="mt-2 block text-sm leading-5 text-slate-500">{description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="client-bookings-heading" className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="client-bookings-heading" className="font-bold text-brand-navy">Your bookings</h2>
                  <p className="text-xs text-slate-500">Requests and scheduled work</p>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-sm font-semibold text-slate-700">No bookings yet</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">Your service requests and updates will appear here.</p>
                <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
                  View bookings
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 sm:px-9 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-800">Build your business</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold text-brand-navy sm:text-3xl">Make it easy for clients to find and trust your work.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Keep your service details current and let nearby clients know when you are available.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button as={Link} to="/dashboard/services" variant="primary" className="inline-flex items-center gap-2">
                Manage services
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to="/dashboard/find-me" className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-800/30 px-5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700">
                <MapPin className="h-4 w-4" />
                Location visibility
              </Link>
            </div>
          </section>

          <section aria-labelledby="provider-tools-heading">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Your workspace</p>
              <h2 id="provider-tools-heading" className="mt-1 text-xl font-bold text-brand-navy">Provider tools</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {providerTools.map(({ title, description, href, icon: Icon, iconClass }) => (
                <Link key={title} to={href} className="group rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 hover:bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-brand-green">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-3 font-bold text-brand-navy">
                    {title}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-green" />
                  </span>
                  <span className="mt-2 block text-sm leading-5 text-slate-500">{description}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="provider-activity-heading" className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2 id="provider-activity-heading" className="font-bold text-brand-navy">Recent activity</h2>
                <p className="text-xs text-slate-500">Bookings and client updates</p>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-700">Nothing to show yet</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">New requests and completed work will appear here.</p>
              <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
                View bookings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
