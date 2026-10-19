import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2, DollarSign, MapPin, Settings2, Star, Truck, Wrench } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../components/Button';
import StatCard from '../components/dashboard/StatCard';
import { supabase } from '../lib/supabase';

const serviceCategories = [
  {
    title: 'Home repairs',
    description: 'Everyday fixes, plumbing, and electrical work.',
    href: '/dashboard/search?q=handyman',
    icon: Wrench,
    iconClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Skilled artisans',
    description: 'Find makers for custom and specialist work.',
    href: '/dashboard/search?q=artisans',
    icon: Wrench,
    iconClass: 'bg-orange-50 text-orange-700',
  },
  {
    title: 'Heavy haulage',
    description: 'Transport for machinery and oversized loads.',
    href: '/dashboard/search?q=haulage',
    icon: Truck,
    iconClass: 'bg-sky-50 text-sky-700',
  },
  {
    title: 'Equipment rental',
    description: 'Tools and machinery for your next job.',
    href: '/dashboard/search?q=equipment',
    icon: Settings2,
    iconClass: 'bg-amber-50 text-amber-700',
  },
];

const providerTools = [
  {
    title: 'Manage services',
    description: 'Keep your categories current and ready for clients.',
    href: '/dashboard/services',
    icon: Wrench,
    iconClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Location visibility',
    description: 'Show clients where you are available to work.',
    href: '/dashboard/find-me',
    icon: MapPin,
    iconClass: 'bg-sky-50 text-sky-700',
  },
  {
    title: 'Reviews',
    description: 'Monitor feedback and strengthen your reputation.',
    href: '/dashboard/reviews',
    icon: Star,
    iconClass: 'bg-purple-50 text-purple-700',
  },
];

