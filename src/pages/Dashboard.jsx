import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Gavel,
  MapPinned,
  MessageSquareText,
  PackageCheck,
  PlusCircle,
  ShieldCheck,
  Star,
  Truck,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import StatCard from '../components/dashboard/StatCard';
import { supabase } from '../lib/supabase';

const roleContent = {
  client: {
    label: 'Client dashboard',
    subtitle: 'Track bookings, escrow, and real-time activity across request, haulage, and service jobs.',
    stats: [
      { title: 'Active bookings', value: '12', icon: CalendarCheck2, trend: 'up', trendValue: '18%' },
      { title: 'Escrow balance', value: 'ETB 124.5K', icon: Wallet, trend: 'up', trendValue: '8%' },
      { title: 'Live bids', value: '06', icon: Gavel, trend: 'up', trendValue: '3 new' },
    ],
    modules: [
      {
        title: 'Dispatch & service board',
        badge: 'Live',
        items: ['2 artisan visits waiting for confirmation', '3 cargo loads are being routed', '1 custom project quote requires review'],
      },
      {
        title: 'Escrow & payment controls',
        badge: 'Protected',
        items: ['7 milestone payouts are secured in escrow', '2 final releases await OTP confirmation', '1 wallet top-up is pending settlement'],
      },
      {
        title: 'Tracking & visibility',
        badge: 'GPS',
        items: ['Heavy haul route ETA updated 2 minutes ago', 'Live artisan arrival tracker is active', 'AI cost estimator has 4 uploaded job photos'],
      },
    ],
    actions: [
      { label: 'Book a service', to: '/dashboard/bookings', variant: 'primary' },
      { label: 'Request cargo haulage', to: '/dashboard/bookings', variant: 'outline' },
    ],
  },
  service_provider: {
    label: 'Service provider dashboard',
    subtitle: 'Manage jobs, quotes, verification, and earnings while keeping your work status visible.',
    stats: [
      { title: 'Available jobs', value: '26', icon: BriefcaseBusiness, trend: 'up', trendValue: '12%' },
      { title: 'Earnings pipeline', value: 'ETB 89K', icon: Wallet, trend: 'up', trendValue: '9%' },
      { title: 'Verification score', value: '96%', icon: ShieldCheck, trend: 'up', trendValue: '4 pts' },
    ],
    modules: [
      {
        title: 'Job board & quotes',
        badge: 'Queued',
        items: ['3 nearby requests match your trade category', '4 custom proposals are waiting for client review', '2 urgent maintenance jobs need a same-day response'],
      },
      {
        title: 'Auction & custom works',
        badge: 'New',
        items: ['1 handcrafted item is live in auction', '2 digital provenance certificates are ready', '1 anti-snipe timer is active on a custom piece'],
      },
      {
        title: 'Trust & communication',
        badge: 'Verified',
        items: ['ID and license verification are approved', '5 unread client messages need response', 'Voice notes are enabled in English and Amharic'],
      },
    ],
    actions: [
      { label: 'View job market', to: '/dashboard/bookings', variant: 'primary' },
      { label: 'Manage profile', to: '/dashboard/settings', variant: 'outline' },
    ],
  },
  heavy_operator: {
    label: 'Heavy logistics dashboard',
    subtitle: 'Monitor fleet availability, dispatch queue, safety compliance, and haul payouts in real time.',
    stats: [
      { title: 'Fleet online', value: '08', icon: Truck, trend: 'up', trendValue: '2 new' },
      { title: 'Dispatch queue', value: '14', icon: PackageCheck, trend: 'up', trendValue: '5 ready' },
      { title: 'Revenue today', value: 'ETB 154K', icon: Wallet, trend: 'up', trendValue: '21%' },
    ],
    modules: [
      {
        title: 'Fleet status overview',
        badge: 'Active',
        items: ['4 flatbeds are available for dispatch', '2 tippers are en route to pickup points', '1 crane unit is waiting for permit clearance'],
      },
      {
        title: 'Safety & compliance',
        badge: 'Checked',
        items: ['3 loads passed payload safety validation', '2 permits require expiry review this week', '1 micro-insurance policy is active on a live haul'],
      },
      {
        title: 'Delivery flow',
        badge: 'Telemetry',
        items: ['GPS telemetry is streaming every 10 seconds', '5 SMS updates are waiting to be sent', '2 PoD confirmations need final approval'],
      },
    ],
    actions: [
      { label: 'Open dispatch board', to: '/dashboard/bookings', variant: 'primary' },
      { label: 'Fleet settings', to: '/dashboard/settings', variant: 'outline' },
    ],
  },
};

