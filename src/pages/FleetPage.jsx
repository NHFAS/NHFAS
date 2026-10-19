import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Truck, AlertCircle, CheckCircle2, LoaderCircle, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const STATUS_CLASSES = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-700',
  blocked: 'border-red-200 bg-red-50 text-red-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  in_progress: 'border-purple-200 bg-purple-50 text-purple-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-red-200 bg-red-50 text-red-700',
};

const FleetPage = () => {
  const { user } = useOutletContext();
  const [vehicles, setVehicles] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [loggingEvent, setLoggingEvent] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [payloadKg, setPayloadKg] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventPayload, setEventPayload] = useState('{}');
  const [maintType, setMaintType] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintOdometer, setMaintOdometer] = useState('');
  const [maintScheduledAt, setMaintScheduledAt] = useState('');
  const [maintCost, setMaintCost] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const [{ data: vehicleRows }, { data: maintRows }, { data: eventRows }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*')
        .or(`owner_id.eq.${user.id},organization_id.is.not.null`)
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicle_maintenance_records')
        .select('*, vehicles(plate_number, make, model)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('telematics_events')
        .select('*, vehicles(plate_number, make, model)')
        .order('recorded_at', { ascending: false })
        .limit(50),
    ]);
    setVehicles(vehicleRows || []);
    setMaintenance(maintRows || []);
    setEvents(eventRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const registerVehicle = async (e) => {
    e.preventDefault();
    if (!plateNumber || !make || !model || !modelYear || !payloadKg) {
      setError('All vehicle fields are required.');
      return;
    }
    setRegistering(true);
    setError('');
    const { error: insertError } = await supabase.from('vehicles').insert({
      owner_id: user.id,
      plate_number: plateNumber.trim().toUpperCase(),
      make: make.trim(),
      model: model.trim(),
      model_year: parseInt(modelYear, 10),
      rated_payload_kg: parseInt(payloadKg, 10),
      status: 'active',
    });
    if (insertError) {
      setError(insertError.message);
      setRegistering(false);
      return;
    }
    setFlash('Vehicle registered.');
    setRegistering(false);
    setPlateNumber(''); setMake(''); setModel(''); setModelYear(''); setPayloadKg('');
    await load();
  };

  const logTelematicsEvent = async () => {
    if (!selectedVehicleId || !eventType) {
      setError('Please select a vehicle and event type.');
      return;
    }
    let payload = {};
    try { payload = eventPayload ? JSON.parse(eventPayload) : {}; } catch { setError('Invalid JSON payload.'); return; }
    setLoggingEvent(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('log_telematics_event', {
      target_vehicle_id: selectedVehicleId,
      event_type: eventType.trim(),
      payload,
    });
    if (rpcError) {
      setError(rpcError.message);
      setLoggingEvent(false);
      return;
    }
    setFlash('Telematics event logged.');
    setLoggingEvent(false);
    setEventType(''); setEventPayload('{}');
    await load();
  };

  const scheduleMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedVehicleId || !maintType || !maintScheduledAt) {
      setError('Vehicle, maintenance type, and scheduled date are required.');
      return;
    }
    setScheduling(true);
    setError('');
    const { error: insertError } = await supabase.from('vehicle_maintenance_records').insert({
      vehicle_id: selectedVehicleId,
      maintenance_type: maintType.trim(),
      description: maintDesc.trim() || null,
      odometer_km: maintOdometer ? parseFloat(maintOdometer) : null,
      scheduled_at: maintScheduledAt,
      cost: maintCost ? parseFloat(maintCost) : null,
      status: 'scheduled',
    });
    if (insertError) {
      setError(insertError.message);
      setScheduling(false);
      return;
    }
    setFlash('Maintenance scheduled.');
    setScheduling(false);
    setMaintType(''); setMaintDesc(''); setMaintOdometer(''); setMaintScheduledAt(''); setMaintCost('');
    await load();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Fleet</h1>
          <p className="mt-1 text-sm text-slate-500">Register vehicles, log telematics events, and schedule maintenance.</p>
        </div>
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>
      </header>

      {loading && (
        <div className="py-20 text-center text-sm text-slate-400" role="status">
          <LoaderCircle size={24} className="animate-spin" /> Loading fleet…
        </div>
      )}

      {!loading && (
        <>
          <section aria-label="Register vehicle" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Register vehicle</h2>
            <p className="mt-1 text-sm text-slate-500">Add a vehicle to your fleet.</p>
            <form onSubmit={registerVehicle} className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Plate number
                <input type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="AA-1234" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Make
                <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Model
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Hilux" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Model year
                <input type="number" min="1990" step="1" value={modelYear} onChange={(e) => setModelYear(e.target.value)} placeholder="2020" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Rated payload (kg)
                <input type="number" min="0" step="100" value={payloadKg} onChange={(e) => setPayloadKg(e.target.value)} placeholder="1500" className={inputClass} />
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={registering} className="gap-2 w-full sm:w-auto">
                  {registering ? <LoaderCircle size={16} className="animate-spin" /> : <Truck size={16} />}
                  {registering ? 'Registering…' : 'Register vehicle'}
                </Button>
              </div>
            </form>
          </section>

          <section aria-label="Log telematics event" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Log telematics event</h2>
            <p className="mt-1 text-sm text-slate-500">Log an IoT event (idling, speeding, harsh braking, etc.) for a vehicle.</p>
            <form onSubmit={(e) => { e.preventDefault(); logTelematicsEvent(); }} className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Vehicle
                <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} className={inputClass}>
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number} · {v.make} {v.model}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Event type
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputClass}>
                  <option value="">Select an event</option>
                  <option value="idling">Excessive idling</option>
                  <option value="speeding">Speeding event</option>
                  <option value="harsh_braking">Harsh braking</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Payload (JSON)
                <textarea value={eventPayload} onChange={(e) => setEventPayload(e.target.value)} rows={2} placeholder='{"notes": "..."}' className={inputClass} />
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={loggingEvent || !selectedVehicleId || !eventType} className="gap-2 w-full sm:w-auto">
                  {loggingEvent ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
                  {loggingEvent ? 'Logging…' : 'Log event'}
                </Button>
              </div>
            </form>
          </section>

          <section aria-label="Maintenance records" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Schedule maintenance</h2>
            <p className="mt-1 text-sm text-slate-500">Schedule and track vehicle maintenance.</p>
            <form onSubmit={scheduleMaintenance} className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Vehicle
                <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} className={inputClass}>
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number} · {v.make} {v.model}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Maintenance type
                <input type="text" value={maintType} onChange={(e) => setMaintType(e.target.value)} placeholder="Oil change" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Description
                <input type="text" value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} placeholder="Optional notes" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Odometer (km)
                <input type="number" min="0" step="100" value={maintOdometer} onChange={(e) => setMaintOdometer(e.target.value)} placeholder="45000" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Scheduled at
                <input type="datetime-local" value={maintScheduledAt} onChange={(e) => setMaintScheduledAt(e.target.value)} className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Cost (ETB)
                <input type="number" min="0" step="100" value={maintCost} onChange={(e) => setMaintCost(e.target.value)} placeholder="0" className={inputClass} />
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={scheduling || !selectedVehicleId || !maintType || !maintScheduledAt} className="gap-2 w-full sm:w-auto">
                  {scheduling ? <LoaderCircle size={16} className="animate-spin" /> : null}
                  {scheduling ? 'Scheduling…' : 'Schedule maintenance'}
                </Button>
              </div>
            </form>

            {maintenance.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Recent records</h3>
                <div className="space-y-2">
                  {maintenance.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{m.maintenance_type}</p>
                        <p className="text-xs text-slate-500">{m.vehicles?.plate_number || 'Vehicle'} · {m.status}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLASSES[m.status] || STATUS_CLASSES.scheduled}`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section aria-label="Telematics events" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Recent telematics events</h2>
            {events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400 italic">No telematics events logged yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{ev.event_type}</p>
                      <p className="text-xs text-slate-500">{ev.vehicles?.plate_number || 'Vehicle'} · {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ev.recorded_at))}</p>
                    </div>
                    <pre className="text-xs text-slate-500 bg-slate-50 p-2 rounded">{JSON.stringify(ev.payload || {}, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          {flash && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {flash}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default FleetPage;
