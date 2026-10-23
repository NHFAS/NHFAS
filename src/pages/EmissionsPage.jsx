// NHFAS emissions & carbon tracking (SRS FR-26 — sustainability and carbon tracking).
// Job participants log distance + fuel, CO2e is computed server-side
// (2.31 kg CO2e per litre of diesel) via log_sustainability_record RPC.

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Truck, AlertCircle, CheckCircle2, LoaderCircle, ArrowLeft, Leaf } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const EmissionsPage = () => {
  const { user } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [fuelLitres, setFuelLitres] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [availableJobs, setAvailableJobs] = useState([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const [{ data: recRows }, { data: jobRows }] = await Promise.all([
      supabase
        .from('sustainability_records')
        .select('*, jobs(job_number, title)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('jobs')
        .select('id, job_number, title, status')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .in('status', ['completed', 'confirmed', 'in_progress'])
        .order('created_at', { ascending: false }),
    ]);
    setRecords(recRows || []);
    setAvailableJobs(jobRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalCo2e = records.reduce((sum, r) => sum + (Number(r.co2e_kg) || 0), 0);
  const totalDistance = records.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0);

  const logEmissions = async (e) => {
    e.preventDefault();
    if (!selectedJobId || !distanceKm || !fuelLitres) {
      setError('Please select a job and enter distance and fuel.');
      return;
    }
    const d = parseFloat(distanceKm);
    const f = parseFloat(fuelLitres);
    if (d < 0 || f < 0) {
      setError('Distance and fuel must be zero or positive.');
      return;
    }
    setLogging(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('log_sustainability_record', {
      target_job_id: selectedJobId,
      distance_km: d,
      fuel_litres: f,
    });
    if (rpcError) {
      setError(rpcError.message);
      setLogging(false);
      return;
    }
    setFlash(`Logged: ${data.co2e_kg} kg CO2e`);
    setLogging(false);
    setDistanceKm(''); setFuelLitres(''); setSelectedJobId('');
    await load();
  };
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">
            <Leaf className="h-5 w-5 mr-2" /> Emissions &amp; Offsets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log haulage distance and fuel to estimate CO2e. Data is recorded server-side
            and visible to job participants.
          </p>
        </div>
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>
      </header>
      <section aria-label="Emissions summary" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold text-brand-navy">Fleet emissions summary</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total CO2e</p>
            <p className="text-2xl font-bold text-brand-navy">{totalCo2e.toFixed(1)} kg</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total distance</p>
            <p className="text-2xl font-bold text-brand-navy">{totalDistance.toFixed(0)} km</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Records</p>
            <p className="text-2xl font-bold text-brand-navy">{records.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Avg per km</p>
            <p className="text-2xl font-bold text-brand-navy">
              {totalDistance > 0 ? (totalCo2e / totalDistance).toFixed(2) : '0'} kg/km
            </p>
          </div>
        </div>
      </section>

      {loading && (
        <div className="py-20 text-center text-sm text-slate-400" role="status">
          <LoaderCircle size={24} className="animate-spin" /> Loading…
        </div>
      )}
      {!loading && (
        <>
          <section aria-label="Log emissions" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Log emissions for a job</h2>
            <p className="mt-1 text-sm text-slate-500">Enter distance travelled and fuel consumed.</p>
            <form onSubmit={logEmissions} className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Job
                <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className={inputClass}>
                  <option value="">Select a job</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>#{j.job_number} · {j.title}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Distance (km)
                <input type="number" min="0" step="1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="120" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Fuel (litres)
                <input type="number" min="0" step="0.1" value={fuelLitres} onChange={(e) => setFuelLitres(e.target.value)} placeholder="25" className={inputClass} />
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={logging || !selectedJobId || !distanceKm || !fuelLitres} className="gap-2 w-full sm:w-auto">
                  {logging ? <LoaderCircle size={16} className="animate-spin" /> : <Leaf size={16} />}
                  {logging ? 'Logging…' : 'Log emissions'}
                </Button>
              </div>
            </form>
          </section>

          <section aria-label="Emission records" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Emission records</h2>
            {records.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400 italic">No emission records yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        Job #{r.jobs?.job_number || 'N/A'} · {r.jobs?.title || 'Job'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.distance_km} km · {r.fuel_litres} L · {r.calculation_method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-navy">{r.co2e_kg} kg CO2e</p>
                      <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
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

export default EmissionsPage;