const Dashboard = () => {
  const [role, setRole] = useState('client');
  const [name, setName] = useState('');
  const [jobs, setJobs] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles')
        .select('full_name, role').eq('id', user.id).maybeSingle();
      const currentRole = profile?.role || 'client';
      let query = supabase.from('jobs')
        .select('id, status, title, job_number, created_at')
        .order('created_at', { ascending: false }).limit(5);
      if (currentRole === 'client') query = query.eq('client_id', user.id);
      else if (currentRole !== 'admin') query = query.or(`provider_id.eq.${user.id},operator_id.eq.${user.id}`);
      const { data: recentJobs, error: queryError } = await query;
      let openJobs = 0;
      if (currentRole !== 'client' && currentRole !== 'admin') {
        const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['posted', 'matching']);
        openJobs = count || 0;
      }
      if (!mounted) return;
      setRole(currentRole);
      setName(profile?.full_name || '');
      setJobs(recentJobs || []);
      setOpenCount(openJobs);
      if (queryError) setError(queryError.message);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const activeCount = jobs.filter((job) => ['confirmed', 'en_route', 'in_progress'].includes(job.status)).length;
  const currentRoleContent = roleContent[role] || roleContent.client;
  const firstName = name.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">NHFAS / {currentRoleContent.label.toUpperCase()}</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Welcome, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{currentRoleContent.subtitle}</p>
        </div>
        {role === 'admin' ? (
          <Button as={Link} to="/dashboard/verification" className="inline-flex items-center gap-2 self-start"><ShieldCheck size={17} />Review providers</Button>
        ) : (
          <Button as={Link} to="/dashboard/bookings" className="inline-flex items-center gap-2 self-start"><PlusCircle size={17} />{role === 'client' ? 'Create a request' : 'Find work'}</Button>
        )}
      </header>

      {error && <p className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}

      <section className="grid gap-4 md:grid-cols-3">
        {currentRoleContent.stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            trendValue={stat.trendValue}
            colorClass="bg-brand-softBlue text-brand-navy"
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Operations</p>
              <h2 className="mt-1 text-xl font-bold text-brand-navy">Operational overview</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-softBlue px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-navy">
              <BellRing size={12} /> Active
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {currentRoleContent.modules.map((module) => (
              <div key={module.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-brand-navy">{module.title}</h3>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                    {module.badge}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {module.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-green" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-navy">Quick actions</h3>
              <ArrowRight className="text-brand-green" size={16} />
            </div>
            <div className="mt-4 space-y-3">
              {currentRoleContent.actions.map((action) => (
                <Button
                  key={action.label}
                  as={Link}
                  to={action.to}
                  variant={action.variant === 'primary' ? 'primary' : 'outline'}
                  className="w-full justify-center"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-brand-navy">Priority queue</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Now</span>
            </div>

            <ul className="mt-4 space-y-3">
              {loading ? (
                <li className="text-sm text-slate-500">Loading activity...</li>
              ) : jobs.length ? (
                jobs.slice(0, 3).map((job) => (
                  <li key={job.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-brand-navy">{job.title}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                        {job.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />} {job.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Request #{job.job_number} • {new Date(job.created_at).toLocaleDateString()}</p>
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No activity yet. Start with a new booking or a fresh job request.
                </li>
              )}
            </ul>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between border-b border-slate-200 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Recent activity</p>
            <h2 className="mt-1 text-xl font-bold text-brand-navy">Latest workstream</h2>
          </div>
          <Link to="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-navy hover:text-brand-green">
            View all <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <p className="py-8 text-sm text-slate-500">Loading activity...</p>
        ) : jobs.length ? (
          <div className="mt-4 divide-y divide-slate-200">
            {jobs.map((job) => (
              <Link key={job.id} to="/dashboard/bookings" className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <BriefcaseBusiness className="shrink-0 text-brand-green" size={18} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-navy">{job.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Request #{job.job_number} · {new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold capitalize text-slate-600">
                  {job.status === 'completed' ? <CircleCheck size={15} className="text-green-700" /> : <Clock3 size={15} />}
                  {job.status.replaceAll('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <BriefcaseBusiness className="mx-auto text-slate-400" size={25} />
            <h3 className="mt-3 font-bold text-brand-navy">No activity yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              {role === 'client' ? 'Create a request and it will appear here.' : 'Accept a request to start building your work history.'}
            </p>
            <Button as={Link} to="/dashboard/bookings" variant="outline" className="mt-4 inline-flex items-center gap-2">
              {role === 'client' ? 'Start a booking' : 'Browse jobs'}
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
