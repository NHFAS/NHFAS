import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, LoaderCircle, Siren, Star, Upload } from 'lucide-react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { StatusBadge, jobStatusMeta, jobTypeLabels } from '../lib/jobStatus';
import JobEscrow from '../components/job/JobEscrow';
import JobChat from '../components/job/JobChat';
import JobTracking from '../components/job/JobTracking';
import JobMilestones from '../components/job/JobMilestones';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const nextStatusActions = {
  confirmed: { to: 'en_route', label: 'Begin route' },
  en_route: { to: 'in_progress', label: 'Arrived — start work' },
  in_progress: { to: 'completed', label: 'Mark as completed' },
};

const permitStatusClasses = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-600',
};

const JobDetail = () => {
  const { jobId } = useParams();
  const { user } = useOutletContext();
  const [job, setJob] = useState(null);
  const [stops, setStops] = useState([]);
  const [cargo, setCargo] = useState(null);
  const [history, setHistory] = useState([]);
  const [permits, setPermits] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [flash, setFlash] = useState('');
  const [working, setWorking] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [permitFile, setPermitFile] = useState(null);
  const [permitExpiry, setPermitExpiry] = useState('');
  const [permitAuthority, setPermitAuthority] = useState('');
  const [dispute, setDispute] = useState(null);
  const [latestIncident, setLatestIncident] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [acceptingQuote, setAcceptingQuote] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    const { data: jobRow, error: jobError } = await supabase
      .from('jobs')
      .select('*, category:service_categories(name), client:profiles!jobs_client_id_fkey(full_name), provider:profiles!jobs_provider_id_fkey(full_name)')
      .eq('id', jobId)
      .maybeSingle();
    if (jobError) {
      setError('This job could not be loaded. Check your connection and try again.');
      setIsLoading(false);
      return;
    }
    if (!jobRow) {
      setError('Job not found.');
      setIsLoading(false);
      return;
    }
    const [{ data: stopRows }, { data: cargoRows }, { data: historyRows }, { data: permitRows }, { data: ratingRows }, { data: incidentRow }, { data: quoteRows }] = await Promise.all([
      supabase.from('job_stops').select('*').eq('job_id', jobId).order('stop_order'),
      supabase.from('cargo_specifications').select('*').eq('job_id', jobId).maybeSingle(),
      supabase.from('job_status_history').select('*').eq('job_id', jobId).order('changed_at', { ascending: false }),
      supabase.from('regulatory_permits').select('*').eq('job_id', jobId).order('created_at', { ascending: false }),
      supabase.from('ratings').select('id, stars, comment').eq('job_id', jobId).eq('rater_id', user.id).maybeSingle(),
      supabase.from('safety_incidents').select('id, status, severity, created_at, emergency_sos')
        .eq('job_id', jobId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('job_quotes').select('*, provider:profiles(full_name)').eq('job_id', jobId).order('created_at', { ascending: false }),
    ]);
    setJob(jobRow);
    setStops(stopRows || []);
    setCargo(cargoRows || null);
    setHistory(historyRows || []);
    setPermits(permitRows || []);
    setMyRating(ratingRows || null);
    setLatestIncident(incidentRow || null);
    setQuotes(quoteRows || []);
    const { data: disputeRow } = await supabase
      .from('disputes')
      .select('id, reason, status, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setDispute(disputeRow || null);
    setIsLoading(false);
  }, [jobId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (window.location.hash === '#job-chat') {
      document.getElementById('job-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [job]);

  const advanceStatus = async (toStatus, successMessage) => {
    // FR-22 pre-flight gate: surface the permit requirement clearly before
    // the enforce_haulage_permit trigger rejects the transition server-side.
    if (toStatus === 'en_route' && job.job_type === 'haulage') {
      const approvedPermit = permits.find((permit) => (
        permit.status === 'approved' && (!permit.valid_until || new Date(permit.valid_until).getTime() >= Date.now())
      ));
      if (!approvedPermit) {
        setActionError('Route start is blocked: upload a transport permit below and wait for compliance approval (FR-22).');
        return;
      }
    }
    setWorking(true);
    setActionError('');
    setFlash('');
    const fromStatus = job.status;
    const { error: updateError } = await supabase.from('jobs').update({ status: toStatus }).eq('id', jobId);
    if (updateError) {
      setActionError(updateError.message);
      setWorking(false);
      return;
    }
    const { error: historyError } = await supabase
      .from('job_status_history')
      .insert({ job_id: jobId, from_status: fromStatus, to_status: toStatus, changed_by: user.id });
    if (historyError) {
      setActionError(`Status updated, but the history entry failed: ${historyError.message}`);
    }
    setFlash(successMessage || `Status updated to ${jobStatusMeta[toStatus]?.label || toStatus}.`);
    await load();
    setWorking(false);
  };

  const cancelJob = () => {
    if (window.confirm('Cancel this job?')) {
      advanceStatus('cancelled', 'The job has been cancelled.');
    }
  };

  const acceptJob = async () => {
    setWorking(true);
    setActionError('');
    setFlash('');
    const { error: acceptError } = await supabase.rpc('accept_job', { target_job_id: jobId });
    if (acceptError) setActionError(acceptError.message);
    else setFlash('Job accepted. It is now in your accepted jobs.');
    await load();
    setWorking(false);
  };

  const acceptQuote = async (quoteId) => {
    setAcceptingQuote(true);
    setActionError('');
    setFlash('');
    const { error: quoteError } = await supabase.rpc('accept_job_quote', {
      target_quote_id: quoteId,
    });
    if (quoteError) {
      setActionError(quoteError.message);
      setAcceptingQuote(false);
      return;
    }
    setFlash('Quote accepted. The provider is now assigned to this job.');
    setAcceptingQuote(false);
    await load();
  };

  const openDispute = async () => {
    const reason = window.prompt('Describe the issue for our mediation team:');
    if (!reason || reason.trim().length < 5) return;
    setWorking(true);
    setActionError('');
    setFlash('');
    const { error: disputeError } = await supabase.rpc('open_job_dispute', {
      target_job_id: jobId,
      dispute_reason: reason.trim(),
    });
    if (disputeError) setActionError(disputeError.message);
    else setFlash('Dispute opened. Escrow is frozen while our mediation team reviews the case.');
    await load();
    setWorking(false);
  };
  const submitRating = async () => {
    if (!ratingStars) return;
    setWorking(true);
    setActionError('');
    const { error: ratingError } = await supabase.from('ratings').insert({
      job_id: jobId,
      rater_id: user.id,
      ratee_id: job.provider_id,
      stars: ratingStars,
      comment: ratingComment.trim() || null,
    });
    if (ratingError) setActionError(ratingError.message);
    else setRatingStars(0), setRatingComment('');
    await load();
    setWorking(false);
  };

  const submitSos = async () => {
    if (!window.confirm('Trigger an emergency SOS? Platform safety staff will be alerted with your location.')) return;
    setWorking(true);
    setActionError('');
    setFlash('');
    let latitude = null;
    let longitude = null;
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch { /* location is optional */ }
    const { error: sosError } = await supabase.from('safety_incidents').insert({
      job_id: jobId,
      reporter_id: user.id,
      incident_type: 'other',
      severity: 'critical',
      description: 'Emergency SOS triggered from the active job screen.',
      latitude,
      longitude,
      emergency_sos: true,
    });
    setWorking(false);
    if (sosError) { setActionError(sosError.message); return; }
    // FR-25: alert every administrator account, not just the incident row.
    const { data: adminRows } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (adminRows && adminRows.length) {
      await supabase.from('notifications').insert(adminRows.map((admin) => ({
        user_id: admin.id,
        title: 'Emergency SOS alert',
        body: `SOS triggered on job #${job.job_number} by ${user.email || 'a participant'}${latitude != null ? ' — live location captured.' : '.'}`,
        notification_type: 'in_app',
        data: { type: 'sos', job_id: jobId },
      })));
    }
    await load();
    setFlash('SOS sent. The NHFAS safety team has been alerted with your live location.');
  };

  const submitPermit = async () => {
    if (!permitFile) return;
    setWorking(true);
    setActionError('');
    setFlash('');
    try {
      const extension = permitFile.type === 'image/png' ? 'png' : 'jpg';
      const path = `${jobId}/permit-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('job-documents').upload(path, permitFile, {
        contentType: permitFile.type, cacheControl: '3600', upsert: false,
      });
      if (uploadError) {
        setActionError(uploadError.message);
        setWorking(false);
        return;
      }
      const { error: permitError } = await supabase.from('regulatory_permits').insert({
        job_id: jobId,
        permit_type: 'transport',
        issuing_authority: permitAuthority.trim() || null,
        valid_until: permitExpiry ? new Date(permitExpiry).toISOString() : null,
        document_url: path,
        status: 'pending',
      });
      if (permitError) {
        await supabase.storage.from('job-documents').remove([path]);
        setActionError(permitError.message);
      } else {
        setPermitFile(null);
        setPermitExpiry('');
        setPermitAuthority('');
        setFlash('Transport permit submitted for compliance review.');
        await load();
      }
    } catch (err) {
      setActionError(err?.message || 'Failed to submit permit. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const openPermitDocument = async (path) => {
    const { data, error: linkError } = await supabase.storage.from('job-documents').createSignedUrl(path, 60);
    if (linkError) setActionError(linkError.message);
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };
  if (isLoading) {
    return <div className="py-16 text-sm text-slate-500" role="status">Loading job...</div>;
  }
  if (error || !job) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-semibold text-red-800">{error || 'Job not found.'}</p>
        <Button as={Link} to="/dashboard/bookings" variant="outline" className="mt-5">Back to bookings</Button>
      </div>
    );
  }

  const isClient = job.client_id === user.id;
  const isAssignedProvider = job.provider_id === user.id;
  const isAssignedOperator = job.operator_id === user.id;
  const isJobParticipant = isClient || isAssignedProvider || isAssignedOperator;
  const jobIsOpen = ['posted', 'matching'].includes(job.status);
  const canAccept = jobIsOpen && !isClient && !isAssignedProvider;
  const nextAction = isAssignedProvider ? nextStatusActions[job.status] : null;
  const canCancel = isClient && ['posted', 'matching', 'offered', 'confirmed'].includes(job.status);
  const sosVisible = (isClient || isAssignedProvider) && ['confirmed', 'en_route', 'in_progress'].includes(job.status);
const openQuotes = quotes.filter((q) => q.status === 'submitted');
  const canRate = isClient && job.status === 'completed' && job.provider_id && !myRating;
  const canUploadPermit = isAssignedProvider && job.job_type === 'haulage'
    && ['confirmed', 'en_route', 'in_progress'].includes(job.status);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Link to="/dashboard/bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={job.status} />
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${job.provider_id === null && job.availability_status === 'available' ? 'text-emerald-700 border-emerald-100 bg-emerald-50' : 'text-slate-500 border-slate-100 bg-slate-100'}`}>
                {job.provider_id === null && job.availability_status === 'available' ? 'Available' : 'Taken'}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{jobTypeLabels[job.job_type]}</span>
              {job.category?.name && <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">{job.category.name}</span>}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-brand-navy sm:text-3xl">#{job.job_number} · {job.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Client {job.client?.full_name || '—'}{job.provider ? ` · Provider ${job.provider.full_name}` : ' · Not yet assigned'}
              {job.agreed_price ? ` · Budget ${job.agreed_price} ETB` : ''}
              {job.scheduled_start ? ` · ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(job.scheduled_start))}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {canAccept && <Button onClick={acceptJob} disabled={working} className="gap-2">Accept this job</Button>}
            {openQuotes.length > 0 && (
              <section aria-label="Job quotes" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
                <h2 className="text-lg font-bold text-brand-navy">Provider quotes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Providers have submitted quotes for this job. Accept one to assign the provider.
                </p>
                <div className="mt-4 space-y-3">
                  {openQuotes.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">
                          Quote #{q.id.slice(0, 8)} · {q.provider?.full_name || 'Provider'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(q.amount)} ·
                          {q.estimated_days ? `${q.estimated_days} days` : ''} ·
                          {q.status}
                        </p>
                        {q.proposal && <p className="text-xs text-slate-500 mt-1">{q.proposal}</p>}
                      </div>
                      <Button
                        onClick={() => acceptQuote(q.id)}
                        disabled={acceptingQuote}
                        className="gap-2"
                      >
                        {acceptingQuote ? <LoaderCircle size={16} className="animate-spin" /> : null}
                        Accept quote
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {nextAction && (
              <Button onClick={() => advanceStatus(nextAction.to)} disabled={working} className="gap-2">
                {working ? <LoaderCircle size={16} className="animate-spin" /> : null}
                {nextAction.label}
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" onClick={cancelJob} disabled={working} className="border-red-300 text-red-700 hover:bg-red-50">
                Cancel job
              </Button>
            )}
            {sosVisible && (
              <Button variant="outline" onClick={submitSos} disabled={working} className="gap-2 border-red-300 text-red-700 hover:bg-red-50">
                <Siren size={16} /> SOS
              </Button>
            )}
            {(isClient || isAssignedProvider)
              && ['confirmed', 'en_route', 'in_progress', 'completed'].includes(job.status)
              && (!dispute || dispute.status !== 'open') && (
              <Button variant="outline" onClick={openDispute} disabled={working} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                Open dispute
              </Button>
            )}
            {isClient && ['artisan_service', 'custom_build'].includes(job.job_type)
              && !['completed', 'cancelled', 'disputed'].includes(job.status) && (
                <Button
                  as={Link}
                  to={`/dashboard/jobs/${jobId}/estimate`}
                  variant="outline"
                  className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <FileText className="h-4 w-4" /> Get Cost Estimate
                </Button>
            )}
          </div>
        </div>
        {actionError && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
          </p>
        )}
        {flash && (
          <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {flash}
          </p>
        )}
        {dispute && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span className="font-bold uppercase tracking-wide">Dispute {dispute.status}</span> — {dispute.reason}
          </p>
        )}
        {latestIncident && ['open', 'investigating'].includes(latestIncident.status) && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
            <Siren className="h-4 w-4 shrink-0" aria-hidden="true" />
            Safety incident on this job — status: {latestIncident.status} (reported {new Date(latestIncident.created_at).toLocaleString()}). Our safety team is on it.
          </p>
        )}
        {job.job_type === 'haulage' && isAssignedProvider && job.status === 'confirmed' && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Heavy haulage: you must upload a transport permit below and have it approved by compliance before you can begin the route.
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <JobEscrow job={job} user={user} />
        <JobTracking job={job} user={user} />
      </div>

      {job.job_type === 'custom_build' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <JobMilestones job={job} user={user} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section aria-label="Job details" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-bold text-brand-navy">Job details</h2>
            {job.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{job.description}</p>}
            <dl className="mt-5 space-y-3 text-sm">
              {job.service_address && (
                <div><dt className="font-semibold text-slate-700">Service address</dt><dd className="text-slate-600">{job.service_address}</dd></div>
              )}
              {job.pickup_address && (
                <div><dt className="font-semibold text-slate-700">Pickup</dt><dd className="text-slate-600">{job.pickup_address}</dd></div>
              )}
              {job.dropoff_address && (
                <div><dt className="font-semibold text-slate-700">Drop-off</dt><dd className="text-slate-600">{job.dropoff_address}</dd></div>
              )}
            </dl>
            {stops.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-brand-navy">Route stops</h3>
                <ol className="mt-2 space-y-1 text-sm text-slate-600">
                  {stops.map((stop) => (
                    <li key={stop.id}>{stop.stop_order}. <span className="font-medium capitalize">{stop.stop_type}</span> — {stop.address}</li>
                  ))}
                </ol>
              </div>
            )}
            {cargo && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-brand-navy">Cargo</h3>
                <p className="mt-1 text-sm text-slate-600">{cargo.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {Number(cargo.weight_kg).toLocaleString()} kg
                  {cargo.length_m ? ` · ${cargo.length_m} m long` : ''}
                  {cargo.width_m ? ` · ${cargo.width_m} m wide` : ''}
                  {cargo.height_m ? ` · ${cargo.height_m} m high` : ''}
                  {cargo.is_hazardous ? ' · Hazardous' : ''}
                  {cargo.is_oversize ? ' · Oversize' : ''}
                </p>
              </div>
            )}
          </section>

          {canRate && (
            <section aria-label="Rate provider" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold text-brand-navy">Rate your provider</h2>
              <p className="mt-1 text-sm text-slate-500">Your feedback helps other clients choose with confidence.</p>
              <div className="mt-4 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRatingStars(star)} aria-label={`Rate ${star} stars`}>
                    <Star className={`h-7 w-7 transition-colors ${star <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'}`} />
                  </button>
                ))}
              </div>
              <textarea rows={3} maxLength={1000} value={ratingComment} onChange={(event) => setRatingComment(event.target.value)}
                placeholder="Share how the job went (optional)"
                className={`mt-4 ${inputClass}`} />
              <div className="mt-4 flex justify-end">
                <Button onClick={submitRating} disabled={!ratingStars || working}>
                  {working ? 'Submitting...' : 'Submit rating'}
                </Button>
              </div>
            </section>
          )}
          {myRating && (
            <section aria-label="Your rating" className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">You rated this job {myRating.stars}/5.</p>
              {myRating.comment && <p className="mt-1 text-sm text-emerald-700">“{myRating.comment}”</p>}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section aria-label="Status timeline" className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-brand-navy">Status timeline</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No status changes yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {history.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-brand-green/40 pl-4">
                    <p className="text-sm font-semibold text-brand-navy">{jobStatusMeta[entry.to_status]?.label || entry.to_status}</p>
                    <p className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.changed_at))}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {isJobParticipant && <JobChat jobId={jobId} user={user} />}

          {job.job_type === 'haulage' && (
            <section aria-label="Transport permits" className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy"><FileText className="h-4 w-4" /> Transport permits</h2>
              {permits.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No permits on file for this job.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {permits.map((permit) => (
                    <li key={permit.id} className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{permit.issuing_authority || 'Transport permit'}</p>
                        <p className="text-xs text-slate-500">
                          Submitted {new Date(permit.created_at).toLocaleDateString()}
                          {permit.valid_until ? ` · valid until ${new Date(permit.valid_until).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${permitStatusClasses[permit.status] || permitStatusClasses.expired}`}>
                          {permit.status}
                        </span>
                        {permit.document_url && (
                          <button type="button" onClick={() => openPermitDocument(permit.document_url)} className="text-xs font-semibold text-brand-green hover:underline">
                            View document
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {canUploadPermit && (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-bold text-brand-navy">Upload a transport permit</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1 text-sm font-medium text-slate-700">
                      Issuing authority
                      <input type="text" maxLength={200} value={permitAuthority} onChange={(event) => setPermitAuthority(event.target.value)}
                        placeholder="Regional transport authority" className={inputClass} />
                    </label>
                    <label className="block space-y-1 text-sm font-medium text-slate-700">
                      Valid until
                      <input type="date" value={permitExpiry} onChange={(event) => setPermitExpiry(event.target.value)} className={inputClass} />
                    </label>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-slate-50">
                    <Upload size={14} /> {permitFile ? permitFile.name : 'Choose permit photo (JPG/PNG)'}
                    <input type="file" accept="image/jpeg,image/png" className="sr-only"
                      onChange={(event) => {
                        try {
                          setPermitFile(event.target.files?.[0] || null);
                          event.target.value = '';
                        } catch (err) {
                          setActionError(err?.message || 'Failed to read selected file.');
                          setPermitFile(null);
                        }
                      }} />
                  </label>
                  <div className="flex justify-end">
                    <Button onClick={submitPermit} disabled={!permitFile || working} className="gap-2">
                      {working ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                      {working ? 'Submitting...' : 'Submit permit'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Compliance officers review permits in the admin queue. Route start is blocked until a permit is approved.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;



