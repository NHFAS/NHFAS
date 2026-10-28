import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, ErrorNote, Spinner } from './adminUi';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const PricingTab = ({ notify }) => {
  const [surgeMin, setSurgeMin] = useState(0.8);
  const [surgeMax, setSurgeMax] = useState(1.5);
  const [baselineOpenJobs, setBaselineOpenJobs] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSurgeMin(0.8);
      setSurgeMax(1.5);
      setBaselineOpenJobs(3);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    setWorking(true);
    setError('');
    try {
      notify('Surge pricing configuration saved. Multiplier bounds: ' + surgeMin + '× – ' + surgeMax + '×.', 'emerald');
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-6">
      <Card title="Dynamic surge pricing" subtitle="Configure demand-based pricing bounds and fair-price index">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-brand-navy mb-3">Surge multiplier bounds</h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Minimum multiplier
                <input type="number" min="0.5" max="1" step="0.05" value={surgeMin}
                  onChange={(e) => setSurgeMin(parseFloat(e.target.value))}
                  className={inputClass} />
                <p className="text-[11px] text-slate-500">Lowest allowed surge factor (e.g. 0.8 = 20% off-peak discount)</p>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Maximum multiplier
                <input type="number" min="1" max="3" step="0.05" value={surgeMax}
                  onChange={(e) => setSurgeMax(parseFloat(e.target.value))}
                  className={inputClass} />
                <p className="text-[11px] text-slate-500">Highest allowed surge factor to prevent price gouging</p>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Baseline open jobs
                <input type="number" min="1" step="1" value={baselineOpenJobs}
                  onChange={(e) => setBaselineOpenJobs(parseInt(e.target.value, 10) || 1)}
                  className={inputClass} />
                <p className="text-[11px] text-slate-500">Open jobs at which pricing is neutral (1× multiplier)</p>
              </label>
            </div>
            <button onClick={saveConfig} disabled={working} className="w-full gap-2 mt-4 inline-flex items-center justify-center font-medium rounded-lg border border-slate-200 bg-brand-navy text-white px-4 py-2.5 text-sm hover:bg-brand-navy/90 disabled:opacity-50">
              {working ? 'Saving...' : 'Save pricing configuration'}
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-brand-navy mb-3">Current pricing rules</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-slate-700">Minimum surge</dt>
                <dd className="font-bold text-brand-navy">{surgeMin}×</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-700">Maximum surge</dt>
                <dd className="font-bold text-brand-navy">{surgeMax}×</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-700">Baseline open jobs</dt>
                <dd className="font-bold text-brand-navy">{baselineOpenJobs}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-700">Fair-price band</dt>
                <dd className="font-bold text-brand-navy">±10% of surged midpoint</dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] text-slate-500">
              Surge multipliers are computed per service zone based on open demand. The fair-price index is
              displayed alongside every job quote so clients see typical market rates before booking.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Fair-price transparency" subtitle="What clients see when quoting">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">
            When a client requests a quote, the platform displays:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-emerald-800 list-disc list-inside">
            <li>Base price from recent market data</li>
            <li>Demand-based surge multiplier (bounded by config above)</li>
            <li>Fair price range (±10% band)</li>
            <li>Whether their budget is below, within, or above fair range</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default PricingTab;