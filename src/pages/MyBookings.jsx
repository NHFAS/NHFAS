import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle, MapPin, PlusCircle, Truck } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { StatusBadge, jobTypeLabels } from '../lib/jobStatus';

const JOB_CARD_FIELDS = 'id, job_number, title, job_type, status, provider_id, availability_status, agreed_price, scheduled_start, created_at, service_address, pickup_address, dropoff_address, provider:profiles!jobs_provider_id_fkey(full_name), client:profiles!jobs_client_id_fkey(full_name)';

const availabilityMeta = {
  available: { label: 'Available', className: 'text-emerald-700 border-emerald-100 bg-emerald-50' },
  unavailable: { label: 'Taken', className: 'text-slate-500 border-slate-100 bg-slate-100' },
};

const clientFilters = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open', match: (job) => ['posted', 'matching', 'offered'].includes(job.status) },
  { id: 'active', label: 'In progress', match: (job) => ['confirmed', 'en_route', 'in_progress'].includes(job.status) },
  { id: 'completed', label: 'Completed', match: (job) => job.status === 'completed' },
  { id: 'closed', label: 'Cancelled', match: (job) => ['cancelled', 'disputed'].includes(job.status) },
];

const JobCard = ({ job, subtitleName, subtitleLabel, children }) => {
  const address = job.service_address || job.pickup_address || job.dropoff_address;
  const isAvailable = job.provider_id === null && job.availability_status === 'available';
  const availMeta = isAvailable ? availabilityMeta.available : availabilityMeta.unavailable;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${availMeta.className}`}>{availMeta.label}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{jobTypeLabels[job.job_type]}</span>
          </div>
          <h3 className="mt-2 font-bold text-brand-navy">
            <Link to={`/dashboard/jobs/${job.id}`} className="hover:text-brand-green">
              #{job.job_number} · {job.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {subtitleLabel} {subtitleName || '—'}
            {address ? ` · ${address}` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Posted {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(job.created_at))}
            {job.scheduled_start ? ` · Scheduled ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(job.scheduled_start))}` : ''}
            {job.agreed_price ? ` · Budget ${job.agreed_price} ETB` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {children}
          <Link to={`/dashboard/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:text-brand-navy">
            Open details <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
};

const MyBookings = () => {
  const { user, isClientMode } = useOutletContext();
  const [myJobs, setMyJobs] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [accepting, setAccepting] = useState(null);
  const [acceptError, setAcceptError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError('');
    const [mine, open, accepted] = await Promise.all([
      supabase.from('jobs').select(JOB_CARD_FIELDS).eq('client_id', user.id).order('created_at', { ascending: false }).limit(25),
      supabase.from('jobs').select(JOB_CARD_FIELDS).is('provider_id', null).eq('availability_status', 'available').in('status', ['posted', 'matching']).order('created_at', { ascending: false }).limit(20),
      supabase.from('jobs').select(JOB_CARD_FIELDS).eq('provider_id', user.id).order('created_at', { ascending: false }).limit(25),
    ]);
    if (mine.error || open.error || accepted.error) {
      setMyJobs([]);
      setOpenJobs([]);
      setAcceptedJobs([]);
      const queryError = mine.error || open.error || accepted.error;
      setLoadError(`Bookings could not be loaded: ${queryError.message}`);
    } else {
      setMyJobs(mine.data || []);
      setOpenJobs(open.data || []);
      setAcceptedJobs(accepted.data || []);
      setLoadError('');
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFilter = clientFilters.find((item) => item.id === filter) || clientFilters[0];
  const visibleMyJobs = isClientMode && activeFilter.match ? myJobs.filter(activeFilter.match) : myJobs;

  const acceptJob = async (jobId) => {
    setAccepting(jobId);
    setAcceptError('');
    const { error } = await supabase.rpc('accept_job', { target_job_id: jobId });
    if (error) setAcceptError(error.message);
    // Always refresh so the list reflects reality (job may have been taken by another provider)
    await load();
    setAccepting(null);
  };
  if (isLoading) {
    return <div className="py-16 text-sm text-slate-500" role="status">Loading bookings...</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">{isClientMode ? 'Client workspace' : 'Provider workspace'}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">{isClientMode ? 'My bookings' : 'Jobs'}</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            {isClientMode
              ? 'Track the jobs you have posted and their progress.'
              : 'Accept open jobs from clients and manage the work you have taken on.'}
          </p>
        </div>
        {isClientMode && (
          <Button as={Link} to="/dashboard/post-job" variant="primary" className="inline-flex items-center gap-2 self-start sm:self-auto">
            <PlusCircle className="h-4 w-4" /> Post a job
          </Button>
        )}
      </header>

      {isClientMode && myJobs.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter bookings">
          {clientFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === item.id
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-green hover:text-brand-green'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <p>{loadError}</p>
          <button type="button" onClick={load} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
        </div>
      )}
      {acceptError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{acceptError}</p>
      )}

      {!loadError && !isClientMode && (
        <section aria-labelledby="open-jobs-heading">
          <h2 id="open-jobs-heading" className="mb-3 text-xl font-bold text-brand-navy">Open jobs</h2>
          {openJobs.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No open jobs right now. New requests from clients appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {openJobs.map((job) => (
                <JobCard key={job.id} job={job} subtitleName={job.client?.full_name} subtitleLabel="Client">
                  <Button
                    onClick={() => acceptJob(job.id)}
                    disabled={accepting === job.id}
                    className="h-9 gap-2 px-4 text-sm"
                  >
                    {accepting === job.id ? <LoaderCircle size={15} className="animate-spin" /> : <Truck size={15} />}
                    {accepting === job.id ? 'Accepting...' : 'Accept job'}
                  </Button>
                </JobCard>
              ))}
            </div>
          )}
        </section>
      )}

      {!loadError && <section aria-labelledby="my-jobs-heading">
        <h2 id="my-jobs-heading" className="mb-3 text-xl font-bold text-brand-navy">
          {isClientMode ? 'Your posted jobs' : 'Jobs you have accepted'}
        </h2>
        {(isClientMode ? visibleMyJobs : acceptedJobs).length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <MapPin className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-bold text-brand-navy">
              {isClientMode
                ? (myJobs.length === 0 ? 'No jobs posted yet' : `No ${activeFilter.label.toLowerCase()} jobs`)
                : 'No accepted jobs yet'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-slate-500">
              {isClientMode
                ? (myJobs.length === 0 ? 'Post your first job and nearby providers will pick it up.' : 'Jobs matching this filter will appear here.')
                : 'Browse the open jobs above and accept one to get started.'}
            </p>
            {isClientMode && myJobs.length === 0 && (
              <Button as={Link} to="/dashboard/post-job" variant="primary" className="mt-5 inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> Post a job
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {(isClientMode ? visibleMyJobs : acceptedJobs).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                subtitleName={isClientMode ? job.provider?.full_name : job.client?.full_name}
                subtitleLabel={isClientMode ? 'Provider' : 'Client'}
              />
            ))}
          </div>
        )}
      </section>}
    </div>
  );
};

export default MyBookings;