const Dashboard = () => {
  const { user, profile, isClientMode } = useOutletContext();
  const [stats, setStats] = useState({ open: null, active: 0, completed: 0, earnings: 0, rating: null, inEscrow: null });
  const [recentJobs, setRecentJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there';

  useEffect(() => {
    let isCurrent = true;
    const loadDashboard = async () => {
      if (!user) return;
      setIsLoading(true);
      setLoadError('');

      const [{ data: jobs, error: jobsError }, { data: escrowRows, error: escrowError }, { data: ratingRows, error: ratingsError }, { data: myEscrowRows, error: myEscrowError }] = await Promise.all([
        supabase.from('jobs')
          .select('id, job_number, title, job_type, status, created_at')
          .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('escrow_accounts')
          .select('released_amount')
          .eq('payee_id', user.id)
          .eq('status', 'released'),
        supabase.from('ratings')
          .select('stars')
          .eq('ratee_id', user.id),
        supabase.from('escrow_accounts')
          .select('funded_amount, released_amount')
          .eq('payer_id', user.id)
          .in('status', ['funded', 'partially_released', 'disputed']),
      ]);

      if (!isCurrent) return;
      const jobRows = jobs || [];
      const ratings = ratingRows || [];
      const escrowList = escrowRows || [];

      setStats({
        open: jobsError ? null : jobRows.filter((job) => ['posted', 'matching', 'offered'].includes(job.status)).length,
        active: jobsError ? null : jobRows.filter((job) => ['confirmed', 'en_route', 'in_progress'].includes(job.status)).length,
        completed: jobsError ? null : jobRows.filter((job) => job.status === 'completed').length,
        earnings: escrowError ? null : escrowList.reduce((sum, row) => sum + Number(row.released_amount || 0), 0),
        rating: ratingsError ? null : ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.stars), 0) / ratings.length : null,
        inEscrow: myEscrowError
          ? null
          : (myEscrowRows || []).reduce(
              (sum, row) => sum + Math.max(0, Number(row.funded_amount || 0) - Number(row.released_amount || 0)),
              0,
            ),
      });
      setRecentJobs(jobsError ? [] : jobRows.slice(0, 4));
      const queryError = jobsError || escrowError || ratingsError || myEscrowError;
      setLoadError(queryError ? `Some dashboard information could not be loaded: ${queryError.message}` : '');
      setIsLoading(false);
    };

    loadDashboard();
    return () => { isCurrent = false; };
  }, [user]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">{isClientMode ? 'Client workspace' : 'Provider workspace'} · {today}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Welcome, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            {isClientMode
              ? 'Explore service categories and keep your requests in one place.'
              : 'Manage your services, location visibility, and client relationships.'}
          </p>
        </div>
        {isClientMode ? (
          <div className="flex flex-wrap gap-3 self-start sm:self-auto">
            <Button as={Link} to="/dashboard/post-job" variant="primary" className="inline-flex items-center gap-2">
              Post a job
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button as={Link} to="/dashboard/marketplace" variant="outline" className="inline-flex items-center gap-2">
              Find a service
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button as={Link} to="/dashboard/find-me" variant="primary" className="inline-flex items-center gap-2 self-start sm:self-auto">
            Set availability
            <MapPin className="h-4 w-4" />
          </Button>
        )}
      </header>

      <section aria-label="Your statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isClientMode ? (
          <>
            <StatCard title="Open requests" value={stats.open ?? '—'} icon={BriefcaseBusiness} colorClass="bg-sky-50 text-sky-700" />
            <StatCard title="Jobs in progress" value={stats.active ?? '—'} icon={CheckCircle2} colorClass="bg-violet-50 text-violet-700" />
            <StatCard title="Held in escrow" value={stats.inEscrow === null ? '—' : `${stats.inEscrow.toLocaleString()} ETB`} icon={DollarSign} colorClass="bg-amber-50 text-amber-700" />
            <StatCard title="Completed jobs" value={stats.completed ?? '—'} icon={Star} colorClass="bg-emerald-50 text-emerald-700" />
          </>
        ) : (
          <>
            <StatCard title="Active jobs" value={stats.active ?? '—'} icon={BriefcaseBusiness} colorClass="bg-sky-50 text-sky-700" />
            <StatCard title="Completed jobs" value={stats.completed ?? '—'} icon={CheckCircle2} colorClass="bg-emerald-50 text-emerald-700" />
            <StatCard title="Earnings released" value={stats.earnings === null ? '—' : `${stats.earnings.toLocaleString()} ETB`} icon={DollarSign} colorClass="bg-amber-50 text-amber-700" />
            <StatCard title="Average rating" value={stats.rating ? `${stats.rating.toFixed(1)} ★` : '—'} icon={Star} colorClass="bg-purple-50 text-purple-700" />
          </>
        )}
      </section>
      {loadError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError}</p>}

      {isClientMode ? (
        <>
          <section className="rounded-xl border-l-4 border-brand-green bg-brand-navy px-6 py-8 text-white sm:px-9 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">What do you need done?</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold text-white sm:text-3xl">Find the right help for your next project.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">Explore service categories and get your request moving.</p>
            <Button as={Link} to="/dashboard/marketplace" variant="white" className="mt-6 inline-flex items-center gap-2">
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
                {isLoading ? (
                  <p className="text-sm text-slate-500" role="status">Loading your bookings...</p>
                ) : recentJobs.length ? (
                  <>
                    <ul className="space-y-3">
                      {recentJobs.slice(0, 3).map((job) => (
                        <li key={job.id}>
                          <Link to={`/dashboard/jobs/${job.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-brand-green">
                            <span className="min-w-0 truncate font-semibold text-brand-navy">{job.title}</span>
                            <span className="shrink-0 text-xs capitalize text-slate-500">{job.status.replaceAll('_', ' ')}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
                      View all bookings <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">No bookings yet</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Your service requests and updates will appear here.</p>
                    <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
                      View bookings <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
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
              {isLoading ? (
                <p className="text-sm text-slate-500" role="status">Loading recent activity...</p>
              ) : recentJobs.length ? (
                <>
                  <ul className="space-y-3">
                    {recentJobs.map((job) => (
                      <li key={job.id}>
                        <Link to={`/dashboard/jobs/${job.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-brand-green">
                          <span className="min-w-0 truncate font-semibold text-brand-navy">{job.title}</span>
                          <span className="shrink-0 text-xs capitalize text-slate-500">{job.status.replaceAll('_', ' ')}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
                    View bookings <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">Nothing to show yet</p>
                  <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
                    View bookings
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
