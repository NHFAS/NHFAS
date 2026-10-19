import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Send, Hammer, Truck, TrendingUp } from 'lucide-react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { computeMarketPrice, logFairPriceSnapshot, surgeLabel } from '../lib/fairPrice';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-3 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const PostJob = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKind = searchParams.get('kind') === 'haulage' ? 'haulage' : 'artisan';
  const [kind, setKind] = useState(initialKind);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesRetry, setCategoriesRetry] = useState(0);
  const [vehicleClasses, setVehicleClasses] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', service_address: '', pickup_address: '', dropoff_address: '',
    agreed_price: '', scheduled_start: '', cargo_description: '', weight_kg: '', length_m: '', width_m: '',
    height_m: '', is_hazardous: false, is_oversize: false,
  });
  const [selectedClassId, setSelectedClassId] = useState('');
  const [oversizeAck, setOversizeAck] = useState(false);
  const [hazmatAck, setHazmatAck] = useState(false);
  const [market, setMarket] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    (async () => {
      setCategoriesLoading(true);
      setCategoriesError('');
      const [{ data: cats, error: categoriesQueryError }, { data: classes, error: vehicleClassesError }] = await Promise.all([
        supabase.from('service_categories').select('id, name, category_type').eq('is_active', true).order('name'),
        supabase.from('vehicle_classes').select('id, code, name, rated_payload_kg').order('rated_payload_kg'),
      ]);
      if (!isCurrent) return;
      setCategories(cats || []);
      setVehicleClasses(classes || []);
      if (categoriesQueryError) {
        setCategoriesError(`Service categories could not be loaded: ${categoriesQueryError.message}`);
      }
      if (vehicleClassesError) {
        setError(`Vehicle classes could not be loaded: ${vehicleClassesError.message}`);
      }
      setCategoriesLoading(false);
    })();
    return () => { isCurrent = false; };
  }, [categoriesRetry]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setChecked = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.checked }));

  const weight = form.weight_kg ? Number(form.weight_kg) : null;
  const suggestedClass = weight && weight > 0
    ? vehicleClasses.find((vehicleClass) => vehicleClass.rated_payload_kg >= weight)
    : null;
  const selectedClass = vehicleClasses.find((vehicleClass) => vehicleClass.id === selectedClassId) || null;
  const lengthM = form.length_m ? Number(form.length_m) : null;
  const widthM = form.width_m ? Number(form.width_m) : null;
  // Standard envelope: anything longer than a 13.6 m trailer or wider
  // than 3.05 m is an oversize load and needs the permit pathway (FR-03).
  const exceedsStandardEnvelope = (lengthM != null && lengthM > 13.6) || (widthM != null && widthM > 3.05);
  const payloadExceeded = Boolean(selectedClass && weight && weight > selectedClass.rated_payload_kg);

  // FR-19 fair-price reference for the chosen category (async, best-effort).
  useEffect(() => {
    let active = true;
    if (!form.category_id) { setMarket(null); return () => { active = false; }; }
    computeMarketPrice(form.category_id).then((result) => { if (active) setMarket(result); });
    return () => { active = false; };
  }, [form.category_id]);

  const fairBand = useMemo(() => {
    if (!market || !market.basePrice) return null;
    const base = form.agreed_price ? Number(form.agreed_price) : market.basePrice;
    const mid = Math.round(base * market.surge);
    return { min: Math.round(mid * 0.9), mid, max: Math.round(mid * 1.1) };
  }, [market, form.agreed_price]);

  const kindCategories = categories.filter((category) => (
    kind === 'haulage' ? category.category_type === 'haulage' : category.category_type !== 'haulage'
  ));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!user) {
      setError('Sign in before posting a job.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (kind === 'haulage' && (!weight || weight <= 0)) {
        throw new Error('Enter the cargo weight in kilograms.');
      }
      // FR-03 / FR-12 payload & permit compliance gates.
      if (kind === 'haulage') {
        if (!selectedClass) {
          throw new Error('Select the vehicle class that will carry this load — dispatch is matched on class payload.');
        }
        if (payloadExceeded) {
          throw new Error(`${selectedClass.name} is rated for ${selectedClass.rated_payload_kg.toLocaleString()} kg, below your ${weight.toLocaleString()} kg cargo. Choose a heavier class.`);
        }
        if (exceedsStandardEnvelope && !form.is_oversize) {
          throw new Error('The cargo dimensions exceed the standard trailer envelope (13.6 m long / 3.05 m wide). Tick "Oversize load" so compliance can issue the permit.');
        }
        if (form.is_oversize && !oversizeAck) {
          throw new Error('Acknowledge the oversize-permit requirement before posting an oversize load.');
        }
        if (form.is_hazardous && !hazmatAck) {
          throw new Error('Acknowledge the hazardous-materials permit requirement before posting this load.');
        }
      }
      const { data: job, error: jobError } = await supabase.from('jobs').insert({
        client_id: user.id,
        category_id: form.category_id || null,
        job_type: kind === 'haulage' ? 'haulage' : 'artisan_service',
        booking_mode: kind === 'haulage' ? 'quote' : 'instant',
        status: 'posted',
        title: form.title.trim(),
        description: form.description.trim() || null,
        service_address: kind === 'artisan' ? form.service_address.trim() || null : null,
        pickup_address: kind === 'haulage' ? form.pickup_address.trim() || null : null,
        dropoff_address: kind === 'haulage' ? form.dropoff_address.trim() || null : null,
        agreed_price: form.agreed_price ? Number(form.agreed_price) : null,
        scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      }).select('id, job_type').single();
      if (jobError) throw new Error(jobError.message);

      if (kind === 'haulage') {
        const { error: stopsError } = await supabase.from('job_stops').insert([
          { job_id: job.id, stop_order: 1, stop_type: 'pickup', address: form.pickup_address.trim() },
          { job_id: job.id, stop_order: 2, stop_type: 'dropoff', address: form.dropoff_address.trim() },
        ]);
        if (stopsError) throw new Error(stopsError.message);

        const { error: cargoError } = await supabase.from('cargo_specifications').insert({
          job_id: job.id,
          description: form.cargo_description.trim() || form.title.trim(),
          weight_kg: weight,
          length_m: form.length_m ? Number(form.length_m) : null,
          width_m: form.width_m ? Number(form.width_m) : null,
          height_m: form.height_m ? Number(form.height_m) : null,
          is_hazardous: form.is_hazardous,
          is_oversize: form.is_oversize,
        });
        if (cargoError) throw new Error(cargoError.message);
      }

      // FR-19: record how the fair-price band was framed for this job.
      if (market && market.basePrice > 0) {
        await logFairPriceSnapshot({
          jobId: job.id,
          categoryId: form.category_id || null,
          origin: kind === 'haulage' ? form.pickup_address.trim() || null : form.service_address.trim() || null,
          destination: kind === 'haulage' ? form.dropoff_address.trim() || null : null,
          basePrice: market.basePrice,
          surge: market.surge,
          fairMin: fairBand?.min ?? null,
          fairMax: fairBand?.max ?? null,
        });
      }

      navigate(`/dashboard/jobs/${job.id}`);
    } catch (err) {
      setError(err.message || 'Your job could not be posted. Please try again.');
      setIsSubmitting(false);
    }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-green">Client workspace</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Post a job</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Describe what you need so providers can review your request and respond.
        </p>
      </header>

      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setKind('artisan')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${kind === 'artisan' ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Hammer className="h-4 w-4" /> Artisan / handyman
        </button>
        <button
          type="button"
          onClick={() => setKind('haulage')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${kind === 'haulage' ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Truck className="h-4 w-4" /> Heavy haulage
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Job title *
          <input type="text" required maxLength={120} value={form.title} onChange={set('title')}
            placeholder={kind === 'haulage' ? 'Move a 10-ton excavator to Hawassa' : 'Fix a leaking kitchen sink'}
            className={inputClass} />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Description
          <textarea rows={4} maxLength={2000} value={form.description} onChange={set('description')}
            placeholder="Add details that help providers understand the job..."
            className={inputClass} />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Service category
          <select
            value={form.category_id}
            onChange={set('category_id')}
            className={inputClass}
            disabled={categoriesLoading || Boolean(categoriesError)}
          >
            <option value="">
              {categoriesLoading
                ? 'Loading categories…'
                : categoriesError
                  ? 'Categories unavailable'
                  : kindCategories.length
                    ? 'Select a category (optional)'
                    : 'No categories configured'}
            </option>
            {kindCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          {categoriesError ? (
            <p role="alert" className="text-sm text-red-700">
              {categoriesError}{' '}
              <button type="button" onClick={() => setCategoriesRetry((retry) => retry + 1)} className="font-semibold underline underline-offset-2">
                Retry
              </button>
            </p>
          ) : !categoriesLoading && !kindCategories.length ? (
            <p className="text-sm text-amber-800">
              No categories are configured for this job type yet. You can still post without selecting one.
            </p>
          ) : null}
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Budget (ETB)
            <input type="number" min="0" step="0.01" value={form.agreed_price} onChange={set('agreed_price')}
              placeholder="Optional" className={inputClass} />
          </label>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            When do you need it?
            <input type="datetime-local" value={form.scheduled_start} onChange={set('scheduled_start')} className={inputClass} />
          </label>
        </div>

        {/* FR-19 — surge / fair-price transparency. */}
        {market && market.basePrice > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" aria-live="polite">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <TrendingUp className="h-4 w-4" aria-hidden="true" /> Fair price index — {surgeLabel(market.surge)}
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-emerald-800/70">Base price</dt>
                <dd className="font-bold text-emerald-950">{market.basePrice.toLocaleString()} ETB</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-emerald-800/70">Demand multiplier</dt>
                <dd className="font-bold text-emerald-950">{market.surge.toFixed(2)}× <span className="text-xs font-medium">({market.openJobs} open job{market.openJobs === 1 ? '' : 's'})</span></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-emerald-800/70">Fair range</dt>
                <dd className="font-bold text-emerald-950">{fairBand.min.toLocaleString()}–{fairBand.max.toLocaleString()} ETB</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-emerald-800/70">Your budget</dt>
                <dd className="font-bold text-emerald-950">
                  {form.agreed_price
                    ? (Number(form.agreed_price) < fairBand.min ? 'Below fair range'
                      : Number(form.agreed_price) > fairBand.max ? 'Above fair range' : 'Within fair range')
                    : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-emerald-800/80">
              Multiplier reacts to live demand in this category and stays bounded between 0.80× and 1.50× (SRS FR-19).
            </p>
          </div>
        )}

        {kind === 'artisan' && (
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Service address *
            <input type="text" required maxLength={300} value={form.service_address} onChange={set('service_address')}
              placeholder="Bole Road, Addis Ababa" className={inputClass} />
          </label>
        )}

        {kind === 'haulage' && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Pickup address *
                <input type="text" required maxLength={300} value={form.pickup_address} onChange={set('pickup_address')}
                  placeholder="Where the cargo starts" className={inputClass} />
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Drop-off address *
                <input type="text" required maxLength={300} value={form.dropoff_address} onChange={set('dropoff_address')}
                  placeholder="Where the cargo needs to go" className={inputClass} />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="text-sm font-bold text-brand-navy">Cargo details</p>
              <div className="mt-4 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  What are you moving? *
                  <input type="text" required maxLength={300} value={form.cargo_description} onChange={set('cargo_description')}
                    placeholder="Used excavator, steel pipes, bags of cement..." className={inputClass} />
                </label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Weight (kg) *
                    <input type="number" min="1" step="0.01" required value={form.weight_kg} onChange={set('weight_kg')} className={inputClass} />
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Length (m)
                    <input type="number" min="0" step="0.01" value={form.length_m} onChange={set('length_m')} className={inputClass} />
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Width (m)
                    <input type="number" min="0" step="0.01" value={form.width_m} onChange={set('width_m')} className={inputClass} />
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Height (m)
                    <input type="number" min="0" step="0.01" value={form.height_m} onChange={set('height_m')} className={inputClass} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-5">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={form.is_hazardous} onChange={setChecked('is_hazardous')} className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green" />
                    Hazardous materials
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={form.is_oversize} onChange={setChecked('is_oversize')} className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green" />
                    Oversize load
                  </label>
                </div>
              </div>

              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Vehicle class * (dispatch is matched on class payload)
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className={inputClass}
                  disabled={categoriesLoading}
                  required={kind === 'haulage'}
                >
                  <option value="">
                    {suggestedClass ? `Select a class (suggested: ${suggestedClass.name})` : 'Select a vehicle class'}
                  </option>
                  {vehicleClasses.map((vehicleClass) => (
                    <option key={vehicleClass.id} value={vehicleClass.id}>
                      {vehicleClass.name} — rated {vehicleClass.rated_payload_kg.toLocaleString()} kg
                    </option>
                  ))}
                </select>
              </label>
              {weight > 0 && suggestedClass && !selectedClassId && (
                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  <span className="font-bold">Suggested vehicle class: {suggestedClass.name}</span>{' '}
                  — rated for {suggestedClass.rated_payload_kg.toLocaleString()} kg. Calculated automatically from your cargo weight.
                </div>
              )}
              {payloadExceeded && (
                <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {selectedClass.name} is rated for {selectedClass.rated_payload_kg.toLocaleString()} kg — your {weight.toLocaleString()} kg cargo exceeds it. Choose a heavier class to continue.
                </p>
              )}
              {weight > 0 && !suggestedClass && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This load exceeds every standard vehicle class. Our logistics team will contact you about a specialized arrangement.
                </div>
              )}
              {(form.is_oversize || exceedsStandardEnvelope) && (
                <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={oversizeAck} onChange={(event) => setOversizeAck(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green" />
                  <span>I understand oversize loads require an approved transport permit before the route can start (FR-03 compliance gate).</span>
                </label>
              )}
              {form.is_hazardous && (
                <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={hazmatAck} onChange={(event) => setHazmatAck(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green" />
                  <span>I understand hazardous materials require a specialized permit and approved handling before dispatch (FR-22 compliance gate).</span>
                </label>
              )}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <Link to="/dashboard/bookings" className="text-sm font-semibold text-slate-500 hover:text-brand-navy">
            Back to bookings
          </Link>
          <Button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2">
            {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? 'Posting...' : 'Post job'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PostJob;
