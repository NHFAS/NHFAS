import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CircleHelp, LoaderCircle, MapPin, MessageCircle, Plus, Radio, Send, Truck, Volume2, X } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const initialRequest = {
  title: '',
  description: '',
  jobType: 'artisan_service',
  bookingMode: 'quote',
  categoryId: '',
  serviceAddress: '',
  pickupAddress: '',
  dropoffAddress: '',
  price: '',
  scheduledStart: '',
  cargoDescription: '',
  cargoWeight: '',
  cargoLength: '',
  cargoWidth: '',
  cargoHeight: '',
  hazardous: false,
  oversize: false,
};

const statusLabels = {
  posted: 'Finding a provider',
  matching: 'Finding a provider',
  confirmed: 'Confirmed',
  en_route: 'Provider en route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Under safety review',
};

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Schedule to be agreed';

const Bookings = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('client');
  const [mode, setMode] = useState('mine');
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState({});
  const [quoteInputs, setQuoteInputs] = useState({});
  const [conversations, setConversations] = useState({});
  const [messages, setMessages] = useState({});
  const [messageDrafts, setMessageDrafts] = useState({});
  const [disputeReasons, setDisputeReasons] = useState({});
  const [permitForms, setPermitForms] = useState({});
  const [ratingStars, setRatingStars] = useState({});
  const [ratingComments, setRatingComments] = useState({});
  const [tracking, setTracking] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});
  const [request, setRequest] = useState(initialRequest);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workingJob, setWorkingJob] = useState(null);
  const [error, setError] = useState('');
  const watchIds = useRef(new Map());

  const loadJobs = async (currentUser, currentRole, currentMode) => {
    let query = supabase
      .from('jobs')
      .select('*, service_categories(name), cargo_specifications(*), job_quotes(id, provider_id, amount, estimated_days, proposal, status, created_at), regulatory_permits(id, permit_type, permit_number, issuing_authority, status, valid_until), ratings(id, rater_id, ratee_id, stars, comment, created_at), escrow_accounts(status)')
      .order('created_at', { ascending: false });

    if (currentMode === 'available' && currentRole !== 'client') {
      query = query.in('status', ['posted', 'matching']);
      query = query.neq('booking_mode', 'auction');
    } else if (currentRole === 'client') {
      query = query.eq('client_id', currentUser.id);
    } else {
      query = query.or(`provider_id.eq.${currentUser.id},operator_id.eq.${currentUser.id}`);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setJobs([]);
      return;
    }

    const visibleJobs = data || [];
    setJobs(visibleJobs);
    const activeJobs = visibleJobs.filter((job) => ['confirmed', 'en_route', 'in_progress'].includes(job.status));
    const latestPoints = await Promise.all(activeJobs.map(async (job) => {
      const { data: point } = await supabase
        .from('job_tracking_points')
        .select('latitude, longitude, recorded_at')
        .eq('job_id', job.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return [job.id, point];
    }));
    setTracking((current) => ({ ...current, ...Object.fromEntries(latestPoints.filter(([, point]) => point)) }));
  };

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      setLoading(true);
      const { data: { user: signedInUser }, error: authError } = await supabase.auth.getUser();
      if (!mounted) return;
      if (authError || !signedInUser) {
        setError(authError?.message || 'Sign in to view your jobs.');
        setLoading(false);
        return;
      }
      setUser(signedInUser);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', signedInUser.id)
        .single();
      if (!mounted) return;
      if (profileError) setError(profileError.message);
      const currentRole = profile?.role || 'client';
      setRole(currentRole);
      setMode(currentRole === 'client' ? 'mine' : 'available');

      const { data: categoryData } = await supabase
        .from('service_categories')
        .select('id, name, category_type')
        .eq('is_active', true)
        .order('name');
      if (mounted) setCategories(categoryData || []);

      if (currentRole === 'heavy_operator') {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('id, plate_number, rated_payload_kg, vehicle_classes(name, rated_payload_kg)')
          .eq('status', 'active')
          .eq('maintenance_blocked', false);
        if (mounted) setVehicles(vehicleData || []);
      }

      await loadJobs(signedInUser, currentRole, currentRole === 'client' ? 'mine' : 'available');
      if (mounted) setLoading(false);
    };

    initialize();
    return () => {
      mounted = false;
      watchIds.current.forEach((watchId) => navigator.geolocation?.clearWatch(watchId));
      watchIds.current.clear();
    };
  }, []);

  const refresh = async () => {
    if (user) await loadJobs(user, role, mode);
  };

  const changeMode = async (nextMode) => {
    setMode(nextMode);
    setError('');
    if (user) {
      setLoading(true);
      await loadJobs(user, role, nextMode);
      setLoading(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');
    const isHaulage = request.jobType === 'haulage';
    const { error: createError } = await supabase.rpc('create_job_request', {
      request_title: request.title,
      request_description: request.description || null,
      request_job_type: request.jobType,
      request_mode: request.jobType === 'custom_build' ? 'quote' : request.bookingMode,
      target_category_id: request.categoryId || null,
      request_service_address: isHaulage ? null : request.serviceAddress || null,
      request_pickup_address: isHaulage ? request.pickupAddress : null,
      request_dropoff_address: isHaulage ? request.dropoffAddress : null,
      request_price: request.bookingMode === 'fixed_rate' && request.price ? Number(request.price) : null,
      request_scheduled_start: request.scheduledStart ? new Date(request.scheduledStart).toISOString() : null,
      request_cargo_description: isHaulage ? request.cargoDescription : null,
      request_cargo_weight_kg: isHaulage ? Number(request.cargoWeight) : null,
      request_cargo_length_m: isHaulage && request.cargoLength ? Number(request.cargoLength) : null,
      request_cargo_width_m: isHaulage && request.cargoWidth ? Number(request.cargoWidth) : null,
      request_cargo_height_m: isHaulage && request.cargoHeight ? Number(request.cargoHeight) : null,
      request_cargo_hazardous: isHaulage && request.hazardous,
      request_cargo_oversize: isHaulage && request.oversize,
    });

    if (createError) {
      setError(createError.message);
      setSubmitting(false);
      return;
    }
    setRequest(initialRequest);
    setShowForm(false);
    setSubmitting(false);
    setMode('mine');
    await loadJobs(user, role, 'mine');
  };

  const acceptJob = async (job) => {
    setWorkingJob(job.id);
    setError('');
    const { error: acceptError } = await supabase.rpc('accept_job', {
      target_job_id: job.id,
      target_vehicle_id: job.job_type === 'haulage' ? selectedVehicles[job.id] || null : null,
    });
    if (acceptError) setError(acceptError.message);
    else await refresh();
    setWorkingJob(null);
  };

  const submitQuote = async (job) => {
    const values = quoteInputs[job.id] || {};
    setWorkingJob(job.id);
    setError('');
    const { error: quoteError } = await supabase.rpc('submit_job_quote', {
      target_job_id: job.id,
      quote_amount: Number(values.amount),
      quote_days: values.days ? Number(values.days) : null,
      quote_proposal: values.proposal || null,
    });
    if (quoteError) setError(quoteError.message);
    else await refresh();
    setWorkingJob(null);
  };

  const acceptQuote = async (quoteId) => {
    setWorkingJob(quoteId);
    setError('');
    const { error: quoteError } = await supabase.rpc('accept_job_quote', { target_quote_id: quoteId });
    if (quoteError) setError(quoteError.message);
    else await refresh();
    setWorkingJob(null);
  };

  const loadMessages = async (conversationId) => {
    const { data, error: messageError } = await supabase.from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (messageError) setError(messageError.message);
    else setMessages((current) => ({ ...current, [conversationId]: data || [] }));
  };

  const openConversation = async (jobId) => {
    setWorkingJob(jobId);
    setError('');
    const { data: conversationId, error: conversationError } = await supabase.rpc('open_job_conversation', { target_job_id: jobId });
    if (conversationError) setError(conversationError.message);
    else {
      setConversations((current) => ({ ...current, [jobId]: conversationId }));
      await loadMessages(conversationId);
    }
    setWorkingJob(null);
  };

  const sendMessage = async (event, jobId) => {
    event.preventDefault();
    const conversationId = conversations[jobId];
    const body = messageDrafts[jobId]?.trim();
    if (!body || !conversationId) return;
    const { error: sendError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    });
    if (sendError) setError(sendError.message);
    else {
      setMessageDrafts((current) => ({ ...current, [jobId]: '' }));
      await loadMessages(conversationId);
    }
  };

  const openDispute = async (event, job) => {
    event.preventDefault();
    setWorkingJob(job.id);
    setError('');
    const { error: disputeError } = await supabase.rpc('open_job_dispute', {
      target_job_id: job.id,
      dispute_reason: disputeReasons[job.id],
    });
    if (disputeError) setError(disputeError.message);
    else {
      setDisputeReasons((current) => ({ ...current, [job.id]: '' }));
      await refresh();
    }
    setWorkingJob(null);
  };

  const submitRating = async (event, job) => {
    event.preventDefault();
    setWorkingJob(job.id);
    setError('');
    const { error: ratingError } = await supabase.rpc('submit_job_rating', {
      target_job_id: job.id,
      rating_stars: ratingStars[job.id],
      rating_comment: ratingComments[job.id] || null,
    });
    if (ratingError) setError(ratingError.message);
    else await refresh();
    setWorkingJob(null);
  };

  const submitPermit = async (event, job) => {
    event.preventDefault();
    const fields = permitForms[job.id] || {};
    setWorkingJob(job.id);
    setError('');
    const { error: permitError } = await supabase.from('regulatory_permits').insert({
      job_id: job.id,
      permit_type: fields.type,
      permit_number: fields.number || null,
      issuing_authority: fields.authority || null,
      valid_from: fields.validFrom || null,
      valid_until: fields.validUntil || null,
      status: 'pending',
    });
    if (permitError) setError(permitError.message);
    else {
      setPermitForms((current) => ({ ...current, [job.id]: {} }));
      await refresh();
    }
    setWorkingJob(null);
  };

  useEffect(() => {
    const activeConversations = Object.values(conversations);
    if (!activeConversations.length) return undefined;
    const timer = window.setInterval(() => activeConversations.forEach(loadMessages), 10000);
    return () => window.clearInterval(timer);
  }, [conversations]);

  const updateStatus = async (jobId, nextStatus) => {
    setWorkingJob(jobId);
    setError('');
    const { error: statusError } = await supabase.rpc('update_job_status', {
      target_job_id: jobId,
      next_status: nextStatus,
    });
    if (statusError) setError(statusError.message);
    else await refresh();
    setWorkingJob(null);
  };

  const reportIncident = async (job, emergency, description = '') => {
    setWorkingJob(job.id);
    setError('');
    let coordinates = null;
    if (navigator.geolocation) {
      try {
        coordinates = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
        ));
      } catch {
        coordinates = null;
      }
    }
    const { error: incidentError } = await supabase.rpc('report_safety_incident', {
      target_job_id: job.id,
      incident_type: emergency ? 'accident' : 'other',
      severity: emergency ? 'critical' : 'medium',
      incident_description: emergency ? 'Emergency SOS activated by a job participant.' : description,
      incident_latitude: coordinates?.latitude ?? null,
      incident_longitude: coordinates?.longitude ?? null,
      is_emergency: emergency,
    });
    if (incidentError) setError(incidentError.message);
    else await refresh();
    setWorkingJob(null);
  };

  const toggleTracking = (jobId) => {
    if (watchIds.current.has(jobId)) {
      navigator.geolocation.clearWatch(watchIds.current.get(jobId));
      watchIds.current.delete(jobId);
      setTracking((current) => ({ ...current, [`watching:${jobId}`]: false }));
      return;
    }
    if (!navigator.geolocation) {
      setError('This browser does not support location sharing.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(async ({ coords }) => {
      const point = {
        job_id: jobId,
        driver_id: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_m: coords.accuracy,
        speed_kph: coords.speed == null ? null : coords.speed * 3.6,
      };
      const { error: pointError } = await supabase.from('job_tracking_points').insert(point);
      if (pointError) setError(pointError.message);
      else setTracking((current) => ({
        ...current,
        [jobId]: { latitude: coords.latitude, longitude: coords.longitude, recorded_at: new Date().toISOString() },
        [`watching:${jobId}`]: true,
      }));
    }, (locationError) => setError(locationError.message), {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    });
    watchIds.current.set(jobId, watchId);
    setTracking((current) => ({ ...current, [`watching:${jobId}`]: true }));
  };

  const isClient = role === 'client';
  const isAvailableMode = mode === 'available' && !isClient;

  const getStatusOptions = (job) => {
    if (!user) return [];

    if (job.client_id === user.id && ['posted', 'matching', 'confirmed'].includes(job.status)) {
      return [{ value: 'cancelled', label: 'Cancel request' }];
    }

    if (job.provider_id === user.id || job.operator_id === user.id) {
      const optionsMap = {
        confirmed: [{ value: 'en_route', label: 'Mark provider en route' }],
        en_route: [{ value: 'in_progress', label: 'Mark in progress' }],
        in_progress: [{ value: 'completed', label: 'Mark completed' }],
      };
      return optionsMap[job.status] || [];
    }

    return [];
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">NHFAS / WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">{isClient ? 'Your service requests' : 'Job marketplace'}</h1>
          <p className="mt-2 text-sm text-slate-600">{isClient ? 'Post a request and follow each booking from confirmation to completion.' : 'Discover requests, accept eligible work, and keep clients updated.'}</p>
        </div>
        {isClient && (
          <Button onClick={() => setShowForm((visible) => !visible)} className="gap-2 self-start sm:self-auto">
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? 'Close request' : 'New request'}
          </Button>
        )}
      </header>

      {isClient && showForm && (
        <form onSubmit={submitRequest} className="space-y-5 border-b border-slate-200 pb-7">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Request type">
            {[
              ['artisan_service', 'Artisan service'],
              ['custom_build', 'Custom project'],
              ['haulage', 'Heavy haulage'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRequest((current) => ({ ...current, jobType: value, bookingMode: value === 'custom_build' ? 'quote' : current.bookingMode }))}
                className={`min-h-10 border px-4 text-sm font-semibold transition-colors ${request.jobType === value ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-navy'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Request title
              <input required maxLength={140} value={request.title} onChange={(event) => setRequest({ ...request, title: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" placeholder={request.jobType === 'haulage' ? 'Transport construction materials' : 'Repair a leaking kitchen tap'} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Service category
              <select value={request.categoryId} onChange={(event) => setRequest({ ...request, categoryId: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20">
                <option value="">Choose a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
              Details
              <textarea value={request.description} onChange={(event) => setRequest({ ...request, description: event.target.value })} rows={3} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" placeholder="Describe the work, materials, or timing requirements" />
            </label>

            {request.jobType === 'haulage' ? (
              <>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Pickup address
                  <input required value={request.pickupAddress} onChange={(event) => setRequest({ ...request, pickupAddress: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Drop-off address
                  <input required value={request.dropoffAddress} onChange={(event) => setRequest({ ...request, dropoffAddress: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Cargo description
                  <input required value={request.cargoDescription} onChange={(event) => setRequest({ ...request, cargoDescription: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" placeholder="Steel beams, bagged cement..." />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Cargo weight (kg)
                  <input required type="number" min="0.1" step="0.1" value={request.cargoWeight} onChange={(event) => setRequest({ ...request, cargoWeight: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Length (m)
                  <input type="number" min="0.1" step="0.1" value={request.cargoLength} onChange={(event) => setRequest({ ...request, cargoLength: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">Width (m)<input type="number" min="0.1" step="0.1" value={request.cargoWidth} onChange={(event) => setRequest({ ...request, cargoWidth: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" /></label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">Height (m)<input type="number" min="0.1" step="0.1" value={request.cargoHeight} onChange={(event) => setRequest({ ...request, cargoHeight: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" /></label>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-700 md:col-span-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={request.hazardous} onChange={(event) => setRequest({ ...request, hazardous: event.target.checked })} />Hazardous cargo</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={request.oversize} onChange={(event) => setRequest({ ...request, oversize: event.target.checked })} />Oversize cargo</label>
                </div>
              </>
            ) : (
              <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                Service address
                <input value={request.serviceAddress} onChange={(event) => setRequest({ ...request, serviceAddress: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" placeholder="Area, street, or landmark" />
              </label>
            )}

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Booking method
              <select disabled={request.jobType === 'custom_build'} value={request.jobType === 'custom_build' ? 'quote' : request.bookingMode} onChange={(event) => setRequest({ ...request, bookingMode: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green disabled:bg-slate-100">
                <option value="quote">Request a quote</option>
                <option value="instant">Provider sets price</option>
                <option value="fixed_rate">Fixed price</option>
              </select>
            </label>
            {request.bookingMode === 'fixed_rate' && request.jobType !== 'custom_build' && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">Budget (ETB)<input required type="number" min="0" step="1" value={request.price} onChange={(event) => setRequest({ ...request, price: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" /></label>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Preferred start
              <input type="datetime-local" value={request.scheduledStart} onChange={(event) => setRequest({ ...request, scheduledStart: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-brand-green" />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-slate-500">Haulage dispatch checks cargo weight against the selected vehicle payload. Permit and insurance checks still require configured review workflows.</p>
            <Button type="submit" disabled={submitting} className="gap-2 self-start">
              {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              Post request
            </Button>
          </div>
        </form>
      )}

      {!isClient && (
        <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Job views">
          {[
            ['available', 'Available jobs'],
            ['mine', 'My active jobs'],
          ].map(([value, label]) => (
            <button key={value} role="tab" aria-selected={mode === value} onClick={() => changeMode(value)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${mode === value ? 'border-brand-green text-brand-navy' : 'border-transparent text-slate-500 hover:text-brand-navy'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="flex items-start gap-2 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert"><CircleHelp size={18} className="mt-0.5 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <section className="border-y border-slate-200 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-600"><Truck size={22} /></div>
          <h2 className="mt-4 text-lg font-bold text-brand-navy">{isAvailableMode ? 'No open requests right now' : 'No bookings yet'}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{isAvailableMode ? 'New requests from clients will appear here.' : isClient ? 'Create a service or haulage request to get started.' : 'Accepted work and its latest status will show here.'}</p>
          {isClient && !showForm && <Button onClick={() => setShowForm(true)} variant="outline" className="mt-5 gap-2"><Plus size={16} />Create a request</Button>}
        </section>
      ) : (
        <section className="divide-y divide-slate-200 border-y border-slate-200" aria-label="Jobs">
          {jobs.map((job) => {
            const isMine = job.client_id === user?.id || job.provider_id === user?.id || job.operator_id === user?.id;
            const activeJob = ['confirmed', 'en_route', 'in_progress'].includes(job.status);
            const cargo = job.cargo_specifications?.[0];
            const quotes = job.job_quotes || [];
            const permits = job.regulatory_permits || [];
            const ratings = job.ratings || [];
            const escrowAccounts = job.escrow_accounts || [];
            const ownRating = ratings.find((rating) => rating.rater_id === user?.id);
            const escrowReleased = !escrowAccounts.length || escrowAccounts.some((account) => account.status === 'released');
            const quoteBased = job.booking_mode === 'quote' || job.job_type === 'custom_build';
            const statusOptions = getStatusOptions(job);
            const selectedStatus = statusDrafts[job.id] || statusOptions[0]?.value || '';
            return (
              <article key={job.id} className="py-5 sm:py-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-green">{job.service_categories?.name || (job.job_type === 'haulage' ? 'Heavy haulage' : job.job_type.replace('_', ' '))}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-400" />
                      <span className="text-xs text-slate-500">Request #{job.job_number}</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold text-brand-navy">{job.title}</h2>
                    {job.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{job.description}</p>}
                    <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
                      {job.job_type === 'haulage' ? (
                        <>
                          <p><span className="font-semibold text-slate-800">Pickup:</span> {job.pickup_address}</p>
                          <p><span className="font-semibold text-slate-800">Drop-off:</span> {job.dropoff_address}</p>
                          {cargo && <p className="sm:col-span-2"><span className="font-semibold text-slate-800">Cargo:</span> {cargo.description} · {Number(cargo.weight_kg).toLocaleString()} kg{cargo.is_hazardous ? ' · hazardous' : ''}{cargo.is_oversize ? ' · oversize' : ''}</p>}
                        </>
                      ) : job.service_address ? <p><span className="font-semibold text-slate-800">Location:</span> {job.service_address}</p> : null}
                      <p><span className="font-semibold text-slate-800">Preferred:</span> {formatDate(job.scheduled_start)}</p>
                      {job.agreed_price != null && <p><span className="font-semibold text-slate-800">Budget:</span> {Number(job.agreed_price).toLocaleString()} {job.currency}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:min-w-48 lg:justify-end">
                    <span className={`inline-flex min-h-8 items-center px-2.5 text-xs font-bold ${job.status === 'disputed' ? 'bg-red-100 text-red-800' : job.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
                      {statusLabels[job.status] || job.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isAvailableMode && !isMine && (
                    <>
                      {job.job_type === 'haulage' && (
                        <select aria-label={`Vehicle for ${job.title}`} value={selectedVehicles[job.id] || ''} onChange={(event) => setSelectedVehicles((current) => ({ ...current, [job.id]: event.target.value }))} className="h-10 max-w-full border border-slate-300 bg-white px-3 text-sm text-slate-700">
                          <option value="">Choose an eligible vehicle</option>
                          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number} · {vehicle.vehicle_classes?.name} · {Number(vehicle.rated_payload_kg || vehicle.vehicle_classes?.rated_payload_kg || 0).toLocaleString()} kg</option>)}
                        </select>
                      )}
                      {quoteBased ? (
                        <details className="basis-full pt-2">
                          <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-navy underline underline-offset-4">Prepare a quote</summary>
                          <form className="mt-3 grid max-w-3xl gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submitQuote(job); }}>
                            <label className="space-y-1 text-sm font-medium text-slate-700">Price (ETB)<input required type="number" min="1" step="1" value={quoteInputs[job.id]?.amount || ''} onChange={(event) => setQuoteInputs((current) => ({ ...current, [job.id]: { ...current[job.id], amount: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" /></label>
                            <label className="space-y-1 text-sm font-medium text-slate-700">Estimated days<input type="number" min="1" step="1" value={quoteInputs[job.id]?.days || ''} onChange={(event) => setQuoteInputs((current) => ({ ...current, [job.id]: { ...current[job.id], days: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" /></label>
                            <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">Proposal<textarea rows={2} value={quoteInputs[job.id]?.proposal || ''} onChange={(event) => setQuoteInputs((current) => ({ ...current, [job.id]: { ...current[job.id], proposal: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" placeholder="Describe the scope and approach" /></label>
                            <Button type="submit" disabled={workingJob === job.id} className="h-10 w-fit gap-2 px-4 text-sm">{workingJob === job.id ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}Send quote</Button>
                          </form>
                        </details>
                      ) : (
                        <Button onClick={() => acceptJob(job)} disabled={workingJob === job.id || (job.job_type === 'haulage' && !selectedVehicles[job.id])} className="h-10 gap-2 px-4 text-sm">
                          {workingJob === job.id ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                          Accept job
                        </Button>
                      )}
                    </>
                  )}
                  {job.client_id === user?.id && quotes.length > 0 && (
                    <div className="basis-full border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-bold text-brand-navy">Provider proposals</h3>
                      <div className="mt-2 divide-y divide-slate-200">
                        {quotes.map((quote) => <div key={quote.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="text-sm"><p className="font-semibold text-slate-800">{Number(quote.amount).toLocaleString()} ETB{quote.estimated_days ? ` · ${quote.estimated_days} days` : ''} · Provider {quote.provider_id.slice(0, 8)}</p>{quote.proposal && <p className="mt-1 text-slate-600">{quote.proposal}</p>}<p className="mt-1 text-xs capitalize text-slate-500">{quote.status}</p></div>
                          {quote.status === 'submitted' && ['posted', 'matching'].includes(job.status) && <Button onClick={() => acceptQuote(quote.id)} disabled={workingJob === quote.id} className="h-9 gap-2 px-3 text-sm"><Check size={15} />Accept proposal</Button>}
                        </div>)}
                      </div>
                    </div>
                  )}
                  {job.job_type === 'haulage' && (job.operator_id === user?.id || job.client_id === user?.id) && (
                    <details className="basis-full border-t border-slate-200 pt-3">
                      <summary className="w-fit cursor-pointer text-sm font-semibold text-slate-600 underline underline-offset-4">Permits & compliance ({permits.length})</summary>
                      <div className="mt-3 divide-y divide-slate-200">
                        {permits.map((permit) => <div key={permit.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="font-medium text-slate-800">{permit.permit_type}{permit.permit_number ? ` · ${permit.permit_number}` : ''}{permit.issuing_authority ? ` · ${permit.issuing_authority}` : ''}</span><span className={`text-xs font-bold capitalize ${permit.status === 'approved' ? 'text-green-700' : permit.status === 'rejected' || permit.status === 'expired' ? 'text-red-700' : 'text-amber-700'}`}>{permit.status}{permit.valid_until ? ` · valid to ${new Date(permit.valid_until).toLocaleDateString()}` : ''}</span></div>)}
                        {!permits.length && <p className="py-2 text-sm text-slate-500">No permit records submitted for this job.</p>}
                      </div>
                      {job.operator_id === user?.id && !['completed', 'cancelled'].includes(job.status) && (
                        <form onSubmit={(event) => submitPermit(event, job)} className="mt-3 grid max-w-3xl gap-3 sm:grid-cols-2">
                          <label className="space-y-1 text-sm font-medium text-slate-700">Permit type<input required value={permitForms[job.id]?.type || ''} onChange={(event) => setPermitForms((current) => ({ ...current, [job.id]: { ...current[job.id], type: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" placeholder="Oversize load, route permit" /></label>
                          <label className="space-y-1 text-sm font-medium text-slate-700">Permit number<input value={permitForms[job.id]?.number || ''} onChange={(event) => setPermitForms((current) => ({ ...current, [job.id]: { ...current[job.id], number: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" /></label>
                          <label className="space-y-1 text-sm font-medium text-slate-700">Issuing authority<input value={permitForms[job.id]?.authority || ''} onChange={(event) => setPermitForms((current) => ({ ...current, [job.id]: { ...current[job.id], authority: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" /></label>
                          <label className="space-y-1 text-sm font-medium text-slate-700">Valid until<input type="date" value={permitForms[job.id]?.validUntil || ''} onChange={(event) => setPermitForms((current) => ({ ...current, [job.id]: { ...current[job.id], validUntil: event.target.value } }))} className="w-full border border-slate-300 px-3 py-2 font-normal" /></label>
                          <Button type="submit" disabled={workingJob === job.id} className="h-9 w-fit px-3 text-sm">Submit for review</Button>
                        </form>
                      )}
                    </details>
                  )}
                  {!isAvailableMode && statusOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={selectedStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [job.id]: event.target.value }))} className="h-10 min-w-52 border border-slate-300 bg-white px-3 text-sm text-slate-700">
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <Button onClick={() => updateStatus(job.id, selectedStatus)} disabled={workingJob === job.id || !selectedStatus} className="h-10 gap-2 px-4 text-sm">
                        {selectedStatus === 'completed' ? <Check size={16} /> : <ArrowRight size={16} />}
                        Update status
                      </Button>
                    </div>
                  )}
                  {activeJob && (job.operator_id === user?.id || job.provider_id === user?.id) && (
                    <Button variant="outline" onClick={() => toggleTracking(job.id)} className="h-10 gap-2 px-4 text-sm">
                      {tracking[`watching:${job.id}`] ? <Radio size={16} className="text-red-600" /> : <MapPin size={16} />}
                      {tracking[`watching:${job.id}`] ? 'Stop sharing location' : 'Share live location'}
                    </Button>
                  )}
                  {activeJob && tracking[job.id] && (
                    <a className="inline-flex h-10 items-center gap-2 px-3 text-sm font-medium text-brand-navy underline underline-offset-4" href={`https://www.openstreetmap.org/?mlat=${tracking[job.id].latitude}&mlon=${tracking[job.id].longitude}#map=15/${tracking[job.id].latitude}/${tracking[job.id].longitude}`} target="_blank" rel="noreferrer">
                      Latest location · {new Date(tracking[job.id].recorded_at).toLocaleTimeString()} <MapPin size={15} />
                    </a>
                  )}
                  {activeJob && isMine && (
                    <Button variant="outline" onClick={() => reportIncident(job, true)} disabled={workingJob === job.id} className="h-10 gap-2 border-red-300 px-4 text-sm text-red-700 hover:bg-red-50">
                      <AlertTriangle size={16} />Emergency SOS
                    </Button>
                  )}
                  {activeJob && isMine && (
                    <details className="basis-full pt-2">
                      <summary className="w-fit cursor-pointer text-sm font-semibold text-slate-600 underline underline-offset-4">Report an incident</summary>
                      <form className="mt-3 flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={(event) => {
                        event.preventDefault();
                        const description = new FormData(event.currentTarget).get('incident');
                        reportIncident(job, false, String(description || 'Incident reported'));
                        event.currentTarget.reset();
                      }}>
                        <textarea name="incident" required rows={2} className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-green" placeholder="Describe the incident" />
                        <Button type="submit" variant="outline" className="h-10 gap-2 self-start text-sm"><AlertTriangle size={15} />Submit report</Button>
                      </form>
                    </details>
                  )}
                  {job.status === 'completed' && isMine && (
                    <div className="basis-full border-t border-slate-200 pt-3">
                      {ownRating ? <p className="text-sm font-medium text-slate-600">Your rating: {ownRating.stars}/5{ownRating.comment ? ` · ${ownRating.comment}` : ''}</p> : escrowReleased ? (
                        <form onSubmit={(event) => submitRating(event, job)} className="max-w-2xl space-y-3">
                          <p className="text-sm font-semibold text-brand-navy">Rate your experience</p>
                          <div className="flex gap-1" role="group" aria-label="Choose a rating">
                            {[1, 2, 3, 4, 5].map((stars) => <button key={stars} type="button" aria-pressed={ratingStars[job.id] === stars} onClick={() => setRatingStars((current) => ({ ...current, [job.id]: stars }))} className={`h-10 w-10 border text-sm font-bold ${ratingStars[job.id] === stars ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{stars}</button>)}
                          </div>
                          <textarea required value={ratingComments[job.id] || ''} onChange={(event) => setRatingComments((current) => ({ ...current, [job.id]: event.target.value }))} rows={2} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-green" placeholder="Share feedback" />
                          <Button type="submit" disabled={!ratingStars[job.id] || workingJob === job.id} className="h-9 px-3 text-sm">Submit rating</Button>
                        </form>
                      ) : <p className="text-sm text-slate-500">Ratings unlock after escrow release.</p>}
                    </div>
                  )}
                  {isMine && job.status !== 'posted' && job.status !== 'matching' && job.status !== 'cancelled' && (
                    <details className="basis-full pt-2">
                      <summary className="w-fit cursor-pointer text-sm font-semibold text-slate-600 underline underline-offset-4">Messages</summary>
                      {!conversations[job.id] ? (
                        <Button onClick={() => openConversation(job.id)} disabled={workingJob === job.id} variant="outline" className="mt-3 h-9 gap-2 px-3 text-sm"><MessageCircle size={15} />Open job chat</Button>
                      ) : (
                        <div className="mt-3 max-w-3xl border border-slate-200 bg-white">
                          <div className="max-h-64 space-y-3 overflow-y-auto p-3" aria-live="polite">
                            {(messages[conversations[job.id]] || []).map((message) => <div key={message.id} className={`max-w-[90%] border px-3 py-2 text-sm ${message.sender_id === user.id ? 'ml-auto border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                              <p className="whitespace-pre-wrap break-words text-slate-800">{message.body}</p>
                              <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500"><span>{message.sender_id === user.id ? 'You' : 'Job participant'} · {new Date(message.created_at).toLocaleString()}</span><button aria-label="Read message aloud" title="Read message aloud" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(message.body))} className="text-slate-500 hover:text-brand-navy"><Volume2 size={14} /></button></div>
                            </div>)}
                            {!messages[conversations[job.id]]?.length && <p className="py-4 text-center text-xs text-slate-500">No messages yet.</p>}
                          </div>
                          <form onSubmit={(event) => sendMessage(event, job.id)} className="flex gap-2 border-t border-slate-200 p-3">
                            <input required maxLength={4000} value={messageDrafts[job.id] || ''} onChange={(event) => setMessageDrafts((current) => ({ ...current, [job.id]: event.target.value }))} className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-green" placeholder="Write a message" />
                            <Button type="submit" aria-label="Send message" className="h-10 w-10 p-0"><Send size={16} /></Button>
                          </form>
                        </div>
                      )}
                    </details>
                  )}
                  {activeJob && isMine && (
                    <details className="basis-full pt-2">
                      <summary className="w-fit cursor-pointer text-sm font-semibold text-slate-600 underline underline-offset-4">Open a dispute</summary>
                      <form onSubmit={(event) => openDispute(event, job)} className="mt-3 flex max-w-2xl flex-col gap-3 sm:flex-row">
                        <textarea required rows={2} value={disputeReasons[job.id] || ''} onChange={(event) => setDisputeReasons((current) => ({ ...current, [job.id]: event.target.value }))} className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-green" placeholder="Describe the issue" />
                        <Button type="submit" variant="outline" disabled={workingJob === job.id} className="h-10 gap-2 self-start border-red-300 text-sm text-red-700 hover:bg-red-50"><AlertTriangle size={15} />Open dispute</Button>
                      </form>
                    </details>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default Bookings;